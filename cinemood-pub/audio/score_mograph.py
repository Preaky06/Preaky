#!/usr/bin/env python3
"""Bande-son du motion design vectoriel (src/mograph.js) : 41 s, 120 BPM, la mineur → do majeur.
Tension mécanique sur le problème (tic-tac, défilement qui s'emballe, chute, retour en arrière),
promesse au piano, groove électro sous les quatre étapes, respiration sur le temps gagné,
reprise pour le Duo et la gratuité, accord final. Chaque bruitage reprend la seconde exacte
de l'animation qu'il accompagne (mêmes formules que mograph.js pour le tri des films).

usage : python3 score_mograph.py sortie.wav [--stems]
"""
import math
import sys

import numpy as np
from scipy.io import wavfile

import dsp
from score_explainer import scan, rewind  # noqa: E402  (ce module fixe sa propre durée : on la remplace juste après)
dsp.DUR = 41.0
dsp.N = int(dsp.SR * dsp.DUR)
import samples as S  # noqa: E402
import score_motion as SM  # noqa: E402
from dsp import *  # noqa: E402,F401,F403
N = dsp.N
SM.N = N
from score_motion import vsynth_st, pluck, kick_synth, thump, swish, EZ_IO, prog, steps  # noqa: E402

STEMS = '--stems' in sys.argv
DUR = 41.0
BEAT = 0.5

CH = {'Am': ([57, 60, 64, 69], 33), 'F': ([57, 60, 65, 69], 29), 'C': ([55, 60, 64, 67], 36), 'G': ([55, 59, 62, 67], 31),
      'Fmaj7': ([53, 57, 60, 64], 29), 'Cadd9': ([55, 60, 62, 64, 67], 36)}
PROG = [(0.0, 'Am'), (5.0, 'Fmaj7'), (7.0, 'C'), (9.0, 'Am'), (11.0, 'F'), (13.0, 'C'), (15.0, 'G'), (17.0, 'Am'), (19.0, 'F'),
        (21.0, 'C'), (23.0, 'G'), (25.0, 'Am'), (27.0, 'F'), (28.55, 'Fmaj7'), (31.0, 'C'), (32.5, 'G'), (33.5, 'Am'), (34.5, 'F'),
        (35.5, 'C'), (36.0, 'G'), (37.0, 'Cadd9')]


def chord_at(t):
    c = 'Am'
    for t0, n in PROG:
        if t >= t0 - 1e-9:
            c = n
    return c


def jsrnd(i):
    """même pseudo-hasard que rnd() dans engine.js"""
    s = math.sin(i * 127.1 + 311.7) * 43758.5453123
    return s - math.floor(s)


def stab(name, d=0.3, gain=1.0, octave=0):
    out = None
    for m in CH[name][0]:
        y = vsynth_st(m + octave, d, width=0.9, gain=gain, voices=5, det=0.16, cutoff=900, env_amt=5200, ftau=0.09, atau=0.22, sus=0.12, rel=0.06)
        out = y if out is None else out + y
    return out / np.sqrt(len(CH[name][0]))


def pop(m, gain=1.0, d=0.16):
    """apparition d'une forme : petite note ronde qui « tombe » sur sa hauteur"""
    t = tv(d)
    f = midi(m) * (1 + 0.6 * np.exp(-t / 0.012))
    x = np.sin(2 * np.pi * phase(f, len(t))) * env_exp(d, 0.05, 0.0015)
    x += np.sin(2 * np.pi * phase(f * 2, len(t))) * env_exp(d, 0.02, 0.0015) * 0.25
    return stereo(x) * gain


def unpop(m, gain=1.0, d=0.12):
    """disparition : la note remonte et s'éteint"""
    t = tv(d)
    f = midi(m) * (1 + 0.5 * (t / d) ** 2)
    return stereo(np.sin(2 * np.pi * phase(f, len(t))) * env_ad(d, 0.004, d) * 0.8) * gain


def scroll_bed(d, gain=1.0):
    """défilement qui s'emballe : bruit granuleux dont la pulsation accélère"""
    t = tv(d)
    u = t / d
    rate = 5 + 22 * u ** 2
    trem = 0.5 + 0.5 * np.sin(2 * np.pi * np.cumsum(rate) / SR)
    x = sweep(pink(d), 500, 3200, 'band', q=1.1, curve=1.4) * (0.35 + 0.65 * trem ** 2)
    return stereo(x * np.clip(u * 1.4, 0, 1) ** 1.5 * env_asr(d, 0.1, 0.15)) * gain


def rev_cym(F, CY, room, t_end, d=0.6, g=1.0):
    c = reverb_tail(CY * 0.8, room, 1.0)
    r = reverse(cut(c, d + 0.3))[:, -int(d * SR):]
    add(F, r * np.linspace(0, 1, r.shape[1]) ** 2, t_end - d, g)


def build(out_path):
    piano = S.Piano()
    strings = S.GM('string_ensemble_1')
    BD, SD, CP = S.k808('BD/BD2550'), S.k808('SD/SD5050'), S.k808('CP/CP')
    CHH, OHH, CY = S.k808('CH/CH'), S.k808('OH/OH25'), S.k808('CY/CY5050')
    UI = {k: S.ui(*k.split('/')) for k in ('mechanical/snap', 'mechanical/typing', 'minimal/press', 'minimal/check', 'mechanical/select',
                                            'soft/toggle-on', 'glass/success', 'studio/swipe', 'soft/drop', 'glass/select')}
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

    # ---------------------------------------------------------- A. 0–5 s : le catalogue, l'horloge, la chute, le retour
    add(FX, pop(81, 0.5), 0.08)
    add(FX, thump(0.6, 110, 50), 0.1)
    add(BS, vsynth_st(33, 4.5, gain=0.22, voices=3, det=0.08, cutoff=220, env_amt=0, atau=9, sus=1.0, rel=0.4, attack=1.2), 0.0)
    for m in (57, 64):
        add(MU, strings.note(m, 3.0, 0.3, attack=1.8, gain=1.0), 0.3)
    for k in range(4):  # tic-tac avant que l'aiguille ne s'emballe
        add(FX, tick(2600 if k % 2 == 0 else 2000, 0.2, 0.016), 0.5 + k * 0.5 - 0.5 * (k > 1))
    m_a = lambda tt: 30 * EZ_IO(prog(tt, 0.9, 2.75))  # noqa: E731  (minA dans mograph.js)
    for tt in steps(m_a, 0.9, 2.75, 1):
        add(FX, tick(3000 + rng.uniform(-200, 200), 0.15, 0.012), tt, pan=-0.25)
    add(FX, scroll_bed(3.3, 0.5), 0.3)
    sw = [0.55]
    while sw[-1] < 3.4:
        sw.append(sw[-1] + max(0.11, 0.42 - 0.11 * sw[-1]))
    for i, tt in enumerate(sw):
        add(FX, UI['studio/swipe'] * 0.22, tt, pan=0.35 if i % 2 else -0.05)
    hit(2.35, 0.7)
    add(MU, stab('Am', 0.6, 0.35, -12), 2.35)
    add(FX, thump(0.55), 3.05)
    add(FX, whoosh(0.8, 0.3, up=False, f0=200, f1=4000, pan0=0.3, pan1=-0.3, tone=False), 3.45)
    for k in range(9):
        add(FX, UI['soft/drop'] * 0.18, 3.6 + jsrnd(k * 7.7) * 0.6, pan=jsrnd(k * 3.1) * 1.2 - 0.6)
    add(FX, rewind(0.7, 0.42), 4.28)
    add(FX, UI['minimal/check'] * 0.4, 4.97)

    # ---------------------------------------------------------- B. 5–8,75 s : la promesse, l'horloge devient le O
    for m in CH['Fmaj7'][0]:
        add(PN, piano.note(m, 0.36, 1.25, 1.2), 5.0)
    add(PN, piano.note(41, 0.3, 1.4, 1.2), 5.0)
    for j, m in enumerate((72, 76, 79)):
        add(PN, piano.note(m, 0.3, 0.4, 0.8), 5.45 + j * 0.25)
    add(FX, whoosh(0.62, 0.32, up=True, f0=300, f1=6000, pan0=-0.5, pan1=0.1, tone=False), 6.33)
    hit(6.95, 0.85)
    add(MU, stab('C', 0.5, 0.42), 6.95)
    for i, m in enumerate((60, 64, 67, 72, 76, 79, 84)):
        add(PN, pluck(m + 12, 0.2, 0.07), 6.75 + i * 0.035, pan=(i - 3) * 0.15)
    add(FX, swish(0.3, 0.22, 1200, 7000), 7.3)
    add(FX, glass_tink(0.12), 7.92)
    add(FX, glass_tink(0.08), 7.98)
    add(FX, riser(0.62, 0.4, 400, 9000), 8.13)
    rev_cym(FX, CY, room, 8.75, 0.6, 0.8)

    # ---------------------------------------------------------- C. 8,75–12,9 s : les neuf humeurs
    hit(8.75, 1.0)
    mood_notes = [69, 72, 74, 76, 79, 81, 84, 86, 88]
    for i in range(9):
        col, row = i % 3, i // 3
        add(FX, pop(mood_notes[row + col + (i > 4)], 0.3), 8.95 + (row + col) * 0.07 + i * 0.012, pan=(col - 1) * 0.35)
    add(FX, swish(0.55, 0.16, 800, 4000, 0.7, 0.2), 9.7)
    add(FX, UI['minimal/press'] * 0.55, 10.3)
    add(FX, pop(57, 0.45, 0.3), 10.32)
    for k, i in enumerate(sorted(range(8), key=lambda i: math.hypot(i % 3 - 2, i // 3 - 2))):
        add(FX, unpop(mood_notes[8 - k] - 12, 0.12), 10.62 + math.hypot(i % 3 - 2, i // 3 - 2) * 0.05)
    add(FX, whoosh(0.65, 0.3, up=True, f0=250, f1=5000, pan0=0.4, pan1=0, tone=False), 10.75)
    add(FX, thump(0.4), 11.2)
    for k, tt in enumerate((11.2, 11.38, 11.55, 11.9)):
        add(FX, glass_tink(0.07), tt, pan=(-0.5, 0.4, -0.2, 0.5)[k])
    add(FX, swish(0.3, 0.2, 1500, 8000), 12.18)
    add(FX, whoosh(0.5, 0.42, up=True, f0=300, f1=7000, pan0=0, pan1=0, tone=False), 12.4)
    rev_cym(FX, CY, room, 12.9, 0.5, 0.7)

    # ---------------------------------------------------------- D. 12,9–19,2 s : les sept questions
    hit(12.9, 0.85)
    qs = [(13.3, 13.9), (14.3, 14.8), (15.12, 15.56), (15.86, 16.24), (16.5, 16.84), (17.08, 17.38), (17.6, 17.9)]
    dot_notes = [69, 72, 74, 76, 79, 81, 84, 88]
    add(FX, pop(dot_notes[0], 0.3), 13.12)
    for k, (a, tp) in enumerate(qs):
        add(FX, swish(0.32, 0.2, 700, 5000, 0.0, -0.1), a)
        add(FX, UI['minimal/press'] * 0.42, tp)
        add(FX, pop(dot_notes[k + 1], 0.26), tp + 0.04, pan=(k - 3) * 0.12)
    add(FX, whoosh(0.45, 0.32, up=True, f0=300, f1=6000, pan0=0, pan1=0.3, tone=False), 18.1)
    hit(18.2, 0.6)
    add(MU, stab('C', 0.45, 0.4), 18.2)
    add(FX, suck(0.36, 0.5), 18.5)
    add(FX, whoosh(0.45, 0.38, up=False, f0=150, f1=4000, pan0=0, pan1=0, tone=False), 18.78)
    rev_cym(FX, CY, room, 19.2, 0.4, 0.6)

    # ---------------------------------------------------------- E. 19,2–23,8 s : le tri (mêmes temps que fallState)
    hit(19.2, 0.9)
    add(FX, swish(0.5, 0.16, 900, 6000, -0.4, 0.5), 19.45)
    add(FX, swish(0.5, 0.14, 900, 6000, -0.4, 0.5), 19.6)
    acc, rej2 = [2, 6, 10, 14, 18], [4, 8, 12, 16, 20]
    for i in range(22):
        t0 = 19.62 + i * 0.1 + (jsrnd(i * 2.9) - 0.5) * 0.04
        th1 = t0 + 760 / 1400
        th2 = th1 + 230 / 1400
        pan = jsrnd(i * 7.31 + 3) * 0.9 - 0.2
        if i in acc:
            add(FX, scan(0.07, ok=True), th1, pan=pan)
            add(FX, scan(0.08, ok=True), th2, pan=pan)
            add(FX, UI['mechanical/select'] * 0.26, th2 + 0.42, pan=(acc.index(i) - 2) * 0.25)
        elif i in rej2:
            add(FX, scan(0.07, ok=True), th1, pan=pan)
            add(FX, scan(0.16, ok=False), th2, pan=pan)
            add(FX, thump(0.22, 90, 40), th2 + 0.03)
        else:
            add(FX, scan(0.15, ok=False), th1, pan=pan)
            add(FX, thump(0.2, 90, 40), th1 + 0.03)
    add(FX, UI['glass/success'] * 0.3, 22.6)
    add(FX, whoosh(0.6, 0.35, up=True, f0=300, f1=6000, pan0=0.4, pan1=0, tone=False), 23.2)
    rev_cym(FX, CY, room, 23.8, 0.5, 0.6)

    # ---------------------------------------------------------- F. 23,8–28,55 s : le meilleur choix
    hit(23.8, 0.85)
    add(FX, swish(0.4, 0.2, 700, 4000), 23.85)
    add(FX, pop(84, 0.25), 24.15)
    d = 0.95
    tb = tv(d)
    ring = sine(midi(69) * 2 ** (tb / d), d) * 0.5 + lp(saw(midi(69) * 2 ** (tb / d) * 1.5, d), 2500) * 0.1
    add(FX, stereo(ring * env_asr(d, 0.05, 0.1)) * 0.07, 24.5)
    add(FX, UI['glass/success'] * 0.26, 25.4)
    add(FX, UI['soft/toggle-on'] * 0.28, 25.3)
    for k in range(4):
        add(FX, pop((81, 79, 79, 76)[k], 0.2), 26.37 + k * 0.07, pan=(k - 1.5) * 0.3)
    add(FX, pop(76, 0.3, 0.22), 27.35)
    add(FX, swish(0.4, 0.14, 800, 4000, 0.7, 0.1), 27.45)
    add(FX, UI['minimal/press'] * 0.5, 27.86)
    add(FX, whoosh(0.62, 0.5, up=True, f0=200, f1=8000, pan0=0, pan1=0, tone=False), 27.95)
    rev_cym(FX, CY, room, 28.55, 0.6, 0.8)

    # ---------------------------------------------------------- G. 28,55–33,6 s : le temps gagné
    add(IMP, sub_drop(2.0, 70, 32, 0.55), 28.55)
    for m in CH['Fmaj7'][0]:
        add(PN, piano.note(m, 0.32, 2.4, 1.0), 28.55)
        add(MU, strings.note(m, 2.4, 0.5, attack=0.4, gain=1.0), 28.55)
    add(FX, pop(76, 0.3), 28.75)
    add(FX, pop(79, 0.3), 28.85)
    m_g = lambda tt: 30 * EZ_IO(prog(tt, 29.1, 30.7))  # noqa: E731
    for tt in steps(m_g, 29.1, 30.7, 1):
        add(FX, tick(2600 + rng.uniform(-150, 150), 0.13, 0.012), tt, pan=-0.45)
    add(FX, tick(2600, 0.15, 0.012), 29.1, pan=0.45)
    add(FX, UI['glass/success'] * 0.32, 29.36, pan=0.45)
    add(FX, projector(1.3, 0.12), 29.45)
    add(FX, thump(0.4), 30.65)
    hit(31.0, 0.75)
    for m in CH['C'][0]:
        add(PN, piano.note(m + 12, 0.36, 1.6, 1.2), 31.0)
        add(MU, strings.note(m, 1.8, 0.8, attack=0.25, gain=1.4), 31.0)
    add(PN, piano.note(36, 0.36, 1.8, 1.2), 31.0)
    add(FX, riser(0.8, 0.35, 300, 8000), 32.8)
    add(FX, whoosh(0.55, 0.32, up=True, f0=200, f1=6000, pan0=-0.3, pan1=0.3, tone=False), 33.0)
    rev_cym(FX, CY, room, 33.6, 0.5, 0.7)

    # ---------------------------------------------------------- H. 33,6–36,9 s : Duo, gratuit, sans inscription
    hit(33.6, 0.9)
    add(FX, pop(72, 0.3), 33.75, pan=-0.4)
    add(FX, pop(76, 0.3), 33.76, pan=0.4)
    add(FX, thump(0.35), 33.75)
    add(FX, pop(79, 0.3, 0.22), 34.3)
    add(FX, glass_tink(0.08), 34.35)
    add(FX, whoosh(0.4, 0.3, up=False, f0=200, f1=5000, pan0=0, pan1=0, tone=False), 34.85)
    hit(35.38, 1.0)
    add(MU, stab('C', 0.45, 0.45), 35.38)
    add(FX, UI['mechanical/snap'] * 0.4, 35.75)
    add(FX, swish(0.3, 0.2, 1200, 7000), 35.75)
    add(FX, whoosh(0.5, 0.4, up=True, f0=300, f1=7000, pan0=-0.6, pan1=0.6, tone=False), 36.42)
    rev_cym(FX, CY, room, 36.95, 0.5, 0.7)

    # ---------------------------------------------------------- I. 36,9–41 s : la signature
    hit(36.95, 0.9)
    for m in CH['Cadd9'][0]:
        add(PN, piano.note(m, 0.42, 2.8, 1.4), 36.95)
        add(MU, strings.note(m, 3.2, 1.0, attack=0.3, gain=1.5), 36.95)
    add(PN, piano.note(36, 0.4, 3.0, 1.4), 36.95)
    for i, m in enumerate((60, 64, 67, 72, 76, 79, 84, 88)):
        add(PN, pluck(m + 12, 0.18, 0.06), 37.0 + i * 0.045, pan=(i - 3.5) * 0.12)
    add(FX, swish(0.3, 0.16, 1200, 7000), 37.5)
    add(FX, swish(0.35, 0.16, 700, 4000, -0.3, 0.3), 37.95)
    for i in range(12):
        add(FX, S.repitch(UI['mechanical/typing'], rng.uniform(-1.2, 1.2)) * 0.3, 38.15 + i * 0.6 / 12)
    add(FX, UI['minimal/check'] * 0.32, 38.82)
    for j, mm in enumerate((72, 76, 79, 84)):
        add(PN, piano.note(mm, 0.38, 0.3 if j < 3 else 1.6, 1.2), 38.85 + j * 0.25)

    # ---------------------------------------------------------- groove (grille fixe de 0,5 s)
    def drums(a, b, opens=True, claps=True, hats=True, kick_on=True):
        for i in range(int(round((b - a) / BEAT))):
            tt = a + i * BEAT
            if kick_on:
                kick(tt)
            if claps and int(round(tt / BEAT)) % 2 == 1:
                add(DR, CP * 0.85, tt)
                add(DR, SD * 0.4, tt)
        if hats:
            for i in range(int(round((b - a) / 0.125))):
                tt = a + i * 0.125
                add(DR, CHH * 0.26 * (0.9, 0.35, 0.6, 0.35)[i % 4], tt, pan=0.3)
                if opens and i % 4 == 2:
                    add(DR, OHH * 0.22, tt, pan=-0.3)

    drums(9.0, 12.5, opens=False)
    drums(13.0, 18.5)
    drums(19.5, 23.0)
    drums(24.0, 28.0)
    drums(31.0, 33.0, kick_on=False, claps=False, opens=False)
    drums(34.0, 36.5)
    for a, b, g in ((9.0, 12.5, 0.6), (13.0, 18.5, 0.75), (19.5, 23.0, 0.75), (24.0, 28.0, 0.72), (34.0, 36.5, 0.75)):
        for i in range(int(round((b - a) / 0.25))):
            tt = a + i * 0.25
            root = CH[chord_at(tt)][1]
            add(BS, analog_bass(root + 12 + (12 if i % 4 == 3 else 0), 0.22, g * (0.85 if i % 2 == 0 else 0.6), cutoff=600, env_amt=1800, sub=0.22), tt)
    for a, b, g in ((13.0, 18.5, 0.16), (19.5, 23.0, 0.18), (24.0, 28.0, 0.18), (34.0, 36.5, 0.2)):
        for i in range(int(round((b - a) / BEAT))):
            add(MU, stab(chord_at(a + i * BEAT + 0.25), 0.2, g * 1.3), a + i * BEAT + 0.25)
    arp = [0, 2, 1, 3, 2, 1, 3, 2]
    for a, b in ((9.0, 12.4), (13.0, 18.4), (19.5, 22.9), (24.0, 27.9)):
        for i in range(int(round((b - a) / 0.25))):
            tt = a + i * 0.25
            notes = CH[chord_at(tt)][0]
            add(PN, pluck(notes[arp[i % 8] % len(notes)] + 12, 0.22, 0.08), tt)

    # ---------------------------------------------------------- mixage
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
    if STEMS:
        for name, B in list(stems.items()) + [('wet', wet)]:
            g = G.get(name, 1.0)
            rms = [np.sqrt(np.mean((B[:, idx(a):idx(a + 4)] * g) ** 2)) for a in range(0, 41, 4)]
            print(f'{name:8s} ' + ' '.join(f'{20 * np.log10(r + 1e-9):6.1f}' for r in rms))
    mix = hp(mix, 32, 2)
    mix = peak(mix, 48, -3.0, 0.8)
    mix = peak(mix, 2800, 2.0, 0.7)
    mix = compress(mix, -16, 2.0, 0.008, 0.12)
    mix = soft(mix * 0.95, 1.05)
    t = np.arange(N) / SR
    mix *= np.clip((40.95 - t) / 0.6, 0, 1) ** 1.5 * np.clip(t / 0.05, 0, 1)
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
