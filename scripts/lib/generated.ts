import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { collectFiles, listSkillDirs, metadataString, readSkill, type SkillDoc } from "./skillSource.ts";

export const SKILL_KINDS = ["task", "reference"] as const;
export const INSTRUCTIONS_SOURCE = "shared/server-instructions.md";
export const INSTRUCTIONS_OUTPUT = "instructions.md";

const TOPIC_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// shared/server-instructions.md feeds instructions.md, so it is never copied into a skill.
const RESERVED_TOPICS = new Set(["server-instructions"]);
const GENERATED_PREFIX = "<!-- Generated from shared/";

export function generatedHeader(topic: string): string {
  return `<!-- Generated from shared/${topic}.md. Edit that file and run bun run generate. -->\n\n`;
}

export function isGeneratedCopy(content: string): boolean {
  return content.startsWith(GENERATED_PREFIX);
}

export function sharedTopics(skill: SkillDoc): string[] {
  const raw = metadataString(skill, "synapdeck-shared");
  return raw === undefined ? [] : raw.split(/\s+/).filter(topic => topic !== "");
}

interface IndexedSkill {
  readonly name: string;
  readonly description: string;
}

function indexEntries(skills: ReadonlyArray<IndexedSkill>): string {
  return skills
    .map(skill => `- \`${skill.name}\` (\`skill://${skill.name}/SKILL.md\`): ${skill.description.replace(/\s+/g, " ").trim()}\n`)
    .join("");
}

/**
 * The server instructions: the hand-written header, then an index of the
 * skills, task skills first and reference skills after them.
 */
export function renderInstructions(
  header: string,
  tasks: ReadonlyArray<IndexedSkill>,
  references: ReadonlyArray<IndexedSkill> = [],
): string {
  const base = `${header.trimEnd()}\n`;
  if (tasks.length === 0 && references.length === 0) return base;
  const sections: string[] = [];
  if (tasks.length > 0) sections.push(`Before starting one of these tasks, load its skill:\n\n${indexEntries(tasks)}`);
  if (references.length > 0) sections.push(`Load these when a task needs what they cover:\n\n${indexEntries(references)}`);
  return `${base}\n## Skills\n\n${sections.join("\n")}`;
}

export interface GeneratedPlan {
  /** Repo-relative path → the exact content generation writes there. */
  readonly files: ReadonlyMap<string, string>;
  readonly errors: readonly string[];
}

/**
 * Every file `bun run generate` owns, with its content. Skills that fail to
 * parse are skipped here; `validateRepo` reports them.
 */
export function planGeneratedFiles(repoRoot: string): GeneratedPlan {
  const skillsDir = join(repoRoot, "skills");
  const files = new Map<string, string>();
  const errors: string[] = [];
  const tasks: IndexedSkill[] = [];
  const references: IndexedSkill[] = [];

  for (const dirName of listSkillDirs(skillsDir)) {
    const parsed = readSkill(skillsDir, dirName);
    if (!parsed.ok) continue;
    const { skill } = parsed;

    for (const topic of sharedTopics(skill)) {
      if (RESERVED_TOPICS.has(topic) || !TOPIC_PATTERN.test(topic)) {
        errors.push(`skills/${dirName}: "${topic}" is not a shared topic name`);
        continue;
      }
      const source = join(repoRoot, "shared", `${topic}.md`);
      if (!existsSync(source)) {
        errors.push(`skills/${dirName}: declares shared topic "${topic}", but shared/${topic}.md does not exist`);
        continue;
      }
      files.set(`skills/${dirName}/references/${topic}.md`, generatedHeader(topic) + readFileSync(source, "utf8"));
    }

    if (typeof skill.description === "string") {
      const kind = metadataString(skill, "synapdeck-kind");
      if (kind === "task") tasks.push({ name: dirName, description: skill.description });
      else if (kind === "reference") references.push({ name: dirName, description: skill.description });
    }
  }

  const header = join(repoRoot, INSTRUCTIONS_SOURCE);
  if (existsSync(header)) files.set(INSTRUCTIONS_OUTPUT, renderInstructions(readFileSync(header, "utf8"), tasks, references));
  else errors.push(`${INSTRUCTIONS_SOURCE} does not exist`);

  return { files, errors };
}

/** Generated copies on disk that the plan no longer produces. */
export function staleGeneratedCopies(repoRoot: string, plan: GeneratedPlan): string[] {
  const stale: string[] = [];
  for (const dirName of listSkillDirs(join(repoRoot, "skills"))) {
    if (!readSkill(join(repoRoot, "skills"), dirName).ok) continue;
    const referencesDir = join(repoRoot, "skills", dirName, "references");
    if (!existsSync(referencesDir)) continue;
    for (const file of collectFiles(referencesDir)) {
      const path = `skills/${dirName}/references/${file}`;
      if (!plan.files.has(path) && isGeneratedCopy(readFileSync(join(repoRoot, path), "utf8"))) stale.push(path);
    }
  }
  return stale;
}
