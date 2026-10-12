#!/usr/bin/env python3
"""Bande-son de la vidéo UGC : lo-fi à 88 BPM en fa majeur (piano, batterie feutrée, basse,
craquements de vinyle). La musique reste étouffée pendant l'accroche et s'ouvre quand le
site apparaît. Bruitages calés sur le journal de capture (meta.json) : touches, taps,
apparition des sous-titres, accéléré, résultats, zooms.

usage : python3 score_ugc.py meta.json sortie.wav
"""
import json
import sys

import numpy as np
from scipy.io import wavfile

import samples as S
from dsp import *  # noqa: F401,F403

meta = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
FPS = meta['fps']
M = meta['marks']
NF = len(meta['frames'])
T_END = NF / FPS
ft = lambda f: f / FPS  # noqa: E731

BPM = 88
BEAT = 60 / BPM
BAR = 4 * BEAT
T_OPEN = ft(M['home'])                 # la musique s'ouvre quand le site apparaît
T0 = T_OPEN - BAR * np.ceil(T_OPEN / BAR)  # grille calée pour qu'une mesure commence à T_OPEN

CHORDS = [([53, 57, 60, 64], 41), ([52, 55, 59, 62], 40), ([50, 53, 57, 60], 38), ([48, 52, 55, 59], 36)]


def build():
    piano = S.Piano()
    BD, SD, CP, CHH, RS = S.k808('BD/BD2550'), S.k808('SD/SD5050'), S.k808('CP/CP'), S.k808('CH/CH'), S.k808('RS/RS')
    UI = {k: S.ui(*k.split('/')) for k in ('minimal/press', 'minimal/typing', 'soft/toggle-on', 'glass/success', 'studio/swipe', 'minimal/select')}
    SDl, CPl, CHl = lp(SD, 3500), lp(CP, 4000), lp(CHH, 7000)
    BD = hp(BD, 45)
    MU, DR, BS, FX = bus(), bus(), bus(), bus()
    plate = make_hall((1.8, 1.4, 0.8), 0.015, seed=21, width=0.9)
    room = make_hall((0.5, 0.4, 0.25), 0.005, seed=3)
    rng2 = np.random.default_rng(88)
    kicks = []

    # ---------------------------------------------------------------- musique
    nbars = int(np.ceil((T_END - T0) / BAR)) + 1
    for b in range(nbars):
        tb = T0 + b * BAR
        notes, root = CHORDS[b % 4]
        full = tb >= T_OPEN - 1e-6
        # accord tenu, légèrement égrené, puis relance sur le « et » du 2
        for j, m in enumerate(notes):
            add(MU, piano.note(m, 0.3 + 0.05 * rng2.random(), BAR * 0.86, 1.0), tb + j * 0.012 + rng2.uniform(0, 0.006))
            add(MU, piano.note(m + 12 if j == 3 else m, 0.2, BEAT * 0.9, 0.6), tb + 1.5 * BEAT + j * 0.01 + BEAT * 0.1)
        if b % 2 == 1 and full:  # petite réponse mélodique, aiguë et douce
            for j, m in enumerate([notes[3] + 12, notes[2] + 12, notes[1] + 12]):
                add(MU, piano.note(m, 0.22, BEAT * 0.6, 0.8), tb + 2.5 * BEAT + j * BEAT * 0.5)
        # basse ronde
        for t_b, d in ((0, 2.45), (2.5, 1.5)):
            e = env_ad(d * BEAT, 0.01, d * BEAT)
            add(BS, (sine(midi(root), d * BEAT) * 0.24 + sine(midi(root) * 2, d * BEAT) * 0.06) * e, tb + t_b * BEAT)
        # batterie feutrée (balancée)
        for beat in range(4):
            t = tb + beat * BEAT
            if beat == 0 or (beat == 2 and b % 2):
                add(DR, BD * 0.8, t, 1.0 if full else 0.5)
                kicks.append(t)
            if beat in (1, 3):
                add(DR, SDl * 0.45, t, 1.0 if full else 0.0)
                add(DR, CPl * 0.35, t, 1.0 if full else 0.0)
            for half, acc in ((0, 0.7), (0.6, 0.45)):  # croches balancées
                add(DR, CHl * 0.22 * acc, t + half * BEAT, 1.0 if full else 0.0, pan=0.25)
        add(DR, BD * 0.6, tb + 1.6 * BEAT, 1.0 if full else 0.4); kicks.append(tb + 1.6 * BEAT)
    # craquements de vinyle et souffle, tout du long
    bed = crackle(T_END + 1, 1400, 0.5) + hp(pink(T_END + 1), 3000) * 0.012
    add(MU, stereo(bed) * 0.35, 0.0)

    # ---------------------------------------------------------------- bruitages
    frames = meta['frames']
    # accroche : un souffle discret à chaque lancer du doigt
    for g in meta['drags']:
        d = 0.32 if g['view'] == 'hook' else 0.24
        add(FX, swish_soft(d) * (0.35 if g['view'] == 'hook' else 0.18), ft(g['f0']))
    # touches du clavier
    prev = 0
    for fr in frames:
        u = fr.get('url')
        if u and len(u['text']) > prev:
            add(FX, S.repitch(UI['minimal/typing'], rng2.uniform(-1.5, 1.5)) * 0.45, ft(fr['f']) + rng2.uniform(0, 0.015), pan=rng2.uniform(-0.2, 0.2))
            prev = len(u['text'])
        if u and u.get('progress') == 0:
            add(FX, UI['minimal/select'] * 0.4, ft(fr['f']))  # entrée
    # taps
    for t in meta['taps']:
        add(FX, UI['minimal/press'] * 0.42, ft(t['f']) - 0.01)
    # sous-titres : petit « pop » à chaque apparition
    for a in caption_starts():
        add(FX, UI['soft/toggle-on'] * 0.16, ft(a))
    # accéléré : montée et tic-tac rapide
    ff0, ff1 = ft(M['ff']), ft(M['ffEnd'])
    add(FX, riser(ff1 - ff0, 0.16, 800, 9000), ff0)
    # résultats : carillon
    add(FX, UI['glass/success'] * 0.32, ft(M['results']))
    # zooms : léger souffle
    for key in ('title', 'why', 'card3'):
        add(FX, swish_soft(0.3) * 0.22, ft(M[key]) + 0.05)

    # ---------------------------------------------------------------- mixage
    duck = duck_env(kicks, 0.25, 0.35, 0.08)
    BS *= duck
    MU = lp(MU, 6500)
    music = MU * 1.0 + DR * 0.55 + BS * 0.7
    # étouffé pendant l'accroche, ouverture franche à l'apparition du site
    n_open = idx(T_OPEN)
    head = music[:, :n_open + int(0.4 * SR)].copy()
    muff = sweep_stereo(head, n_open)
    music[:, :n_open + int(0.4 * SR)] = muff
    gain = np.ones(N)
    gain[:n_open] = 0.55
    music *= gain
    music += reverb(MU * 0.25, plate) * 0.35 + reverb(DR * 0.1, room) * 0.3
    mix = music * 0.9 + FX * 1.0 + reverb(FX * 0.15, room) * 0.4
    mix = hp(mix, 40, 2)
    mix = compress(mix, -18, 2.0, 0.01, 0.15)
    t = np.arange(N) / SR
    mix *= np.clip((T_END - t) / 0.8, 0, 1) ** 1.5 * np.clip(t / 0.03, 0, 1)
    mix = mix[:, :int(T_END * SR)]
    import pyloudnorm as pyln
    meter = pyln.Meter(SR)
    for _ in range(2):
        mix *= 10 ** ((-14.0 - meter.integrated_loudness(mix.T)) / 20)
        mix = limiter(mix, 10 ** (-2.0 / 20))
    print(f'intensité : {meter.integrated_loudness(mix.T):.1f} LUFS, crête {20 * np.log10(np.max(np.abs(mix))):.1f} dBFS, durée {mix.shape[1] / SR:.2f} s')
    wavfile.write(OUT, SR, (np.clip(mix.T, -1, 1) * 32767).astype(np.int16))


def swish_soft(d):
    t = tv(d)
    x = sweep(pink(d), 600, 5000, 'band', q=1.2, curve=1.0) * np.sin(np.pi * t / d) ** 2
    return stereo(x)


def sweep_stereo(x, n_open):
    """filtre passe-bas qui s'ouvre de 700 Hz à 18 kHz en 0,4 s à n_open"""
    out = np.zeros_like(x)
    for c in range(2):
        a = lp(x[c, :n_open], 700, 2)
        b = sweep(x[c, n_open:], 700, 18000, 'low', curve=0.6)
        out[c] = np.concatenate([a, b])
    return out


def caption_starts():
    """débuts des sous-titres, mêmes repères que compose.mjs"""
    keys = [('hook', 3), ('type', 2), ('home', 4), ('q1', 2), ('q2', 3), ('ff', 1), ('loading', 2), ('results', 3), ('title', 3), ('why', 4), ('card2', 2), ('card3', 10)]
    return [M[k] + o for k, o in keys]


if __name__ == '__main__':
    build()
