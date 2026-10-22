"""Inline fonts, logo and (optionally) the soundtrack into a single self-contained HTML file.

usage: python3 tools/build.py OUT.html [--audio soundtrack.m4a]
"""
import base64
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"


def data_uri(path, mime):
    return "data:%s;base64,%s" % (mime, base64.b64encode(path.read_bytes()).decode())


def main():
    args = sys.argv[1:]
    out = pathlib.Path(args[0])
    audio = pathlib.Path(args[args.index("--audio") + 1]) if "--audio" in args else None
    html = (SRC / "index.html").read_text(encoding="utf-8")
    subs = {
        "{{FONT_BRICO}}": data_uri(SRC / "assets/bricolage-latin.woff2", "font/woff2"),
        "{{FONT_FIG}}": data_uri(SRC / "assets/figtree-latin.woff2", "font/woff2"),
        "{{LOGO}}": data_uri(SRC / "assets/vomalia-logo.png", "image/png"),
        "{{AUDIO}}": data_uri(audio, "audio/mp4") if audio else "",
    }
    for key, val in subs.items():
        html = html.replace(key, val)
    out.write_text(html, encoding="utf-8")
    print("wrote %s (%d KB)" % (out, out.stat().st_size // 1024))


if __name__ == "__main__":
    main()
