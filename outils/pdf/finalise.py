"""Étapes après le rendu Chromium.

python3 finalise.py pages <rendu.pdf> <pages.json>
    relève la page de début de chaque partie (destinations nommées du PDF).
python3 finalise.py final <rendu.pdf> <pages.json> <sortie.pdf>
    ajoute le pied de page de chaque page, les signets et les métadonnées.
"""
import io
import json
import sys

from pypdf import PdfReader, PdfWriter
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas

# (id de la partie, texte du pied de page, signet, signet parent)
PARTS = [
    ('p-cover', None, 'Couverture', None),
    ('p-sommaire', 'Sommaire', 'Sommaire', None),
    ('p-profil', '01 · Profil', '01 · Profil', None),
    ('p-cinemood', '02 · Réalisations · CinéMood', 'CinéMood', '02 · Réalisations'),
    ('p-vomalia', '02 · Réalisations · Vomalia', 'Vomalia', '02 · Réalisations'),
    ('p-sneaky', '02 · Réalisations · Sneaky', 'Sneaky', '02 · Réalisations'),
    ('p-logos', '03 · Logos et personnages', '03 · Logos et personnages', None),
    ('p-affiches', '04 · Affiches', '04 · Affiches', None),
    ('p-contact', '05 · Contact', '05 · Contact', None),
]
MARGIN_X = 64 * 0.7 * 0.75   # marge intérieure du site (64 px) à l'échelle 0,7, en points


def start_pages(reader):
    # Chrome nomme les destinations d'après l'id visé, précédé d'une barre : « /p-profil »
    named = {k.lstrip('/'): v for k, v in reader.named_destinations.items()}
    found = {'p-cover': 1, 'p-sommaire': 2}   # la couverture tient sur une page
    for pid, *_ in PARTS:
        if pid in named:
            found[pid] = reader.get_destination_page_number(named[pid]) + 1
    return found


def footer_overlay(width, height, left, right):
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(width, height))
    c.setFont('Helvetica', 7.5)
    c.setFillColor(HexColor('#4D5066'))
    c.drawString(MARGIN_X, 22, left)
    c.drawRightString(width - MARGIN_X, 22, right)
    c.save()
    buf.seek(0)
    return PdfReader(buf).pages[0]


def main():
    mode, src, pages_json = sys.argv[1], sys.argv[2], sys.argv[3]
    reader = PdfReader(src)
    if mode == 'pages':
        found = start_pages(reader)
        missing = [pid for pid, *_ in PARTS if pid not in found]
        if missing:
            sys.exit(f'parties introuvables dans le PDF : {missing}')
        json.dump(found, open(pages_json, 'w'), indent=1)
        print('pages :', found)
        return

    found = json.load(open(pages_json))
    if found != start_pages(reader):
        sys.exit('les pages ont bougé entre les deux rendus : relancer la construction')
    total = len(reader.pages)
    writer = PdfWriter(clone_from=reader)
    starts = sorted((found[pid], label) for pid, label, *_ in PARTS)
    for i, page in enumerate(writer.pages, start=1):
        label = [lab for p, lab in starts if p <= i][-1]
        if label is None:
            continue
        w, h = float(page.mediabox.width), float(page.mediabox.height)
        page.merge_page(footer_overlay(w, h, 'Maël Gillet · Preaky · Portfolio 2026', f'{label}    {i} / {total}'))

    parents = {}
    for pid, _, title, parent in PARTS:
        target = found[pid] - 1
        if parent and parent not in parents:
            parents[parent] = writer.add_outline_item(parent, target)
        writer.add_outline_item(title, target, parent=parents.get(parent))
    writer.add_metadata({
        '/Title': 'Portfolio Maël Gillet · Preaky',
        '/Author': 'Maël Gillet',
        '/Subject': 'Produits numériques, logos, affiches et illustration 3D',
    })
    writer.page_mode = '/UseOutlines'
    with open(sys.argv[4], 'wb') as f:
        writer.write(f)
    print('final :', sys.argv[4], total, 'pages')


main()
