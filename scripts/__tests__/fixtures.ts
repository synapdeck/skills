import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

/** Writes `files` (repo-relative path → content) into an existing repo root and returns it. */
export function makeRepoAt(root: string, files: Record<string, string>): string {
  for (const [path, content] of Object.entries(files)) {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  return root;
}

/** Writes `files` (repo-relative path → content) into a fresh temporary repo and returns its root. */
export function makeRepo(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "skills-repo-"));
  mkdirSync(join(root, "skills"), { recursive: true });
  return makeRepoAt(root, files);
}

export function skillMd(frontmatter: string, body = "Body.\n"): string {
  return `---\n${frontmatter.trim()}\n---\n\n${body}`;
}
