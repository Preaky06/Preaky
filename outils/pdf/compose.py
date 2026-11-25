"""Assemble le portfolio imprimable à partir des pages du site.

Usage : python3 compose.py <racine du site> <sortie.html> [pages.json]

pages.json (facultatif) donne la page de début de chaque partie ; il sert à
remplir les numéros du sommaire lors du second rendu.
"""
import json
import os
import re
import sys

root, out = sys.argv[1], sys.argv[2]
pages = {}
if len(sys.argv) > 3 and os.path.exists(sys.argv[3]):
    pages = json.load(open(sys.argv[3], encoding='utf-8'))


def read(name):
    return open(os.path.join(root, name), encoding='utf-8').read()


def between(text, start, end):
    i = text.index(start)
    return text[i:text.index(end, i)]


idx = read('index.html')
head = idx[:idx.index('<body>')]
head = re.sub(r'<title>.*?</title>', '<title>Portfolio Maël Gillet · Preaky</title>', head)
head = head.replace('<link rel="stylesheet" href="assets/css/style.css">',
                    '<link rel="stylesheet" href="assets/css/style.css">\n<link rel="stylesheet" href="outils/pdf/pdf.css">')

sheet = re.search(r'<ul class="sheet".*?</ul>', idx, re.S).group(0)
about = re.search(r'<section class="section" id="a-propos".*?</section>', idx, re.S).group(0)
skills = re.search(r'<!-- ====== Disciplines ====== -->\s*(<section.*?</section>)', idx, re.S).group(1)
contact = re.search(r'<!-- ====== Contact ====== -->\s*(<section.*?</section>)', idx, re.S).group(1)
logos = between(idx, '<div class="pieces logos">', '      <div class="sub-head">')
posters_note = re.search(r'<div class="sub-head">.*?(<p class="label">.*?</p>)', idx, re.S).group(1)
posters = between(idx, '<div class="pieces posters">', '    </div>\n  </section>\n\n  <!-- ====== Disciplines')


def case(name, prefix):
    t = read(name)
    body = re.search(r'<main id="contenu">\s*<div class="wrap">(.*?)<a class="next"', t, re.S).group(1)
    # les études de cas partagent des id (case-title, s-identite…) : on les préfixe
    return re.sub(r'(id|aria-labelledby)="', lambda m: f'{m.group(1)}="{prefix}-', body)


def part(num, name, sub=''):
    side = f'<span class="pdf-part-sub label">{sub}</span>' if sub else ''
    return (f'<header class="pdf-part"><span class="pdf-part-num">{num}</span>'
            f'<span class="pdf-part-name">{name}</span>{side}</header>')


def chapter(pid, header, inner):
    return f'<section class="pdf-chapter" id="{pid}"><div class="wrap">{header}{inner}</div></section>\n'


def pg(pid):
    return f'<span class="pg">{pages.get(pid, "—")}</span>'


def toc_row(pid, num, title, sub):
    n = f'<span class="n">{num}</span>' if num else '<span class="n"></span>'
    return f'<a href="#{pid}">{n}<span class="t">{title}<small>{sub}</small></span>{pg(pid)}</a>'


cover = f'''<section class="pdf-cover" id="p-cover"><div class="wrap pdf-cover-inner">
  <div>
    <p class="label">Portfolio 2026</p>
    <h1 class="wordmark">Preaky<span>.</span></h1>
    <p class="pdf-cover-name">Maël Gillet</p>
    <p class="pdf-cover-role">Identité visuelle, affiche et produit numérique, de la première esquisse jusqu’à l’écran.</p>
  </div>
  {sheet}
  <dl class="pdf-cover-foot">
    <div><dt>Formation</dt><dd>Community Manager &amp; Communication Digitale, terminée en 2026</dd></div>
    <div><dt>Âge</dt><dd>21 ans</dd></div>
    <div><dt>Contact</dt><dd><a href="mailto:maelgillet18@gmail.com">maelgillet18@gmail.com</a></dd></div>
  </dl>
</div></section>
'''

toc = f'''<section class="pdf-toc" id="p-sommaire"><div class="wrap">
  <p class="label">Portfolio 2026 · Maël Gillet</p>
  <h2 class="pdf-toc-title">Sommaire</h2>
  <ol class="pdf-toc-list">
    <li>{toc_row('p-profil', '01', 'Profil', 'À propos, formation et compétences')}</li>
    <li>{toc_row('p-cinemood', '02', 'Réalisations', 'Trois produits numériques, de l’idée à la mise en ligne')}
      <ol>
        <li>{toc_row('p-cinemood', '', 'CinéMood', 'Web app · Le film qui colle à ton humeur')}</li>
        <li>{toc_row('p-vomalia', '', 'Vomalia', 'App mobile · Des fréquences pour chaque état')}</li>
        <li>{toc_row('p-sneaky', '', 'Sneaky', 'Jeu multijoueur · Le quiz d’infiltration')}</li>
      </ol>
    </li>
    <li>{toc_row('p-logos', '03', 'Logos et personnages', 'NOMADE, Elevator Men Club, monogramme tropical, Nuage')}</li>
    <li>{toc_row('p-affiches', '04', 'Affiches', 'Golden Coast et série football')}</li>
    <li>{toc_row('p-contact', '05', 'Contact', 'Pour un projet, un poste ou une collaboration')}</li>
  </ol>
</div></section>
'''

body = (cover + toc
        + chapter('p-profil', part('01', 'Profil'), about + skills)
        + chapter('p-cinemood', part('02', 'Réalisations', 'CinéMood · 1 / 3'), case('cinemood.html', 'cm'))
        + chapter('p-vomalia', part('02', 'Réalisations', 'Vomalia · 2 / 3'), case('vomalia.html', 'vo'))
        + chapter('p-sneaky', part('02', 'Réalisations', 'Sneaky · 3 / 3'), case('sneaky.html', 'sn'))
        + chapter('p-logos', part('03', 'Logos et personnages'), logos)
        + chapter('p-affiches', part('04', 'Affiches', 'Fan art pour la série football'), posters_note + posters)
        + chapter('p-contact', part('05', 'Contact'), contact))

# liens internes : pages du site et vignettes → parties du PDF
for page_name, pid in [('cinemood', 'p-cinemood'), ('vomalia', 'p-vomalia'), ('sneaky', 'p-sneaky')]:
    body = body.replace(f'href="{page_name}.html"', f'href="#{pid}"').replace(f'href="#{page_name}"', f'href="#{pid}"')
body = re.sub(r'<a [^>]*data-repo-only[^>]*>.*?</a>', '', body, flags=re.S)
body = body.replace(' data-artifact-only hidden', '').replace(' loading="lazy"', '')
# Chrome intègre les JPEG tels quels : un PDF bien plus léger qu'avec les WebP
body = re.sub(r'(assets/img/[\w-]+)\.webp', r'\1.jpg', body)

doc = head + '<body class="pdf">\n<main>\n' + body + '</main>\n</body>\n</html>\n'
open(out, 'w', encoding='utf-8').write(doc)
print('composé :', out, len(doc), 'octets,', 'avec numéros' if pages else 'sans numéros')
