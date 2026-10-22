"""Soundtrack synthesis from the timeline cues exported by render.mjs (--cues).

The palette is the app's own: sine carriers at the session frequencies, a 10 Hz
binaural beat that turns into an isochronic tone when the speaker output is
picked, octave/fifth harmonics with a slow "breath", and one bell per mode at
that mode's carrier frequency.

usage: python3 tools/audio.py cues.json out.wav
"""
import json
import sys
import wave

import numpy as np

SR = 48000
rng = np.random.default_rng(7)


def t_axis(d):
    return np.arange(int(d * SR)) / SR


def place(buf, t0, sig):
    """Add a (2, n) signal into the (2, N) buffer at time t0, clipped to bounds."""
    i = int(round(t0 * SR))
    if i < 0:
        sig, i = sig[:, -i:], 0
    n = min(sig.shape[1], buf.shape[1] - i)
    if n > 0:
        buf[:, i:i + n] += sig[:, :n]


def pan(mono, p):
    """Equal-power pan, p in [-1, 1]."""
    a = (p + 1) * np.pi / 4
    return np.vstack([mono * np.cos(a), mono * np.sin(a)])


def fades(n, a, r):
    e = np.ones(n)
    a, r = int(a * SR), int(r * SR)
    if a:
        e[:a] = np.sin(np.linspace(0, np.pi / 2, a)) ** 2
    if r:
        e[-r:] *= np.cos(np.linspace(0, np.pi / 2, r)) ** 2
    return e


def bell(hz, g, p):
    t = t_axis(3.0)
    s = np.zeros_like(t)
    for mult, amp, dec in ((1, 1.0, 1.6), (2, 0.32, 0.8), (3, 0.1, 0.45), (0.5, 0.25, 2.0)):
        s += amp * np.sin(2 * np.pi * hz * mult * t) * np.exp(-t / dec)
    s *= (1 - np.exp(-t / 0.004)) * fades(len(t), 0, 0.6)
    return pan(0.075 * g * s, p)


def glide(c):
    d = c["b"] - c["a"] + 1.0
    t = t_axis(d)
    f = c["f0"] * (c["f1"] / c["f0"]) ** np.clip(t / (c["b"] - c["a"]), 0, 1)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = (np.sin(ph) + 0.45 * np.sin(ph / 2)) * fades(len(t), 0.35, 0.9)
    return np.vstack([s, s]) * 0.035


def svf_bandpass(x, fc, q=1.2):
    """Chamberlin state-variable band-pass with a per-sample cutoff."""
    lo = bp = 0.0
    out = np.empty_like(x)
    f = 2 * np.sin(np.pi * np.minimum(fc, SR / 6) / SR)
    damp = 1 / q
    for i in range(len(x)):
        hi = x[i] - lo - damp * bp
        bp += f[i] * hi
        lo += f[i] * bp
        out[i] = bp
    return out


def whoosh(d):
    t = t_axis(d)
    k = t / d
    fc = 280 * (3200 / 280) ** k
    s = svf_bandpass(rng.standard_normal(len(t)), fc) * np.sin(np.pi * k) ** 2
    s /= np.abs(s).max() + 1e-9
    return np.vstack([s * (1 - k), s * k]) * 0.07 + np.vstack([s * k, s * (1 - k)]) * 0.03


def tap():
    t = t_axis(0.12)
    click = np.sin(2 * np.pi * 1900 * t) * np.exp(-t / 0.012) * 0.06
    thump = np.sin(2 * np.pi * 170 * t) * np.exp(-t / 0.03) * 0.09
    s = click + thump
    return np.vstack([s, s])


def pop(hz, p):
    t = t_axis(0.25)
    s = np.sin(2 * np.pi * hz * t) * np.exp(-t / 0.06) * (1 - np.exp(-t / 0.003))
    return pan(0.028 * s, p)


def session(c, end):
    """Binaural carrier (L=hz, R=hz+beat) that switches to an isochronic tone, plus harmonics."""
    d = end - c["a"]
    t = t_axis(d)
    hz, beat = c["hz"], c["beat"]
    sw = np.clip((t - (c["speakerAt"] - c["a"])) / 0.3, 0, 1)
    left = np.sin(2 * np.pi * hz * t)
    right_bin = np.sin(2 * np.pi * (hz + beat) * t)
    # same signal on both ears sums hotter than the binaural pair: trim it to match
    iso = 0.8 * left * (0.4 + 0.6 * (0.5 + 0.5 * np.sin(2 * np.pi * beat * t)))
    l = (1 - sw) * left + sw * iso
    r = (1 - sw) * right_bin + sw * iso
    breath = 1 + 0.35 * np.sin(2 * np.pi * 0.07 * t)
    harm = 0.32 * breath * np.sin(2 * np.pi * hz / 2 * t) + 0.1 * np.sin(2 * np.pi * hz * 1.5 * t)
    env = fades(len(t), 1.6, 0.5)
    return np.vstack([l + harm, r + harm]) * env * 0.05


def pulses(cs, end):
    a = cs[0]["t"]
    t = t_axis(end - a)
    rate = np.full(len(t), cs[0]["rate"], float)
    for c in cs[1:]:
        rate[int((c["t"] - a) * SR):] = c["rate"]
    am = 0.5 + 0.5 * np.sin(2 * np.pi * np.cumsum(rate) / SR)
    tone = np.sin(2 * np.pi * 264 * t) + 0.3 * np.sin(2 * np.pi * 528 * t)
    s = tone * (0.3 + 0.7 * am) * fades(len(t), 0.25, 0.45) * 0.055
    return np.vstack([s, s])


def pad(c):
    d = c["b"] - c["a"]
    t = t_axis(d)
    breath = 1 + 0.25 * np.sin(2 * np.pi * 0.11 * t)
    out = np.zeros((2, len(t)))
    for mult, amp in ((0.5, 0.6), (1, 1.0), (1.5, 0.45), (2, 0.25)):
        f = c["hz"] * mult
        out[0] += amp * np.sin(2 * np.pi * f * t)
        out[1] += amp * np.sin(2 * np.pi * (f + 0.35) * t)
    return out * breath * fades(len(t), 1.2, 1.2) * 0.022


def reverb(x, secs=2.4, mix=0.22):
    n = int(secs * SR)
    tt = np.arange(n) / SR
    out = np.empty_like(x)
    size = 1 << int(np.ceil(np.log2(x.shape[1] + n)))
    for ch in range(2):
        ir = rng.standard_normal(n) * np.exp(-tt / 0.55)
        ir = np.convolve(ir, np.ones(8) / 8, mode="same")  # darken the tail
        ir /= np.sqrt(np.sum(ir ** 2))
        wet = np.fft.irfft(np.fft.rfft(x[ch], size) * np.fft.rfft(ir, size), size)[: x.shape[1]]
        out[ch] = x[ch] + mix * wet
    return out


def bandlimit(x, lo=40, hi=7000):
    """Zero-phase 2nd-order-ish high-pass + low-pass applied in the frequency domain."""
    spec = np.fft.rfft(x, axis=1)
    f = np.fft.rfftfreq(x.shape[1], 1 / SR)
    hp = (f / lo) ** 2 / np.sqrt(1 + (f / lo) ** 4)
    return np.fft.irfft(spec * hp / np.sqrt(1 + (f / hi) ** 4), x.shape[1], axis=1)


def main():
    cues = json.load(open(sys.argv[1]))
    dur = cues["dur"]
    buf = np.zeros((2, int(dur * SR)))

    for c in cues["pads"]:
        place(buf, c["a"], pad(c))
    place(buf, cues["glide"]["a"], glide(cues["glide"]))
    for i, c in enumerate(cues["chimes"]):
        place(buf, c["t"], bell(c["hz"], c["g"], [-0.35, 0.35][i % 2]))
    for c in cues["whooshes"]:
        place(buf, c["t"], whoosh(c["d"]))
    for t in cues["taps"]:
        place(buf, t, tap())
    scale = [880, 990, 1175, 1320, 1480, 1760]
    for i, t in enumerate(cues["pops"]):
        place(buf, t, pop(scale[i % len(scale)], rng.uniform(-0.6, 0.6)))
    s = cues["session"]
    place(buf, s["a"], session(s, s["b"]))
    place(buf, cues["pulses"][0]["t"], pulses(cues["pulses"], cues["pulseEnd"]))

    buf = bandlimit(reverb(buf))
    buf *= fades(buf.shape[1], 0.05, 0.4)
    buf *= 0.89 / np.abs(buf).max()  # final loudness is set by ffmpeg loudnorm at mux time

    pcm = (buf.T * 32767).astype("<i2")
    with wave.open(sys.argv[2], "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print("wrote", sys.argv[2], "%.1fs" % dur)


if __name__ == "__main__":
    main()
