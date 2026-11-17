#!/usr/bin/env bun
// Standalone gate for direct contributions to this repo; the rules live in lib/validate.ts.
import { resolve } from "node:path";

import { listSkillDirs } from "./lib/skillSource.ts";
import { validateRepo } from "./lib/validate.ts";

const repoRoot = resolve(import.meta.dirname, "..");
const errors = validateRepo(repoRoot);

if (errors.length > 0) {
  console.error(`${errors.length} problem(s) found:\n${errors.map(line => `  - ${line}`).join("\n")}`);
  process.exit(1);
}
const skillDirs = listSkillDirs(resolve(repoRoot, "skills"));
console.log(`OK: ${skillDirs.length} skill(s) validated — ${skillDirs.join(", ")}`);
