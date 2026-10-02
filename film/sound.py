"""Bande-son du film CinéMood (30 s, 100 BPM), entièrement synthétisée (aucun sample externe).

Acte 1 : nappe sombre en ré mineur, tic-tac, montée pendant l'accélération du tunnel, impact.
« On regarde quoi ? » : deux coups, aspiration. Logo : laser, boum, accord lumineux.
Acte 2 : le groove entre avec le portable ; clics de souris et taps calés sur les captures.
Filtrage : tension, un coup par palier du compteur, montée. Révélation : drop lumineux.
Fin : accord final qui s'ouvre, puis fondu.

Les repères (en temps) reprennent ceux de film.html ; les clics et taps sont relus dans les captures.
Usage : python3 sound.py  ->  build/sound.wav
"""
import json, os, re, wave
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 48000
DUR = 30.0
N = int(SR * DUR)
BPM = 100
B = 60 / BPM
rng = np.random.default_rng(8)
music = np.zeros((2, N)); drums = np.zeros((2, N)); fx = np.zeros((2, N)); send = np.zeros((2, N))

html = open(os.path.join(HERE, 'film.html'), encoding='utf-8').read()
assert f'const BPM = {BPM}' in html, 'le tempo doit être le même que dans film.html'


def b(n): return n * B
def T(d): return np.arange(int(d * SR)) / SR
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def noise(d): return rng.standard_normal(int(d * SR))
def midi(n): return 440 * 2 ** ((n - 69) / 12)


def put(bus, sig, t0, g=1.0, pan=0.0, rev=0.0):
    i = int(round(t0 * SR))
    if i >= N or i < 0:
        return
    sig = sig[:N - i] * g
    l, r = np.cos((pan + 1) * np.pi / 4) * np.sqrt(2), np.sin((pan + 1) * np.pi / 4) * np.sqrt(2)
    bus[0, i:i + len(sig)] += sig * l; bus[1, i:i + len(sig)] += sig * r
    if rev:
        send[0, i:i + len(sig)] += sig * l * rev; send[1, i:i + len(sig)] += sig * r * rev


# ---------------------------------------------------------------- instruments
def kick():
    t = T(.42); f = 44 + 140 * np.exp(-t * 36)
    return np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6.5) * 2.2) + lp(noise(.42), 4000) * np.exp(-t * 120) * .3

def clap():
    t = T(.3); env = sum(np.exp(-np.maximum(t - d, 0) * 80) * (t >= d) for d in (0, .01, .021)) / 3
    return bp(noise(.3), 1000, 5000) * (env + np.exp(-t * 14) * .35) * 1.4

def hat(open_=False):
    t = T(.24 if open_ else .045)
    return hp(noise(len(t) / SR), 8000) * np.exp(-t * (13 if open_ else 95))

def tick():
    t = T(.035)
    return np.sin(2 * np.pi * 3200 * t) * np.exp(-t * 240) + hp(noise(.035), 6000) * np.exp(-t * 300) * .3

def bass(f, d):
    t = T(d); ph = 2 * np.pi * f * t
    return lp(np.tanh(1.8 * np.sin(ph)) + .3 * np.sin(2 * ph), 800) * np.minimum(1, t / .006) * np.minimum(1, (d - t) / .03)

def pluck(f, d=.5):
    t = T(d)
    return lp((2 * ((f * t) % 1) - 1) * np.exp(-t * 7), 3000) * np.minimum(1, t / .003)

def pad(notes, d, cut=1600):
    t = T(d)
    out = sum(2 * (((midi(n) * (1 + dt)) * t + rng.random()) % 1) - 1 for n in notes for dt in (-.005, 0, .005))
    return lp(out / (3 * len(notes)), cut)

def bell(f, d=2.4):
    t = T(d)
    return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * (1.2 + m * .6)) for m, a in ((1, 1), (2.0, .35), (3.01, .15), (5.4, .06))) * np.minimum(1, t / .004)

def boom(d=2.2, f0=120, f1=34):
    t = T(d); f = f1 + (f0 - f1) * np.exp(-t * 7)
    return np.tanh((np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.9) + lp(noise(d), 2400) * np.exp(-t * 40) * .6) * 1.6)

def impact(d=2.0):
    t = T(d)
    return boom(d) + bp(noise(d), 700, 7000) * np.exp(-t * 12) * .55

def whoosh(d, f0, f1, rise=True):
    x = noise(d); out = np.zeros_like(x); zi = np.zeros((2, 2)); nb = int(np.ceil(len(x) / 256))
    for k in range(nb):
        fc = f0 * (f1 / f0) ** (k / max(1, nb - 1))
        out[k * 256:(k + 1) * 256], zi = sosfilt(butter(2, [fc / 1.6, min(fc * 1.6, SR / 2 - 100)], 'band', fs=SR, output='sos'), x[k * 256:(k + 1) * 256], zi=zi)
    e = np.linspace(0, 1, len(x))
    return out * ((e ** 2.2) * np.minimum(1, (1 - e) * 40) if rise else ((1 - e) ** 2.5) * np.minimum(1, e * 40))

def riser(d, f0=80, f1=900):
    t = T(d); f = f0 * (f1 / f0) ** (t / d)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * (t / d) ** 2 * .6 + whoosh(d, 200, 9000) * .8

def click():
    t = T(.04)
    return bp(noise(.04), 1500, 6000) * np.exp(-t * 200) + np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 260) * .4

def over(*sigs):
    """Superpose des sons de durées différentes."""
    out = np.zeros(max(len(x) for x in sigs))
    for x in sigs:
        out[:len(x)] += x
    return out


def pop(f=900):
    t = T(.1)
    return np.sin(2 * np.pi * np.cumsum(f * (1 + np.exp(-t * 60))) / SR) * np.exp(-t * 35)


# ---------------------------------------------------------------- clics et taps relus dans les captures
def load_rec(path):
    return json.loads(open(path).read().split('=', 1)[1].rstrip().rstrip(';'))

RD = load_rec(os.path.join(HERE, 'rec-desktop', 'rec.js'))
RM = load_rec(os.path.join(HERE, '..', 'ugc', 'rec', 'rec.js'))
ev = lambda rec, ty: next(e['t'] for e in rec['events'] if e['type'] == ty)
# mêmes clés que KD / KM dans film.html (temps film -> temps capture)
KD = [(b(17), .6), (b(19.5), 2.7), (b(23), 9.5), (b(29), ev(RD, 'results') - .1)]
KM = [(b(23), 6.2), (b(29), ev(RM, 'results'))]

def inv(K, r):
    for (o0, r0), (o1, r1) in zip(K, K[1:]):
        if r0 <= r <= r1:
            return o0 + (o1 - o0) * (r - r0) / (r1 - r0)
    return None

CLICKS = [x for x in (inv(KD, e['t']) for e in RD['events'] if e['type'] == 'click') if x]
TAPS = [x for x in (inv(KM, e['t']) for e in RM['events'] if e['type'] == 'tap') if x]

# ---------------------------------------------------------------- acte 1 : le tunnel (0 – 6 s)
put(music, pad([38, 50, 53, 57], 6.2, 700) * np.minimum(1, T(6.2) / 1.5), 0, .5, rev=.5)      # ré mineur, grave
put(music, lp(np.sin(2 * np.pi * midi(26) * T(6.2)), 200) * np.minimum(1, T(6.2) / 2), 0, .45)
for at, n in ((.5, 74), (2.5, 72), (4.2, 69)):                                                  # une note par phrase
    put(music, bell(midi(n)), at, .22, pan=.2, rev=.7)
for k in range(10):                                                                              # tic-tac qui accélère
    put(drums, tick(), b(k * .5), .35, pan=-.3)
tt = 3.0
while tt < 6.0:
    put(drums, tick(), tt, .4 + .3 * (tt - 3) / 3, pan=-.3)
    tt += .3 * (1 - .8 * (tt - 3) / 3)
put(fx, riser(2.6), 3.4, .9, rev=.3)
put(fx, impact(2.4), 6.0, .9, rev=.5)

# ---------------------------------------------------------------- « on regarde quoi ? » (b10 – b13)
put(fx, boom(1.4, 140, 45), b(10), .8, rev=.4)
put(drums, clap(), b(10), .5, rev=.4)
put(fx, impact(1.8), b(11), 1.0, rev=.5)
suck = whoosh(b(1.5), 6000, 300, False)[::-1]
put(fx, suck, b(12.4) - .3, .5)

# ---------------------------------------------------------------- logo (b13 – b17)
t = T(b(.9)); laser = np.sin(2 * np.pi * np.cumsum(300 * 5 ** (t / b(.9))) / SR) * np.sin(np.pi * t / b(.9)) ** 2
put(fx, laser * .35 + whoosh(b(.9), 400, 7000) * .5, b(12.7), .6, rev=.4)
put(fx, impact(2.6), b(13.9), .9, rev=.6)
put(music, pad([50, 57, 62, 65, 69], b(3.2), 2600) * np.minimum(1, T(b(3.2)) / .4), b(13.9), .38, rev=.7)   # accord qui s'ouvre
for k, n in enumerate((74, 77, 81, 86)):
    put(music, bell(midi(n), 1.8), b(14) + k * .09, .14, pan=-.4 + k * .25, rev=.7)

# ---------------------------------------------------------------- acte 2 : le groove entre avec le portable (b17 – b29)
CH = [(50, [62, 65, 69]), (46, [62, 65, 70]), (53, [60, 65, 69]), (48, [60, 64, 67])]   # Dm Bb F C


def groove(n0, n1, gain=1.0, claps=True, hats=True, arps=True, bright=False):
    n = n0
    while n < n1 - 1e-6:
        t0 = b(n); root, ch = CH[int((n - n0) // 2) % 4]
        put(drums, kick(), t0, .9 * gain)
        if claps and int(n) % 2 == 1:
            put(drums, clap(), t0, .5 * gain, rev=.25)
        if hats:
            for s in (.5,) if not bright else (.25, .5, .75):
                put(drums, hat(), t0 + b(s), (.16 if s == .5 else .08) * gain, pan=.35)
        put(music, bass(midi(root - 12), b(.9)), t0, .5 * gain)
        if arps:
            for k, m in enumerate(ch + [ch[0] + 12]):
                put(music, pluck(midi(m + (12 if bright else 0)), .45), t0 + b(k / 4), .1 * gain, pan=(k - 1.5) * .3, rev=.45)
        n += 1


put(fx, whoosh(1.2, 200, 3000) * .7, b(16.9), .5, rev=.3)
groove(17, 23, gain=.75, claps=False)
put(fx, over(whoosh(.8, 500, 5000), whoosh(.6, 5000, 500, False) * .6), b(23) - .4, .5, pan=.5, rev=.3)   # arrivée de l'iPhone
groove(23, 29, gain=.9)
for c in CLICKS:
    put(fx, click(), c, .45, pan=-.2)
for tp in TAPS:
    put(fx, pop(880), tp, .3, pan=.45)

# ---------------------------------------------------------------- filtrage : tension et paliers (b29 – b33)
put(music, pad([38, 50, 53, 57], b(4), 900), b(29.3), .4, rev=.5)
for n in np.arange(29.3, 33, 1):                                   # cœur qui bat sous le compteur
    put(drums, kick() * .8, b(n), .55, rev=.2); put(drums, kick() * .5, b(n) + .16, .4)
for k, n in enumerate((30.4, 31.5, 32.4)):
    put(fx, boom(1.0, 150 - 20 * k, 48), b(n), .55 + .15 * k, rev=.4)
    put(drums, tick(), b(n), .6)
for k in range(16):
    put(drums, clap() * .5, b(31.5 + k * 1.5 / 16), .08 + .35 * k / 16, rev=.2)
put(fx, riser(b(3.6), 60, 1200), b(29.4), .7, rev=.3)

# ---------------------------------------------------------------- révélation : drop lumineux (b33 – b43)
put(fx, impact(2.8), b(33), 1.1, rev=.6)
put(music, pad([62, 65, 69, 74, 77], b(5), 3000) * np.minimum(1, T(b(5)) / .2), b(33), .32, rev=.6)
groove(33, 43, gain=1.0, bright=True)
t = T(b(1.4)); up = np.sin(2 * np.pi * np.cumsum(midi(69) * 2 ** (t / b(1.4))) / SR) * np.sin(np.pi * t / b(1.4)) ** 2
put(music, up * .2, b(33.8), .5, rev=.6)                           # le pourcentage monte
put(music, bell(midi(81)) + bell(midi(86)) * .5, b(35.8), .2, rev=.7)
put(fx, over(whoosh(.7, 600, 6000), whoosh(.5, 6000, 600, False) * .6), b(38) - .35, .45, pan=-.4, rev=.3)

# ---------------------------------------------------------------- fin (b43 – 30 s)
put(fx, whoosh(b(1), 300, 8000), b(42.4), .55, rev=.3)
put(fx, impact(3.0), b(43.6), .9, rev=.7)
put(music, pad([50, 57, 62, 65, 69, 74], DUR - b(43.6), 3200) * np.minimum(1, T(DUR - b(43.6)) / .3), b(43.6), .4, rev=.7)
for k, n in enumerate((74, 77, 81, 86, 89)):
    put(music, bell(midi(n), 2.6), b(43.7) + k * .11, .13, pan=-.5 + k * .25, rev=.8)
groove(44, 48, gain=.6, claps=False, bright=True)
put(music, bell(midi(86), 3), b(46.1), .18, rev=.8)                 # le bouton apparaît

# ---------------------------------------------------------------- mixage
ir_t = T(2.4)
ir = np.stack([lp(rng.standard_normal(len(ir_t)), 7000) * np.exp(-ir_t * 2.8) for _ in range(2)])
wet = np.stack([fftconvolve(send[c], ir[c])[:N] for c in range(2)])
duck = np.ones(N)                                      # la musique respire sous chaque kick
for n in np.arange(17, 48, 1):
    i = int(b(n) * SR); d = np.linspace(0, 1, int(.2 * SR))
    duck[i:i + len(d)] = np.minimum(duck[i:i + len(d)], (.5 + .5 * d ** .7)[:max(0, N - i)])
norm = lambda x: x / (np.max(np.abs(x)) + 1e-9)
mix = norm(music) * duck * .45 + norm(drums) * .5 + norm(fx) * .95 + norm(wet) * .25
mix = hp(mix, 32, 4)
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
fade = np.ones(N); nf = int(1.2 * SR); fade[-nf:] = np.linspace(1, 0, nf) ** 2
fade[:int(.05 * SR)] = np.linspace(0, 1, int(.05 * SR))
mix *= fade * (.89 / np.max(np.abs(mix)))

os.makedirs(os.path.join(HERE, 'build'), exist_ok=True)
out = os.path.join(HERE, 'build', 'sound.wav')
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
print('ok ->', out, f'({len(CLICKS)} clics, {len(TAPS)} taps)')
