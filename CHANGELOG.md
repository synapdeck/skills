# Changelog

## Unreleased

### Added

- `synapdeck-deck-design` — interviewing a user about what they're learning
  and turning it into decks, note types, fields, templates and template
  prerequisites, applied with `apply_deck_blueprint`. Ships the shared
  blueprint format reference, design patterns per domain, prereq conventions, and
  three dry-run-validated example blueprints.
- `synapdeck-card-syntax`, a reference skill for template and field markup:
  placeholders, filters, cloze, type-in answers, hints, conditionals, color
  coding, ruby, math, sequences, variable text, image quizzes and rendering
  criteria. Its reference, `shared/card-syntax.md`, is written to be copied
  into task skills.
- Shared references: material written once in `shared/` and copied into each
  skill that declares it, kept current by `bun run generate` and checked by
  `bun run validate`.
- `instructions.md`, the MCP server instructions, generated from
  `shared/server-instructions.md` and the task skills.
- Claude plugin marketplace manifests, so the repository can be installed
  directly in Claude and Claude Code.
- Apache-2.0 license.

### Removed

- `synapdeck-getting-started`. Its concepts are now the MCP server
  instructions (`instructions.md`), and its connection details are in the
  README.
