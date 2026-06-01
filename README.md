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
```

4. Start de app:

```bash
npm run dev
```

Zonder Supabase-gegevens draait de app in demo-modus met lokale dummydata.

## Supabase

De Supabase-client staat in `src/lib/supabase.ts`.

Voer het schema uit via:

```bash
supabase db push
```

of plak `supabase/migrations/001_initial_schema.sql` in de SQL editor van Supabase.

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
- Row Level Security policies
- startdata voor contacten en kennisbank

PDF-bestanden voor kennisbankdocumenten kunnen in Supabase Storage worden geplaatst. Sla de publieke of ondertekende bestandslink op in `pdf_url`.

## Vercel

Maak in Vercel een nieuw project aan vanuit GitHub en gebruik deze instellingen:

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`

Commit geen `.env.local` of secrets naar GitHub.

## Aanpassen

Categorieën staan in `src/data/categories.ts`.

Drempelwaarden voor gedeelde meldingen staan in `src/lib/reportLogic.ts`:

- vanaf 3 bewoners: meerdere bewoners herkennen dit probleem
- vanaf 5 bewoners: mogelijk collectief gebouwprobleem
- vanaf 10 bewoners: groot gedeeld probleem

Kennisbankdocumenten, tags, FAQ-vragen en lokale PDF-links staan in `src/data/mockData.ts`.

## MVP-grenzen

Deze versie bevat bewust geen groepschat, openbare reacties, likes, pushnotificaties, social feed of volledig ticketsysteem. De toon blijft praktisch, rustig en de-escalerend.
