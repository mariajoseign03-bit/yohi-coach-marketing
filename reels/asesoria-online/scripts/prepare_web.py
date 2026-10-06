"""Corta la captura de la web en tiles para el video "Ya estamos online".

Entrada: out/web/full.png (scripts/capture-web.mjs). Salida: public/web/tile-XX.jpg + src/online/tour.json.
Uso: python3 scripts/prepare_web.py out/web/full.png
"""
import json, sys
from pathlib import Path
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
DPR = 2.5   # escala de la captura
TILE = 3000  # alto de cada tile en px
# Paradas del recorrido: (id, y en px CSS donde queda el borde superior de la pantalla).
# El texto de cada etiqueta esta en src/online/copy.ts, en el mismo orden.
STOPS = [("inicio", 0), ("que-buscas", 900), ("presencial", 1262), ("online", 2390),
         ("medicion", 3312), ("novedades", 4720), ("contacto", 6395)]

root = Path(__file__).resolve().parent.parent
full = Image.open(sys.argv[1]).convert("RGB")
out = root / "public" / "web"
out.mkdir(parents=True, exist_ok=True)
for f in out.glob("tile-*.jpg"):
    f.unlink()
tiles = []
for i, t in enumerate(range(0, full.height, TILE)):
    name = f"tile-{i:02d}.jpg"
    h = min(TILE, full.height - t)
    full.crop((0, t, full.width, t + h)).save(out / name, quality=90)
    tiles.append({"src": f"web/{name}", "y": t, "h": h})
data = {"width": full.width, "height": full.height, "tiles": tiles,
        "stops": [{"id": i, "y": round(y * DPR)} for i, y in STOPS]}
(root / "src" / "online").mkdir(exist_ok=True)
(root / "src" / "online" / "tour.json").write_text(json.dumps(data, indent=2) + "\n")
print(json.dumps(data["stops"]))
