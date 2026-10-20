#!/usr/bin/env python3
"""Bande-son de la version 15 s (src/s15.js), 120 BPM.
Accroche sur le temps dès la première image (une humeur, un accord), groove sous l'humeur, le tri
et le résultat, chrono de la minute, tampon « gratuit », signature. Les bruitages des scènes reprises
de mograph.js sont reportés par la même table de temps que s15.js (W ci-dessous).

usage : python3 score_15.py sortie.wav
"""
import math
import sys

import numpy as np
from scipy.io import wavfile

import dsp
import score_mograph as MG  # noqa: E402  (fixe ses propres durées : remplacées juste après)
import samples as S  # noqa: E402
import score_motion as SM  # noqa: E402
DUR = 15.0
dsp.DUR = DUR
dsp.N = int(dsp.SR * DUR)
from dsp import *  # noqa: E402,F401,F403
N = dsp.N
SM.N = MG.N = N
from score_motion import vsynth_st, pluck, kick_synth, thump, swish, EZ_IO, prog  # noqa: E402
from score_mograph import pop, unpop, stab, rev_cym, jsrnd, CH  # noqa: E402
from score_explainer import scan  # noqa: E402
dsp.DUR, dsp.N, SM.N, MG.N = DUR, N, N, N

BEAT = 0.5
# scènes de mograph.js reprises : (début à l'écran, durée, [(début, fin, vitesse relative)]) — mêmes valeurs que s15.js
REUSED = [(3.0, 2.0, [(8.75, 12.35, 1)]),
          (5.0, 2.0, [(19.2, 23.8, 1)]),
          (7.0, 2.5, [(23.8, 26.9, 2.0), (26.9, 27.35, 3.0), (27.35, 28.55, 1.8)]),
          (10.75, 1.0, [(35.2, 36.9, 1)]),
          (11.75, 3.25, [(36.9, 40.6, 1)])]
PIECES = []
for t0, d, ps in REUSED:
    nat = sum((B - A) / v for A, B, v in ps)
    for A, B, v in ps:
        dd = (B - A) / v * d / nat
        PIECES.append((t0, t0 + dd, A, B))
        t0 += dd


def W(T):
    for a, b, A, B in PIECES:
        if A <= T < B + 1e-9:
            return a + (T - A) / (B - A) * (b - a)
    return None


CHS = dict(CH)
PROG = [(0.0, 'Am'), (0.5, 'F'), (1.0, 'C'), (1.5, 'G'), (2.0, 'Am'), (3.0, 'Am'), (5.0, 'F'), (7.0, 'C'), (9.0, 'G'), (9.5, 'Fmaj7'),
        (10.75, 'C'), (11.75, 'Cadd9')]


def chord_at(t):
    c = 'Am'
    for t0, n in PROG:
        if t >= t0 - 1e-9:
            c = n
    return c


def build(out_path):
    piano = S.Piano()
    strings = S.GM('string_ensemble_1')
    BD, SD, CP = S.k808('BD/BD2550'), S.k808('SD/SD5050'), S.k808('CP/CP')
    CHH, OHH, CY = S.k808('CH/CH'), S.k808('OH/OH25'), S.k808('CY/CY5050')
    UI = {k: S.ui(*k.split('/')) for k in ('mechanical/typing', 'minimal/press', 'minimal/check', 'mechanical/select', 'glass/success', 'mechanical/snap')}
    DR, BS, MU, PN, FX, IMP = (bus() for _ in range(6))
    kicks = []
    hall = make_hall((2.4, 1.9, 1.1), 0.02, seed=5)
    room = make_hall((0.6, 0.45, 0.3), 0.005, seed=17)

    def fx(x, T, g=1.0, pan=0.0, b=None):
        t = W(T)
        if t is not None:
            add(FX if b is None else b, x, t, g, pan)

    def kick(t, g=1.0):
        add(DR, BD * 0.8, t, g)
        add(DR, kick_synth(), t, g * 0.9)
        kicks.append(t)

    def hit(t, g=1.0):
        kick(t, g)
        add(IMP, sub_drop(1.2, 95, 40, 0.5), t, g)
        add(IMP, crack(0.4), t, g)
        add(DR, CY * 0.6, t, g * 0.7)

    # ---------------------------------------------------------- 0–3 s : Heureux ? Triste ? Amoureux ? Crevé ? Ton humeur choisit ton film.
    for k, (name, note) in enumerate((('Am', 81), ('F', 77), ('C', 79), ('G', 74))):
        t = k * 0.5 if k else 0.03  # pas d'impact sur l'échantillon 0 : l'AAC déborde sur la toute première trame
        hit(t, 0.75 if k else 0.85)
        add(MU, stab(name, 0.4, 0.42), t)
        add(BS, analog_bass(CHS[name][1] + 12, 0.42, 0.8, cutoff=700, env_amt=1800, sub=0.3), t)
        add(FX, pop(note, 0.32), t + 0.02)
        add(FX, whoosh(0.22, 0.18, up=True, f0=500, f1=7000, pan0=0, pan1=0, tone=False), t - 0.06 if t else 0.0)
    for k in range(4):  # les quatre visages se rangent
        add(FX, pop((72, 76, 79, 84)[k], 0.24), 2.02 + k * 0.05, pan=(k - 1.5) * 0.3)
    hit(2.0, 0.8)
    for m in CHS['Am'][0]:
        add(PN, piano.note(m + 12, 0.34, 0.9, 0.9), 2.12)
    add(MU, stab('Am', 0.5, 0.36), 2.12)
    for i in range(8):
        add(DR, CHH * 0.22 * (0.9, 0.4)[i % 2], 2.0 + i * 0.125, pan=0.3)
    add(FX, whoosh(0.4, 0.4, up=True, f0=300, f1=7000, pan0=0, pan1=0, tone=False), 2.6)
    rev_cym(FX, CY, room, 3.0, 0.5, 0.8)

    # ---------------------------------------------------------- 3–5 s : dis comment tu te sens
    hit(3.0, 1.0)
    mood_notes = [69, 72, 74, 76, 79, 81, 84, 86, 88]
    for i in range(9):
        col, row = i % 3, i // 3
        fx(pop(mood_notes[row + col + (i > 4)], 0.26), 8.95 + (row + col) * 0.07 + i * 0.012, pan=(col - 1) * 0.35)
    fx(swish(0.3, 0.14, 800, 4000, 0.7, 0.2), 9.7)
    fx(UI['minimal/press'] * 0.55, 10.3)
    fx(pop(57, 0.45, 0.3), 10.32)
    for k, i in enumerate(sorted(range(8), key=lambda i: math.hypot(i % 3 - 2, i // 3 - 2))):
        fx(unpop(mood_notes[8 - k] - 12, 0.1), 10.62 + math.hypot(i % 3 - 2, i // 3 - 2) * 0.05)
    fx(whoosh(0.35, 0.28, up=True, f0=250, f1=5000, pan0=0.4, pan1=0, tone=False), 10.75)
    for k, tt in enumerate((11.2, 11.38, 11.55)):
        fx(glass_tink(0.07), tt, pan=(-0.5, 0.4, -0.2)[k])

    # ---------------------------------------------------------- 5–7 s : on te trouve le film qui va avec
    hit(5.0, 0.9)
    acc, rej2 = [2, 6, 10, 14, 18], [4, 8, 12, 16, 20]
    for i in range(22):
        t0 = 19.62 + i * 0.1 + (jsrnd(i * 2.9) - 0.5) * 0.04
        th1 = t0 + 760 / 1400
        th2 = th1 + 230 / 1400
        pan = jsrnd(i * 7.31 + 3) * 0.9 - 0.2
        if i in acc:
            fx(scan(0.06, ok=True), th2, pan=pan)
            fx(UI['mechanical/select'] * 0.24, th2 + 0.42, pan=(acc.index(i) - 2) * 0.25)
        elif i in rej2:
            fx(scan(0.11, ok=False), th2, pan=pan)
        elif i % 2 == 0:
            fx(scan(0.1, ok=False), th1, pan=pan)
    fx(UI['glass/success'] * 0.3, 22.6)
    fx(whoosh(0.35, 0.35, up=True, f0=300, f1=6000, pan0=0.4, pan1=0, tone=False), 23.2)

    # ---------------------------------------------------------- 7–9,5 s : ton meilleur choix + 4 autres
    hit(7.0, 0.85)
    fx(pop(84, 0.25), 24.15)
    a, b = W(24.5), W(25.4)
    d = round((b - a) * 100) / 100
    tb = tv(d)
    ring = sine(midi(69) * 2 ** (tb / d), d) * 0.5 + lp(saw(midi(69) * 2 ** (tb / d) * 1.5, d), 2500) * 0.1
    add(FX, stereo(ring * env_asr(d, 0.03, 0.06)) * 0.07, a)
    fx(UI['glass/success'] * 0.26, 25.4)
    for k in range(4):
        fx(pop((81, 79, 79, 76)[k], 0.2), 26.37 + k * 0.07, pan=(k - 1.5) * 0.3)
    fx(pop(76, 0.3, 0.22), 27.35)
    fx(UI['minimal/press'] * 0.5, 27.86)
    fx(whoosh(0.4, 0.5, up=True, f0=200, f1=8000, pan0=0, pan1=0, tone=False), 27.95)

    # ---------------------------------------------------------- 9,5–10,75 s : en une minute
    add(IMP, sub_drop(1.0, 70, 32, 0.5), 9.5)
    for m in CHS['Fmaj7'][0]:
        add(PN, piano.note(m, 0.3, 1.0, 0.9), 9.5)
    t0 = 9.5
    for k in range(12):  # le chrono passe de 5 en 5 secondes
        v = (k + 1) / 12
        lo, hi = 0.0, 1.0
        for _ in range(30):
            mid = (lo + hi) / 2
            if EZ_IO(mid) < v:
                lo = mid
            else:
                hi = mid
        add(FX, tick(2800 + k * 40, 0.14, 0.012), t0 + 0.1 + lo * 0.78)
    add(FX, riser(0.7, 0.3, 400, 8000), 9.68)
    add(FX, UI['glass/success'] * 0.34, 10.38)

    # ---------------------------------------------------------- 10,75–11,75 s : gratuit, sans inscription
    hit(W(35.38), 1.0)
    add(MU, stab('C', 0.4, 0.45), W(35.38))
    fx(UI['mechanical/snap'] * 0.4, 35.75)
    fx(swish(0.25, 0.2, 1200, 7000), 35.75)
    fx(whoosh(0.4, 0.4, up=True, f0=300, f1=7000, pan0=-0.6, pan1=0.6, tone=False), 36.42)

    # ---------------------------------------------------------- 11,75–15 s : la signature
    hit(11.75, 0.95)
    for m in CHS['Cadd9'][0]:
        add(PN, piano.note(m, 0.42, 2.8, 1.3), 11.75)
        add(MU, strings.note(m, 3.0, 0.9, attack=0.25, gain=1.5), 11.75)
    add(PN, piano.note(36, 0.4, 3.0, 1.3), 11.75)
    for i, m in enumerate((60, 64, 67, 72, 76, 79, 84, 88)):
        fx(pluck(m + 12, 0.18, 0.06), 37.0 + i * 0.045, pan=(i - 3.5) * 0.12, b=PN)
    fx(swish(0.25, 0.16, 1200, 7000), 37.5)
    fx(swish(0.3, 0.16, 700, 4000, -0.3, 0.3), 37.95)
    for i in range(12):
        fx(S.repitch(UI['mechanical/typing'], rng.uniform(-1.2, 1.2)) * 0.3, 38.15 + i * 0.6 / 12)
    fx(UI['minimal/check'] * 0.32, 38.82)
    for j, mm in enumerate((72, 76, 79, 84)):
        add(PN, piano.note(mm, 0.36, 0.25 if j < 3 else 1.2, 1.1), W(38.85) + j * 0.2)

    # ---------------------------------------------------------- groove (grille fixe de 0,5 s)
    def drums(a, b):
        for i in range(int(round((b - a) / BEAT))):
            tt = a + i * BEAT
            kick(tt)
            if int(round(tt / BEAT)) % 2 == 1:
                add(DR, CP * 0.85, tt)
                add(DR, SD * 0.4, tt)
        for i in range(int(round((b - a) / 0.125))):
            tt = a + i * 0.125
            add(DR, CHH * 0.26 * (0.9, 0.35, 0.6, 0.35)[i % 4], tt, pan=0.3)
            if i % 4 == 2:
                add(DR, OHH * 0.22, tt, pan=-0.3)

    drums(3.0, 9.5)
    for i in range(int(round((9.5 - 3.0) / 0.25))):
        tt = 3.0 + i * 0.25
        root = CHS[chord_at(tt)][1]
        add(BS, analog_bass(root + 12 + (12 if i % 4 == 3 else 0), 0.22, 0.75 * (0.85 if i % 2 == 0 else 0.6), cutoff=600, env_amt=1800, sub=0.22), tt)
    for i in range(int(round((9.5 - 3.0) / BEAT))):
        add(MU, stab(chord_at(3.0 + i * BEAT + 0.25), 0.2, 0.22), 3.0 + i * BEAT + 0.25)
    arp = [0, 2, 1, 3, 2, 1, 3, 2]
    for i in range(int(round((9.4 - 3.0) / 0.25))):
        tt = 3.0 + i * 0.25
        notes = CHS[chord_at(tt)][0]
        add(PN, pluck(notes[arp[i % 8] % len(notes)] + 12, 0.22, 0.08), tt)

    # ---------------------------------------------------------- mixage (comme score_mograph)
    duck = duck_env(kicks, 0.28, 0.6, 0.075)
    BS *= duck
    MU *= 1 - 0.35 * (1 - duck)
    MU = hp(MU, 150)
    PN = hp(PN, 80)
    FX = hp(FX, 90)
    DR = soft(DR * 1.05, 1.2)
    wet = reverb(MU * 0.3 + PN * 0.3 + FX * 0.12 + IMP * 0.15, hall) * 0.4
    wet += reverb(DR * 0.1, room) * 0.3
    G = {'drums': 0.3, 'bass': 0.6, 'music': 1.0, 'piano': 1.3, 'fx': 1.0, 'impacts': 0.5}
    stems = {'drums': DR, 'bass': BS, 'music': MU, 'piano': PN, 'fx': FX, 'impacts': IMP}
    mix = sum(stems[k] * G[k] for k in stems) + wet
    mix = hp(mix, 32, 2)
    mix = peak(mix, 48, -3.0, 0.8)
    mix = peak(mix, 2800, 2.0, 0.7)
    mix = compress(mix, -16, 2.0, 0.008, 0.12)
    mix = soft(mix * 0.95, 1.05)
    t = np.arange(N) / SR
    mix *= np.clip((DUR - 0.02 - t) / 0.45, 0, 1) ** 1.5 * np.clip(t / 0.004, 0, 1)
    import pyloudnorm as pyln
    meter = pyln.Meter(SR)
    for _ in range(2):
        mix *= 10 ** ((-14.0 - meter.integrated_loudness(mix.T)) / 20)
        mix = limiter(mix, 10 ** (-1.5 / 20), tp=True)
    print(f'intensité : {meter.integrated_loudness(mix.T):.1f} LUFS, crête {20 * np.log10(np.max(np.abs(mix))):.1f} dBFS')
    wavfile.write(out_path, SR, (np.clip(mix.T, -1, 1) * 32767).astype(np.int16))
    print(f'écrit {out_path}')


if __name__ == '__main__':
    build(sys.argv[1])
