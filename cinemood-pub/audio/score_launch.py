#!/usr/bin/env python3
"""Bande-son du film « nouvelle version » (src/launch.js) : 23,5 s, 120 BPM, grille calée sur le
retournement du téléphone (2,3 s). Avant : musique étouffée, filtrée. Au retournement : tout s'ouvre.
Vue éclatée (couches qui montent, défilement des tickets, choix de Rêveur), ruban des huit écrans
(une note par écran, mêmes instants que le compteur), chargement, carte de résultat, signature.

usage : python3 score_launch.py sortie.wav
"""
import sys

import numpy as np
from scipy.io import wavfile

import dsp
import score_mograph as MG  # noqa: E402  (fixe ses propres durées : remplacées juste après)
import samples as S  # noqa: E402
import score_motion as SM  # noqa: E402
DUR = 23.5
dsp.DUR = DUR
dsp.N = int(dsp.SR * DUR)
from dsp import *  # noqa: E402,F401,F403
N = dsp.N
SM.N = MG.N = N
from score_motion import vsynth_st, pluck, kick_synth, thump, swish  # noqa: E402
from score_mograph import pop, stab, rev_cym, CH  # noqa: E402
dsp.DUR, dsp.N, SM.N, MG.N = DUR, N, N, N

BEAT = 0.5
G0 = 2.3  # premier temps fort de la grille


def bezier(x1, y1, x2, y2):
    """même courbe que bezier() de mograph.js"""
    cx, cy = 3 * x1, 3 * y1
    bx, by = 3 * (x2 - x1) - cx, 3 * (y2 - y1) - cy
    ax, ay = 1 - cx - bx, 1 - cy - by

    def f(x):
        if x <= 0:
            return 0.0
        if x >= 1:
            return 1.0
        lo, hi, t = 0.0, 1.0, x
        for _ in range(22):
            t = (lo + hi) / 2
            if ((ax * t + bx) * t + cx) * t < x:
                lo = t
            else:
                hi = t
        return ((ay * t + by) * t + cy) * t
    return f


EZ_INOUT = bezier(0.76, 0, 0.24, 1)


def inv(f, v):
    lo, hi = 0.0, 1.0
    for _ in range(40):
        m = (lo + hi) / 2
        if f(m) < v:
            lo = m
        else:
            hi = m
    return (lo + hi) / 2


PROG = [(0.0, 'Am'), (G0, 'C'), (G0 + 2, 'Am'), (G0 + 4, 'F'), (G0 + 6, 'G'), (G0 + 8, 'Am'), (G0 + 10, 'F'), (G0 + 11, 'G'),
        (13.3, 'Fmaj7'), (14.3, 'Am'), (16.3, 'F'), (18.3, 'C'), (18.85, 'Cadd9')]


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
    UI = {k: S.ui(*k.split('/')) for k in ('mechanical/typing', 'minimal/press', 'minimal/check', 'mechanical/select', 'glass/success',
                                            'mechanical/snap', 'studio/swipe')}
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

    # ---------------------------------------------------------- 0–2,3 s : avant (étouffé)
    add(BS, vsynth_st(33, 2.5, gain=0.22, voices=3, det=0.08, cutoff=240, env_amt=0, atau=9, sus=1.0, rel=0.3, attack=0.5), 0.0)
    for m in (57, 64):
        add(MU, strings.note(m, 2.2, 0.3, attack=0.8, gain=0.9), 0.0)
    for i in range(4):  # un vieux rythme, comme derrière une porte
        tt = 0.3 + i * 0.5
        kick(tt, 0.8, OLD)
        if i % 2:
            add(OLD, CP * 0.6, tt)
        for j in range(4):
            add(OLD, CHH * 0.18 * (0.9, 0.35, 0.6, 0.35)[j], tt + j * 0.125)
    add(FX, thump(0.5, 100, 45), 0.3)
    add(FX, swish(0.3, 0.3, 1500, 7000, -0.4, 0.4), 1.25)  # le trait qui barre le 12
    add(FX, UI['mechanical/snap'] * 0.3, 1.52)
    add(FX, whoosh(0.7, 0.38, up=True, f0=250, f1=7000, pan0=-0.5, pan1=0.5, tone=True), 1.62)
    add(FX, UI['mechanical/snap'] * 0.35, 1.95)  # le téléphone passe la tranche
    rev_cym(FX, CY, room, G0, 0.6, 0.9)

    # ---------------------------------------------------------- 2,3 s : nouvelle version
    hit(G0, 1.1)
    for m in CH['C'][0]:
        add(PN, piano.note(m + 12, 0.38, 1.4, 1.2), G0)
        add(MU, strings.note(m, 1.8, 0.7, attack=0.15, gain=1.3), G0)
    add(PN, piano.note(36, 0.4, 1.6, 1.2), G0)
    add(FX, glass_tink(0.12), G0 + 0.05)

    # ---------------------------------------------------------- 3,6–8,6 s : vue éclatée
    add(FX, whoosh(0.9, 0.3, up=True, f0=200, f1=5000, pan0=0.4, pan1=-0.2, tone=False), 3.65)
    for k, n in enumerate((72, 76, 79, 81, 84, 86, 88)):  # chaque couche qui se soulève
        add(FX, pop(n, 0.2, 0.18), 4.55 + k * 0.07, pan=(k - 3) * 0.12)
    for tt in (5.15, 5.3, 5.45):  # les légendes
        add(FX, glass_tink(0.07), tt + 0.18)
        add(FX, swish(0.2, 0.08, 2000, 9000), tt)
    for k in range(9):  # la liste soulevée défile jusqu'à Rêveur
        v = (k + 0.5) / 8
        if v <= 1:
            add(FX, tick(2600 + k * 60, 0.13, 0.012), 5.9 + 1.0 * inv(EZ_INOUT, v), pan=0.2)
    add(FX, pop(84, 0.3, 0.24), 6.95)
    add(FX, UI['minimal/press'] * 0.55, 7.12)
    add(FX, UI['glass/success'] * 0.3, 7.2)
    add(FX, suck(0.5, 0.45), 7.8)
    add(FX, thump(0.45), 8.33)

    # ---------------------------------------------------------- 8,6–13,6 s : le ruban des huit écrans
    for k in range(7):
        add(FX, swish(0.3, 0.08, 800, 5000, 0.0, 0.6), 8.65 + k * 0.07)
    add(FX, whoosh(1.6, 0.22, up=True, f0=300, f1=4000, pan0=-0.6, pan1=0.6, tone=False), 9.6)
    notes8 = [69, 72, 74, 76, 79, 81, 84, 88]
    add(FX, pop(notes8[0], 0.28), 9.0)
    for k in range(7):  # le compteur passe 02, 03… 08 : mêmes instants que la caméra
        tt = 9.2 + 3.3 * inv(EZ_INOUT, (k + 0.5) / 7)
        add(FX, pop(notes8[k + 1], 0.28), tt, pan=(k - 3) * 0.1)
        add(FX, UI['mechanical/select'] * 0.16, tt)
    add(FX, whoosh(0.8, 0.3, up=False, f0=200, f1=5000, pan0=0.5, pan1=0, tone=False), 12.6)

    # ---------------------------------------------------------- 13,6–18,3 s : chargement, carte n°1, les quatre autres
    for m in CH['Fmaj7'][0]:
        add(PN, piano.note(m, 0.3, 1.0, 0.9), 13.3)
    t = tv(0.7)
    spin = sine(880 + 120 * np.sin(2 * np.pi * 7 * t), 0.7) * 0.05 * env_asr(0.7, 0.1, 0.1)
    add(FX, stereo(spin), 13.6)
    add(FX, riser(0.7, 0.3, 400, 8000), 13.6)
    hit(14.3, 0.9)
    add(FX, whoosh(0.9, 0.35, up=True, f0=250, f1=6000, pan0=0, pan1=0.3, tone=False), 14.45)
    d = 0.75
    tb = tv(d)
    bars = sine(midi(69) * 2 ** (tb / d), d) * 0.5 + lp(saw(midi(69) * 2 ** (tb / d) * 1.5, d), 2500) * 0.1
    add(FX, stereo(bars * env_asr(d, 0.04, 0.08)) * 0.07, 15.35)
    add(FX, UI['glass/success'] * 0.26, 15.3)
    for j in range(4):
        add(FX, swish(0.25, 0.14, 900, 6000, 0.0, 0.5), 15.9 + j * 0.09)
        add(FX, pop((81, 79, 79, 76)[j], 0.18), 15.95 + j * 0.09, pan=0.2 + j * 0.1)
    add(FX, suck(0.6, 0.4), 17.5)

    # ---------------------------------------------------------- 18,3–23,5 s : l'accueil, la signature
    add(FX, whoosh(0.6, 0.3, up=False, f0=200, f1=5000, pan0=0.3, pan1=0, tone=False), 17.9)
    hit(18.85, 1.0)
    for m in CH['Cadd9'][0]:
        add(PN, piano.note(m, 0.42, 3.4, 1.3), 18.85)
        add(MU, strings.note(m, 4.2, 1.1, attack=0.3, gain=1.5), 18.85)
    add(PN, piano.note(36, 0.4, 3.6, 1.3), 18.85)
    for i, m in enumerate((60, 64, 67, 72, 76, 79, 84, 88)):
        add(PN, pluck(m + 12, 0.18, 0.06), 18.85 + i * 0.04, pan=(i - 3.5) * 0.12)
    add(FX, swish(0.25, 0.16, 1200, 7000), 19.25)
    add(FX, swish(0.3, 0.16, 700, 4000, -0.3, 0.3), 19.6)
    for i in range(12):
        add(FX, S.repitch(UI['mechanical/typing'], rng.uniform(-1.2, 1.2)) * 0.3, 19.8 + i * 0.6 / 12)
    add(FX, UI['minimal/check'] * 0.32, 20.47)
    add(FX, UI['minimal/press'] * 0.5, 21.2)
    for j, mm in enumerate((72, 76, 79, 84)):
        add(PN, piano.note(mm, 0.34, 0.25 if j < 3 else 1.6, 1.1), 21.25 + j * 0.2)

    # ---------------------------------------------------------- groove (grille à partir de 2,3 s)
    def drums(a, b, opens=True, claps=True):
        for i in range(int(round((b - a) / BEAT))):
            tt = a + i * BEAT
            kick(tt)
            if claps and i % 2 == 1:
                add(DR, CP * 0.85, tt)
                add(DR, SD * 0.4, tt)
        for i in range(int(round((b - a) / 0.125))):
            tt = a + i * 0.125
            add(DR, CHH * 0.26 * (0.9, 0.35, 0.6, 0.35)[i % 4], tt, pan=0.3)
            if opens and i % 4 == 2:
                add(DR, OHH * 0.22, tt, pan=-0.3)

    drums(G0 + 0.5, 8.3)
    drums(8.8, 13.3)
    drums(14.3, 17.3, opens=False)
    for a, b, g in ((G0 + 0.5, 8.3, 0.7), (8.8, 13.3, 0.75), (14.3, 17.3, 0.7)):
        for i in range(int(round((b - a) / 0.25))):
            tt = a + i * 0.25
            root = CH[chord_at(tt)][1]
            add(BS, analog_bass(root + 12 + (12 if i % 4 == 3 else 0), 0.22, g * (0.85 if i % 2 == 0 else 0.6), cutoff=600, env_amt=1800, sub=0.22), tt)
    for a, b in ((G0 + 0.5, 8.3), (8.8, 13.3), (14.3, 17.3)):
        for i in range(int(round((b - a) / BEAT))):
            add(MU, stab(chord_at(a + i * BEAT + 0.25), 0.2, 0.2), a + i * BEAT + 0.25)
    arp = [0, 2, 1, 3, 2, 1, 3, 2]
    for a, b in ((4.3, 8.2), (8.8, 13.2)):
        for i in range(int(round((b - a) / 0.25))):
            tt = a + i * 0.25
            notes = CH[chord_at(tt)][0]
            add(PN, pluck(notes[arp[i % 8] % len(notes)] + 12, 0.22, 0.07), tt)

    # ---------------------------------------------------------- mixage
    OLD = lp(OLD, 700, 2) * 0.9  # l'ancienne version, étouffée
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
    t = np.arange(N) / SR
    mix *= np.clip((DUR - 0.02 - t) / 0.6, 0, 1) ** 1.5 * np.clip(t / 0.2, 0, 1)
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
