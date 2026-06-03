# Unlock Motion App — V1 Plan

## Context

Unlock Motion is een trainingsprogramma binnen CrossFit Leiden voor mensen met chronische klachten (m.n. onderrugklachten), opgericht en geleid door Yari als bewegingsspecialist. Leden volgen een persoonlijk traject van minimaal 12 weken (verlengbaar) met begeleide groepslessen + huiswerk-oefeningen, gericht op herstel van spierdisbalansen en bewegingspatronen.

Op dit moment leeft alles verspreid: trainingsprogramma's en huiswerk in Google Docs/Excel, video-library in Huddle (met Bunny.net als echte hosting), ledenadmin in SportBit + GymOps, communicatie via WhatsApp. Het 6-weken evaluatiemoment wordt houtje-touwtje gepland.

**Doel V1:** één member-facing PWA + coach-facing dashboard die deze losse stukken samenbrengt voor de huidige Unlock-leden. Klein houden, snel laten ervaren, basis leggen voor latere features (community, gestructureerde heranalyses, multi-coach). Tweede doel: Unlock-methode overdraagbaar maken van Yari naar andere coaches — wat in Google Docs zit moet straks in het systeem zitten.

## Stack

Vite + React 19 + TypeScript + Tailwind + Supabase + Vercel, gemodelleerd naar `~/cfl-fuel` (zelfde stack draait daar productief sinds maanden). Geen Next.js — `cfl-fuel`'s patroon werkt en alle herbruikbare bouwstenen zitten daar in.

PWA via `vite-plugin-pwa` met eigen service worker (klein, geen Workbox). Web push via `web-push` (Node lib). iOS-leden zien een "voeg toe aan beginscherm"-instructie voor ze push kunnen aanzetten.

Bunny.net iframe-embeds rechtstreeks in de app (geen Huddle meer). Eén gedeelde Bunny library (ID in env), Yari typt per oefening alleen de video-ID.

Deploy onder `app.unlockmotion.nl`. Nieuwe Supabase project.

## Domeinmodel — kernpunten

De Unlock-library heeft een vaste structuur die in het schema verankerd zit:

- **5 protocollen** (enum): `frontline`, `backline`, `rotation`, `lateral`, `recovery`
- Per protocol een **hiërarchie** van oefeningen van makkelijk → moeilijk
- Per oefening: titel, beschrijving, Bunny video-ID, test-instructies (hoe weet je dat je klaar bent voor de volgende stap)
- **Huiswerk per lid** = selectie van oefeningen uit de library, samengesteld door de coach na een evaluatie
- Lid ziet huiswerk gegroepeerd per protocol; kan oefeningen afvinken
- Lid kan vrij door de hele library bladeren per protocol

Start- en einddatum van het traject worden door de coach handmatig in de app ingevoerd per lid (SportBit stuurt deze niet door naar GymOps). De "na 6 weken evaluatie"-trigger gebruikt deze coach-ingevoerde startdatum.

## Belangrijkste bestanden om te bouwen

### Nieuwe repo: `~/unlock-motion-app`

**Supabase schema** (`supabase/migrations/0001_init.sql`):
- `profiles` (rol: coach/member, program_start_date, program_end_date, checkin_cadence, sportbit_member_id)
- `exercises` (protocol enum, hierarchy_level, title, description, bunny_video_id, test_instructions)
- `homework_assignments` (member_id, assigned_by, notes, is_active) — één actieve per lid (partial unique index)
- `homework_exercises` (assignment_id, exercise_id, coach_notes, position)
- `exercise_completions` (member_id, exercise_id, completed_at)
- `checkins` (member_id, for_date unique, complaint_severity, energy, soreness, fatigue, note — alles 1-10 NRS)
- `evaluation_slots` (coach_id, starts_at, ends_at, is_published)
- `evaluation_bookings` (slot_id unique, member_id)
- `evaluations` (member_id, coach_id, booking_id, conducted_at, report_text, published_at)
- `evaluation_media` (evaluation_id, storage_path, kind: photo/video)
- `push_subscriptions` (member_id, endpoint unique, p256dh, auth)
- `audit_log` (append-only)

RLS volgens `cfl-fuel`-patroon: members zien alleen eigen rijen + de library + gepubliceerde slots; coaches zien alles. Helper-functie `is_coach()` + auto-create `profiles`-row via `handle_new_user()` trigger.

**Server-side (`api/*` Vercel serverless):**
- `request-login-link.ts` — kopie van `/Users/jeroenvanduijn/cfl-fuel/api/request-login-link.ts`, env-vars aanpassen
- `provision-member.ts` — gebaseerd op `/Users/jeroenvanduijn/cfl-fuel/api/ghl-provision-client.ts`. Body `{email, fullName, phone, sportbitMemberId}`, HMAC via `X-Unlock-Secret`. Maakt user aan, genereert magic link, POST naar `GHL_UNLOCK_WELCOME_WEBHOOK_URL` voor branded welkomstmail.
- `push-subscribe.ts` — slaat web-push subscription op
- `cron/huiswerk-reminder.ts` — daily 18:00, leden met active assignment en 0 completions vandaag
- `cron/checkin-reminder.ts` — daily 07:30, respecteert per-member cadence (daily/weekly)
- `cron/eval-6week-trigger.ts` — daily, vindt leden waar `program_start_date + 42d = today` en geen evaluatie gepland → push naar lid + coach
- `webhook/booking-created.ts` + `webhook/eval-published.ts` — Supabase DB webhooks → push

**Frontend (`src/`):**
- `lib/supabase.ts`, `lib/auth.tsx`, `components/Layout.tsx`, `components/Protected.tsx`, `components/AddToHomescreenPrompt.tsx` — letterlijk kopiëren uit `~/cfl-fuel/src/` en alleen branding/role-namen aanpassen
- `lib/bunny.ts` — bouwt iframe-src uit env library_id + video_id
- `lib/push.ts` — `pushManager.subscribe()` helper
- `components/NrsSlider.tsx`, `components/BunnyPlayer.tsx`, `components/ProtocolBadge.tsx` — nieuw
- `routes/public/Login.tsx`
- `routes/member/`: `Dashboard.tsx` (huiswerk vandaag + volgende eval), `Homework.tsx` (per protocol gegroepeerd), `Exercise.tsx` (Bunny embed + tekst + afvinken), `Library.tsx` (5 tracks), `Track.tsx` (oefeningen per protocol op niveau), `Checkin.tsx`, `EvaluationBook.tsx`, `EvaluationReport.tsx`, `Profile.tsx`
- `routes/coach/`: `Members.tsx`, `MemberDetail.tsx` (check-in grafiek, completions, start/eind-datums invullen, "start 6-week flow"), `Exercises.tsx` + `ExerciseEdit.tsx` (library beheer), `Homework.tsx` (huiswerk per lid samenstellen), `Slots.tsx`, `EvaluationWrite.tsx` (media upload + report + publish)

**PWA:** `public/manifest.webmanifest`, `public/sw.js` (custom; push + notificationclick handlers), `public/icons/`. `vite.config.ts` registreert `vite-plugin-pwa` in `injectManifest` modus.

### GymOps cron (`~/Documents/antigravity/Gymops`)

- `app/api/cron/unlock-provision-members/route.ts` (nieuw) — daily 06:00 via `vercel.json` cron
- Leest `overzicht_abonnementen__*.csv` via bestaande `lib/google-drive.ts` (zie `app/api/cron/unlock-motion-report/route.ts` voor het exacte patroon)
- Filtert op `Abonnement` bevat `"Unlock Motion"` + `Status` in `('Actief','Actief / Opgezegd')` (CLAUDE.md rule)
- Joint met `Leden_uitgebreid__*.csv` op `Registratienummer` voor email/naam/telefoon
- State zonder DB: een Google Sheet `Unlock_Provisioned` met kolommen `Email | Registratienummer | ProvisionedAt | Result`. Skip rijen die er al in staan met `Result='ok'`.
- Per nieuw lid: `POST https://app.unlockmotion.nl/api/provision-member` met `X-Unlock-Secret`. Append resultaat in sheet.
- Start- en einddatum worden NIET meegestuurd — coach voert die handmatig in.

### GHL

- Nieuwe inbound webhook + nieuwe Unlock-branded welkomstmail-template. Yari bouwt de template, plant in de GHL-flow, geeft me de URL voor `GHL_UNLOCK_WELCOME_WEBHOOK_URL`.

## Bewust uitgesteld naar V1.5 / V2

- **Community board** — Supabase Realtime + Storage + Bunny user-uploads. Schema houdt al rekening met `profiles.community_handle` (toevoegen) zodat we later niet hoeven te migreren.
- **Gestructureerde heranalyse** (NRS-velden, before/after foto's gekoppeld) — V1 is vrije tekst + media.
- **Private-training variant** van Unlock-methode — V1 is alleen Small Group Training.
- **Multi-coach met vaste coach per lid** — schema staat klaar, V1 alleen Yari geseed.
- **Automatische cohort-trigger uit SportBit** — afhankelijk van of SportBit-datums ooit doorkomen naar GymOps. Eerst handmatig invoeren door coach.
- **WhatsApp-notificaties via JimOps/GHL** — in plaats van of naast web-push wil Yari leden via WhatsApp kunnen aansporen ("nieuw huiswerk klaar", "tijd voor je check-in", "evaluatie ingepland"). Coach kiest leden (multi-select of filter, bv. "alle leden met active homework") en triggert een bericht-template. Implementatie: nieuw endpoint `api/notify-whatsapp.ts` in de Unlock-app dat een POST doet naar een GHL inbound webhook van JimOps (of een ander GHL-subaccount met WhatsApp-integratie). Telefoonnummer staat al in `profiles.phone`; nieuw veld `profiles.ghl_contact_id` (nullable) wordt later toegevoegd voor 1-op-1 koppeling. Audit-log per verzonden bericht. Triggers initieel handmatig vanuit coach-UI; latere stap: dezelfde reminder-crons sturen óók WhatsApp wanneer een lid geen web-push heeft. Reikwijdte kan groeien (broadcast bij library-update, evaluatie-uitnodiging, 6-weken trigger) — eerst start met handmatige "stuur huiswerk-reminder"-knop.

## Verificatie (V1 klaar als…)

1. **Lokaal testen end-to-end**:
   - `supabase start` + migrations toepassen, seed Yari als coach + 1 testlid + 5 oefeningen (één per protocol)
   - `vercel dev` voor cron + webhook endpoints
   - Login als coach: voeg oefening toe met Bunny video-ID, stel huiswerk samen voor testlid, open evaluatie-slot
   - Login als lid (magic link via lokale mailpit of console-log): zie huiswerk, vink af, vul check-in in, boek slot, ontvang gepubliceerd verslag

2. **PWA installeren** op iPhone Safari + Android Chrome. Push toestaan, trigger handmatig een test-push via `api/push-send` met test-payload, controleer ontvangst in beide.

3. **Webhook keten testen**: POST naar `/api/provision-member` met test-body via `curl`. Check: Supabase user aangemaakt, GHL inbound webhook ontvangt magic-link, mail aankomt in Yari's test-mailbox.

4. **GymOps cron droog draaien**: run de nieuwe route lokaal tegen prod-CSV met `dryRun=true` query param, log welke leden hij zou provisionen. Pas dan live zetten.

5. **Productie smoke test**: deploy op `app.unlockmotion.nl`, Yari log in als coach, voer 1 echt lid handmatig in, lid installeert PWA, doorloopt eerste huiswerk + check-in.

## Aannames die we tijdens bouwen toetsen

- Bunny iframe embeds werken in iOS standalone PWA (testen op echte iPhone vóór we te ver bouwen).
- iOS web push werkt betrouwbaar in geïnstalleerde PWA-modus (testen na MVP front-end staat).
- SportBit-datums komen niet door — coach voert handmatig in. Als ze wél doorkomen tijdens GymOps-test, kunnen we de cron uitbreiden.
