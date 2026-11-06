-- Supabase SQL Editor'de BİR KEZ çalıştırın (schema.sql ve rate-limit.sql'den sonra). Tekrar çalıştırmak zararsızdır.
-- Kullanıcı fotoğrafı: kayıtla birlikte (küçültülmüş JPEG, base64 metin) saklanır.
-- Fotoğraf yalnızca kaydın kendisi okunabildiğinde (onaylıysa herkes, bekliyorsa yalnızca yönetici) görülebilir.

alter table public.sightings add column if not exists photo_data text;
alter table public.sightings add column if not exists photo_author text;
alter table public.sightings add column if not exists photo_consent boolean not null default false;

-- Fotoğraf varsa: izin onaylanmış, gerçekten JPEG (base64 '/9j/' ile başlar), yalnızca base64 karakterleri, en çok ~330 KB.
alter table public.sightings drop constraint if exists sightings_photo_ck;
alter table public.sightings add constraint sightings_photo_ck check (
  photo_data is null or (
    photo_consent = true
    and left(photo_data, 4) = '/9j/'
    and length(photo_data) <= 450000
    and photo_data !~ '[^A-Za-z0-9+/=]'
  )
);

alter table public.sightings drop constraint if exists sightings_photo_author_ck;
alter table public.sightings add constraint sightings_photo_author_ck check (
  photo_author is null or char_length(photo_author) <= 60
);
