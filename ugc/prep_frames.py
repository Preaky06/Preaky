"""Convertit la capture horodatée (capture.js) en séquence à cadence fixe 30 i/s.
Usage : python3 prep_frames.py <dossier-capture>  ->  rec/00000.jpg… (liens) + rec/rec.js"""
import bisect, json, os, sys

cap = os.path.abspath(sys.argv[1])
FPS = 30
frames = sorted(os.listdir(os.path.join(cap, 'frames')), key=lambda f: float(f[:-4]))
ts = [float(f[:-4]) for f in frames]
events = json.load(open(os.path.join(cap, 'events.json')))
t0 = events[0]['t']

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'rec')
os.makedirs(out, exist_ok=True)
for f in os.listdir(out):
    os.remove(os.path.join(out, f))
n = int((ts[-1] - t0) * FPS)
for i in range(n):
    j = max(0, bisect.bisect_right(ts, t0 + i / FPS) - 1)
    os.symlink(os.path.join(cap, 'frames', frames[j]), os.path.join(out, f'{i:05d}.jpg'))
ev = [{**e, 't': round(e['t'] - t0, 3)} for e in events]
data = json.dumps({'fps': FPS, 'count': n, 'events': ev})
# chargé par <script> : fetch() ne fonctionne pas en file://
open(os.path.join(out, 'rec.js'), 'w').write(f'window.REC_DATA = {data};\n')
print(n, 'images')
