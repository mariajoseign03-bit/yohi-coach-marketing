"""Prepara los PNG transparentes en public/ a partir de las ilustraciones de marca/.

- Personajes con fondo blanco: flood fill SOLO desde los bordes (semillas en las 4 esquinas),
  tolerancia baja. Los blancos internos (ojos, zapatillas) quedan intactos porque no estan
  conectados al fondo. El halo blanco del borde se convierte en transparencia (color-to-alpha)
  solo en una banda delgada junto al fondo, y el borde se suaviza.
- Logo: mascara circular suavizada.
- Sello: se elimina el fondo negro exterior con el mismo flood fill desde las esquinas.
- yohi_escritorio: se copia sin cambios (tiene fondo propio; se usa como tarjeta).

No se redibuja ni se altera ninguna ilustracion: solo se quita el fondo.
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT.parents[1] / "marca"
OUT = ROOT / "public"
OUT.mkdir(exist_ok=True)


def flood_from_corners(rgb: np.ndarray, tol: float, extra_seeds=()) -> np.ndarray:
    """Mascara booleana del fondo conectado a las esquinas (y semillas extra opcionales)."""
    h, w, _ = rgb.shape
    corners = [rgb[0, 0], rgb[0, w - 1], rgb[h - 1, 0], rgb[h - 1, w - 1]]
    ref = np.median(np.array(corners, dtype=np.float32), axis=0)
    dist = np.sqrt(((rgb.astype(np.float32) - ref) ** 2).sum(axis=2))
    similar = dist <= tol
    labels, _ = ndimage.label(similar)
    seeds = {labels[0, 0], labels[0, w - 1], labels[h - 1, 0], labels[h - 1, w - 1]}
    seeds |= {labels[y, x] for x, y in extra_seeds}
    seeds -= {0}
    return np.isin(labels, list(seeds))


def cutout_light_bg(name: str, out_name: str, tol: float = 28, band: int = 6, extra_seeds=()) -> None:
    im = Image.open(SRC / name).convert("RGB")
    rgb = np.asarray(im).astype(np.float32)
    bg = flood_from_corners(rgb, tol, extra_seeds)

    alpha = np.where(bg, 0.0, 1.0)
    # Banda delgada del lado del personaje, pegada al fondo: quitar halo blanco.
    near_bg = ndimage.binary_dilation(bg, iterations=band) & ~bg
    a_w = np.max((255.0 - rgb) / 255.0, axis=2)  # color-to-alpha contra blanco
    a_w = np.clip(a_w * 1.15, 0, 1)
    alpha = np.where(near_bg, np.minimum(alpha, a_w), alpha)
    safe = np.maximum(alpha, 1e-3)[..., None]
    unmixed = 255.0 - (255.0 - rgb) / safe
    rgb_out = np.where(near_bg[..., None], np.clip(unmixed, 0, 255), rgb)

    # Borde suavizado
    alpha = ndimage.gaussian_filter(alpha, 0.8)
    alpha = np.where(ndimage.binary_erosion(~bg, iterations=band + 2), 1.0, alpha)

    rgba = np.dstack([rgb_out, alpha * 255]).astype(np.uint8)
    out = Image.fromarray(rgba, "RGBA")
    out = out.crop(out.getbbox())
    out.save(OUT / out_name)
    print(out_name, out.size)


def cutout_logo(name: str, out_name: str) -> None:
    im = Image.open(SRC / name).convert("RGB")
    rgb = np.asarray(im).astype(np.float32)
    bg = flood_from_corners(rgb, 40)
    ys, xs = np.where(~bg)
    cy, cx = (ys.min() + ys.max()) / 2, (xs.min() + xs.max()) / 2
    r = min(ys.max() - ys.min(), xs.max() - xs.min()) / 2 - 2
    yy, xx = np.mgrid[: rgb.shape[0], : rgb.shape[1]]
    d = np.sqrt((yy - cy) ** 2 + (xx - cx) ** 2)
    alpha = np.clip(r - d + 0.5, 0, 1.5) / 1.5  # borde suavizado ~1.5 px
    rgba = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    out = Image.fromarray(rgba, "RGBA")
    out = out.crop(out.getbbox())
    out.save(OUT / out_name)
    print(out_name, out.size)


def cutout_dark_bg(name: str, out_name: str, tol: float = 30) -> None:
    im = Image.open(SRC / name).convert("RGB")
    rgb = np.asarray(im).astype(np.float32)
    bg = flood_from_corners(rgb, tol)
    alpha = ndimage.gaussian_filter(np.where(bg, 0.0, 1.0), 0.9)
    rgba = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    out = Image.fromarray(rgba, "RGBA")
    out = out.crop(out.getbbox())
    out.save(OUT / out_name)
    print(out_name, out.size)


if __name__ == "__main__":
    for n in ["yohi_duda", "yohi_saludo", "yohi_cuaderno"]:
        cutout_light_bg(f"{n}.png", f"{n}.png")
    # Pizarra: la version actual ya viene con fondo transparente; se copia tal cual.
    Image.open(SRC / "yohi_pizarra.png").convert("RGBA").save(OUT / "yohi_pizarra.png")
    cutout_logo("logo_yohi.png", "logo_yohi.png")
    cutout_dark_bg("sello_certified.jpg", "sello_certified.png")
    Image.open(SRC / "yohi_escritorio.png").convert("RGB").save(OUT / "yohi_escritorio.png")
    print("yohi_escritorio.png (sin cambios)")
