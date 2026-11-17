import { join } from "node:path";

import { collectFiles, listSkillDirs, readSkill } from "./skillSource.ts";

const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MARKDOWN_LINK_PATTERN = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

// Absolute URLs, in-page anchors, and root-relative paths are not the skill's files.
function isExternal(target: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("#") || target.startsWith("/");
}

function relativeLinkTargets(body: string): string[] {
  const targets: string[] = [];
  for (const match of body.matchAll(MARKDOWN_LINK_PATTERN)) {
    const raw = match[1] ?? "";
    if (isExternal(raw)) continue;
    let target = raw.split("#")[0]?.split("?")[0] ?? "";
    // A literal "%" is legal in a filename but makes decodeURI throw.
    try {
      target = decodeURI(target);
    }
    catch {
      // fall through with the raw target
    }
    target = target.replace(/^\.\//, "");
    if (target !== "") targets.push(target);
  }
  return targets;
}

/**
 * Every rule a skill must satisfy, checked against the repo at `repoRoot`.
 * The Synapdeck monorepo runs an equivalent check when it builds the
 * /.well-known/agent-skills/ channel from a pinned revision of this repo;
 * keep the two in sync when the rules change.
 */
export function validateRepo(repoRoot: string): string[] {
  const skillsDir = join(repoRoot, "skills");
  const errors: string[] = [];
  const fail = (skill: string, message: string): void => {
    errors.push(`skills/${skill}: ${message}`);
  };

  const skillDirs = listSkillDirs(skillsDir);
  if (skillDirs.length === 0) errors.push("skills/ contains no skills");

  for (const dirName of skillDirs) {
    const parsed = readSkill(skillsDir, dirName);
    if (!parsed.ok) {
      fail(dirName, parsed.error);
      continue;
    }
    const { name, description, metadata, body } = parsed.skill;

    if (typeof name !== "string" || !NAME_PATTERN.test(name) || name.length > 64) {
      fail(dirName, `name ${JSON.stringify(name)} must be 1-64 chars, lowercase alphanumeric and single hyphens`);
    }
    else if (name !== dirName) {
      fail(dirName, `frontmatter name "${name}" must match the skill directory name`);
    }
    if (typeof description !== "string" || description.length < 1 || description.length > 1024) {
      fail(dirName, "description must be a string of 1-1024 characters");
    }

    // The Agent Skills spec confines metadata to string values, and the monorepo
    // decodes it as such — a non-string here passes this gate and breaks that
    // build once the pin moves. List-valued keys are whitespace-separated strings.
    if (metadata !== undefined) {
      if (typeof metadata !== "object" || metadata == null || Array.isArray(metadata)) {
        fail(dirName, "metadata must be a YAML mapping");
      }
      else {
        for (const [key, value] of Object.entries(metadata)) {
          if (typeof value !== "string") {
            fail(dirName, `metadata.${key} must be a string, got ${Array.isArray(value) ? "array" : typeof value}`);
          }
        }
      }
    }

    const files = collectFiles(join(skillsDir, dirName));
    for (const target of relativeLinkTargets(body)) {
      if (target.split("/").includes("..")) {
        fail(dirName, `SKILL.md links to "${target}", which escapes the skill directory`);
      }
      else if (!files.includes(target)) {
        fail(dirName, `SKILL.md links to "${target}", which does not exist in the skill directory`);
      }
    }
  }

  return errors;
}
