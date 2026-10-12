#!/usr/bin/env python3
"""Bande-son originale du film CinéMood : 30 s, 120 BPM, la mineur.
Tout est synthétisé (aucun échantillon externe) et calé sur le découpage du film :
les temps ci-dessous sont les mêmes que dans src/scenes.js.

usage : python3 synth.py neon.json sortie.wav
"""
import json
import sys

import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
DUR = 30.0
N = int(SR * DUR)
FPS = 60
rng = np.random.default_rng(2026)
STEMS = False


# ---------------------------------------------------------------- outils
def idx(t):
    return int(round(t * SR))


def bus():
    return np.zeros((2, N))


def pan_mono(x, pan=0.0):
    a = (pan + 1) * np.pi / 4
    return np.vstack([x * np.cos(a), x * np.sin(a)]) * np.sqrt(2)


def add(b, x, t0, gain=1.0, pan=0.0):
    if x.ndim == 1:
        x = pan_mono(x, pan)
    i0 = idx(t0)
    s0, d0 = max(0, -i0), max(0, i0)
    n = min(x.shape[1] - s0, N - d0)
    if n > 0:
        b[:, d0:d0 + n] += gain * x[:, s0:s0 + n]


def tv(dur):
    return np.arange(int(round(dur * SR))) / SR


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def phase(f, n):
    f = np.broadcast_to(np.asarray(f, dtype=float), (n,))
    return np.cumsum(f) / SR


def sine(f, dur, ph0=0.0):
    n = int(round(dur * SR))
    return np.sin(2 * np.pi * (phase(f, n) + ph0))


def saw(f, dur, ph0=0.0):
    """dent de scie à bande limitée (polyBLEP)"""
    n = int(round(dur * SR))
    f = np.broadcast_to(np.asarray(f, dtype=float), (n,))
    p = (np.cumsum(f) / SR + ph0) % 1.0
    dt = np.clip(f / SR, 1e-6, 0.5)
    y = 2 * p - 1
    m = p < dt
    x = p[m] / dt[m]
    y[m] -= x + x - x * x - 1
    m = p > 1 - dt
    x = (p[m] - 1) / dt[m]
    y[m] -= x * x + x + x + 1
    return y


def noise(dur):
    return rng.standard_normal(int(round(dur * SR)))


def lp(x, fc, order=2):
    sos = signal.butter(order, min(fc, SR * 0.45) / (SR / 2), 'low', output='sos')
    return signal.sosfilt(sos, x, axis=-1)


def hp(x, fc, order=2):
    sos = signal.butter(order, fc / (SR / 2), 'high', output='sos')
    return signal.sosfilt(sos, x, axis=-1)


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo / (SR / 2), min(hi, SR * 0.45) / (SR / 2)], 'band', output='sos')
    return signal.sosfilt(sos, x, axis=-1)


def sweep(x, f0, f1, kind='low', block=256, q=0.9, curve=2.0):
    """filtre à fréquence de coupure variable (traitement par blocs, états conservés)"""
    n = len(x)
    out = np.zeros(n)
    zi = np.zeros((1, 2))
    for s in range(0, n, block):
        u = s / max(1, n - 1)
        fc = f0 * (f1 / f0) ** (u ** (1 / curve) if f1 > f0 else u)
        fc = min(max(fc, 20), SR * 0.45)
        if kind == 'band':
            bw = fc / q
            lo, hi = max(20, fc - bw / 2), min(SR * 0.45, fc + bw / 2)
            sos = signal.butter(1, [lo / (SR / 2), hi / (SR / 2)], 'band', output='sos')
        else:
            sos = signal.butter(2, fc / (SR / 2), kind, output='sos')
        out[s:s + block], zi = signal.sosfilt(sos, x[s:s + block], zi=zi)
    return out


def env_exp(dur, tau, attack=0.002):
    t = tv(dur)
    e = np.exp(-t / tau)
    a = int(attack * SR)
    if a > 0:
        e[:a] *= np.linspace(0, 1, a)
    return e


def env_ad(dur, a, r):
    t = tv(dur)
    e = np.where(t < a, t / max(a, 1e-6), np.clip(1 - (t - a) / max(r, 1e-6), 0, 1))
    return e ** 1.5


def env_asr(dur, a, r):
    t = tv(dur)
    e = np.minimum(1, t / max(a, 1e-6)) * np.clip((dur - t) / max(r, 1e-6), 0, 1)
    return e


def soft(x, drive=1.0):
    return np.tanh(x * drive) / np.tanh(drive)


def make_ir(rt=2.2, pre=0.018, bright=7000, dark=1800, seed=3):
    r = np.random.default_rng(seed)
    n = int(rt * 1.3 * SR)
    t = np.arange(n) / SR
    e = np.exp(-6.9 * t / rt)
    ir = np.zeros((2, n))
    for c in range(2):
        nz = r.standard_normal(n)
        b = lp(nz, bright)
        d = lp(nz, dark)
        mix = np.clip(t / (rt * 0.6), 0, 1)
        ir[c] = (b * (1 - mix) + d * mix) * e
    p = int(pre * SR)
    ir = np.concatenate([np.zeros((2, p)), ir], axis=1)
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


def reverb(x, ir):
    y = np.vstack([signal.fftconvolve(x[c], ir[c])[:N] for c in range(2)])
    return y


def limiter(x, ceil, look=0.004):
    """limiteur à anticipation : gain minimal sur la fenêtre, transitions lissées"""
    from scipy.ndimage import minimum_filter1d
    peak = np.max(np.abs(x), axis=0)
    g = np.minimum(1.0, ceil / np.maximum(peak, 1e-9))
    w = int(look * SR)
    g = minimum_filter1d(g, size=2 * w + 1)
    win = np.hanning(2 * w + 1)
    g = np.minimum(g, signal.oaconvolve(g, win / win.sum(), mode='same'))
    return x * g


# ---------------------------------------------------------------- instruments
def kick(gain=1.0, punch=1.0):
    d = 0.55
    t = tv(d)
    f = 46 + 160 * np.exp(-t / 0.035) * punch
    body = np.sin(2 * np.pi * phase(f, len(t))) * env_exp(d, 0.16, 0.001)
    click = hp(noise(0.012), 2500) * env_exp(0.012, 0.003) * 0.35
    body[:len(click)] += click
    return soft(body * 1.4, 1.6) * gain


def clap(gain=1.0):
    d = 0.35
    x = np.zeros(int(d * SR))
    for k, off in enumerate([0, 0.011, 0.022]):
        n = noise(d - off) * env_exp(d - off, 0.008 if k < 2 else 0.09)
        x[int(off * SR):] += n[:len(x) - int(off * SR)]
    x = bp(x, 900, 3800)
    tone = sine(190, d) * env_exp(d, 0.04) * 0.25
    return (x * 0.9 + tone) * gain


def snare(gain=1.0, tau=0.08):
    d = 0.3
    x = bp(noise(d), 1200, 8000) * env_exp(d, tau)
    tone = sine(np.linspace(240, 180, int(d * SR)), d) * env_exp(d, 0.05) * 0.5
    return (x + tone) * gain


def hat(gain=1.0, open_=False):
    d = 0.35 if open_ else 0.06
    x = hp(noise(d), 7500, 4) * env_exp(d, 0.11 if open_ else 0.014)
    return x * gain


def crash(gain=1.0, d=2.6):
    x = hp(noise(d), 4000, 2) * env_exp(d, 0.8)
    x += bp(noise(d), 3000, 9000) * env_exp(d, 0.3) * 0.5
    return x * gain


def boom(gain=1.0, d=3.0, f0=62, f1=28):
    """impact cinéma : sous-grave qui plonge + souffle"""
    t = tv(d)
    f = f1 + (f0 - f1) * np.exp(-t / 0.35)
    sub = np.sin(2 * np.pi * phase(f, len(t))) * env_exp(d, 0.9, 0.003)
    thump = lp(noise(d), 180) * env_exp(d, 0.12) * 2.2
    air = sweep(noise(d), 9000, 300, 'low') * env_exp(d, 0.5) * 0.35
    return soft((sub * 1.3 + thump + air) * gain, 1.3)


def braam(notes, d=3.0, gain=1.0, cutoff=900):
    x = np.zeros(int(d * SR))
    for m in notes:
        for det in (-0.12, 0, 0.12):
            x += saw(midi(m + det), d, rng.random())
    x = sweep(x, cutoff * 2.4, cutoff * 0.5, 'low')
    x = soft(x * 0.35, 2.2)
    return x * env_asr(d, 0.02, d * 0.8) * gain


def riser(d, gain=1.0, f0=300, f1=9000):
    nz = sweep(noise(d), f0, f1, 'band', q=1.4, curve=1.6)
    t = tv(d)
    tone = saw(midi(45) * (2 ** (2.2 * t / d)), d) * 0.08
    tone = lp(tone, 3000)
    e = (t / d) ** 2.2
    return (nz * 0.9 + tone) * e * gain


def whoosh(d=0.6, gain=1.0, up=True):
    t = tv(d)
    e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    if up:
        x = sweep(noise(d), 400, 6000, 'band', q=1.1)
    else:
        x = sweep(noise(d), 6000, 400, 'band', q=1.1)
    return x * e * gain


def rev_cymbal(d=1.0, gain=1.0):
    x = hp(noise(d), 3500) * (tv(d) / d) ** 3
    return x * gain


def tick(f=2600, gain=1.0, d=0.03):
    x = sine(f, d) * env_exp(d, 0.004, 0.0005)
    x += hp(noise(d), 4000) * env_exp(d, 0.0015) * 0.6
    return x * gain


def blip(f, gain=1.0, d=0.12):
    x = (sine(f, d) + 0.3 * sine(f * 2.01, d)) * env_exp(d, 0.03, 0.001)
    return x * gain


def bell(f, d=2.5, gain=1.0):
    ratios = [(1, 1.0, 1.2), (2.0, 0.5, 0.8), (2.76, 0.35, 0.6), (5.4, 0.18, 0.3), (8.93, 0.1, 0.18)]
    x = np.zeros(int(d * SR))
    for r, a, tau in ratios:
        x += a * sine(f * r, d, rng.random()) * env_exp(d, tau, 0.001)
    return x * gain


def pluck(f, d=0.6, gain=1.0, bright=4000):
    x = saw(f, d) * 0.6 + sine(f, d) * 0.4
    x = sweep(x, bright, 300, 'low', curve=1)
    return x * env_exp(d, 0.18, 0.001) * gain


def pad(notes, d, gain=1.0, cutoff=1400, attack=0.6, release=1.0):
    out = np.zeros((2, int(round(d * SR))))
    for m in notes:
        for v, det in enumerate((-0.09, -0.03, 0.03, 0.09)):
            s = saw(midi(m + det), d, rng.random())
            out += pan_mono(s, -0.7 + 1.4 * v / 3)
    out = lp(out, cutoff, 2) * 0.12
    return out * env_asr(d, attack, release) * gain


def bass_note(m, d, gain=1.0):
    f = midi(m)
    x = saw(f, d) * 0.5 + sine(f, d) * 0.9 + sine(f / 2, d) * 0.35
    x = lp(x, 520, 2)
    return soft(x * env_ad(d, 0.004, d) * gain, 1.4)


def heartbeat(gain=1.0):
    d = 0.5
    x = np.zeros(int(d * SR))
    for off, a in ((0, 1.0), (0.17, 0.7)):
        t = tv(0.25)
        th = np.sin(2 * np.pi * phase(55 + 40 * np.exp(-t / 0.02), len(t))) * env_exp(0.25, 0.07)
        i = int(off * SR)
        x[i:i + len(th)] += th * a
    return lp(x, 300) * gain


def crackle(d, density, gain=1.0):
    """grésillement électrique : impulsions aléatoires filtrées"""
    n = int(d * SR)
    x = np.zeros(n)
    k = rng.random(n) < density / SR
    x[k] = rng.standard_normal(k.sum()) * 3
    x = bp(x, 1500, 9000)
    return x * gain


def hum(levels, gain=1.0):
    """bourdonnement de néon (100 Hz et harmoniques) modulé par l'intensité image par image"""
    t = np.arange(N) / SR
    base = (np.sin(2 * np.pi * 100 * t) * 0.5 + np.sin(2 * np.pi * 200 * t) * 0.35 + np.sin(2 * np.pi * 300 * t) * 0.2
            + np.sin(2 * np.pi * 50 * t) * 0.25)
    buzz = bp(saw(100, DUR), 1800, 5000) * 0.25
    lv = np.asarray(levels)
    fr = np.clip((t * FPS).astype(int), 0, len(lv) - 1)
    e = lv[fr]
    e = lp(e, 140, 1)  # lisse les marches d'une image à l'autre sans perdre les coupures
    return (base + buzz) * e * gain, e


# ---------------------------------------------------------------- partition
CH = {  # accords (MIDI) : voix du pad et basse
    'Am': ([57, 60, 64, 69], 33), 'F': ([53, 57, 60, 65], 29), 'C': ([55, 60, 64, 67], 36),
    'G': ([55, 59, 62, 67], 31), 'E': ([52, 56, 59, 64], 28), 'Am9': ([57, 60, 64, 71, 76], 33),
}
PROG = [(6, 'Am'), (8, 'F'), (10, 'C'), (12, 'G'), (14, 'Am'), (16, 'F'), (17, 'E'), (18, 'Am'), (20, 'F'), (22, 'C'), (24, 'G'), (25, 'E'), (26, 'Am9')]


def chord_at(t):
    c = None
    for t0, name in PROG:
        if t >= t0:
            c = name
    return c


def build(neon_path, out_path):
    neon = json.load(open(neon_path))
    DR, BS, MU, FX, IMP = bus(), bus(), bus(), bus(), bus()
    KICKS = []

    # ---------- 0–2 : néon d'ouverture
    h, he = hum(neon, 0.1)
    FX += pan_mono(h, 0)
    lvn = np.asarray(neon)
    for f in range(1, len(lvn)):
        jump = abs(lvn[f] - lvn[f - 1])
        if jump > 0.12:
            add(FX, crackle(0.05, 900, 0.5 * min(1, jump * 2)), f / FPS, pan=rng.uniform(-0.4, 0.4))
            add(FX, hp(noise(0.02), 3000) * env_exp(0.02, 0.004) * 0.35 * min(1, jump * 2), f / FPS)
    drone = (sine(midi(33), 2.2) * 0.5 + sine(midi(45), 2.2) * 0.12) * env_asr(2.2, 1.2, 0.3)
    add(BS, drone, 0.0, 0.5)
    add(FX, rev_cymbal(1.2, 0.18), 0.8)

    # ---------- 2–6 : le scroll et le chrono
    add(FX, whoosh(0.5, 0.5), 1.8)
    t = 2.35
    k = 0
    while t < 5.1:
        u = (t - 2.35) / 2.75
        add(FX, tick(2900 if k % 2 == 0 else 2300, 0.32 + 0.2 * u), t, pan=0.25 if k % 2 else -0.25)
        t += 1.0 / (3.5 + 38 * u ** 1.6)
        k += 1
    # souffle du défilement, de plus en plus rapide
    d = 3.45
    flow = sweep(noise(d), 250, 2600, 'band', q=0.7, curve=0.8) * (0.25 + 0.75 * (tv(d) / d) ** 1.5)
    flow *= np.clip((d - tv(d)) / 0.05, 0, 1)
    add(FX, np.vstack([flow, np.roll(flow, 900)]), 2.0, 0.45)
    # pulsation grave : noires puis croches
    for i in range(16):
        tt = 2.0 + i * 0.25
        if tt >= 5.45:
            break
        if i < 8 and i % 2:
            continue
        add(BS, bass_note(33, 0.22, 0.7), tt)
    # « 30 MINUTES » se verrouille
    add(IMP, boom(0.55, 1.6, 90, 40), 5.1)
    add(FX, bell(midi(81), 1.2, 0.18), 5.1, pan=0.1)
    # arrêt net : chute de bande
    d = 0.5
    fall = saw(midi(45) * np.exp(-tv(d) * 5), d) * env_exp(d, 0.2)
    add(BS, lp(fall, 900) * 0.4, 5.45)
    # glitch de sortie
    g = np.zeros(int(0.18 * SR))
    for s in range(0, len(g), int(0.018 * SR)):
        if rng.random() > 0.35:
            seg = int(0.012 * SR)
            g[s:s + seg] = rng.standard_normal(min(seg, len(g) - s)) * rng.uniform(0.3, 1)
    add(FX, bp(g, 800, 9000), 5.82, 0.5)

    # ---------- 6–8 : « On part de ton moment »
    add(IMP, boom(1.0, 3.2), 6.0)
    add(MU, braam([33, 45, 52], 2.4, 0.22, 700), 6.0)
    add(MU, crash(0.2, 3.0), 6.0)
    # projecteur : cliquetis à 24 images/s, discret
    d = 2.0
    tt = tv(d)
    clat = bp(noise(d), 1500, 5000) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 24 * tt))) * env_asr(d, 0.3, 0.4)
    add(FX, clat, 6.0, 0.06, pan=-0.3)

    # ---------- groove (accords, basse, batterie) de 6 à 26 s
    for i, (t0, name) in enumerate(PROG):
        t1 = PROG[i + 1][0] if i + 1 < len(PROG) else 30.0
        notes, root = CH[name]
        if t0 >= 26:
            continue
        dd = t1 - t0 + 0.6
        add(MU, pad(notes, dd, 0.9 if t0 < 18 else 1.1, 1300 if t0 < 18 else 1900, attack=0.5 if t0 == 6 else 0.08, release=0.6), t0)
    # basse : croches à partir de 10 s (sauf la respiration 17,875–18)
    for i in range(int((26 - 8) / 0.25)):
        tt = 8 + i * 0.25
        if 17.0 <= tt < 18.0:
            continue
        if tt < 10 and (i % 2):
            continue
        root = CH[chord_at(tt)][1]
        m = root + (12 if (i % 4 == 2 and tt >= 10) else 0)
        add(BS, bass_note(m, 0.24, 0.85 if (i % 2 == 0) else 0.6), tt)
    # arpèges (humeurs et résultats)
    arp_pat = [0, 2, 1, 3, 2, 1, 3, 2]
    for i in range(int(16 / 0.125)):
        tt = 10 + i * 0.125
        if tt >= 26 or (14 <= tt < 18):
            continue
        notes = CH[chord_at(tt)][0]
        m = notes[arp_pat[i % 8] % len(notes)] + 12
        add(MU, pluck(midi(m), 0.35, 0.12, 5200 if tt >= 18 else 3600), tt, pan=0.35 * np.sin(i * 0.7))
    # batterie
    def K(tt, g=1.0):
        add(DR, kick(g), tt)
        KICKS.append(tt)
    for i in range(int((26 - 8) / 0.5)):
        tt = 8 + i * 0.5
        if 17.0 <= tt < 18.0:
            continue
        beat = i % 4
        if tt < 10:
            if beat in (0, 2):
                K(tt, 0.8)
        else:
            K(tt, 1.0)
            if beat in (1, 3):
                add(DR, clap(0.55), tt)
    for i in range(int((26 - 8) / 0.125)):
        tt = 8 + i * 0.125
        if 17.0 <= tt < 18.0:
            continue
        if tt < 10 and i % 2:
            continue
        acc = 0.9 if i % 2 == 0 else 0.55
        add(DR, hat(0.21 * acc), tt, pan=0.2)
        if i % 4 == 2 and tt >= 10:
            add(DR, hat(0.09, True), tt, pan=-0.2)
    for tt in (10.0, 14.0, 18.0, 22.0, 24.0):
        add(DR, crash(0.28 if tt != 18 else 0.42), tt)
    # roulement avant la chute
    tt = 17.0
    while tt < 17.875:
        u = (tt - 17.0) / 0.875
        add(DR, snare(0.12 + 0.35 * u, 0.05), tt)
        tt += 0.125 * (1 - u) + 0.03
    # roulement final avant le logo
    for j in range(8):
        add(DR, snare(0.18 + 0.05 * j, 0.06), 25.0 + j * 0.0625 + 0.5)

    # ---------- 8–10 : la question
    add(FX, whoosh(0.7, 0.45), 7.75)
    for i in range(8):
        add(FX, tick(1800 + i * 120, 0.12, 0.02), 8.80 + i * 0.045, pan=-0.5 + i / 7)

    # ---------- 10–14 : les humeurs (une signature sonore par humeur)
    T0 = 10.0
    add(IMP, boom(0.55, 1.8, 80, 35), T0)
    # rire : arpège majeur lumineux
    for j, m in enumerate([72, 76, 79, 84]):
        add(MU, pluck(midi(m), 0.4, 0.22, 7000), T0 + j * 0.05, pan=-0.3 + 0.2 * j)
    # peur : battement de cœur + agrégat dissonant
    add(FX, heartbeat(0.9), T0 + 0.5)
    add(MU, braam([45, 46, 52], 0.5, 0.18, 600), T0 + 0.5)
    # émotion : cloche douce
    add(MU, bell(midi(76), 1.5, 0.12), T0 + 1.0)
    add(MU, bell(midi(81), 1.5, 0.07), T0 + 1.05)
    # adrénaline : coup saturé
    add(IMP, soft(boom(0.6, 0.6, 140, 50) * 1.5, 3), T0 + 1.5)
    add(FX, whoosh(0.3, 0.5, False), T0 + 1.5)
    # réfléchir : gong grave
    add(MU, bell(midi(45), 1.6, 0.18), T0 + 2.0)
    # surprise : bégaiement numérique
    for j in range(7):
        seg = sine(midi(84 - j * 3), 0.03) * 0.25 + bp(noise(0.03), 2000, 8000) * 0.25
        add(FX, seg, T0 + 2.5 + j * 0.045, pan=(-1) ** j * 0.5)
    # décrocher : bulles
    for j in range(5):
        d = 0.08
        b = sine(np.linspace(600 + j * 140, 1400 + j * 200, int(d * SR)), d) * env_exp(d, 0.025)
        add(FX, b, T0 + 3.0 + j * 0.07, 0.18, pan=rng.uniform(-0.6, 0.6))
    # s'évader : scintillement qui monte, puis zoom arrière
    add(FX, riser(0.5, 0.25, 2000, 12000), T0 + 3.5)
    for j, m in enumerate([81, 84, 88, 93]):
        add(MU, bell(midi(m), 0.8, 0.05), T0 + 3.5 + j * 0.06, pan=0.4 - 0.25 * j)
    add(FX, whoosh(0.35, 0.5, False), 13.68)

    # ---------- 14–17 : le parcours en accéléré
    scale = [69, 72, 74, 76, 79, 81, 84, 86, 88, 91, 93]
    sel_times = [14 + q * 0.5 + 0.3 for q in range(5)] + [16.5 + q * (0.5 / 6) + 0.03 for q in range(6)]
    for j, tt in enumerate(sel_times):
        add(FX, tick(3200, 0.22, 0.02), tt)
        add(FX, blip(midi(scale[j]), 0.1), tt)
    for q in range(5):
        add(FX, whoosh(0.25, 0.18), 14 + q * 0.5 - 0.05, pan=0.4)
    add(FX, riser(2.0, 0.55), 15.875)

    # ---------- 17–18 : le moteur filtre le catalogue
    for j, tt in enumerate([17.0, 17.25, 17.5, 17.75]):
        add(FX, blip(midi(88 - j * 2), 0.12, 0.09), tt)
        add(FX, blip(midi(100 - j * 2), 0.05, 0.05), tt + 0.06)
    # grains : les films écartés
    d = 0.85
    gr = np.zeros(int(d * SR))
    dens = np.linspace(1400, 40, len(gr))
    kk = rng.random(len(gr)) < dens / SR
    gr[kk] = rng.standard_normal(kk.sum())
    add(FX, hp(gr, 5000) * 0.25, 17.0, pan=0.0)

    # ---------- 18–22 : les résultats (la chute)
    add(IMP, boom(1.25, 3.5, 70, 26), 18.0)
    add(MU, braam([33, 45, 52, 57], 2.0, 0.22, 1200), 18.0)
    # compteur du score : un clic par point gagné (0 → 94)
    prev = 0
    for f in range(int(18.35 * FPS), int(19.6 * FPS)):
        lt = f / FPS - 18.0
        p = min(1, max(0, (lt - 0.35) / 1.15))
        v = round(94 * (1 - (1 - p) ** 3))
        for _ in range(v - prev):
            add(FX, tick(4200, 0.07, 0.012), f / FPS + rng.uniform(0, 1 / FPS))
        prev = v
    add(FX, blip(midi(93), 0.14, 0.3), 19.5)
    for j in range(4):
        add(FX, tick(2200 + j * 300, 0.1, 0.02), 19.05 + j * 0.07)
    add(FX, whoosh(0.8, 0.5), 20.45)

    # ---------- 22–26 : les arguments
    for tt in (22.0, 23.0, 24.0, 25.0):
        add(IMP, boom(0.5 if tt != 24 else 0.75, 1.2, 100, 40), tt)
        add(MU, braam(CH[chord_at(tt)][0][:3], 0.45, 0.1, 2200), tt)
    for j in range(12):
        add(FX, tick(1500 + j * 160, 0.16, 0.02), 22.05 + j * 0.045)
    d = 0.5
    add(MU, sine(np.linspace(midi(64), midi(69), int(d * SR)), d) * env_ad(d, 0.05, 0.45) * 0.12, 23.05, pan=-0.5)
    add(MU, sine(np.linspace(midi(76), midi(72), int(d * SR)), d) * env_ad(d, 0.05, 0.45) * 0.12, 23.05, pan=0.5)
    add(MU, bell(midi(88), 1.0, 0.06), 24.02)
    add(FX, sine(np.linspace(600, 2400, int(0.3 * SR)), 0.3) * env_ad(0.3, 0.02, 0.28) * 0.06, 25.3)
    add(FX, rev_cymbal(1.0, 0.35), 25.0)

    # ---------- 26–30 : le logo
    add(IMP, boom(1.1, 4.0, 60, 24), 26.0)
    add(MU, braam([33, 40, 45], 4.0, 0.16, 600), 26.0)
    # zap du A qui grille
    d = 0.45
    zap = crackle(d, 2600, 1.0) * env_exp(d, 0.15)
    zap += sweep(saw(np.linspace(1800, 120, int(d * SR)), d), 6000, 800, 'low') * env_exp(d, 0.12) * 0.25
    add(FX, zap, 26.72, 0.6, pan=0.25)
    # montée et accord final
    add(FX, riser(0.6, 0.3, 800, 9000), 26.95)
    notes, root = CH['Am9']
    add(MU, pad(notes, 3.6, 1.4, 2400, attack=0.05, release=2.2), 27.5)
    add(BS, bass_note(33, 2.5, 0.9), 27.5)
    add(IMP, boom(0.7, 2.5, 80, 30), 27.5)
    add(MU, crash(0.3, 3.0), 27.5)
    for j, m in enumerate([69, 72, 76, 81]):
        add(MU, bell(midi(m + 12), 2.4, 0.09), 27.55 + j * 0.16, pan=-0.3 + 0.2 * j)
    add(FX, blip(midi(88), 0.08, 0.25), 28.18)

    # ---------- mixage
    # compression latérale : le kick creuse basse, pad et arpèges
    kenv = np.zeros(N)
    for tt in KICKS:
        i = idx(tt)
        d = int(0.32 * SR)
        e = np.exp(-np.arange(d) / (0.09 * SR))
        kenv[i:i + d] = np.maximum(kenv[i:i + d], e[:max(0, min(d, N - i))])
    duck = 1 - 0.55 * kenv
    BS *= duck
    MU *= 1 - 0.35 * kenv
    # silence de respiration avant la chute (17,875 → 18)
    gap = np.ones(N)
    a, b = idx(17.875), idx(18.0)
    gap[a:b] = 0.0
    ramp = int(0.006 * SR)
    gap[a - ramp:a] = np.linspace(1, 0, ramp)
    for B in (DR, BS, MU, FX):
        B *= gap
    # réverbérations
    ir_big, ir_small = make_ir(2.8, 0.025, 6500, 1600, 5), make_ir(1.1, 0.01, 8000, 2500, 9)
    wet = reverb(MU * 0.35 + IMP * 0.25 + FX * 0.18, ir_big) * 0.32
    wet += reverb(DR * 0.15, ir_small) * 0.25
    G = {'drums': 0.55, 'bass': 1.25, 'music': 1.0, 'fx': 1.05, 'impacts': 0.45}
    mix = DR * G['drums'] + BS * G['bass'] + MU * G['music'] + FX * G['fx'] + IMP * G['impacts'] + wet
    if STEMS:
        for name, B in (('drums', DR * G['drums']), ('bass', BS * G['bass']), ('music', MU * G['music']), ('fx', FX * G['fx']), ('impacts', IMP * G['impacts']), ('wet', wet)):
            rms = [np.sqrt(np.mean(B[:, idx(a):idx(a + 2)] ** 2)) for a in range(0, 30, 2)]
            print(f'{name:8s} ' + ' '.join(f'{20 * np.log10(r + 1e-9):6.1f}' for r in rms))
    # coupe-bas global, légère saturation de bande
    mix = hp(mix, 24, 2)
    mix = soft(mix * 0.9, 1.1)
    # fondu de sortie
    t = np.arange(N) / SR
    fade = np.clip((30.0 - t) / 0.65, 0, 1) ** 1.5
    fade *= np.clip(t / 0.05, 0, 1)
    mix *= fade
    # normalisation à -14 LUFS intégrés, puis limiteur à anticipation (crête ≤ -1,5 dBFS)
    import pyloudnorm as pyln
    meter = pyln.Meter(SR)
    lufs = meter.integrated_loudness(mix.T)
    mix *= 10 ** ((-14.0 - lufs) / 20)
    mix = limiter(mix, 10 ** (-1.5 / 20))
    lufs2 = meter.integrated_loudness(mix.T)
    mix *= 10 ** ((-14.0 - lufs2) / 20)
    mix = limiter(mix, 10 ** (-1.5 / 20))
    print(f'intensité : {meter.integrated_loudness(mix.T):.1f} LUFS, crête {20 * np.log10(np.max(np.abs(mix))):.1f} dBFS')
    wavfile.write(out_path, SR, (np.clip(mix.T, -1, 1) * 32767).astype(np.int16))
    print(f'écrit {out_path}')


if __name__ == '__main__':
    STEMS = '--stems' in sys.argv
    build(sys.argv[1], sys.argv[2])
