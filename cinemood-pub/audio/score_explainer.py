#!/usr/bin/env python3
"""Bande-son du motion design du site (src/explainer.js) : 44 s, 120 BPM, la mineur → do majeur.
Tension sur le problème (horloge, compteur), retour en arrière, néon, puis groove électro-pop
sous les trois étapes ; respiration sur le temps gagné ; reprise pour le Duo ; accord final lumineux.
Chaque bruitage est calé sur la même seconde que l'animation qu'il accompagne.

usage : python3 score_explainer.py sortie.wav [--stems]
"""
import sys

import numpy as np
from scipy.io import wavfile

import dsp
dsp.DUR = 44.0
dsp.N = int(dsp.SR * dsp.DUR)
import samples as S  # noqa: E402
import score_motion as SM  # noqa: E402
from dsp import *  # noqa: E402,F401,F403
N = dsp.N
SM.N = N
from score_motion import vsynth_st, pluck, kick_synth, thump, swish, bloop, EZ_IO, EZ_OUT, prog, steps  # noqa: E402

STEMS = '--stems' in sys.argv
DUR = 44.0
BEAT = 0.5

CH = {'Am': ([57, 60, 64, 69], 33), 'F': ([57, 60, 65, 69], 29), 'C': ([55, 60, 64, 67], 36), 'G': ([55, 59, 62, 67], 31),
      'Fmaj7': ([53, 57, 60, 64], 29), 'Dm': ([57, 62, 65, 69], 38), 'Cadd9': ([55, 60, 62, 64, 67], 36), 'E': ([56, 59, 64, 68], 28)}
PROG = [(8.0, 'Am'), (10.0, 'F'), (12.0, 'C'), (14.0, 'G'), (16.0, 'Am'), (18.0, 'F'), (20.0, 'C'), (22.0, 'G'), (24.0, 'Am'),
        (26.0, 'F'), (28.0, 'C'), (30.0, 'G'), (30.6, 'Fmaj7'), (32.6, 'G'), (33.6, 'C'), (36.0, 'Am'), (37.0, 'F'), (38.0, 'C'),
        (39.0, 'G'), (40.2, 'Cadd9')]


def chord_at(t):
    c = 'Am'
    for t0, n in PROG:
        if t >= t0 - 1e-9:
            c = n
    return c


def stab(name, d=0.3, gain=1.0, octave=0):
    out = None
    for m in CH[name][0]:
        y = vsynth_st(m + octave, d, width=0.9, gain=gain, voices=5, det=0.16, cutoff=900, env_amt=5200, ftau=0.09, atau=0.22, sus=0.12, rel=0.06)
        out = y if out is None else out + y
    return out / np.sqrt(len(CH[name][0]))


def tear(gain=1.0):
    """papier qui se déchire : craquements serrés dans une bande de bruit qui monte"""
    d = 0.32
    t = tv(d)
    k = rng.random(len(t)) < (900 + 5000 * (t / d)) / SR
    x = np.zeros(len(t))
    x[k] = rng.standard_normal(k.sum())
    x = sweep(x, 1500, 6000, 'band', q=1.0) * 2.2 + bp(noise(d), 2500, 8000) * 0.08
    return stereo(x * env_asr(d, 0.01, 0.06)) * gain


def flick(gain=1.0):
    """carte posée : petit claquement sec"""
    d = 0.08
    return stereo(bp(noise(d), 1200, 7000) * env_exp(d, 0.008, 0.0004) + sine(np.linspace(260, 120, int(d * SR)), d) * env_exp(d, 0.02) * 0.4) * gain


def scan(gain=1.0, ok=True):
    """passage d'une porte : bip de validation, ou refus grave"""
    d = 0.14 if ok else 0.22
    f = 1760 if ok else 180
    x = sine(f, d) * env_ad(d, 0.004, d) + (sine(f * 1.5, d) * 0.3 if ok else lp(saw(f, d), 900) * 0.6)
    return stereo(x) * gain


def neon_buzz(d, gain=1.0):
    t = tv(d)
    x = (np.sin(2 * np.pi * 100 * t) * 0.5 + np.sin(2 * np.pi * 200 * t) * 0.3 + bp(saw(100, d), 1800, 6000) * 0.25)
    return stereo(x * env_asr(d, 0.02, 0.2)) * gain


def rewind(d, gain=1.0):
    """retour en arrière : bande qui rembobine, aiguë et chuintante, qui ralentit"""
    t = tv(d)
    u = t / d
    f = 2200 * (1 - 0.8 * u)
    x = lp(saw(f, d), 6000) * 0.25 + sweep(pink(d), 6000, 800, 'band', q=1.4) * 0.9
    trem = 0.6 + 0.4 * np.sin(2 * np.pi * np.cumsum(40 - 30 * u) / SR)
    return stereo(x * trem * env_asr(d, 0.03, 0.08)) * gain


def build(out_path):
    piano = S.Piano()
    BD, SD, CP = S.k808('BD/BD2550'), S.k808('SD/SD5050'), S.k808('CP/CP')
    CHH, OHH, CY = S.k808('CH/CH'), S.k808('OH/OH25'), S.k808('CY/CY5050')
    UI = {k: S.ui(*k.split('/')) for k in ('mechanical/snap', 'mechanical/lock', 'mechanical/typing', 'minimal/press', 'minimal/check',
                                            'mechanical/select', 'soft/toggle-on', 'glass/success', 'studio/swipe')}
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

    def rev_cym(t_end, d=0.6, g=1.0):
        c = reverb_tail(CY * 0.8, room, 1.0)
        r = reverse(cut(c, d + 0.3))[:, -int(d * SR):]
        add(FX, r * np.linspace(0, 1, r.shape[1]) ** 2, t_end - d, g)

    # ---------------------------------------------------------- 0–5 s : l'horloge, le compteur, le retour en arrière
    for k in range(9):
        add(FX, tick(2600 if k % 2 == 0 else 2000, 0.2, 0.016), 0.1 + k * 0.5)
    add(BS, vsynth_st(33, 4.4, gain=0.22, voices=3, det=0.08, cutoff=220, env_amt=0, atau=9, sus=1.0, rel=0.4, attack=1.5), 0.0)
    for m in (57, 64):
        add(MU, S.GM('string_ensemble_1').note(m, 3.2, 0.3, attack=2.0, gain=1.0), 0.3)
    v = lambda tt: 1800 * EZ_IO(prog(tt, 0.8, 3.2))  # noqa: E731
    for tt in steps(v, 0.8, 3.2, 60):
        add(FX, tick(3000 + rng.uniform(-200, 200), 0.16, 0.012), tt, pan=rng.uniform(-0.2, 0.2))
    add(FX, UI['mechanical/lock'] * 0.55, 3.2)
    add(FX, thump(0.7, 140, 55), 3.2)
    add(FX, rewind(0.72, 0.42), 4.28)
    add(FX, UI['minimal/check'] * 0.35, 5.0)

    # ---------------------------------------------------------- 5–8 s : la promesse, le néon
    for m in CH['Fmaj7'][0]:
        add(PN, piano.note(m, 0.38, 1.2, 1.2), 5.0)
    add(PN, piano.note(41, 0.3, 1.4, 1.2), 5.0)
    for j, m in enumerate((72, 76, 79)):
        add(PN, piano.note(m, 0.32, 0.4, 0.8), 5.45 + j * 0.25)
    add(FX, swish(0.3, 0.3, 1200, 7000), 6.15)
    for i, dt in enumerate([0.05, 0.3, 0.12, 0.42, 0.2, 0.36]):  # les lettres s'allument une à une
        add(FX, lp(crackle(0.12, 1800, 0.25), 6500), 6.9 + dt, pan=(i - 2.5) * 0.15)
        add(FX, glass_tink(0.04), 6.9 + dt + 0.05)
    add(FX, neon_buzz(1.2, 0.05), 7.3)
    add(FX, riser(1.3, 0.35, 400, 9000), 6.7)
    rev_cym(8.0, 0.6, 0.8)

    # ---------------------------------------------------------- 8–11,3 s : le site, le clic, la plongée
    hit(8.0, 0.8)
    add(FX, whoosh(0.6, 0.4, up=False, f0=300, f1=6000, pan0=0, pan1=0, tone=False), 8.0)
    add(FX, swish(0.5, 0.16, 800, 4000, 0.6, 0.0), 9.25)  # le pointeur traverse l'écran
    add(FX, UI['minimal/press'] * 0.55, 10.35)
    add(FX, whoosh(0.75, 0.55, up=True, f0=200, f1=9000, pan0=0, pan1=0), 10.55)
    rev_cym(11.3, 0.7, 0.8)

    # ---------------------------------------------------------- 11,3–18 s : étape 1
    hit(11.3, 1.0)
    for i in range(9):
        add(FX, flick(0.35), 12.0 + i * 0.07 + 0.32, pan=((i % 3) - 1) * 0.4)
    add(FX, swish(0.35, 0.25, 900, 6000), 13.05)
    add(FX, UI['minimal/press'] * 0.5, 13.35)
    add(FX, tear(0.55), 13.6)
    add(FX, whoosh(0.5, 0.35, up=True, f0=300, f1=6000, pan0=0.5, pan1=0, tone=False), 13.9)
    for tt in (14.7, 15.65, 16.65, 17.45):
        add(FX, UI['minimal/press'] * 0.45, tt)
    for tt in (14.8, 15.8, 16.8, 17.55):
        add(FX, swish(0.25, 0.22, 1500, 8000, 0.4, -0.4), tt)
    for tt in (15.05, 16.05, 17.05):
        add(FX, UI['mechanical/snap'] * 0.22, tt)  # le compteur de questions avance
    add(FX, whoosh(0.45, 0.35, up=False, f0=200, f1=5000, pan0=0, pan1=0.6, tone=False), 18.0)

    # ---------------------------------------------------------- 18–24 s : étape 2, la double vérification
    cands = [1, 0, 1, 0, 0, 2, 0, 1, 0, 0, 0, 0]
    t0s = [18.5 + i * 0.31 for i in range(len(cands))]
    a0, g1, g2, tray, sp = 790, 1100, 1420, 1690, 700
    for i, verdict in enumerate(cands):
        t0 = t0s[i]
        add(FX, flick(0.18), t0 + 0.05, pan=-0.6)
        tg1 = t0 + (g1 - a0) / sp
        add(FX, scan(0.12 if verdict != 1 else 0.2, ok=verdict != 1), tg1, pan=-0.1)
        if verdict == 1:
            add(FX, thump(0.25, 90, 40), tg1 + 0.05)
            continue
        tg2 = t0 + (g2 - a0) / sp
        add(FX, scan(0.12 if verdict == 0 else 0.2, ok=verdict == 0), tg2, pan=0.2)
        if verdict == 2:
            add(FX, thump(0.25, 90, 40), tg2 + 0.05)
            continue
        add(FX, UI['mechanical/select'] * 0.2, t0 + (tray - a0) / sp, pan=0.5)
    add(FX, UI['soft/toggle-on'] * 0.3, 22.9)

    # ---------------------------------------------------------- 24–30,6 s : étape 3, les résultats
    add(FX, whoosh(0.6, 0.35, up=True, f0=300, f1=6000, pan0=0.4, pan1=0, tone=False), 23.85)
    d = 1.05
    tb = tv(d)
    bars = sine(midi(69) * 2 ** (tb / d), d) * 0.5 + lp(saw(midi(69) * 2 ** (tb / d) * 1.5, d), 2500) * 0.1
    add(FX, stereo(bars * env_asr(d, 0.05, 0.1)) * 0.07, 24.55)
    for tt in (25.7, 26.75):
        add(FX, UI['glass/success'] * 0.22, tt)
    for k in range(4):
        add(FX, flick(0.3), 28.25 + k * 0.09 + 0.25, pan=(k - 1.5) * 0.35)

    # ---------------------------------------------------------- 30,6–36,4 s : le temps gagné
    add(FX, whoosh(0.5, 0.3, up=False, f0=200, f1=5000, pan0=0, pan1=-0.6, tone=False), 30.15)
    m = lambda tt: 30 * EZ_IO(prog(tt, 31.5, 33.7))  # noqa: E731
    for tt in steps(m, 31.5, 33.7, 1):
        add(FX, tick(2400, 0.12, 0.014), tt)
    hit(33.6, 0.8)
    add(MU, stab('C', 0.5, 0.4), 33.6)
    add(FX, swish(0.4, 0.25, 900, 6000, -0.5, 0.5), 34.1)
    add(FX, thump(0.5), 34.5)

    # ---------------------------------------------------------- 36,4–40,2 s : Duo, gratuit
    add(FX, swish(0.6, 0.35, 900, 6000, -0.9, 0.0), 36.7)
    add(FX, swish(0.6, 0.35, 900, 6000, 0.9, 0.0), 36.72)
    add(FX, whoosh(0.4, 0.3, up=True, f0=500, f1=8000, pan0=0, pan1=0, tone=False), 37.45)
    add(FX, UI['glass/success'] * 0.3, 37.75)
    hit(38.7, 1.0)
    add(MU, stab('C', 0.4, 0.45), 38.7)
    hit(39.25, 0.7)
    add(MU, stab('G', 0.4, 0.4), 39.25)
    rev_cym(40.2, 0.6, 0.8)

    # ---------------------------------------------------------- 40,2–44 s : la signature
    hit(40.2, 0.9)
    for m in CH['Cadd9'][0]:
        add(PN, piano.note(m, 0.45, 2.6, 1.4), 40.2)
        add(MU, S.GM('string_ensemble_1').note(m, 3.0, 1.0, attack=0.3, gain=1.6), 40.2)
    add(PN, piano.note(36, 0.4, 2.8, 1.4), 40.2)
    for j, mm in enumerate((72, 76, 79, 84)):
        add(PN, piano.note(mm, 0.45, 0.3 if j < 3 else 1.6, 1.2), 40.6 + j * 0.25)
    for i, dt in enumerate([0.05, 0.3, 0.12, 0.42, 0.2, 0.36]):
        add(FX, lp(crackle(0.1, 1800, 0.2), 6500), 40.95 + dt, pan=(i - 2.5) * 0.15)
    for i in range(12):
        add(FX, S.repitch(UI['mechanical/typing'], rng.uniform(-1.2, 1.2)) * 0.3, 41.1 + (i + 1) * 0.5 / 12)
    add(FX, UI['minimal/check'] * 0.3, 41.6)

    # ---------------------------------------------------------- groove
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

    drums(8.5, 11.0, opens=False)
    drums(11.5, 18.0)
    drums(18.0, 24.0)
    drums(24.0, 30.5)
    drums(30.6, 33.5, kick_on=False, claps=False, opens=False)
    drums(34.0, 36.0, opens=False)
    drums(36.0, 40.0)
    for a, b, g in ((8.5, 11.0, 0.6), (11.5, 30.5, 0.75), (34.0, 40.0, 0.75)):
        for i in range(int(round((b - a) / 0.25))):
            tt = a + i * 0.25
            root = CH[chord_at(tt)][1]
            add(BS, analog_bass(root + 12 + (12 if i % 4 == 3 else 0), 0.22, g * (0.85 if i % 2 == 0 else 0.6), cutoff=600, env_amt=1800, sub=0.22), tt)
    for a, b, g in ((12.0, 18.0, 0.16), (18.0, 24.0, 0.18), (24.0, 30.5, 0.2), (36.0, 38.5, 0.2)):
        for i in range(int(round((b - a) / BEAT))):
            add(MU, stab(chord_at(a + i * BEAT + 0.25), 0.2, g * 1.3), a + i * BEAT + 0.25)
    arp = [0, 2, 1, 3, 2, 1, 3, 2]
    for a, b in ((11.5, 17.9), (18.0, 23.9), (24.0, 30.4)):
        for i in range(int(round((b - a) / 0.25))):
            tt = a + i * 0.25
            notes = CH[chord_at(tt)][0]
            add(PN, pluck(notes[arp[i % 8] % len(notes)] + 12, 0.22, 0.09), tt)
    for t0, name, dd in [(30.6, 'Fmaj7', 2.0), (32.6, 'G', 1.0)]:
        for mm in CH[name][0]:
            add(PN, piano.note(mm, 0.33, dd, 0.9), t0)
            add(MU, S.GM('string_ensemble_1').note(mm, dd, 0.4, attack=0.3, gain=1.2), t0)

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
            rms = [np.sqrt(np.mean((B[:, idx(a):idx(a + 4)] * g) ** 2)) for a in range(0, 44, 4)]
            print(f'{name:8s} ' + ' '.join(f'{20 * np.log10(r + 1e-9):6.1f}' for r in rms))
    mix = hp(mix, 32, 2)
    mix = peak(mix, 48, -3.0, 0.8)
    mix = peak(mix, 2800, 2.0, 0.7)
    mix = compress(mix, -16, 2.0, 0.008, 0.12)
    mix = soft(mix * 0.95, 1.05)
    t = np.arange(N) / SR
    mix *= np.clip((DUR - t) / 0.9, 0, 1) ** 1.5 * np.clip(t / 0.05, 0, 1)
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
