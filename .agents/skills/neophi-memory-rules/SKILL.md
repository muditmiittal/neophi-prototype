---
name: neophi-memory-rules
description: Product and code rules for Neophi, a memory layer for saved Reels, posts and links. Use when editing anything under src/ai, src/store, src/lib, server/, or when adding a feature that reads, writes, analyses or displays a save or the user's note.
---

# Neophi memory rules

Neophi keeps what people save online together with *their own reason for saving it*. The product bet is that every memory can be trusted. These rules are not style preferences; each one has a test.

## The four lanes of a memory (never mix them)
1. **Source shows**: what the Reel, post or upload visibly contains. Comes from Gemini or the user's own file. Every claim cites an evidence id (`f_00`, a timestamp, a caption) or is shown as "not sure".
2. **Your exact words**: the user's note. Stored exactly as typed or sent. Code keeps it (`exactNote` in `src/ai/guard.ts`); no model output may overwrite, translate, summarise or "improve" it. A DM note that arrives later is added with `attachDmNote`, never merged.
3. **You chose it**: a chip or project the user tapped.
4. **AI suggestions**: labelled, dashed, with a confidence 0 to 1, removable and undoable. Always below the other three.

## Rules
- Never invent a source, a number, a quote or a reason. If the media was not readable, say less. `source_access_state` decides what may be claimed.
- Gemini output always passes `guardAnalysis` before it is stored. Do not bypass it.
- A private memory is never sent to AI. Deleting a memory deletes its analysis and its thumbnail.
- Interface text in English; user content stays in its own language (Hindi, Hinglish). Numerals are Latin digits.
- Keys, tokens and app secrets come from the environment only: `GEMINI_API_KEY` or Application Default Credentials, `META_APP_SECRET`, `META_VERIFY_TOKEN`, `INSTAGRAM_ACCESS_TOKEN`. Never write them into a file, a log line or a commit. Log counts, never notes or media urls.
- SQL, if added: snake_case table names, an `id` primary key on every table, parameterised queries only, no DROP TABLE.
- Public addresses (a tunnel, Cloud Run) expose only the site, `/api/health` and `/webhooks/instagram`. Gemini, inbox and replay routes stay local (`isLocal` in `server/index.mjs`). Do not widen this without a reason written next to the change.

## Before you say it works
Run, in this order: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. A feature is not done until a test shows the rule it touches.
