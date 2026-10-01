"""Design sonore du motion design CinéMood, entièrement synthétisé (aucun sample externe).

Chaque événement est calé sur la timeline de index.html. Tempo du lit : 100 BPM,
temps à 0,1 + 0,6·k s — les coupes 10,9 / 11,5 / 12,1 et le clic à 3,7 tombent dessus.

Usage : python3 sound.py  ->  sound.wav (48 kHz, stéréo)
"""
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
import wave
import os

SR = 48000
DUR = 15.0
N = int(SR * DUR)
rng = np.random.default_rng(7)

dry = np.zeros((2, N))   # signal direct
send = np.zeros((2, N))  # envoi vers la réverbe


# ---------------------------------------------------------------- outils
def t_axis(d):
    return np.arange(int(d * SR)) / SR


def place(sig, t0, gain=1.0, pan=0.0, rev=0.25):
    """Ajoute un signal mono à t0 (s), panoramique -1..1, part envoyée en réverbe."""
    i = int(t0 * SR)
    if i >= N:
        return
    sig = sig[: N - i] * gain
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    for ch, g in ((0, l), (1, r)):
        dry[ch, i:i + len(sig)] += sig * g * np.sqrt(2)
        send[ch, i:i + len(sig)] += sig * g * np.sqrt(2) * rev


def lp(x, f, order=2):
    return sosfilt(butter(order, f, 'low', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, 'high', fs=SR, output='sos'), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], 'band', fs=SR, output='sos'), x)


def sweep_filter(x, f0, f1, q=1.2, block=256):
    """Passe-bande dont la fréquence centrale glisse de f0 à f1 (exponentiel)."""
    out = np.zeros_like(x)
    nb = int(np.ceil(len(x) / block))
    zi = np.zeros((2, 2))  # état du filtre conservé d'un bloc à l'autre : pas de clics
    for b in range(nb):
        k = b / max(1, nb - 1)
        fc = f0 * (f1 / f0) ** k
        lo, hi = fc / (1 + 1 / q), min(fc * (1 + 1 / q), SR / 2 - 100)
        seg = x[b * block:(b + 1) * block]
        out[b * block:(b + 1) * block], zi = sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), seg, zi=zi)
    return out


def adsr(n, a, r, curve=4.0):
    """Montée linéaire a (s) puis décroissance exponentielle sur le reste."""
    e = np.ones(n)
    na = max(1, int(a * SR))
    e[:na] = np.linspace(0, 1, na)
    rest = n - na
    if rest > 0:
        e[na:] = np.exp(-curve * np.linspace(0, 1, rest) * (rest / SR) / max(r, 1e-3))
    return e


def noise(d):
    return rng.standard_normal(int(d * SR))


# ---------------------------------------------------------------- sons
def boom(d=1.8, f0=110, f1=32):
    t = t_axis(d)
    f = f1 + (f0 - f1) * np.exp(-t * 9)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 2.2)
    click = lp(noise(d), 2500) * np.exp(-t * 60) * 0.6
    return np.tanh((body + click) * 1.6)


def hit(d=1.6):
    t = t_axis(d)
    snap = bp(noise(d), 900, 6000) * np.exp(-t * 18) * 0.7
    metal = (np.sin(2 * np.pi * 180 * t) + .5 * np.sin(2 * np.pi * 377 * t)) * np.exp(-t * 7) * .25
    return boom(d, 140, 34) + snap + metal


def whoosh(d, f0, f1, rise=True):
    x = sweep_filter(noise(d), f0, f1, q=1.6)
    t = np.linspace(0, 1, len(x))
    env = t ** 2.2 if rise else (1 - t) ** 2.5
    env *= np.minimum(1, (1 - t) * 40) if rise else np.minimum(1, t * 40)
    return x * env


def click(f=2400, d=.05):
    t = t_axis(d)
    return (bp(noise(d), f * .6, f * 1.6) * np.exp(-t * 160) * .9
            + np.sin(2 * np.pi * f * .5 * t) * np.exp(-t * 120) * .5)


def blip(f, d=.14, drop=.85):
    t = t_axis(d)
    ph = 2 * np.pi * np.cumsum(f * (drop + (1 - drop) * np.exp(-t * 30))) / SR
    return (np.sin(ph) + .25 * np.sin(2 * ph)) * adsr(len(t), .003, d * .5)


def tick(f=3200, d=.03):
    t = t_axis(d)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 220) + bp(noise(d), 4000, 9000) * np.exp(-t * 300) * .4


def bell(f, d=2.2):
    t = t_axis(d)
    parts = [(1, 1), (2.76, .35), (5.4, .15), (1.5, .2)]
    return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * (1.6 + m * .7)) for m, a in parts) * adsr(len(t), .002, d)


def kick(d=.45):
    t = t_axis(d)
    f = 45 + 120 * np.exp(-t * 35)
    return np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) * 1.8)


def hat(d=.06):
    t = t_axis(d)
    return hp(noise(d), 7000) * np.exp(-t * 90)


def pad(freqs, d, cutoff=1400, detune=.004):
    """Nappe : dents-de-scie légèrement désaccordées, filtrées."""
    t = t_axis(d)
    out = np.zeros(len(t))
    for f in freqs:
        for dt in (-detune, 0, detune):
            ff = f * (1 + dt)
            ph = (ff * t + rng.random()) % 1.0
            out += (2 * ph - 1)
    return lp(out / (3 * len(freqs)), cutoff, 2)


def buzz(d):
    t = t_axis(d)
    sq = np.sign(np.sin(2 * np.pi * 120 * t)) * .5 + np.sin(2 * np.pi * 60 * t)
    return lp(sq, 2000) + bp(noise(d), 2000, 6000) * .15


def midi(n):
    return 440 * 2 ** ((n - 69) / 12)


# ============================================================ TIMELINE
# --- S1 : ligne rouge qui s'étire (0,12 – 0,9) puis file vers l'eyebrow
place(whoosh(.85, 300, 6000, True), .05, .55, pan=-.2, rev=.4)
t = t_axis(.8)
laser = np.sin(2 * np.pi * np.cumsum(220 * (6 ** (t / .8))) / SR) * (t / .8) ** 1.5 * np.exp(-((t - .8) * 30) ** 2 * 0)
place(laser * .18, .1, pan=.15, rev=.5)
place(whoosh(.6, 5000, 600, False), .95, .4, pan=-.5, rev=.3)

# --- S2 : impact du titre, néon, nappe
place(boom(2.4, 120, 30), 1.42, 1.0, rev=.35)
place(hit(1.2) * .35, 1.42, rev=.5)
fl = [0, 1, .2, 1, 0, 1, 1, .4, 1]
seg = .6 / (len(fl) - 1)
for i, a in enumerate(fl[:-1]):
    if a > 0:
        b = buzz(seg * .9) * a
        b *= adsr(len(b), .004, seg * .6)
        place(b, 1.75 + i * seg, .22, pan=-.3, rev=.2)
place(blip(1320, .12), 2.32, .18, pan=-.4)
place(blip(1760, .12), 2.4, .14, pan=-.2)

# nappe Ré mineur (add9) : de 1,4 s à la coupe 10,9 s
pd = pad([midi(38), midi(45), midi(50), midi(53), midi(57), midi(64)], 9.5, 1100)
tp = t_axis(9.5)
penv = np.minimum(1, tp / 1.2) * np.minimum(1, (9.5 - tp) / .08)
penv *= .75 + .25 * np.sin(2 * np.pi * .3 * tp)
place(pd * penv, 1.4, .45, rev=.6)

# --- clic sur « Commencer » et cercle rouge
place(click(2200), 3.64, .7, pan=-.55, rev=.15)
place(whoosh(.48, 400, 7000, True), 3.73, .7, pan=-.3, rev=.3)
place(boom(1.0, 160, 50) * .4, 4.2, 1.0, rev=.4)
place(whoosh(.5, 4000, 400, False), 4.22, .5, rev=.35)

# --- S3 : cartes du quiz (tics montants), sélection, puces
for i in range(8):
    place(tick(2000 + i * 180), 4.66 + i * .045, .16, pan=-.6 + i * .17, rev=.3)
place(click(2600), 5.62, .7, pan=-.2, rev=.15)
place(blip(880, .25, .98) + blip(1320, .25, .98) * .6, 5.7, .32, pan=-.2, rev=.4)
for i, tc in enumerate([5.85] + [6.2 + i * .17 for i in range(1, 6)]):
    place(blip(1100 + i * 140, .09), tc + .05, .2, pan=-.5 + i * .12, rev=.3)


# défilement des 12 questions : un tic à chaque question qui passe
def in_out_quint(x):
    return 16 * x ** 5 if x < .5 else 1 - (-2 * x + 2) ** 5 / 2


ts = np.linspace(6.1, 7.2, 4000)
prog = np.array([in_out_quint((x - 6.1) / 1.1) * 10 for x in ts])
for k in range(1, 11):
    tc = ts[np.searchsorted(prog, k)]
    place(tick(1800 + k * 160, .04), tc, .35, pan=(-1) ** k * .3, rev=.25)
place(whoosh(1.15, 200, 4000, True), 6.08, .45, rev=.4)
t = t_axis(1.15)
place(np.sin(2 * np.pi * np.cumsum(40 + 80 * (t / 1.15) ** 2) / SR) * (t / 1.15) * .6, 6.08, .5, rev=.1)

# 12/12 : impact + scintillement, puis la barre se rétracte
place(hit(1.4) * .6, 7.24, .8, rev=.45)
place(bell(1760, 1.2) * .25, 7.24, .6, pan=.3, rev=.6)
place(whoosh(.35, 6000, 800, False), 7.3, .35, pan=-.6, rev=.3)

# --- S4 : filtres, décompte, cartes, barres de score
for i in range(6):
    place(tick(2600, .03), 7.72 + i * .07, .18, pan=-.7 + i * .2, rev=.3)
cd = np.linspace(0, 1, 26)
for x in cd[:-1]:
    tc = 7.75 + (np.arcsin(2 * x - 1) / np.pi + .5) * 1.0
    place(tick(3600, .02), tc, .16, pan=.6, rev=.2)
place(bell(1318.5, 2.0) * .55 + bell(1975.5, 2.0) * .25, 8.76, .55, pan=.6, rev=.6)
for i in range(5):
    place(whoosh(.4, 300, 2500, True) * .5, 8.5 + i * .08, .5, pan=-.8 + i * .4, rev=.3)
t = t_axis(.9)
place(np.sin(2 * np.pi * np.cumsum(330 * (3 ** (t / .9))) / SR) * np.sin(np.pi * t / .9) ** 2 * .3, 9.0, .5, rev=.5)
place(hit(1.0) * .35, 9.75, .8, pan=-.6, rev=.4)
place(bell(1046.5, 1.6) * .45, 9.76, .7, pan=-.6, rev=.6)
for i in range(0, 62, 2):  # frappe clavier
    place(click(3800 + rng.random() * 800, .03) * (.5 + .5 * rng.random()), 10.0 + i / 62 * .55, .2, pan=-.5, rev=.1)

# zoom dans l'affiche : montée qui se coupe net
place(whoosh(.45, 300, 9000, True), 10.45, .9, rev=.2)
t = t_axis(.45)
place(np.sin(2 * np.pi * np.cumsum(60 * (8 ** (t / .45))) / SR) * (t / .45) ** 2 * .7, 10.45, .6, rev=.1)

# --- S5 : trois coupes
for tc, g in ((10.9, .95), (11.5, 1.0), (12.1, 1.1)):
    place(hit(1.8), tc, g, rev=.45)
place(bell(587.3, 1.0) * .3, 10.9, .5, rev=.6)
place(bell(698.5, 1.0) * .3, 11.5, .5, rev=.6)
place(bell(880, 1.0) * .3, 12.1, .5, rev=.6)

# aspiration inversée vers le logo
rev_sw = whoosh(.45, 800, 6000, True) + boom(.45, 200, 80)[::-1] * .5
place(rev_sw, 12.42, .6, rev=.5)

# --- S6 : logo
place(boom(3.0, 100, 28), 12.86, 1.15, rev=.5)
place(hit(1.5) * .5, 12.86, .9, rev=.6)
for i in range(8):
    place(tick(1500 + i * 120, .035), 12.88 + i * .045, .12, pan=-.6 + i * .17, rev=.4)
end = pad([midi(38), midi(50), midi(57), midi(62), midi(64), midi(69)], 2.14, 2600, .006)
te = t_axis(2.14)
place(end * np.minimum(1, te / .25) * np.minimum(1, (2.14 - te) / .5), 12.86, .42, rev=.7)
t = t_axis(.7)
place(np.sin(2 * np.pi * np.cumsum(500 * (4 ** (t / .7))) / SR) * np.sin(np.pi * t / .7) ** 2 * .22, 13.25, .5, pan=-.3, rev=.6)
shim = sum(np.sin(2 * np.pi * f * t_axis(.9)) for f in (2637, 3136, 3951)) / 3
place(shim * np.sin(np.pi * t_axis(.9) / .9) ** 2 * .25, 13.5, .5, pan=.3, rev=.8)
place(blip(1568, .16), 13.52, .15, rev=.5)
place(blip(2093, .16), 13.72, .13, rev=.5)

# --- lit rythmique : 100 BPM, temps à 0,1 + 0,6k (discret dès 2,5 s, plein de 4,3 à 10,3)
for k in range(4, 18):
    tb = .1 + .6 * k
    if k < 7:  # pulsation discrète sous le hero, jusqu'au clic
        place(kick(), tb, .14 + .05 * (k - 4), rev=.15)
        continue
    place(kick(), tb, .3 if k < 10 else .4, rev=.08)
    place(hat(), tb + .3, .1, pan=.4, rev=.1)
    if 6.1 <= tb <= 7.3:
        for s in (.15, .45):
            place(hat(.04), tb + s, .08, pan=-.4, rev=.1)

# ============================================================ MIXAGE
# réverbe : réponse impulsionnelle synthétique stéréo (2,2 s)
ir_t = t_axis(2.2)
ir = np.stack([lp(rng.standard_normal(len(ir_t)), 7000) * np.exp(-ir_t * 3.1) for _ in range(2)])
ir[:, :int(.012 * SR)] = 0
wet = np.stack([fftconvolve(send[c], ir[c])[:N] for c in range(2)])
wet /= np.max(np.abs(wet)) + 1e-9
mix = dry / (np.max(np.abs(dry)) + 1e-9) + wet * .35

mix = hp(mix, 35, 4)  # sous 35 Hz : inaudible sur téléphone, ne fait que manger la marge
mix = np.tanh(mix * 1.4) / np.tanh(1.4)  # saturation douce + limiteur
fade = np.ones(N)
nf = int(.35 * SR)
fade[-nf:] = np.linspace(1, 0, nf) ** 2
mix *= fade
mix *= .89 / np.max(np.abs(mix))

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sound.wav')
pcm = (mix.T * 32767).astype(np.int16)
with wave.open(out, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('ok ->', out)
