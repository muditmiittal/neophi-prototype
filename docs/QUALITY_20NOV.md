# Quality evidence · 20 Nov 2026

Session: Neophi: public site, connect flow, accessibility and polish.

The production build was served with `npm.cmd run serve` on `http://localhost:4173`. No new dependency was installed. `axe-core` was absent; the existing `playwright-core` and installed Chromium ran the focused audit in `scripts/public-quality.mjs`.

## Check bar

PowerShell blocks `npm.ps1`, so commands used the equivalent `npm.cmd`. `TMPDIR` was set to `D:/Neophi/app/.tmp` before tests. The four required checks ran in order. PowerShell rendered npm's stderr notices as NativeCommandError records; typecheck and lint completed without compiler/linter findings, and the sequence continued. The combined wrapper reported exit 1 after the build printed completion, so **only build** was repeated through `cmd /c` to resolve its exit status; that invocation returned 0. No checks were skipped.

Raw output is preserved, including PowerShell formatting:

- `quality-logs/typecheck.txt`: `npm.cmd run typecheck`, `tsc --noEmit`; no TypeScript diagnostics.
- `quality-logs/lint.txt`: `npm.cmd run lint`, `eslint src server scripts tests`; no ESLint diagnostics.
- `quality-logs/test.txt`: `npm.cmd run test`.
- `quality-logs/build.txt`: confirmed `npm.cmd run build` via `cmd /c`.

Actual test output tail:

```text
 Test Files  5 passed (5)
      Tests  54 passed (54)
   Start at  04:17:46
   Duration  2.14s (transform 477ms, setup 0ms, collect 943ms, tests 1.94s, environment 1ms, prepare 770ms)
```

Before changes: 4 files, 50 tests passed. Added 4 tests in `tests/public-site.test.ts`: connect content and platform limits; all public metadata; unavailable diagnostics; diagnostics field selection. Existing tests were unchanged. The new file also had one focused run before the final bar.

Actual build tail:

```text
dist-ssr/entry-server.js             149.49 kB
dist-ssr/assets/AppRoot-DmmAUOI0.js  179.24 kB
✓ built in 376ms
Prerendered 9 public pages, the app shell and 404.html.
BUILD_EXIT=0
```

The last exit line was printed by the verification shell after capturing the exit status. Vite sizes above use its own formatting; filesystem sizes below count actual bytes recursively.

## Accessibility and browser checks

Command: `node scripts/public-quality.mjs` against the production static preview. Raw output: `quality-logs/public-quality.txt` and `../SCREENSHOTS/public/quality-output.txt`.

All 9 public routes were checked at 390, 768 and 1440: one main landmark, header/footer and named navigation, one h1 and no heading-level skips, image alt attributes, form labels, no positive tabindex, skip link and no horizontal overflow. This is a focused DOM audit; it does not establish full WCAG compliance. Keyboard interaction was exercised with Tab and Enter, without programmatic focus or clicks, through starting empty, opening capture, entering a link and note, saving, opening a memory from Library, searching and receiving the saved memory. Capture form labels were checked separately. Existing visible focus styles were retained; a focus-within outline was added to file upload.

38 computed CSS token pairs were measured: 19 in each palette. All meet 4.5:1. The initial light vermilion/deep-paper pair was 4.26:1 and was corrected to 4.73:1. That is the lowest measured final pair. This checks listed solid token pairs, not every possible composited pixel. Reduced-motion screenshots used the browser's reduce preference. Glow CSS, the spiral mount and pointer effects were removed from the active entry; the existing paper/dark-paper tokens and self-hosted fonts remain.

Actual production audit tail:

```text
Keyboard: opened capture, entered link and exact note, saved and reached memory detail
Keyboard: opened a saved memory from Library
Keyboard: searched and received the saved memory
Capture: dropped a synthetic PNG and produced a local key frame
Waitlist: storage failure described accurately; no invalid-address blame
Diagnostics: local fixture displayed only allowlisted fields
Diagnostics: public health response displayed only Not available here
Connect: same-origin ok:true fixture displayed reachable
Diagnostics: non-local browser URL displayed only Not available here; 0 health requests
Unexpected browser errors: 0
Audit failures: 0
```

Health API 404s on static preview are expected and mean not reachable. Other HTTP failures and browser errors are counted. Local diagnostics, public health and reachable status were also tested with explicit intercepted fixtures. The harness isolates the team's inbox with an empty fixture; no real messages or paid analysis are used. This does not confirm live Instagram delivery.

The actual built HTML was checked separately: all 9 pages have unique title/description, matching canonical, OG/Twitter cards and theme-color (`quality-logs/metadata.txt`). Local build canonicals and image URLs are root-relative; supply a verified `PUBLIC_SITE_URL` when building for social crawlers. No hostname was invented.

## Screenshots and Today/PWA

Captured and visually inspected all 8 production screenshots in `SCREENSHOTS/public/`: `home`, `connect`, `trust`, `privacy`, each at 390 and 1440. Text and hero artwork fit; method cards stack on phones and sit side by side on desktop. Visual review found and corrected the leftover unstyled ticker and crowded demo picker before the final build. Final design is DRAFT for owner taste review.

Command: `npm.cmd run shots`. Raw output: `quality-logs/today-shots.txt`.

```text
Second-visit install hint and dismissal: passed (synthetic browser offer)
Today 390: rendered, no horizontal overflow
Today 768: rendered, no horizontal overflow
Today 1440: rendered, no horizontal overflow
Snooze, Done and verbatim Hindi note: passed
Share target prefill: passed
Online console/page errors: 1
Offline /app/today: passed
Offline /app/library: passed
Console/page errors: 1
requestfailed: /api/inbox: net::ERR_ABORTED
```

The original script completed with exit 0. It recorded one aborted inbox request during navigation; that count is preserved and is not described as a zero-error result. Its assertions for Today, share prefill and offline pages passed.

## Size evidence

| Artifact | Before bytes | After bytes |
| --- | ---: | ---: |
| `dist` recursive file sum | 1,942,896 | 1,480,391 |
| Hero source PNG → served WebP | 1,632,571 | 90,260 |
| Social source PNG → served JPEG | 1,377,120 | 54,615 |

Dist decreased by 462,505 bytes (23.80%). The original dist size was measured before editing; it is the existing build on disk, not a rebuilt baseline. Brand sources were read-only and remain unchanged. `node scripts/optimise-brand.mjs` generated only the two optimised derivatives under `public/brand`. No served hero image exceeds 250 KB. The social JPEG is supported by the existing static server; WebP MIME support was added to `scripts/serve.mjs`.

## Human verification still needed

- Fill `PRIVACY_CONTACT`; legal text remains DRAFT. Decide response handling and verify legal rights wording.
- Supply the real public origin in `PUBLIC_SITE_URL` before a publication build. Root-relative cards in this local build are not a claim of verified social previews.
- Team supplies the Instagram demo handle and app-role tester access; live delivery and real media fetch were not tested.
- Confirm Android Chrome install/share and iOS Safari installation on real phones; check screen readers and actual device notifications. Desktop Chromium is not proof of those platform behaviors.
- Decide retention: current server pruning is opportunistic and can retain queued data beyond the age thresholds. Pages now say so. No `server/` files were changed.
- Verify historical competitor claims/source links before relying on them. No new competitor research was performed.

No git repository, commit, push, PR, deployment, account creation, live database operation or paid API call was made. No secret values were read or written by this task.
