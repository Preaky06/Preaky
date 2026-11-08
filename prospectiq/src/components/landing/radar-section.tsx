// Section « Radar » de l'accueil : la veille quotidienne, illustrée par un fil d'exemple (entreprises FICTIVES).
import { Sparkles, KanbanSquare, UserRoundCog, ShieldAlert, Mail, Check } from 'lucide-react';

const TYPES = [
  { icon: Sparkles, title: 'Nouvelles entreprises', text: 'Créations et immatriculations dans vos zones et vos secteurs, vérifiées dans le répertoire SIRENE.', tone: 'bg-violet-50 text-violet-700' },
  { icon: KanbanSquare, title: 'Cessions de fonds', text: 'Un nouveau propriétaire reprend un commerce : il choisit souvent ses nouveaux prestataires.', tone: 'bg-indigo-50 text-indigo-700' },
  { icon: UserRoundCog, title: 'Changements chez vos prospects', text: 'Nouveau dirigeant, nouveau nom, déménagement : le bon moment pour relancer.', tone: 'bg-emerald-50 text-emerald-700' },
  { icon: ShieldAlert, title: 'Risques chez vos clients', text: 'Procédure collective publiée : vous êtes prévenu avant d’envoyer la prochaine facture.', tone: 'bg-rose-50 text-rose-700' },
];

const FEED = [
  { dot: '#8b5cf6', title: 'Nouvelle entreprise : Atelier Exemple', detail: 'Restauration traditionnelle · Lyon (69002)', when: '7 h 02' },
  { dot: '#6366f1', title: 'Cession de fonds : Boulangerie Fictive', detail: 'Boulangerie-pâtisserie · Villeurbanne (69100)', when: '7 h 02' },
  { dot: '#10b981', title: 'Signal : Garage Démo', detail: 'Changement de dirigeant · bon moment pour reprendre contact', when: 'Hier' },
  { dot: '#e11d48', title: 'Alerte risque : Client Exemple', detail: 'Procédure collective publiée · vérifiez vos créances', when: 'Lun.' },
];

export function RadarSection() {
  return (
    <section id="radar" className="relative isolate overflow-hidden border-y border-line bg-white py-24">
      <div className="bg-dots pointer-events-none absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,#000,transparent_60%)]" />
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1fr_1.05fr]">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-electric-600 uppercase">
            <span className="bg-spectrum h-[3px] w-5 rounded-full" />
            Le Radar
          </p>
          <h2 className="font-display mt-4 text-[1.8rem] leading-[1.16] font-semibold tracking-[-0.02em] text-balance sm:text-[2.35rem]">
            Chaque matin, les entreprises qui <span className="text-spectrum-deep">viennent de bouger.</span>
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-slate-600">
            Le Radar lit les annonces officielles publiées dans vos zones et sur les entreprises que vous suivez, puis vous signale celles qui comptent. Vous contactez au moment où le besoin apparaît.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {TYPES.map(({ icon: Icon, title, text, tone }) => (
              <li key={title} className="flex gap-3">
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone}`}>
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{text}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="size-4 text-electric-600" /> Résumé par e-mail, quotidien ou hebdomadaire
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-4 text-emerald-600" strokeWidth={3} /> Inclus dans toutes les offres
            </span>
          </p>
        </div>

        <figure className="relative mx-auto w-full max-w-[520px]" aria-label="Illustration du fil du Radar avec des entreprises fictives">
          {/* Balayage radar */}
          <div className="pointer-events-none absolute top-1/2 left-1/2 -z-10 aspect-square w-[130%] -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
            <div className="absolute inset-0 rounded-full border border-electric-200/60" />
            <div className="absolute inset-[16%] rounded-full border border-electric-200/60" />
            <div className="absolute inset-[32%] rounded-full border border-electric-200/60" />
            <div className="radar-sweep absolute inset-0 rounded-full" />
          </div>
          <div className="rounded-3xl border border-line bg-white/90 p-2 shadow-pop backdrop-blur">
            <div className="flex items-center justify-between px-3 pt-2 pb-3">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <span className="animate-pulse-dot size-2 rounded-full bg-emerald-500" />
                Radar · ce matin
              </p>
              <span className="rounded-full bg-electric-50 px-2 py-0.5 text-xs font-semibold text-electric-700">4 nouveautés</span>
            </div>
            <ul className="stagger space-y-1.5">
              {FEED.map((f) => (
                <li key={f.title} className="flex items-start gap-3 rounded-2xl bg-canvas/80 px-3.5 py-3">
                  <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: f.dot }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{f.title}</p>
                    <p className="truncate text-xs text-slate-500">{f.detail}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-slate-400">{f.when}</span>
                </li>
              ))}
            </ul>
            <figcaption className="px-3 pt-3 pb-1.5 text-[11px] text-slate-400">Illustration · entreprises fictives. Source réelle : annonces du BODACC et répertoire SIRENE.</figcaption>
          </div>
        </figure>
      </div>
    </section>
  );
}
