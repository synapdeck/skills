---
name: synapdeck-card-syntax
description: Use when writing, fixing, reviewing or explaining Synapdeck template or field markup — {{ Field }} placeholders and filters, cloze deletions and contexts, type-in answers, hints, reveal-dependent content, field and cloze conditionals, color coding, language tags, ruby, math, sequences, variable text, image quizzes and template rendering criteria — and when diagnosing why a card renders wrong or doesn't exist.
metadata:
  synapdeck-kind: reference
  synapdeck-shared: card-syntax
  synapdeck-requires-mcp-tools: create_note get_note_type preview_card
---

# Synapdeck card syntax

A note type's **templates** each have a `front` and a `back`, written in
Markdown extended with `{{ Field }}` placeholders and `:directive[…]{…}`
constructs. **Text field values** use the same markup, and a placeholder
expands its field recursively, so a field can carry clozes, ruby or math of
its own. Each template renders a note into one card, or one card per key for
clozes, sequences and image quizzes.

The full reference, with every construct, its attributes and its warnings, is
[references/card-syntax.md](references/card-syntax.md). Read it before writing
anything beyond the rules below.

## Rules you need most often

1. **Begin every back with `{{ @front }}`** (or restate the question). By
   default reviewers see the back without the front, unless the back renders
   empty. `{{ @front }}` replays the front revealed, hints included; restate
   the question instead if a front hint shouldn't reappear. A template's
   `hideQuestionOnRevealOverride: false` always keeps the question visible.
2. **Placeholder names match case-insensitively**; an unknown name stays in
   the card as literal `{{ Name }}`. Chain filters with `|`, never commas.
3. **Clozes live in a field and need a cloze context:** front
   `{{ Text | cloze }}`, field `Paris is the :c1[capital of :c2[France]].`
   Without `| cloze` (or `:cloze[…]`) deletions render as plain text and make
   no cards. Keys are `c` + digit, `-` or `_` (`c1`, `c_es`). A key nested
   entirely inside another becomes its prereq.
4. **Hints on deletions:** `:c1[Tokyo]{hint="capital"}`. Click-to-reveal
   hints anywhere: `:hint[text]{label="Mnemonic"}`.
5. **`:type-in[{{ Word }}]` goes on the back**, around the answer; the input
   box appears on the front by itself. One per card. Flags: `ignore-case`,
   `ignore-diacritics`, `ruby="reading"`. Typed cloze blanks:
   `{{ Text | cloze | type-in }}`.
6. **Guard optional fields.** Empty media renders `[Error: missing audio
   file]`, so write `:if-nonblank[{{ Audio }}]{field="Audio"}`. Also
   `:if-blank`, and `:if-true` / `:if-false` for boolean and enum fields.
7. **`:after-reveal[…]` / `:before-reveal[…]` belong on the front.**
8. **Color by an enum:**
   `:color-coding[{{ Word }}]{field="Part of speech" when="always"}` (or
   `when="after reveal"`). The enum's options need colors.
9. **Ruby:** `[漢|字]^{かん|じ}`; show with `{{ F | kana }}` / `{{ F | kanji }}`.
10. **Math:** `$…$`, `$$…$$`, `\cloze{c1}{2xy}[hint]`, `\fieldvalue{Field}`.
    Write `\$` for every literal dollar, in math and prose alike.
11. **Rendering criteria are template properties, not markup:**
    `textFieldNonblank` (text fields only), `onEnumFieldValue`,
    `onBooleanFieldValue`, `onTags`, `composite`, `always`, `never`. To skip a
    card when an image or audio field is empty, wrap the whole front in
    `:::if-nonblank{field="…"}` … `:::`; a card whose front renders blank is
    not shown.
12. **Plain copies:** `{{ F | plain }}` flattens markup, `{{ F | strip-cloze }}`
    shows clozes as text. Platform filters: `uppercase`, `lowercase`, `nfd`,
    `nfc`, `strip-diacritics`.

## Check your work

Saving a note type does not validate template text: an unknown placeholder, a
directive naming a missing field, or color coding on an uncolored enum is
accepted by every write (`add_template` and `update_template` too), `dryRun`
included. Find mistakes by rendering.

1. Get the template ids and field names from `get_note_type`. Before
   `add_template`, check no template already has that name.
2. Call `preview_card` on a real note of that type with `templateId` (required
   for `edits.templateFront` / `edits.templateBack`) and `edits.fields`.
   Nothing is written. `edits.fields` takes **text** fields only: to check an
   empty or null enum, boolean or media path, use a note that has that value,
   making one with `create_note` if needed.
3. Read `diagnostics` (one line per warning, with template, side and code)
   **and** the card HTML: a few mistakes are silent, such as missing media,
   a comma filter list or a placeholder split across lines. A clean render
   has no `diagnostics` key at all. `@deck`, `@subdeck` and `@tags` always
   preview empty.
4. The `cards` list shows per-key cards, but also returns cards whose front
   is blank. To confirm a card is not generated, read `get_note`'s
   `cards[].shouldRender` (or `create_note`'s `cardIds[].renders`).
5. Repeat until clean, on a fully filled note and on one with optional fields
   empty.
