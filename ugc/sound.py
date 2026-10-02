"""Bande-son de la pub UGC CinéMood, entièrement synthétisée (aucun sample externe).

Musique : ~119 BPM, La mineur (Am – F – C – G), le « drop » tombe sur l'arrivée du site (2,4 s)
et la révélation du n°1 (12,95 s) tombe sur un temps. Effets : un « pop » par tap (temps lus
dans rec/rec.js et remappés avec les clés KF de ad.html), souffles sur les défilements,
impacts sur les coupes.

Usage : python3 sound.py  ->  build/sound.wav
"""
import json, os, re, wave
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 48000
DUR = 22.6
N = int(SR * DUR)
rng = np.random.default_rng(11)

music = np.zeros((2, N))
fx = np.zeros((2, N))
send = np.zeros((2, N))


def T(d):
    return np.arange(int(d * SR)) / SR


def lp(x, f, o=2):
    return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)


def hp(x, f, o=2):
    return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)


def bp(x, lo, hi, o=2):
    return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)


def noise(d):
    return rng.standard_normal(int(d * SR))


def put(bus, sig, t0, g=1.0, pan=0.0, rev=0.0):
    i = int(t0 * SR)
    if i >= N or i < 0:
        return
    sig = sig[:N - i] * g
    l, r = np.cos((pan + 1) * np.pi / 4) * np.sqrt(2), np.sin((pan + 1) * np.pi / 4) * np.sqrt(2)
    bus[0, i:i + len(sig)] += sig * l
    bus[1, i:i + len(sig)] += sig * r
    if rev:
        send[0, i:i + len(sig)] += sig * l * rev
        send[1, i:i + len(sig)] += sig * r * rev


def midi(n):
    return 440 * 2 ** ((n - 69) / 12)


# ---------------------------------------------------------------- instruments
def kick():
    t = T(.42)
    f = 48 + 140 * np.exp(-t * 38)
    return np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6.5) * 2.2) + lp(noise(.42), 3000) * np.exp(-t * 90) * .3


def clap():
    t = T(.3)
    env = sum(np.exp(-np.maximum(t - d, 0) * 70) * (t >= d) for d in (0, .011, .022)) / 3
    return bp(noise(.3), 900, 4500) * (env + np.exp(-t * 14) * .35) * 1.4


def hat(d=.05, open_=False):
    t = T(d if not open_ else .22)
    return hp(noise(len(t) / SR), 7500) * np.exp(-t * (80 if not open_ else 16))


def bass(f, d):
    t = T(d)
    ph = 2 * np.pi * f * t
    sig = np.sin(ph) + .35 * np.tanh(3 * np.sin(ph))
    env = np.minimum(1, t / .008) * np.minimum(1, (d - t) / .03)
    return lp(sig, 700) * env


def pluck(f, d=.32):
    t = T(d)
    saw = 2 * ((f * t) % 1) - 1
    return lp(saw * np.exp(-t * 9), 3200) * np.minimum(1, t / .003)


def pad(freqs, d, cut=1300):
    t = T(d)
    out = sum(2 * (((f * (1 + dt)) * t + rng.random()) % 1) - 1 for f in freqs for dt in (-.005, 0, .005))
    return lp(out / (3 * len(freqs)), cut)


def boom(d=1.6, f0=120, f1=38):
    t = T(d)
    f = f1 + (f0 - f1) * np.exp(-t * 8)
    return np.tanh((np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.4) + lp(noise(d), 2500) * np.exp(-t * 50) * .6) * 1.6)


def whoosh(d, f0, f1, rise=True):
    x = noise(d)
    out = np.zeros_like(x)
    nb = int(np.ceil(len(x) / 256))
    zi = np.zeros((2, 2))
    for b in range(nb):
        fc = f0 * (f1 / f0) ** (b / max(1, nb - 1))
        sos = butter(2, [fc / 1.6, min(fc * 1.6, SR / 2 - 100)], 'band', fs=SR, output='sos')
        out[b * 256:(b + 1) * 256], zi = sosfilt(sos, x[b * 256:(b + 1) * 256], zi=zi)
    k = np.linspace(0, 1, len(x))
    return out * ((k ** 2.2) * np.minimum(1, (1 - k) * 40) if rise else ((1 - k) ** 2.5) * np.minimum(1, k * 40))


def pop(f=900):
    t = T(.12)
    ph = 2 * np.pi * np.cumsum(f * (1 + 1.2 * np.exp(-t * 60))) / SR
    return np.sin(ph) * np.exp(-t * 32) + bp(noise(.12), 2000, 7000) * np.exp(-t * 200) * .3


def tick():
    t = T(.03)
    return np.sin(2 * np.pi * 2600 * t) * np.exp(-t * 250)


def bell(f, d=1.6):
    t = T(d)
    return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * (1.8 + m * .8)) for m, a in ((1, 1), (2.76, .3), (5.4, .12)))


# ---------------------------------------------------------------- repères de la pub
html = open(os.path.join(HERE, 'ad.html'), encoding='utf-8').read()
KF = [tuple(map(float, m)) for m in re.findall(r'\[(\d+\.\d+), (\d+\.\d+)\]', html.split('const KF = [')[1].split('];')[0])]


def out_t(r):
    for (o0, r0), (o1, r1) in zip(KF, KF[1:]):
        if r <= r1:
            return o0 + (o1 - o0) * min(1, max(0, (r - r0) / (r1 - r0)))
    return KF[-1][0]


rec = json.loads(open(os.path.join(HERE, 'rec', 'rec.js')).read().split('=', 1)[1].rstrip().rstrip(';'))
TAPS = [out_t(e['t']) for e in rec['events'] if e['type'] == 'tap']

BEAT = (12.95 - 2.4) / 21          # ≈ 0,502 s : le n°1 tombe sur un temps
DROP, BREAK_A, BREAK_B, END = 2.4, 11.45, 12.95, 18.6
CHORDS = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [48, 52, 55]), (55, [55, 59, 62])]  # Am F C G

# ---------------------------------------------------------------- musique
# accroche : nappe tendue + tic-tac qui accélère pendant que le compteur monte à 45 min
put(music, pad([midi(45), midi(57), midi(60), midi(64)], 2.5, 900) * np.minimum(1, T(2.5) / .05), 0, .85, rev=.5)
put(fx, boom(1.4, 150, 40), 0.0, .9, rev=.4)  # l'accroche frappe dès la première image
put(fx, bell(440, 1.4) * .6 + bell(659.3, 1.4) * .3, 0.0, .3, rev=.6)
for i, tt in enumerate(np.cumsum([.3] + [max(.06, .22 * .82 ** k) for k in range(14)])):
    if tt < 1.05:
        put(fx, tick(), tt, .75, pan=(-1) ** i * .3)
put(fx, boom(.9, 130, 60) * .5, 1.25, .6, rev=.3)  # « …et au final »
put(fx, whoosh(1.0, 300, 8000, True), 1.4, .7, rev=.3)
put(fx, whoosh(.35, 6000, 500, False), 2.3, .5, rev=.2)

beat_i = 0
t = DROP
while t < DUR - .05:
    in_break = BREAK_A <= t < BREAK_B - .01
    bar, pos = divmod(beat_i, 4)
    root, chord = CHORDS[bar % 4]
    if not in_break:
        if pos in (0, 2):
            put(music, kick(), t, .95)
        if pos == 2 and bar % 2 == 1:
            put(music, kick(), t + BEAT * .75, .6)
        if pos in (1, 3):
            put(music, clap(), t, .55, rev=.25)
        for s in (0, .5):
            put(music, hat(), t + BEAT * s, .16 if s else .1, pan=.35)
        if pos == 3 and bar % 2 == 1:
            put(music, hat(open_=True), t + BEAT * .5, .14, pan=-.35)
        put(music, bass(midi(root - 24), BEAT * .9), t, .55)
        if pos in (1, 3):
            put(music, bass(midi(root - 12), BEAT * .4), t + BEAT * .5, .3)
        for k, n in enumerate(chord + [chord[1] + 12]):
            put(music, pluck(midi(n + 12)), t + BEAT * k / 4, .12, pan=(k - 1.5) * .3, rev=.35)
    beat_i += 1
    t = DROP + beat_i * BEAT

# pause « et le n°1 c'est… » : roulement de caisse qui accélère + montée
k, tt = 0, BREAK_A
while tt < BREAK_B - .02:
    put(music, clap() * .6, tt, .15 + .5 * (tt - BREAK_A) / (BREAK_B - BREAK_A), pan=.1)
    tt += BEAT / (2 if tt < BREAK_A + 1 else 4)
put(fx, whoosh(BREAK_B - BREAK_A, 200, 9000, True), BREAK_A, .7, rev=.3)
put(music, pad([midi(45), midi(52), midi(57), midi(64)], BREAK_B - BREAK_A, 2000) * np.linspace(.2, 1, int((BREAK_B - BREAK_A) * SR)), BREAK_A, .35, rev=.5)

# ---------------------------------------------------------------- effets
put(fx, boom(1.6), DROP, .9, rev=.35)
for tp in TAPS:
    put(fx, pop(820 + rng.random() * 160), tp, .32, pan=-.15, rev=.1)
# défilements
put(fx, whoosh(.8, 500, 4000, True) * .7, 10.6, .4, rev=.2)
put(fx, whoosh(.7, 4000, 600, False), 12.21, .4, rev=.2)
put(fx, whoosh(2.0, 400, 5000, True) * .6, 16.6, .35, rev=.2)
# arrivées des résultats et du n°1
put(fx, boom(1.2, 140, 50) * .6, 9.6, .7, rev=.3)
put(fx, bell(1318.5) * .5, 9.62, .5, pan=.3, rev=.5)
put(fx, boom(2.0, 120, 34), BREAK_B, 1.0, rev=.4)
put(fx, bell(880) + bell(1318.5) * .6, BREAK_B, .4, rev=.6)
# carte de fin
put(fx, whoosh(.5, 300, 7000, True), END - .5, .6, rev=.3)
put(fx, boom(2.2, 110, 32), END, .95, rev=.45)
put(fx, bell(1760, 1.2) * .5, 19.6, .35, rev=.6)
put(music, pad([midi(45), midi(57), midi(60), midi(64), midi(69)], DUR - END, 2600) * np.minimum(1, T(DUR - END) / .3), END, .3, rev=.6)

# ---------------------------------------------------------------- mixage
ir_t = T(1.8)
ir = np.stack([lp(rng.standard_normal(len(ir_t)), 7000) * np.exp(-ir_t * 3.6) for _ in range(2)])
wet = np.stack([fftconvolve(send[c], ir[c])[:N] for c in range(2)])
wet /= np.max(np.abs(wet)) + 1e-9

# ducking : la musique s'efface un peu sous les gros impacts
duck = np.ones(N)
for t0 in (DROP, 9.6, BREAK_B, END):
    i = int(t0 * SR)
    d = np.linspace(0, 1, int(.5 * SR))
    duck[i:i + len(d)] = np.minimum(duck[i:i + len(d)], .55 + .45 * d[:N - i])

m = music / (np.max(np.abs(music)) + 1e-9)
f = fx / (np.max(np.abs(fx)) + 1e-9)
mix = m * duck * .62 + f * .75 + wet * .28
mix = hp(mix, 35, 4)
mix = np.tanh(mix * 1.5) / np.tanh(1.5)
fade = np.ones(N)
nf = int(.6 * SR)
fade[-nf:] = np.linspace(1, 0, nf) ** 2
mix *= fade * (.89 / np.max(np.abs(mix)))

os.makedirs(os.path.join(HERE, 'build'), exist_ok=True)
out = os.path.join(HERE, 'build', 'sound.wav')
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
print('ok ->', out, f'({len(TAPS)} taps, temps {BEAT:.3f} s)')
