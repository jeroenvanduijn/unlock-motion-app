# Status — wat staat er, wat nog niet

Snapshot van waar we stonden toen deze repo voor het eerst op GitHub kwam.

---

## ✅ Klaar

### Code
- Vite + React 19 + Supabase + Tailwind scaffold, runt lokaal
- `npm run typecheck` schoon
- `npm run build` slaagt (540 kB main bundle, gzip 151 kB)
- Service worker compileert, PWA precache klopt
- 51 bron-bestanden (zie `git ls-files`)

### Schema
- `supabase/migrations/0001_init.sql` — 12 tabellen, enums, RLS-policies, helpers, triggers
- Klaar om toe te passen op een nieuw Supabase project

### Frontend
- 9 member-routes (Dashboard, Homework, Exercise, Library, Track, Checkin, EvaluationBook, EvaluationReport, Profile)
- 8 coach-routes (Members, MemberDetail met NRS-grafiek, Exercises, ExerciseEdit, HomeworkBuilder, Slots, EvaluationsList, EvaluationWrite met Storage media upload)
- Layout met responsive sidebar + bottom-bar, dev-bypass voor lokaal werken zonder Supabase
- AddToHomescreenPrompt voor iOS PWA install-instructie
- BunnyPlayer, NrsSlider, ProtocolBadge custom components

### Backend
- `api/request-login-link.ts` — magic-link via GHL
- `api/provision-member.ts` — webhook voor GymOps cron
- `api/push-subscribe.ts` — web-push subscription opslaan
- 3 cron-routes: huiswerk-reminder (18:00), checkin-reminder (07:30), eval-6week-trigger (08:00)
- 2 DB-webhook handlers: booking-created, eval-published

### PWA
- Custom `src/sw.ts` met push + notificationclick handlers
- `public/manifest.webmanifest`
- SVG-icon (placeholder; PNG's komen later)

### GymOps cron (apárte repo)
- `~/Documents/antigravity/Gymops/app/api/cron/unlock-provision-members/route.ts` (geschreven, **nog niet gepushed naar Gymops main**)
- `vercel.json` cron-entry toegevoegd in dezelfde repo (ook nog niet gepushed)

---

## 🔧 Te doen voor V1 live

Zie [SETUP.md](./SETUP.md) voor instructies per stap.

1. **Supabase project** aanmaken + migration uitvoeren + Storage bucket + bucket-policies
2. **VAPID keypair** genereren (`npx web-push generate-vapid-keys`)
3. **Bunny library-ID** ophalen uit Bunny dashboard
4. **GHL templates** maken (login-mail + welkomstmail Unlock-branded) + 2 inbound webhook-URLs
5. **Vercel project** aanmaken voor Unlock-app, env-vars, deploy
6. **DNS** `app.unlockmotion.nl` → Vercel
7. **GymOps wijzigingen** committen + pushen naar Gymops main, env-vars in Gymops Vercel, Sheet-tab `Unlock_Provisioned` aanmaken
8. **Supabase Database Webhooks** instellen voor booking-created + eval-published
9. **Yari seeden** als coach (SQL update)
10. **iOS PNG-icons** maken (192/512) en aan manifest/index.html toevoegen
11. **End-to-end test** doorlopen volgens SETUP.md sectie "Verificatie"

---

## ❓ Open vragen / aannames om te toetsen

- **iOS PWA push** — werkt sinds iOS 16.4 maar alleen na "Add to Home Screen". Testen op echte iPhone vóór we hier op leunen.
- **Bunny iframe in iOS standalone PWA** — embedden in standalone-mode kan haperen op iOS. Testen vóór we de hele library zo inrichten.
- **SportBit-datums in GymOps export** — V1 gaat ervan uit dat ze niet meekomen (coach voert handmatig in). Als ze wél meekomen tijdens cron-test, kan provisioning ze meesturen.
- **GHL Unlock welcome-template** — moet Yari nog bouwen + URL terug aanleveren.

---

## 📦 Buiten V1-scope (V1.5 / V2)

Zie [CONTEXT.md](./CONTEXT.md#v15--v2-backlog-uitgesteld-maar-besproken) voor uitwerking per item.

- Community board (Supabase Realtime + Bunny user-uploads)
- Gestructureerde heranalyse (NRS-velden, before/after foto's gekoppeld)
- Private-training variant van Unlock-methode
- Multi-coach met vaste coach per lid
- Automatische 6-weken trigger uit SportBit
- WhatsApp-notificaties via JimOps/GHL
