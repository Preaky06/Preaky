#!/usr/bin/env python3
"""Bruitages + musique + mix final, 100 % synthétisés (aucun fichier externe, libre de droits).

Usage : python3 tools/audio.py 00-presentation
Entrées : build/<ep>/voice.wav, build/<ep>/events.json (écrit par render.mjs)
Sorties : build/<ep>/sfx.wav, music.wav, mix.wav, mix_sans_musique.wav
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parent.parent
SR = 44100
rng = np.random.default_rng(42)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, btype="low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, btype="high", fs=SR, output="sos"), x)


def env_ar(n, a=0.005, r=0.03):
    e = np.ones(n)
    na, nr = max(1, min(int(a * SR), n // 2)), max(1, min(int(r * SR), n // 2))
    e[:na] = np.linspace(0, 1, na)
    e[-nr:] *= np.linspace(1, 0, nr)
    return e


def t_(d):
    return np.arange(int(d * SR)) / SR


def add(buf, x, t, gain=1.0):
    i = int(t * SR)
    if i >= len(buf) or i + len(x) <= 0:
        return
    if i < 0:
        x, i = x[-i:], 0
    j = min(len(buf), i + len(x))
    buf[i:j] += x[: j - i] * gain


# ---------------------------------------------------------------- bruitages
def marker(d, kind="draw"):
    """Feutre sur papier : bruit filtré, texture granuleuse, rythme des gribouillis."""
    n = max(int(d * SR), 64)
    x = rng.standard_normal(n)
    x = bp(x, 2200, 7500) * 0.6 + bp(x, 700, 1800) * 0.25
    tt = np.arange(n) / SR
    grain = 0.75 + 0.25 * lp(rng.standard_normal(n), 40) * 3
    if kind == "fill":
        rhythm = 0.45 + 0.55 * np.abs(np.sin(np.pi * tt * 11))
    elif kind == "write":
        rhythm = 0.5 + 0.5 * np.abs(np.sin(np.pi * tt * 7))
    else:
        rhythm = 1.0
    return x * np.clip(grain, 0.2, 1.4) * rhythm * env_ar(n, 0.012, 0.035)


def pop():
    tt = t_(0.11)
    f = 380 + 900 * (tt / 0.11)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 38)
    return s * 0.9


def whoosh(d=0.5, up=False):
    """Souffle filtré dont la fréquence de coupure balaie (filtre 1 pôle variable)."""
    n = int(d * SR)
    x = rng.standard_normal(n)
    q = np.linspace(0, 1, n)
    fc = 300 + (3000 * q if up else 2200 * np.sin(np.pi * q))
    a = 1 - np.exp(-2 * np.pi * fc / SR)
    out = np.empty(n)
    y = 0.0
    for i in range(n):
        y += a[i] * (x[i] - y)
        out[i] = y
    out = hp(out, 180)
    e = np.sin(np.pi * q) ** 1.5
    return out * e


def bell(f0=1046.5, d=1.6, partials=((1, 1), (2.76, 0.4), (5.4, 0.18), (8.9, 0.07))):
    tt = t_(d)
    s = sum(a * np.sin(2 * np.pi * f0 * r * tt) * np.exp(-tt * (2.2 + r * 1.3)) for r, a in partials)
    return s * env_ar(len(tt), 0.002, 0.05) * 0.5


def shine():
    out = np.zeros(int(0.9 * SR))
    for i, f in enumerate([2093, 2637, 3136, 4186, 5274]):
        add(out, bell(f, 0.5, ((1, 1), (2.0, 0.2))), i * 0.045, 0.35)
    return out


def boom():
    tt = t_(0.6)
    s = np.sin(2 * np.pi * np.cumsum(70 * np.exp(-tt * 3) + 38) / SR) * np.exp(-tt * 6)
    s += lp(rng.standard_normal(len(tt)), 400) * np.exp(-tt * 18) * 2
    return s * 0.9


def tape():
    tt = t_(0.22)
    rip = bp(rng.standard_normal(len(tt)), 900, 5000) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 55 * tt)))
    rip *= np.exp(-tt * 14)
    slap = np.sin(2 * np.pi * 150 * tt) * np.exp(-tt * 40)
    return rip * 0.7 + slap * 0.6


def tick():
    out = np.zeros(int(0.5 * SR))
    for k in (0, 0.22):
        c = bp(rng.standard_normal(int(0.012 * SR)), 2500, 7000) * np.exp(-t_(0.012) * 300)
        add(out, c, k, 1.0)
    return out


def ufo():
    tt = t_(1.3)
    f = 520 + 160 * np.sin(2 * np.pi * 0.8 * tt) + 18 * np.sin(2 * np.pi * 7 * tt)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ar(len(tt), 0.15, 0.4) * 0.35


def click():
    tt = t_(0.05)
    return (bp(rng.standard_normal(len(tt)), 1500, 6000) * np.exp(-tt * 260) + np.sin(2 * np.pi * 1800 * tt) * np.exp(-tt * 120) * 0.4)


def boing():
    tt = t_(0.7)
    f = 160 + 110 * tt / 0.7 + 90 * np.sin(2 * np.pi * 13 * tt) * np.exp(-tt * 4)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    return s * np.exp(-tt * 4.5) * env_ar(len(tt), 0.003, 0.05) * 0.8


def stamp():
    tt = t_(0.3)
    s = np.sin(2 * np.pi * np.cumsum(140 * np.exp(-tt * 10) + 55) / SR) * np.exp(-tt * 16)
    s += bp(rng.standard_normal(len(tt)), 300, 3000) * np.exp(-tt * 45) * 0.8
    return s


def reveal():
    out = whoosh(1.2, up=True) * 0.6
    for i, f in enumerate([523.25, 659.25, 783.99, 1046.5]):
        add(out, bell(f, 1.5), 0.55 + i * 0.07, 0.5)
    return out


SFX = {
    "pop": (pop, -20), "ding": (lambda: bell(1318.5, 1.4), -18), "shine": (shine, -19), "boom": (boom, -14),
    "zoom": (lambda: whoosh(0.45, up=True), -20), "tape": (tape, -16), "tick": (tick, -17), "ufo": (ufo, -22),
    "swoosh": (lambda: whoosh(0.8), -19), "click": (click, -16), "boing": (boing, -14), "stamp": (stamp, -14),
    "reveal": (reveal, -17),
}


def db(x):
    return 10 ** (x / 20)


def make_sfx(events, n):
    out = np.zeros(n)
    for e in events:
        k = e["type"]
        if k in ("draw", "fill", "write"):
            d = max(e["t1"] - e["t"], 0.03)
            g = {"draw": -40, "fill": -42, "write": -41}[k]
            add(out, marker(d, k), e["t"], db(g))
        elif k == "whoosh":
            add(out, whoosh(max(e.get("dur", 0.5), 0.3)), e["t"], db(-19))
        elif k in SFX:
            fn, g = SFX[k]
            x = fn()
            x = x / (np.max(np.abs(x)) or 1)
            add(out, x, e["t"], db(g))
    return out


# ---------------------------------------------------------------- musique
def pluck(freq, d, bright=0.5):
    """Karplus-Strong : corde pincée (façon ukulélé)."""
    n = int(d * SR)
    N = max(2, int(SR / freq))
    buf = np.zeros(n + N + 1)
    buf[1:N + 1] = lp(rng.uniform(-1, 1, N * 4), 1500 + 5000 * bright)[:N]
    decay = 0.996
    i = N + 1
    while i < n + N + 1:
        j = min(i + N, n + N + 1)
        buf[i:j] = decay * 0.5 * (buf[i - N:j - N] + buf[i - N - 1:j - N - 1])
        i = j
    y = buf[N + 1:N + 1 + n]
    # correction de justesse : la boucle sonne à SR/(N+0.5), on rééchantillonne vers freq
    ratio = freq / (SR / (N + 0.5))
    y = np.interp(np.arange(n) * ratio, np.arange(n), y, right=0.0)
    return y * env_ar(n, 0.001, 0.08)


def note(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def make_music(n, bpm=104):
    beat = 60 / bpm
    bar = 4 * beat
    out_l, out_r = np.zeros(n), np.zeros(n)
    # I – V – vi – IV en Do majeur (accords en notes MIDI)
    chords = [(60, 64, 67), (55, 59, 62), (57, 60, 64), (53, 57, 60)]
    roots = [48, 43, 45, 41]
    pattern = [0, 1, 2, 1, 0, 2, 1, 2]  # arpège en croches
    total_bars = int(n / SR / bar) + 1
    for b in range(total_bars):
        t0 = b * bar
        ch, root = chords[b % 4], roots[b % 4]
        for k, idx in enumerate(pattern):
            m = ch[idx] + (12 if k in (2, 5) else 0)
            x = pluck(note(m), beat * 1.6, bright=0.35 + 0.2 * (k % 2))
            g = 0.32 if k % 2 == 0 else 0.24
            pan = 0.35 if idx == 1 else -0.25 if idx == 2 else 0
            add(out_l, x, t0 + k * beat / 2, g * (1 - pan))
            add(out_r, x, t0 + k * beat / 2, g * (1 + pan))
        # basse douce (temps 1 et 3)
        for k in (0, 2):
            tt = t_(beat * 1.6)
            s = (np.sin(2 * np.pi * note(root) * tt) + 0.25 * np.sin(4 * np.pi * note(root) * tt)) * np.exp(-tt * 2.2) * env_ar(len(tt), 0.01, 0.08)
            add(out_l, s, t0 + k * beat, 0.42)
            add(out_r, s, t0 + k * beat, 0.42)
        # percussions légères
        for k in range(4):
            tb = t0 + k * beat
            if k in (0, 2):
                tt = t_(0.25)
                kick = np.sin(2 * np.pi * np.cumsum(55 + 90 * np.exp(-tt * 30)) / SR) * np.exp(-tt * 14)
                add(out_l, kick, tb, 0.55)
                add(out_r, kick, tb, 0.55)
            else:
                snap = bp(rng.standard_normal(int(0.12 * SR)), 1200, 6000) * np.exp(-t_(0.12) * 38)
                add(out_l, snap, tb, 0.22)
                add(out_r, snap, tb, 0.22)
            for h in range(2):
                sh = hp(rng.standard_normal(int(0.05 * SR)), 7000) * np.exp(-t_(0.05) * 70)
                add(out_l, sh, tb + h * beat / 2, 0.05)
                add(out_r, sh, tb + h * beat / 2 + 0.004, 0.05)
    return np.stack([out_l, out_r], axis=1)


# ---------------------------------------------------------------- mix
def smooth_env(x, win=0.25):
    k = int(win * SR)
    a = np.convolve(np.abs(x), np.ones(k) / k, mode="same")
    return a


def main(ep):
    build = ROOT / "build" / ep
    voice, sr = sf.read(build / "voice.wav", dtype="float64")
    assert sr == SR
    events = json.loads((build / "events.json").read_text())
    n = len(voice)
    dur = n / SR

    sfx = make_sfx(events, n)
    music = make_music(n)
    music /= np.max(np.abs(music)) or 1

    # ducking : la musique baisse quand la voix parle
    v_env = smooth_env(voice, 0.3)
    v_env /= np.max(v_env) or 1
    duck = 1 - 0.55 * np.clip(v_env * 3, 0, 1)
    fade = np.ones(n)
    fi, fo = int(0.3 * SR), int(1.8 * SR)
    fade[:fi] = np.linspace(0, 1, fi)
    fade[-fo:] = np.linspace(1, 0, fo) ** 1.5
    music *= (duck * fade)[:, None] * db(-15)

    v = np.stack([voice, voice], axis=1)
    s = np.stack([sfx, sfx], axis=1)
    sf.write(build / "sfx.wav", s.astype(np.float32), SR)
    sf.write(build / "music.wav", music.astype(np.float32), SR)

    for name, parts in (("mix", (v, s, music)), ("mix_sans_musique", (v, s))):
        mix = sum(parts)
        tmp = build / f"{name}_raw.wav"
        sf.write(tmp, mix.astype(np.float32), SR)
        # normalisation loudness TikTok (~ -14 LUFS, crête -1.5 dBTP)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(tmp), "-af",
                        "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", str(SR), str(build / f"{name}.wav")], check=True)
        tmp.unlink()
    print(f"Audio OK ({dur:.1f} s) → {build / 'mix.wav'}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "00-presentation")
