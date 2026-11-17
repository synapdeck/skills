# The `DeckBlueprint` format

`apply_deck_blueprint` takes `{ blueprint, dryRun?, idempotencyKey? }`. The
blueprint is structure only: decks, note types, templates and template
relations. The whole blueprint lands in one transaction, or nothing does.

```jsonc
{
  "blueprint": {
    "decks": [ /* up to 200 */ ],
    "noteTypes": [ /* up to 50 */ ]
  },
  "dryRun": true            // validate and return the plan; writes nothing
  // "idempotencyKey": "…"  // real applies only; a dry run rejects one
}
```

Both arrays are required. Pass `[]` for one you don't need, for example
`"decks": []` when you are only adding a note type.

## Handles

Every deck and note type has a `handle`: a string you choose, unique across
the whole blueprint. Decks refer to each other by handle, and the result
maps each handle back to the id that was created. Handles are not stored.
Pick readable ones (`"ch1"`, `"vocab"`).

## Decks

```jsonc
{
  "handle": "ch1",
  "name": "Chapter 1: Greetings",
  "description": "…",            // optional
  "parentHandle": "japanese"     // nest under a deck in this blueprint
  // or "parentDeckId": "<uuid>" // nest under an EXISTING deck (needs edit on it)
  // omit both for a top-level deck
}
```

`parentHandle` and `parentDeckId` are mutually exclusive. Use `parentDeckId`
(from `list_decks`) to add a subdeck to a deck the user already has.

Decks do not carry a language in the blueprint. Put `lang` on the fields
instead.

## Note types

```jsonc
{
  "handle": "vocab",
  "name": "Japanese Vocabulary",
  "description": "…",                 // optional; say what one note holds
  "writingSpaceHint": "small",        // optional: small | medium | large | show-work
  "fields": [ /* at least one */ ],
  "templates": [ /* the recall directions */ ],
  "templateRelations": {              // optional
    "prereqs": [{ "dependentTemplateName": "Production", "prereqTemplateName": "Recognition" }],
    "peers":   [{ "templateNameA": "A → B", "templateNameB": "B → A" }]
  }
}
```

## Fields

Every field has `type`, `name`, an optional `lang` (BCP 47) and an optional
`derivation`.

| `type` | Extra keys |
| --- | --- |
| `text` | `defaultValue` |
| `enum` | `options` (required): `[{ label, internalLabel?, textColor?, fillColor? }]`; `defaultOptionLabel` |
| `boolean` | `trueLabel`, `falseLabel`, `trueTextColor`, `falseTextColor`, `trueFillColor`, `falseFillColor`, `defaultValue` |
| `image` | — |
| `audio` | — |

Colors are crayon coordinates, `<hue>-<intensity>`. The hues are red, orange,
yellow, green, teal, blue, purple, pink, brown and gray. The intensities are
soft, medium and bold. Examples: `"blue-bold"`, `"red-soft"`.

An enum always has an implicit "none" option, so don't add one. An enum
option's `label` is what users see; `internalLabel` (defaulting to the
label) is the token derivation methods read and write.

A derived field:

```jsonc
{
  "type": "text", "name": "Romanization",
  "derivation": {
    "method": { "kind": "platform", "internalName": "russian-to-latin" },
    "inputs": { "sourceText": "Word" },   // method input label -> source field name
    "options": { }                        // optional: option key -> value
  }
}
```

The field's own `type` is the method's output type. A source field must
have the type the input expects, and it can't be the derived field itself.

## Templates

```jsonc
{
  "name": "Recognition",
  "front": "# {{ Word }}",
  "back": "{{ @front }}\n\n{{ Meaning }}",
  "renderingCriterion": { "condition": "textFieldNonblank", "controllingFieldName": "Meaning" }, // optional
  "writingSpaceOverride": "show-work",      // optional, per template
  "hideQuestionOnRevealOverride": true      // optional; null = follow the user's setting
}
```

`renderingCriterion` decides whether a note gets this card at all:

| `condition` | Extra keys | Card exists when |
| --- | --- | --- |
| `always` | — | always (the default) |
| `textFieldNonblank` | `controllingFieldName` (a **text** field) | that field has text |
| `onEnumFieldValue` | `controllingFieldName`, `matchingOptionLabels`, `matchesIrregular?` | the enum holds one of those labels |
| `onBooleanFieldValue` | `controllingFieldName`, `matchingValue` | the boolean equals `matchingValue` |
| `onTags` | `tags`, `mode`: `hasAny` / `hasAll` / `lacksAll` | the note's tags match |
| `composite` | `operator`: `and` / `or`, `subcriteria` (non-composite criteria) | the combination holds |
| `never` | — | never (keeps a template parked) |

There is no criterion for image or audio fields. Gate the front with
`:::if-nonblank{field="Audio"}` … `:::` instead: a card whose front renders
blank is not generated.

## What the dry run returns

```jsonc
{
  "applied": false,
  "decks": [{ "handle", "name", "description", "parentHandle", "parentDeckId", "depth" }],
  "noteTypes": [{
    "handle", "name", "description",
    "fieldNames", "templateNames",
    "prereqEdges", "peerEdges",
    "derivedFields": [{ "fieldName", "method": { "kind", "internalName", "internalVersion" }, "inputs", "options" }]
  }],
  "validationErrors": [{ "path": "noteTypes[0].templateRelations.prereqs", "issue": "…" }]
}
```

It **does** catch: duplicate handles or template names, unknown parent
handles, relations naming a template that doesn't exist, prereq cycles,
criteria naming a missing field or the wrong field type, and derivation
bindings with unknown methods or inputs.

It does **not** read template text. A mistyped `{{ Field }}`, a directive
pointing at a missing field, or `:color-coding` on an enum with no colors
all pass the dry run. They only show up as `preview_card` diagnostics on a
real note.

Errors arrive in stages: fixing one batch can reveal the next. Repeat until
`validationErrors` is empty.

## What a real apply returns

```jsonc
{
  "applied": true,
  "decksCreated":     [{ "handle": "ch1",   "deckId": "<uuid>" }],
  "noteTypesCreated": [{ "handle": "vocab", "noteTypeId": "<uuid>" }]
}
```

Use these ids for `create_note` / `create_notes` (`deckId` plus
`noteTypeId`), and for `update_template` / `add_template` when you revise
the design.
