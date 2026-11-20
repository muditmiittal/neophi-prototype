// Export: your data, portable. JSON is the full state; Markdown and CSV are readable summaries.

import { chipLabel, reasonOf } from './reason';
import type { AppState, Memory } from '../store/types';

export function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;

export function toCsv(state: AppState): string {
  const head = ['id', 'saved_at', 'title', 'url', 'platform', 'your_note', 'you_chose', 'reason_source', 'category', 'projects', 'source_state', 'private', 'ai_suggestions'];
  const rows = state.memories.map((m) =>
    [
      m.id,
      m.createdAt,
      m.title,
      m.source.url ?? '',
      m.source.platform,
      m.note ?? '',
      m.chosenIntent ? chipLabel(m.chosenIntent) : '',
      reasonOf(m).rung,
      state.categories.find((c) => c.id === m.categoryId)?.name ?? '',
      m.projectIds.map((p) => state.projects.find((x) => x.id === p)?.name ?? p).join('; '),
      m.sourceNow,
      m.private ? 'yes' : 'no',
      m.private || m.suggestionsRemoved ? '' : (m.analysis?.inferred_possible_intents.map((i) => `${i.intent} (${Math.round(i.confidence * 100)}%)`).join('; ') ?? ''),
    ]
      .map(csvCell)
      .join(','),
  );
  return [head.join(','), ...rows].join('\r\n');
}

export function memoryToMarkdown(m: Memory, state: AppState): string {
  const a = m.private ? null : m.analysis;
  const lines = [`## ${m.title}`, '', `- Saved: ${m.createdAt.slice(0, 10)}`];
  if (m.source.url) lines.push(`- Link: ${m.source.url}`);
  lines.push(`- Source state: ${m.sourceNow}`);
  const cat = state.categories.find((c) => c.id === m.categoryId)?.name;
  if (cat) lines.push(`- Category: ${cat}`);
  lines.push('', '### Your words', '', m.note ? `> ${m.note}` : '_No note._');
  m.extraNotes.forEach((n) => lines.push('', `> ${n.text}`));
  if (m.chosenIntent) lines.push('', `You chose: ${chipLabel(m.chosenIntent)}`);
  lines.push('', '### Source shows', '');
  if (m.private) lines.push('_Private memory. AI is off; nothing was read._');
  else if (!a || !(a.source_access_state === 'available' || a.source_access_state === 'user_provided')) lines.push('_The source was not read._');
  else {
    if (a.source_summary) lines.push(a.source_summary, '');
    a.observed_objects.forEach((o) => lines.push(`- ${o.label} (${o.uncertain ? 'not sure, no evidence' : (a.evidence.find((e) => e.id === o.evidence)?.ref ?? '')})`));
  }
  lines.push('', '### AI suggestions (can be wrong)', '');
  const s = m.private || m.suggestionsRemoved ? [] : (a?.inferred_possible_intents ?? []);
  if (s.length) s.forEach((i) => lines.push(`- ${i.intent}: ${Math.round(i.confidence * 100)}% ${i.uncertain ? '(not sure)' : ''}`));
  else lines.push('_None._');
  return lines.join('\n');
}

export function toMarkdown(state: AppState): string {
  return [`# Neophi export`, '', `${state.memories.length} memories, exported ${new Date().toISOString().slice(0, 10)}.`, '', ...state.memories.map((m) => memoryToMarkdown(m, state) + '\n')].join('\n');
}
