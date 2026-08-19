# Synapdeck skills

Agent skills for [Synapdeck](https://synapdeck.com), the collaborative
spaced-repetition flashcard platform, plus a connection to Synapdeck's hosted
MCP server.

This repository is the source of truth for every distribution channel. It is
also a Claude plugin marketplace, so adding it in Claude installs the skills
and the MCP connector in one step.

## Install

**Claude (claude.ai, Desktop, Cowork — paid plans)**
Customize → Plugins → Add from a repository → `synapdeck/skills`

**Claude Code**

```bash
/plugin marketplace add synapdeck/skills
/plugin install synapdeck@synapdeck
```

**Codex CLI, OpenCode, Cursor, and other `npx skills` clients**

```bash
npx skills add synapdeck.com
```

**Any MCP client, skills aside**
Connect to `https://synapdeck.com/api/mcp` (Streamable HTTP, OAuth 2.1).

## Layout

```
.claude-plugin/
  marketplace.json   # this repo as a Claude marketplace; the plugin source is "./"
  plugin.json        # the plugin itself: metadata + the Synapdeck MCP server
skills/
  <skill-name>/
    SKILL.md         # frontmatter name must equal the directory name
scripts/
  validate-skills.ts   # bun run validate
```

Because the marketplace entry and the plugin manifest both live at the
repository root, `skills/` is scanned directly — there is no per-plugin
subdirectory.

## Authoring a skill

Add `skills/<skill-name>/SKILL.md`. The directory name **is** the skill name:
1–64 characters, lowercase alphanumeric and hyphens, no leading, trailing, or
consecutive hyphens. Start the file with YAML frontmatter (`---` on line 1)
carrying `name` (equal to the directory name) and `description` (1–1024
characters, describing when an agent should load the skill).

Supporting files go in subdirectories beside `SKILL.md`; relative links in the
body must resolve to files that ship with the skill.

Validate before pushing:

```bash
bun install
bun run validate
```

Neither manifest sets a `version`. A pinned version would mean users only
receive updates when that string changes — leaving it unset is what makes
pushing to the default branch the release for Claude clients.

## License

[Apache-2.0](LICENSE). Section 6 reserves the Synapdeck trademarks: a fork may
modify these skills, but may not identify itself by the Synapdeck name.

## Consumers

Pushing here releases to Claude clients immediately. The other channels are
built by the Synapdeck monorepo from a pinned revision of this repository:
`https://synapdeck.com/.well-known/agent-skills/` (per the Cloudflare
agent-skills-discovery RFC) and the `npx skills` marketplace listing. A skill
change that depends on unreleased server behavior should stay on a pull
request until that server change has deployed.
