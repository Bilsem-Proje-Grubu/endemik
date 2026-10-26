-- Bilgi yarışması sıralaması. Supabase SQL Editor'de BİR KEZ çalıştırın (rate-limit.sql'den sonra).
-- Herkes ilk 20'yi görür; herkes puan ekleyebilir (aynı internet adresinden dakikada en fazla 5); yalnızca yönetici silebilir.
create table if not exists public.quiz_scores (
  id bigserial primary key,
  name text not null check (char_length(trim(name)) between 1 and 20 and name !~ '[<>&"''/\\]'),
  score int not null check (score between 0 and 10),
  created_at timestamptz not null default now()
);
create index if not exists quiz_scores_rank on public.quiz_scores (score desc, created_at);
alter table public.quiz_scores enable row level security;

drop policy if exists "herkes sıralamayı okur" on public.quiz_scores;
create policy "herkes sıralamayı okur" on public.quiz_scores for select to anon, authenticated using (true);
drop policy if exists "herkes puan ekler" on public.quiz_scores;
create policy "herkes puan ekler" on public.quiz_scores for insert to anon, authenticated with check (public.check_send_limit());
drop policy if exists "yönetici siler" on public.quiz_scores;
create policy "yönetici siler" on public.quiz_scores for delete to authenticated using (true);

grant select, insert on public.quiz_scores to anon, authenticated;
grant delete on public.quiz_scores to authenticated;
grant usage, select on sequence public.quiz_scores_id_seq to anon, authenticated;
