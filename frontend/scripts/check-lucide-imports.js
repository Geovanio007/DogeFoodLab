#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'src');
const pkgPath = require.resolve('lucide-react/package.json');
const pkgDir = path.dirname(pkgPath);

function collectFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(p));
    else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) out.push(p);
  }
  return out;
}

function installedExports() {
  try {
    const mod = require('lucide-react');
    return new Set(Object.keys(mod));
  } catch (err) {
    const dts = path.join(pkgDir, 'dist', 'lucide-react.d.ts');
    if (!fs.existsSync(dts)) throw new Error(`Cannot inspect lucide-react exports: ${err.message}`);
    const text = fs.readFileSync(dts, 'utf8');
    const names = new Set();
    for (const m of text.matchAll(/\bdeclare const ([A-Za-z_$][\w$]*)\s*:/g)) names.add(m[1]);
    return names;
  }
}

const exportsSet = installedExports();
const errors = [];
for (const file of collectFiles(SRC)) {
  const text = fs.readFileSync(file, 'utf8');
  const re = /import\s*\{([\s\S]*?)\}\s*from\s*['"]lucide-react['"]/g;
  for (const m of text.matchAll(re)) {
    for (const raw of m[1].split(',')) {
      const name = raw.trim().split(/\s+as\s+/)[0].trim();
      if (!name || name.startsWith('//')) continue;
      if (!exportsSet.has(name)) {
        const before = text.slice(0, m.index);
        const line = before.split(/\r?\n/).length;
        errors.push(`${path.relative(path.resolve(__dirname, '..'), file)}:${line} -> ${name}`);
      }
    }
  }
}

if (errors.length) {
  console.error('\nInvalid lucide-react imports detected:');
  errors.forEach(e => console.error(`  ${e}`));
  console.error('\nFix the imports before building.');
  process.exit(1);
}
console.log('[lucide-check] All lucide-react imports are valid for the installed package.');
