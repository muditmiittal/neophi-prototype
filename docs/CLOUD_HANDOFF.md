# Neophi buildathon handoff

Open the prototype root in Codex Cloud or Claude Code. Read `AGENTS.md`, then the relevant skills in `.agents/skills/`. The local snapshot is `muditmiittal/neophi-prototype` on `buildathon-prototype`. The partner repo is [Ramitphi/neophii](https://github.com/Ramitphi/neophii), with default branch `main`. Compare the exact commits and ask the partner for any unpublished work or integration constraints. The partner implementation has not been combined with this snapshot.

## Run and verify

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run serve
```

Run `npm run server` separately for the local webhook and relay API on port 8787. Static preview is on port 4173. On the laptop, `start_local.ps1` is the existing launcher. Do not source or copy local secret files into the cloud. Coordinate credentials through the owner's approved channel. See `docs/META_CAPTURE.md` and `docs/TODAY_LOOP.md`.

On 2026-11-20, typecheck, lint, tests and build passed on Windows. Vitest reported 56 passing tests across 5 files. The server tests include signed synthetic shares, notes arriving separately and relay delivery. Vite warned about a chunk over 500 kB. A real Instagram DM has not been verified end to end.

## Instagram evidence from 2026-11-20

- Meta's parent **NeoPhi** app (1481320687243886) is unpublished. Its Instagram use case uses **Unified Login** and has `https://20-219-13-184.sslip.io/webhooks/instagram` saved as the callback.
- Meta identified **Yucks - Test1** (1496363935712367) as a test version of NeoPhi. Its Unified Login setup displayed no compatible configuration and a blank webhook callback.
- The parent app's `messages` field was unsubscribed. The owner approved enabling it. Meta then displayed **Subscribed** for `messages` at v27.0. A synthetic Meta sample was submitted through the dashboard. The dialog displayed no visible delivery result.
- The owner sent a fresh Reel and note to `@yuck.pov` after the subscription. The laptop health endpoint still reported a successful relay poll, zero relay items pulled, zero media pulled and an empty inbox. The local webhook counts describe the laptop process and do not measure POSTs reaching the relay VM.
- A read-only Tailscale SSH check reached **EpitomeWorkStation** and identified `vm-neophi-1` and `vm-caddy-1`. The relay app's loopback health reported **25 webhook POSTs, 25 bad signatures, 0 captures, 0 media fetches, an empty inbox, and provider `none`**. These are process-lifetime counts, not a per-message trace. In the source, the signature failure branch increments `bad` and returns HTTP 401 before parsing or downloading media. Caddy showed no access records for the control health request, so its empty logs do not establish whether Meta delivered.
- The owner confirmed the relay used the test app's secret and saved the parent app's secret in the laptop's existing local input file. A check after that save still showed the same running relay process at **34 POSTs and 34 bad signatures**. The owner or Claude Code must apply the local input to the relay's `META_APP_SECRET` before retesting. Keep values out of chat, source, and logs. The per-account subscription for `@yuck.pov` and role under the parent app remain unverified.
- The owner then ran the existing relay helper. The relay restarted. One Meta sample increased POSTs from 1 to 2 while `bad` stayed 0. A fresh real Reel and note increased POSTs to 4, with **0 bad signatures and 1 capture**. The laptop reported **1 relay item pulled and 0 media items pulled**.
- For the real Reel, the relay recorded attachment `ig_reel`, host `www.instagram.com`, a title, `type_text/html` and `link_metadata`. It captured the share metadata. The attachment returned HTML rather than video bytes. App import and exact note association were not independently observed. Do not report full video ingestion.
- Meta documents a Reel video ID and URL in `ig_reel` webhook attachments. Its Graph API Message reference documents attachment and share fields, with linked-professional-account restrictions. Check those authorized routes using the selected login flow and a Reel you can test. Do not assume that the webhook URL, the video ID, or the Instagram Media endpoint grants access to third-party video bytes. [Messaging changelog](https://developers.facebook.com/documentation/business-messaging/instagram-messaging/changelog/) · [Message fields](https://developers.facebook.com/docs/graph-api/reference/v27.0/message)

## Resume the live check

1. After the owner fixes the signing configuration, record the relay health counters immediately before and after one Meta sample. Confirm a new POST without an increase in `bad`. For missing deliveries, check the parent app's account-level subscription for `@yuck.pov`, the sender's role and the restrictions of unpublished mode.
2. Send a fresh Reel and short note from the tester. Verify webhook receipt, capture, media fetch, relay pickup, app import and exact note association. A Reel URL must actually return media bytes. Record the media-fetch outcome and use caption plus note when the media is unavailable.
3. Verify AI separately. The app sends the DM message ID to `/api/analyse`. The server looks up only the cached media associated with that ID and, when available, passes the bytes as Gemini inline data along with the text. The relay reported no configured AI provider. On the laptop, Windows PowerShell 5.1 originally aborted the Node process when Vertex token acquisition emitted a native stderr warning. The local launcher now preserves Node's lifetime through stderr and propagates its exit code. A synthetic caption inference after the fix got Vertex HTTP 403 while the local server stayed healthy. The active Google Cloud CLI identity also could not list services on the configured project. The owner must verify model availability and that the intended Application Default Credentials identity can invoke Vertex AI in that project. No successful Gemini video inference was observed.
4. Compare the partner's implementation with this snapshot. Agree on the integration direction, preserve existing capture and note behavior, and run the focused regression check and check bar before handing it back.

## Continue while the laptop is offline

- The owner's preferred environment is **epitomeMaster**. Add the private `muditmiittal/neophi-prototype` repository at `buildathon-prototype` and use the partner repository only for comparison until the owner and partner agree how to integrate. A separate private Neophi setup was also prepared, and passed `npm ci`, typecheck, lint, 56 tests and build on the prototype branch.
- `epitomeMaster` was published with the private prototype repository and `20-219-13-184.sslip.io` in the HTTPS allowlist. The new **Neophi buildathon integration** task successfully ran `curl -fsS https://20-219-13-184.sslip.io/api/health` and returned `{"ok":true}`. It checked out the prototype branch and compared Ramit's repo at `46f6f2e131fde13e79056f299afa80dabbb95879`. Private SSH still requires the owner to provision the environment VPN. The Cloud task tested `FB` and did not discover that MCP server in its environment.
- For private access, use the Cloud environment's Tailscale integration if available, with access confined to the relay host and approved operations. Test the route from the actual Cloud task. The laptop's Tailscale SSH approval is not a Cloud connection. Confirm EpitomeWorkStation stays powered and online when the laptop disconnects.
- The current relay fetches and queues media. The laptop process polls for it, and the app drives analysis. For the demo to run continuously offline, give an always-on service the consumer and AI roles, provision Gemini there through the owner's approved path, and prevent two consumers from acknowledging the same relay item. Codex Cloud can develop and test that integration. A Cloud task is not the persistent runtime.

## Repeat setup for another Meta app

1. Record the exact Meta app ID and whether it is the parent or a test app. In that app's Instagram API use case, choose the login flow the dashboard supports. In Unified Login, configure Facebook Login for Business with Instagram assets and check the displayed messaging permission, `instagram_manage_messages`.
2. In the selected app, have the owner verify the professional Instagram account connection, the account-level subscription and the tester's eligible role or live access. Accept the invite from the correct account and check it in the selected app.
3. Pair the public HTTPS callback with that same app's signing secret. The verify token is used for the GET challenge. The signing secret is used to validate POSTs. A working GET challenge alone does not verify signatures.
4. Subscribe the `messages` field. Run one dashboard sample and compare the relay counters. Run one real Reel and note, and verify media bytes and Gemini analysis separately. When switching between parent and test apps, use distinct callback routes with distinct signing configurations or move the single route and coordinate the change.

## Meta dashboard settings at handoff

- Keep the hackathon on the existing tester flow. Meta lists `@yuck.pov` as an Instagram Tester on the parent app. The `messages` v27.0 subscription and the exact callback passed the signed sample and real metadata capture.
- The Advanced screen shows API access to app settings enabled and no Domain Manager entries. Neither finding establishes Cloud MCP access. Leave unrelated API upgrades, IP restrictions, domain controls and access changes alone for the tester demo.
- For a later public launch, the dashboard shows **Unpublished**, a disabled Publish button, and a Start verification action. The App Review draft is **Not submitted**. It lists eight new requests, including `publish_video`, `catalog_management` and Live Video API, and does not show `instagram_manage_messages` among those draft requests. Verify the permissions required for the actual public Instagram use case, narrow the submission to exercised permissions, and have the owner verify privacy, data deletion and business details before submitting.

The dashboard subscription was changed with owner approval. The Windows launcher fix is local source. Relay deployments, credentials and other Meta permissions stay with the owner.
