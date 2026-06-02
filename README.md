# Mijn Graaf van Schuyt

Mobiele bewonersapp voor appartementencomplex Graaf van Schuyt. De MVP richt zich op praktische informatie, meldingen, kennisdelen, kleine hulpvragen en een rustig prikbord.

## Lokaal starten

1. Installeer Node.js.
2. Installeer dependencies:

```bash
npm install
```

3. Maak een `.env.local` bestand op basis van `.env.example`:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_VAPID_PUBLIC_KEY=
```

4. Start de app:

```bash
npm run dev
```

Zonder Supabase-gegevens draait de app in demo-modus met lokale dummydata.

## Accounts

Zodra Supabase is gekoppeld, gebruikt de app e-mail en wachtwoord als basis.

Bewoners maken een account met:

- e-mailadres
- wachtwoord
- voornaam
- huisnummer
- achternaam optioneel

Iedereen krijgt standaard de rol `bewoner`. Maak jezelf beheerder nadat je account is aangemaakt:

```sql
update public.profiles
set rol = 'admin'
where email = 'jouw@emailadres.nl';
```

Supabase Auth e-mailtemplates voor bevestigen en wachtwoord resetten staan in `supabase/email-templates/README.md`.

## Supabase

De Supabase-client staat in `src/lib/supabase.ts`.

Voer het schema uit via:

```bash
supabase db push
```

of plak de migraties in volgorde in de SQL editor van Supabase:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_push_notifications.sql`

De migratie bevat:

- `profiles`
- `contacts`
- `reports`
- `report_confirmations`
- `knowledge_documents`
- `knowledge_document_flags`
- `help_requests`
- `help_offers`
- `bulletin_posts`
- `push_subscriptions`
- `notification_preferences`
- `building_announcements`
- `bulletin_messages`
- Row Level Security policies
- startdata voor contacten en kennisbank
- automatische profielaanmaak bij nieuwe accounts

PDF-bestanden voor kennisbankdocumenten kunnen in Supabase Storage worden geplaatst. Sla de publieke of ondertekende bestandslink op in `pdf_url`.

## Web push notificaties

De app gebruikt de Web Push API met VAPID keys en de bestaande service worker. Er is geen OneSignal of andere externe notificatiedienst nodig.

Frontend/Vercel:

- `VITE_VAPID_PUBLIC_KEY`

Supabase Edge Function secrets:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`, bijvoorbeeld `mailto:jouw@emailadres.nl`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

Deploy de functie:

```bash
supabase functions deploy send-push-notification
```

Pushmeldingen worden alleen verstuurd bij persoonlijke betrokkenheid of wanneer een beheerder een algemene melding op `belangrijk` of `urgent` zet en `notify_all` inschakelt.

## Vercel

Maak in Vercel een nieuw project aan vanuit GitHub en gebruik deze instellingen:

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_VAPID_PUBLIC_KEY`

Commit geen `.env.local` of secrets naar GitHub.

## Aanpassen

Categorieën staan in `src/data/categories.ts`.

Drempelwaarden voor gedeelde meldingen staan in `src/lib/reportLogic.ts`:

- vanaf 3 bewoners: meerdere bewoners herkennen dit probleem
- vanaf 5 bewoners: mogelijk collectief gebouwprobleem
- vanaf 10 bewoners: groot gedeeld probleem

Kennisbankdocumenten, tags, FAQ-vragen en lokale PDF-links staan in `src/data/mockData.ts`.

## MVP-grenzen

Deze versie bevat bewust geen groepschat, openbare reacties, likes, social feed of volledig ticketsysteem. Pushnotificaties zijn beperkt tot relevante persoonlijke meldingen en belangrijke algemene gebouwmeldingen. De toon blijft praktisch, rustig en de-escalerend.
