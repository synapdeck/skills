<!-- Generated from shared/card-syntax.md. Edit that file and run bun run generate. -->

# Synapdeck card syntax

The markup language of note-type templates (a template's `front` and `back`)
and of text field values. The examples were checked with `preview_card`,
except image quizzes and key fields, which need a note with image keys.

## Contents

- [Where markup lives](#where-markup-lives)
- [Markdown baseline](#markdown-baseline)
- [Field placeholders](#field-placeholders)
- [Filters](#filters)
- [Comments](#comments)
- [Built-in placeholders](#built-in-placeholders)
- [Asset placeholders](#asset-placeholders)
- [Directive syntax](#directive-syntax)
- [Cloze deletions](#cloze-deletions)
- [Cloze contexts](#cloze-contexts)
- [Reveal-dependent content](#reveal-dependent-content)
- [Hints](#hints)
- [Type-in answers](#type-in-answers)
- [Field conditionals](#field-conditionals)
- [Cloze conditionals](#cloze-conditionals)
- [Color coding](#color-coding)
- [Content language](#content-language)
- [Ruby](#ruby)
- [Math](#math)
- [Sequences](#sequences)
- [Variable text](#variable-text)
- [Image quizzes and image display](#image-quizzes-and-image-display)
- [Rendering criteria](#rendering-criteria)
- [Authoring traps](#authoring-traps)
- [Checking your work](#checking-your-work)

## Where markup lives

- A **template** has a `front` and a `back`. It references fields with
  `{{ Field }}` and adds structure (directives, layout, `{{ @front }}`).
- A **text field value** is the same markup. A placeholder expands its field
  recursively, so a field can hold clozes, ruby, math, directives and other
  `{{ Field }}` references.
- Card-specific content (cloze deletions, sequence keys) belongs in **fields**.
  A template that writes `:c1[…]` itself gets a `cloze_key_at_template_level`
  warning, because those keys make cards on every note, blank ones included.
  The usual cloze template front is `{{ Text | cloze }}`.

## Markdown baseline

CommonMark plus GFM, with these differences:

- **No setext headings.** `Heading?` followed by `---` is a paragraph and a
  rule. Use `#` headings.
- **No footnotes.** Strikethrough (`~~x~~`), tables, task lists (`- [x]`,
  rendered disabled) and bare-URL autolinks work.
- **Superscript and subscript:** `x^2^`, `H~2~O`. No whitespace inside (write
  `^a\ b^`); escape a literal delimiter as `\^` / `\~`.
- **Emoji shortcodes:** `:tada:` → 🎉. Text like `12:45` or `a:b` stays as typed.
- **Table cells:** a `|` inside a placeholder, ruby, directive or math does not
  split the cell: `| {{ Meaning | plain }} | [漢|字]^{かん|じ} |` is two cells.
  Escape a literal `|` as `\|`.
- **Dollar signs** may open math; see [Math](#math).

## Field placeholders

```
{{ Field name }}
{{ Field name | filter | filter: value }}
```

- Names match **case-insensitively**, after Unicode normalization and
  whitespace collapsing: `{{ word }}` and `{{Word}}` both render the `Word`
  field.
- A name that matches no field (nor a built-in or asset) stays in the output as
  literal text and raises `unknown_field_reference`. Write `\{{ … }}` to show
  braces on purpose.
- A placeholder must sit on one line. One split across lines is plain text,
  with no diagnostic.
- Separate filters with `|`. The comma form `{{ F | plain, strip-cloze }}`
  does not parse: the whole span stays literal, with no diagnostic.
- Inside a placeholder nothing else is parsed: `{{ note :c1[x] }}` is a
  placeholder, not a cloze.
- By field type: text expands as markup; enum renders the option's label;
  boolean renders its true/false label (default `True` / `False`); image and
  audio render the media element.
- Field names may not start with `#`, `/`, `^`, `@`, `!`, `>`, `&` or `=`.

## Filters

Built-in filters (case-sensitive: `{{ F | Plain }}` applies nothing and warns
`inexact_builtin_filter_name`):

| Filter | Effect |
| --- | --- |
| `cloze` | Wrap the expansion in a cloze context, so its deletions make cards |
| `no-cloze` | Cancel an enclosing cloze context (`no cloze` also accepted) |
| `strip-cloze` | Always strip cloze markup to its content |
| `plain` | Flatten to plain text, escaped so it cannot inject markup. `H~2~O` → `H2O`. An image or audio field yields its alt text or transcript (empty if none) |
| `furigana` / `kana` / `kanji` | Ruby display: base with reading (default), reading only, base only |
| `sequence` | Treat the field's list as a [sequence](#sequences) |
| `variable` | Treat the field's list as [variable text](#variable-text) |
| `type-in` / `no-type-in` | Only next to `cloze`: make the deletions typed blanks (see [Type-in answers](#type-in-answers)) |

**Platform text filters** need no definition: `uppercase`, `lowercase`, `nfd`,
`nfc`, `strip-diacritics`.

```
{{ Meaning | uppercase }}                 to eat → TO EAT
{{ Extra | strip-diacritics: cedilla }}   Ça va → Ca va
```

- Case conversion follows the text's language (a `:lang` region, then the
  field's language, then the deck's), so Turkish `i` uppercases to `İ`.
- `strip-diacritics` with options (space-separated mark names: `acute`,
  `grave`, `circumflex`, `macron`, `breve`, `cedilla`, `caron`, `diaeresis`,
  `pinyin-tone`, `niqqud`, `harakat`, …) removes exactly those marks. With no
  options it removes what the text's language omits in standard spelling
  (Latin, Russian, Hebrew, Arabic, Italian, …). Text with no language warns
  `strip_diacritics_no_language` and is left unchanged.
- Separate options with spaces. A comma (`strip-diacritics: acute, grave`)
  leaves the whole placeholder as literal text and warns
  `comma_in_filter_options`.
- `nfd` splits combining marks off; `nfc` recomposes.
- Filters run left to right on each text node after full expansion, so they
  never see markup and cannot create it. `plain` always applies first,
  wherever it is written.

**Named filters.** A note type can define its own filters (regex,
substitution, or an alias of a platform filter), but rendering does not yet
apply them: a name that is not a built-in or platform filter renders the
content unfiltered with `unknown_text_filter`. Filters do not apply to
`@` built-ins or inside math `\fieldvalue`.

## Comments

```
{{! note to self }}
```

Dropped from output. Content may not contain `{` or `}`. A front made only of
comments counts as blank.

## Built-in placeholders

| Placeholder | Value |
| --- | --- |
| `{{ @front }}` | The rendered front, for use on the back |
| `{{ @type }}` | Note type name |
| `{{ @card }}` | Template name |
| `{{ @deck }}` | Full deck path, joined with ` > ` |
| `{{ @subdeck }}` | Innermost deck name |
| `{{ @tags }}` | The note's tags, comma-joined |

- `{{ @front }}` replays the front in its revealed state: clozes show their
  answers, and every `:hint`, `:before-reveal` / `:after-reveal` and even a
  misplaced front `:type-in` come along. On the front it renders nothing and
  warns `front_builtin_on_front`.
- `preview_card` renders `@deck`, `@subdeck` and `@tags` empty, without a
  warning; don't judge them from a preview.

## Asset placeholders

```
{{ note-type-asset:Logo }}    the note type's shared media
{{ deck-asset:Logo }}         the home deck's asset library
{{ asset:Logo }}              either
```

A name both hold shows neither asset and warns `ambiguous_asset_reference`;
write the qualified form. A name neither holds renders
`[Error: missing image file]` (even when you meant audio) with **no
diagnostic**. Asset names are normalized like field names.

## Directive syntax

```
:name[inline content]{attr="value" flag}

:::name{attr="value"}
block content
:::
```

Most constructs take both forms. An unknown attribute on a known directive
warns `unknown_directive_attribute` and is ignored. A name that is no
directive (`:cx[…]`, `:c[…]`) renders as the literal text typed.

## Cloze deletions

```
Paris is the :c1[capital of :c2[France]].
:c1[東京]{hint="*capital*: {{ Extra }}"}

:::c2{hint="block"}
Block deletion
:::
```

- **Key:** `c` followed by a digit, `-` or `_`, then any non-space characters:
  `c1`, `c2`, `c_es`, `c-x`, `c1a`. `:c[…]` and `:cx[…]` are not clozes.
- Each distinct key makes one card for the note/template pair. The card's own
  deletion becomes a blank (`[…]`, or `[hint]`); other keys show their text.
- **Nesting creates prereqs:** a key whose deletions all sit inside another
  key's deletions becomes a prereq of that card. Above, `c2` (France) is a
  prereq of `c1`; the `c1` card blanks the whole phrase including `France`.
- `hint` is inline markdown: emphasis, inline math and `{{ Field }}` work.
- Attributes: `hint`, `type-in`, `no-type-in`. Empty content warns
  `empty_directive_content`.
- **Clozes only work inside a cloze context** (next section). Outside one they
  render as plain text and make no cards. This is the most common mistake.

## Cloze contexts

```
{{ Text | cloze }}
:cloze[This :c1[phrase] makes a card.]
:no-cloze[off :c2[x] :cloze[on :c3[y]]]
:strip-cloze[always plain]

:::cloze
Block :c4[region].
:::
```

- The innermost context wins. In the third line `c2` makes no card (and shows
  `x` as plain text); `c3` makes one. `:strip-cloze[always :c9[plain]]`
  renders `always plain` and makes no card.
- `{{ F | cloze }}`, `{{ F | no-cloze }}`, `{{ F | strip-cloze }}` are the
  same contexts applied to a transcluded field. A typical cloze note type
  shows the field once with `cloze` and elsewhere with `strip-cloze` or
  `plain`.
- A cloze context directly inside another warns `nested_cloze_context`; the
  bare flag `allow-embedding-in-outer-cloze-context` on the inner one silences
  it. A context inside a deletion that repeats the deletion's key
  (`:c1[foo :cloze[:c1[bar]]]`) warns `duplicate_cloze_key_in_deletion`;
  `allow-embedding-in-duplicate-key-deletion` silences that. Both flags also
  work as placeholder filters.

## Reveal-dependent content

```
:before-reveal[shown until the answer is revealed]
:after-reveal[shown once the answer is revealed]
```

Block forms work; no attributes. Put them on the **front**. The back is always
revealed, so written directly on a back, `:before-reveal` content never shows
(`before_reveal_on_back`) and `:after-reveal` content shows but the wrapper
has no effect (`after_reveal_on_back`). Through `{{ @front }}` the back shows
the revealed state.

## Hints

```
:hint[a mnemonic]{label="Need help?"}
```

A click-to-reveal toggle, independent of answer reveal. `label` defaults to
`Show hint`. Block form works. `{{ @front }}` carries the hint onto the back.

## Type-in answers

```
:type-in[{{ Word }}]{ignore-case ignore-diacritics}
:type-in[{{ Reading }}]{ruby="reading"}
```

- Goes on the **back**, around the expected answer. The input box appears on
  the front automatically; write nothing on the front. On a front it renders
  its content with no box and warns `type_in_on_front`.
- One per card: only the first gets a box (`type_in_multiple`). Count what
  `{{ @front }}` brings in. An empty `:type-in[]` warns `type_in_empty`.
- Flags: `ignore-case`, `ignore-diacritics`; `ruby="base"` (default) or
  `ruby="reading"` to compare against a ruby run's reading. A field shown with
  `kana` / `kanji` always compares against that projection.
- The answer is the content **as rendered** (fields expanded, filters
  applied); math compares as its TeX source. Comparison is per grapheme after
  NFC and whitespace collapsing; quotation marks fold together, as do hyphens
  and dashes (not `−`); case and diacritics count unless flagged.
- Formatting wrapping the whole answer (`:type-in[**{{ Word }}**]`) is moved
  outside the box and kept.
- **Typed cloze blanks:** `{{ Text | cloze | type-in }}`, `:cloze[…]{type-in}`
  or `:c1[Paris]{type-in}`. A deletion's own flag beats its context's. A
  `type-in` filter without `cloze` does nothing
  (`type_in_filter_without_cloze`). Block (`:::c1`) and math `\cloze`
  deletions stay ordinary blanks (`type_in_unsupported_cloze`).

## Field conditionals

```
:if-nonblank[{{ Audio }}]{field="Audio"}
:if-blank[No example.]{field="Example sentence"}
:if-true[Irregular!]{field="Flag"}
:if-false[Regular.]{field="Flag"}

:::if-nonblank{field="Example sentence"}
> {{ Example sentence }}
:::
```

- Blank means empty or whitespace-only text, or no media file.
- `if-true` / `if-false` are for boolean fields, and for enums (true = an
  option is chosen). On a text field they warn and act as
  `if-nonblank` / `if-blank`.
- A field name that does not exist hides the content, shows
  `[if-nonblank: field "…" not found]` in the card and warns
  `unresolved_conditional`. Add the bare flag `optional` to treat a missing
  field as absent, silently.
- Dropped content makes no cloze cards.

## Cloze conditionals

```
:if-cloze[Only on the c2 card]{key="c2"}
:if-not-cloze[Everywhere but c2]{key="c2"}
```

Decided per card by its key. `key` is required. Block forms work.

## Color coding

```
:color-coding[{{ Word }}]{field="Part of speech" when="always"}
```

- Colors content with the text and fill colors of the note's current option in
  an **enum** field. Options without colors leave it plain.
- `when`: `"always"` or `"after reveal"` (`after-reveal` also accepted).
  Omitting it warns `color_coding_when_missing` and means after reveal.
- A non-enum field, or an enum with no colors, renders uncolored with
  `field_without_color_coding`.
- Block form works. Colors are HTML-only; PDF worksheets ignore them.

## Content language

```
:lang[bonjour]{lang="fr"}
:lang-zh-Hant[漢字]
:::lang{lang="ja"}
Block content.
:::
```

- `lang` is a BCP 47 tag. Missing or unparseable: content kept, warning, no
  effect. `:lang-<tag>` is shorthand (case-sensitive name).
- A run's language is the nearest of: a `:lang` region, the field's own
  language, the deck's language. It drives fonts, case conversion,
  `strip-diacritics` defaults and `ignore-case`. Leave fields untagged when the
  deck's language should decide.

## Ruby

```
[漢字]^{かんじ}
[漢|字]^{かん|じ}          aligned per segment
[:c1[漢字]]^{かんじ}       cloze the base, keep the reading
```

- `|` splits base and reading into segments; segment counts must match.
  Escapes: `\\`, `\]`, `\}`, `\|`.
- Directives inside the base work, as the cloze above shows (inside a cloze
  context).
- `{{ F | kana }}` shows readings only, `{{ F | kanji }}` bases only,
  `furigana` (default) both.

## Math

```
$x^2 + \cloze{c1}{2xy}[cross term] + y^2$
$V = \fieldvalue{Extra}$
$$\int_0^1 x\,dx$$
```

- `$…$` inline, `$$…$$` display; LaTeX math.
- `\cloze{key}{content}[hint]` is a cloze inside math, same keys and context
  rules as `:c1[…]` (no typed input).
- `\fieldvalue{Field}[filters]` inserts a field inside math. Of the filters
  only `no-cloze` acts.
- **Dollar pairing:** `$…$` is math only when the opening `$` is followed by a
  non-space, the closing `$` is preceded by a non-space, and no digit follows
  the closing `$`. So `he paid $50, then $20 more` stays prose.
- **Write `\$` for a literal dollar, inside math too.**
  `$\cloze{c1}{3}[costs \$5]$` works. `$\cloze{c1}{3}[costs $5]$` pairs at the
  inner `$`: the macro shows as raw text, the `c1` card is lost, and
  `math_macro_span_demoted` is reported. Switching to `$$…$$` does not rescue
  an unescaped `$` in a hint: the front then shows a math parse error.

## Sequences

Ordered material (poem lines, steps); each card blanks one item and shows its
neighbors as context.

```
{{ Poem | sequence | context: 1 | display-mode: poetry }}
```

with the field holding a list:

```
1. :key[c1] First line
2. :key[c2] Second line
3. :keys[c3 c3b] Third line
4. :skip-item Refrain
5. :key[c4] Fifth line
```

- Or inline as `:::sequence{context="1" display-mode="poetry"}` around the
  list.
- Items take `:key[k]`, `:keys[k1 k2]` (one card per key), or `:skip-item`
  (context only, never quizzed). Keys share the cloze key space; no cloze
  context is needed.
- A `:key` / `:keys` directive goes at the start or the end of its item.
  Mixing the two placements in one list warns
  `sequence_mixed_key_placement`.
- `context: N` (default 1), or `context-before` / `context-after`; a
  non-negative integer or `all`. Items outside the window are absent.
- `display-mode`: `list` (default, keeps numbering), `prose`, `poetry`.

## Variable text

Alternatives where each card shows only the items for its key, such as one
example sentence per cloze.

```
{{ Examples | variable }}
{{ Examples | variable | fallback: none }}
```

with the field holding an **unordered** list:

```
- :key[c1] Example for c1
- :key[c2] Example for c2
```

- Every item needs `:key` / `:keys`. Content that is not an unordered list
  warns `variable_text_content_not_list`.
- `fallback` for a card whose key no item carries: `error` (default; shows
  `[No variable text for key "c3"]` and warns
  `variable_text_unmatched_key`), `all`, or `none`. Directive form:
  `:::variable{fallback="all"}`.

## Image quizzes and image display

An image field can carry shapes assigned to named keys (drawn in the app's
image editor). A quiz filter on the placeholder makes one card per key:

```
{{ Pic | occlusion }}     mask shown before reveal, hidden after
{{ Pic | identify }}      shape always shown: "what is this?"
{{ Pic | locate }}        shape shown only after reveal: "where is X?"
```

- At most one quiz filter per placeholder. A value is a key-tag selector:
  `identify: cities`, `prefix*`, `*`.
- Keys come from the template **front** only; a quiz image only on the back
  makes no per-key cards.
- `decorative-markup[: tags]`, `decorative-markup-before-reveal`,
  `decorative-markup-after-reveal`, `no-decorative-markup` control non-quiz
  shapes.
- Size bounds on any image: `max-width: 200px` (`px`, `em`, `%`),
  `max-height: 10em` (`px`, `em` only; `%` warns `image_filter_percent_height`
  and is ignored). No space between number and unit.
- An image that shares its paragraph (or heading, or table cell) with text is
  inline and capped at `max-height: 2em`. Put it in a paragraph of its own to
  show it full size, or give it an explicit `max-height`, which wins. Quiz
  images are never inline.
- Shapes and keys are drawn in the app, not written as markup. Preview a quiz
  template against a note whose image already has keys.

### Key fields

A key field is a note-level text column holding one value per image key.
`{{ Country }}`, where `Country` is a key field, renders the value for the
card's key: blank if that value is blank, nothing (with
`key_field_unresolved_key`) on a card whose key is not an image key.

- On the template **front**, a key field placeholder makes one card per key
  with a nonblank value, like variable text. On the back it makes none.
- Values are markup: `{{ … }}` placeholders expand. Keyed constructs inside a
  value (clozes, `:key`, sequences, variable text, image quizzes) render
  literally and warn `key_field_keyed_construct`.
- Set values with `update_note`'s `keyFieldValues` (key field name → image key
  name → value; `get_note` lists them in `keyFields`). Draft them with
  `preview_card`'s `edits.keyFieldValues`.

## Rendering criteria

A template's `renderingCriterion` decides per note whether its card is shown.
It is a property of the template (set on `create_note_type`,
`apply_deck_blueprint`, `add_template`, `update_template`), not markup.

| `condition` | Other keys | Shown when |
| --- | --- | --- |
| `always` | | always (default) |
| `never` | | never |
| `fieldNonblank` | `controllingFieldName` | the named text, image or audio field is filled in |
| `onEnumFieldValue` | `controllingFieldName`, `matchingOptionLabels`, optional `matchesIrregular` | the enum's chosen option is one of the labels |
| `onBooleanFieldValue` | `controllingFieldName`, `matchingValue` | the boolean equals `matchingValue` |
| `onTags` | `tags`, `mode`: `hasAny` / `hasAll` / `lacksAll` | the note's tags match |
| `composite` | `operator`: `and` / `or`, `subcriteria`: leaf criteria | the combination holds (one level, no nesting) |

```json
{ "condition": "composite", "operator": "and", "subcriteria": [
  { "condition": "onEnumFieldValue", "controllingFieldName": "Kind", "matchingOptionLabels": ["A"] },
  { "condition": "onTags", "tags": ["keep"], "mode": "hasAny" } ] }
```

- `fieldNonblank` counts text that is not just whitespace, or an attached
  image or recording. A card whose criterion fails is not shown
  (`renders: false` in `create_note`'s `cardIds`).
- Ad hoc script fields are not available to criteria.

## Authoring traps

- **The back is shown alone by default.** The reviewer setting that hides the
  question on reveal is on, so a back must restate the question: begin it
  with `{{ @front }}`. That also replays any `:hint`; if the front has a hint
  you don't want on the back, restate the question in the back instead. A
  back that renders empty shows the revealed front in its place (how cloze
  cards work). A template's `hideQuestionOnRevealOverride: false` keeps the
  question visible for every reviewer.
- **A null enum renders its null option's label** (`nullOption.label` in
  `get_note_type`, `[N/A]` on older fields), in placeholders and hints alike.
  Guard with `:if-true[…]{field="…"}` to show nothing instead.
- **Empty media is an error, not a blank.** A bare `{{ Audio }}` / `{{ Image }}`
  on a note whose field is empty renders `[Error: missing audio file]` /
  `[Error: missing image file]`, and `preview_card` lists no diagnostic for
  it. Wrap optional media: `:if-nonblank[{{ Audio }}]{field="Audio"}`.
- **Clozes need a context.** `:c1[…]` in a field shown without `| cloze`
  makes no card.
- **Clozes go in fields, not templates** (`cloze_key_at_template_level`).
- **Most writes don't validate template text.** `create_note_type`,
  `update_note_type`, `add_template` and `update_template` accept an unknown
  `{{ Field }}`, a directive naming a missing field, or `:color-coding` on an
  uncolored field. These appear only in `preview_card` diagnostics against a
  real note. `apply_deck_blueprint` is the exception: it rejects field names
  that don't exist and warns about uncolored color codings.
- **Some mistakes are silent.** A comma-separated filter list, a placeholder
  split across lines, and missing media produce no diagnostic; read the
  rendered HTML too.
- **`add_template` does not check names.** Look in `get_note_type` for a
  template of that name first; a retry adds a second copy. Template names
  must be unique (case-insensitively) wherever template relations reference
  them by name.
- **Escape dollars** (`\$`) in any field that may contain prices, and always
  inside math.

## Checking your work

Render drafts with `preview_card` against a real note of the note type. It
writes nothing.

- `edits.templateFront` / `edits.templateBack` render draft template text and
  require `templateId`. `edits.fields` renders draft values for **text**
  fields only (case-insensitive names, `null` clears); enum, boolean, image
  and audio values are refused, so check those paths on a note that already
  has them (make one with `create_note`).
- The result lists one entry per card (per cloze/sequence key) with `front`
  and `back` HTML, the stored `baseline`, and `diagnostics`: one line per
  warning, naming the template, side and code. A clean render has no
  `diagnostics` key at all.
- A preview still returns a card whose front renders blank (`<div></div>`).
  Whether a card exists is `get_note`'s `cards[].shouldRender` (or
  `create_note`'s `cardIds[].renders`), not the preview.
- Iterate until `diagnostics` is gone and the HTML shows what you meant.
  Check a note with every optional field empty as well as a full one.
