#!/usr/bin/env python3
"""Génère la piste voix d'un épisode et le fichier de timing (phrases + mots).

Usage : python3 tools/voice.py episodes/00-presentation

- Si episodes/<ep>/voice/<id>.(wav|m4a|mp3|…) existe (ta propre voix), il est utilisé.
- Sinon la réplique est synthétisée avec Piper (sherpa-onnx), voix "voix témoin".

Sorties dans build/<ep>/ :
  voice.wav    piste voix complète (mono 44.1 kHz)
  timing.json  début/fin de chaque réplique et de chaque mot + enveloppe (lip-sync)
"""
import json
import re
import subprocess
import sys
import tarfile
import urllib.request
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
SR = 44100
FPS = 30
MODELS_URL = "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-{}.tar.bz2"

# Pause ajoutée après une ponctuation de fin de phrase (secondes).
SENTENCE_PAUSE = {".": 0.22, "?": 0.25, "!": 0.22, "…": 0.38, ":": 0.12}


def load_tts(model):
    import sherpa_onnx

    cache = ROOT / ".cache"
    d = cache / f"vits-piper-{model}"
    if not d.exists():
        cache.mkdir(exist_ok=True)
        archive = cache / f"{model}.tar.bz2"
        print(f"Téléchargement de la voix {model}…")
        urllib.request.urlretrieve(MODELS_URL.format(model), archive)
        with tarfile.open(archive) as t:
            t.extractall(cache)
        archive.unlink()
    cfg = sherpa_onnx.OfflineTtsConfig(
        model=sherpa_onnx.OfflineTtsModelConfig(
            vits=sherpa_onnx.OfflineTtsVitsModelConfig(
                model=str(d / f"{model}.onnx"),
                tokens=str(d / "tokens.txt"),
                data_dir=str(d / "espeak-ng-data"),
            ),
            num_threads=4,
        )
    )
    return sherpa_onnx.OfflineTts(cfg)


def resample(x, sr_in):
    if sr_in == SR:
        return x
    n = int(round(len(x) * SR / sr_in))
    return np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)


def trim(x, thresh=0.01, pad=0.03):
    """Retire le silence au début et à la fin."""
    idx = np.where(np.abs(x) > thresh)[0]
    if len(idx) == 0:
        return x
    a = max(0, idx[0] - int(pad * SR))
    b = min(len(x), idx[-1] + int(pad * SR))
    return x[a:b]


def find_recording(rec_dir, line_id):
    """Cherche voice/<id>.<n'importe quelle extension audio> (wav, m4a, mp3, ogg…)."""
    if not rec_dir.is_dir():
        return None
    for f in sorted(rec_dir.iterdir()):
        if f.stem == line_id and f.suffix.lower() in (".wav", ".m4a", ".mp3", ".ogg", ".flac", ".aac", ".opus", ".webm"):
            return f
    return None


def decode(path):
    """Décode n'importe quel fichier audio en mono 44.1 kHz via ffmpeg."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def split_sentences(text):
    """Découpe en phrases en gardant la ponctuation finale."""
    parts = re.findall(r"[^.?!…:]+[.?!…:]*", text)
    return [p.strip() for p in parts if p.strip() and re.search(r"\w", p)]


def syllables(word):
    w = word.lower()
    n = len(re.findall(r"[aeiouyàâäéèêëîïôöùûüœ]+", w))
    if w.endswith("e") and n > 1:
        n -= 1
    return max(n, 1) if re.search(r"\w", w) else 0


def word_weights(words):
    out = []
    for w in words:
        s = syllables(w)
        if re.search(r"[,;]$", w):
            s += 1.2  # micro-pause sur la virgule
        out.append(max(s, 0.6))
    return out


def distribute(words, t0, t1):
    ws = word_weights(words)
    tot = sum(ws)
    res, t = [], t0
    for w, k in zip(words, ws):
        d = (t1 - t0) * k / tot
        res.append({"w": w, "start": round(t, 3), "end": round(t + d, 3)})
        t += d
    return res


def main(ep_dir):
    ep_dir = Path(ep_dir).resolve()
    ep = json.loads((ep_dir / "script.json").read_text())
    out_dir = ROOT / "build" / ep_dir.name
    out_dir.mkdir(parents=True, exist_ok=True)
    rec_dir = ep_dir / "voice"
    tts = None
    speed = ep["voice"].get("speed", 1.0)
    sid = ep["voice"].get("speaker", 0)

    chunks = [np.zeros(int(ep.get("leadIn", 0.25) * SR), np.float32)]
    t = ep.get("leadIn", 0.25)
    lines = []
    for line in ep["lines"]:
        caption_sents = split_sentences(line["text"])
        tts_sents = split_sentences(line.get("tts", line["text"]))
        rec = find_recording(rec_dir, line["id"])
        words = []
        start = t
        if rec:
            x = decode(rec)
            x = trim(x, thresh=max(0.01, float(np.max(np.abs(x))) * 0.04))
            chunks.append(x)
            dur = len(x) / SR
            words = distribute(line["text"].split(), t, t + dur)
            t += dur
            source = "enregistrement"
        else:
            if tts is None:
                tts = load_tts(ep["voice"]["model"])
            if len(caption_sents) != len(tts_sents):
                caption_sents = [line["text"]]
                tts_sents = [line.get("tts", line["text"])]
            for i, (cap, say) in enumerate(zip(caption_sents, tts_sents)):
                a = tts.generate(say, sid=sid, speed=speed)
                x = trim(resample(np.asarray(a.samples, np.float32), a.sample_rate))
                dur = len(x) / SR
                words += distribute(cap.split(), t, t + dur)
                chunks.append(x)
                t += dur
                if i < len(caption_sents) - 1:
                    p = SENTENCE_PAUSE.get(cap[-1], 0.15)
                    chunks.append(np.zeros(int(p * SR), np.float32))
                    t += p
            source = "tts"
        lines.append({"id": line["id"], "text": line["text"], "start": round(start, 3),
                      "end": round(t, 3), "words": words, "source": source})
        p = line.get("pause", 0.2)
        chunks.append(np.zeros(int(p * SR), np.float32))
        t += p

    tail = ep.get("tail", 2.5)
    chunks.append(np.zeros(int(tail * SR), np.float32))
    voice = np.concatenate(chunks)
    peak = np.max(np.abs(voice)) or 1.0
    voice = (voice / peak * 0.89).astype(np.float32)
    sf.write(out_dir / "voice.wav", voice, SR)

    # Enveloppe RMS par image (pour faire bouger la bouche).
    hop = SR // FPS
    n = len(voice) // hop
    rms = np.sqrt(np.mean(voice[: n * hop].reshape(n, hop) ** 2, axis=1))
    env = np.clip(rms / (np.percentile(rms[rms > 0.01], 90) if np.any(rms > 0.01) else 1), 0, 1)

    timing = {"duration": round(len(voice) / SR, 3), "fps": FPS, "lines": lines,
              "meta": {"title": ep.get("title", ""), "handle": ep.get("handle", "")},
              "env": [round(float(v), 2) for v in env]}
    (out_dir / "timing.json").write_text(json.dumps(timing, ensure_ascii=False, indent=1))
    for l in lines:
        print(f"{l['start']:6.2f} → {l['end']:6.2f}  [{l['source']}] {l['id']}: {l['text']}")
    print(f"Durée totale : {timing['duration']:.2f} s")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else ROOT / "episodes" / "00-presentation")
