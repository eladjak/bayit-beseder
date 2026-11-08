#!/usr/bin/env python3
"""Combine matching mobile captures; accepts two or three evidence labels."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw
root=Path('docs/joy-restore/evidence')
labels=sys.argv[1:]
if len(labels) not in (2,3): raise SystemExit('usage: python3 scripts/joy-compare.py before current [new]')
out=root/('comparison-'+'-'.join(labels));out.mkdir(exist_ok=True)
for name in ('landing','login','dashboard','tasks','completion','empty','dashboard-empty','settings'):
    paths=[root/l/(name+'.png') for l in labels]
    if not all(p.exists() for p in paths): raise SystemExit(f'missing {paths}')
    images=[Image.open(p).convert('RGB') for p in paths]
    canvas=Image.new('RGB',(375*len(images), 844),'white');d=ImageDraw.Draw(canvas)
    for i,(im,label) in enumerate(zip(images,labels)):
        d.text((375*i+8,8),label+' | synthetic household',fill='black');canvas.paste(im,(375*i,32))
    canvas.save(out/(name+'.png'),optimize=True)
