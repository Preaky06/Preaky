#!/usr/bin/env python3
"""Bande-son de la version courte (src/short.js) : 19 s, 120 BPM.
La musique suit une grille fixe ; chaque bruitage est l'événement de score_mograph.py reporté sur la
version courte par la même table de morceaux que short.js (W ci-dessous). Les événements des passages
coupés (le Duo) disparaissent.

usage : python3 score_short.py sortie.wav
"""
import math
import sys

import numpy as np
from scipy.io import wavfile

import dsp
import score_mograph as MG  # noqa: E402  (fixe ses propres durées : remplacées juste après)
dsp.DUR = 19.0
dsp.N = int(dsp.SR * dsp.DUR)
import samples as S  # noqa: E402
import score_motion as SM  # noqa: E402
from dsp import *  # noqa: E402,F401,F403
N = dsp.N
SM.N = N
MG.N = N
from score_motion import vsynth_st, pluck, kick_synth, thump, swish, EZ_IO, prog, steps  # noqa: E402
from score_mograph import pop, unpop, scroll_bed, stab, rev_cym, jsrnd, CH  # noqa: E402
from score_explainer import scan, rewind  # noqa: E402
dsp.DUR, dsp.N, SM.N, MG.N = 19.0, N, N, N

DUR = 19.0
BEAT = 0.5

# même table que short.js : (durée à l'écran, [(début, fin, vitesse relative)]) en temps de mograph.js
SCENES = [(2.5, [(0, 2.3, 2.0), (2.3, 4.3, 1.7), (4.3, 4.95, 1.6)]),
          (2.5, [(4.95, 6.35, 1.3), (6.35, 7.4, 1.6), (7.4, 8.1, 1.4), (8.1, 8.75, 1.3)]),
          (2.0, [(8.75, 12.9, 2.0)]),
          (2.5, [(12.9, 13.3, 1.6), (13.3, 18.2, 2.8), (18.2, 19.2, 1.8)]),
          (2.0, [(19.2, 23.8, 2.1)]),
          (2.25, [(23.8, 26.9, 2.0), (26.9, 27.35, 3.0), (27.35, 28.55, 1.8)]),
          (2.5, [(28.55, 31.0, 2.2), (31.0, 32.8, 1.3)]),
          (2.75, [(36.9, 40.6, 1.4)])]
PIECES = []
_t = 0.0
for d, ps in SCENES:
    nat = sum((B - A) / v for A, B, v in ps)
    for A, B, v in ps:
        dd = (B - A) / v * d / nat
        PIECES.append((_t, _t + dd, A, B))
        _t += dd


def W(T):
    """temps de mograph.js → temps de la version courte (None si le passage est coupé)"""
    for a, b, A, B in PIECES:
        if A <= T < B + 1e-9:
            return a + (T - A) / (B - A) * (b - a)
    return None


CHS = dict(CH, E=([56, 59, 64, 68], 28))
PROG = [(0.0, 'Am'), (2.5, 'Fmaj7'), (3.85, 'C'), (5.0, 'Am'), (7.0, 'F'), (9.0, 'C'), (11.0, 'G'), (13.0, 'Am'), (13.75, 'Fmaj7'),
        (14.85, 'C'), (16.25, 'Cadd9')]


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
    UI = {k: S.ui(*k.split('/')) for k in ('mechanical/typing', 'minimal/press', 'minimal/check', 'mechanical/select',
                                            'soft/toggle-on', 'glass/success', 'studio/swipe', 'soft/drop')}
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

    # ---------------------------------------------------------- 0–2,5 s : le catalogue, l'horloge, la chute, le retour
    fx(pop(81, 0.5), 0.08)
    fx(thump(0.6, 110, 50), 0.1)
    add(BS, vsynth_st(33, 2.5, gain=0.24, voices=3, det=0.08, cutoff=240, env_amt=0, atau=9, sus=1.0, rel=0.3, attack=0.6), 0.0)
    for m in (57, 64):
        add(MU, strings.note(m, 2.0, 0.3, attack=0.9, gain=1.0), 0.1)
    m_a = lambda tt: 30 * EZ_IO(prog(tt, 0.9, 2.75))  # noqa: E731
    for tt in steps(m_a, 0.9, 2.75, 1):
        fx(tick(3000 + rng.uniform(-200, 200), 0.15, 0.012), tt, pan=-0.25)
    t0, t1 = W(0.3), W(3.55)
    add(FX, scroll_bed(round((t1 - t0) * 100) / 100, 0.5), t0)
    sw = [0.55]
    while sw[-1] < 3.4:
        sw.append(sw[-1] + max(0.11, 0.42 - 0.11 * sw[-1]))
    for i, tt in enumerate(sw):
        fx(UI['studio/swipe'] * 0.2, tt, pan=0.35 if i % 2 else -0.05)
    hit(W(2.35), 0.7)
    fx(stab('Am', 0.6, 0.35, -12), 2.35, b=MU)
    fx(thump(0.55), 3.05)
    fx(whoosh(0.6, 0.3, up=False, f0=200, f1=4000, pan0=0.3, pan1=-0.3, tone=False), 3.45)
    for k in range(7):
        fx(UI['soft/drop'] * 0.16, 3.6 + jsrnd(k * 7.7) * 0.6, pan=jsrnd(k * 3.1) * 1.2 - 0.6)
    add(FX, rewind(0.4, 0.42), W(4.3))
    fx(UI['minimal/check'] * 0.4, 4.94)

    # ---------------------------------------------------------- 2,5–5 s : la promesse, CINÉMOOD
    for m in CHS['Fmaj7'][0]:
        add(PN, piano.note(m, 0.36, 1.1, 1.1), 2.5)
    add(PN, piano.note(41, 0.3, 1.2, 1.1), 2.5)
    for j, m in enumerate((72, 76, 79)):
        add(PN, piano.note(m, 0.3, 0.3, 0.7), 2.85 + j * 0.2)
    fx(whoosh(0.42, 0.32, up=True, f0=300, f1=6000, pan0=-0.5, pan1=0.1, tone=False), 6.35)
    hit(W(6.95), 0.85)
    fx(stab('C', 0.5, 0.42), 6.95, b=MU)
    for i, m in enumerate((60, 64, 67, 72, 76, 79, 84)):
        fx(pluck(m + 12, 0.2, 0.07), 6.75 + i * 0.035, pan=(i - 3) * 0.15, b=PN)
    fx(swish(0.25, 0.22, 1200, 7000), 7.3)
    fx(glass_tink(0.12), 7.92)
    add(FX, riser(0.5, 0.42, 400, 9000), W(8.13))
    rev_cym(FX, CY, room, 5.0, 0.5, 0.8)

    # ---------------------------------------------------------- 5–7 s : les neuf humeurs
    hit(5.0, 1.0)
    mood_notes = [69, 72, 74, 76, 79, 81, 84, 86, 88]
    for i in range(9):
        col, row = i % 3, i // 3
        fx(pop(mood_notes[row + col + (i > 4)], 0.3), 8.95 + (row + col) * 0.07 + i * 0.012, pan=(col - 1) * 0.35)
    fx(swish(0.35, 0.14, 800, 4000, 0.7, 0.2), 9.7)
    fx(UI['minimal/press'] * 0.55, 10.3)
    fx(pop(57, 0.45, 0.3), 10.32)
    for k, i in enumerate(sorted(range(8), key=lambda i: math.hypot(i % 3 - 2, i // 3 - 2))):
        fx(unpop(mood_notes[8 - k] - 12, 0.1), 10.62 + math.hypot(i % 3 - 2, i // 3 - 2) * 0.05)
    fx(whoosh(0.4, 0.3, up=True, f0=250, f1=5000, pan0=0.4, pan1=0, tone=False), 10.75)
    for k, tt in enumerate((11.2, 11.38, 11.55)):
        fx(glass_tink(0.07), tt, pan=(-0.5, 0.4, -0.2)[k])
    fx(whoosh(0.3, 0.42, up=True, f0=300, f1=7000, pan0=0, pan1=0, tone=False), 12.4)

    # ---------------------------------------------------------- 7–9,5 s : les sept questions
    qs = [(13.3, 13.9), (14.3, 14.8), (15.12, 15.56), (15.86, 16.24), (16.5, 16.84), (17.08, 17.38), (17.6, 17.9)]
    dot_notes = [69, 72, 74, 76, 79, 81, 84, 88]
    fx(pop(dot_notes[0], 0.3), 13.12)
    for k, (a, tp) in enumerate(qs):
        fx(swish(0.2, 0.16, 700, 5000, 0.0, -0.1), a)
        fx(UI['minimal/press'] * 0.38, tp)
        fx(pop(dot_notes[k + 1], 0.26), tp + 0.04, pan=(k - 3) * 0.12)
    fx(whoosh(0.3, 0.3, up=True, f0=300, f1=6000, pan0=0, pan1=0.3, tone=False), 18.1)
    fx(stab('C', 0.4, 0.4), 18.2, b=MU)
    fx(suck(0.25, 0.5), 18.5)
    fx(whoosh(0.3, 0.38, up=False, f0=150, f1=4000, pan0=0, pan1=0, tone=False), 18.78)

    # ---------------------------------------------------------- 9,5–11,5 s : le tri
    hit(9.5, 0.9)
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
            fx(scan(0.12, ok=False), th2, pan=pan)
        else:
            fx(scan(0.11, ok=False), th1, pan=pan)
            if i % 2 == 0:
                fx(thump(0.16, 90, 40), th1 + 0.03)
    fx(UI['glass/success'] * 0.3, 22.6)
    fx(whoosh(0.4, 0.35, up=True, f0=300, f1=6000, pan0=0.4, pan1=0, tone=False), 23.2)

    # ---------------------------------------------------------- 11,5–13,75 s : le meilleur choix
    hit(11.5, 0.85)
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
    rev_cym(FX, CY, room, 13.75, 0.4, 0.7)

    # ---------------------------------------------------------- 13,75–16,25 s : le temps gagné
    add(IMP, sub_drop(1.6, 70, 32, 0.55), 13.75)
    for m in CHS['Fmaj7'][0]:
        add(PN, piano.note(m, 0.32, 1.1, 1.0), 13.75)
        add(MU, strings.note(m, 1.1, 0.4, attack=0.3, gain=1.0), 13.75)
    fx(pop(76, 0.3), 28.75)
    fx(pop(79, 0.3), 28.85)
    m_g = lambda tt: 30 * EZ_IO(prog(tt, 29.1, 30.7))  # noqa: E731
    for tt in steps(m_g, 29.1, 30.7, 1):
        fx(tick(2600 + rng.uniform(-150, 150), 0.12, 0.012), tt, pan=-0.45)
    fx(UI['glass/success'] * 0.32, 29.36, pan=0.45)
    a, b = W(29.45), W(30.7)
    add(FX, projector(round((b - a) * 20) / 20, 0.12), a)
    hit(W(31.0), 0.8)
    for m in CHS['C'][0]:
        add(PN, piano.note(m + 12, 0.36, 1.3, 1.1), W(31.0))
        add(MU, strings.note(m, 1.4, 0.8, attack=0.2, gain=1.4), W(31.0))
    add(PN, piano.note(36, 0.36, 1.4, 1.1), W(31.0))
    rev_cym(FX, CY, room, 16.25, 0.5, 0.8)

    # ---------------------------------------------------------- 16,25–19 s : la signature
    hit(16.25, 0.95)
    for m in CHS['Cadd9'][0]:
        add(PN, piano.note(m, 0.42, 2.5, 1.3), 16.25)
        add(MU, strings.note(m, 2.6, 0.9, attack=0.25, gain=1.5), 16.25)
    add(PN, piano.note(36, 0.4, 2.6, 1.3), 16.25)
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
    def drums(a, b, opens=True):
        for i in range(int(round((b - a) / BEAT))):
            tt = a + i * BEAT
            kick(tt)
            if int(round(tt / BEAT)) % 2 == 1:
                add(DR, CP * 0.85, tt)
                add(DR, SD * 0.4, tt)
        for i in range(int(round((b - a) / 0.125))):
            tt = a + i * 0.125
            add(DR, CHH * 0.26 * (0.9, 0.35, 0.6, 0.35)[i % 4], tt, pan=0.3)
            if opens and i % 4 == 2:
                add(DR, OHH * 0.22, tt, pan=-0.3)

    drums(5.0, 13.5)
    for i in range(int(round((13.5 - 5.0) / 0.25))):
        tt = 5.0 + i * 0.25
        root = CHS[chord_at(tt)][1]
        add(BS, analog_bass(root + 12 + (12 if i % 4 == 3 else 0), 0.22, 0.75 * (0.85 if i % 2 == 0 else 0.6), cutoff=600, env_amt=1800, sub=0.22), tt)
    for i in range(int(round((13.5 - 5.0) / BEAT))):
        add(MU, stab(chord_at(5.0 + i * BEAT + 0.25), 0.2, 0.22), 5.0 + i * BEAT + 0.25)
    arp = [0, 2, 1, 3, 2, 1, 3, 2]
    for i in range(int(round((13.4 - 5.0) / 0.25))):
        tt = 5.0 + i * 0.25
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
    mix *= np.clip((18.98 - t) / 0.45, 0, 1) ** 1.5 * np.clip(t / 0.03, 0, 1)
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
