"""Échantillonneur : charge les banques de sons libres installées par npm
(voir ../package.json) et joue des notes à n'importe quelle hauteur.

Banques utilisées (licences vérifiées) :
- Salamander Grand Piano V3, Alexander Holm — CC BY 3.0 (@audio-samples/piano-mp3-*)
- FluidR3 GM, Frank Wen — MIT (soundfont-for-samplers)
- Roland TR-808, échantillons de Michael Fischer — libres (@fluid-music/tr-808)
- UI SFX, Romain Simon — CC0 (uisfx)
"""
import hashlib
import os
import subprocess
from fractions import Fraction

import numpy as np
from scipy import signal

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.environ.get('SAMPLES', os.path.join(HERE, '..', 'node_modules'))
CACHE = os.environ.get('SAMPLE_CACHE', '/tmp/cinemood-samples')
FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']


def decode(path, trim=True):
    """fichier audio → tableau stéréo float64 (2, n) à 48 kHz, mis en cache"""
    key = hashlib.md5(path.encode()).hexdigest()
    cp = os.path.join(CACHE, key + '.npy')
    if os.path.exists(cp):
        return np.load(cp)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32).reshape(-1, 2).T.astype(np.float64)
    if trim:  # les MP3 commencent par un silence d'encodage : on cale l'attaque à 1 ms
        env = np.max(np.abs(x), axis=0)
        thr = env.max() * 10 ** (-48 / 20)
        i = int(np.argmax(env > thr))
        x = x[:, max(0, i - int(0.001 * SR)):]
    os.makedirs(CACHE, exist_ok=True)
    np.save(cp, x)
    return x


def repitch(x, semis):
    if abs(semis) < 1e-6:
        return x
    fr = Fraction(2 ** (-semis / 12)).limit_denominator(240)
    return signal.resample_poly(x, fr.numerator, fr.denominator, axis=1)


def fade_out(x, dur, rel):
    """coupe à dur + rel avec une extinction exponentielle"""
    n = min(x.shape[1], int((dur + rel) * SR))
    y = x[:, :n].copy()
    a = int(dur * SR)
    if n > a:
        t = np.arange(n - a) / SR
        y[:, a:] *= np.exp(-t / max(rel / 4, 1e-3))
    return y


def sustain(x, dur, loop=(0.9, 2.5), xf=0.25):
    """prolonge une note tenue au-delà de son échantillon (boucle avec fondus enchaînés)"""
    need = int(dur * SR)
    if x.shape[1] >= need:
        return x
    a, b = int(loop[0] * SR), int(min(loop[1] * SR, x.shape[1] - 1))
    seg = x[:, a:b]
    f = int(xf * SR)
    out = x[:, :b].copy()
    while out.shape[1] < need + f:
        w = np.sin(np.linspace(0, np.pi / 2, f)) ** 2
        tail = out[:, -f:] * (1 - w) + seg[:, :f] * w
        out = np.concatenate([out[:, :-f], tail, seg[:, f:]], axis=1)
    return out


class Piano:
    """Salamander Grand Piano : une note tous les 3 demi-tons, 3 couches de vélocité"""
    LAYERS = [(0.42, 4), (0.78, 8), (1.01, 12)]

    def __init__(self):
        self.base = [21 + 3 * k for k in range(29)] + [108]

    def _file(self, m, v):
        name = SHARPS[m % 12] + str(m // 12 - 1)
        return os.path.join(ROOT, '@audio-samples', f'piano-mp3-velocity{v}', 'audio', f'{name}v{v}.mp3')

    def note(self, m, vel=0.6, dur=1.0, rel=0.5):
        v = next(l for th, l in self.LAYERS if vel <= th)
        b = min(self.base, key=lambda s: abs(s - m))
        x = repitch(decode(self._file(b, v)), m - b)
        return fade_out(x, dur, rel) * (0.35 + 0.65 * vel)


class GM:
    """instrument FluidR3 (une note par demi-ton, ≈ 3 s)"""

    def __init__(self, name):
        self.dir = os.path.join(ROOT, 'soundfont-for-samplers', 'FluidR3_GM', name + '-mp3')

    def note(self, m, dur=1.0, rel=0.4, attack=0.0, gain=1.0, loop=(0.9, 2.5)):
        name = FLATS[m % 12] + str(m // 12 - 1)
        x = decode(os.path.join(self.dir, name + '.mp3'))
        x = sustain(x, dur + rel, loop)
        y = fade_out(x, dur, rel)
        if attack > 0:
            a = min(y.shape[1], int(attack * SR))
            y[:, :a] *= np.linspace(0, 1, a) ** 2
        return y * gain


def k808(name):
    """échantillon de la TR-808 (ex. 'BD/BD5075', 'CP/CP', 'CY/CY1050')"""
    return decode(os.path.join(ROOT, '@fluid-music', 'tr-808', 'TR808WAV', name + '.WAV'), trim=False)


def bd808_tuned():
    return decode(os.path.join(ROOT, '@fluid-music', 'tr-808', 'TR808WAV', 'BDTuned', 'BD2510-g1.wav'), trim=False)


def ui(pack, cue):
    return decode(os.path.join(ROOT, 'uisfx', 'sounds', pack, cue + '.mp3'))
