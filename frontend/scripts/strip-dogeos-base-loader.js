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
  return out;
};
