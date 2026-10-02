"""Bande-son de « La course » v3 : un morceau à 128 BPM monté au temps près, entièrement synthétisé.

Accroche (montée) -> drop à l'entrée des téléphones -> montée par ouverture de filtre ->
second drop lumineux quand CinéMood trouve -> section sombre (38/43/47 min) -> coups du verdict ->
fin lumineuse. Les coupes, les taps et les messages sont lus dans v3.html et ../ugc/rec/rec.js.

Usage : python3 sound_v3.py  ->  build/v3-sound.wav
"""
import json, os, re, wave
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 48000
DUR = 27 * 60 / 128 + 3.0
N = int(SR * DUR)
BPM = 128
B = 60 / BPM
rng = np.random.default_rng(3)

music = np.zeros((2, N))   # passe dans le filtre de montée
drums = np.zeros((2, N))
fx = np.zeros((2, N))
send = np.zeros((2, N))


def b(n):
    return n * B


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
    i = int(round(t0 * SR))
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
    t = T(.38)
    f = 46 + 150 * np.exp(-t * 40)
    return np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) * 2.4) + lp(noise(.38), 4000) * np.exp(-t * 120) * .35


def clap():
    t = T(.28)
    env = sum(np.exp(-np.maximum(t - d, 0) * 80) * (t >= d) for d in (0, .01, .02)) / 3
    return bp(noise(.28), 1000, 5000) * (env + np.exp(-t * 16) * .35) * 1.5


def snare():
    t = T(.2)
    return bp(noise(.2), 1500, 7000) * np.exp(-t * 28) + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * .5


def hat(open_=False):
    t = T(.22 if open_ else .045)
    return hp(noise(len(t) / SR), 8000) * np.exp(-t * (14 if open_ else 95))


def tick():
    t = T(.03)
    return np.sin(2 * np.pi * 3600 * t) * np.exp(-t * 260) + hp(noise(.03), 6000) * np.exp(-t * 300) * .3


def bass(f, d):
    t = T(d)
    ph = 2 * np.pi * f * t
    sig = np.tanh(2.2 * np.sin(ph)) + .3 * np.sin(2 * ph)
    return lp(sig, 900) * np.minimum(1, t / .005) * np.minimum(1, (d - t) / .02)


def stab(notes, d=.18):
    t = T(d)
    out = sum(2 * ((midi(n) * (1 + dt) * t) % 1) - 1 for n in notes for dt in (-.006, .006))
    return lp(out / (2 * len(notes)), 3200) * np.exp(-t * 14) * np.minimum(1, t / .003)


def pad(notes, d, cut=1600):
    t = T(d)
    out = sum(2 * (((midi(n) * (1 + dt)) * t + rng.random()) % 1) - 1 for n in notes for dt in (-.005, 0, .005))
    return lp(out / (3 * len(notes)), cut)


def boom(d=1.8, f0=130, f1=36):
    t = T(d)
    f = f1 + (f0 - f1) * np.exp(-t * 8)
    return np.tanh((np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2) + lp(noise(d), 2500) * np.exp(-t * 45) * .7) * 1.7)


def impact(d=1.6):
    t = T(d)
    return boom(d) + bp(noise(d), 800, 7000) * np.exp(-t * 14) * .6


def whoosh(d, f0, f1, rise=True):
    x = noise(d)
    out = np.zeros_like(x)
    zi = np.zeros((2, 2))
    nb = int(np.ceil(len(x) / 256))
    for k in range(nb):
        fc = f0 * (f1 / f0) ** (k / max(1, nb - 1))
        sos = butter(2, [fc / 1.6, min(fc * 1.6, SR / 2 - 100)], 'band', fs=SR, output='sos')
        out[k * 256:(k + 1) * 256], zi = sosfilt(sos, x[k * 256:(k + 1) * 256], zi=zi)
    e = np.linspace(0, 1, len(x))
    return out * ((e ** 2.2) * np.minimum(1, (1 - e) * 40) if rise else ((1 - e) ** 2.5) * np.minimum(1, e * 40))


def pop(f=900):
    t = T(.1)
    return np.sin(2 * np.pi * np.cumsum(f * (1 + np.exp(-t * 60))) / SR) * np.exp(-t * 35)


def notif(up=True):
    a, c = (1318.5, 1760) if up else (1174.7, 987.8)
    out = np.zeros(int(.3 * SR))
    for k, f in enumerate((a, c)):
        t = T(.18)
        s = (np.sin(2 * np.pi * f * t) + .3 * np.sin(4 * np.pi * f * t)) * np.exp(-t * 20)
        out[int(k * .08 * SR):int(k * .08 * SR) + len(s)] += s
    return out


def bell(f, d=1.8):
    t = T(d)
    return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * (1.6 + m * .7)) for m, a in ((1, 1), (2.76, .3), (5.4, .12)))


def tape_stop(d=.45):
    t = T(d)
    f = 240 * (1 - t / d) ** 2 + 20
    return np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * 2) * (1 - t / d)


# ---------------------------------------------------------------- repères lus dans v2.html et la capture
html = open(os.path.join(HERE, 'v3.html'), encoding='utf-8').read()
assert f'const BPM = {BPM}' in html, 'le tempo doit être le même que dans v3.html'
SHOTS = [(float(n), m) for n, m in re.findall(r"\[([\d.]+), '(\w+)'\]", html.split('const SHOTS = [')[1].split('];')[0])]
rec = json.loads(open(os.path.join(HERE, '..', 'ugc', 'rec', 'rec.js')).read().split('=', 1)[1].rstrip().rstrip(';'))
R_FOUND = next(e['t'] for e in rec['events'] if e['type'] == 'results')
SPEED = R_FOUND / (b(16) - b(4))
TAPS = [b(4) + e['t'] / SPEED for e in rec['events'] if e['type'] == 'tap']
N_MSG = len(re.findall(r"\['(?:me|you)', '", html))
MSGS = [(b(4.5 + i), i % 2 == 0) for i in range(N_MSG)] + [(b(21), True)]

# ---------------------------------------------------------------- 1. accroche (b0 – b4)
put(fx, impact(), 0, .8, rev=.4)
put(fx, boom(.8, 160, 60), b(1), .45, rev=.3)  # l'horloge bascule
put(fx, bp(noise(.08), 1500, 6000) * np.exp(-T(.08) * 60), b(1), .6)
put(fx, bell(880, 2) + bell(1318.5, 2) * .4, 0, .3, rev=.6)
for k in range(8):
    put(drums, tick(), b(k * .5), .7, pan=-.2)
for k, n in enumerate((2, 2.5, 3)):          # « ON » « REGARDE » « QUOI ? »
    put(drums, kick(), b(n), .9)
    put(drums, snare(), b(n), .5 + .15 * k, rev=.3)
for k in range(8):                           # roulement vers le drop
    put(drums, snare(), b(3 + k / 8), .15 + .4 * k / 8, rev=.2)
put(fx, whoosh(b(2), 200, 9000), b(2), .8, rev=.3)
put(music, pad([45, 52, 57, 60], b(4), 900) * np.linspace(.15, 1, int(b(4) * SR)), 0, .3, rev=.4)

# ---------------------------------------------------------------- 2. drop + course (b4 – b16)
RIFF_MIN = [45, 45, 48, 45, 43, 45, 40, 43]          # La mineur, en croches
CH_MIN = [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]]  # Am F G Em
RIFF_MAJ = [48, 48, 52, 48, 43, 47, 45, 43]          # lumineux : C G Am F
CH_MAJ = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]]


def groove(n0, n1, riff, chords, full=True, ticks=False, gain=1.0):
    n = n0
    while n < n1 - 1e-6:
        t0 = b(n)
        put(drums, kick(), t0, .95 * gain)
        if full:
            if int(n) % 2 == 1:
                put(drums, clap(), t0, .6 * gain, rev=.2)
            for s in (0, .25, .5, .75):
                put(drums, hat(), t0 + b(s), (.18 if s == .5 else .09) * gain, pan=.35)
            put(drums, hat(True), t0 + b(.5), .1 * gain, pan=-.35)
            for h in (0, .5):
                note = riff[int((n - n0) * 2 + h * 2) % len(riff)] - 12
                put(music, bass(midi(note), b(.45)), t0 + b(h), .55 * gain)
            if int(n) % 2 == 0:
                put(music, stab(chords[int((n - n0) // 2) % 4]), t0 + b(.5), .3 * gain, rev=.4)
        if ticks:
            for s in (0, .25, .5, .75):
                put(drums, tick(), t0 + b(s), .22, pan=-.3)
        n += 1


put(fx, impact(2.0), b(4), 1.0, rev=.4)
groove(4, 16, RIFF_MIN, CH_MIN, ticks=True)
for n, m in SHOTS:
    if m in ('L', 'R') and 4 < n < 20:
        w = .24 if n < 14 else .12  # coupes au demi-temps : souffles plus courts, comme à l'image
        put(fx, whoosh(w, 900, 7000) + whoosh(w, 7000, 900, False), b(n) - w / 2, .35, pan=.5 if m == 'R' else -.5)
for t0 in TAPS:
    put(fx, pop(850), t0, .35, pan=.4, rev=.1)
for at, me in MSGS:
    put(fx, notif(me), at, .3, pan=-.4, rev=.2)
for n in np.arange(4.75, 16, 1):
    put(fx, bp(noise(.12), 2000, 7000) * np.exp(-T(.12) * 30), b(n), .1, pan=-.5)  # coups de pouce
for k in range(16):                          # roulement + montée avant « trouvé »
    put(drums, snare(), b(15 + k / 16), .1 + .45 * k / 16, rev=.2)
put(fx, whoosh(b(4), 300, 10000), b(12), .7, rev=.3)

# ---------------------------------------------------------------- 3. trouvé : second drop lumineux (b16 – b20)
put(fx, impact(2.0), b(16), 1.1, rev=.5)
put(fx, bell(1046.5) + bell(1568) * .6 + bell(2093) * .3, b(16.5), .5, pan=.3, rev=.6)
groove(16, 20, RIFF_MAJ, CH_MAJ)
put(music, pad([60, 64, 67, 72], b(4), 2600), b(16), .35, rev=.5)

# ---------------------------------------------------------------- 4. retour sombre : 38 / 43 / 47 min (b20 – b23)
put(fx, whoosh(.3, 6000, 300, False), b(20) - .12, .7)
for k, n in enumerate((20, 21, 22)):
    put(fx, boom(1.2, 110 - 10 * k, 34), b(n), .8 + .1 * k, rev=.3)
    put(drums, snare(), b(n), .5, rev=.3)
for n in np.arange(20, 23, .25):
    put(drums, tick(), b(n), .35, pan=-.3)
put(music, pad([33, 45, 48, 52], b(3), 600), b(20), .45, rev=.4)
put(fx, whoosh(b(.75), 400, 8000), b(22.25), .6)

# ---------------------------------------------------------------- 5. verdict (b23 – b29)
put(fx, impact(), b(23), 1.0, rev=.4)
put(fx, whoosh(.2, 2000, 8000) + snare() * .5, b(23.5), .7, rev=.3)
put(fx, impact(), b(24), 1.0, rev=.4)
put(fx, bell(880) + bell(1318.5) * .7, b(24), .45, rev=.6)
put(music, pad([57, 61, 64, 69], b(1), 2400), b(24), .3, rev=.5)
for k, n in enumerate((25, 25.5, 26)):          # « RÉCUPÈRE » « TES » « SOIRÉES. »
    put(drums, kick(), b(n), 1.0)
    put(drums, clap(), b(n), .55 + .1 * k, rev=.3)
    put(music, stab([57 + 2 * k, 61 + 2 * k, 64 + 2 * k], .3), b(n), .4, rev=.4)
put(fx, whoosh(b(1), 400, 9000), b(26), .6)

# ---------------------------------------------------------------- 6. fin lumineuse (b29 – fin)
put(fx, impact(2.4), b(27), 1.0, rev=.5)
groove(27, (DUR - .3) / B, RIFF_MAJ, CH_MAJ, gain=.8)
put(music, pad([60, 64, 67, 72, 76], DUR - b(27), 3000), b(27), .35, rev=.6)
put(fx, bell(1568, 1.5) * .6, b(28.5), .3, rev=.6)

# ---------------------------------------------------------------- mixage
# montée par ouverture de filtre sur la musique (b12 – b16)
lo = music.copy()
seg = slice(int(b(12) * SR), int(b(16) * SR))
for c in range(2):
    x = music[c, seg]
    nb = int(np.ceil(len(x) / 512))
    zi = np.zeros((2, 2))
    out = np.zeros_like(x)
    for k in range(nb):
        fc = 300 * (12000 / 300) ** (k / max(1, nb - 1))
        out[k * 512:(k + 1) * 512], zi = sosfilt(butter(4, min(fc, SR / 2 - 200), 'low', fs=SR, output='sos'), x[k * 512:(k + 1) * 512], zi=zi)
    lo[c, seg] = out

# sidechain : la musique respire sous chaque kick
duck = np.ones(N)
for n in np.arange(4, DUR / B, 1):
    i = int(b(n) * SR)
    d = np.linspace(0, 1, int(.18 * SR))
    duck[i:i + len(d)] = np.minimum(duck[i:i + len(d)], (.45 + .55 * d ** .7)[:max(0, N - i)])

ir_t = T(1.6)
ir = np.stack([lp(rng.standard_normal(len(ir_t)), 7000) * np.exp(-ir_t * 4) for _ in range(2)])
wet = np.stack([fftconvolve(send[c], ir[c])[:N] for c in range(2)])
norm = lambda x: x / (np.max(np.abs(x)) + 1e-9)
mix = norm(lo) * duck * .4 + norm(drums) * .55 + norm(fx) * .95 + norm(wet) * .2
mix = hp(mix, 32, 4)
mix = np.tanh(mix * 1.1) / np.tanh(1.1)  # saturation légère : les impacts doivent dépasser du groove
fade = np.ones(N)
nf = int(.5 * SR)
fade[-nf:] = np.linspace(1, 0, nf) ** 2
mix *= fade * (.89 / np.max(np.abs(mix)))

os.makedirs(os.path.join(HERE, 'build'), exist_ok=True)
out = os.path.join(HERE, 'build', 'v3-sound.wav')
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
print('ok ->', out, f'({len(TAPS)} taps, {len(MSGS)} messages, capture ×{SPEED:.2f})')
