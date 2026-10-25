-- Supabase SQL Editor'de BİR KEZ çalıştırın (schema.sql'den sonra).
-- Aynı internet adresinden (IP) dakikada en fazla 5 kayıt gönderilebilir.
-- IP adresi yalnızca bu kontrol için, en çok 10 dakika saklanır; sightings tablosuna yazılmaz.

create table if not exists public.send_log (
  sender text not null,
  at timestamptz not null default now()
);
create index if not exists send_log_sender_at on public.send_log (sender, at);
-- Kural eklenmediği için API üzerinden (anon/authenticated) okunamaz ve yazılamaz.
alter table public.send_log enable row level security;

create or replace function public.check_send_limit() returns boolean
language plpgsql security definer set search_path = public as $$
declare
  h json := coalesce(nullif(current_setting('request.headers', true), '')::json, '{}'::json);
  -- Önce Cloudflare/Supabase'in güvenilir başlıkları, yoksa x-forwarded-for'un ilk adresi.
  ip text := coalesce(
    nullif(trim(h ->> 'cf-connecting-ip'), ''),
    nullif(trim(h ->> 'x-real-ip'), ''),
    nullif(trim(split_part(coalesce(h ->> 'x-forwarded-for', ''), ',', 1)), ''),
    'bilinmiyor');
  n int;
begin
  delete from public.send_log where at < now() - interval '10 minutes';
  select count(*) into n from public.send_log where sender = ip and at > now() - interval '1 minute';
  if n >= 5 then return false; end if;
  insert into public.send_log (sender) values (ip);
  return true;
end $$;

grant execute on function public.check_send_limit() to anon, authenticated;

-- Eski ekleme kuralının yerine, hız sınırını da denetleyen kural.
drop policy if exists "herkes bekleyen ekler" on public.sightings;
create policy "herkes bekleyen ekler" on public.sightings
  for insert to anon, authenticated
  with check (status = 'pending' and public.check_send_limit());
