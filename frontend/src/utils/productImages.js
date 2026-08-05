/** Turns the image path MySQL stores into a URL the browser can load. */
const BUNDLED = import.meta.glob('../assets/images/**/*.{jpg,jpeg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** "../assets/images/plants/tulsi.jpg" -> "plants/tulsi.jpg" */
const byRelativePath = Object.fromEntries(
  Object.entries(BUNDLED).map(([full, url]) => [full.replace('../assets/images/', ''), url])
);

/** Last resort, so a missing photo never renders as a broken-image glyph. */
const FALLBACK = byRelativePath['plants/tulsi.jpg'] ?? Object.values(byRelativePath)[0] ?? '';

export function resolveImage(path) {
  if (!path) return FALLBACK;
  // Already a URL: an uploaded image, or a value the bundler resolved for us.
  if (/^(https?:|data:|blob:|\/)/.test(path)) return path;
  return byRelativePath[path] ?? FALLBACK;
}

export default resolveImage;
