// Original illustrations standing in for the media of sample saves. Nothing here is taken from any real post.
// Every scene is drawn on a 100 x 125 canvas (4:5), so evidence regions can be given in percent.

import type { ReactNode } from 'react';

export type SceneId =
  | 'dance'
  | 'paneer'
  | 'dosa'
  | 'shack'
  | 'scooter'
  | 'cafe'
  | 'desk'
  | 'drape'
  | 'quote'
  | 'chai'
  | 'shelf'
  | 'none';

function Person({ x, shirt, skin = '#c98f62', hair = '#2a211b', lift = 0, arm = 0 }: { x: number; shirt: string; skin?: string; hair?: string; lift?: number; arm?: number }) {
  return (
    <g transform={`translate(${x} ${48 - lift})`}>
      <path d={`M2 20 L${-3 - arm} ${8 - arm * 2}`} stroke={skin} strokeWidth="2.6" strokeLinecap="round" />
      <path d={`M12 20 L${17 + arm} ${8 - arm * 2}`} stroke={skin} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M4 40 L3 58 M10 40 L11 58" stroke="#2f2a33" strokeWidth="3.4" strokeLinecap="round" />
      <rect x="1" y="15" width="12" height="27" rx="4" fill={shirt} />
      <circle cx="7" cy="9" r="5" fill={skin} />
      <path d="M2 8 a5 5 0 0 1 10 0 q-5 -3 -10 0z" fill={hair} />
    </g>
  );
}

const scenes: Record<Exclude<SceneId, 'none'>, (t: number) => ReactNode> = {
  dance: (t) => {
    const beat = Math.sin(t * 9) * 1.6;
    return (
      <>
        <rect width="100" height="125" fill="#e9d3b4" />
        <rect y="0" width="100" height="34" fill="#d8b98f" />
        <path d="M0 14 q12 9 25 0 t25 0 t25 0 t25 0" fill="none" stroke="#b5532f" strokeWidth="1.2" />
        {[8, 21, 34, 47, 60, 73, 86].map((x, i) => (
          <circle key={x} cx={x + 5} cy={i % 2 ? 19 : 21} r="2" fill={['#e0a526', '#0f6b66', '#d43a14'][i % 3]} />
        ))}
        <rect y="100" width="100" height="25" fill="#a9825c" />
        <ellipse cx="50" cy="107" rx="46" ry="5" fill="#93704d" opacity=".5" />
        <Person x={6} shirt="#0f6b66" lift={beat} arm={2} />
        <Person x={25} shirt="#d7301a" lift={-beat} arm={4} skin="#b97b4f" />
        <Person x={44} shirt="#e0a526" lift={beat} arm={1} skin="#d9a273" />
        <Person x={63} shirt="#f4ecdc" lift={-beat} arm={3} />
        <Person x={81} shirt="#27345e" lift={beat} arm={2} skin="#a86f47" />
        <rect x="6" y="113" width="34" height="7" rx="1.5" fill="#17130e" opacity=".82" />
        <text x="9" y="118.2" fontSize="4.4" fill="#fff" fontFamily="Inter Variable, sans-serif" fontWeight="600">Counts 1 to 8</text>
      </>
    );
  },
  paneer: () => (
    <>
      <rect width="100" height="125" fill="#3b3430" />
      <rect y="82" width="100" height="43" fill="#6b4a36" />
      <ellipse cx="50" cy="76" rx="36" ry="13" fill="#1d1a19" />
      <ellipse cx="50" cy="73" rx="32" ry="10" fill="#c9551f" />
      <ellipse cx="50" cy="72" rx="27" ry="7.5" fill="#dd7a2a" />
      {[[36, 70], [47, 74], [58, 69], [66, 73], [42, 76], [54, 77]].map(([x, y]) => (
        <rect key={`${x}${y}`} x={x} y={y - 3} width="6.5" height="5" rx="1" fill="#f6e9cf" transform={`rotate(${(x * 7) % 30 - 15} ${x} ${y})`} />
      ))}
      {[[40, 68], [52, 71], [61, 75], [46, 78], [57, 66]].map(([x, y]) => (
        <path key={`${x}-${y}`} d={`M${x} ${y} l2 -1 l1 2z`} fill="#4c7a34" />
      ))}
      <rect x="84" y="70" width="16" height="4" rx="2" fill="#1d1a19" />
      <path d="M38 52 q-5 -8 0 -15 M50 50 q-5 -9 0 -18 M62 52 q-5 -8 0 -15" fill="none" stroke="#f4ecdc" strokeWidth="1.4" strokeLinecap="round" opacity=".55" />
      <g transform="translate(60 22) rotate(18)">
        <path d="M0 0 q9 -6 18 0 l-3 9 h-12z" fill="#c98f62" />
        <path d="M5 10 l1 5 M9 10 v6 M13 10 l-1 5" stroke="#6f8f3f" strokeWidth="1" strokeLinecap="round" />
      </g>
    </>
  ),
  dosa: () => (
    <>
      <rect width="100" height="125" fill="#d9c7a3" />
      <path d="M0 0 h100 v125 h-100z" fill="#c9b48c" opacity=".35" />
      <ellipse cx="50" cy="66" rx="40" ry="38" fill="#7d8f7a" />
      <ellipse cx="50" cy="66" rx="34" ry="32" fill="#93a48d" />
      <path d="M22 70 q26 -34 56 -8 q-24 26 -56 8z" fill="#8a5a3a" />
      <path d="M26 69 q24 -26 48 -7" fill="none" stroke="#a9744d" strokeWidth="1.5" />
      <circle cx="68" cy="84" r="7" fill="#f4ecdc" />
      <circle cx="68" cy="84" r="5" fill="#e8dcc0" />
      <circle cx="34" cy="88" r="6" fill="#b5391a" />
      <circle cx="34" cy="88" r="4" fill="#cf4d22" />
      <rect x="8" y="8" width="44" height="9" rx="2" fill="#17130e" opacity=".8" />
      <text x="11" y="14.4" fontSize="4.6" fill="#fff" fontFamily="Inter Variable, sans-serif" fontWeight="600">5 ingredients</text>
    </>
  ),
  shack: () => (
    <>
      <rect width="100" height="125" fill="#f3c98b" />
      <rect width="100" height="52" fill="#f0a35e" />
      <circle cx="72" cy="50" r="13" fill="#f6e2a8" />
      <rect y="52" width="100" height="22" fill="#2f7f86" />
      <path d="M0 58 q12 -3 25 0 t25 0 t25 0 t25 0" stroke="#bfe3df" strokeWidth="1" fill="none" opacity=".7" />
      <path d="M0 74 q30 -6 100 0 v51 h-100z" fill="#e6cfa0" />
      <path d="M8 70 l24 -16 l24 16z" fill="#8b5a33" />
      <path d="M8 70 l24 -16 l24 16" fill="none" stroke="#6d4425" strokeWidth="1.4" />
      <rect x="13" y="70" width="38" height="26" fill="#b98352" />
      <rect x="18" y="77" width="12" height="19" fill="#5f3d22" />
      <rect x="34" y="77" width="13" height="9" fill="#f4ecdc" />
      <rect x="15" y="62" width="34" height="7" rx="1" fill="#f4ecdc" />
      <text x="18" y="67.2" fontSize="4.2" fill="#17130e" fontFamily="Inter Variable, sans-serif" fontWeight="700">OPEN TILL SUNSET</text>
      <path d="M82 96 v-34" stroke="#6d4425" strokeWidth="2" />
      <path d="M82 62 q-12 -6 -18 2 M82 62 q10 -9 17 -2 M82 62 q-4 -12 -14 -12 M82 62 q5 -11 14 -10" fill="none" stroke="#2e6b3c" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="62" y="100" width="20" height="3" rx="1.5" fill="#d43a14" />
      <path d="M64 103 v8 M80 103 v8" stroke="#6d4425" strokeWidth="1.4" />
    </>
  ),
  scooter: () => (
    <>
      <rect width="100" height="125" fill="#bfdcd6" />
      <path d="M0 62 l22 -24 l16 14 l18 -26 l22 22 l22 -12 v89 h-100z" fill="#4f8068" />
      <path d="M0 78 l30 -14 l28 10 l42 -16 v67 h-100z" fill="#3b6a55" />
      <path d="M62 125 q-18 -30 2 -48 q10 -9 -4 -17" fill="none" stroke="#e9dcc0" strokeWidth="9" strokeLinecap="round" />
      <path d="M62 125 q-18 -30 2 -48 q10 -9 -4 -17" fill="none" stroke="#fff" strokeWidth=".8" strokeDasharray="3 4" />
      <g transform="translate(36 86)">
        <circle cx="4" cy="16" r="4.5" fill="#17130e" />
        <circle cx="24" cy="16" r="4.5" fill="#17130e" />
        <path d="M4 16 l5 -9 h10 l5 9z" fill="#e0a526" />
        <path d="M19 7 l-1 -7 h4" stroke="#17130e" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <rect x="8" y="4" width="9" height="3.5" rx="1.5" fill="#17130e" />
      </g>
      <rect x="66" y="26" width="13" height="10" fill="#a08a72" />
      <path d="M64 26 h17 v-3 h-3 v2 h-3 v-2 h-3 v2 h-3 v-2 h-5z" fill="#a08a72" />
    </>
  ),
  cafe: () => (
    <>
      <rect width="100" height="125" fill="#fbf7ee" />
      <rect x="8" y="9" width="46" height="5" rx="1" fill="#17130e" />
      <rect x="8" y="18" width="70" height="2.4" rx="1" fill="#b9ad98" />
      <rect x="8" y="23" width="56" height="2.4" rx="1" fill="#b9ad98" />
      <rect x="8" y="32" width="84" height="38" rx="2" fill="#e7c08a" />
      <ellipse cx="38" cy="54" rx="17" ry="9" fill="#f4ecdc" />
      <ellipse cx="38" cy="52" rx="10" ry="5" fill="#c58b4e" />
      <ellipse cx="34" cy="51" rx="4" ry="2.4" fill="#d9a468" />
      <circle cx="70" cy="50" r="8" fill="#f4ecdc" />
      <circle cx="70" cy="50" r="5.5" fill="#6b4226" />
      {[78, 84, 90, 100, 106, 112].map((y, i) => (
        <rect key={y} x="8" y={y} width={[80, 74, 62, 78, 70, 40][i]} height="2.4" rx="1" fill="#b9ad98" />
      ))}
      <rect x="8" y="94" width="30" height="3" rx="1" fill="#17130e" />
    </>
  ),
  desk: () => (
    <>
      <rect width="100" height="125" fill="#2b3340" />
      <rect y="84" width="100" height="41" fill="#1f2530" />
      <rect x="6" y="82" width="88" height="5" rx="1" fill="#b98352" />
      <rect x="24" y="38" width="46" height="30" rx="2" fill="#11151c" />
      <rect x="26" y="40" width="42" height="26" rx="1" fill="#3f6f8f" />
      <path d="M26 58 l10 -8 l8 6 l9 -10 l15 12 v8 h-42z" fill="#274b63" />
      <rect x="44" y="68" width="6" height="10" fill="#11151c" />
      <rect x="36" y="78" width="22" height="3" rx="1" fill="#11151c" />
      <path d="M84 82 v-22 l-12 -16" fill="none" stroke="#d8d2c4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M66 40 l10 2 l-3 8 l-10 -4z" fill="#e0a526" />
      <path d="M62 50 l-14 22 h22z" fill="#f6e2a8" opacity=".22" />
      <rect x="10" y="70" width="10" height="12" rx="1" fill="#4f8068" />
      <path d="M15 70 q-6 -8 -2 -14 M15 70 q5 -9 3 -15" stroke="#6fae86" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <rect x="30" y="92" width="34" height="4" rx="1.5" fill="#39424f" />
    </>
  ),
  drape: () => (
    <>
      <rect width="100" height="125" fill="#f1e2d2" />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${4 + i * 32} 12)`}>
          <rect width="28" height="100" rx="2" fill={['#ead3bd', '#e4c7ad', '#ead3bd'][i]} />
          <circle cx="14" cy="16" r="5.5" fill="#b97b4f" />
          <path d="M8.5 15 a5.5 5.5 0 0 1 11 0 q-5.5 -4 -11 0z" fill="#2a211b" />
          <path d="M7 24 h14 l5 62 h-24z" fill={['#a8324a', '#0f6b66', '#7a4a8c'][i]} />
          <path d={['M21 24 q8 30 -2 62', 'M7 24 q16 14 14 62', 'M7 26 q10 -6 14 0 q4 26 -8 40'][i]} fill="none" stroke={['#e0a526', '#f0c14e', '#e0a526'][i]} strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="14" cy="94" r="3.4" fill="#17130e" />
          <text x="14" y="95.6" fontSize="4.2" textAnchor="middle" fill="#fff" fontFamily="Inter Variable, sans-serif" fontWeight="700">{i + 1}</text>
        </g>
      ))}
    </>
  ),
  quote: () => (
    <>
      <rect width="100" height="125" fill="#17130e" />
      <rect x="9" y="12" width="12" height="3" fill="#d43a14" />
      <text fontFamily="Fraunces Variable, Georgia, serif" fontSize="12.5" fill="#f4ecdc" fontWeight="600">
        <tspan x="9" y="42">Start with</tspan>
        <tspan x="9" y="57">the mess,</tspan>
        <tspan x="9" y="72">not the</tspan>
        <tspan x="9" y="87">result.</tspan>
      </text>
      <text x="9" y="112" fontSize="4.2" fill="#a39b8c" fontFamily="Inter Variable, sans-serif">sample post, invented for this demo</text>
    </>
  ),
  chai: (t) => (
    <>
      <rect width="100" height="125" fill="#4a2f22" />
      <rect y="92" width="100" height="33" fill="#2d1c14" />
      <path d="M58 14 l22 10 l-4 9 l-22 -10z" fill="#b8bcc0" />
      <path d={`M56 30 q-8 ${22 + t * 6} -6 52`} fill="none" stroke="#c98a4b" strokeWidth="3" strokeLinecap="round" />
      <path d="M36 78 h30 l-4 26 h-22z" fill="#b5532f" />
      <ellipse cx="51" cy="78" rx="15" ry="4" fill="#8f3f22" />
      <ellipse cx="51" cy="78.5" rx="12" ry="2.8" fill="#c98a4b" />
      <path d="M40 66 q-4 -7 1 -13 M52 64 q-4 -8 1 -15 M63 66 q-4 -7 1 -13" stroke="#f4ecdc" strokeWidth="1.3" fill="none" strokeLinecap="round" opacity=".5" />
      <circle cx="18" cy="100" r="7" fill="#e06a1c" opacity=".85" />
      <circle cx="18" cy="100" r="3.5" fill="#f6c14e" />
    </>
  ),
  shelf: () => (
    <>
      <rect width="100" height="125" fill="#e9e3d5" />
      <rect x="0" y="0" width="100" height="125" fill="#dcd4c1" opacity=".5" />
      <path d="M20 12 v104 M80 12 v104" stroke="#8b5a33" strokeWidth="3" />
      {[36, 70, 104].map((y) => (
        <rect key={y} x="14" y={y} width="72" height="3.5" rx="1" fill="#a9744d" />
      ))}
      <g transform="translate(28 14)">
        <rect x="4" y="12" width="14" height="10" rx="2" fill="#f4ecdc" />
        <path d="M11 12 q-12 -6 -8 -14 q8 2 8 14 q0 -12 9 -13 q3 9 -9 13" fill="#3f7d4d" />
        <path d="M17 20 q8 6 4 16 q-3 8 2 14" fill="none" stroke="#3f7d4d" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="22" cy="32" r="2.6" fill="#5c9a63" />
        <circle cx="20" cy="42" r="2.6" fill="#5c9a63" />
      </g>
      <rect x="56" y="24" width="12" height="12" rx="2" fill="#b5532f" />
      <path d="M62 24 q-6 -8 -3 -13 M62 24 q5 -8 3 -14 M62 24 v-12" stroke="#2e6b3c" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <rect x="26" y="58" width="16" height="12" rx="2" fill="#27345e" />
      <path d="M34 58 q-10 -3 -9 -11 q8 0 9 11 q1 -11 9 -12 q2 9 -9 12" fill="#4c8a58" />
      <rect x="54" y="60" width="20" height="10" rx="1" fill="#e0a526" />
      <rect x="30" y="92" width="34" height="12" rx="2" fill="#f4ecdc" />
      <path d="M36 92 q-3 -9 2 -12 M47 92 q0 -12 5 -14 M57 92 q4 -8 0 -12" stroke="#3f7d4d" strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  ),
};

export function Scene({ id, t = 0, title }: { id: SceneId; t?: number; title?: string }) {
  if (id === 'none') return null;
  return (
    <svg className="scene" viewBox="0 0 100 125" preserveAspectRatio="xMidYMid slice" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {scenes[id](t)}
    </svg>
  );
}
