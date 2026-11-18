# Note type design patterns

Starting shapes for common subjects. Adapt each one to what the user told
you; don't copy one wholesale. Each pattern lists the fields, the templates
and the ordering. The `assets/example-blueprints/` files are complete,
dry-run-validated versions of the first three.

## Vocabulary (any language)

*Example: [japanese-vocabulary.json](../assets/example-blueprints/japanese-vocabulary.json)*

- **Fields:** Word (`lang` = the target language), Reading or
  pronunciation, Meaning (`lang` = the learner's language), Part of speech
  (`enum`, colored), Gender or noun class if the language has one (`enum`,
  colored), optional Example sentence and its translation, optional Audio.
- **Templates:** Recognition (word → meaning), Production (meaning →
  `:type-in` word), Listening (audio → word, front gated with
  `:::if-nonblank{field="Audio"}`).
- **Order:** Production and Listening both depend on Recognition.
- **Variations:**
  - **Gendered languages:** color the word by gender with
    `:color-coding[{{ Word }}]{field="Gender" when="after reveal"}`, so the
    learner sees the color only after recalling the gender.
  - **Scripts with a romanization method:** derive Romanization from Word
    with a platform derivation method, so it never needs typing.
  - **Japanese:** ruby annotations are written `[漢字]^{かんじ}`.
    `{{ Word | kanji }}` and `{{ Word | kana }}` project out the base and
    the reading.
- **Avoid:** a single Meaning ↔ Word template pair with no ordering, and
  putting the example sentence on the front, where it gives the answer away.

## Factual recall (terminology, pharmacology, anatomy, history)

*Example: [medical-terminology.json](../assets/example-blueprints/medical-terminology.json)*

- **Fields:** the item's name, then one field per fact the user must recall
  (definition, class, use, date, location). Use `enum` for a small closed
  category the user wants color-coded or filtered (body system, prefix /
  root / suffix). Use `text` when the category list is long or open.
- **Templates:** one per fact the user must be able to **recall**, asked
  from the item's name. Add the reverse direction only where the user needs
  it (definition → term for spelling and production).
- **Optional facts:** gate each optional fact's template with
  `fieldNonblank`, so it makes a card only where it is filled in.
- **Order:** the reverse direction depends on the forward one. Facts that
  explain each other (a drug's class explains its uses) can be ordered
  class-first. Most facts need no ordering.
- **Building blocks:** when items are composed of parts (word parts → terms,
  amino acids → proteins), make the parts their own note type and link the
  notes with `add_prerequisite` after creation.

## Problems and worked examples (physics, math, chemistry, accounting)

*Example: [kinematics-problems.json](../assets/example-blueprints/kinematics-problems.json)*

- **Two note types:** one for the tools (equations, rules, theorems) and one
  for the problems that use them.
- **Tool fields:** Name, Formula (math as `$$…$$`), Symbols, When to use.
  **Templates:** recall the formula; formula → when to use it.
- **Problem fields:** Problem, the method or equation it needs (`enum`, so
  it can be colored and filtered), Why that method, Solution, optional
  Diagram. **Templates:** "Choose the equation" (`writingSpaceOverride:
  "small"`) and "Solve" (`show-work`), with Solve depending on Choose.
- **Randomized numbers:** if the user wants fresh numbers on every review
  so they practice the method instead of memorizing an answer, that is an
  ad hoc script on each problem note (the `synapdeck-ad-hoc-scripts`
  skill), added after the deck exists. The note type needs no change for it.

## Cloze passages (definitions, laws, procedures, poems)

When the material is prose the user wants to recall piece by piece, use one
`text` field holding the passage with deletions, plus an optional Extra.

```json
{
  "name": "Cloze",
  "front": "{{ Text | cloze }}",
  "back": "{{ Text | cloze }}\n\n:if-nonblank[{{ Extra }}]{field=\"Extra\"}",
  "hideQuestionOnRevealOverride": true
}
```

Note text: `The :c1[mitochondria] is the :c2[powerhouse] of the cell.` Each
key (`c1`, `c2`, …) becomes its own card. A hint goes in the deletion:
`:c1[Paris]{hint="city"}`. Nesting one deletion inside another makes the
inner card a prereq of the outer one automatically. Cloze cards are
generated from the note's content, so the template count stays at one.

## Code snippets

- **Fields:** Snippet (a fenced code block in the field text), What it does,
  Language (`enum`) or a tag, optional Gotcha.
- **Templates:** Snippet → what it does (recognition); What it does →
  write it (production, `show-work` for printing); optionally a cloze on the
  snippet for exact syntax.
- **Order:** production depends on recognition.

## Diagrams and images (anatomy, maps, circuits)

- **Fields:** Image, plus a label field per thing the user identifies, or a
  single image with shape markup the user draws in the note editor.
- **Templates:** Identify (labeled region → name) before Locate (name →
  find it on the image). Image-quiz markup is drawn per note in the editor
  after creation; the blueprint only needs the image field and the
  templates.

## Choosing field types

| The attribute is… | Use |
| --- | --- |
| Free text, a sentence, a formula | `text` |
| One of a short fixed list the user wants colored or filtered on | `enum` (with `textColor`) |
| Yes/no (irregular? countable?) | `boolean` |
| A picture | `image` |
| A recording | `audio` |
| Computable from another field by a platform method | the output type, plus `derivation` |

Keep field names short and human. The user sees them in the note editor,
and templates refer to them by name.
