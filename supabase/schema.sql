-- Supabase SQL Editor'de çalıştırın.
create table if not exists public.sightings (
  id uuid primary key default gen_random_uuid(),
  species_id text not null,
  species_name text not null,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  note text default '' check (char_length(note) <= 500),
  ai_info jsonb,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

alter table public.sightings enable row level security;

-- Herkes yalnızca onaylı kayıtları okuyabilir.
create policy "herkes onaylıyı okur" on public.sightings
  for select to anon, authenticated using (status = 'approved');

-- Herkes kayıt ekleyebilir, ama yalnızca 'pending' olarak.
create policy "herkes bekleyen ekler" on public.sightings
  for insert to anon, authenticated with check (status = 'pending');

-- Yönetici (giriş yapmış kullanıcı) her şeyi görür ve durumunu değiştirir.
-- Authentication > Users bölümünden yalnızca kendi hesabınızı oluşturun ve
-- "Allow new users to sign up" seçeneğini kapatın.
create policy "yönetici okur" on public.sightings
  for select to authenticated using (true);
create policy "yönetici günceller" on public.sightings
  for update to authenticated using (true) with check (true);
create policy "yönetici siler" on public.sightings
  for delete to authenticated using (true);
