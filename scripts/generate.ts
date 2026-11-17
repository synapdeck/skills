#!/usr/bin/env bun
// Writes every generated file: shared-topic copies into the skills that declare
// them, and instructions.md. Removes copies no skill declares any more.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { INSTRUCTIONS_OUTPUT, isGeneratedCopy, planGeneratedFiles, staleGeneratedCopies } from "./lib/generated.ts";

const repoRoot = resolve(import.meta.dirname, "..");
const plan = planGeneratedFiles(repoRoot);

const blocked = [...plan.files.keys()].filter((path) => {
  const target = join(repoRoot, path);
  return path !== INSTRUCTIONS_OUTPUT && existsSync(target) && !isGeneratedCopy(readFileSync(target, "utf8"));
});
const errors = [
  ...plan.errors,
  ...blocked.map(path => `${path} exists and was not generated; rename it or drop the topic from synapdeck-shared`),
];
if (errors.length > 0) {
  console.error(`${errors.length} problem(s) found:\n${errors.map(line => `  - ${line}`).join("\n")}`);
  process.exit(1);
}

for (const [path, content] of plan.files) {
  const target = join(repoRoot, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}
const stale = staleGeneratedCopies(repoRoot, plan);
for (const path of stale) rmSync(join(repoRoot, path));

console.log(`Generated ${plan.files.size} file(s)${stale.length > 0 ? `, removed ${stale.length}` : ""}.`);
