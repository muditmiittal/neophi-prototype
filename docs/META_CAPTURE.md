# Instagram DM capture: what is documented, and the test to run

20 Nov code-review update: the server now includes signed webhook capture, attempted media download, note attachment, local inbox pickup and relay support (`server/index.mjs`, `src/app/InboxSync.tsx`). The runbook below is historical; this task did not run a live Meta test. Capture remains for app-role testers in Meta development mode. See `PUBLIC_SITE_NOTES.md` for current claims and retention limits. The older strict expiry promises do not describe scheduled cleanup.

Status 16 Nov 2026. Nothing here has been run against Meta yet. The prototype ships a stub (`server/`) and a parser (`src/lib/metaCapture.ts`); the product must work without DM capture (link, upload, note).

## Documented by Meta (read 14 and 15 Nov 2026)
- Messaging webhook attachment types include `ig_reel`, `ig_post`, `reel`, `story_mention`, `story`, `ig_story`, `image`, `video`.
- `ig_post` payload (documented example): `ig_post_media_id`, `title` (caption), `url` (a `lookaside.fbsbx.com/ig_messaging_cdn` link with a signature). The older `share` type ended 1 Feb 2026.
- `ig_reel`: the type exists; Meta's changelog wording says title, url and video id. A full payload example was not on the pages read, so the field names in the parser are unconfirmed.
- Not documented on the pages read: how long the url lives, whether a server can download it, behaviour for private accounts.

## The three outcomes of the test, and what the product does
1. `url` downloads without extra tokens: analyse with Gemini; ladder rung `media_link_present`.
2. `url` is present but the download fails or expires: keep caption and note; ask the user to upload a copy; rung `note_and_caption_only`.
3. No `url`: keep the note only; rung `text_only`.
Never label a failed fetch "private" or "deleted": record `unavailable` with the reason.

## Test runbook (your end; development mode, no app review needed for your own test users)
1. In a browser, create or open your Meta developer account, make a new app, and add the Instagram product (Instagram API with Instagram Login).
2. Use an Instagram **Professional** account (Business or Creator) as Neophi's account; add your own other Instagram account as an app tester or role.
3. PowerShell, from `D:\Neophi\app`: set the two secrets only in the shell, never in a file, then start the stub:
```powershell
$env:META_VERIFY_TOKEN = Read-Host "make up a verify token"
```
```powershell
$env:META_APP_SECRET = Read-Host "app secret from the Meta dashboard"
```
```powershell
node server/index.mjs
```
4. Meta needs a public HTTPS address for the webhook. Use a tunnel tool you trust (for example a temporary Cloudflare quick tunnel) pointed at port 8787, and register `https://<tunnel>/webhooks/instagram` with the same verify token. Subscribe to the `messages` field.
5. From your second account, DM a Reel to the Neophi account, then send a short text within 10 minutes. The stub logs only counts ("webhook: 1 capture(s)").
6. To see the payload shape safely, use the replay route with a sample, never your real payload in chat: `POST http://127.0.0.1:8787/replay` with the JSON from `SAMPLE_DM_PAYLOADS`.
7. Decide the outcome (1, 2 or 3 above) by trying to fetch the `url` once from your own machine and noting only the HTTP status. Write the result in `BUILD_LOG.md`.

## Policy checklist before any real users
Privacy policy and data-deletion URLs (the prototype has `/privacy` and `/data-deletion`), webhook signature verification (done in the stub), the 24-hour messaging window for replies (confirm current rules), app review for advanced access, no scraping, no password collection.
