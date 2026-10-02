"""Bande-son de « La course », entièrement synthétisée (aucun sample externe).

Tic-tac d'horloge qui s'accélère avec le chrono de gauche, notification à chaque message,
carillon quand CinéMood trouve, arrêt net du tic-tac au verdict, musique lumineuse sur la fin.
Les repères (messages, départ, résultat) sont lus dans scene.html et ../ugc/rec/rec.js.

Usage : python3 sound.py  ->  build/sound.wav
"""
import json, os, re, wave
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 48000
DUR = 26.0
N = int(SR * DUR)
rng = np.random.default_rng(5)
bus = np.zeros((2, N))
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


def put(sig, t0, g=1.0, pan=0.0, rev=0.0):
    i = int(t0 * SR)
    if i >= N or i < 0:
        return
    sig = sig[:N - i] * g
    l, r = np.cos((pan + 1) * np.pi / 4) * np.sqrt(2), np.sin((pan + 1) * np.pi / 4) * np.sqrt(2)
    bus[0, i:i + len(sig)] += sig * l
    bus[1, i:i + len(sig)] += sig * r
    send[0, i:i + len(sig)] += sig * l * rev
    send[1, i:i + len(sig)] += sig * r * rev


def midi(n):
    return 440 * 2 ** ((n - 69) / 12)


# ---------------------------------------------------------------- sons
def clock_tick(hi=True):
    t = T(.06)
    f = 3400 if hi else 2500
    return (np.sin(2 * np.pi * f * t) * .6 + bp(noise(.06), 2000, 8000)) * np.exp(-t * 140)


def heartbeat():
    t = T(.35)
    f = 45 + 35 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11)


def notif(up=True):
    """Notification de message : deux notes brèves."""
    a, b = (1318.5, 1760) if up else (1174.7, 987.8)
    out = np.zeros(int(.32 * SR))
    for k, f in enumerate((a, b)):
        t = T(.2)
        s = (np.sin(2 * np.pi * f * t) + .3 * np.sin(4 * np.pi * f * t)) * np.exp(-t * 18)
        i = int(k * .09 * SR)
        out[i:i + len(s)] += s
    return out


def swish(d=.3, up=True):
    x = bp(noise(d), 600, 6000)
    k = np.linspace(0, 1, len(x))
    return x * (np.sin(np.pi * k) ** 2) * (k if up else 1 - k)


def bell(f, d=2.0):
    t = T(d)
    return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * (1.6 + m * .7)) for m, a in ((1, 1), (2.76, .3), (5.4, .12)))


def boom(d=1.6, f0=120, f1=38):
    t = T(d)
    f = f1 + (f0 - f1) * np.exp(-t * 8)
    return np.tanh((np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.4) + lp(noise(d), 2500) * np.exp(-t * 50) * .6) * 1.6)


def pad(freqs, d, cut=1500):
    t = T(d)
    out = sum(2 * (((f * (1 + dt)) * t + rng.random()) % 1) - 1 for f in freqs for dt in (-.005, 0, .005))
    return lp(out / (3 * len(freqs)), cut)


def pluck(f, d=.4):
    t = T(d)
    return lp((2 * ((f * t) % 1) - 1) * np.exp(-t * 8), 3500) * np.minimum(1, t / .003)


def kick():
    t = T(.4)
    f = 48 + 140 * np.exp(-t * 38)
    return np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6.5) * 2.2)


def clap():
    t = T(.3)
    env = sum(np.exp(-np.maximum(t - d, 0) * 70) * (t >= d) for d in (0, .011, .022)) / 3
    return bp(noise(.3), 900, 4500) * (env + np.exp(-t * 14) * .35) * 1.4


def tape_stop(d=.5):
    """Arrêt net : une note qui chute, comme une bande qu'on arrête."""
    t = T(d)
    f = 220 * (1 - t / d) ** 2 + 20
    return np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * 2) * (1 - t / d) * .8


# ---------------------------------------------------------------- repères
html = open(os.path.join(HERE, 'scene.html'), encoding='utf-8').read()
num = lambda name: float(re.search(rf'\b{name} = ([\d.]+)', html).group(1))
START, SPEED, T_VERDICT, T_END = num('START'), num('SPEED'), num('T_VERDICT'), num('T_END')
MSGS = [(float(a), who) for a, who in re.findall(r"\[([\d.]+), '(me|you)',", html)]
SHEETS = [float(a) for a in re.findall(r"\{ a: ([\d.]+), b: [\d.]+, meta:", html)]
rec = json.loads(open(os.path.join(HERE, '..', 'ugc', 'rec', 'rec.js')).read().split('=', 1)[1].rstrip().rstrip(';'))
T_FOUND = START + next(e['t'] for e in rec['events'] if e['type'] == 'results') / SPEED

# ---------------------------------------------------------------- ouverture : 21:00
put(pad([midi(45), midi(52), midi(57), midi(60)], START, 900) * np.minimum(1, T(START) / .1), 0, .55, rev=.5)
put(boom(1.6, 130, 40), .15, .7, rev=.4)  # « 21:00 » apparaît
put(bell(880, 2.5) * .5, .15, .45, rev=.6)
for k in range(int(START / .5)):
    put(clock_tick(k % 2 == 0), .5 + k * .5, .8, pan=-.3)

# ---------------------------------------------------------------- la course
# tic-tac de plus en plus serré, cœur qui bat, jusqu'au verdict
t, k = START, 0
while t < T_VERDICT:
    p = (t - START) / (T_VERDICT - START)
    put(clock_tick(k % 2 == 0), t, .4 + .3 * p, pan=-.4)
    if k % 2 == 0:
        put(heartbeat(), t, .5 + .4 * p)
    t += .5 * (1 - .62 * p ** 1.3)
    k += 1
put(pad([midi(45), midi(48), midi(52), midi(57)], T_VERDICT - START, 1200) * np.linspace(.3, 1, int((T_VERDICT - START) * SR)), START, .3, rev=.4)
put(swish(.4), START - .3, .5)
for at, who in MSGS:
    put(notif(who == 'me'), at, .35, pan=-.45, rev=.2)
for a in SHEETS:
    put(swish(.3), a, .3, pan=-.45)

# CinéMood trouve : carillon lumineux sur le téléphone de droite
put(bell(1046.5) + bell(1318.5) * .7 + bell(1568) * .5, T_FOUND + .05, .5, pan=.45, rev=.6)
put(boom(1.2, 140, 50) * .5, T_FOUND + .05, .6, pan=.3, rev=.3)

# verdict : le tic-tac s'arrête net, impact, trait rouge
put(tape_stop(), T_VERDICT - .05, .7)
put(boom(1.8), T_VERDICT, .9, rev=.4)
put(swish(.35), T_VERDICT + .1, .5, rev=.2)
put(pad([midi(33), midi(45), midi(52)], T_END - T_VERDICT, 700) * np.minimum(1, T(T_END - T_VERDICT) / .3), T_VERDICT, .45, rev=.5)  # nappe sous le verdict

# ---------------------------------------------------------------- fin : musique lumineuse (La majeur)
beat = .5
CH = [(57, [57, 61, 64]), (52, [52, 56, 59]), (54, [54, 57, 61]), (50, [50, 54, 57])]  # A E F#m D
put(boom(2.2, 110, 34), T_END, .9, rev=.5)
for i in range(int((DUR - T_END) / beat)):
    tb = T_END + i * beat
    root, chord = CH[(i // 4) % 4]
    if i % 2 == 0:
        put(kick(), tb, .6)
    else:
        put(clap(), tb, .35, rev=.2)
    for j, n in enumerate(chord + [chord[0] + 12]):
        put(pluck(midi(n + 12)), tb + j * beat / 4, .1, pan=(j - 1.5) * .3, rev=.4)
    put(lp(np.sin(2 * np.pi * midi(root - 24) * T(beat * .9)), 500) * np.minimum(1, (beat * .9 - T(beat * .9)) / .03), tb, .35)
put(pad([midi(57), midi(61), midi(64), midi(69)], DUR - T_END, 2400) * np.minimum(1, T(DUR - T_END) / .4), T_END, .3, rev=.6)
put(bell(1760, 1.5) * .5, T_END + 1.0, .3, rev=.6)

# ---------------------------------------------------------------- mixage
ir_t = T(1.8)
ir = np.stack([lp(rng.standard_normal(len(ir_t)), 7000) * np.exp(-ir_t * 3.6) for _ in range(2)])
wet = np.stack([fftconvolve(send[c], ir[c])[:N] for c in range(2)])
mix = bus / (np.max(np.abs(bus)) + 1e-9) + wet / (np.max(np.abs(wet)) + 1e-9) * .3
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
print('ok ->', out, f'(départ {START}, trouvé {T_FOUND:.2f}, verdict {T_VERDICT}, {len(MSGS)} messages)')
