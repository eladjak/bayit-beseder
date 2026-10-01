#!/usr/bin/env node
// Stamps public/sw.js with the deploy's commit so the file's bytes change on EVERY
// deploy. A byte-identical sw.js is never re-installed, so the installed app kept the
// old worker (and old cached pages) forever. No-op locally (no commit env var).
import fs from "node:fs";
import path from "node:path";

const file = process.argv[2] ?? path.join(process.cwd(), "public", "sw.js");
const sha = (process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? "").slice(0, 7);
if (!sha) {
  console.log("stamp-sw: no commit sha in env, leaving sw.js unchanged");
  process.exit(0);
}
const src = fs.readFileSync(file, "utf8");
const re = /const CACHE_VERSION = "(v\d+)(?:-[0-9a-f]+)?";/;
if (!re.test(src)) {
  console.error("stamp-sw: CACHE_VERSION line not found");
  process.exit(1);
}
fs.writeFileSync(file, src.replace(re, `const CACHE_VERSION = "$1-${sha}";`));
console.log(`stamp-sw: CACHE_VERSION stamped with ${sha}`);
