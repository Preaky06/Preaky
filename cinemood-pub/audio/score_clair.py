#!/usr/bin/env python3
"""Bande-son du film « nouvelle version », version lisible (src/clair.js) : 20,5 s, 120 BPM, grille à
partir du retournement (2,0 s). Avant : rythme étouffé. Puis un repère sonore par information montrée
(compteur, réponses, ticket, chaque question, score, « Pourquoi lui », les quatre autres), aux mêmes
instants que l'image.

usage : python3 score_clair.py sortie.wav
"""
import math
import sys

import numpy as np
from scipy.io import wavfile

import dsp
import score_mograph as MG  # noqa: E402  (fixe ses propres durées : remplacées juste après)
import samples as S  # noqa: E402
import score_motion as SM  # noqa: E402
DUR = 20.5
dsp.DUR = DUR
dsp.N = int(dsp.SR * DUR)
from dsp import *  # noqa: E402,F401,F403
N = dsp.N
SM.N = MG.N = N
from score_motion import vsynth_st, pluck, kick_synth, thump, swish  # noqa: E402
from score_mograph import pop, stab, rev_cym, CH  # noqa: E402
dsp.DUR, dsp.N, SM.N, MG.N = DUR, N, N, N

BEAT = 0.5
QT = [8.9 + k * 0.47 for k in range(8)]  # = clair.js
PROG = [(0.0, 'Am'), (2.0, 'C'), (3.0, 'Am'), (5.0, 'F'), (7.0, 'C'), (9.0, 'G'), (11.0, 'Am'), (12.5, 'Fmaj7'), (13.0, 'Am'),
        (15.0, 'F'), (16.6, 'C'), (16.95, 'Cadd9')]


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
    DR, BS, MU, PN, FX, IMP, OLD = (bus() for _ in range(7))
    kicks = []
    hall = make_hall((2.4, 1.9, 1.1), 0.02, seed=5)
    room = make_hall((0.6, 0.45, 0.3), 0.005, seed=17)

    def kick(t, g=1.0, b=None):
        add(DR if b is None else b, BD * 0.8, t, g)
        add(DR if b is None else b, kick_synth(), t, g * 0.9)
        if b is None:
            kicks.append(t)

    def hit(t, g=1.0):
        kick(t, g)
        add(IMP, sub_drop(1.2, 95, 40, 0.5), t, g)
        add(IMP, crack(0.4), t, g)
        add(DR, CY * 0.6, t, g * 0.7)

    def ping(t, n=84, g=1.0):  # un repère : l'information montrée s'allume
        add(FX, pop(n, 0.22 * g, 0.2), t)
        add(FX, glass_tink(0.06 * g), t + 0.02)

    # ---------------------------------------------------------- 0–2 s : avant, étouffé ; 12 barré ; retournement
    add(BS, vsynth_st(33, 2.0, gain=0.22, voices=3, det=0.08, cutoff=240, env_amt=0, atau=9, sus=1.0, rel=0.3, attack=0.4), 0.0)
    for m in (57, 64):
        add(MU, strings.note(m, 1.9, 0.3, attack=0.6, gain=0.9), 0.0)
    for i in range(4):
        tt = i * 0.5
        kick(tt + 0.03 if i == 0 else tt, 0.8, OLD)
        if i % 2:
            add(OLD, CP * 0.6, tt)
        for j in range(4):
            add(OLD, CHH * 0.18 * (0.9, 0.35, 0.6, 0.35)[j], tt + j * 0.125)
    add(FX, thump(0.5, 100, 45), 0.25)
    add(FX, swish(0.25, 0.3, 1500, 7000, -0.4, 0.4), 1.0)
    add(FX, UI['mechanical/snap'] * 0.3, 1.22)
    add(FX, whoosh(0.65, 0.38, up=True, f0=250, f1=7000, pan0=-0.5, pan1=0.5, tone=True), 1.32)
    add(FX, UI['mechanical/snap'] * 0.35, 1.65)
    rev_cym(FX, CY, room, 2.0, 0.6, 0.9)
    hit(2.0, 1.1)
    for m in CH['C'][0]:
        add(PN, piano.note(m + 12, 0.38, 1.3, 1.2), 2.0)
        add(MU, strings.note(m, 1.6, 0.7, attack=0.15, gain=1.3), 2.0)
    add(PN, piano.note(36, 0.4, 1.5, 1.2), 2.0)

    # ---------------------------------------------------------- 3–8,4 s : compteur, réponses, ticket
    add(FX, swish(0.5, 0.2, 600, 5000, 0.4, 0.0), 3.0)
    ping(3.55, 84)
    add(FX, swish(0.35, 0.12, 900, 6000, 0.3, -0.3), 4.85)
    ping(5.1, 81)
    add(FX, swish(0.5, 0.18, 600, 5000, -0.2, 0.3), 6.4)
    ping(6.85, 79)
    add(FX, UI['minimal/press'] * 0.55, 7.75)
    add(FX, UI['glass/success'] * 0.28, 7.82)

    # ---------------------------------------------------------- 8,4–12,8 s : les 8 questions
    add(FX, swish(0.5, 0.2, 500, 4000, 0.0, 0.4), 8.4)
    for k, tt in enumerate(QT):
        add(FX, pop((69, 72, 74, 76, 79, 81, 84, 88)[k], 0.24), tt, pan=(k - 3.5) * 0.08)
        add(FX, UI['mechanical/select'] * 0.14, tt)
    t = tv(0.5)
    spin = sine(880 + 120 * np.sin(2 * np.pi * 7 * t), 0.5) * 0.05 * env_asr(0.5, 0.08, 0.08)
    add(FX, stereo(spin), 12.5)
    add(FX, riser(0.5, 0.3, 400, 8000), 12.5)

    # ---------------------------------------------------------- 12,8–16,6 s : le résultat
    hit(13.0, 0.9)
    d = 0.75
    tb = tv(d)
    bars = sine(midi(69) * 2 ** (tb / d), d) * 0.5 + lp(saw(midi(69) * 2 ** (tb / d) * 1.5, d), 2500) * 0.1
    add(FX, stereo(bars * env_asr(d, 0.04, 0.08)) * 0.07, 13.45)
    ping(13.9, 86)
    add(FX, UI['glass/success'] * 0.22, 13.95)
    add(FX, whoosh(0.5, 0.28, up=True, f0=300, f1=6000, pan0=0, pan1=0, tone=False), 14.8)
    ping(15.2, 84)
    add(FX, whoosh(0.45, 0.24, up=False, f0=300, f1=5000, pan0=0, pan1=0, tone=False), 15.82)
    for j in range(4):
        add(FX, pop((81, 79, 79, 76)[j], 0.2), 16.02 + j * 0.07, pan=-0.3 + j * 0.2)

    # ---------------------------------------------------------- 16,6–20,5 s : l'accueil, la signature
    add(FX, whoosh(0.5, 0.3, up=False, f0=200, f1=5000, pan0=0.3, pan1=0, tone=False), 16.5)
    rev_cym(FX, CY, room, 16.95, 0.5, 0.8)
    hit(16.95, 1.0)
    for m in CH['Cadd9'][0]:
        add(PN, piano.note(m, 0.42, 3.2, 1.3), 16.95)
        add(MU, strings.note(m, 3.4, 1.1, attack=0.3, gain=1.5), 16.95)
    add(PN, piano.note(36, 0.4, 3.4, 1.3), 16.95)
    for i, m in enumerate((60, 64, 67, 72, 76, 79, 84, 88)):
        add(PN, pluck(m + 12, 0.18, 0.06), 16.95 + i * 0.04, pan=(i - 3.5) * 0.12)
    add(FX, swish(0.25, 0.16, 1200, 7000), 17.3)
    add(FX, swish(0.3, 0.16, 700, 4000, -0.3, 0.3), 17.6)
    for i in range(12):
        add(FX, S.repitch(UI['mechanical/typing'], rng.uniform(-1.2, 1.2)) * 0.3, 17.8 + i * 0.55 / 12)
    add(FX, UI['minimal/check'] * 0.32, 18.42)
    add(FX, UI['minimal/press'] * 0.5, 19.1)
    for j, mm in enumerate((72, 76, 79, 84)):
        add(PN, piano.note(mm, 0.34, 0.25 if j < 3 else 1.2, 1.1), 19.15 + j * 0.2)

    # ---------------------------------------------------------- groove (grille à partir de 2,0 s)
    def drums(a, b, opens=True):
        for i in range(int(round((b - a) / BEAT))):
            tt = a + i * BEAT
            kick(tt)
            if i % 2 == 1:
                add(DR, CP * 0.85, tt)
                add(DR, SD * 0.4, tt)
        for i in range(int(round((b - a) / 0.125))):
            tt = a + i * 0.125
            add(DR, CHH * 0.26 * (0.9, 0.35, 0.6, 0.35)[i % 4], tt, pan=0.3)
            if opens and i % 4 == 2:
                add(DR, OHH * 0.22, tt, pan=-0.3)

    drums(2.5, 12.5)
    drums(13.0, 16.5, opens=False)
    for a, b, g in ((2.5, 12.5, 0.72), (13.0, 16.5, 0.7)):
        for i in range(int(round((b - a) / 0.25))):
            tt = a + i * 0.25
            root = CH[chord_at(tt)][1]
            add(BS, analog_bass(root + 12 + (12 if i % 4 == 3 else 0), 0.22, g * (0.85 if i % 2 == 0 else 0.6), cutoff=600, env_amt=1800, sub=0.22), tt)
        for i in range(int(round((b - a) / BEAT))):
            add(MU, stab(chord_at(a + i * BEAT + 0.25), 0.2, 0.2), a + i * BEAT + 0.25)
    arp = [0, 2, 1, 3, 2, 1, 3, 2]
    for a, b in ((3.0, 8.4), (8.5, 12.4)):
        for i in range(int(round((b - a) / 0.25))):
            tt = a + i * 0.25
            notes = CH[chord_at(tt)][0]
            add(PN, pluck(notes[arp[i % 8] % len(notes)] + 12, 0.22, 0.06), tt)

    # ---------------------------------------------------------- mixage (comme score_launch)
    OLD = lp(OLD, 700, 2) * 0.9
    duck = duck_env(kicks, 0.28, 0.6, 0.075)
    BS *= duck
    MU *= 1 - 0.35 * (1 - duck)
    MU = hp(MU, 150)
    PN = hp(PN, 80)
    FX = hp(FX, 90)
    DR = soft(DR * 1.05, 1.2)
    wet = reverb(MU * 0.3 + PN * 0.3 + FX * 0.12 + IMP * 0.15, hall) * 0.4
    wet += reverb(DR * 0.1 + OLD * 0.2, room) * 0.3
    G = {'drums': 0.3, 'bass': 0.6, 'music': 1.0, 'piano': 1.3, 'fx': 1.0, 'impacts': 0.5, 'old': 0.35}
    stems = {'drums': DR, 'bass': BS, 'music': MU, 'piano': PN, 'fx': FX, 'impacts': IMP, 'old': OLD}
    mix = sum(stems[k] * G[k] for k in stems) + wet
    mix = hp(mix, 32, 2)
    mix = peak(mix, 48, -3.0, 0.8)
    mix = peak(mix, 2800, 2.0, 0.7)
    mix = compress(mix, -16, 2.0, 0.008, 0.12)
    mix = soft(mix * 0.95, 1.05)
    tt = np.arange(N) / SR
    mix *= np.clip((DUR - 0.02 - tt) / 0.6, 0, 1) ** 1.5 * np.clip(tt / 0.15, 0, 1)
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
