# Responsive illustrations

These are 480px and 960px WebP copies of the 34 original JPEGs and four landing PNGs. Originals remain in place. `src/lib/illustrations.ts` records their original aspect ratios and Hebrew and English descriptions. `Illustration` consumes the variants, but no existing page imports it.

Regenerate from the repository root with `python3 public/illustrations/v2/generate.py` (Pillow with WebP support). The script uses RGB, Lanczos resizing and WebP method 6, starting at quality 82 and reducing quality in steps of 2 only when needed to keep a 960px file below 120,000 bytes. It does not change the originals.

Originals with no filename reference in `src` or `public` at the time of this change: `empty-weekly.jpg`, `hero-home.jpg`, `pesach-mode.jpg`, `shopping-baby.jpg`, `stats-achievements.jpg`. This is a static filename search; dynamic references may not be detected. None were deleted.
