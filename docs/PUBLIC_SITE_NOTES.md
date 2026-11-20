# Public site claims · 20 Nov 2026

Review status: DRAFT copy and visual treatment. No production deployment or live Meta test was performed in this task.

| Page | What it claims | Evidence in this workspace |
| --- | --- | --- |
| `/` | Context-based sorting; exact user words; separate AI suggestions with evidence or uncertainty | `src/lib/categorise.ts`, `src/ai/guard.ts`, `src/components/Lanes.tsx`, `tests/guard.test.ts` |
| `/` and `/how-we-measure` | Small analysis test: 12/12 valid outputs, 41/41 objects carrying references, about 15.5 seconds and US$0.0052 average | Read-only `D:/Neophi/_work/eval_result.json`: `n=12`, `validShape=12`, `objectsWithEvidence="41/41"`, `avgMs=15459`, `avgUsd=0.00524`. Date and published-price context supplied by the owner. These are shape/reference counts, not accuracy or retrieval results. |
| `/connect` | Android installed-web-app share target accepts links/text | `public/manifest.webmanifest`, `src/lib/shareTarget.ts`, `src/app/CaptureSheet.tsx`, `tests/today.test.ts`. Actual Android installation and Share sheet need a phone check. |
| `/connect` | DM capture is for app-role testers in Meta development mode; media can fail; local pickup | `.agents/skills/instagram-webhook-ops/SKILL.md`, `server/index.mjs`, `server/meta.mjs`, `src/app/InboxSync.tsx`, `tests/server.test.ts`. Server tests use fixtures; they do not prove live Meta delivery. Account handle is intentionally supplied by the team, not invented. |
| `/connect` | Paste a link, choose or drop a screenshot; links are kept, not fetched | `src/app/CaptureSheet.tsx`, `src/lib/imageFacts.ts`; synthetic drop exercised by `scripts/public-quality.mjs`. |
| `/connect` | Only reachable/not reachable is shown for same-origin health | `src/pages/Connect.tsx`. `ok:true` is required; no diagnostic fields are displayed. Static preview has no health API and reports not reachable. |
| `/how-it-works` | Capture, notes, word matching, optional AI, draft outcomes, local library | `src/store/store.ts`, `src/lib/search.ts`, `src/ai/provider/index.ts`, `src/lib/outcomes.ts`. Optional Gemini was not called in this task. |
| `/trust` | Four lanes, guard rules, private AI exclusion, evidence and ledger | `src/ai/guard.ts`, `src/components/Lanes.tsx`, `src/store/store.ts`, `tests/guard.test.ts`. |
| `/compare` | Current prototype capabilities and historical competitor notes | Local capability files above; competitor notes are inherited from 14 Nov 2026 and explicitly marked unverified. Source links: verify. No fresh competitor claim or superiority result added. |
| `/privacy`, `/terms`, `/data-deletion` | Browser storage; server queue on disk; media in process memory; acknowledgement and opportunistic cleanup; optional Gemini | `src/store/store.ts`, `server/index.mjs` (`saveInbox`, `pruneInbox`, `pruneMedia`, acknowledgement routes), `src/app/InboxSync.tsx`. Legal wording remains DRAFT. `PRIVACY_CONTACT` is empty and the notice is preserved. |
| `/app/diagnostics` | Only loopback + local health section can display selected Instagram counts/status | `src/app/Diagnostics.tsx`, `server/index.mjs:isLocal`, `tests/public-site.test.ts`, browser fixture checks. Public responses and non-local URLs show only `Not available here`. No navigation link. |

## Brand and metadata

`scripts/optimise-brand.mjs` reads the owner's brand sources without changing them. It uses installed Chromium canvas encoding, no new dependency. The hero is a WebP derivative of `hero_scatter_to_settle.png`; the social card is a JPEG derivative of `og_share_card.png`. Illustrations are labelled as illustrations. Design taste: DRAFT for owner review.

`src/meta.ts` supplies unique metadata for 9 public pages. `src/entry-server.tsx` emits titles, descriptions, canonicals, OG and Twitter cards. `index.html` already supplied theme-color. Navigation updates title, description, canonical and social text. `scripts/prerender.mjs` can make URLs absolute with a human-verified `PUBLIC_SITE_URL` origin. No public hostname was supplied, so this local build uses root-relative URLs. Fill the verified origin before publishing for reliable social crawlers. No sitemap or robots file existed to update.

## Retention limits discovered during review

The previous legal text promised maximum retention of 1 hour for media and 24 hours for queued saves. Code does not schedule those deadlines. Media pruning runs on a subsequent successful media fetch; inbox pruning runs on acknowledgement. Server `inbox.json` can hold uncollected words longer when idle. The pages now describe that behavior, without changing `server/`. The team must decide and verify retention and deletion operations before opening capture publicly. A username alone cannot reliably identify the queue's app-scoped IDs.

## App microcopy

Reviewed empty, error and uncertainty messages across `src/app/`. Kept specific copy in Today, search, projects, onboarding, installation, reminders, inbox sync and detail. Clarified resurfacing and category emptiness, analysis failure, speech recognition failure, file fallback, synthetic DM replay and temporary server queue storage. Import reporting now distinguishes processed duplicates from links beyond the existing 500-item cap. Waitlist errors distinguish storage failure from invalid input. Stored notes and model guard behavior were not changed.

## Verification and limits

See `docs/QUALITY_20NOV.md` for actual outputs, screenshots and sizes. Existing Today/PWA behavior is covered by the original tests and `scripts/screenshots.mjs`. Phone installation, iOS Safari menus, device notifications, screen readers and live Meta delivery still need real-device/team checks. No new runtime dependencies, paid API calls, deployment or repository creation.
