# Setup — van clone tot live

Korte gids om de app op te starten. Geschreven voor Yari (of ander teamlid) die later in z'n eigen terminal hier verder gaat. Volgt drie niveaus: **lokaal kijken**, **lokaal echt werken**, **productie deploy**.

---

## 1. Lokaal de schermen bekijken (geen externe diensten nodig)

Werkt direct na clone. Toont alle UI met lege data; perfect voor look-and-feel feedback.

```sh
git clone https://github.com/jeroenvanduijn/unlock-motion-app.git
cd unlock-motion-app
npm install
echo 'VITE_DEV_BYPASS=coach' > .env.local
npm run dev
```

Open `http://localhost:5173/coach`. De gele banner bovenin laat je wisselen tussen **Lid** en **Coach**.

- Lijsten zijn leeg (geen Supabase verbonden)
- Video's tonen "Geen video beschikbaar" (geen Bunny ID)
- Knoppen zoals "Opslaan" en "Boeken" geven errors in de console — dat is normaal zonder database

---

## 2. Lokaal echt werken (met Supabase)

### Supabase project aanmaken

1. Maak een nieuw project op [supabase.com](https://supabase.com) (naam bv. `unlock-motion-prod`)
2. Ga naar **SQL Editor** → plak de inhoud van `supabase/migrations/0001_init.sql` → Run
3. Ga naar **Storage** → maak een private bucket genaamd `evaluation-media`
4. Voeg deze RLS-policies toe op `storage.objects` voor die bucket (SQL Editor):
   ```sql
   create policy "coach upload to evaluation-media" on storage.objects
     for insert with check (bucket_id = 'evaluation-media' and is_coach());
   create policy "coach read evaluation-media" on storage.objects
     for select using (bucket_id = 'evaluation-media' and is_coach());
   create policy "member read own published media" on storage.objects
     for select using (
       bucket_id = 'evaluation-media'
       and exists (
         select 1 from evaluations e
         join evaluation_media m on m.evaluation_id = e.id
         where m.storage_path = name
           and e.member_id = auth.uid()
           and e.published_at is not null
       )
     );
   ```

### Env-vars vullen

Kopieer `.env.example` naar `.env.local` en vul deze in:

```sh
# Supabase — uit Project Settings → API
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-publishable-key>

# Bunny — uit jouw Bunny Stream Library
VITE_BUNNY_LIBRARY_ID=<library-id-cijfer>

# VAPID — voor push. Genereer eenmalig:
# npx web-push generate-vapid-keys
VITE_VAPID_PUBLIC_KEY=<public-key>
```

Voor serverless (gebruikt door `vercel dev` straks):

```sh
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key — PRIVÉ>
PORTAL_ORIGIN=http://localhost:5173
GHL_LOGIN_WEBHOOK_URL=<van Yari, GHL inbound webhook>
GHL_UNLOCK_WELCOME_WEBHOOK_URL=<van Yari, andere inbound webhook>
UNLOCK_WEBHOOK_SECRET=<verzin een lange random string>
VAPID_PUBLIC_KEY=<zelfde als hierboven>
VAPID_PRIVATE_KEY=<van npx web-push generate-vapid-keys>
VAPID_SUBJECT=mailto:yari@crossfitleiden.com
```

> Zet `VITE_DEV_BYPASS` op een commentregel zodra je echt met Supabase werkt — anders blijf je op de fake user.

### Seed jezelf als coach

In de Supabase **SQL Editor**, na je eerste login:

```sql
update profiles set role = 'coach', full_name = 'Yari …' where id = (
  select id from auth.users where email = 'yari@…'
);
```

### Lokale serverless functions

Voor de magic-link, push en webhooks heb je Vercel CLI nodig:

```sh
npm install -g vercel
vercel link        # koppel aan een Vercel project (kan ook 'unlock-motion-app' nieuw)
vercel dev         # vervangt `npm run dev` — draait nu OOK /api/* routes
```

Open weer `http://localhost:3000/login`. Vraag een magic-link aan voor je email. Check Vercel-logs (terminal) voor de link, óf zorg dat GHL hem doorstuurt naar je inbox.

---

## 3. Productie deploy

### Vercel project

1. `vercel link` als je nog niet gekoppeld bent, anders `vercel deploy --prod`
2. In Vercel dashboard → Settings → Environment Variables: zet alle vars uit stap 2 (zonder `VITE_DEV_BYPASS`)
3. Settings → Domains: voeg `app.unlockmotion.nl` toe. Stel A/CNAME-records in bij je domeinregistrar.
4. Cron jobs staan al in `vercel.json` (lopen automatisch na deploy).

### GHL setup

1. **Login-webhook**: maak een inbound webhook in GHL die op een trigger `email + magicLink` vangt en een mail-template stuurt vanuit Unlock-branded afzender. URL → `GHL_LOGIN_WEBHOOK_URL`.
2. **Welcome-webhook**: zelfde patroon maar andere template ("welkom bij Unlock Motion, hier is je app"). URL → `GHL_UNLOCK_WELCOME_WEBHOOK_URL`.

### GymOps cron activeren

De cron-route is **al gecommit** in de Gymops repo (`opsdashboard`, `~/Documents/antigravity/Gymops`) op bestand `app/api/cron/unlock-provision-members/route.ts`. Hij draait alleen nog niet automatisch — `vercel.json` heeft bewust géén schedule-entry.

Volg deze stappen om 'm te activeren:

1. **Env-vars** in Gymops Vercel project toevoegen:
   ```
   UNLOCK_APP_URL=https://app.unlockmotion.nl
   UNLOCK_WEBHOOK_SECRET=<zelfde lange string als in deze repo>
   ```
2. **Google Sheet**: maak een nieuwe tab `Unlock_Provisioned` met headers `Email | Registratienummer | ProvisionedAt | Result` in dezelfde sheet als de andere Gymops-data.
3. **Droog testen** vanaf de Gymops production URL:
   ```sh
   curl "https://<gymops-url>/api/cron/unlock-provision-members?dryRun=true" \
        -H "Authorization: Bearer $CRON_SECRET"
   ```
   Output toont welke leden hij zou provisionen, zonder daadwerkelijk te POST'en.
4. **Cron activeren** in Gymops `vercel.json` — voeg toe aan `crons` array:
   ```json
   { "path": "/api/cron/unlock-provision-members", "schedule": "0 6 * * *" }
   ```
   Commit + push → Vercel begint dagelijks om 06:00 te draaien.

### Supabase Database Webhooks

In Supabase dashboard → **Database → Webhooks** maak twee:

1. **Booking created**: tabel `evaluation_bookings`, events `INSERT`, type HTTP, URL `https://app.unlockmotion.nl/api/webhook/booking-created`, header `X-Unlock-Secret: <zelfde secret>`.
2. **Evaluation published**: tabel `evaluations`, events `UPDATE`, condition `record.published_at IS NOT NULL AND old_record.published_at IS NULL`, URL `…/api/webhook/eval-published`, zelfde header.

### Echte iOS icons

V1 gebruikt SVG-icons. Voor scherpere apple-touch-icons: maak 192×192 en 512×512 PNG's, leg in `public/icons/`, voeg toe aan `manifest.webmanifest` en `index.html`. Zie `public/icons/README.md`.

---

## Verificatie van een werkende deploy

1. Open `https://app.unlockmotion.nl/login`, vraag magic-link aan, ontvang Unlock-branded mail, klik → ingelogd
2. Als coach: voeg oefening toe met Bunny video-ID → zie embed werken
3. Maak testlid via Supabase Auth, koppel via GymOps-cron handmatig (of voeg via SQL toe)
4. Test op iPhone Safari: open app, "Voeg toe aan beginscherm", open vanaf icoon, zet push aan in profiel, trigger handmatig een test-push
5. Run GymOps cron dryRun, dan live — kijk of testlid een welkomstmail krijgt
