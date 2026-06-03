# Unlock Motion App

PWA + coach-dashboard voor het Unlock Motion programma van CrossFit Leiden.

- Member-facing: huiswerk, dagelijkse check-ins, video-library, evaluatie-flow, push-notificaties.
- Coach-facing: leden + voortgang, oefening-library, huiswerk samenstellen, evaluatie-slots + verslagen.

**Plan:** `~/.claude/plans/we-doen-alles-pratend-mighty-cat.md`
**Memory:** `~/.claude/projects/-Users-jeroenvanduijn/memory/unlock_motion_project.md`

## Dev

```sh
cp .env.example .env.local   # vul Supabase + Bunny + VAPID in
npm install
npm run dev
```

Voor lokaal rondklikken zonder Supabase: `VITE_DEV_BYPASS=coach` of `member` in `.env.local`.

## Stack

Vite 8 + React 19 + TypeScript + Tailwind 3 + Supabase + Vercel serverless. PWA via `vite-plugin-pwa` (injectManifest) met eigen `sw.ts`. Web push via `web-push`. Video via Bunny.net iframe embed.

## Architectuur

- `src/lib/` — supabase, auth, push, bunny, types
- `src/components/` — Layout, Protected, Icon, NrsSlider, BunnyPlayer, ProtocolBadge, AddToHomescreenPrompt
- `src/routes/public/` — Login
- `src/routes/member/` — Dashboard, Homework, Exercise, Library, Track, Checkin, EvaluationBook, EvaluationReport, Profile
- `src/routes/coach/` — Members, MemberDetail, Exercises, ExerciseEdit, Homework, Slots, EvaluationWrite
- `api/` — request-login-link, provision-member, push-subscribe, cron/*, webhook/*
- `supabase/migrations/` — SQL schema + RLS
