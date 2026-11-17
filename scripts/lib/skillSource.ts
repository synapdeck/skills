import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const FRONTMATTER_PATTERN = /^---\r?\n(?:([\s\S]*?)\r?\n)?---\r?\n?([\s\S]*)$/;

export interface SkillDoc {
  readonly dirName: string;
  readonly name: unknown;
  readonly description: unknown;
  readonly metadata: unknown;
  readonly body: string;
}

export type ParsedSkill =
  | { readonly ok: true; readonly skill: SkillDoc }
  | { readonly ok: false; readonly error: string };

export function listSkillDirs(skillsDir: string): string[] {
  if (!existsSync(skillsDir)) return [];
  return readdirSync(skillsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && !entry.name.startsWith("."))
    .map(entry => entry.name)
    .sort();
}

export function collectFiles(dir: string, prefix = ""): string[] {
  const paths: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const relative = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) paths.push(...collectFiles(join(dir, entry.name), relative));
    else if (entry.isFile()) paths.push(relative);
  }
  return paths.sort();
}

export function readSkill(skillsDir: string, dirName: string): ParsedSkill {
  const path = join(skillsDir, dirName, "SKILL.md");
  if (!existsSync(path)) return { ok: false, error: "missing SKILL.md" };

  // Tolerate a UTF-8 BOM so a BOM-prefixed file still has its fence on line 1.
  const source = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  const match = FRONTMATTER_PATTERN.exec(source);
  if (match == null) {
    return { ok: false, error: "SKILL.md must begin with YAML frontmatter delimited by --- fences" };
  }

  const [, rawFrontmatter = "", body = ""] = match;
  let frontmatter: unknown;
  try {
    frontmatter = Bun.YAML.parse(rawFrontmatter);
  }
  catch (error) {
    return {
      ok: false,
      error: `frontmatter is not valid YAML: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  if (typeof frontmatter !== "object" || frontmatter == null || Array.isArray(frontmatter)) {
    return { ok: false, error: "frontmatter must be a YAML mapping with name and description" };
  }

  const { name, description, metadata } = frontmatter as Record<string, unknown>;
  return { ok: true, skill: { dirName, name, description, metadata, body } };
}

/** A metadata value, when metadata is a mapping and the value is a string. */
export function metadataString(skill: SkillDoc, key: string): string | undefined {
  const { metadata } = skill;
  if (typeof metadata !== "object" || metadata == null || Array.isArray(metadata)) return undefined;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}
