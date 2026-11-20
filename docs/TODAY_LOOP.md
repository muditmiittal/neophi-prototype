# Today loop

`/app` opens Today when there is at least one memory. An empty account keeps the library's capture and sample entry points. `/app/library` always opens the library. Share-sheet capture works before onboarding and preserves its parameters.

## Sections

Today shows only populated sections: Due now, Back to this, Just arrived and Needs your words. A capture link is always present. Just arrived includes DM and share-channel saves created within the past 24 hours; original notes and later attached notes are displayed verbatim. Shared title and text are source metadata, never promoted into the user's note.

Due now includes overdue reminders and all reminders before the next **local** midnight. Device notifications wait until the reminder's actual timestamp. Completing a reminder clears it; completing resurfacing does not clear reminders.

On local Sundays a weekly recap precedes these sections. It counts non-sample saves from Monday at local midnight to now, and distinct projects on those saves. It offers up to three qualifying non-sample memories; it never fills missing picks with invented activity.

## Resurfacing rules

`src/lib/resurface.ts` is pure: pass memories and a clock. No AI or network is involved.

1. Saved 7, 30 or 90 local calendar days ago, with no recorded detail-page open. These are exact anniversary days, not overlapping windows.
2. Shares a project with another non-private save created within the past 14 elapsed days.
3. Shares a category with another non-private save created within the past 48 elapsed hours.
4. Has at least one moment pin.

Private memories do not enter automatic resurfacing or provide context for other memories. They can still appear in reminders explicitly set by the user, arrivals and note completion. Future dates cannot qualify as recent saves. Every reason is inspectable on the card, with a link to the memory's ledger. Category and project matching describes stored membership; it does not assert that an AI category is correct.

All qualifying memories have equal priority. A stable hash of the local date and memory ID selects up to three. Input array order does not matter. The same day and unchanged eligible pool give the same selection. The elapsed 14-day and 48-hour windows can expire during the day. Edits, new saves, Done and snooze can change the eligible pool immediately.

Not now stores a timestamp 7 local calendar days later. Done permanently removes the memory from automatic resurfacing, without deleting it. Both append ledger events. Detail opens set optional `lastOpenedAt` and append a ledger event. These optional fields keep version-1 storage compatible. **Earlier versions did not record opens**, so an old memory without this field means no recorded open, not proof it was never viewed. The card explains this limitation.

Change anniversary days, context windows, ordering and maximum picks in `resurface.ts`; update `tests/today.test.ts` and this document together. No migration is needed for the optional fields.

## Notifications and installation

Settings asks browser permission only after the user enables “Remind me on this device”. An active page polls every 30 seconds and on focus, then uses the service worker registration to show a generic notification for timestamps already due. A persisted reminder timestamp prevents repeated delivery. Titles and notes are omitted from the notification for lock-screen privacy. Notification clicks open Today. Denied or unavailable permissions leave Today reminders usable. OS sleep and tab throttling can delay delivery. There is no push subscription, closed-app delivery or server scheduler.

Install hints count full app loads, not route changes. The hint is eligible only on visit 2, outside standalone mode, and only with `beforeinstallprompt` or iOS Safari instructions. Dismissal is persisted independently of app content. Clearing browser storage resets this preference and deletes the local library too.

`node scripts/generate-icons.mjs` rasterises `public/favicon.svg` with installed Chromium through existing playwright-core. Set `PLAYWRIGHT_EXECUTABLE_PATH` when automatic Chrome/Edge discovery is insufficient. Maskable artwork is inset to keep the mark inside the safe circle. There is no new runtime dependency.

The manifest provides capture and Today shortcuts and the GET share target. The build writes `shell-assets.json`, including lazy app chunks and self-hosted fonts. The network-first service worker precaches these plus `/app` and its notification icon, so Today and the library can open offline after successful installation. API and webhook routes are never cached. A failed first installation cannot provide offline access. New builds use a bumped cache; old Neophi caches are removed on activation.

## Verification

Run typecheck, lint, tests and build in that order. `npm run shots` requires a running static preview on port 4173, uses synthetic sample fixtures, writes screenshots at 390, 768 and 1440, captures console/page errors and checks offline Today/library navigation. It also exercises share prefill, note completion, snooze and Done. Browser API permission dialogs and actual Android/iOS installation still need a real-device check.
