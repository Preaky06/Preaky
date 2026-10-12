#!/usr/bin/env python3
"""Bande-son de la version motion design (src/motion.js) : 30 s, 120 BPM, la mineur.
Musique électronique sèche (808, basse analogique, synthés pincés, piano, cordes)
et bruitages graphiques calés à l'image près sur les animations du texte.

usage : python3 score_motion.py sortie.wav [--stems]
"""
import sys

import numpy as np
from scipy import signal
from scipy.io import wavfile

import samples as S
from dsp import *  # noqa: F401,F403

STEMS = '--stems' in sys.argv
BEAT = 0.5


# ---------------------------------------------------------------- courbes d'animation (identiques à motion.js)
def bezier(x1, y1, x2, y2):
    u = np.linspace(0, 1, 20001)
    bx = 3 * (1 - u) ** 2 * u * x1 + 3 * (1 - u) * u * u * x2 + u ** 3
    by = 3 * (1 - u) ** 2 * u * y1 + 3 * (1 - u) * u * u * y2 + u ** 3
    return lambda x: np.interp(np.clip(x, 0, 1), bx, by)


EZ_OUT, EZ_IO, EZ_IN = bezier(0.16, 1, 0.3, 1), bezier(0.76, 0, 0.24, 1), bezier(0.7, 0, 0.84, 0)


def prog(t, a, b):
    return np.clip((np.asarray(t, float) - a) / (b - a), 0, 1)


def steps(fn, t0, t1, every=1.0):
    """instants où floor(fn(t) / every) change : un clic par cran de compteur"""
    t = np.arange(t0, t1, 1 / 9600)
    v = np.floor(fn(t) / every)
    return t[1:][np.diff(v) != 0]


def speed(fn, t0, d):
    """vitesse normalisée d'une animation (pour moduler un frottement, un souffle)"""
    t = t0 + tv(d)
    v = np.abs(np.gradient(fn(t)))
    return v / max(v.max(), 1e-12)


# ---------------------------------------------------------------- harmonie
CH = {  # voicing des accords (synthés, cordes) et fondamentale de basse
    'Am': ([57, 60, 64, 69], 33), 'F': ([57, 60, 65, 69], 29), 'C': ([55, 60, 64, 67], 36),
    'G': ([55, 59, 62, 67], 31), 'E': ([56, 59, 64, 68], 28), 'Fmaj7': ([53, 57, 60, 64], 29),
    'Am9': ([52, 55, 59, 60, 64, 69], 33),
}
PROG = [(2.0, 'Am'), (3.0, 'F'), (4.0, 'Fmaj7'), (5.0, 'G'), (6.0, 'Am'), (7.0, 'F'), (8.0, 'C'), (9.0, 'G'),
        (10.0, 'Am'), (11.5, 'F'), (12.25, 'G'), (12.5, 'E'), (14.0, 'Am'), (15.0, 'F'), (16.0, 'C'), (17.0, 'G'),
        (18.0, 'Am'), (19.0, 'F'), (20.0, 'C'), (21.0, 'G'), (22.0, 'F'), (23.0, 'G'), (24.0, 'Am'), (25.5, 'Am9')]


def chord_at(t):
    c = None
    for t0, name in PROG:
        if t >= t0 - 1e-9:
            c = name
    return c


# ---------------------------------------------------------------- synthèse
def vsynth(m, d, gain=1.0, voices=3, det=0.1, cutoff=700, env_amt=5000, ftau=0.06, atau=0.25, sus=0.0,
           rel=0.04, sub=0.0, attack=0.002):
    """synthé soustractif : scies désaccordées, filtre passe-bas à enveloppe, amplitude exponentielle"""
    f = midi(m)
    n = int(d * SR)
    t = tv(d)
    x = np.zeros(n)
    for v in range(voices):
        o = 0.0 if voices == 1 else (v / (voices - 1) - 0.5) * 2 * det
        x += saw(f * 2 ** (o / 12), d, rng.random())
    x /= np.sqrt(voices)
    fc = np.minimum(cutoff + env_amt * np.exp(-t / ftau), 17000)
    y = np.zeros(n)
    zi = np.zeros((1, 2))
    for s in range(0, n, 128):
        sos = signal.butter(2, fc[s] / (SR / 2), 'low', output='sos')
        y[s:s + 128], zi = signal.sosfilt(sos, x[s:s + 128], zi=zi)
    if sub:
        y += np.sin(2 * np.pi * phase(f / 2, n)) * sub
    a = sus + (1 - sus) * np.exp(-t / atau)
    a *= np.clip(t / attack, 0, 1) * np.clip((d - t) / rel, 0, 1)
    return y * a * gain


def vsynth_st(m, d, width=0.7, **k):
    """même note rendue deux fois (phases et désaccord différents) : largeur stéréo"""
    l, r = vsynth(m, d, **k), vsynth(m, d, **dict(k, det=k.get('det', 0.1) * 1.3))
    mid, side = (l + r) / 2, (l - r) / 2
    return np.vstack([mid + side * width, mid - side * width])


def pluck(m, d=0.35, gain=1.0):
    return vsynth_st(m, d, width=0.5, gain=gain, voices=2, det=0.06, cutoff=500, env_amt=6500, ftau=0.045, atau=0.16)


def stab(name, d=0.4, gain=1.0, octave=0):
    out = None
    for m in CH[name][0]:
        y = vsynth_st(m + octave, d, width=0.9, gain=gain, voices=5, det=0.16, cutoff=900, env_amt=5200, ftau=0.09,
                      atau=0.22, sus=0.12, rel=0.06)
        out = y if out is None else out + y
    return out / np.sqrt(len(CH[name][0]))


def kick_synth(d=0.35, f0=180, f1=54, gain=1.0):
    t = tv(d)
    f = f1 + (f0 - f1) * np.exp(-t / 0.028)
    x = np.sin(2 * np.pi * phase(f, len(t))) * env_exp(d, 0.11, 0.0008)
    x += hp(noise(d), 3500) * env_exp(d, 0.003) * 0.45
    return soft(x * 1.3, 1.4) * gain


def thump(gain=1.0, f0=120, f1=52):
    """coup sourd bref sous un mot qui claque"""
    d = 0.16
    t = tv(d)
    f = f1 + (f0 - f1) * np.exp(-t / 0.02)
    x = np.sin(2 * np.pi * phase(f, len(t))) * env_exp(d, 0.05, 0.0006)
    x += bp(noise(d), 400, 2500) * env_exp(d, 0.006, 0.0003) * 0.5
    return x * gain


def swish(d=0.16, gain=1.0, f0=1800, f1=9000, pan0=0.0, pan1=0.0):
    """souffle court et serré d'un mot qui défile"""
    t = tv(d)
    u = t / d
    x = sweep(noise(d), f0, f1, 'band', q=1.4, curve=1.0) * np.sin(np.pi * u) ** 2
    pan = pan0 + (pan1 - pan0) * u
    a = (pan + 1) * np.pi / 4
    return np.vstack([x * np.cos(a), x * np.sin(a)]) * np.sqrt(2) * gain


def marker(d, fn, t0, gain=1.0, pan0=-0.4, pan1=0.4):
    """feutre sur papier : frottement filtré, modulé par la vitesse du tracé"""
    t = tv(d)
    sp = speed(fn, t0, d) ** 0.7
    grain = lp(rng.standard_normal(len(t)), 40)
    grain /= max(np.std(grain), 1e-9)
    x = bp(noise(d), 1800, 7500) * (0.6 + 0.4 * np.tanh(grain))
    x += bp(noise(d), 500, 1400) * 0.25
    x *= sp * np.clip(t / 0.01, 0, 1) * np.clip((d - t) / 0.02, 0, 1)
    pan = pan0 + (pan1 - pan0) * t / d
    a = (pan + 1) * np.pi / 4
    return np.vstack([x * np.cos(a), x * np.sin(a)]) * np.sqrt(2) * gain


def zip_line(d, fn, t0, gain=1.0, f0=900, f1=7000, pan0=-0.5, pan1=0.5):
    """trait qui se dessine : bande de bruit qui monte, au rythme du trait"""
    t = tv(d)
    sp = speed(fn, t0, d)
    x = sweep(noise(d), f0, f1, 'band', q=2.2, curve=1.0) * sp
    x += sine(lerp_arr(500, 1400, t / d), d) * sp * 0.04
    pan = pan0 + (pan1 - pan0) * fn(t0 + t)
    a = (pan + 1) * np.pi / 4
    return np.vstack([x * np.cos(a), x * np.sin(a)]) * np.sqrt(2) * gain


def charge(d, fn, t0, gain=1.0):
    """anneau qui se remplit : ton qui monte avec la progression, léger trémolo"""
    t = tv(d)
    p = fn(t0 + t)
    f = midi(69) * 2 ** p
    x = sine(f, d) * 0.6 + lp(saw(f * 1.5, d), 2500) * 0.12
    x *= 0.7 + 0.3 * np.sin(2 * np.pi * np.cumsum(10 + 20 * p) / SR)
    x *= np.clip(t / 0.05, 0, 1) * np.clip((d - t) / 0.01, 0, 1)
    return x * gain


def squeeze(d=0.25, gain=1.0):
    """le texte s'écrase en une barre : ton qui chute, filtré"""
    t = tv(d)
    f = 900 * (60 / 900) ** ((t / d) ** 1.4)
    x = lp(saw(f, d), 3000) * env_asr(d, 0.03, 0.03)
    return soft(x * 1.5, 1.3) * gain


def bloop(d=0.22, f0=300, f1=1200, gain=1.0):
    t = tv(d)
    f = f0 * (f1 / f0) ** ((t / d) ** 2)
    return sine(f, d) * env_asr(d, 0.01, 0.03) * (t / d) ** 0.5 * gain


def build(out_path):
    piano = S.Piano()
    strings, choir = S.GM('string_ensemble_1'), S.GM('pad_4_choir')
    BD, SD, CP = S.k808('BD/BD2550'), S.k808('SD/SD5050'), S.k808('CP/CP')
    CHH, OHH, CY, RS = S.k808('CH/CH'), S.k808('OH/OH25'), S.k808('CY/CY5050'), S.k808('RS/RS')
    TOMS = [S.k808('HT/HT50'), S.k808('MT/MT50'), S.k808('LT/LT50')]
    SUB808 = S.bd808_tuned()  # accordé en sol 1 (MIDI 31)
    UI = {k: S.ui(*k.split('/')) for k in ('studio/swipe', 'minimal/press', 'mechanical/snap', 'mechanical/lock',
                                            'mechanical/typing', 'minimal/focus', 'minimal/check', 'mechanical/select')}

    DR, BS, MU, PN, FX, IMP, RV = (bus() for _ in range(7))
    KICKS = []
    hall = make_hall((2.6, 2.0, 1.1), 0.02, seed=5)
    plate = make_hall((1.6, 1.3, 0.8), 0.01, seed=11, width=0.9)
    room = make_hall((0.6, 0.45, 0.3), 0.005, seed=17)

    def kick(t, g=1.0):
        add(DR, BD * 0.8, t, g)
        add(DR, kick_synth(), t, g * 0.9)
        KICKS.append(t)

    def clap(t, g=1.0):
        add(DR, CP * 0.9, t, g)
        add(DR, SD * 0.45, t, g)

    def crash(t, g=1.0):
        add(DR, CY * 0.8, t, g)

    def rev_cym(t_end, d=0.6, g=1.0):
        c = reverb_tail(CY * 0.8, room, 1.0)
        r = reverse(cut(c, d + 0.3))[:, -int(d * SR):]
        add(RV, r * np.linspace(0, 1, r.shape[1]) ** 2, t_end - d, g)

    def impact(t, g=1.0):
        kick(t, 1.0 * g)
        add(IMP, sub_drop(1.4, 95, 38, 0.6), t, g)
        add(IMP, hp(noise(0.9), 2500) * env_exp(0.9, 0.18) * 0.18, t, g)
        add(IMP, crack(0.45), t, g)
        crash(t, 0.8 * g)

    # ---------------------------------------------------------- 0–2 s : le compteur
    for tt in (0.12, 0.37):  # trotteuse discrète avant que le compteur s'emballe
        add(FX, tick(2600, 0.16, 0.015), tt, pan=0.15)
    v_counter = lambda tt: 1800 * EZ_IO(prog(tt, 0.6, 1.6))
    for tt in steps(v_counter, 0.6, 1.6, 60):  # un cran par minute
        add(FX, tick(3000 + rng.uniform(-200, 200), 0.22, 0.012), tt, pan=rng.uniform(-0.2, 0.2))
    for tt in steps(v_counter, 0.6, 1.6, 600):  # les dizaines claquent plus fort
        add(FX, UI['mechanical/snap'] * 0.3, tt)
    d = 1.0
    whirr = bp(noise(d), 2500, 9000) * speed(v_counter, 0.6, d) ** 1.2 * 0.09
    add(FX, whirr, 0.6)
    add(FX, UI['mechanical/lock'] * 0.55, 1.6)  # le compteur se verrouille, passe au rouge
    add(FX, thump(0.7, 140, 55), 1.6)
    add(BS, vsynth_st(45, 1.6, gain=0.3, voices=3, det=0.08, cutoff=180, env_amt=0, atau=9, sus=1.0,
                      rel=0.3, attack=1.2), 0.4)
    for m in (57, 64):  # nappe qui se tend pendant que le compteur tourne
        add(MU, strings.note(m, 1.3, 0.1, attack=1.0, gain=1.2), 0.65)
    add(FX, riser(0.4, 0.3, 600, 8000), 1.6)
    # volet double vers les verbes
    add(FX, whoosh(0.42, 0.5, up=True, f0=400, f1=7000, pan0=-0.85, pan1=0.85, tone=False), 1.95)
    add(FX, whoosh(0.42, 0.35, up=True, f0=700, f1=9000, pan0=-0.85, pan1=0.85, tone=False), 2.01)

    # ---------------------------------------------------------- 2–4 s : les verbes
    impact(2.0, 0.55)
    for s0 in (2.28, 2.75, 3.25, 3.75):  # chaque verbe arrive par un rouleau
        add(FX, swish(0.2, 0.32, 2500, 10000, 0.0, 0.0), s0 - 0.02)
        add(FX, UI['mechanical/select'] * 0.22, s0 + 0.16)
    # lamelles : huit souffles alternés gauche / droite
    for i in range(8):
        p0 = -0.3 if i % 2 else 0.3
        add(FX, swish(0.26, 0.12, 900, 6000, p0, -p0 * 3), 3.95 + i * 0.02)

    # ---------------------------------------------------------- 4–6 s : la question
    for m in CH['Fmaj7'][0]:
        add(MU, strings.note(m, 1.0, 0.5, attack=0.4, gain=1.6), 4.0)
    for m in CH['G'][0]:
        add(MU, strings.note(m, 0.75, 0.3, attack=0.3, gain=1.6), 5.0)
    add(BS, cut(S.repitch(SUB808, 29 - 31), 0.95, 0.2) * 0.45, 4.0)
    add(BS, cut(S.repitch(SUB808, 31 - 31), 0.7, 0.15) * 0.45, 5.0)
    for tt, m in ((4.12, 76), (4.40, 74), (4.68, 72)):  # une note par ligne de la question
        add(PN, piano.note(m, 0.42, 0.5, 0.8), tt)
    add(PN, piano.note(53, 0.3, 0.9, 0.8), 4.0)
    add(PN, piano.note(55, 0.3, 0.7, 0.6), 5.0)
    add(FX, bloop(0.22, 280, 1100, 0.18), 5.5)  # le point du « ? » enfle
    add(FX, riser(0.85, 0.32, 300, 9000), 5.15)
    rev_cym(6.0, 0.6, 0.8)
    add(FX, whoosh(0.4, 0.45, up=True, f0=250, f1=8000, pan0=0, pan1=0), 5.72)  # l'iris s'ouvre

    # ---------------------------------------------------------- 6–8 s : CINÉMOOD
    impact(6.0, 1.0)
    add(MU, stab('Am', 0.6, 0.5), 6.0)
    for i, m in enumerate((69, 72, 74, 76, 79, 81, 84, 88)):  # une note par lettre qui monte
        add(PN, pluck(m, 0.3, 0.16), 6.08 + i * 0.035)
    for j, (m, dd) in enumerate([(69, 0.22), (72, 0.22), (76, 0.22), (74, 0.6)]):  # signature : la–do–mi–ré
        add(PN, piano.note(m, 0.55, dd, 0.8), 6.5 + j * 0.25)
        add(PN, piano.note(m - 12, 0.3, dd, 0.8), 6.5 + j * 0.25)
    add(FX, zip_line(0.4, lambda tt: EZ_IO(prog(tt, 6.5, 6.9)), 6.5, 0.4), 6.5)  # soulignement
    add(FX, bloop(0.17, 600, 140, 0.25), 7.45)  # le creux du O se remplit de noir
    add(FX, suck(0.42, 0.5), 7.6)               # on plonge dans le O
    add(FX, riser(0.42, 0.3, 500, 10000), 7.6)
    rev_cym(8.0, 0.45, 0.6)

    # ---------------------------------------------------------- 8–10,5 s : 12 questions, ton humeur…
    impact(8.0, 0.6)
    v12 = lambda tt: 1 + 11 * EZ_OUT(prog(tt, 8.05, 8.55))
    for j, tt in enumerate(steps(v12, 8.05, 8.6, 1)):
        add(FX, tick(2400 + j * 160, 0.24, 0.014), tt)
    add(FX, thump(0.45), 8.1)
    add(FX, whoosh(0.38, 0.42, up=True, f0=300, f1=6000, pan0=0, pan1=0, tone=False), 8.93)  # poussée vers le haut
    add(FX, thump(0.4), 9.05)
    for j, s0 in enumerate((9.15, 9.62, 10.12)):
        add(FX, swish(0.22, 0.3, 2200, 9500), s0 - 0.02)
        add(FX, UI['mechanical/select'] * 0.2, s0 + 0.17)

    # ---------------------------------------------------------- 10,5–12,5 s : les humeurs
    ARP = [76, 72, 69, 72, 77, 72, 69, 79]
    for k in range(8):
        tt = 10.5 + k * 0.25
        add(FX, UI['minimal/press'] * 0.35, tt, pan=0.25 if k % 2 else -0.25)
        add(PN, pluck(ARP[k], 0.3, 0.34), tt)
        add(FX, thump(0.18, 160, 70), tt)

    # ---------------------------------------------------------- 12,5–14 s : le choix
    for m in CH['E'][0]:
        add(MU, strings.note(m, 1.45, 0.3, attack=0.25, gain=1.8), 12.5)
    add(MU, choir.note(76, 1.4, 0.3, attack=0.4, gain=1.3), 12.55)
    add(FX, marker(0.48, lambda tt: EZ_IO(prog(tt, 12.52, 12.98)), 12.5, 0.55, -0.5, 0.5), 12.5)
    tt = 13.0
    while tt < 13.95:  # roulement de caisse claire qui s'accélère
        u = (tt - 13.0) / 0.95
        add(DR, SD * (0.12 + 0.45 * u), tt, pan=0.1)
        tt += 0.125 if u < 0.5 else (0.0625 if u < 0.8 else 0.03125)
    add(FX, riser(1.0, 0.4, 300, 10000), 13.0)
    add(FX, bloop(0.13, 200, 700, 0.3), 13.55)  # l'ellipse se remplit
    add(FX, whoosh(0.42, 0.5, up=True, f0=200, f1=9000, pan0=0, pan1=0), 13.6)
    rev_cym(14.0, 0.7, 0.9)

    # ---------------------------------------------------------- 14–18 s : les résultats, en une minute
    impact(14.0, 1.0)
    for tt in (14.08, 14.55, 15.05):
        add(FX, thump(0.4), tt)
    for i in range(5):  # les cinq lignes arrivent de la droite
        t0 = 15.12 + i * 0.07
        add(FX, swish(0.3, 0.16, 1200, 7000, 0.8, 0.15), t0)
        add(FX, UI['mechanical/select'] * 0.12, t0 + 0.24, pan=0.2)
    sc = lambda tt: 94 * EZ_OUT(prog(tt, 15.2, 15.9))
    for tt in steps(sc, 15.2, 15.95, 4):
        add(FX, tick(4200, 0.07, 0.008), tt, pan=0.4)
    add(FX, whoosh(0.4, 0.4, up=False, f0=200, f1=5000, pan0=0.3, pan1=0), 15.84)  # la ligne n°1 devient l'écran
    add(FX, thump(0.55, 100, 45), 16.2)
    add(FX, thump(0.4), 16.12)
    ring = lambda tt: EZ_IO(prog(tt, 16.15, 17.25))
    add(MU, charge(1.1, ring, 16.15, 0.07), 16.15)
    for tt in steps(lambda q: 60 * ring(q), 16.15, 17.26, 5):
        add(FX, tick(3600, 0.1, 0.01), tt)
    add(FX, thump(0.5), 17.0)
    add(PN, piano.note(93, 0.5, 0.4, 1.2), 17.25)  # l'anneau se ferme : étincelles
    add(FX, glass_tink(0.25), 17.25)
    add(FX, UI['mechanical/snap'] * 0.35, 17.25)
    add(FX, suck(0.2, 0.4), 17.78)                 # l'anneau se resserre en point
    add(FX, zip_line(0.16, lambda tt: EZ_IO(prog(tt, 17.96, 18.12)), 17.96, 0.3, 1500, 9000, 0, 0), 17.96)
    for p in (-1, 1):  # l'écran s'ouvre en deux moitiés
        add(FX, whoosh(0.4, 0.3, up=True, f0=300, f1=6000, pan0=0.15 * p, pan1=0.9 * p, tone=False), 18.08)

    # ---------------------------------------------------------- 18–22,4 s : duo, gratuit, sans inscription
    impact(18.0, 0.7)
    for tt in (18.38, 18.56):
        add(FX, thump(0.35), tt)
    for p in (-1, 1):  # les moitiés se retirent
        add(FX, whoosh(0.4, 0.35, up=False, f0=250, f1=6000, pan0=0.2 * p, pan1=0.95 * p, tone=False), 19.83)
    impact(20.0, 1.0)                                 # GRATUIT.
    add(MU, stab('C', 0.5, 0.45), 20.0)
    add(FX, suck(0.24, 0.5), 20.84)                   # on traverse le mot
    add(FX, whoosh(0.3, 0.3, up=True, f0=600, f1=10000, pan0=0, pan1=0, tone=False), 20.86)
    add(FX, UI['minimal/focus'] * 0.35, 21.02)        # les champs apparaissent
    add(FX, marker(0.22, lambda tt: EZ_IO(prog(tt, 21.25, 21.45)), 21.24, 0.45, -0.6, 0.6), 21.24)
    add(FX, marker(0.19, lambda tt: EZ_IO(prog(tt, 21.33, 21.5)), 21.32, 0.4, -0.6, 0.6), 21.32)
    add(FX, whoosh(0.34, 0.25, up=False, f0=150, f1=2500, pan0=0, pan1=0, tone=True), 21.5)  # ils tombent
    impact(21.55, 0.65)                               # SANS INSCRIPTION.
    add(MU, stab('G', 0.45, 0.35), 21.55)
    add(FX, whoosh(0.42, 0.45, up=True, f0=400, f1=7000, pan0=0, pan1=0, tone=False), 22.36)  # volet vertical
    add(FX, whoosh(0.42, 0.3, up=True, f0=700, f1=9000, pan0=0, pan1=0, tone=False), 22.42)

    # ---------------------------------------------------------- 22,5–25,5 s : la promesse
    crash(22.5, 0.8)
    for tt, name in ((22.8, 'F'), (23.3, 'G'), (23.8, 'Am')):  # chaque ligne claque avec son accord
        add(FX, thump(0.45), tt)
        add(MU, stab(name, 0.42, 0.42, 12), tt)
    for j, (m, dd) in enumerate([(81, 0.22), (84, 0.22), (88, 0.22), (86, 0.7)]):
        add(PN, piano.note(m, 0.6, dd, 0.9), 24.0 + j * 0.25)
        add(PN, piano.note(m - 12, 0.45, dd, 0.9), 24.0 + j * 0.25)
    for m in (69, 72, 76):
        add(MU, choir.note(m, 2.4, 0.3, attack=0.3, gain=1.6), 22.6)
    add(FX, squeeze(0.24, 0.3), 25.0)                 # le texte s'écrase en barre
    add(FX, whoosh(0.32, 0.45, up=True, f0=300, f1=8000, pan0=0, pan1=0, tone=False), 25.2)
    rev_cym(25.5, 0.5, 0.9)

    # ---------------------------------------------------------- groove 2 → 25 s
    def section_drums(a, b, hats=True, opens=False, claps=True, kicks=True):
        for i in range(int(round((b - a) / BEAT))):
            tt = a + i * BEAT
            if kicks:
                kick(tt)
            if claps and int(round(tt / BEAT)) % 2 == 1:
                clap(tt, 0.85)
        if hats:
            for i in range(int(round((b - a) / 0.125))):
                tt = a + i * 0.125
                acc = (0.9, 0.35, 0.6, 0.35)[i % 4]
                add(DR, CHH * 0.28 * acc, tt, pan=0.3)
                if opens and i % 4 == 2:
                    add(DR, OHH * 0.26, tt, pan=-0.3)

    section_drums(2.0, 3.75, opens=False)
    section_drums(6.5, 7.5, claps=False, kicks=False)  # charleston seul sous le logo
    kick(7.0, 0.8)
    section_drums(8.0, 12.5, opens=True)
    section_drums(14.0, 17.75, opens=True)
    for j, tom in enumerate([0, 0, 1, 2]):  # roulement de toms vers le duo
        add(DR, TOMS[tom] * 0.6, 17.75 + j * 0.0625, pan=0.4 - 0.25 * j)
    section_drums(18.0, 22.5, opens=True)
    section_drums(22.5, 25.0, opens=True)
    for tt in (16.0, 24.0):
        crash(tt, 0.6)
    for tt in np.arange(22.5, 25.0, 1.0):  # contretemps de caisse claire en fin de phrase
        add(DR, SD * 0.3, tt + 0.875)

    # basse : croches sur la fondamentale, octave en fin de temps
    for a, b, g in ((2.0, 3.75, 0.7), (8.0, 12.5, 0.75), (14.0, 17.75, 0.85), (18.0, 25.0, 0.85)):
        for i in range(int(round((b - a) / 0.25))):
            tt = a + i * 0.25
            name = chord_at(tt)
            root = CH[name][1]
            m = root + 12 + (12 if i % 4 == 3 else 0)
            add(BS, analog_bass(m, 0.22, g * (0.85 if i % 2 == 0 else 0.6), cutoff=500 + 300 * (tt >= 14),
                                env_amt=1900, sub=0.22), tt)
    for t0, name in [(6.0, 'Am'), (7.0, 'F'), (14.0, 'Am'), (15.0, 'F'), (16.0, 'C'), (17.0, 'G'), (18.0, 'Am'),
                     (19.0, 'F'), (20.0, 'C'), (21.0, 'G'), (22.0, 'F'), (23.0, 'G'), (24.0, 'Am')]:
        dd = 0.6 if t0 == 7.0 else 0.95
        add(BS, cut(S.repitch(SUB808, CH[name][1] - 31), dd, 0.08) * 0.42, t0)
    # synthés : accords pincés sur les contretemps
    for a, b, g in ((8.0, 10.5, 0.2), (14.0, 17.75, 0.28), (18.0, 22.5, 0.24), (22.5, 25.0, 0.28)):
        for i in range(int(round((b - a) / BEAT))):
            tt = a + i * BEAT + 0.25
            if 15.12 <= tt < 15.9:  # on laisse passer les lignes qui arrivent
                continue
            add(MU, stab(chord_at(tt), 0.2, g * 1.3), tt)
    # nappe de cordes
    for t0, dd, g in ((14.0, 1.0, 1.0), (15.0, 1.0, 1.0), (16.0, 1.0, 1.0), (17.0, 0.75, 1.0), (18.0, 1.0, 1.1),
                      (19.0, 1.0, 1.1), (20.0, 1.0, 1.1), (21.0, 1.0, 1.1), (22.0, 1.0, 1.4), (23.0, 1.0, 1.4),
                      (24.0, 1.0, 1.4)):
        for m in CH[chord_at(t0)][0]:
            add(MU, strings.note(m, dd, 0.2, attack=0.05, gain=g), t0)

    # ---------------------------------------------------------- 25,5–30 s : signature
    impact(25.5, 1.1)
    notes, root = CH['Am9']
    for m in notes:
        add(MU, strings.note(m, 3.2, 1.2, attack=0.05, gain=2.0), 25.5)
    for m in (69, 72, 76, 81):
        add(MU, choir.note(m, 3.0, 1.2, attack=0.3, gain=1.3), 25.55)
    add(MU, stab('Am9', 1.2, 0.4), 25.5)
    add(BS, cut(S.repitch(SUB808, 33 - 31), 2.6, 0.8) * 0.8, 25.5)
    for i, m in enumerate((69, 72, 74, 76, 79, 81, 84, 88)):  # les lettres montent, comme au premier logo
        add(PN, pluck(m, 0.35, 0.16), 25.56 + i * 0.035)
    add(FX, zip_line(0.35, lambda tt: EZ_IO(prog(tt, 26.0, 26.35)), 26.0, 0.35), 26.0)
    for j, (m, dd) in enumerate([(69, 0.22), (72, 0.22), (76, 0.22), (81, 2.0)]):  # la signature se résout sur le la
        add(PN, piano.note(m, 0.5, dd, 1.6), 26.0 + j * 0.25)
        add(PN, piano.note(m - 12, 0.32, dd, 1.6), 26.0 + j * 0.25)
    add(PN, piano.note(45, 0.4, 2.5, 1.6), 25.5)
    add(FX, swish(0.5, 0.1, 3000, 12000, -0.4, 0.4), 26.45)  # contour de la pastille
    for i in range(12):  # l'adresse se tape
        add(FX, S.repitch(UI['mechanical/typing'], rng.uniform(-1.2, 1.2)) * 0.32, 26.58 + (i + 1) / 24,
            pan=-0.25 + i * 0.04)
    add(FX, UI['minimal/check'] * 0.3, 27.05)  # la flèche

    # ---------------------------------------------------------- traitements et mixage
    # « ABANDONNER. » : la musique abandonne aussi (ralentissement de bande)
    for B in (DR, BS, MU):
        tape_stop(B, 3.78, 0.2)
        B[:, idx(3.98):idx(4.0)] = 0
    # coupe sèche avant la signature
    for B in (DR, BS, MU, PN):
        i0, i1 = idx(25.0), idx(25.5)
        r = int(0.006 * SR)
        B[:, i0 - r:i0] *= np.linspace(1, 0, r)
        B[:, i0:i1] = 0
    duck = duck_env(KICKS, 0.28, 0.6, 0.075)
    BS *= duck
    MU *= 1 - 0.35 * (1 - duck)
    MU = hp(MU, 150)
    MU = peak(MU, 3000, 1.5, 0.8)
    PN = hp(PN, 80)
    FX = hp(FX, 100)
    DR = soft(DR * 1.05, 1.2)
    wet = reverb(MU * 0.3 + FX * 0.12 + RV * 0.12 + IMP * 0.15, hall) * 0.38
    wet += reverb(PN * 0.4, plate) * 0.9
    wet += reverb(DR * 0.1, plate) * 0.25
    G = {'drums': 0.3, 'bass': 0.6, 'music': 1.1, 'piano': 1.5, 'fx': 1.0, 'impacts': 0.5, 'rev': 0.7}
    stems = {'drums': DR, 'bass': BS, 'music': MU, 'piano': PN, 'fx': FX, 'impacts': IMP, 'rev': RV}
    mix = sum(stems[k] * G[k] for k in stems) + wet
    if STEMS:
        for name, B in list(stems.items()) + [('wet', wet)]:
            g = G.get(name, 1.0)
            rms = [np.sqrt(np.mean((B[:, idx(a):idx(a + 2)] * g) ** 2)) for a in range(0, 30, 2)]
            print(f'{name:8s} ' + ' '.join(f'{20 * np.log10(r + 1e-9):6.1f}' for r in rms))
    mix = hp(mix, 32, 2)
    mix = peak(mix, 48, -3.0, 0.8)
    mix = peak(mix, 2800, 2.0, 0.7)
    mix = compress(mix, -16, 2.0, 0.008, 0.12)
    mix = soft(mix * 0.95, 1.05)
    t = np.arange(N) / SR
    mix *= np.clip((30.0 - t) / 0.9, 0, 1) ** 1.5 * np.clip(t / 0.02, 0, 1)
    import pyloudnorm as pyln
    meter = pyln.Meter(SR)
    for _ in range(2):
        mix *= 10 ** ((-14.0 - meter.integrated_loudness(mix.T)) / 20)
        mix = limiter(mix, 10 ** (-2.0 / 20))
    print(f'intensité : {meter.integrated_loudness(mix.T):.1f} LUFS, crête {20 * np.log10(np.max(np.abs(mix))):.1f} dBFS')
    wavfile.write(out_path, SR, (np.clip(mix.T, -1, 1) * 32767).astype(np.int16))
    print(f'écrit {out_path}')


if __name__ == '__main__':
    build(sys.argv[1])
