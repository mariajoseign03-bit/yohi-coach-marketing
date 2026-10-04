"""Genera los efectos de sonido por codigo (sin derechos de autor) en public/sfx/.

Todos los SFX: WAV mono 48 kHz 16-bit, normalizados a -3 dBFS de pico.
"""
from pathlib import Path
import wave

import numpy as np

SR = 48000
OUT = Path(__file__).resolve().parents[1] / "public" / "sfx"
OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(7)


def t(dur: float) -> np.ndarray:
    return np.arange(int(SR * dur)) / SR


def env(x: np.ndarray, attack: float, decay: float) -> np.ndarray:
    n = len(x)
    tt = np.arange(n) / SR
    a = np.clip(tt / max(attack, 1e-4), 0, 1)
    d = np.exp(-np.maximum(tt - attack, 0) / decay)
    return x * a * d


def lowpass(x: np.ndarray, cutoff: float) -> np.ndarray:
    alpha = 1 - np.exp(-2 * np.pi * cutoff / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc += alpha * (v - acc)
        y[i] = acc
    return y


def highpass(x: np.ndarray, cutoff: float) -> np.ndarray:
    return x - lowpass(x, cutoff)


def save(name: str, x: np.ndarray, peak_db: float = -3.0) -> None:
    x = x - np.mean(x)
    fade = min(len(x), int(0.01 * SR))
    x[-fade:] *= np.linspace(1, 0, fade)
    x = x / (np.max(np.abs(x)) + 1e-9) * 10 ** (peak_db / 20)
    data = (x * 32767).astype(np.int16)
    with wave.open(str(OUT / f"{name}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
    print(name, f"{len(x) / SR:.2f}s")


def boom() -> np.ndarray:
    tt = t(1.4)
    f = 32 + 70 * np.exp(-tt / 0.08)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR)
    sub = env(body, 0.004, 0.45)
    hit = env(lowpass(rng.standard_normal(len(tt)), 900), 0.001, 0.05) * 0.6
    return np.tanh((sub + hit) * 1.6)


def whoosh(dur: float = 0.55) -> np.ndarray:
    tt = t(dur)
    noise = rng.standard_normal(len(tt))
    shape = np.sin(np.pi * tt / dur) ** 2
    # barrido de filtro: mezcla lowpass que se abre y cierra
    lo = lowpass(noise, 600)
    hi = highpass(lowpass(noise, 5000), 1200)
    sweep = np.sin(np.pi * tt / dur)
    return (lo * (1 - sweep) + hi * sweep * 1.4) * shape


def pop(freq: float = 520) -> np.ndarray:
    tt = t(0.18)
    f = freq * (1 + 1.2 * np.exp(-tt / 0.012))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR)
    return env(tone, 0.001, 0.045)


def tap() -> np.ndarray:
    tt = t(0.08)
    click = env(highpass(rng.standard_normal(len(tt)), 2500), 0.0005, 0.008)
    tone = env(np.sin(2 * np.pi * 1800 * tt), 0.0005, 0.012) * 0.5
    return click + tone


def ding() -> np.ndarray:
    tt = t(0.9)
    x = sum(a * np.sin(2 * np.pi * f * tt) for f, a in [(1318.5, 1), (1975.5, 0.45), (2637, 0.25)])
    x2 = sum(a * np.sin(2 * np.pi * f * tt) for f, a in [(1760, 1), (2637, 0.4)])
    x2 = np.concatenate([np.zeros(int(0.09 * SR)), x2])[: len(tt)]
    return env(x, 0.002, 0.22) + env(x2, 0.002, 0.3) * 0.9


def click() -> np.ndarray:
    tt = t(0.06)
    return env(highpass(rng.standard_normal(len(tt)), 3000), 0.0003, 0.006) + env(
        np.sin(2 * np.pi * 3200 * tt), 0.0003, 0.004
    ) * 0.4


def shimmer() -> np.ndarray:
    tt = t(1.3)
    x = np.zeros_like(tt)
    notes = [1568, 1976, 2349, 2637, 3136, 3520, 3951]
    for i, f in enumerate(notes):
        start = int(i * 0.07 * SR)
        seg = t(1.3 - i * 0.07)
        s = env(np.sin(2 * np.pi * f * seg) + 0.3 * np.sin(2 * np.pi * f * 2.01 * seg), 0.003, 0.35)
        x[start : start + len(s)] += s * (0.9 - i * 0.07)
    air = highpass(rng.standard_normal(len(tt)), 6000) * np.sin(np.pi * tt / 1.3) ** 2 * 0.15
    return x + air


def chaching() -> np.ndarray:
    tt = t(1.1)
    # "cha": golpe metalico ruidoso
    cha = env(highpass(rng.standard_normal(len(tt)), 3500), 0.001, 0.05)
    # "ching": campana metalica inarmonica
    bell_t = t(1.0)
    bell = sum(a * np.sin(2 * np.pi * f * bell_t) for f, a in [(2093, 1), (3136, 0.6), (4186, 0.4), (5274, 0.25)])
    bell = env(bell, 0.002, 0.35)
    x = cha * 0.8
    off = int(0.11 * SR)
    x[off : off + len(bell)] += bell[: len(x) - off]
    return x


def stamp() -> np.ndarray:
    tt = t(0.9)
    thud_f = 55 + 120 * np.exp(-tt / 0.03)
    thud = env(np.sin(2 * np.pi * np.cumsum(thud_f) / SR), 0.001, 0.16)
    slap = env(lowpass(rng.standard_normal(len(tt)), 2500), 0.0005, 0.03) * 0.9
    return np.tanh((thud + slap) * 2.0)


def sparkle() -> np.ndarray:
    tt = t(1.0)
    x = np.zeros_like(tt)
    for i in range(14):
        f = rng.uniform(2500, 6000)
        start = int(rng.uniform(0, 0.55) * SR)
        seg = t(0.3)
        s = env(np.sin(2 * np.pi * f * seg), 0.001, 0.06) * rng.uniform(0.3, 1)
        end = min(len(x), start + len(s))
        x[start:end] += s[: end - start]
    return x


def typing() -> np.ndarray:
    """Tecleo suave para el indicador "escribiendo..."."""
    tt = t(0.9)
    x = np.zeros_like(tt)
    for k in range(7):
        start = int((0.05 + k * 0.12 + rng.uniform(-0.02, 0.02)) * SR)
        c = tap() * rng.uniform(0.4, 0.8)
        end = min(len(x), start + len(c))
        x[start:end] += c[: end - start]
    return x


def zap() -> np.ndarray:
    """Descarga electrica: rafagas de ruido agudo con chisporroteo."""
    tt = t(0.7)
    x = np.zeros_like(tt)
    for k in range(9):
        start = int(rng.uniform(0, 0.35) * SR)
        seg = t(rng.uniform(0.02, 0.08))
        burst = highpass(rng.standard_normal(len(seg)), 2500) * np.sign(np.sin(2 * np.pi * rng.uniform(80, 160) * seg))
        end = min(len(x), start + len(seg))
        x[start:end] += burst[: end - start] * rng.uniform(0.4, 1)
    buzz = np.sign(np.sin(2 * np.pi * 110 * tt)) * 0.25
    return env(x + buzz * np.exp(-tt / 0.15), 0.001, 0.25)


def tick() -> np.ndarray:
    tt = t(0.12)
    tone = env(np.sin(2 * np.pi * 1500 * tt) + 0.5 * np.sin(2 * np.pi * 3000 * tt), 0.0005, 0.03)
    snap = env(highpass(rng.standard_normal(len(tt)), 3000), 0.0003, 0.006) * 0.6
    return tone + snap


def riser(dur: float = 1.8) -> np.ndarray:
    tt = t(dur)
    f = 200 * (12 ** (tt / dur))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.35
    noise = highpass(rng.standard_normal(len(tt)), 1500) * (tt / dur) ** 2
    return (tone + noise) * (tt / dur) ** 1.5


if __name__ == "__main__":
    save("boom", boom())
    save("whoosh", whoosh())
    save("whoosh_short", whoosh(0.35))
    for i, f in enumerate([523.25, 659.25, 783.99, 1046.5], start=1):  # Do-Mi-Sol-Do: tono que sube por pill
        save(f"pop{i}", pop(f))
    save("pop", pop(600))
    save("tap", tap())
    save("ding", ding())
    save("click", click())
    save("shimmer", shimmer())
    save("chaching", chaching())
    save("stamp", stamp())
    save("sparkle", sparkle())
    save("typing", typing(), peak_db=-9.0)
    save("zap", zap())
    save("tick", tick())
    save("riser", riser())
