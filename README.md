# Neophi prototype

A clickable prototype of Neophi: the public site and a demo app (library, capture, memory detail, projects, search, settings). Not in git by design. All saves in the demo are invented; pictures are drawings.

## Run it (PowerShell, from this folder)
```powershell
npm install
```
```powershell
npm run build
```
```powershell
$env:PORT = "4173"; node scripts/serve.mjs
```
Open http://localhost:4173 (site) and http://localhost:4173/app (demo app; choose "Load the full sample library"). For development use `npm run dev`.

## What is mock and what is real
- **Real:** the interface, the data model, the guard that keeps the user's words untouched (tests in `tests/guard.test.ts`), search over the sample data, export and delete, the ledger, local storage.
- **Mock:** the AI. By default a deterministic mock provider writes the analysis for the samples and simple rules for anything new.
- **Optional real Gemini:** `server/index.mjs` calls `gemini-3.8-flash` and `gemini-embedding-2` (768 dimensions requested). It starts only with a key in your shell, never in a file:
```powershell
$env:GEMINI_API_KEY = Read-Host "paste your key"
```
```powershell
node server/index.mjs
```
The app detects the server on port 8787. Confirm the model ids and the embedding size against Google's current docs before trusting results (checked on 19 Nov: both model ids answer, and asking for 768 returns 768).

**No key allowed? (organisations that disallow API keys).** Use Google Cloud sign-in instead (needs `gcloud`):
```powershell
gcloud auth application-default login
```
```powershell
$env:NEOPHI_PROVIDER = "vertex"; $env:GOOGLE_CLOUD_PROJECT = "your-project-id"; node server/index.mjs
```
`/api/health` then shows `"provider":"vertex"`.
- **Instagram DM capture:** stub and test runbook only: `docs/META_CAPTURE.md`.

## Checks
```powershell
npm run build
```
```powershell
npm test
```
```powershell
npm run lint
```
Screenshots: `node scripts/shots-app.mjs` (server running) writes to `SCREENSHOTS/`.
