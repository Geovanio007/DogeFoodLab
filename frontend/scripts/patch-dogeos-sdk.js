#!/usr/bin/env node
/**
 * Patches the DogeOS SDK stylesheet so its bundled Tailwind v4 global
 * layers do not reset the host app.
 *
 * IMPORTANT: Only CSS is patched. The SDK JavaScript bundle must remain
 * untouched because modifying its compiled exports can cause runtime
 * constructor/import failures in production.
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

function patchCssFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');

  if (src.startsWith(STRIP_MARKER)) {
    return { file: filePath, status: 'already-patched' };
  }

  let out = stripLayer(src, 'base');
  out = stripLayer(out, 'properties');

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

  // SECURITY/COMPATIBILITY: only touch the SDK's CSS file.
  const cssPath = path.join(SDK_DIR, 'dogeos-sdk.css');

  if (!fs.existsSync(cssPath)) {
    console.log(`[patch-dogeos] CSS file not found: ${cssPath}`);
    return;
  }

  try {
    const result = patchCssFile(cssPath);
    console.log(
      `[patch-dogeos]  dogeos-sdk.css: ${result.status}${
        result.saved ? ` (-${result.saved}b)` : ''
      }`
    );
  } catch (err) {
    console.error(`[patch-dogeos]  dogeos-sdk.css: error — ${err.message}`);
    process.exitCode = 1;
  }
}

main();
