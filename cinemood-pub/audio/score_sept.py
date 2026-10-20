#!/usr/bin/env python3
"""Bande-son du film « 7 questions » (src/sept.js) : 20,5 s, 120 BPM, grille à partir de l'arrivée
sur la première question (1,7 s). Un repère sonore par information montrée : chaque question,
chaque appui, les deux zooms (rappel des réponses, « Je sais pas · Passer »), le score, les quatre
autres, aux mêmes instants que l'image.

usage : python3 score_sept.py sortie.wav
"""
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
# = sept.js
TAP = [3.1, 4.25, 8.1, 9.3, 11.0, 12.7, 14.4]
QIN = [1.7, 3.25, 4.4, 8.25, 9.45, 11.15, 12.85]
CAP = [1.95, 3.35, 7.3, 8.4, 9.55, 11.25, 12.95]
NCH = [0, 0, 0, 0, 3, 3, 2]  # pastilles de choix affichées (questions 5 à 7)
LOAD, CARD, END, GO = 14.55, 14.9, 17.25, 19.5
PROG = [(0.0, 'Am'), (1.7, 'C'), (2.7, 'G'), (3.7, 'Am'), (4.7, 'F'), (6.2, 'C'), (7.2, 'G'), (8.2, 'Am'), (9.45, 'F'),
        (11.15, 'C'), (12.85, 'G'), (14.55, 'Fmaj7'), (14.95, 'Am'), (15.95, 'F'), (16.95, 'C'), (17.55, 'Cadd9')]


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

    def kick(t, g=1.0):
        add(DR, BD * 0.8, t, g)
        add(DR, kick_synth(), t, g * 0.9)
        kicks.append(t)

    def hit(t, g=1.0):
        kick(t, g)
        add(IMP, sub_drop(1.2, 95, 40, 0.5), t, g)
        add(IMP, crack(0.4), t, g)
        add(DR, CY * 0.6, t, g * 0.7)

    def ping(t, n=84, g=1.0):  # un repère : la zone montrée s'allume
        add(FX, pop(n, 0.22 * g, 0.2), t)
        add(FX, glass_tink(0.06 * g), t + 0.02)

    def tap(t, g=1.0):
        add(FX, UI['minimal/press'] * 0.5 * g, t)
        add(FX, UI['mechanical/select'] * 0.16 * g, t + 0.03)

    # ---------------------------------------------------------- 0–1,7 s : l'accroche, « Commencer »
    add(BS, vsynth_st(33, 1.7, gain=0.2, voices=3, det=0.08, cutoff=420, env_amt=300, atau=9, sus=1.0, rel=0.3, attack=0.3), 0.0)
    for m in (57, 64, 69):
        add(MU, strings.note(m, 1.7, 0.4, attack=0.5, gain=1.0), 0.0)
    add(FX, thump(0.5, 100, 45), 0.05)
    add(PN, piano.note(45, 0.35, 1.5, 1.1), 0.05)
    add(FX, pop(76, 0.2, 0.2), 0.22)
    add(FX, swish(0.3, 0.12, 1200, 6000, -0.3, 0.3), 0.5)
    add(FX, riser(0.7, 0.22, 300, 7000), 1.0)
    tap(1.55)
    add(FX, whoosh(0.4, 0.3, up=True, f0=300, f1=7000, pan0=0.4, pan1=-0.2, tone=True), 1.4)
    rev_cym(FX, CY, room, 1.7, 0.5, 0.8)
    hit(1.7, 1.0)
    for m in CH['C'][0]:
        add(PN, piano.note(m + 12, 0.36, 1.3, 1.2), 1.7)
        add(MU, strings.note(m, 1.6, 0.7, attack=0.15, gain=1.3), 1.7)
    add(PN, piano.note(36, 0.4, 1.5, 1.2), 1.7)

    # ---------------------------------------------------------- 1,7–14,6 s : les 7 questions
    notes = (69, 72, 74, 76, 79, 81, 84)
    for k in range(7):
        if k:
            add(FX, swish(0.32, 0.14, 700, 5500, 0.4, -0.2), QIN[k])
        add(FX, pop(notes[k], 0.24), CAP[k], pan=(k - 3) * 0.1)
        for i in range(NCH[k]):
            add(FX, pop(notes[k] + (0, 3, 7)[i], 0.14, 0.15), CAP[k] + 0.3 + i * 0.08, pan=-0.3 + i * 0.3)
        tap(TAP[k])
        if NCH[k]:
            add(FX, UI['glass/success'] * 0.16, TAP[k] + 0.05)
    add(FX, swish(0.4, 0.14, 500, 4000, 0.0, 0.3), 2.5)  # la liste des humeurs défile
    # les deux nouveautés : le rappel des réponses, puis « Je sais pas · Passer »
    add(FX, swish(0.4, 0.18, 600, 5000, 0.4, 0.0), 4.55)
    ping(4.95, 84)
    add(FX, swish(0.45, 0.16, 500, 4000, 0.0, -0.3), 5.75)
    ping(6.2, 81)
    add(FX, swish(0.35, 0.14, 700, 5000, -0.3, 0.3), 7.0)
    t = tv(0.4)
    spin = sine(880 + 120 * np.sin(2 * np.pi * 7 * t), 0.4) * 0.05 * env_asr(0.4, 0.06, 0.08)
    add(FX, stereo(spin), LOAD)
    add(FX, riser(0.4, 0.3, 400, 8000), LOAD)

    # ---------------------------------------------------------- 14,9–17,25 s : le résultat
    hit(14.95, 0.9)
    d = 0.7
    tb = tv(d)
    bars = sine(midi(69) * 2 ** (tb / d), d) * 0.5 + lp(saw(midi(69) * 2 ** (tb / d) * 1.5, d), 2500) * 0.1
    add(FX, stereo(bars * env_asr(d, 0.04, 0.08)) * 0.07, 15.3)
    ping(15.6, 86)
    add(FX, UI['glass/success'] * 0.22, 15.65)
    add(FX, whoosh(0.45, 0.24, up=False, f0=300, f1=5000, pan0=0, pan1=0, tone=False), 16.15)
    for j in range(4):
        add(FX, pop((81, 79, 79, 76)[j], 0.2), 16.35 + j * 0.07, pan=-0.3 + j * 0.2)

    # ---------------------------------------------------------- 17,25–20,5 s : l'accueil, la signature
    add(FX, whoosh(0.5, 0.3, up=False, f0=200, f1=5000, pan0=0.3, pan1=0, tone=False), END - 0.25)
    rev_cym(FX, CY, room, END + 0.3, 0.5, 0.8)
    hit(END + 0.3, 1.0)
    for m in CH['Cadd9'][0]:
        add(PN, piano.note(m, 0.42, 2.8, 1.3), END + 0.3)
        add(MU, strings.note(m, 2.9, 1.0, attack=0.3, gain=1.5), END + 0.3)
    add(PN, piano.note(36, 0.4, 2.9, 1.3), END + 0.3)
    for i, m in enumerate((60, 64, 67, 72, 76, 79, 84, 88)):
        add(PN, pluck(m + 12, 0.18, 0.06), END + 0.3 + i * 0.04, pan=(i - 3.5) * 0.12)
    add(FX, swish(0.25, 0.16, 1200, 7000), END + 0.6)
    add(FX, swish(0.3, 0.16, 700, 4000, -0.3, 0.3), END + 0.85)
    for i in range(12):
        add(FX, S.repitch(UI['mechanical/typing'], rng.uniform(-1.2, 1.2)) * 0.3, END + 1.0 + i * 0.5 / 12)
    add(FX, UI['minimal/check'] * 0.32, END + 1.57)
    tap(GO)
    for j, mm in enumerate((72, 76, 79, 84)):
        add(PN, piano.note(mm, 0.34, 0.25 if j < 3 else 0.6, 1.1), GO + 0.05 + j * 0.15)

    # ---------------------------------------------------------- groove (grille à partir de 1,7 s, puis du résultat)
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

    drums(2.2, 14.2)
    drums(15.45, 16.95, opens=False)
    for a, b, g in ((2.2, 14.45, 0.72), (14.95, 16.95, 0.7)):
        for i in range(int(round((b - a) / 0.25))):
            tt = a + i * 0.25
            root = CH[chord_at(tt)][1]
            add(BS, analog_bass(root + 12 + (12 if i % 4 == 3 else 0), 0.22, g * (0.85 if i % 2 == 0 else 0.6), cutoff=600, env_amt=1800, sub=0.22), tt)
        for i in range(int(round((b - a) / BEAT))):
            add(MU, stab(chord_at(a + i * BEAT + 0.25), 0.2, 0.2), a + i * BEAT + 0.25)
    arp = [0, 2, 1, 3, 2, 1, 3, 2]
    for a, b in ((2.2, 14.45), (15.45, 16.95)):
        for i in range(int(round((b - a) / 0.25))):
            tt = a + i * 0.25
            ns = CH[chord_at(tt)][0]
            add(PN, pluck(ns[arp[i % 8] % len(ns)] + 12, 0.22, 0.06), tt)

    # ---------------------------------------------------------- mixage (comme score_clair)
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
