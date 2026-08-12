const BUNDLED = import.meta.glob('../assets/images/**/*.{jpg,jpeg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const byRelativePath = Object.fromEntries(
  Object.entries(BUNDLED).map(([full, url]) => [full.replace('../assets/images/', ''), url])
);

const FALLBACK = byRelativePath['plants/tulsi.jpg'] ?? Object.values(byRelativePath)[0] ?? '';

export function resolveImage(path) {
  if (!path) return FALLBACK;
  if (/^(https?:|data:|blob:|\/)/.test(path)) return path;
  return byRelativePath[path] ?? FALLBACK;
}

export default resolveImage;
