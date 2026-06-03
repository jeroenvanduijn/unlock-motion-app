# Unlock Motion App

Member-facing PWA + coach dashboard voor het [Unlock Motion](https://unlockmotion.nl)-trainingsprogramma van CrossFit Leiden — Yari's bewegings-coachingsmethode voor mensen met chronische klachten (vooral onderrugklachten).

> **Status:** V1 scaffold staat; nog geen productie-deploy. Zie [docs/STATUS.md](./docs/STATUS.md).

---

## Start hier

1. **[docs/CONTEXT.md](./docs/CONTEXT.md)** — wat is Unlock Motion, het domeinmodel (5 protocollen + hiërarchie), beslissingen die zijn genomen, V1.5/V2 backlog. **Lees dit eerst** als je nieuw bent.
2. **[docs/PLAN.md](./docs/PLAN.md)** — origineel V1-plan met scope, architectuur en verificatie-checklist.
3. **[docs/SETUP.md](./docs/SETUP.md)** — clone → lokaal draaien → productie deploy.
4. **[docs/STATUS.md](./docs/STATUS.md)** — wat klaar is, wat nog moet voor V1 live.

---

## Snelstart — lokaal kijken

```sh
git clone https://github.com/jeroenvanduijn/unlock-motion-app.git
cd unlock-motion-app
npm install
echo 'VITE_DEV_BYPASS=coach' > .env.local
npm run dev
```

Open `http://localhost:5173/coach`. Bovenin een gele banner waarmee je tussen **Lid** en **Coach** wisselt. Lijsten zijn leeg (nog geen database verbonden) — gaat puur om de schermen en navigatie.

Voor echt werken met data: zie [docs/SETUP.md](./docs/SETUP.md) sectie 2.

---

## Stack

```
Vite 8 + React 19 + TypeScript + Tailwind 3
Supabase (auth + Postgres + Storage)
@tanstack/react-query, react-router-dom 7, react-hook-form + zod
vite-plugin-pwa (injectManifest) + custom sw.ts
web-push (Node) + VAPID voor push-notificaties
Bunny.net iframe embeds voor video
Vercel serverless (api/*) + Vercel cron jobs
```

Gemodelleerd naar `~/cfl-fuel` (kickstart.crossfitleiden.com — zelfde stack draait daar productief).

---

## Repo layout

```
api/                       Vercel serverless functions
  _lib/push.ts             Web-push helper (server-side)
  request-login-link.ts    Magic-link aanvraag (via GHL inbound webhook)
  provision-member.ts      Webhook target voor GymOps cron
  push-subscribe.ts        Web-push subscription opslaan
  cron/                    3 dagelijkse reminder-crons
  webhook/                 2 Supabase DB-webhook handlers

src/
  lib/                     supabase, auth, push, bunny, protocols, types
  components/              Layout, Protected, Icon, NrsSlider, BunnyPlayer, ProtocolBadge, AddToHomescreenPrompt
  routes/public/           Login
  routes/member/           9 routes onder /app/*
  routes/coach/            8 routes onder /coach/*
  sw.ts                    Service worker (push + notificationclick)

supabase/migrations/       SQL schema (toepassen via Supabase SQL Editor)
public/                    manifest.webmanifest, icons, favicon
docs/                      Context, plan, setup, status
```

---

## Scripts

```sh
npm run dev         # Vite dev server (alleen frontend; voor /api/* gebruik vercel dev)
npm run build       # tsc + vite build → dist/
npm run typecheck   # tsc -b --noEmit
npm run lint        # eslint
npm run preview     # serve dist/ lokaal
```

---

## Externe systemen waarmee deze app praat

| Systeem | Wat gaat heen | Wat komt terug |
|---|---|---|
| **Supabase** | Auth, alle DB-queries via RLS, Storage uploads | User-sessies, data, signed URLs |
| **Bunny.net** | Niets (alleen iframe embed) | Videostream naar lid |
| **GHL** (LeadConnector) | POST naar 2 inbound webhooks (login-link + welkomstmail) | E-mail vanuit Unlock-branded afzender naar lid |
| **GymOps** (`~/Documents/antigravity/Gymops`) | — | Daily cron POST't nieuwe Unlock-leden naar `/api/provision-member` |

---

## Bijdragen / later verder werken

Lees [docs/CONTEXT.md](./docs/CONTEXT.md) en [docs/STATUS.md](./docs/STATUS.md) zodat je weet wat besloten is en waar V1 staat. Backlog items voor V1.5/V2 staan in CONTEXT.md.

Voor de volgende sessie met Claude (of een andere AI-assistant): geef een link naar deze README en zeg "lees alle docs eerst" — daar zit alle context.
