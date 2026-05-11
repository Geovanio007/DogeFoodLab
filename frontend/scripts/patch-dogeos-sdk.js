#!/usr/bin/env node
/**
 * Patches the DogeOS SDK so that its bundled Tailwind v4 stylesheet no longer
 * applies Preflight global resets to the host app.
 *
 * The SDK ships its CSS in two places:
 *   1. node_modules/@dogeos/dogeos-sdk/dist/dogeos-sdk.css
 *   2. Inlined as a template literal inside the SDK's JS bundles
 *      (the SDK injects this into a <style> tag at runtime).
 *
 * Both routes include `@layer base{...}` and `@layer properties{...}` which
 * reset margins/paddings/borders/headings/lists/fonts globally — washing out
 * the host app's colors, headings and spacing.
 *
 * This script strips those two layers from every CSS string in the SDK while
 * leaving the modal's own component / utility / theme styles intact, so the
 * DogeOS connect modal still looks correct.
 *
 * Idempotent: safe to re-run. Runs automatically via `postinstall`.
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

const STRIP_MARKER = '/* dogefood-stripped-base-v2 */';

/** Strip @layer <name>{...} blocks from source using brace counting. */
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

function patchFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  if (src.startsWith(STRIP_MARKER)) {
    return { file: filePath, status: 'already-patched' };
  }
  let out = stripLayer(src, 'base');
  out = stripLayer(out, 'properties');

  // Strip Tailwind v4 `@property --tw-*` registrations. These declare
  // strict syntax types (e.g. `<color>`) for variables that Tailwind v3
  // (used by the host app) sets with composite "color + position" values.
  // The strict typing causes v3's values to be rejected and reset to the
  // transparent `initial-value`, which wipes out gradients across the app.
  out = out.replace(
    /@property\s+--tw-[a-zA-Z0-9-]+\s*\{[^}]*\}/g,
    ''
  );

  if (out === src) {
    return { file: filePath, status: 'no-change' };
  }
  fs.writeFileSync(filePath, STRIP_MARKER + '\n' + out, 'utf8');
  return {
    file: filePath,
    status: 'patched',
    saved: src.length - out.length,
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
  const targets = entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => /\.(css|cjs|mjs|js)$/.test(name))
    // Skip .d.ts / source maps
    .filter((name) => !/\.d\.[mc]?ts$/.test(name) && !/\.map$/.test(name));

  console.log(
    `[patch-dogeos] patching ${targets.length} file(s) in ${SDK_DIR}`
  );
  for (const name of targets) {
    try {
      const result = patchFile(path.join(SDK_DIR, name));
      console.log(
        `[patch-dogeos]  ${name}: ${result.status}${result.saved ? ` (-${result.saved}b)` : ''}`
      );
    } catch (err) {
      console.error(`[patch-dogeos]  ${name}: error — ${err.message}`);
    }
  }
}

main();
