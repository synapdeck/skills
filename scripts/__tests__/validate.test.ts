import { describe, expect, test } from "bun:test";

import { generatedHeader, planGeneratedFiles } from "../lib/generated.ts";
import { validateRepo } from "../lib/validate.ts";
import { makeRepo, makeRepoAt, skillMd } from "./fixtures.ts";

const valid = (name: string, extra = "") =>
  skillMd(`name: ${name}\ndescription: Use when testing.\nmetadata:\n  synapdeck-kind: reference\n${extra}`);

const withInstructions = (files: Record<string, string>) => {
  const root = makeRepo({ "shared/server-instructions.md": "Header.\n", ...files });
  // Write instructions.md the way generate would, so tests isolate the rule under test.
  const instructions = planGeneratedFiles(root).files.get("instructions.md") ?? "";
  return makeRepoAt(root, { "instructions.md": instructions });
};

describe("validateRepo: existing rules", () => {
  test("accepts a well-formed skill", () => {
    expect(validateRepo(withInstructions({ "skills/synapdeck-a/SKILL.md": valid("synapdeck-a") }))).toEqual([]);
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

describe("validateRepo: generated files", () => {
  test("requires synapdeck-kind", () => {
    const root = withInstructions({
      "skills/synapdeck-a/SKILL.md": skillMd("name: synapdeck-a\ndescription: d"),
    });
    expect(validateRepo(root)).toContain("skills/synapdeck-a: metadata.synapdeck-kind must be \"task\" or \"reference\"");
  });

  test("reports a missing copy", () => {
    const root = withInstructions({
      "shared/card-syntax.md": "# Syntax\n",
      "skills/synapdeck-a/SKILL.md": valid("synapdeck-a", "  synapdeck-shared: card-syntax\n"),
    });
    expect(validateRepo(root)).toContain(
      "skills/synapdeck-a/references/card-syntax.md is missing; run bun run generate",
    );
  });

  test("reports a stale copy", () => {
    const root = withInstructions({
      "shared/card-syntax.md": "# Syntax v2\n",
      "skills/synapdeck-a/SKILL.md": valid("synapdeck-a", "  synapdeck-shared: card-syntax\n"),
      "skills/synapdeck-a/references/card-syntax.md": `${generatedHeader("card-syntax")}# Syntax v1\n`,
    });
    expect(validateRepo(root)).toContain(
      "skills/synapdeck-a/references/card-syntax.md is out of date; run bun run generate",
    );
  });

  test("reports a leftover copy", () => {
    const root = withInstructions({
      "skills/synapdeck-a/SKILL.md": valid("synapdeck-a"),
      "skills/synapdeck-a/references/old.md": `${generatedHeader("old")}x\n`,
    });
    expect(validateRepo(root)).toContain(
      "skills/synapdeck-a/references/old.md is a generated copy no skill declares; run bun run generate",
    );
  });

  test("reports a stale instructions.md", () => {
    const root = makeRepo({
      "shared/server-instructions.md": "Header.\n",
      "instructions.md": "Old header.\n",
      "skills/synapdeck-a/SKILL.md": valid("synapdeck-a"),
    });
    expect(validateRepo(root)).toContain("instructions.md is out of date; run bun run generate");
  });

  test("reports a backticked skill name that does not exist, ignoring metadata keys", () => {
    const root = withInstructions({
      "skills/synapdeck-a/SKILL.md": skillMd(
        "name: synapdeck-a\ndescription: d\nmetadata:\n  synapdeck-kind: reference",
        "Load `synapdeck-ghost`. Set `synapdeck-kind`. See `synapdeck-a`.\n",
      ),
    });
    expect(validateRepo(root)).toEqual([
      "skills/synapdeck-a/SKILL.md names skill \"synapdeck-ghost\", which does not exist",
    ]);
  });

  test("a generated, current repo is valid", () => {
    const root = withInstructions({
      "shared/card-syntax.md": "# Syntax\n",
      "skills/synapdeck-a/SKILL.md": valid("synapdeck-a", "  synapdeck-shared: card-syntax\n"),
      "skills/synapdeck-a/references/card-syntax.md": `${generatedHeader("card-syntax")}# Syntax\n`,
    });
    expect(validateRepo(root)).toEqual([]);
  });
});
