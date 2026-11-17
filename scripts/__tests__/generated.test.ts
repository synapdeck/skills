import { describe, expect, test } from "bun:test";

import {
  generatedHeader,
  planGeneratedFiles,
  renderInstructions,
  staleGeneratedCopies,
} from "../lib/generated.ts";
import { makeRepo, skillMd } from "./fixtures.ts";

const skill = (name: string, kind: string, shared?: string) =>
  skillMd(
    `name: ${name}\ndescription: Use when doing ${name}.\nmetadata:\n  synapdeck-kind: ${kind}\n`
    + (shared === undefined ? "" : `  synapdeck-shared: ${shared}\n`),
  );

describe("planGeneratedFiles", () => {
  test("copies each declared topic under the skill's references with the header", () => {
    const root = makeRepo({
      "shared/server-instructions.md": "Header.\n",
      "shared/card-syntax.md": "# Syntax\n",
      "skills/synapdeck-a/SKILL.md": skill("synapdeck-a", "task", "card-syntax"),
    });
    const plan = planGeneratedFiles(root);
    expect(plan.errors).toEqual([]);
    expect(plan.files.get("skills/synapdeck-a/references/card-syntax.md")).toBe(
      `${generatedHeader("card-syntax")}# Syntax\n`,
    );
  });

  test("reports a declared topic with no source file", () => {
    const root = makeRepo({
      "shared/server-instructions.md": "Header.\n",
      "skills/synapdeck-a/SKILL.md": skill("synapdeck-a", "task", "nope"),
    });
    expect(planGeneratedFiles(root).errors).toEqual([
      "skills/synapdeck-a: declares shared topic \"nope\", but shared/nope.md does not exist",
    ]);
  });

  test("rejects the reserved and malformed topic names", () => {
    const root = makeRepo({
      "shared/server-instructions.md": "Header.\n",
      "skills/synapdeck-a/SKILL.md": skill("synapdeck-a", "task", "server-instructions Bad_Name"),
    });
    expect(planGeneratedFiles(root).errors).toEqual([
      "skills/synapdeck-a: \"server-instructions\" is not a shared topic name",
      "skills/synapdeck-a: \"Bad_Name\" is not a shared topic name",
    ]);
  });

  test("reports a missing server-instructions source", () => {
    const root = makeRepo({ "skills/synapdeck-a/SKILL.md": skill("synapdeck-a", "reference") });
    expect(planGeneratedFiles(root).errors).toEqual(["shared/server-instructions.md does not exist"]);
  });

  test("indexes only task skills in instructions.md", () => {
    const root = makeRepo({
      "shared/server-instructions.md": "Header.\n\n",
      "skills/synapdeck-a/SKILL.md": skill("synapdeck-a", "task"),
      "skills/synapdeck-b/SKILL.md": skill("synapdeck-b", "reference"),
    });
    expect(planGeneratedFiles(root).files.get("instructions.md")).toBe(
      "Header.\n\n## Skills\n\nBefore starting one of these tasks, load its skill:\n\n"
      + "- `synapdeck-a` (`skill://synapdeck-a/SKILL.md`): Use when doing synapdeck-a.\n",
    );
  });
});

describe("renderInstructions", () => {
  test("is just the trimmed header when there are no task skills", () => {
    expect(renderInstructions("Header.\n\n\n", [])).toBe("Header.\n");
  });
});

describe("staleGeneratedCopies", () => {
  test("finds a generated copy no skill declares, and ignores hand-written references", () => {
    const root = makeRepo({
      "shared/server-instructions.md": "Header.\n",
      "skills/synapdeck-a/SKILL.md": skill("synapdeck-a", "task"),
      "skills/synapdeck-a/references/old.md": `${generatedHeader("old")}stale\n`,
      "skills/synapdeck-a/references/notes.md": "hand-written\n",
    });
    expect(staleGeneratedCopies(root, planGeneratedFiles(root))).toEqual([
      "skills/synapdeck-a/references/old.md",
    ]);
  });
});

describe("renderInstructions: multi-line descriptions", () => {
  test("collapses a folded or literal description onto one line", () => {
    expect(
      renderInstructions("Header.\n", [{ name: "synapdeck-a", description: "Line one\nline two.\n" }]),
    ).toContain("- `synapdeck-a` (`skill://synapdeck-a/SKILL.md`): Line one line two.\n");
  });
});

describe("staleGeneratedCopies: unparseable skills", () => {
  test("does not report a generated copy under a skill whose SKILL.md fails to parse", () => {
    const root = makeRepo({
      "shared/server-instructions.md": "Header.\n",
      "skills/synapdeck-a/SKILL.md": "no frontmatter here\n",
      "skills/synapdeck-a/references/card-syntax.md": `${generatedHeader("card-syntax")}# Syntax\n`,
    });
    expect(staleGeneratedCopies(root, planGeneratedFiles(root))).toEqual([]);
  });
});
