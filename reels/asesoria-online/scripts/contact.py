"""Hoja de contacto de los stills de QA con guias de zona segura (verde)."""
import sys
from PIL import Image, ImageDraw
frames = sys.argv[2:]
out = sys.argv[1]
ims = []
for f in frames:
    im = Image.open(f"out/qa/f{int(f):04d}.png").convert("RGB").resize((432, 768))
    d = ImageDraw.Draw(im)
    d.line([(0, 100), (432, 100)], fill=(0, 255, 0), width=2)
    d.line([(0, 768 - 136), (432, 768 - 136)], fill=(0, 255, 0), width=2)
    d.text((6, 6), f, fill=(0, 255, 0))
    ims.append(im)
c = Image.new("RGB", (len(ims) * 442, 768), (60, 60, 60))
for i, im in enumerate(ims):
    c.paste(im, (i * 442, 0))
c.save(out, quality=85)
