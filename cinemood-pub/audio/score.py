#!/usr/bin/env python3
"""Bande-son du film CinéMood : 30 s, 120 BPM, la mineur.
Instruments échantillonnés (piano à queue, cordes, chœur, taiko, timbales, TR-808)
et bruitages conçus en couches, calés sur le montage de src/edit.js.

usage : python3 score.py neon.json sortie.wav [--stems]
"""
import json
import sys

import numpy as np
from scipy.io import wavfile

import samples as S
from dsp import *  # noqa: F401,F403

FPS = 60
STEMS = '--stems' in sys.argv

# ---------------------------------------------------------------- harmonie
CH = {
    'Am': ([45, 57, 60, 64], 33), 'F': ([41, 53, 57, 60], 29), 'C': ([48, 55, 60, 64], 36),
    'G': ([43, 55, 59, 62], 31), 'E': ([40, 52, 56, 59], 28), 'Am9': ([45, 57, 60, 64, 71], 33),
}
PROG = [(6, 'Am'), (8, 'F'), (10, 'C'), (12, 'G'), (14, 'Am'), (16, 'F'), (17, 'E'), (18, 'Am'), (20, 'F'),
        (22, 'C'), (24, 'G'), (25, 'E'), (26, None)]


def chord_at(t):
    c = None
    for t0, name in PROG:
        if t >= t0:
            c = name
    return c


def build(neon_path, out_path):
    neon = json.load(open(neon_path))
    piano = S.Piano()
    strings, trem, choir = S.GM('string_ensemble_1'), S.GM('tremolo_strings'), S.GM('pad_4_choir')
    taiko, timp, cbass = S.GM('taiko_drum'), S.GM('timpani'), S.GM('contrabass')
    BD, BDL, SD, CP = S.k808('BD/BD2550'), S.k808('BD/BD5075'), S.k808('SD/SD5050'), S.k808('CP/CP')
    CHH, OHH, CY = S.k808('CH/CH'), S.k808('OH/OH25'), S.k808('CY/CY5050')
    RS, CL = S.k808('RS/RS'), S.k808('CL/CL')
    TOMS = [S.k808('HT/HT50'), S.k808('MT/MT50'), S.k808('LT/LT50')]
    SUB808 = S.bd808_tuned()  # accordé en sol 1 (MIDI 31)

    DR, BS, MU, PN, FX, IMP, AMB, RV = (bus() for _ in range(8))
    KICKS = []
    hall = make_hall((3.2, 2.4, 1.3), 0.024, seed=5)
    plate = make_hall((2.0, 1.6, 1.0), 0.012, seed=11, width=0.9)
    room = make_hall((0.7, 0.55, 0.35), 0.006, seed=17)

    def kick(t, g=1.0, long=False):
        add(DR, (BDL if long else BD) * 1.0, t, g)
        add(DR, tick(2200, 0.25, 0.012), t, g)  # attaque, pour les petits haut-parleurs
        KICKS.append(t)

    def rev_cym(t_end, d=1.2, g=1.0):
        nzc = stereo(hp(noise(CY.shape[1] / SR), 5000) * env_exp(CY.shape[1] / SR, 0.35)) * 0.2
        c = reverb_tail(CY * 0.8 + nzc[:, :CY.shape[1]], room, 1.5)
        r = reverse(cut(c, d + 0.3))
        r = r[:, -int(d * SR):]
        e = np.linspace(0, 1, r.shape[1]) ** 2
        add(RV, r * e, t_end - d, g)

    def impact(t, g=1.0, size=1.0):
        add(IMP, taiko.note(33, 2.5, 1.5, gain=9.0), t, g * size)
        add(IMP, timp.note(33, 2.5, 1.5, gain=7.0), t, g * 0.8)
        add(IMP, S.repitch(BDL, -5) * 1.2, t, g)
        add(IMP, sub_drop(2.8, 80, 27, 0.9), t, g * size)
        add(IMP, crack(0.5), t, g)
        add(IMP, metal(210, 1.8, 0.05), t, g)
        add(DR, CY * 0.9, t, g * 0.55 * size)
        add(DR, stereo(hp(noise(2.2), 3500) * env_exp(2.2, 0.7)) * 0.12, t, g * size)

    # ---------------------------------------------------------- 0–2 s : pluie et néon
    lvn = np.asarray(neon)
    h = hum(neon, FPS, 0.07)
    AMB += stereo(h)
    for f in range(1, len(lvn)):
        jump = lvn[f] - lvn[f - 1]
        if abs(jump) > 0.12:
            add(AMB, lp(crackle(0.05, 1100, 0.3 * min(1, abs(jump) * 2)), 7000), f / FPS, pan=rng.uniform(-0.4, 0.4))
        if jump > 0.25:
            add(AMB, glass_tink(0.05), f / FPS, pan=rng.uniform(-0.3, 0.3))
    for tt in (0.16, 0.3, 0.42, 0.58, 0.74, 0.86):
        add(AMB, relay(0.13), tt, pan=-0.5 + tt)
    add(AMB, cut(rain_bed(2.0, 0.22), 2.0, 0.005), 0.0)
    add(MU, cbass.note(33, 1.2, 0.2, attack=0.8, gain=5.0), 0.8, 0.5)
    add(IMP, sub_drop(1.2, 45, 35, 0.25), 0.8)
    add(FX, relay(0.7), 2.0)  # l'enseigne s'éteint d'un coup

    # ---------------------------------------------------------- 2–6 s : le scroll et le chrono
    t = 2.35
    k = 0
    while t < 5.1:
        u = (t - 2.35) / 2.75
        src = CL if k % 2 == 0 else RS
        add(FX, S.repitch(cut(src, 0.05), 7 if k % 2 == 0 else 4) * (0.25 + 0.25 * u), t, pan=0.3 if k % 2 else -0.3)
        t += 1.0 / (3.5 + 38 * u ** 1.6)
        k += 1
    d = 3.45
    flow = sweep(pink(d), 250, 2400, 'band', q=0.8, curve=0.8) * (0.2 + 0.8 * (tv(d) / d) ** 1.5)
    flow *= np.clip((d - tv(d)) / 0.04, 0, 1)
    add(FX, np.vstack([flow, np.roll(flow, 1100)]) * 0.5, 2.0)
    for i in range(int(3.45 / 0.125)):
        tt = 2.0 + i * 0.125
        u = (tt - 2.0) / 3.45
        add(BS, analog_bass(33, 0.12, 0.3 + 0.3 * u, cutoff=250 + 1100 * u ** 2, env_amt=800), tt)
    add(MU, trem.note(45, 2.5, 0.2, attack=1.8, gain=4.0), 3.0)
    add(MU, trem.note(52, 2.5, 0.2, attack=1.8, gain=3.0), 3.0)
    add(MU, trem.note(57, 2.5, 0.2, attack=2.0, gain=2.5), 3.0)
    # « 30 MINUTES » se verrouille
    add(IMP, taiko.note(40, 1.2, 0.8, gain=6.0), 5.1)
    add(DR, RS * 0.8, 5.1)
    add(IMP, metal(520, 1.0, 0.04), 5.1)
    # arrêt net du défilement
    add(FX, relay(0.5), 5.45)
    # plongée dans le 0
    rev_cym(6.0, 0.55, 0.9)
    add(FX, suck(0.42, 0.6), 5.58)

    # ---------------------------------------------------------- 6–8 s : « On part de ton moment »
    impact(6.0, 1.0, 1.0)
    for m in CH['Am'][0]:
        add(MU, strings.note(m, 2.2, 0.8, attack=0.35, gain=3.2), 6.0)
    for m in (69, 72, 76):
        add(MU, choir.note(m, 2.0, 0.8, attack=0.6, gain=2.2), 6.1)
    add(PN, piano.note(45, 0.32, 1.5, 1.2), 6.5)
    for j, (m, dd) in enumerate([(69, 0.25), (72, 0.25), (76, 0.25), (74, 0.9)]):
        add(PN, piano.note(m, 0.34, dd, 1.0), 6.55 + j * 0.25)
    add(AMB, projector(1.75, 0.9), 6.0)
    # panoramique vertical vers l'écran
    add(FX, whoosh(0.7, 0.55, up=False, f0=500, f1=6000, pan0=0.0, pan1=0.0), 7.65)
    add(FX, S.ui('cinematic', 'open') * 0.35, 8.22)

    # ---------------------------------------------------------- 8–10 s : la question
    for m in CH['F'][0]:
        add(MU, strings.note(m, 2.0, 0.6, attack=0.25, gain=2.4), 8.0)
    add(PN, piano.note(41, 0.3, 1.8, 1.0), 8.3)
    for m in (57, 60, 65):
        add(PN, piano.note(m, 0.26, 1.6, 1.0), 8.3)
    for i in range(8):
        add(FX, S.ui('minimal', 'hover') * 0.12, 8.9 + i * 0.045, pan=-0.5 + i / 7)
    # plongée vers la carte « Rire »
    add(FX, whoosh(0.4, 0.6, up=True, f0=400, f1=8000, pan0=0, pan1=0), 9.65)
    rev_cym(10.0, 0.35, 0.6)

    # ---------------------------------------------------------- groove 8 → 26 s
    for i in range(int((26 - 8) / 0.5)):
        tt = 8 + i * 0.5
        if 17.0 <= tt < 18.0:
            continue
        beat = i % 4
        if tt < 10:
            if beat in (0, 2):
                kick(tt, 0.75)
            else:
                add(DR, RS * 0.35, tt)
            continue
        kick(tt, 1.0, long=tt >= 18)
        if beat in (1, 3):
            add(DR, CP * 0.85, tt)
            if tt >= 18:
                add(DR, SD * 0.5, tt)
    for i in range(int((26 - 8) / 0.125)):
        tt = 8 + i * 0.125
        if 17.0 <= tt < 18.0:
            continue
        if tt < 10 and i % 2:
            continue
        acc = (1.0, 0.45, 0.7, 0.45)[i % 4]
        add(DR, CHH * 0.3 * acc, tt, pan=0.25)
        if i % 4 == 2 and tt >= 10:
            add(DR, OHH * 0.32, tt, pan=-0.25)
    for tt in (10.0, 14.0, 18.0, 20.0, 22.0, 24.0):
        add(DR, CY * 0.7, tt, 0.8 if tt != 18 else 1.0)
    # basse : croches qui suivent les accords
    for i in range(int((26 - 8) / 0.25)):
        tt = 8 + i * 0.25
        if 17.0 <= tt < 18.0:
            continue
        if tt < 10 and i % 2:
            continue
        name = chord_at(tt)
        if not name:
            continue
        root = CH[name][1]
        m = root + (12 if (i % 4 == 3 and tt >= 10) else 0)
        add(BS, analog_bass(m, 0.22, 0.75 if i % 2 == 0 else 0.55, cutoff=600 if tt < 18 else 900), tt)
    # basse 808 tenue pendant la chute et les arguments
    for t0, name in [(18, 'Am'), (19, 'Am'), (20, 'F'), (21, 'F'), (22, 'C'), (23, 'C'), (24, 'G'), (25, 'E')]:
        add(BS, cut(S.repitch(SUB808, CH[name][1] - 31), 0.95, 0.08) * 0.9, t0)
        add(BS, cut(S.repitch(SUB808, CH[name][1] - 31), 0.45, 0.06) * 0.6, t0 + 0.75)
    # nappes
    for t0, name, dd, g in [(10, 'C', 2.0, 1.4), (12, 'G', 2.0, 1.4), (14, 'Am', 2.0, 1.8), (16, 'F', 1.0, 1.8),
                            (18, 'Am', 2.0, 2.6), (20, 'F', 2.0, 2.6), (22, 'C', 2.0, 2.4), (24, 'G', 1.0, 2.4), (25, 'E', 1.0, 2.4)]:
        for m in CH[name][0]:
            add(MU, strings.note(m, dd, 0.35, attack=0.06, gain=g), t0)
    for t0, name in [(18, 'Am'), (20, 'F'), (22, 'C'), (24, 'G')]:
        for m in CH[name][0][1:]:
            add(MU, choir.note(m + 12, 2.0, 0.4, attack=0.2, gain=1.5), t0)

    # ---------------------------------------------------------- 10–14 s : la pellicule des humeurs
    add(AMB, projector(3.75, 0.45, spin=0.1), 10.0)
    for k in range(8):
        tt = 10.0 + k * 0.5
        # la griffe tire l'image : claquement sec + petit coup sourd
        add(FX, stereo(bp(noise(0.05), 900, 5000) * env_exp(0.05, 0.006, 0.0003)) * 0.55, tt, pan=-0.2)
        add(FX, sine(np.linspace(180, 90, int(0.06 * SR)), 0.06) * env_exp(0.06, 0.015) * 0.35, tt)
    T = 10.0
    for j, m in enumerate((72, 76, 79, 84)):                                   # rire
        add(PN, piano.note(m, 0.62, 0.12, 0.25), T + j * 0.055)
    add(DR, S.repitch(BDL, -6) * 0.8, T + 0.5); add(DR, S.repitch(BDL, -6) * 0.55, T + 0.67)  # peur : cœur
    add(MU, trem.note(57, 0.45, 0.2, attack=0.15, gain=3.0), T + 0.5)
    add(MU, trem.note(58, 0.45, 0.2, attack=0.15, gain=3.0), T + 0.5)
    for m in (65, 69, 72):                                                      # émotion
        add(PN, piano.note(m, 0.38, 0.45, 0.9), T + 1.0)
    add(MU, strings.note(69, 0.5, 0.6, attack=0.2, gain=2.0), T + 1.0)
    add(IMP, taiko.note(45, 0.8, 0.6, gain=6.0), T + 1.5)                        # adrénaline
    add(DR, TOMS[0] * 0.6, T + 1.5); add(DR, TOMS[1] * 0.6, T + 1.56)
    add(PN, piano.note(33, 0.55, 0.45, 1.2), T + 2.0)                            # réfléchir
    add(PN, piano.note(88, 0.3, 0.4, 1.0), T + 2.06)
    rev_cym(T + 2.5, 0.3, 0.6)                                                    # surprise
    add(PN, piano.note(91, 0.32, 0.3, 0.8), T + 3.0)                             # décrocher
    add(MU, choir.note(67, 0.5, 0.5, attack=0.15, gain=1.8), T + 3.0)
    add(FX, whoosh(0.5, 0.5, up=True, f0=1000, f1=12000), T + 3.45)                # s'évader
    for j, m in enumerate((83, 86, 91, 95)):
        add(PN, piano.note(m, 0.3, 0.2, 1.0), T + 3.5 + j * 0.06)
    add(MU, choir.note(71, 0.5, 0.6, attack=0.1, gain=1.8), T + 3.5)
    # la carte 06 est choisie
    add(FX, whoosh(0.35, 0.4, up=False, f0=500, f1=7000), 13.66)
    add(FX, S.ui('mechanical', 'press') * 0.3, 13.97)

    # ---------------------------------------------------------- 14–17 s : le parcours accéléré
    scale = [69, 72, 74, 76, 79, 81, 84, 86, 88, 91, 93]
    sel_times = [14 + q * 0.5 + 0.3 for q in range(5)] + [16.5 + q * (0.5 / 6) + 0.035 for q in range(6)]
    for j, tt in enumerate(sel_times):
        add(FX, S.ui('mechanical', 'press') * 0.22, tt)
        add(PN, piano.note(scale[j], 0.45 + 0.03 * j, 0.15, 0.4), tt)
    for q in range(5):
        add(FX, S.ui('studio', 'swipe') * 0.3, 14 + q * 0.5 - 0.02, pan=0.3)
        add(FX, whoosh(0.22, 0.25, up=True, f0=800, f1=9000, pan0=0.6, pan1=-0.6, tone=False), 14 + q * 0.5 - 0.04)
    add(FX, whoosh(0.5, 0.35, up=True, f0=1200, f1=10000, pan0=0.5, pan1=-0.5, tone=False), 16.45)
    add(FX, suck(0.25, 0.5), 16.78)

    # ---------------------------------------------------------- 17–18 s : le catalogue filtré
    for j, tt in enumerate([17.0, 17.25, 17.5, 17.75]):
        add(FX, S.ui('studio', 'progress-step') * 0.25, tt)
        add(PN, piano.note((88, 86, 83, 80)[j], 0.3, 0.1, 0.3), tt)  # mi7 descendant
    d = 0.85
    gr = np.zeros(int(d * SR))
    dens = np.linspace(1500, 30, len(gr))
    kk = rng.random(len(gr)) < dens / SR
    gr[kk] = rng.standard_normal(kk.sum())
    add(FX, stereo(hp(gr, 5000)) * 0.18, 17.0)
    tt = 17.0
    while tt < 17.86:
        u = (tt - 17.0) / 0.86
        add(DR, SD * (0.15 + 0.5 * u), tt)
        tt += 0.125 * (1 - u) + 0.028
    add(FX, riser(1.0, 0.45), 16.875)
    for m in CH['E'][0]:
        add(MU, trem.note(m, 0.9, 0.05, attack=0.7, gain=3.0), 17.0)
    rev_cym(18.0, 0.9, 1.0)

    # ---------------------------------------------------------- 18–22 s : les résultats
    impact(18.0, 1.15, 1.25)
    for j, (m, dd) in enumerate([(81, 0.25), (84, 0.25), (88, 0.25), (86, 0.8)]):
        add(PN, piano.note(m, 0.5, dd, 0.9), 19.0 + j * 0.25)
    for j, (m, dd) in enumerate([(81, 0.25), (84, 0.25), (89, 0.25), (88, 0.8)]):
        add(PN, piano.note(m, 0.48, dd, 0.9), 21.0 + j * 0.25)
    prev = 0
    for f in range(int(18.35 * FPS), int(19.6 * FPS)):
        lt = f / FPS - 18.0
        p = min(1, max(0, (lt - 0.35) / 1.15))
        v = round(94 * (1 - (1 - p) ** 3))
        for _ in range(v - prev):
            add(FX, tick(4600, 0.05, 0.01), f / FPS + rng.uniform(0, 1 / FPS))
        prev = v
    add(PN, piano.note(93, 0.4, 0.3, 1.0), 19.5)
    for j in range(4):
        add(FX, S.ui('minimal', 'hover') * 0.12, 19.05 + j * 0.07)
    add(FX, whoosh(0.9, 0.45, up=True, f0=300, f1=5000, pan0=-0.4, pan1=0.6), 20.4)
    rev_cym(22.0, 0.45, 0.8)
    add(FX, suck(0.2, 0.5), 21.8)

    # ---------------------------------------------------------- 22–26 s : les arguments
    for tt, g in ((22.0, 0.75), (23.0, 0.55), (24.0, 0.95), (25.3, 0.7)):
        add(IMP, taiko.note(40, 1.0, 0.8, gain=6.0), tt, g)
        add(IMP, sub_drop(1.2, 90, 40, 0.5), tt, g)
    for m in (67, 71, 74):
        add(MU, choir.note(m, 0.5, 0.6, attack=0.02, gain=2.2), 24.0)
    prev = 1
    for f in range(int(22.0 * FPS), int(22.55 * FPS)):
        p = min(1, max(0, (f / FPS - 22.02) / 0.48))
        v = int(1 + 11 * (1 - (1 - p) ** 3))
        if v > prev:
            add(FX, S.repitch(cut(CL, 0.04), 5 + v * 0.5) * 0.3, f / FPS)
            prev = v
    add(FX, whoosh(0.35, 0.4, up=True, f0=600, f1=8000, pan0=-0.9, pan1=0.2, tone=False), 22.98)
    add(FX, whoosh(0.35, 0.4, up=True, f0=600, f1=8000, pan0=0.9, pan1=-0.2, tone=False), 23.06)
    d = 0.2
    add(FX, sweep(noise(d), 1500, 9000, 'band', q=2.0) * env_ad(d, 0.02, 0.18) * 0.4, 25.12)   # le trait barre
    add(FX, whoosh(0.3, 0.3, up=False, f0=300, f1=3000, tone=False), 25.34)
    for j, tom in enumerate([0, 0, 1, 1, 2, 2, 2]):
        add(DR, TOMS[tom] * 0.55, 25.5 + j * 0.0625 + 0.0625)
    rev_cym(26.0, 0.5, 0.7)

    # ---------------------------------------------------------- 26–30 s : CINÉMOOD
    add(IMP, sub_drop(2.0, 60, 25, 0.8), 26.0)
    add(AMB, relay(1.0), 26.0)
    add(AMB, rain_bed(4.0, 0.26) * np.clip((30 - (26 + tv(4.0))) / 0.6, 0, 1), 26.0)
    for tt in (26.05, 26.11, 26.17, 26.25, 26.31, 26.37):
        add(AMB, relay(0.3), tt, pan=(tt - 26.2) * 3)
    d = 0.5
    zap = crackle(d, 3000, 1.0) * env_exp(d, 0.16)
    zap += sweep(saw(np.linspace(1700, 110, int(d * SR)), d), 6000, 700, 'low') * env_exp(d, 0.12) * 0.25
    add(AMB, zap, 26.72, 0.55, pan=0.25)
    for tt in (27.05, 27.17, 27.29):
        add(AMB, relay(0.4), tt, pan=0.3)
        add(AMB, glass_tink(0.06), tt + 0.01, pan=0.3)
    add(AMB, riser(0.45, 0.25, 800, 9000), 27.05)
    # l'accord final et la signature au piano, qui se résout enfin sur le la
    impact(27.5, 0.55, 0.7)
    notes, root = CH['Am9']
    for m in notes:
        add(MU, strings.note(m, 2.4, 1.4, attack=0.05, gain=2.8), 27.5)
    for m in (69, 72, 76, 81):
        add(MU, choir.note(m, 2.3, 1.4, attack=0.3, gain=1.8), 27.55)
    add(BS, cut(S.repitch(SUB808, 33 - 31), 2.4, 0.6) * 0.8, 27.5)
    add(PN, piano.note(45, 0.5, 2.2, 1.5), 27.5)
    add(PN, piano.note(57, 0.42, 2.2, 1.5), 27.5)
    for j, (m, dd) in enumerate([(69, 0.22), (72, 0.22), (76, 0.22), (81, 1.6)]):
        add(PN, piano.note(m, 0.5, dd, 1.6), 27.6 + j * 0.2)
    add(PN, piano.note(93, 0.25, 0.5, 1.5), 28.18)

    # ---------------------------------------------------------- traitements et mixage
    # ralentissement de bande quand le défilement s'arrête
    tape_stop(BS, 5.45, 0.15)
    tape_stop(MU, 5.45, 0.15)
    BS[:, idx(5.6):idx(6.0)] = 0
    MU[:, idx(5.6):idx(6.0)] = 0
    # « être surpris » : bégaiement de la batterie
    a, L = idx(12.5), int(0.0625 * SR)
    seg = DR[:, a:a + L].copy()
    for r in range(1, 4):
        DR[:, a + r * L:a + (r + 1) * L] = seg * (1 - 0.2 * r)
    # « décrocher » : la batterie passe sous l'eau
    a, b = idx(13.0), idx(13.5)
    DR[:, a:b] = lp(DR[:, a:b], 900) * 1.2
    # silence avant la chute (17,875 → 18) et arrêt net à 26 s
    for B in (DR, BS, MU, PN, FX):
        for (s0, s1) in ((17.875, 18.0), (26.0, 27.48)):
            i0, i1 = idx(s0), idx(s1)
            r = int(0.004 * SR)
            B[:, i0 - r:i0] *= np.linspace(1, 0, r)
            B[:, i0:i1] = 0
    # compression latérale : le kick creuse la basse et les nappes
    duck = duck_env(KICKS, 0.3, 0.6, 0.085)
    BS *= duck
    MU *= 1 - 0.3 * (1 - duck)
    # égalisation par famille
    MU = hp(MU, 140)
    MU = peak(MU, 3200, 2.0, 0.8)
    PN = hp(PN, 70)
    PN = lp(PN, 7500)
    FX = hp(FX, 120)
    DR = soft(DR * 1.05, 1.2)
    # réverbérations
    wet = reverb(MU * 0.32 + IMP * 0.28 + FX * 0.18 + RV * 0.15, hall) * 0.42
    wet += reverb(PN * 0.4, plate) * 1.1
    wet += reverb(DR * 0.12, room) * 0.3
    G = {'drums': 0.66, 'bass': 0.62, 'music': 1.0, 'piano': 2.3, 'fx': 0.9, 'impacts': 0.42, 'amb': 1.0, 'rev': 0.7}
    stems = {'drums': DR, 'bass': BS, 'music': MU, 'piano': PN, 'fx': FX, 'impacts': IMP, 'amb': AMB, 'rev': RV}
    mix = sum(stems[k] * G[k] for k in stems) + wet
    if STEMS:
        for name, B in list(stems.items()) + [('wet', wet)]:
            g = G.get(name, 1.0)
            rms = [np.sqrt(np.mean((B[:, idx(a):idx(a + 2)] * g) ** 2)) for a in range(0, 30, 2)]
            print(f'{name:8s} ' + ' '.join(f'{20 * np.log10(r + 1e-9):6.1f}' for r in rms))
    mix = hp(mix, 25, 2)
    mix = compress(mix, -16, 2.0, 0.01, 0.15)
    mix = soft(mix * 0.95, 1.05)
    t = np.arange(N) / SR
    mix *= np.clip((30.0 - t) / 0.65, 0, 1) ** 1.5 * np.clip(t / 0.05, 0, 1)
    import pyloudnorm as pyln
    meter = pyln.Meter(SR)
    for _ in range(2):
        mix *= 10 ** ((-14.0 - meter.integrated_loudness(mix.T)) / 20)
        mix = limiter(mix, 10 ** (-1.5 / 20))
    print(f'intensité : {meter.integrated_loudness(mix.T):.1f} LUFS, crête {20 * np.log10(np.max(np.abs(mix))):.1f} dBFS')
    wavfile.write(out_path, SR, (np.clip(mix.T, -1, 1) * 32767).astype(np.int16))
    print(f'écrit {out_path}')


if __name__ == '__main__':
    build(sys.argv[1], sys.argv[2])
