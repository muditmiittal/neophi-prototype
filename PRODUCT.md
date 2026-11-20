# Product

Neophi: a memory layer for what people save online.

Source: inferred from the owner's written brief (`D:\Neophi\BUILD_BRIEF_PROTOTYPE.md`, 14 Nov 2026), the verified research sheet and the application text. No interview was possible in this build session (subagent, no question tool), so nothing here goes beyond those files.

## Platform

web

## Stack

Vite, React, TypeScript, React Router, prerendered public pages. No CDN, no analytics, no third-party scripts.

## Users

Heavy savers of Reels and posts, India first. They save on a phone, in a hurry, and come back weeks later half remembering what they saved and why. English interface; notes and search in Hindi and Hinglish (Devanagari or Latin script) must work. Second audience for this prototype: hackathon judges (Startup Buildathon India 2026) who give it about ten seconds.

## Product Purpose

Keep the Reel or post together with the user's own reason for saving it, sort saves into categories built from the user's own context, let them find a save by half remembering it, and help them use it.

## Positioning

Two things must be obvious in ten seconds: (1) your library organises itself around you; (2) you can trust each memory: your exact words stay untouched, AI suggestions are separate and labelled, every interpretation links to evidence, and it says "not sure" when it is not.

## Operating Context

A prototype. Demo account, data in localStorage, mock AI provider by default, optional local Gemini server. Instagram DM capture has a server webhook and local pickup flow for app-role testers in Meta development mode, plus invented replay fixtures. Live delivery was not tested in the public-site task. See `docs/PUBLIC_SITE_NOTES.md` for evidence and limits.

## Capabilities and Constraints

- No invented numbers, prices, user counts, testimonials or logos. Sample data is synthetic and labelled "sample".
- No third-party Instagram content: sample saves are original SVG scenes with invented captions.
- No pricing page. "Plans: decided after we measure cost" and a local-only waitlist box.
- Competitors named only in the honest compare table, dated 14 Nov 2026.

## Brand Commitments

Pinned by the owner's hub brief: theme "Mindful paper". Light, warm, editorial, deliberately unlike the dark-purple AI-tool look. Cream paper, ink text, one vivid vermilion accent, a deep teal secondary. Dark mode by toggle and by `prefers-color-scheme`. Characterful serif display (Fraunces or similar, self-hosted), clean sans for UI (Inter or similar), Noto Sans Devanagari for Hindi. Cards feel like index cards and polaroids, not glass. No spiral hero: the hero is a scatter of unsorted saves that settles into the user's categories.

## Evidence on Hand

The working prototype itself: the try-a-memory demo, the three lanes, evidence chips, the unavailable-source state. Three code-enforced rules with unit tests.

## Product Principles

1. User intent and AI inference live in separate fields, always.
2. Honest failure beats confident guessing.
3. The user stays in control of categories: every automatic move is explained and reversible.

## Today loop

Today brings back due reminders, explainable daily selections, recent DM/share arrivals and saves awaiting the user's own words. No streaks, badges or urgency mechanics. Sunday recaps count the user's non-sample saves and projects. Resurfacing uses stored dates, project/category membership and moment pins, with inspectable reasons, a 7-day snooze and Done. Device notifications work only while the app is running; no background push is promised. Installable app shortcuts and the Android share target lead directly to capture or Today. See `docs/TODAY_LOOP.md` for rules and limitations.

## Accessibility & Inclusion

4.5:1 contrast minimum, visible focus, keyboard path through capture, analyse, open, search. `prefers-reduced-motion` gives the static settled state. Mobile first: 390, 768, 1440.
