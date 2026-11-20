// Half-remembered search. Each result carries the reasons it matched, in terms of the three lanes,
// so the user can see whether a hit came from their own words, from the source, or from an AI suggestion.

import { concepts, cosine, localEmbed, sameConcept, words } from '../ai/text';
import { memoryText } from './categorise';
import { chipLabel, fmtDate } from './reason';
import type { Category, Memory } from '../store/types';

export type MatchLane = 'Your words' | 'You chose' | 'Source shows' | 'AI suggestion' | 'When' | 'Category' | 'Close in meaning';

export interface MatchReason {
  lane: MatchLane;
  text: string;
}

export interface SearchHit {
  memory: Memory;
  score: number;
  reasons: MatchReason[];
}

interface TimeRange {
  label: string;
  from: Date;
  to: Date;
}

const TIME_PHRASES: { re: RegExp; range: (now: Date) => TimeRange }[] = [
  {
    re: /\b(last month|pichle mahine|pichhle mahine|pichle month)\b|पिछले महीने/i,
    range: (n) => ({ label: 'last month', from: new Date(n.getFullYear(), n.getMonth() - 1, 1), to: new Date(n.getFullYear(), n.getMonth(), 1) }),
  },
  {
    re: /\b(this month|is mahine)\b|इस महीने/i,
    range: (n) => ({ label: 'this month', from: new Date(n.getFullYear(), n.getMonth(), 1), to: new Date(n.getFullYear(), n.getMonth() + 1, 1) }),
  },
  {
    re: /\b(last week|pichle hafte|pichhle hafte|pichle week)\b|पिछले हफ्ते/i,
    range: (n) => ({ label: 'last week', from: new Date(n.getTime() - 14 * 86_400_000), to: new Date(n.getTime() - 6 * 86_400_000) }),
  },
  {
    re: /\b(this week|is hafte|few days ago|kuch din pehle)\b|इस हफ्ते/i,
    range: (n) => ({ label: 'the last 7 days', from: new Date(n.getTime() - 7 * 86_400_000), to: n }),
  },
  {
    re: /\b(yesterday|kal)\b|कल/i,
    range: (n) => ({ label: 'yesterday', from: new Date(n.getFullYear(), n.getMonth(), n.getDate() - 1), to: new Date(n.getFullYear(), n.getMonth(), n.getDate()) }),
  },
];

export function parseQuery(query: string, now = new Date()): { terms: string[]; time: TimeRange | null } {
  let rest = query;
  let time: TimeRange | null = null;
  for (const p of TIME_PHRASES) {
    if (p.re.test(rest)) {
      time = p.range(now);
      rest = rest.replace(p.re, ' ');
      break;
    }
  }
  return { terms: [...new Set(concepts(rest))], time };
}

const quote = (list: string[]) => list.map((t) => `"${t}"`).join(' and ');

function hits(terms: string[], text: string): string[] {
  const have = concepts(text);
  return terms.filter((t) => have.some((h) => sameConcept(t, h)));
}

/** The words of the original text that stand for the matched concepts, for the explanation line. */
function originalWords(matched: string[], text: string): string[] {
  const out: string[] = [];
  for (const w of words(text)) {
    const c = concepts(w)[0];
    if (c && matched.some((m) => sameConcept(m, c)) && !out.includes(w)) out.push(w);
  }
  return out.slice(0, 4);
}

export function search(query: string, memories: Memory[], categories: Category[], now = new Date(), semantic?: Map<string, number>): SearchHit[] {
  const { terms, time } = parseQuery(query, now);
  if (terms.length === 0 && !time) return [];
  const qv = localEmbed(terms.join(' '));
  const out: SearchHit[] = [];

  for (const m of memories) {
    const reasons: MatchReason[] = [];
    let score = 0;
    const a = m.private ? null : m.analysis;
    const covered = new Set<string>();
    const add = (lane: MatchLane, text: string, weight: number, matched: string[]) => {
      reasons.push({ lane, text });
      score += weight * matched.length;
      matched.forEach((t) => covered.add(t));
    };

    const noteText = [m.note ?? '', ...m.extraNotes.map((n) => n.text)].join(' ');
    const inNote = hits(terms, noteText);
    if (inNote.length) add('Your words', `${quote(originalWords(inNote, noteText))} ${inNote.length > 1 ? 'are' : 'is'} in your note`, 3, inNote);

    if (m.chosenIntent) {
      const inChip = hits(terms, chipLabel(m.chosenIntent));
      if (inChip.length) add('You chose', `you marked it ${chipLabel(m.chosenIntent)}`, 2, inChip);
    }

    if (a) {
      const seenText = [a.source_summary, ...a.observed_objects.filter((o) => !o.uncertain).map((o) => o.label), ...a.visible_text, a.transcript_summary].join(' ');
      const inSource = hits(terms, seenText).filter((t) => !inNote.includes(t));
      if (inSource.length) {
        const obs = a.observed_objects.find((o) => !o.uncertain && hits(inSource, o.label).length);
        const ev = obs?.evidence ? a.evidence.find((e) => e.id === obs.evidence) : undefined;
        add('Source shows', obs ? `${obs.label.charAt(0).toLowerCase()}${obs.label.slice(1)}${ev ? ` (${ev.ref})` : ''}` : `${quote(originalWords(inSource, seenText))} in what the source shows`, 2, inSource);
      }
      const suggested = a.inferred_possible_intents.filter((i) => !i.uncertain && !m.suggestionsRemoved).map((i) => i.intent).join(' ');
      const inAi = hits(terms, suggested).filter((t) => !covered.has(t));
      if (inAi.length) add('AI suggestion', `${quote(originalWords(inAi, suggested))} appears in an AI suggestion, not in your words`, 1, inAi);
    }

    const captionText = [m.source.caption ?? '', m.title].join(' ');
    const inCaption = hits(terms, captionText).filter((t) => !covered.has(t));
    if (inCaption.length && !m.private) add('Source shows', `${quote(originalWords(inCaption, captionText))} ${inCaption.length > 1 ? 'are' : 'is'} in the caption or title`, 1.5, inCaption);

    const cat = categories.find((c) => c.id === m.categoryId);
    if (cat) {
      const inCat = hits(terms, cat.name).filter((t) => !covered.has(t));
      if (inCat.length) add('Category', `it is in ${cat.name}`, 1, inCat);
    }

    const sem = semantic?.get(m.id);
    if (sem != null && sem > 0.6) {
      reasons.push({ lane: 'Close in meaning', text: 'close in meaning to your query (Gemini embedding)' });
      score += sem * 3;
    } else if (!semantic && terms.length) {
      score += cosine(qv, localEmbed(m.private ? noteText : memoryText(m))) * 1.5;
    }

    const textMatched = reasons.length > 0;
    if (time) {
      const d = new Date(m.createdAt);
      if (d >= time.from && d < time.to) {
        if (textMatched || terms.length === 0) {
          reasons.push({ lane: 'When', text: `saved on ${fmtDate(m.createdAt)}, which is ${time.label}` });
          score += 2;
        }
      } else if (textMatched) {
        reasons.push({ lane: 'When', text: `saved on ${fmtDate(m.createdAt)}, not ${time.label}; shown anyway because the words match` });
        score *= 0.6;
      }
    }

    if (reasons.length && score > 0.5) out.push({ memory: m, score, reasons });
  }
  return out.sort((x, y) => y.score - x.score);
}
