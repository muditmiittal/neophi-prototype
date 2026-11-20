---
name: instagram-webhook-ops
description: How the Instagram DM capture works and how to debug it. Use when the webhook, the inbox, Meta app settings, media download from a shared Reel, or the confirmation reply is mentioned or fails.
---

# Instagram DM capture

Flow: a user shares a Reel or post to the business Instagram account by DM, then types why. Meta POSTs to `/webhooks/instagram` (signed with `X-Hub-Signature-256`). `server/index.mjs` verifies the signature, parses the share (`server/meta.mjs`), downloads the media url, keeps it in memory for an hour, and lists the save in `/api/inbox`. The app (`src/app/InboxSync.tsx`) imports it; Gemini then reads the downloaded media through `dmMid`.

## Facts to rely on
- Meta documents the attachment types `ig_reel` and `ig_post`, each with a `url`. It does **not** document whether a server may download that url or for how long. The server records the real outcome in `mediaFetch` (`ok`, `http_403`, `type_...`, `too_large`, `error`) and `/api/health` shows `lastMediaFetch`. Report that result honestly; fall back to caption plus note.
- A note typed after the share arrives in a separate delivery. The server attaches it to the sender's latest share within 10 minutes, or emits a note event if the share was already imported.
- The server waits 20 seconds before handing a note-less share to the app, so a quick note can travel with it.
- Meta retries a delivery that is not answered fast: the handler answers first, then fetches. Duplicate message ids are ignored by `capture`.

## Debug order
1. `GET /api/health` locally: `webhookConfigured`, counts, `lastMediaFetch`.
2. Meta dashboard webhook test (the Test button) should reach the verify route: 200 with the challenge.
3. `bad` count rising means the app secret in the environment does not match the Meta app.
4. In development mode only people with a role on the Meta app (admin, developer, tester) can message the account and be delivered.
