alter table public.knowledge_documents
add column if not exists uitgebreide_uitleg text,
add column if not exists image_urls jsonb not null default '[]'::jsonb;

alter table public.knowledge_documents
alter column pdf_url set default '';

notify pgrst, 'reload schema';
