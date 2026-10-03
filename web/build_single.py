"""Genera yohi-coach.html: la misma pagina en UN solo archivo (imagenes incrustadas).
Uso: python3 build_single.py   (edita siempre index.html y vuelve a correr esto)"""
import base64, re
from pathlib import Path
here = Path(__file__).parent
html = (here / "index.html").read_text(encoding="utf-8")
def inline(m):
    path = here / m.group(1)
    b64 = base64.b64encode(path.read_bytes()).decode()
    return f"data:image/webp;base64,{b64}"
out = re.sub(r"assets/([\w\-]+\.webp)", lambda m: inline(re.match(r"(.*)", "assets/" + m.group(1))), html)
(here / "yohi-coach.html").write_text(out, encoding="utf-8")
print("yohi-coach.html", round(len(out) / 1024), "KB")
