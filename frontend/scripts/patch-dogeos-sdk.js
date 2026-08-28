#!/usr/bin/env node
/**
 * Safely patch DogeOS SDK Tailwind CSS without rewriting JavaScript.
 *
 * - Patches standalone .css files directly.
 * - In .js/.cjs/.mjs files, only modifies quoted/template literals that
 *   demonstrably contain Tailwind CSS markers.
 * - Never applies CSS transformations to arbitrary JavaScript source.
 */

const fs = require('fs');
const path = require('path');

const SDK_DIR = path.resolve(
  __dirname,
  '..',
  'node_modules',
  '@dogeos',
  'dogeos-sdk',
  'dist'
);

const STRIP_MARKER = '/* dogefood-stripped-base-v3 */';

function stripLayer(input, layerName) {
  const marker = `@layer ${layerName}{`;
  let out = '';
  let i = 0;

  while (i < input.length) {
    const idx = input.indexOf(marker, i);
    if (idx === -1) {
      out += input.slice(i);
      break;
    }

    out += input.slice(i, idx);

    let depth = 1;
    let j = idx + marker.length;
    while (j < input.length && depth > 0) {
      const ch = input[j];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      j++;
    }

    i = j;
  }

  return out;
}

function stripCss(css) {
  let out = stripLayer(css, 'base');
  out = stripLayer(out, 'properties');

  return out.replace(
    /@property\s+--tw-[a-zA-Z0-9-]+\s*\{[^}]*\}/g,
    ''
  );
}

function patchCssFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');

  if (src.startsWith(STRIP_MARKER)) {
    return { status: 'already-patched', saved: 0 };
  }

  const out = stripCss(src);

  if (out === src) {
    return { status: 'no-change', saved: 0 };
  }

  fs.writeFileSync(filePath, STRIP_MARKER + '\n' + out, 'utf8');

  return {
    status: 'patched',
    saved: src.length - out.length
  };
}

function patchEmbeddedCssInJs(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');

  if (
    !src.includes('@layer base{') &&
    !src.includes('@layer properties{') &&
    !src.includes('@property --tw-')
  ) {
    return { status: 'no-css-markers', saved: 0 };
  }

  let out = '';
  let i = 0;
  let changed = false;

  while (i < src.length) {
    const quote = src[i];

    if (quote !== '"' && quote !== "'" && quote !== '`') {
      out += src[i++];
      continue;
    }

    const start = i;
    const q = quote;
    i++;

    let escaped = false;

    while (i < src.length) {
      const ch = src[i];

      if (escaped) {
        escaped = false;
        i++;
        continue;
      }

      if (ch === '\\') {
        escaped = true;
        i++;
        continue;
      }

      if (ch === q) {
        i++;
        break;
      }

      i++;
    }

    const literal = src.slice(start, i);
    const inner = literal.slice(1, -1);

    if (
      inner.includes('@layer base{') ||
      inner.includes('@layer properties{') ||
      inner.includes('@property --tw-')
    ) {
      const patched = stripCss(inner);

      if (patched !== inner) {
        out += q + patched + q;
        changed = true;
      } else {
        out += literal;
      }
    } else {
      out += literal;
    }
  }

  if (!changed) {
    return { status: 'no-change', saved: 0 };
  }

  fs.writeFileSync(filePath, out, 'utf8');

  return {
    status: 'patched-embedded-css',
    saved: src.length - out.length
  };
}

function main() {
  if (!fs.existsSync(SDK_DIR)) {
    console.log(
      `[patch-dogeos] SDK not installed at ${SDK_DIR} — nothing to do.`
    );
    return;
  }

  const entries = fs.readdirSync(SDK_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.css')) continue;

    const filePath = path.join(SDK_DIR, entry.name);

    try {
      const result = patchCssFile(filePath);
      console.log(
        `[patch-dogeos] ${entry.name}: ${result.status}` +
        (result.saved ? ` (-${result.saved}b)` : '')
      );
    } catch (err) {
      console.error(
        `[patch-dogeos] ${entry.name}: error — ${err.message}`
      );
      process.exitCode = 1;
    }
  }

  for (const entry of entries) {
    if (!entry.isFile() || !/\.(js|cjs|mjs)$/.test(entry.name)) continue;

    const filePath = path.join(SDK_DIR, entry.name);

    try {
      const result = patchEmbeddedCssInJs(filePath);
      console.log(
        `[patch-dogeos] ${entry.name}: ${result.status}` +
        (result.saved ? ` (-${result.saved}b)` : '')
      );
    } catch (err) {
      console.error(
        `[patch-dogeos] ${entry.name}: error — ${err.message}`
      );
      process.exitCode = 1;
    }
  }
}

main();
