/**
 * webpack loader that strips Tailwind v4 Preflight-style global resets
 * (`@layer base{...}` and `@layer properties{...}`) from the DogeOS SDK's
 * prebuilt CSS bundle.
 *
 * The DogeOS SDK ships a self-contained Tailwind v4 stylesheet that includes
 * a full element reset (margin/padding/border/font reset for *, html, h1-h6,
 * etc.). Loading that globally on top of the host app's Tailwind v3 layer
 * causes washed-out colors, lost heading sizes, missing margins, etc.
 *
 * Stripping the base + properties layers leaves the modal's own component
 * and utility classes intact so the DogeOS connect modal still looks right.
 */
module.exports = function stripBaseLayer(source) {
  console.log('[strip-dogeos-base-loader] invoked, source length:', typeof source === 'string' ? source.length : 'NOT STRING');
  if (typeof source !== 'string') return source;

  // Remove the entire `@layer base { ... }` block.
  // The block bodies can contain nested braces (e.g. @supports/@media),
  // so we count braces to find the matching closing one.
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
      // Skip past the marker and find the matching '}'.
      let depth = 1;
      let j = idx + marker.length;
      while (j < input.length && depth > 0) {
        const ch = input[j];
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
        j++;
      }
      i = j; // skip the whole layer block
    }
    return out;
  }

  let out = stripLayer(source, 'base');
  out = stripLayer(out, 'properties');

  // Strip Tailwind v4 `@property` declarations for shared CSS custom
  // properties (gradients, transforms, filters, etc.).
  //
  // The SDK declares these with strict `syntax: "<color>"` / `<length>` and
  // `initial-value: #0000`, which causes the host app's Tailwind v3 utility
  // classes (e.g. `from-purple-500` setting
  //   --tw-gradient-from: #a855f7 var(--tw-gradient-from-position)
  // ) to be parse-rejected as invalid <color> and revert to the transparent
  // initial value — washing out every gradient/transform in the app.
  //
  // Removing the @property registrations leaves the variables un-typed
  // (untyped custom props accept any value), which is exactly what v3
  // expects. The SDK's own utility classes still set these vars
  // explicitly so its modal continues to render correctly.
  out = out.replace(
    /@property\s+--tw-[a-zA-Z0-9-]+\s*\{[^}]*\}/g,
    ''
  );

  console.log('[strip-dogeos-base-loader] output length:', out.length, 'still has @layer base?', out.includes('@layer base{'), 'still has @property --tw-?', /@property\s+--tw-/.test(out));
  return out;
};
