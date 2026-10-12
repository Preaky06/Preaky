"""Outils de traitement du signal et bruitages synthétiques (whooshes, pluie, projecteur…)."""
import numpy as np
from scipy import signal

SR = 48000
DUR = 30.0
N = int(SR * DUR)
rng = np.random.default_rng(2026)


def idx(t):
    return int(round(t * SR))


def bus():
    return np.zeros((2, N))


def stereo(x, pan=0.0):
    if x.ndim == 2:
        if pan == 0:
            return x
        a = (pan + 1) * np.pi / 4
        return np.vstack([x[0] * np.cos(a) * np.sqrt(2), x[1] * np.sin(a) * np.sqrt(2)])
    a = (pan + 1) * np.pi / 4
    return np.vstack([x * np.cos(a), x * np.sin(a)]) * np.sqrt(2)


def add(b, x, t0, gain=1.0, pan=0.0):
    x = stereo(x, pan)
    i0 = idx(t0)
    s0, d0 = max(0, -i0), max(0, i0)
    n = min(x.shape[1] - s0, N - d0)
    if n > 0:
        b[:, d0:d0 + n] += gain * x[:, s0:s0 + n]


def tv(dur):
    return np.arange(int(round(dur * SR))) / SR


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def phase(f, n):
    f = np.broadcast_to(np.asarray(f, dtype=float), (n,))
    return np.cumsum(f) / SR


def sine(f, dur, ph0=0.0):
    n = int(round(dur * SR))
    return np.sin(2 * np.pi * (phase(f, n) + ph0))


def saw(f, dur, ph0=0.0):
    """dent de scie à bande limitée (polyBLEP)"""
    n = int(round(dur * SR))
    f = np.broadcast_to(np.asarray(f, dtype=float), (n,))
    p = (np.cumsum(f) / SR + ph0) % 1.0
    dt = np.clip(f / SR, 1e-6, 0.5)
    y = 2 * p - 1
    m = p < dt
    x = p[m] / dt[m]
    y[m] -= x + x - x * x - 1
    m = p > 1 - dt
    x = (p[m] - 1) / dt[m]
    y[m] -= x * x + x + x + 1
    return y


def noise(dur):
    return rng.standard_normal(int(round(dur * SR)))


def pink(dur):
    n = int(round(dur * SR))
    w = rng.standard_normal(n)
    b, a = [0.049922035, -0.095993537, 0.050612699, -0.004408786], [1, -2.494956002, 2.017265875, -0.522189400]
    return signal.lfilter(b, a, w) * 6


def lp(x, fc, order=2):
    sos = signal.butter(order, min(fc, SR * 0.45) / (SR / 2), 'low', output='sos')
    return signal.sosfilt(sos, x, axis=-1)


def hp(x, fc, order=2):
    sos = signal.butter(order, fc / (SR / 2), 'high', output='sos')
    return signal.sosfilt(sos, x, axis=-1)


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo / (SR / 2), min(hi, SR * 0.45) / (SR / 2)], 'band', output='sos')
    return signal.sosfilt(sos, x, axis=-1)


def peak(x, f0, gain_db, q=1.0):
    """égaliseur en cloche (RBJ)"""
    A = 10 ** (gain_db / 40)
    w = 2 * np.pi * f0 / SR
    al = np.sin(w) / (2 * q)
    b = [1 + al * A, -2 * np.cos(w), 1 - al * A]
    a = [1 + al / A, -2 * np.cos(w), 1 - al / A]
    return signal.lfilter(np.array(b) / a[0], np.array(a) / a[0], x, axis=-1)


def sweep(x, f0, f1, kind='low', block=256, q=0.9, curve=2.0):
    """filtre à coupure variable, par blocs (états conservés)"""
    n = len(x)
    out = np.zeros(n)
    zi = np.zeros((1, 2))
    for s in range(0, n, block):
        u = s / max(1, n - 1)
        fc = f0 * (f1 / f0) ** (u ** (1 / curve) if f1 > f0 else u)
        fc = min(max(fc, 20), SR * 0.45)
        if kind == 'band':
            bw = fc / q
            lo, hi = max(20, fc - bw / 2), min(SR * 0.45, fc + bw / 2)
            sos = signal.butter(1, [lo / (SR / 2), hi / (SR / 2)], 'band', output='sos')
        else:
            sos = signal.butter(2, fc / (SR / 2), kind, output='sos')
        out[s:s + block], zi = signal.sosfilt(sos, x[s:s + block], zi=zi)
    return out


def env_exp(dur, tau, attack=0.002):
    t = tv(dur)
    e = np.exp(-t / tau)
    a = int(attack * SR)
    if a > 0:
        e[:a] *= np.linspace(0, 1, a)
    return e


def env_ad(dur, a, r):
    t = tv(dur)
    e = np.where(t < a, t / max(a, 1e-6), np.clip(1 - (t - a) / max(r, 1e-6), 0, 1))
    return e ** 1.5


def env_asr(dur, a, r):
    t = tv(dur)
    return np.minimum(1, t / max(a, 1e-6)) * np.clip((dur - t) / max(r, 1e-6), 0, 1)


def soft(x, drive=1.0):
    return np.tanh(x * drive) / np.tanh(drive)


def norm(x, target=1.0):
    m = np.max(np.abs(x))
    return x * (target / m) if m > 0 else x


def reverse(x):
    return x[..., ::-1].copy()


def cut(x, dur, fade=0.01):
    n = min(x.shape[-1], int(dur * SR))
    y = x[..., :n].copy()
    f = min(n, int(fade * SR))
    if f > 0:
        y[..., -f:] *= np.linspace(1, 0, f)
    return y


# ---------------------------------------------------------------- réverbération
def make_hall(rt=(3.0, 2.3, 1.3), pre=0.022, er=True, seed=5, width=1.0):
    """réponse impulsionnelle de salle : premières réflexions + queue diffuse
    dont la décroissance dépend de la bande (graves plus longs que les aigus)"""
    r = np.random.default_rng(seed)
    T = max(rt) * 1.25
    n = int(T * SR)
    t = np.arange(n) / SR
    ir = np.zeros((2, n))
    bands = [(lambda z: lp(z, 500), rt[0]), (lambda z: bp(z, 500, 4000), rt[1]), (lambda z: hp(z, 4000), rt[2])]
    for c in range(2):
        nz = r.standard_normal(n)
        tail = np.zeros(n)
        for f, rtb in bands:
            tail += f(nz) * np.exp(-6.9 * t / rtb)
        # montée douce de la diffusion
        tail *= np.clip(t / 0.03, 0, 1)
        ir[c] = tail
    if er:
        for k in range(14):
            d = 0.004 + r.random() * 0.075
            g = 0.6 * (1 - d / 0.08) * (0.4 + 0.6 * r.random())
            ch = r.integers(0, 2)
            ir[ch, int(d * SR)] += g * (1 if r.random() > 0.3 else -1) * 3
    mid, side = (ir[0] + ir[1]) / 2, (ir[0] - ir[1]) / 2
    ir = np.vstack([mid + side * width, mid - side * width])
    p = int(pre * SR)
    ir = np.concatenate([np.zeros((2, p)), ir], axis=1)
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


def reverb(x, ir):
    x = stereo(x)
    return np.vstack([signal.fftconvolve(x[c], ir[c])[:x.shape[1]] for c in range(2)])


def reverb_tail(x, ir, extra=3.0):
    """réverbère un son court et garde sa queue (pour les éléments ponctuels)"""
    x = stereo(x)
    xx = np.concatenate([x, np.zeros((2, int(extra * SR)))], axis=1)
    return np.vstack([signal.fftconvolve(xx[c], ir[c])[:xx.shape[1]] for c in range(2)])


# ---------------------------------------------------------------- dynamique
def limiter(x, ceil, look=0.004):
    from scipy.ndimage import minimum_filter1d
    pk = np.max(np.abs(x), axis=0)
    g = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
    w = int(look * SR)
    g = minimum_filter1d(g, size=2 * w + 1)
    win = np.hanning(2 * w + 1)
    g = np.minimum(g, signal.oaconvolve(g, win / win.sum(), mode='same'))
    return x * g


def compress(x, thr_db=-18, ratio=3.0, att=0.005, rel=0.12, makeup_db=0.0):
    """compresseur RMS simple (détection lissée, gain appliqué aux deux canaux)"""
    lvl = np.sqrt(signal.lfilter([1 - np.exp(-1 / (0.01 * SR))], [1, -np.exp(-1 / (0.01 * SR))], np.mean(x ** 2, axis=0)) + 1e-12)
    db = 20 * np.log10(lvl)
    over = np.maximum(0, db - thr_db)
    gr = -over * (1 - 1 / ratio)
    # attaque / relâchement
    ka, kr = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR))
    sm = np.empty_like(gr)
    g = 0.0
    # boucle par blocs de 32 échantillons (assez fin pour une glue de bus)
    blk = 32
    for i in range(0, len(gr), blk):
        target = gr[i:i + blk].min()
        k = ka if target < g else kr
        g = target + (g - target) * k ** blk
        sm[i:i + blk] = g
    return x * 10 ** ((sm + makeup_db) / 20)


def duck_env(times, dur=0.32, depth=0.5, tau=0.09):
    e = np.zeros(N)
    for t in times:
        i = idx(t)
        d = int(dur * SR)
        k = np.exp(-np.arange(d) / (tau * SR))
        n = max(0, min(d, N - i))
        e[i:i + n] = np.maximum(e[i:i + n], k[:n])
    return 1 - depth * e


def tape_stop(b, t0, dur):
    """ralentissement de bande sur [t0, t0+dur] : vitesse 1 → 0, puis silence"""
    a, n = idx(t0), int(dur * SR)
    seg = b[:, a:a + int(dur * SR * 1.2)].copy()
    u = np.arange(n) / n
    speed = (1 - u) ** 1.6
    pos = np.cumsum(speed)
    pos = np.clip(pos, 0, seg.shape[1] - 1)
    out = np.vstack([np.interp(pos, np.arange(seg.shape[1]), seg[c]) for c in range(2)])
    out = lp(out, 9000) * (1 - u) ** 0.5
    b[:, a:a + n] = out
    b[:, a + n:a + n + int(0.02 * SR)] *= 0


# ---------------------------------------------------------------- bruitages
def whoosh(d=0.6, gain=1.0, up=True, f0=300, f1=7000, pan0=-0.6, pan1=0.6, tone=True):
    """souffle qui passe : bande de bruit résonante + léger ton avec effet Doppler, panoramique mobile"""
    n = int(d * SR)
    t = tv(d)
    u = t / d
    e = np.sin(np.pi * np.clip(u, 0, 1)) ** 1.6
    nz = pink(d)
    lo, hi = (f0, f1) if up else (f1, f0)
    x = sweep(nz, lo, hi, 'band', q=1.6, curve=1.3) * 1.4 + sweep(noise(d), lo * 2, hi, 'band', q=2.2, curve=1.3) * 0.25
    if tone:
        fr = lerp_arr(220, 140, u) if up else lerp_arr(160, 260, u)
        x += lp(saw(fr, d), 900) * 0.06
    x *= e
    pan = pan0 + (pan1 - pan0) * u
    a = (pan + 1) * np.pi / 4
    return np.vstack([x * np.cos(a), x * np.sin(a)]) * np.sqrt(2) * gain


def lerp_arr(a, b, u):
    return a + (b - a) * u


def suck(d=0.4, gain=1.0):
    """aspiration inversée : bruit qui monte et se coupe net"""
    t = tv(d)
    e = (t / d) ** 3
    x = sweep(pink(d), 400, 9000, 'band', q=1.2, curve=1.0) * e
    return stereo(x) * gain


def riser(d, gain=1.0, f0=300, f1=9000):
    """montée : bruit filtré + tons de Shepard + trémolo qui s'accélère"""
    t = tv(d)
    u = t / d
    nz = sweep(pink(d), f0, f1, 'band', q=1.3, curve=1.6)
    sh = np.zeros_like(t)
    for o in range(4):
        f = 110 * 2 ** (o + 2.0 * u)
        w = np.exp(-((np.log2(f / 440)) ** 2) / 1.2)
        sh += lp(saw(f, d), 6000) * w * 0.05
    trem = 0.75 + 0.25 * np.sin(2 * np.pi * np.cumsum(4 + 22 * u ** 2) / SR)
    return stereo((nz * 0.9 + sh) * u ** 2.3 * trem) * gain


def crackle(d, density, gain=1.0):
    n = int(d * SR)
    x = np.zeros(n)
    k = rng.random(n) < density / SR
    x[k] = rng.standard_normal(k.sum()) * 3
    return bp(x, 1500, 9000) * gain


def glass_tink(gain=1.0):
    d = 0.12
    x = (sine(4600, d) * 0.6 + sine(7100, d) * 0.3 + sine(9800, d) * 0.15) * env_exp(d, 0.018, 0.0005)
    return x * gain


def relay(gain=1.0):
    """claquement de relais (grosse enseigne qui s'allume)"""
    d = 0.18
    th = sine(np.linspace(140, 70, int(d * SR)), d) * env_exp(d, 0.03, 0.0005)
    cl = bp(noise(d), 1200, 6000) * env_exp(d, 0.004, 0.0002)
    return soft((th * 0.9 + cl * 0.8) * gain, 1.5)


def rain_bed(d, gain=1.0):
    """pluie : nappe rose filtrée + gouttes individuelles, stéréo décorrélée"""
    out = np.zeros((2, int(d * SR)))
    for c in range(2):
        bed = bp(pink(d), 500, 7000) * 0.35
        n = int(d * SR)
        drops = np.zeros(n)
        k = rng.random(n) < 900 / SR
        drops[k] = rng.standard_normal(k.sum()) * (0.4 + rng.random(k.sum()))
        drops = bp(drops, 1800, 9000)
        big = np.zeros(n)
        k2 = rng.random(n) < 14 / SR
        big[k2] = rng.standard_normal(k2.sum()) * 2.5
        big = bp(big, 600, 3000)
        big = signal.lfilter([1], [1, -0.985], big) * 0.05
        out[c] = bed + drops * 0.5 + big
    return out * gain


def projector(d, gain=1.0, spin=0.45):
    """projecteur 35 mm : claquement de griffe à 24 i/s (résonances), moteur, ventilation"""
    n = int(d * SR)
    t = tv(d)
    rate = 24 * np.clip(t / spin, 0.25, 1) ** 0.6
    ph = np.cumsum(rate) / SR
    ticks = np.flatnonzero(np.diff(np.floor(ph)) > 0)
    imp = np.zeros(n)
    imp[ticks + rng.integers(0, 40, len(ticks)).clip(0, 0)] = 1.0 * (0.7 + 0.3 * rng.random(len(ticks)))
    clack = np.zeros(n)
    for f0, tau, a in ((1150, 0.006, 1.0), (2350, 0.004, 0.6), (3700, 0.003, 0.35), (420, 0.01, 0.5)):
        b, aa = signal.iirpeak(f0 / (SR / 2), 12)
        clack += signal.lfilter(b, aa, imp) * a
    clack = clack * 3
    motor = (lp(saw(92 + 3 * np.sin(2 * np.pi * 0.7 * t), d), 700) * 0.06 + sine(184, d) * 0.015)
    fan = lp(pink(d), 1200) * 0.05
    x = clack + motor + fan
    x *= np.clip(t / 0.08, 0, 1)
    return stereo(x, -0.25) * gain


def hum(levels, fps, gain=1.0):
    """bourdonnement de transformateur (100 Hz et harmoniques) suivant l'intensité du néon"""
    t = np.arange(N) / SR
    base = (np.sin(2 * np.pi * 100 * t) * 0.5 + np.sin(2 * np.pi * 200 * t) * 0.3 + np.sin(2 * np.pi * 300 * t) * 0.18
            + np.sin(2 * np.pi * 50 * t) * 0.22)
    buzz = bp(saw(100, DUR), 1800, 6000) * 0.22
    lv = np.asarray(levels)
    fr = np.clip((t * fps).astype(int), 0, len(lv) - 1)
    e = lp(lv[fr], 140, 1)
    return (base + buzz) * e * gain


def sub_drop(d=2.5, f0=75, f1=28, gain=1.0):
    t = tv(d)
    f = f1 + (f0 - f1) * np.exp(-t / 0.4)
    return np.sin(2 * np.pi * phase(f, len(t))) * env_exp(d, 0.9, 0.002) * gain


def crack(gain=1.0):
    d = 0.06
    return hp(noise(d), 2500, 2) * env_exp(d, 0.008, 0.0002) * gain


def metal(f=420, d=1.6, gain=1.0):
    x = np.zeros(int(d * SR))
    for r, a, tau in ((1, 1, 0.5), (2.41, 0.6, 0.35), (3.83, 0.45, 0.25), (5.95, 0.3, 0.15)):
        x += a * sine(f * r, d, rng.random()) * env_exp(d, tau, 0.0005)
    return x * gain


def tick(f=3200, gain=1.0, d=0.02):
    x = sine(f, d) * env_exp(d, 0.003, 0.0003)
    x += hp(noise(d), 4000) * env_exp(d, 0.0012) * 0.5
    return x * gain


def analog_bass(m, d, gain=1.0, cutoff=700, env_amt=1800, sub=0.7):
    """basse type analogique : deux scies désaccordées + sous-octave, filtre à enveloppe"""
    f = midi(m)
    x = saw(f * 1.003, d) * 0.5 + saw(f * 0.997, d, 0.3) * 0.5
    t = tv(d)
    fc = cutoff + env_amt * np.exp(-t / 0.07)
    y = np.zeros_like(x)
    zi = np.zeros((1, 2))
    blk = 128
    for s in range(0, len(x), blk):
        sos = signal.butter(2, min(fc[s], 20000) / (SR / 2), 'low', output='sos')
        y[s:s + blk], zi = signal.sosfilt(sos, x[s:s + blk], zi=zi)
    y += np.sin(2 * np.pi * phase(f / 2, len(t))) * sub
    e = env_ad(d, 0.003, d)
    return soft(y * e * gain, 1.6)
