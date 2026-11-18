Synapdeck is a spaced-repetition flashcard platform. These terms mean the same thing in every tool:

- A **deck** holds notes. Decks nest into subdecks.
- A **note type** defines **fields** (`text`, `enum`, `boolean`, `image`, `audio`) and **templates**. A template's `front` and `back` are Markdown with `{{ Field name }}` placeholders.
- A **note** is one instance of a note type, with a value for each field. Each template renders a note into a **card**, the unit a user reviews; a cloze template can render several cards from one note.
- A **derived field** is computed from other fields by a **derivation method**. Never supply its value when creating or updating a note.
- **Prereqs** order learning: a prereq is learned before the cards that depend on it. **Peers** are cards kept off the same day because they give each other away. Both can link templates of one note type, or whole notes.

How the tools fit together:

- Create decks, note types and templates before notes: a note records the version of the note type it was created against.
- `apply_deck_blueprint` creates a whole structure in one transaction. Run it with `dryRun: true` first and show the plan to the user.
- Only `apply_deck_blueprint` checks template text, and only the field names it mentions. Other writes save an unknown `{{ Field }}` or a directive naming a missing field without complaint. Either way, check the cards with `preview_card` on a real note.
- Changing a note type or one of its templates re-renders its notes in the background. The result carries a `cascadeOperationId` to pass to `get_operation_status`.
