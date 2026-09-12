---
name: synapdeck-ad-hoc-scripts
description: Use when writing, debugging, or reviewing the Python ad hoc script attached to a Synapdeck note — the script that runs immediately before every card render to produce extra text fields, above all randomized parameters in math and science questions. Covers what scripts are for, when they run and deliberately don't, how to read the note's fields, the return contract, the preview-then-save authoring loop, and the field-name matching rule that silently returns None.
---

# Synapdeck ad hoc scripts

An ad hoc script is a Python script attached to ONE note (the `adHocScript`
key on the `create_note` / `update_note` MCP tools). It runs immediately
before every card render of that note and produces extra text fields for that
render only.

Because it re-runs on each render, its purpose is **nondeterministic
content** — above all randomized parameters in math and science questions, so
a card drills the technique instead of a memorized answer. The front and back
of a single review share one execution, so a randomized value stays
consistent within a review.

If a value should be the same every time, it is a field, not a script.

## When scripts run — and when they don't

- **Run:** right before card rendering (every review, every preview).
- **Do NOT run:** during note query-table extraction, and not when evaluating
  template rendering criteria.

Script-produced fields therefore cannot be searched, filtered on, or used in
rendering criteria. They exist only inside the rendered card.

Separately from rendering, the server executes the script once per save to
store a *display sample* — one canonical roll shown in the note editor and in
spreadsheet cells. That sample is a preview of what the script produces, not
what any given reviewer will see; each review still rolls its own.

## Execution environment

Sandboxed Python (Pyodide) with the standard library (`random`, `math`, …)
and an execution timeout. No network, no filesystem.

An exception or timeout does not fail the render: the card renders without
the script's fields and the error is surfaced as a warning. A script that
crashes is therefore silent from the reader's point of view — nothing tells
them a field is missing. Preview before saving.

## Reading the note's fields

A global `data` dict holds every field of the note — note-type fields and ad
hoc fields alike — in one flat mapping keyed by normalized field name
(whitespace collapsed, Unicode NFC). Prefer the `get_field(name)` helper,
which normalizes `name` for you and returns the field's dict, or `None` if
the note has no such field.

Every field is a dict with a `"type"` key and a `"value"` key:

- `text`: `{"type": "text", "value": "..."}`
- `boolean`: `{"type": "boolean", "value": True/False}`
- `enum`: `"value"` is `[option_index, display_text]`, or `None` when no
  option is selected
- `image` / `audio`: `"value"` is a `"[image:<digest>]"` /
  `"[audio:<digest>]"` placeholder string — media content is not readable
  from scripts

### `get_field` is CASE-SENSITIVE

This is the single easiest way to get a script silently wrong.

`get_field` trims, collapses whitespace, and applies Unicode NFC. It does
**not** fold case. Template placeholders use a *different* rule: `{{ … }}`
resolution is case-insensitive.

So on a note with a field named `Topic`:

```python
get_field("Topic")   # the field
get_field("topic")   # None
```

while `{{ topic }}` in a template renders that same field fine.

A miss is `None`, not an error, so the idiom below swallows the typo and
prints the fallback forever:

```python
topic = get_field("topic")                       # wrong case → None
text = topic["value"] if topic else "this topic" # silently the fallback
```

Spell the name exactly as the field is named.

## Producing fields

The script executes as the **body of a function**: it must `return` a dict
mapping new field names to values. A bare trailing expression returns
nothing.

```python
return {"Answer": 42}    # correct
{"Answer": 42}           # produces NOTHING
```

Each entry becomes a text field (non-string values are stringified) that the
note's templates reference with `{{ Field name }}` syntax, exactly like an
ordinary field. Any other returned value (`None`, a list, a scalar) produces
zero fields and a `scriptReturnedWrongObjectType` warning.

Output is bounded at three different points, so keep the returned dict small:
the executor refuses a result over 1000 fields; the server-stored display
sample keeps the first 100 fields and 256 KiB of names plus values;
`preview_ad_hoc_script` reports the first 100 fields and 64 KiB. Each reports
what it dropped rather than failing.

## Authoring loop

1. **Draft** the script.
2. **Preview** it with the `preview_ad_hoc_script` MCP tool, passing `script`
   as a candidate against a real note without saving anything. Execution
   problems come back as `warnings` data — fix and preview again. Call it
   several times: the output SHOULD differ run to run if your randomization
   works. An empty `warnings` array means the script really ran; an executor
   outage fails the call instead, so it is never mistaken for "my script
   produced nothing".
3. **Save** it with `update_note`'s `adHocScript` key (or attach at creation
   via `create_note`), then update the note's templates to reference the
   produced field names.

### What `adHocScript` means on a write

`update_note`'s `adHocScript` key has three states, and confusing them loses
work:

| Value | Effect |
| --- | --- |
| key omitted | Source and execution toggle both untouched. |
| Python source | Saved AND marked executed, so it runs at every render. |
| `null` | Stops executing; **keeps** the saved source. |
| `""` | Erases the source outright. |

`get_note` reports a saved-but-disabled script as `adHocScript: null`, so if
you read a note and echo it back, the `null` you send is a disable, never an
erase. Only the empty string destroys Python source.

Whitespace-only source does not count as a script: it is saved as typed but
never marked executed, because nothing would run.

### Scripts run in other people's browsers

On a **shared** note, an ad hoc script executes in every reviewer's browser,
not just the author's. Deck-edit permission is therefore transitively a
code-execution grant. Attach a script only where that is intended, and keep
it to computation over the note's own fields.

## Worked example

A physics note with a text field `Topic`, whose card should present freshly
randomized numbers at every review:

```python
import random

# Read the note's fields (read-only). get_field returns a dict like
# {"type": "text", "value": "..."} — or None when no such field exists.
topic = get_field("Topic")
topic_text = topic["value"] if topic else "this topic"

# Randomize the parameters so each review tests the problem-solving
# method, not a memorized numeric answer.
mass = random.randint(2, 12)                 # kg
accel = round(random.uniform(1.5, 4.0), 1)   # m/s^2
force = round(mass * accel, 1)

# The script runs as a function body: RETURN a dict mapping new field
# names to values. Each entry becomes a text field that templates can
# reference like {{ Given mass }}.
return {
    "Given mass": f"{mass} kg",
    "Given acceleration": f"{accel} m/s^2",
    "Computed force": f"{force} N",
    "Prompt": f"A cart of {mass} kg accelerates at {accel} m/s^2 ({topic_text}).",
}
```

Template front: `{{ Prompt }} — what force acts on the cart?`
Template back: `{{ Computed force }}`
