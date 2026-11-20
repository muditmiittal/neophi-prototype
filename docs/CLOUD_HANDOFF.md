# Neophi buildathon handoff

Open the prototype root in Codex Cloud or Claude Code. Read `AGENTS.md`, then the relevant skills in `.agents/skills/`. This snapshot contains the local prototype. Obtain the partner's branch or repository and its integration instructions before making integration changes. The partner's work has not been inspected or combined with this snapshot.

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
- The prior session reported loading a secret for the test app onto the VM. The active value and its correspondence to the parent app were not verified in this session. The per-account webhook subscription for `@yuck.pov` and the account's role under the parent app also remain unverified.

## Resume the live check

1. Ask the owner or VM operator for the method, path and status from Caddy for the Meta sample and latest real DM. A webhook POST with HTTP 401 points to signature verification. Confirm the configured signing app with the owner. If no webhook POST arrived, check the parent app's account-level subscription for `@yuck.pov`, the sender's eligible role under that app and the restrictions of unpublished mode. If a POST returned 200, inspect payload shape and relay capture counts before changing anything.
2. After the relevant fix, send one fresh Reel and short note from the tester. Verify webhook delivery, relay pickup, import, note association and media-fetch result. Record the observed result at each step.
3. Compare the partner's implementation with this snapshot. Agree on the integration direction, preserve existing capture and note behavior, and run the focused regression check and check bar before handing it back.

No VM, project source, or database changes were needed for the dashboard subscription. Deployment and other Meta permissions stay with the owner.
