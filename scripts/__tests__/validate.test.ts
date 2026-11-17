import { describe, expect, test } from "bun:test";

import { validateRepo } from "../lib/validate.ts";
import { makeRepo, skillMd } from "./fixtures.ts";

const valid = (name: string, extra = "") =>
  skillMd(`name: ${name}\ndescription: Use when testing.\nmetadata:\n  synapdeck-kind: reference\n${extra}`);

describe("validateRepo: existing rules", () => {
  test("accepts a well-formed skill", () => {
    const root = makeRepo({ "skills/synapdeck-a/SKILL.md": valid("synapdeck-a") });
    expect(validateRepo(root).filter(e => !e.includes("instructions"))).toEqual([]);
  });

  test("accepts a SKILL.md that begins with a UTF-8 BOM", () => {
    const root = withInstructions({ "skills/synapdeck-a/SKILL.md": "\uFEFF" + valid("synapdeck-a") });
    expect(validateRepo(root)).toEqual([]);
  });

  test("rejects a name that differs from the directory", () => {
    const root = makeRepo({ "skills/synapdeck-a/SKILL.md": valid("synapdeck-b") });
    expect(validateRepo(root)).toContain(
      "skills/synapdeck-a: frontmatter name \"synapdeck-b\" must match the skill directory name",
    );
  });

  test("rejects a non-string metadata value", () => {
    const root = makeRepo({
      "skills/synapdeck-a/SKILL.md": valid("synapdeck-a", "  synapdeck-requires-mcp-tools:\n    - a\n"),
    });
    expect(validateRepo(root)).toContain(
      "skills/synapdeck-a: metadata.synapdeck-requires-mcp-tools must be a string, got array",
    );
  });

  test("rejects a link to a file the skill does not ship", () => {
    const root = makeRepo({
      "skills/synapdeck-a/SKILL.md": skillMd(
        "name: synapdeck-a\ndescription: d\nmetadata:\n  synapdeck-kind: reference",
        "See [x](references/missing.md).\n",
      ),
    });
    expect(validateRepo(root)).toContain(
      "skills/synapdeck-a: SKILL.md links to \"references/missing.md\", which does not exist in the skill directory",
    );
  });

  test("rejects SKILL.md without frontmatter", () => {
    const root = makeRepo({ "skills/synapdeck-a/SKILL.md": "# No frontmatter\n" });
    expect(validateRepo(root)).toContain(
      "skills/synapdeck-a: SKILL.md must begin with YAML frontmatter delimited by --- fences",
    );
  });
});
