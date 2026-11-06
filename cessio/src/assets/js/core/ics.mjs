// Rappels d'échéance au format iCalendar (.ics) : importables dans Google Agenda, Apple Calendrier, Outlook.
import { contractEnd } from './contract.mjs';
import { parseISO, dateShort } from './format.mjs';

const escText = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');

/** Plie les lignes à 75 octets (RFC 5545). */
function fold(line) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out = [];
  let current = '';
  let size = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (size + n > (out.length ? 74 : 75)) {
      out.push(current);
      current = '';
      size = 0;
    }
    current += ch;
    size += n;
  }
  out.push(current);
  return out.join('\r\n ');
}

function event({ uid, date, summary, description }) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + 1);
  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')}`,
    `DTSTART;VALUE=DATE:${ymd(date)}`,
    `DTEND;VALUE=DATE:${ymd(next)}`,
    `SUMMARY:${escText(summary)}`,
    `DESCRIPTION:${escText(description)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escText(summary)}`,
    'TRIGGER:-PT0M',
    'END:VALARM',
    'END:VEVENT',
  ];
}

/** Deux événements par cession à durée limitée : rappel à J-30 et jour d'échéance. */
export function buildIcs(contracts, { brand = 'Cessio', daysBefore = 30 } = {}) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//${brand}//Echeances de cessions//FR`, 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${escText(`${brand} – échéances`)}`];
  let count = 0;
  for (const c of contracts) {
    const endISO = contractEnd(c);
    if (!endISO) continue;
    const end = parseISO(endISO);
    const reminder = new Date(end);
    reminder.setUTCDate(reminder.getUTCDate() - daysBefore);
    const what = `${c.client?.name || 'Client'} – ${c.works?.[0]?.title || 'œuvre'}`;
    lines.push(
      ...event({ uid: `${c.id}-rappel@cessio`, date: reminder, summary: `Renouveler la cession : ${what}`, description: `La cession ${c.number || ''} expire le ${dateShort(endISO)}. Proposez un renouvellement (avenant) au client avant cette date.` }),
      ...event({ uid: `${c.id}-fin@cessio`, date: end, summary: `Fin de cession : ${what}`, description: `Dernier jour de la cession ${c.number || ''}. Au-delà, toute nouvelle exploitation nécessite un renouvellement.` }),
    );
    count++;
  }
  lines.push('END:VCALENDAR');
  return { text: lines.map(fold).join('\r\n') + '\r\n', count };
}
