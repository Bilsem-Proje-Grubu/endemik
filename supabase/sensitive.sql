-- Hassas türlerin konumunu sunucuda gizler. schema.sql'den SONRA, SQL Editor'de çalıştırın.

-- Hassas sayılan türlerin listesi (src/data/species.json'daki id değerleri). Yalnızca yönetici düzenler.
create table if not exists public.sensitive_species (id text primary key);
alter table public.sensitive_species enable row level security;
create policy "yönetici hassas listesini yönetir" on public.sensitive_species
  for all to authenticated using (true) with check (true);

-- Herkese açık görünüm: onaylı kayıtlar; hassas türlerde koordinat 0,1° ızgaraya (~10 km) yuvarlanır,
-- not ve yapay zekâ alanları çıkarılır. Görünüm sahibi yetkisiyle çalışır (RLS'yi aşar).
create or replace view public.public_sightings as
select
  s.id, s.species_id, s.species_name,
  case when h.id is null then s.lat else floor(s.lat * 10) / 10 + 0.05 end as lat,
  case when h.id is null then s.lng else floor(s.lng * 10) / 10 + 0.05 end as lng,
  (h.id is not null) as generalized,
  case when h.id is null then s.note else '' end as note,
  s.status, s.created_at
from public.sightings s
left join public.sensitive_species h on h.id = s.species_id
where s.status = 'approved';

grant select on public.public_sightings to anon, authenticated;

-- Ham tabloyu artık herkes okuyamaz; yalnızca yönetici okur (yönetici politikası schema.sql'de var).
drop policy if exists "herkes onaylıyı okur" on public.sightings;

-- Örnek: insert into public.sensitive_species values ('baskil-lalesi');
