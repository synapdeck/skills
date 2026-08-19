#!/usr/bin/env bun
// Standalone gate for direct contributions to this repo: every skill in
// skills/ must satisfy the Agent Skills naming rules and link only to files
// that ship with it. The Synapdeck monorepo runs an equivalent check when it
// builds the /.well-known/agent-skills/ channel from a pinned revision of
// this repo; keep the two in sync when the rules change.
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const SKILLS_DIR = resolve(import.meta.dirname, "../skills");
const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FRONTMATTER_PATTERN = /^---\r?\n(?:([\s\S]*?)\r?\n)?---\r?\n?([\s\S]*)$/;
const MARKDOWN_LINK_PATTERN = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

const errors: string[] = [];
const fail = (skill: string, message: string): void => {
  errors.push(`skills/${skill}: ${message}`);
};

function collectFiles(dir: string, prefix = ""): string[] {
  const paths: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const relative = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) paths.push(...collectFiles(join(dir, entry.name), relative));
    else if (entry.isFile()) paths.push(relative);
  }
  return paths.sort();
}

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

const skillDirs = readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && !entry.name.startsWith("."))
  .map(entry => entry.name)
  .sort();

if (skillDirs.length === 0) errors.push("skills/ contains no skills");

for (const dirName of skillDirs) {
  const skillDir = join(SKILLS_DIR, dirName);
  const files = collectFiles(skillDir);
  if (!files.includes("SKILL.md")) {
    fail(dirName, "missing SKILL.md");
    continue;
  }

  // Tolerate a UTF-8 BOM so a BOM-prefixed file still has its fence on line 1.
  const source = readFileSync(join(skillDir, "SKILL.md"), "utf8").replace(/^\uFEFF/, "");
  const match = FRONTMATTER_PATTERN.exec(source);
  if (match == null) {
    fail(dirName, "SKILL.md must begin with YAML frontmatter delimited by --- fences");
    continue;
  }

  const [, rawFrontmatter = "", body = ""] = match;
  let frontmatter: unknown;
  try {
    frontmatter = Bun.YAML.parse(rawFrontmatter);
  }
  catch (error) {
    fail(dirName, `frontmatter is not valid YAML: ${error instanceof Error ? error.message : String(error)}`);
    continue;
  }
  if (typeof frontmatter !== "object" || frontmatter == null || Array.isArray(frontmatter)) {
    fail(dirName, "frontmatter must be a YAML mapping with name and description");
    continue;
  }

  const { name, description } = frontmatter as { name?: unknown; description?: unknown };
  if (typeof name !== "string" || !NAME_PATTERN.test(name) || name.length > 64) {
    fail(dirName, `name ${JSON.stringify(name)} must be 1-64 chars, lowercase alphanumeric and single hyphens`);
  }
  else if (name !== dirName) {
    fail(dirName, `frontmatter name "${name}" must match the skill directory name`);
  }
  if (typeof description !== "string" || description.length < 1 || description.length > 1024) {
    fail(dirName, "description must be a string of 1-1024 characters");
  }

  for (const target of relativeLinkTargets(body)) {
    if (target.split("/").includes("..")) {
      fail(dirName, `SKILL.md links to "${target}", which escapes the skill directory`);
    }
    else if (!files.includes(target)) {
      fail(dirName, `SKILL.md links to "${target}", which does not exist in the skill directory`);
    }
  }
}

if (errors.length > 0) {
  console.error(`${errors.length} problem(s) found:\n${errors.map(line => `  - ${line}`).join("\n")}`);
  process.exit(1);
}
console.log(`OK: ${skillDirs.length} skill(s) validated — ${skillDirs.join(", ")}`);
