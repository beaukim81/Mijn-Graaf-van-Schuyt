create extension if not exists "pgcrypto";

create type public.app_role as enum ('bewoner', 'admin');
create type public.knowledge_document_status as enum ('Concept', 'Gepubliceerd', 'Te controleren');

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  naam_of_bijnaam text not null,
  huisnummer text,
  verdieping_of_gebouwdeel text,
  profielfoto_url text,
  mag_benaderd_worden_voor_hulp boolean not null default false,
  contact_info_zichtbaar_voor_helpers boolean not null default false,
  kan_helpen_met text[] not null default '{}',
  rol public.app_role not null default 'bewoner',
  email text,
  telefoon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  categorie text not null,
  beschrijving text not null default '',
  telefoonnummer text,
  emailadres text,
  website text,
  zichtbaar boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  titel text not null,
  omschrijving text not null,
  categorie text not null,
  locatie_in_gebouw text not null,
  type_melding text not null,
  status text not null default 'Nieuw',
  aangemaakt_door uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.report_confirmations (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  herkent_probleem boolean not null,
  created_at timestamptz not null default now(),
  unique (report_id, user_id)
);

create table public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  titel text not null,
  categorie text not null,
  documenttype text not null,
  korte_samenvatting text not null,
  pdf_url text not null,
  tags text[] not null default '{}',
  leverancier_of_fabrikant text,
  faq jsonb not null default '[]',
  toegevoegd_door uuid references auth.users(id) on delete set null,
  status public.knowledge_document_status not null default 'Concept',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.knowledge_document_flags (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reden text default 'Klopt dit nog?',
  created_at timestamptz not null default now(),
  unique (document_id, user_id)
);

create table public.help_requests (
  id uuid primary key default gen_random_uuid(),
  titel text not null,
  omschrijving text not null,
  categorie text not null,
  aangemaakt_door uuid not null references auth.users(id) on delete cascade,
  aanmaker_naam text not null,
  aanmaker_huisnummer text,
  status text not null default 'Open',
  created_at timestamptz not null default now()
);

create table public.help_offers (
  id uuid primary key default gen_random_uuid(),
  help_request_id uuid not null references public.help_requests(id) on delete cascade,
  helper_id uuid not null references auth.users(id) on delete cascade,
  helper_naam text not null,
  helper_huisnummer text,
  contact_info_delen boolean not null default false,
  created_at timestamptz not null default now(),
  unique (help_request_id, helper_id)
);

create table public.help_messages (
  id uuid primary key default gen_random_uuid(),
  help_request_id uuid not null references public.help_requests(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  author_house_number text,
  message text not null,
  created_at timestamptz not null default now()
);

create table public.bulletin_posts (
  id uuid primary key default gen_random_uuid(),
  titel text not null,
  omschrijving text not null,
  categorie text not null,
  contactpersoon text,
  aangemaakt_door uuid not null references auth.users(id) on delete cascade,
  status text not null default 'Actief',
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and rol = 'admin'
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger contacts_touch before update on public.contacts for each row execute function public.touch_updated_at();
create trigger reports_touch before update on public.reports for each row execute function public.touch_updated_at();
create trigger knowledge_documents_touch before update on public.knowledge_documents for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.reports enable row level security;
alter table public.report_confirmations enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.knowledge_document_flags enable row level security;
alter table public.help_requests enable row level security;
alter table public.help_offers enable row level security;
alter table public.help_messages enable row level security;
alter table public.bulletin_posts enable row level security;

create policy "Bewoners lezen profielen beperkt" on public.profiles for select to authenticated using (true);
create policy "Bewoner beheert eigen profiel" on public.profiles for all to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

create policy "Bewoners lezen zichtbare contacten" on public.contacts for select to authenticated using (zichtbaar = true or public.is_admin());
create policy "Admin beheert contacten" on public.contacts for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Bewoners lezen meldingen" on public.reports for select to authenticated using (true);
create policy "Bewoners maken meldingen" on public.reports for insert to authenticated with check (aangemaakt_door = auth.uid());
create policy "Eigenaar of admin wijzigt meldingen" on public.reports for update to authenticated using (aangemaakt_door = auth.uid() or public.is_admin()) with check (aangemaakt_door = auth.uid() or public.is_admin());
create policy "Admin verwijdert meldingen" on public.reports for delete to authenticated using (public.is_admin());

create policy "Bewoners lezen herkenningen" on public.report_confirmations for select to authenticated using (true);
create policy "Bewoners beheren eigen herkenning" on public.report_confirmations for all to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

create policy "Gepubliceerde documenten zichtbaar" on public.knowledge_documents for select to authenticated using (status = 'Gepubliceerd' or toegevoegd_door = auth.uid() or public.is_admin());
create policy "Bewoner stelt document voor" on public.knowledge_documents for insert to authenticated with check (toegevoegd_door = auth.uid() or public.is_admin());
create policy "Eigen concept of admin wijzigt document" on public.knowledge_documents for update to authenticated using (toegevoegd_door = auth.uid() or public.is_admin()) with check (toegevoegd_door = auth.uid() or public.is_admin());
create policy "Admin verwijdert document" on public.knowledge_documents for delete to authenticated using (public.is_admin());

create policy "Bewoners lezen documentvlaggen" on public.knowledge_document_flags for select to authenticated using (public.is_admin() or user_id = auth.uid());
create policy "Bewoners markeren document" on public.knowledge_document_flags for insert to authenticated with check (user_id = auth.uid());

create policy "Bewoners lezen hulpvragen" on public.help_requests for select to authenticated using (true);
create policy "Bewoners maken hulpvragen" on public.help_requests for insert to authenticated with check (aangemaakt_door = auth.uid());
create policy "Eigenaar of admin wijzigt hulpvraag" on public.help_requests for update to authenticated using (aangemaakt_door = auth.uid() or public.is_admin()) with check (aangemaakt_door = auth.uid() or public.is_admin());
create policy "Eigenaar of admin verwijdert hulpvraag" on public.help_requests for delete to authenticated using (aangemaakt_door = auth.uid() or public.is_admin());

create policy "Betrokkenen lezen hulpaanbod" on public.help_offers for select to authenticated using (
  helper_id = auth.uid()
  or public.is_admin()
  or exists (select 1 from public.help_requests where id = help_request_id and aangemaakt_door = auth.uid())
);
create policy "Bewoners bieden hulp aan" on public.help_offers for insert to authenticated with check (helper_id = auth.uid());
create policy "Helper of admin verwijdert hulpaanbod" on public.help_offers for delete to authenticated using (helper_id = auth.uid() or public.is_admin());

create policy "Betrokkenen lezen hulpberichten" on public.help_messages for select to authenticated using (
  public.is_admin()
  or author_id = auth.uid()
  or exists (select 1 from public.help_requests where id = help_request_id and aangemaakt_door = auth.uid())
  or exists (select 1 from public.help_offers where help_request_id = public.help_messages.help_request_id and helper_id = auth.uid())
);
create policy "Betrokkenen plaatsen hulpberichten" on public.help_messages for insert to authenticated with check (
  author_id = auth.uid()
  and (
    public.is_admin()
    or exists (select 1 from public.help_requests where id = help_request_id and aangemaakt_door = auth.uid())
    or exists (select 1 from public.help_offers where help_request_id = public.help_messages.help_request_id and helper_id = auth.uid())
  )
);
create policy "Schrijver wijzigt eigen hulpbericht" on public.help_messages for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "Schrijver of admin verwijdert hulpbericht" on public.help_messages for delete to authenticated using (author_id = auth.uid() or public.is_admin());

create policy "Bewoners lezen prikbord" on public.bulletin_posts for select to authenticated using (true);
create policy "Bewoners plaatsen prikbordbericht" on public.bulletin_posts for insert to authenticated with check (aangemaakt_door = auth.uid());
create policy "Eigenaar of admin wijzigt prikbordbericht" on public.bulletin_posts for update to authenticated using (aangemaakt_door = auth.uid() or public.is_admin()) with check (aangemaakt_door = auth.uid() or public.is_admin());
create policy "Eigenaar of admin verwijdert prikbordbericht" on public.bulletin_posts for delete to authenticated using (aangemaakt_door = auth.uid() or public.is_admin());

insert into public.contacts (naam, categorie, beschrijving, telefoonnummer, emailadres, website, zichtbaar) values
('REBO Wonen algemeen', 'Verhuur', 'Algemeen nummer voor vragen aan REBO Wonen.', '088 220 16 00', null, null, true),
('REBO huurvragen', 'Verhuur', 'Voor vragen over huur en individuele huurzaken.', '088 220 16 10', 'huren@rebogroep.nl', null, true),
('Mijn REBO portal', 'Verhuur', 'Voor individuele meldingen en zaken die je rechtstreeks bij REBO moet melden.', null, null, 'https://www.thuisbijrebo.nl/mijn-rebo/inloggen', true),
('REBO schade melden', 'Spoed', 'Voor het melden van schade bij REBO.', '088 434 99 47', null, null, true),
('Vattenfall Warmte storing', 'Spoed', 'Voor storingen met warmte.', '0800 0513', null, null, true),
('Vattenfall Warmte klantenservice', 'Leveranciers', 'Klantenservice warmte. WhatsApp kan via 020 892 02 30.', '0900 0808', null, 'https://wa.me/31208920230', true),
('Vitens klantenservice', 'Leveranciers', 'Voor vragen over water.', '088 884 50 60', null, null, true),
('Vitens waterstoring', 'Spoed', 'Voor waterstoringen. WhatsApp kan via 06 8273 4859.', '0800 0359', null, 'https://wa.me/31682734859', true),
('Gemeente Arnhem', 'Gemeente', 'Gemeentelijke zaken rond afval, openbare ruimte en meldingen buiten het gebouw.', '0800 1809', null, 'https://www.arnhem.nl/', true),
('Gemeente Arnhem WhatsApp', 'Gemeente', 'WhatsApp-contact met de gemeente Arnhem.', null, null, 'https://wa.me/31612521130', true),
('Wijkagent Arno Nieman', 'Veiligheid', 'Voor contact met de wijkagent via de politie. Bel bij spoed altijd 112.', '0900 8844', null, null, true);

insert into public.knowledge_documents (titel, categorie, documenttype, korte_samenvatting, pdf_url, tags, leverancier_of_fabrikant, faq, status) values
('Bediening draaikiepramen', 'Draaikiepramen', 'Officiële handleiding', 'Uitleg over het veilig openen, kiepen en sluiten van de draaikiepramen.', '/kennisbank/01_Bediening_Draaikiepramen.pdf', '{"raam","kiepstand","hendel","bediening","onderdeel"}', null, '[{"vraag":"Hoe voorkom ik dat het raam tegelijk open en op kiepstand staat?"}]', 'Gepubliceerd'),
('Bediening buitendeuren', 'Buitendeuren', 'Officiële handleiding', 'Praktische bediening van buitendeuren en aandachtspunten bij sluiten en openen.', '/kennisbank/02_Bediening_Buitendeuren.pdf', '{"deur","buitendeur","slot","sleutel","toegang"}', null, '[{"vraag":"Wat kan ik controleren als een buitendeur niet goed sluit?"}]', 'Gepubliceerd'),
('Bediening intercom', 'Intercom', 'Officiële handleiding', 'Uitleg over de intercom, aanbellen, openen en veelvoorkomende controles.', '/kennisbank/03_Bediening_Intercom.pdf', '{"intercom","toegang","bel","deur openen","welke intercom"}', null, '[{"vraag":"Welke intercom heb ik?"}]', 'Gepubliceerd'),
('Bediening mechanische ventilatie', 'Mechanische ventilatie', 'Officiële handleiding', 'Informatie over bediening, standen en basiscontroles van het ventilatiesysteem.', '/kennisbank/04_Bediening_Ventilatie.pdf', '{"mechanische ventilatie","afzuiging","ventilatiesysteem","filter","badkamer","keuken"}', null, '[{"vraag":"Waar koop ik vervangende filters?"},{"vraag":"Wat kan ik controleren als de afzuiging zwakker lijkt?"}]', 'Gepubliceerd'),
('Bediening vloerverwarming', 'Vloerverwarming', 'Officiële handleiding', 'Gebruik en aandachtspunten voor de vloerverwarming en temperatuurregeling.', '/kennisbank/05_Bediening_Vloerverwarming.pdf', '{"vloerverwarming","verwarming","temperatuur","thermostaat","regeling"}', null, '[{"vraag":"Wat kan ik controleren als de vloer niet warm wordt?"}]', 'Gepubliceerd'),
('Bediening rookmelders', 'Rookmelders', 'Officiële handleiding', 'Informatie over rookmelders, signalen, testen en aandachtspunten.', '/kennisbank/06_Bediening_Rookmelders.pdf', '{"rookmelder","veiligheid","piep","test","batterij","onderdeel"}', null, '[{"vraag":"Welke rookmelder hangt er in het gebouw?"}]', 'Gepubliceerd'),
('Onderhoud douchewanden', 'Douchewanden', 'Officiële handleiding', 'Onderhoudstips voor douchewanden, glas en scharnieren.', '/kennisbank/07_Onderhoud_Douchewanden.pdf', '{"douchewand","badkamer","glas","onderhoud","schoonmaken","scharnier"}', null, '[{"vraag":"Hoe maak ik de douchewand schoon zonder schade?"}]', 'Gepubliceerd'),
('Onderhoud keuken', 'Keuken', 'Officiële handleiding', 'Onderhoud van keukenonderdelen, fronten, scharnieren en praktische controles.', '/kennisbank/08_Onderhoud_Keuken.pdf', '{"keuken","keukenfront","scharnier","lade","afstellen","onderdeel","afzuigkap"}', null, '[{"vraag":"Hoe stel ik een keukenfront af?"}]', 'Gepubliceerd'),
('Onderhoud aluminium kozijnen', 'Aluminium kozijnen', 'Officiële handleiding', 'Onderhoud van aluminium kozijnen en aandachtspunten voor schoonmaak.', '/kennisbank/09_Onderhoud_Aluminium.pdf', '{"aluminium","kozijnen","raam","deur","onderhoud","schoonmaken"}', null, '[{"vraag":"Welke schoonmaakmiddelen zijn geschikt voor aluminium kozijnen?"}]', 'Gepubliceerd');
