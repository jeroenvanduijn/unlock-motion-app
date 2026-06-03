# Unlock Motion App — Context & Beslissingen

Dit document legt vast wat tijdens het brainstorm-gesprek met Jeroen en Yari is besproken. Wie hier later op terugkomt — Yari, ander team, latere Claude-sessie — pakt hier de volledige domein-kennis en beslissingen op zonder de hele chat te hoeven teruglezen.

---

## Wat is Unlock Motion?

Een trainingsprogramma binnen CrossFit Leiden voor mensen met chronische klachten — vooral onderrugklachten. **Yari** is oprichter, bewegingsspecialist en huidige drijvende kracht. Hoofddoel V1 is overdraagbaarheid: wat nu in Yari's hoofd en in losse Google Docs zit, moet in het systeem zodat andere coaches de methode kunnen overnemen.

**Hoe het programma werkt vandaag:**
- Lid begint met een volledige houdings- en bewegingsanalyse
- 12-weeks programma (verlengbaar via SportBit-abonnement, kan 6 maanden of langer doorlopen)
- Wekelijkse begeleide groepslessen (Small Group Training) van 1 uur
- Persoonlijke trainingen tijdens die lessen — iedereen heeft eigen oefeningen op basis van eigen klachten
- **Huiswerk-oefeningen** om thuis zelf te doen
- Na 6 weken: **heranalyse** (15–20 min) — coach maakt video's/foto's, doet bewegingsanalyse, schrijft verslag, lid geeft feedback
- Aan einde van 12 weken: weer volledige analyse, programma loopt door zolang lid wil

**Brand & domein:** `unlockmotion.com` + `unlockmotion.nl` (Yari bezit beide; nog geen marketing-site). App komt onder `app.unlockmotion.nl`.

---

## Bestaande systemen waar we mee verbinden

| Systeem | Rol | Hoe we koppelen |
|---|---|---|
| **SportBit** | Ledenadmin + abonnementen | Geen directe koppeling; via export naar GymOps |
| **GymOps** (`~/Documents/antigravity/Gymops`) | CFL ops-dashboard | Vercel cron leest SportBit-CSV, vuurt POST naar Unlock-app |
| **GHL** (LeadConnector) | E-mail + workflows | Inbound webhooks voor login-link en welkomstmail |
| **Bunny.net** | Video hosting | Iframe-embed direct in de app (Yari upload daar al) |
| **Huddle (IMU)** | Was video-presentatielaag boven Bunny | **Komt te vervallen** — we embedden Bunny rechtstreeks |

---

## Domeinmodel — wat is wat

### De 5 protocollen (vast, in enum)

Een Unlock-training bestaat uit oefeningen in vier protocollen, plus een recovery-track:

1. **Frontline** — voorkant van het lijf
2. **Backline** — achterkant van het lijf
3. **Rotation** — rotatie-stabiliteit
4. **Lateral** — heupen + torso, zijwaartse lijn
5. **Recovery guide** — zelfmassage (MFR), ademhalingsoefeningen, meditatie

Elk protocol heeft een **hiërarchie**: oefeningen lopen van makkelijk (level 1) naar moeilijk (level N). Per oefening staat een test-instructie: "wanneer ben je klaar voor de volgende stap?"

### Library vs. Huiswerk

- **Library** = volledige catalogus oefeningen, bladerbaar per protocol. Alle leden kunnen alles bekijken.
- **Huiswerk** = persoonlijke selectie samengesteld door de coach (na een evaluatie). Bevat oefeningen uit meerdere protocollen. Eén actieve toewijzing per lid tegelijk (V1 — kan later relaxen).

### Check-in (dagelijks of wekelijks)

Lid vult NRS-schaal (1–10) in voor: **klacht-intensiteit, energie, spierpijn, vermoeidheid**, plus optionele notitie. Coach configureert per lid of het dagelijks of wekelijks moet (`profiles.checkin_cadence`). Coach ziet trendgrafiek per lid — direct zichtbaar wanneer een dip komt of progressie inzet.

### Evaluatie-flow

1. Coach opent slot-vensters (Yari klikt slots open in de Slots-pagina)
2. Lid kiest een slot in `/app/evaluatie`
3. Coach voert sessie uit (15–20 min, video + foto's, gesprek over voortgang en feedback)
4. Coach schrijft verslag in `/coach/evaluations/:id`: vrije tekst + uploadt foto's/video's naar Supabase Storage (`evaluation-media` bucket)
5. Coach klikt "Publiceren" → lid krijgt push-notificatie → ziet verslag in `/app/evaluatie/:id`

---

## V1-scope (wat we deze ronde bouwen)

### Member-facing (`/app/*`)
- Magic-link login (geen wachtwoord, geen Supabase default mail — branded via GHL)
- Dashboard: vandaag's huiswerk + volgende evaluatie + check-in-knop
- Huiswerk per protocol gegroepeerd, oefeningen afvinkbaar
- Library bladeren per protocol-track
- Oefening-detail: Bunny video + tekst + doorgroei-test + "afvinken"
- Check-in NRS-form
- Evaluatie-slot boeken + verslag teruglezen
- Profiel: push aan/uit, programma-datums

### Coach-facing (`/coach/*`)
- Ledenlijst + per-lid detail (NRS-trend, programma-datums, "Huiswerk samenstellen"-knop)
- Oefening-library beheren (CRUD inclusief Bunny video-ID)
- Huiswerk per lid samenstellen (multi-select uit library, sticky save-knop onderin)
- Evaluatie-slots openzetten
- Verslagen schrijven, media uploaden, publiceren

### Server-side
- Magic-link generator (`api/request-login-link`) — gebruikt GHL inbound webhook voor branded mail
- Member-provisioning (`api/provision-member`) — getriggerd door GymOps cron
- Push-subscribe + 3 reminder-crons + 2 DB-webhooks (booking confirmed, evaluation published)

### Provisioning-keten (zo komt een nieuw lid in de app)

```
SportBit (nieuw Unlock-abonnement aan)
        │
        ▼  export naar Google Drive CSV (bestaand)
GymOps (~/Documents/antigravity/Gymops)
   Vercel cron daily 06:00:
   - app/api/cron/unlock-provision-members/route.ts
   - Filtert "Unlock Motion" + Status ∈ {Actief, Actief / Opgezegd}
   - Joint met leden-CSV voor email/naam/telefoon
   - Diff tegen Google Sheet "Unlock_Provisioned" (state)
   - Per nieuw lid: POST → app.unlockmotion.nl/api/provision-member
        │
        ▼  X-Unlock-Secret header
Unlock-app (deze repo)
   api/provision-member.ts:
   - Maakt Supabase user aan (idempotent)
   - Trigger `handle_new_user` maakt profile-row met role='member'
   - Genereert magic-link
   - POST naar GHL_UNLOCK_WELCOME_WEBHOOK_URL met {email, fullName, magicLink}
        │
        ▼
GHL stuurt branded Unlock-welkomstmail naar lid
   Lid klikt link → ingelogd in app → installeert PWA
```

### Programma-datums (let op!)

SportBit kent een start- en einddatum per abonnement, **maar die komen niet door naar GymOps** in de huidige CSV-export. Daarom voor V1:

- Coach voert start- en einddatum **handmatig** in op `/coach/leden/:id`
- 6-weken evaluatie-trigger gebruikt deze handmatig ingevoerde datum (`program_start_date + 42 dagen`)
- Als SportBit de datums ooit toch wel meestuurt, kunnen we de GymOps-cron uitbreiden zodat dat automatisch ingevuld wordt

---

## Beslissingen die zijn genomen

| Vraag | Keuze | Reden |
|---|---|---|
| Native app of PWA? | **PWA** (vite-plugin-pwa + web-push) | Snel, één codebase, geen App Store. iOS-leden moeten "voeg toe aan beginscherm" voor push werkt. Native komt later als we schalen. |
| Next.js of Vite? | **Vite** | `cfl-fuel` draait al productief op Vite+React+Supabase. Veel direct hergebruikbaar. Next.js 16 (in gymops-studio) is experimenteel. |
| Huddle behouden? | **Nee** | Bunny is de echte hosting. We embedden Bunny rechtstreeks → minder clicks voor lid, Yari blijft uploaden naar Bunny. Huddle-licentie kan opgezegd. |
| Eén of meerdere Bunny libraries? | **Eén gedeelde library** | Library-ID in env. Yari typt per oefening alleen het video-ID. Later op te splitsen. |
| Eén coach of meerdere in V1? | **Alleen Yari** (schema staat klaar voor meerdere) | Wanneer Yari work gaat overdragen: per-lid vaste coach + slot-filter. |
| Eén actief huiswerk per lid? | **Ja in V1** (partial unique index) | Past bij praktijk: na elke evaluatie nieuwe assignment. |
| Datums automatisch of handmatig? | **Handmatig in app door coach** | SportBit-datums komen niet door naar GymOps. Te brittle om V1 erop te bouwen. |
| Heranalyse-verslag gestructureerd? | **Vrije tekst + media** voor V1 | Yari ziet eerst wat 'ie eigenlijk wil noteren; structuur volgt in V1.5. |
| Welkomstmail-template? | **Nieuwe Unlock-branded** in GHL (eigen webhook URL) | Eigen brand, niet hergebruik van Kickstart-mail. Yari bouwt template in GHL. |

---

## V1.5 / V2 backlog (uitgesteld maar besproken)

Geen van deze zit nu in V1 — pak ze in volgorde aan zodra V1 stabiel draait.

### Community board
Supabase Realtime + Storage voor foto's + Bunny voor video's. Eén tabel `community_posts` (auteur, type, body, parent_id voor replies) + `community_reactions`. Leden kunnen vragen stellen, video's/foto's delen, elkaar ondersteunen. Realtime via Postgres → websockets. Moderatie via coach-role + "rapporteer"-knop. Schema houdt al rekening met `profiles.community_handle` (toevoegen). Schatting: 3–5 dagen werk boven op V1.

### Gestructureerde heranalyse
Houdings-scores, beweegpatronen-checklist, klacht-NRS, before/after foto's gekoppeld aan velden. Volgt zodra Yari merkt welke velden 'ie standaard noteert in de V1 vrije-tekst verslagen.

### Private-training variant
In Unlock zit ook een tweede lijn: 1-op-1 privé-trainingen volgens dezelfde methode maar andere flow. Zelfde schema, andere routes/UI of een vlag per programma.

### Multi-coach met vaste coach per lid
Schema heeft al `evaluation_slots.coach_id` en `evaluations.coach_id`. Bij meerdere coaches: vaste coach toewijzen via `profiles.assigned_coach_id`, slots filteren in member-UI.

### Automatische 6-weken trigger uit SportBit
Als SportBit ooit datums doorstuurt naar GymOps: GymOps-cron stuurt `program_start_date` mee in de provisioning-POST, app vult automatisch in, 6-weken cron werkt vanzelf.

### WhatsApp-notificaties via JimOps/GHL
Yari wil leden via WhatsApp aansporen ("nieuw huiswerk klaar", "tijd voor je check-in"). Coach selecteert leden + kiest template + klikt verzenden. Implementatie:
- Nieuw endpoint `api/notify-whatsapp.ts` POST't naar GHL inbound webhook van JimOps (heeft WhatsApp-integratie)
- Telefoonnummer staat al in `profiles.phone`
- Nieuw veld `profiles.ghl_contact_id` (nullable) toevoegen voor 1-op-1 koppeling
- `audit_log` noteert wat gestuurd is naar wie
- Start handmatig vanuit coach-UI ("Stuur reminder"-knop op ledenlijst + huiswerk-builder)
- Later: bestaande reminder-crons sturen ook WhatsApp als fallback wanneer push niet aankomt

---

## Wat er nog niet werkt (deploy-checklist)

Zie [SETUP.md](./SETUP.md) voor de stappen. Korte versie van wat ontbreekt om V1 echt live te krijgen:

- Supabase project aanmaken + `0001_init.sql` toepassen + Storage bucket `evaluation-media`
- VAPID keypair genereren voor push (`npx web-push generate-vapid-keys`)
- Bunny library-ID overnemen uit Bunny dashboard
- GHL: Unlock-welkomstmail-template + 2 inbound webhook-URLs (login + welcome)
- Vercel project deployen + alle env-vars + DNS `app.unlockmotion.nl`
- GymOps cron-route deployen en `dryRun=true` testen tegen prod-CSV
- Yari als eerste coach seeden (`update profiles set role='coach' where id=...`)
- Echte iOS PNG-icons (192/512) maken — V1 gebruikt nu een SVG-icon als placeholder

---

## Stack-samenvatting (cheatsheet)

```
Frontend  : Vite 8 + React 19 + TypeScript + Tailwind 3
Routing   : react-router-dom 7
Data      : @supabase/supabase-js + @tanstack/react-query
Forms     : react-hook-form + zod
PWA       : vite-plugin-pwa (injectManifest mode) + custom sw.ts
Push      : web-push (Node) + VAPID
Video     : Bunny.net iframe.mediadelivery.net embeds
Auth      : Supabase magic-link via GHL inbound webhook (branded email)
Storage   : Supabase Storage bucket `evaluation-media` (private)
Hosting   : Vercel serverless + Vercel cron jobs
Deploy    : app.unlockmotion.nl
```

Gemodelleerd naar `~/cfl-fuel` (kickstart.crossfitleiden.com) — daar draait dezelfde stack al productief sinds maanden.
