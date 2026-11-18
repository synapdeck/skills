---
name: synapdeck-deck-design
description: Use when a Synapdeck user wants to start studying a new subject, restructure an existing deck, or think through how to organize a body of knowledge into flashcards — designing the deck hierarchy, note types, fields, templates, derivation methods and the prerequisite ordering between templates, then creating it with apply_deck_blueprint. Also use when choosing between reusing or extending an existing note type and creating a new one.
metadata:
  synapdeck-kind: task
  synapdeck-shared: blueprint card-syntax
  synapdeck-requires-mcp-tools: list_note_types list_derivation_methods list_decks get_note_type apply_deck_blueprint create_note create_notes preview_card update_template update_note_type add_template add_prerequisite
---

# Designing a Synapdeck deck

The user is the expert on their subject. Your job is to turn what they know
about it into a structure that teaches it: which kinds of things they learn,
what facts each one carries, which directions they need to recall them in,
and what has to come first. Most users can't program and won't use these
terms, so ask in plain language and translate the answers yourself.

## Vocabulary

| Synapdeck term | What it is | Database analogy |
| --- | --- | --- |
| **Deck** | A folder of notes; decks nest into subdecks. | Partition |
| **Note type** | A kind of thing being learned (a word, a drug, a problem). | Table |
| **Field** | One attribute of a note type: `text`, `enum`, `boolean`, `image` or `audio`. | Column |
| **Note** | One thing being learned: a note type with its field values filled in. | Row |
| **Template** | One way of asking about a note. It has a Markdown `front` (the question) and `back` (the answer). | View |
| **Card** | One template rendered for one note. Cards are what the user reviews. | View row |
| **Derivation method** | Computes one field from others (for example romanization or a molecule diagram). | Generated column |
| **Template prereq / peer** | Ordering between a note type's templates. A prereq is learned first. Peers spoil each other, so they are never shown on the same day. | — |

One note with three templates gives three cards. Add templates for the
recall *directions* the user needs, not for every field.

## Workflow

1. **Survey first, always.** Call `list_note_types({ expand: "schema" })`,
   `list_derivation_methods()` and `list_decks()`. If an existing note type
   already models the subject, propose extending it (`update_note_type` to
   add fields, `add_template`) rather than a near-duplicate. An empty
   survey is normal on a new account: design from scratch, and never tell
   the user about types or decks that the survey didn't return. Content
   unrelated to the new subject needs no mention. The new deck goes at the
   top level unless the user wants it under an existing one.
2. **Interview** (below). Ask a few questions at a time, not a form.
3. **Dry run.** Call `apply_deck_blueprint` with `dryRun: true`. Errors come
   back a few at a time, not all at once, so fix them and dry-run again
   until `validationErrors` is empty. You then propose a design that is
   known to apply.
4. **Propose the design in plain language.** Name the decks and say what
   one note holds. Write out an example card for each template, using a
   real example from their subject. Say which cards come first, and why.
   If you made up example content, ask the user to check it against their
   course.
5. **Get approval, then apply.** Make the real call only after the user says
   yes to the design. Send an `idempotencyKey`, so that a retry can't create
   a second copy.
6. **Check the cards against a real note.** The dry run checks structure,
   not template text. Create one note of each type from the user's own
   material, then call `preview_card` on it. Read every `diagnostics` entry
   (for example `unknown_field_reference` for a mistyped `{{ Field }}`).
   Fix templates with `update_template`, and show the user the rendered
   cards.
7. **Then fill it.** Ask before you add notes in bulk (`create_notes`, up to
   50 per call). Notes are never part of the blueprint. If the design orders
   one note type before another, link the notes afterwards (see
   [Template prereqs and peers](#template-prereqs-and-peers)).

## Interview

- **The subject and the goal.** What are they learning, and for what: an
  exam, a job, travel, curiosity? What would mastery look like?
- **Current study habits.** A textbook or course often gives you the deck
  hierarchy for free (one subdeck per chapter or unit).
- **The kinds of things they learn.** Each distinct kind becomes a note
  type. Vocabulary and grammar points are two types, not one.
- **What they need to know about each one.** Each attribute becomes a field.
  Ask which attributes are optional; optional content needs gating (see
  [Templates](#templates)).
- **Which directions they need to recall in.** Recognizing (see the word,
  give the meaning) is easier than producing (see the meaning, give the
  word). Do they need to calculate, spell exactly, or hear and identify?
- **What has to come first.** Some cards are only fair after another one is
  learned. That becomes a template prereq.

## Mapping answers to structure

| Answer | Becomes |
| --- | --- |
| Subject, course or book structure | Deck hierarchy (`decks`, nested with `parentHandle`). Each note lives in one deck, so use the main way the user studies. Cross-cutting categories (a drug used in two body systems) become tags on the notes. |
| A kind of thing to learn | A note type |
| An attribute of it | A field. Use `enum` for a short closed set of about a dozen or fewer (part of speech, gender, prefix/root/suffix): it can color text and drive rendering criteria. A long or growing list (drug classes) stays `text`. Use `boolean` for yes/no. |
| An attribute with several values (brand names, synonyms) | One `text` field holding the list. Don't put `:type-in` on it: a typed answer has to match the whole field. |
| A recall direction | A template |
| "Learn X before Y" | A template prereq: Y's template depends on X's |
| Two cards that give each other away (A→B and B→A) | A template peer |
| Information that follows mechanically from another field | A derivation method (below) |
| The language a text field is written in | Set `lang` to its BCP 47 tag (`"ja"`, `"ru"`, `"en"`) on every text field, the user's own language included. It picks fonts, casing rules and type-in comparison. Leave it off fields that hold math or code. |
| Printable worksheets | `writingSpaceHint`: `small`, `medium`, `large` or `show-work` |

## Templates

Templates are Markdown with `{{ Field name }}` placeholders. A design
commonly needs only these constructs:

| Want | Write |
| --- | --- |
| Insert a field | `{{ Meaning }}` |
| Repeat the question on the back | `{{ @front }}` |
| Typed answer | On the **back**: `:type-in[{{ Word }}]` |
| Optional field or media | `:if-nonblank[{{ Audio }}]{field="Audio"}` |
| Hint behind a click | `:hint[{{ Part of speech }}]{label="Part of speech"}` |
| Color text by an enum field | `:color-coding[{{ Word }}]{field="Gender" when="always"}` |
| Cloze deletion | Template `{{ Text \| cloze }}`; note text `The capital is :c1[Paris].` |

Design traps:

- **Each back stands on its own.** Begin it with `{{ @front }}` or restate
  the question. `{{ @front }}` replays the front's hint too, so restate the
  question when the front has one.
- **Gate optional media** with `:if-nonblank`: a bare `{{ Audio }}` on a note
  without audio renders an error.
- **Skip a card when its field is empty** with a `fieldNonblank` criterion;
  it works on text, image and audio fields.
- **Template names must be unique** within a note type, ignoring case;
  `templateRelations` refers to templates by name.

[references/card-syntax.md](references/card-syntax.md) covers everything
else. To fix a template that renders wrong, use the `synapdeck-card-syntax`
skill.

## Template prereqs and peers

Default: recognition before production. Production ("How do you say *to eat*?")
depends on Recognition ("食べる → ?"). Listening depends on Recognition
as well. In a problem set, "choose the method" comes before "solve it".

Use a peer, not a prereq, for two directions of equal difficulty that spoil
each other (country → capital and capital → country). If one direction is
harder, for example because only it has a typed answer, make it depend on
the easier one instead. Prereqs must not form a cycle; the dry run rejects
one.

Relations between **different** note types (word parts before the terms
built from them) are note-level relations: add them to notes after creation
with `add_prerequisite`. They are not part of a blueprint.
[references/template-prereq-conventions.md](references/template-prereq-conventions.md)
has more cases.

## Derivation methods

Bind a field to a **platform** method from `list_derivation_methods` when its
value follows mechanically from another field. Examples: romanization from
Cyrillic, Greek or Armenian; Devanagari from romanized Sanskrit; a molecule
diagram from SMILES; audio from a tone sequence:

```json
{ "type": "text", "name": "Romanization",
  "derivation": { "method": { "kind": "platform", "internalName": "russian-to-latin" },
                  "inputs": { "sourceText": "Word" } } }
```

`list_derivation_methods` lists each platform method's `inputs` (bind them
by `internalLabel`) and `options` (by `internalKey`). The plan's
`derivedFields` shows the user what each binding will run.

Don't write new Python derivation methods as part of designing a deck. If
the user needs a computed field that no platform method provides, make it an
ordinary field they fill in, and tell them a custom method can be added
later. Randomized numbers in practice problems are not derivations: they are
ad hoc scripts on individual notes (the `synapdeck-ad-hoc-scripts` skill),
which you can add after the deck exists.

## Don't

- Don't apply anything before the user approves the design.
- Don't create a note type that duplicates one the user already has.
  Propose extending the existing one.
- Don't put notes in the blueprint, and don't add notes in bulk before the
  sample note's cards have been previewed.
- Don't make one card ask several questions at once ("How does it work, and
  what is it used for?"). Give each question the user must answer its own
  template. A list that is itself the answer (a drug's major side effects)
  can stay one card. If the user needs every item cold, make it a cloze
  passage with one deletion per item.

## Going further

- [references/blueprint.md](references/blueprint.md): the full blueprint
  shape, field by field.
- [references/card-syntax.md](references/card-syntax.md): every template and
  field construct, with its warnings.
- [references/note-type-design-patterns.md](references/note-type-design-patterns.md):
  patterns for vocabulary, factual recall, problems, cloze passages, code
  and diagrams.
- [references/template-prereq-conventions.md](references/template-prereq-conventions.md):
  ordering choices and their pitfalls.
- Worked blueprints, each validated with a live dry run:
  [Japanese vocabulary](assets/example-blueprints/japanese-vocabulary.json),
  [kinematics problems](assets/example-blueprints/kinematics-problems.json),
  [medical terminology](assets/example-blueprints/medical-terminology.json).
