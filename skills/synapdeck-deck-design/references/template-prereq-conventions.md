# Template prereq and peer conventions

A template prereq says that one template's card is learned before another's,
for the same note. A peer says that two cards give each other away, so
they shouldn't come up on the same day. Both are declared once on the note
type and apply to every note.

Explain the ordering to the user in plain terms ("you'll learn to recognize
a word before you're asked to produce it"). Ask before adding ordering they
haven't agreed with.

## When a prereq fits

| Domain | Prereq (learned first) | Dependent |
| --- | --- | --- |
| Vocabulary | Recognition (word → meaning) | Production (meaning → word), Listening (audio → word) |
| Characters or scripts | Reading (character → sound) | Writing (sound → character) |
| Terminology | Term → definition | Definition → term |
| Word parts | Part → meaning | Meaning → part |
| Formulas | Recall the formula | When to use it |
| Problem sets | Choose the method or equation | Solve fully |
| Anatomy or diagrams | Identify the labeled part | Locate the part on an unlabeled diagram |
| Code | What this snippet does | Write a snippet that does this |

The general rule: **recognition before production, concept before
application**. A prereq makes sense when the dependent card is unfair, or
pointless, without the other one learned first.

## When a peer fits

Use a peer for two directions of roughly equal difficulty where seeing one
answers the other:

- brand → generic and generic → brand
- country → capital and capital → country
- symbol → element and element → symbol

If one direction is clearly harder, use a prereq instead: the easier
direction comes first.

## When to add neither

- Two templates that ask about **different** fields of the note
  ("What class is this drug?" and "What are its side effects?") don't spoil
  each other and don't need an order. Leave them unrelated.
- Don't chain every template into one long line. Each extra prereq delays
  the dependent card, and long chains slow a beginner down. One or two
  levels is usually enough.

## Rules the server enforces

- Prereqs must not form a cycle (A before B before A). The dry run rejects
  one.
- Relations refer to templates by name, so names must be unique within the
  note type, ignoring case and width.
- Template relations exist only *within* one note type.

## Ordering across note types

"Learn the word parts before the terms built from them" spans two note types.
That is a relation between notes, not templates. Create both kinds of note
first, then link them with `add_prerequisite` (or `add_peer_relationship`).
Every card of the prereq note becomes a prereq of every card of the
dependent note. Mention this to the user when you propose the design, and
do the linking after the notes exist.

## Cloze cards order themselves

In a cloze note, a deletion nested inside another (`:c2[the :c1[mitochondria]
is the powerhouse]`) automatically makes `c1`'s card a prereq of `c2`'s. You
don't declare anything for this.
