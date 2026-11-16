"""Pista PLACEHOLDER (generada, sin copyright): beat house/pop suave a 112 BPM, 33 s.
Reemplázala por tu música: guarda tu archivo como public/audio/MUSICA_AQUI.wav (o cambia la ruta en src/Main.tsx)."""
import wave, numpy as np
from pathlib import Path
SR, BPM, DUR = 48000, 112, 33.0
N = int(SR * DUR); beat = 60 / BPM
x = np.zeros(N)
def add(sig, t0):
    i = int(t0 * SR); j = min(N, i + len(sig))
    if i < N: x[i:j] += sig[: j - i]
t = lambda d: np.arange(int(SR * d)) / SR
def kick():
    tt = t(0.32); f = 120 * np.exp(-tt * 18) + 42
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9) * 0.9
def hat(open_=False):
    d = 0.22 if open_ else 0.06; tt = t(d); n = np.random.default_rng(3).standard_normal(len(tt))
    n = np.diff(n, prepend=0); return n * np.exp(-tt * (18 if open_ else 70)) * 0.16
def clap():
    tt = t(0.2); n = np.random.default_rng(5).standard_normal(len(tt)); return n * np.exp(-tt * 28) * 0.18
def bass(freq, d):
    tt = t(d); return (np.sin(2*np.pi*freq*tt) + 0.35*np.sin(4*np.pi*freq*tt)) * np.exp(-tt*5) * 0.34
def pluck(freq, d=0.35):
    tt = t(d); return (np.sin(2*np.pi*freq*tt) + 0.5*np.sin(4*np.pi*freq*tt)) * np.exp(-tt*9) * 0.13
notes = [55.0, 55.0, 65.41, 49.0]  # A1 A1 C2 G1
arp = [440.0, 523.25, 659.25, 523.25, 587.33, 659.25, 783.99, 659.25]
bars = int(DUR / (beat * 4)) + 1
for b in range(bars):
    t0 = b * beat * 4
    for k in range(4):
        add(kick(), t0 + k * beat)
        add(hat(), t0 + k * beat + beat / 2)
        if k in (1, 3): add(clap(), t0 + k * beat)
        add(hat(True), t0 + k * beat + beat * 0.75) if k % 2 else None
    nb = notes[b % 4]
    for k in range(8): add(bass(nb, beat * 0.45), t0 + k * beat / 2)
    if b >= 1:
        for k in range(8): add(pluck(arp[(k + b) % 8] * (1.0 if b % 4 < 2 else 1.122)), t0 + k * beat / 2)
x *= np.minimum(1, np.minimum(np.arange(N) / (SR * 0.5), (N - np.arange(N)) / (SR * 1.5)))
x = x / np.max(np.abs(x)) * 0.8
out = Path(__file__).resolve().parents[1] / "public/audio/MUSICA_AQUI.wav"
with wave.open(str(out), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes())
print("ok", out, round(DUR, 1), "s")
