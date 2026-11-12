#!/usr/bin/env python3
"""Bande-son de la pub « UGC » (src/ugc30.js), 27,5 s : la voix off (posée à 0,25 s) et une musique à 120 BPM
qui se baisse quand elle parle. Grille à partir de la première coupe (6,55 s). Avant : un tic-tac qui suit le
compteur jusqu'à 40:00. Puis un clic par appui dans le site (aux mêmes instants que les plans du site, recalés
par UMAP), la frappe de l'adresse pendant que la voix la dit, et la signature.

usage : python3 score_ugc30.py sortie.wav voix.wav [--stems]
"""
import sys

import numpy as np
from scipy.io import wavfile

import dsp
import score_mograph as MG  # noqa: E402  (fixe ses propres durées : remplacées juste après)
import samples as S  # noqa: E402
import score_motion as SM  # noqa: E402
DUR = 27.5
dsp.DUR = DUR
dsp.N = int(dsp.SR * DUR)
from dsp import *  # noqa: E402,F401,F403
N = dsp.N
SM.N = MG.N = N
from score_motion import vsynth_st, pluck, kick_synth, thump, swish, EZ_IO, prog, steps  # noqa: E402
from score_mograph import pop, stab, rev_cym, CH  # noqa: E402
dsp.DUR, dsp.N, SM.N, MG.N = DUR, N, N, N

BEAT = 0.5
VOICE_AT = 0.25
# = ugc30.js (UT, UMAP)
LOCK, PHONE, SITE, FACE3, END = 3.3, 6.55, 9.1, 17.8, 21.3
PILL_TYPE, END_TYPE, END_LOGO, TAP = (9.25, 10.45), (23.0, 24.2), 23.05, 24.9
UMAP = [(9.1, 0.6), (10.4, 1.6), (11.0, 3.3), (11.5, 4.4), (11.5, 7.4), (12.1, 8.25), (12.8, 9.45), (13.6, 11.15),
        (14.4, 12.85), (15.2, 14.55), (15.5, 14.95), (17.0, 16.3), (FACE3 + 0.2, 17.2)]


def video_t(b):
    """temps des plans du site → temps de la vidéo"""
    for (a, A), (c, B) in zip(UMAP, UMAP[1:]):
        if A <= b <= B and B > A:
            return a + (c - a) * (b - A) / (B - A)
    return None


TAPS = [video_t(b) for b in (1.55, 3.1, 4.25, 8.1, 9.3, 11.0, 12.7, 14.4)]  # « Commencer », puis une réponse par question
PROG = [(0.0, 'Am')] + [(PHONE + i, ('C', 'G', 'Am', 'F')[i % 4]) for i in range(14)] + [(20.35, 'Fmaj7'), (END + 0.4, 'Cadd9')]


def chord_at(t):
    c = 'Am'
    for t0, n in PROG:
        if t >= t0 - 1e-9:
            c = n
    return c


def build(out_path, voice_path):
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

    def tap(t, g=1.0):
        add(FX, UI['minimal/press'] * 0.5 * g, t)
        add(FX, UI['mechanical/select'] * 0.16 * g, t + 0.03)

    # ---------------------------------------------------------- l'accroche : le compteur monte jusqu'à 40:00
    add(BS, vsynth_st(33, PHONE, gain=0.2, voices=3, det=0.08, cutoff=300, env_amt=200, atau=9, sus=1.0, rel=0.4, attack=0.6), 0.0)
    for m in (57, 64, 69):
        add(MU, strings.note(m, PHONE - 0.2, 0.35, attack=1.5, gain=1.0), 0.05)
    cnt = lambda tt: 2400 * EZ_IO(prog(tt, 0.4, LOCK))
    for tt in steps(cnt, 0.4, LOCK, 60):  # un cran par minute
        add(FX, tick(3000 + rng.uniform(-200, 200), 0.2, 0.012), tt, pan=rng.uniform(-0.2, 0.2))
    for i in range(12):  # un cœur sourd, de plus en plus présent
        add(DR, lp(kick_synth(), 400) * (0.25 + 0.04 * i), 0.5 + i * 0.5)
    add(FX, UI['mechanical/snap'] * 0.45, LOCK)  # le compteur se verrouille, passe au rouge
    add(FX, thump(0.7, 140, 55), LOCK)
    add(FX, riser(1.0, 0.25, 300, 7000), PHONE - 1.0)
    add(FX, whoosh(0.4, 0.3, up=True, f0=300, f1=7000, pan0=-0.3, pan1=0.3, tone=True), PHONE - 0.38)

    # ---------------------------------------------------------- elle, le site, elle
    hit(PHONE, 0.9)
    for m in CH['C'][0]:
        add(PN, piano.note(m + 12, 0.32, 1.2, 1.2), PHONE)
    add(FX, swish(0.4, 0.2, 600, 6000, 0.4, -0.2), SITE - 0.08)  # on entre dans le site
    for a0, a1 in (PILL_TYPE, END_TYPE):  # l'adresse se tape pendant que la voix la dit
        for i in range(12):
            add(FX, S.repitch(UI['mechanical/typing'], rng.uniform(-1.2, 1.2)) * 0.26, a0 + i * (a1 - a0) / 12)
        add(FX, UI['minimal/check'] * 0.28, a1 + 0.08)
    for k, tt in enumerate(TAPS):
        tap(tt, 0.8)
    add(FX, whoosh(0.4, 0.22, up=True, f0=300, f1=6000, pan0=0, pan1=0, tone=False), video_t(14.95) - 0.2)  # le résultat arrive
    add(FX, UI['glass/success'] * 0.2, video_t(15.6))
    add(FX, thump(0.5), FACE3)  # retour sur elle
    add(MU, stab('Fmaj7', 0.5, 0.35), 20.35)  # « va tester. »

    # ---------------------------------------------------------- le carton final
    add(FX, whoosh(0.45, 0.3, up=True, f0=250, f1=7000, pan0=0, pan1=0, tone=True), END - 0.05)
    rev_cym(FX, CY, room, END + 0.4, 0.4, 0.6)
    hit(END + 0.4, 0.8)
    for m in CH['Cadd9'][0]:
        add(PN, piano.note(m, 0.4, 3.0, 1.3), END + 0.4)
        add(MU, strings.note(m, 5.4, 1.0, attack=0.3, gain=1.5), END + 0.4)
    add(PN, piano.note(36, 0.4, 3.0, 1.3), END + 0.4)
    for i, m in enumerate((60, 64, 67, 72, 76, 79, 84, 88)):  # les lettres de CINÉMOOD
        add(PN, pluck(m + 12, 0.18, 0.06), END_LOGO + i * 0.04, pan=(i - 3.5) * 0.12)
    tap(TAP)
    for j, mm in enumerate((72, 76, 79, 84)):
        add(PN, piano.note(mm, 0.34, 0.25 if j < 3 else 1.4, 1.1), TAP + 0.05 + j * 0.15)

    # ---------------------------------------------------------- groove (grille à partir de la première coupe)
    def drums(a, b, opens=True, kicks_on=True):
        for i in range(int(round((b - a) / BEAT))):
            tt = a + i * BEAT
            if kicks_on:
                kick(tt)
            if i % 2 == 1:
                add(DR, CP * 0.85, tt)
                add(DR, SD * 0.4, tt)
        for i in range(int(round((b - a) / 0.125))):
            tt = a + i * 0.125
            add(DR, CHH * 0.26 * (0.9, 0.35, 0.6, 0.35)[i % 4], tt, pan=0.3)
            if opens and i % 4 == 2:
                add(DR, OHH * 0.22, tt, pan=-0.3)

    drums(PHONE + 0.5, PHONE + 0.5 + 27 * BEAT)
    drums(20.55, END + 0.05, opens=False, kicks_on=False)
    for i in range(int(round((20.35 - PHONE) / 0.25))):
        tt = PHONE + i * 0.25
        add(BS, analog_bass(CH[chord_at(tt)][1] + 12 + (12 if i % 4 == 3 else 0), 0.22, 0.72 * (0.85 if i % 2 == 0 else 0.6), cutoff=600, env_amt=1800, sub=0.22), tt)
    for i in range(int(round((20.35 - PHONE) / BEAT))):
        add(MU, stab(chord_at(PHONE + i * BEAT + 0.25), 0.2, 0.2), PHONE + i * BEAT + 0.25)
    arp = [0, 2, 1, 3, 2, 1, 3, 2]
    for i in range(int(round((FACE3 - SITE) / 0.25))):
        tt = SITE + i * 0.25
        ns = CH[chord_at(tt)][0]
        add(PN, pluck(ns[arp[i % 8] % len(ns)] + 12, 0.22, 0.05), tt)

    # ---------------------------------------------------------- mixage (comme score_sept)
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
    music = sum(stems[k] * G[k] for k in stems) + wet
    music = hp(music, 32, 2)
    music = peak(music, 48, -3.0, 0.8)
    music = peak(music, 2800, -1.5, 0.7)  # on laisse la place à la voix
    import pyloudnorm as pyln
    meter = pyln.Meter(SR)
    music *= 10 ** ((-22.0 - meter.integrated_loudness(music.T)) / 20)
    # la voix : coupe des graves, présence, compression douce, à -16 LUFS
    sr_v, v = wavfile.read(voice_path)
    v = v.astype(float) / 32768
    if v.ndim == 2:
        v = v.mean(1)
    assert sr_v == SR, 'voix attendue en 48 kHz'
    voice = bus()
    add(voice, stereo(v), VOICE_AT)
    voice = hp(voice, 80, 2)
    voice = peak(voice, 3200, 1.5, 0.8)
    voice = compress(voice, -20, 2.5, 0.006, 0.15)
    voice *= 10 ** ((-16.0 - meter.integrated_loudness(voice.T)) / 20)
    # la musique se baisse de 7 dB quand elle parle (enveloppe de la voix, montée 40 ms, retour 350 ms)
    e = np.abs(voice).max(0)
    env = np.zeros(N)
    up_k, dn_k = 1 - np.exp(-1 / (0.04 * SR)), 1 - np.exp(-1 / (0.35 * SR))
    acc = 0.0
    lvl = (e > 10 ** (-40 / 20)).astype(float)
    for i in range(0, N, 48):
        tgt = lvl[i:i + 48].max()
        k = up_k if tgt > acc else dn_k
        acc += (tgt - acc) * (1 - (1 - k) ** 48)
        env[i:i + 48] = acc
    music *= 10 ** (-7 * env / 20)
    if '--stems' in sys.argv:  # contrôle : la musique (déjà baissée) et la voix, séparément
        for name, B in (('musique', music), ('voix', voice)):
            wavfile.write(out_path.replace('.wav', f'_{name}.wav'), SR, (np.clip(B.T, -1, 1) * 32767).astype(np.int16))
    mix = music + voice + reverb(voice * 0.05, room) * 0.3
    mix = compress(mix, -16, 2.0, 0.008, 0.12)
    mix = soft(mix * 0.95, 1.05)
    tt = np.arange(N) / SR
    mix *= np.clip((DUR - 0.02 - tt) / 0.6, 0, 1) ** 1.5 * np.clip(tt / 0.15, 0, 1)
    for _ in range(2):
        mix *= 10 ** ((-14.0 - meter.integrated_loudness(mix.T)) / 20)
        mix = limiter(mix, 10 ** (-3.0 / 20), tp=True)  # marge pour l'AAC
    print(f'intensité : {meter.integrated_loudness(mix.T):.1f} LUFS, crête {20 * np.log10(np.max(np.abs(mix))):.1f} dBFS')
    wavfile.write(out_path, SR, (np.clip(mix.T, -1, 1) * 32767).astype(np.int16))
    print(f'écrit {out_path}')


if __name__ == '__main__':
    build(sys.argv[1], sys.argv[2])
