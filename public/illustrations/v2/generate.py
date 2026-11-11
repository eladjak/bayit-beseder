#!/usr/bin/env python3
"""Regenerate the responsive assets from the unchanged source illustrations."""
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parent.parent
out = root / 'v2'
for source in sorted([*root.glob('*.jpg'), *(root / 'landing').glob('*.png')]):
    with Image.open(source) as original:
        original = original.convert('RGB')
        for width in (480, 960):
            height = round(original.height * width / original.width)
            image = original.resize((width, height), Image.Resampling.LANCZOS)
            target = out / f'{source.stem}-{width}.webp'
            for quality in range(82, 39, -2):
                image.save(target, 'WEBP', quality=quality, method=6)
                if width != 960 or target.stat().st_size < 120000:
                    break
            else:
                raise RuntimeError(f'{target} exceeds the size limit')
