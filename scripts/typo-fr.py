# Espaces insécables de la typographie française dans le texte d'une page HTML :
# avant ? ! : ; » et après «. Les balises, scripts et styles ne sont pas touchés.
import re, sys

def fix(text):
    text = re.sub(r" ([?!:;»])", r"&nbsp;\1", text)
    return text.replace("« ", "«&nbsp;")

for path in sys.argv[1:]:
    src = open(path, encoding="utf-8").read()
    parts = re.split(r"(<script\b.*?</script>|<style\b.*?</style>|<[^>]+>)", src, flags=re.S)
    out = "".join(p if p.startswith("<") else fix(p) for p in parts)
    if out != src:
        open(path, "w", encoding="utf-8").write(out)
        print(f"{path} : {sum(a != b for a, b in zip(parts, re.split(r'(<script\b.*?</script>|<style\b.*?</style>|<[^>]+>)', out, flags=re.S)))} segments corrigés")
