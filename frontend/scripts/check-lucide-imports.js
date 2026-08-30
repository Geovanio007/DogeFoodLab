#!/usr/bin/env node

/**
 * Validate named imports from lucide-react against the installed package.
 * Only import declarations whose source is exactly "lucide-react" are checked.
 */

const fs = require("fs");
const path = require("path");

const SRC_DIR = path.resolve(__dirname, "..", "src");
const PACKAGE_JSON = require.resolve("lucide-react/package.json");
const PACKAGE_ROOT = path.dirname(PACKAGE_JSON);

function collectSourceFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectSourceFiles(full));
    else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

function getExports() {
  const candidates = [
    path.join(PACKAGE_ROOT, "dist", "cjs", "lucide-react.js"),
    path.join(PACKAGE_ROOT, "dist", "cjs", "lucide-react.js.map"),
  ];

  // Prefer the package's ESM entry because it contains the generated named exports.
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, "utf8"));
  const exportsRoot = pkg.exports?.["."];

  let entry;
  if (exportsRoot && typeof exportsRoot === "object") {
    entry = exportsRoot.import || exportsRoot.default;
  }

  if (!entry) {
    entry = pkg.module || pkg.main;
  }

  if (!entry) throw new Error("Could not determine lucide-react entry point.");

  const entryPath = path.resolve(PACKAGE_ROOT, entry);
  const source = fs.readFileSync(entryPath, "utf8");

  const names = new Set();

  // Generated Lucide entry files contain patterns such as:
  // export { default as Activity } from './icons/activity.js';
  // export { Activity } from './icons/activity.js';
  for (const m of source.matchAll(/export\s*\{\s*default\s+as\s+([A-Za-z_$][\w$]*)/g)) {
    names.add(m[1]);
  }
  for (const m of source.matchAll(/export\s*\{\s*([A-Za-z_$][\w$]*)\s*\}/g)) {
    names.add(m[1]);
  }

  // Also accept explicit export declarations.
  for (const m of source.matchAll(/export\s+(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g)) {
    names.add(m[1]);
  }

  return names;
}

function parseLucideImports(source) {
  const results = [];

  // Match only import declarations ending in exactly "lucide-react".
  // This deliberately does not use a broad multiline ".*" across imports.
  const re = /import\s*\{([\s\S]*?)\}\s*from\s*["']lucide-react["']\s*;?/g;

  for (const match of source.matchAll(re)) {
    const namesText = match[1];
    const startOffset = match.index;
    const line = source.slice(0, startOffset).split("\n").length;

    const names = namesText
      .split(",")
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => {
        // Support: Icon as Alias
        const m = part.match(/^([A-Za-z_$][\w$]*)\s+as\s+[A-Za-z_$][\w$]*$/);
        return m ? m[1] : part;
      })
      .filter(name => /^[A-Za-z_$][\w$]*$/.test(name));

    results.push({ names, line });
  }

  return results;
}

const exportsSet = getExports();
const files = collectSourceFiles(SRC_DIR);
const invalid = [];

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");

  for (const imp of parseLucideImports(source)) {
    for (const name of imp.names) {
      if (!exportsSet.has(name)) {
        invalid.push({
          file: path.relative(path.resolve(__dirname, ".."), file),
          line: imp.line,
          name,
        });
      }
    }
  }
}

if (invalid.length) {
  console.error("\nInvalid lucide-react imports detected:\n");
  for (const item of invalid) {
    console.error(`  ${item.file}:${item.line} -> ${item.name}`);
  }
  console.error("\nFix the imports before building.\n");
  process.exit(1);
}

console.log(`Lucide import check passed (${files.length} source files scanned).`);
