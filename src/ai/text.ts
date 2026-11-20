// Small text tools shared by the mock provider and search: tokenising English, Hinglish and Devanagari,
// folding common Hindi and Hinglish words onto one concept, and a deterministic local embedding.

const CONCEPTS: Record<string, string[]> = {
  red: ['laal', 'lal', 'लाल', 'रेड'],
  blue: ['neela', 'nila', 'नीला', 'ब्लू'],
  green: ['hara', 'हरा', 'ग्रीन'],
  yellow: ['peela', 'pila', 'पीला'],
  black: ['kala', 'kaala', 'काला'],
  white: ['safed', 'सफेद', 'सफ़ेद'],
  pink: ['gulabi', 'गुलाबी'],
  orange: ['narangi', 'नारंगी'],
  shirt: ['kameez', 'kurta', 'शर्ट', 'कमीज', 'कुर्ता', 'tshirt'],
  dance: ['naach', 'nach', 'नाच', 'डांस', 'dancer', 'dancers', 'dancing', 'choreo', 'choreography', 'routine'],
  cook: ['banana', 'banani', 'banao', 'pakana', 'बनाना', 'पकाना', 'recipe', 'रेसिपी', 'cooking', 'cooks'],
  food: ['khana', 'खाना', 'dish'],
  sunday: ['ravivar', 'itvaar', 'itwar', 'रविवार', 'इतवार', 'संडे'],
  weekend: ['saptahant'],
  beach: ['samundar', 'samudra', 'समुद्र', 'बीच', 'kinara', 'coast', 'shack'],
  wedding: ['shaadi', 'shadi', 'शादी', 'sangeet', 'संगीत', 'mehendi', 'mehndi', 'मेहंदी'],
  tea: ['chai', 'चाय'],
  lamp: ['लैंप', 'light', 'batti'],
  plant: ['paudha', 'paudhe', 'पौधा', 'पौधे', 'plants'],
  road: ['rasta', 'raste', 'रास्ता', 'रास्ते', 'route'],
  morning: ['subah', 'सुबह', 'early'],
  bread: ['poi', 'pav', 'पाव', 'loaf', 'bakery'],
  place: ['jagah', 'जगह'],
  balcony: ['बालकनी', 'balkani'],
  shelf: ['शेल्फ', 'rack'],
  buy: ['kharidna', 'khareedna', 'खरीदना', 'lena', 'shop', 'price'],
  go: ['jaana', 'jana', 'जाना', 'visit', 'trip', 'travel', 'ghoomna'],
  scooter: ['scooty', 'bike', 'स्कूटर'],
  paneer: ['पनीर'],
  cafe: ['कैफे', 'coffee'],
  caption: ['कैप्शन'],
  hook: ['opening'],
  goa: ['गोवा'],
  exercise: ['exercises', 'kasrat', 'कसरत', 'physio'],
};

const TO_CONCEPT = new Map<string, string>();
for (const [concept, words] of Object.entries(CONCEPTS)) {
  TO_CONCEPT.set(concept, concept);
  for (const w of words) TO_CONCEPT.set(w, concept);
}

const STOP = new Set(
  ('the a an of for to in on at my me i is it this that and or with from by be was are ' +
    'hai ho tha thi ko ka ke ki se ye yeh wo woh wala wali wale is us par pe mein me aur bhi toh to hi ' +
    'है को का के की से ये वो वाला वाली वाले में पर और भी तो ही लिए liye ' +
    'one some thing something video reel post saved save').split(' '),
);

export const COLOUR_WORDS = ['red', 'blue', 'green', 'yellow', 'black', 'white', 'pink', 'orange', 'brown', 'purple', 'teal', 'grey'];

/** Lower-case words, Latin or Devanagari. Punctuation and digits-only tokens are dropped. */
export function words(text: string): string[] {
  return (text.toLowerCase().normalize('NFC').match(/[a-z0-9']+|[ऀ-ॿ]+/g) ?? []).filter((w) => !/^\d+$/.test(w));
}

function stem(w: string): string {
  if (/^[a-z]+$/.test(w) && w.length > 4) {
    if (w.endsWith('ing')) return w.slice(0, -3);
    if (w.endsWith('es')) return w.slice(0, -2);
    if (w.endsWith('s')) return w.slice(0, -1);
  }
  return w;
}

/** One concept per meaningful word: "laal", "लाल" and "red" all come out as "red". */
export function concepts(text: string): string[] {
  const out: string[] = [];
  for (const w of words(text)) {
    if (STOP.has(w)) continue;
    const c = TO_CONCEPT.get(w) ?? TO_CONCEPT.get(stem(w)) ?? stem(w);
    if (!STOP.has(c)) out.push(c);
  }
  return out;
}

export function sameConcept(a: string, b: string): boolean {
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length >= 4 && long.startsWith(short);
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const LOCAL_EMBED_DIM = 256;

/** Deterministic bag-of-concepts vector. A stand-in for a real embedding model, not a substitute for one. */
export function localEmbed(text: string): number[] {
  const v = new Array<number>(LOCAL_EMBED_DIM).fill(0);
  for (const c of concepts(text)) {
    v[hash(c) % LOCAL_EMBED_DIM] += 1;
    for (let i = 0; i + 3 <= c.length; i++) v[hash('#' + c.slice(i, i + 3)) % LOCAL_EMBED_DIM] += 0.25;
  }
  const norm = Math.hypot(...v);
  return norm === 0 ? v : v.map((x) => x / norm);
}

export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}
