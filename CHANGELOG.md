# Changelog

## Unreleased

### Added

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
