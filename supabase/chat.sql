-- Sohbet botu için kullanım kaydı (hız sınırı ve günlük tavan). Yalnızca sunucu fonksiyonu okur/yazar.
-- IP adresi saklanmaz; yalnızca tuzlanmış bir özet (hash) tutulur ve 1 günden eski kayıtlar silinir.
create table if not exists public.chat_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  sender text not null
);
create index if not exists chat_log_at_idx on public.chat_log (at);
alter table public.chat_log enable row level security;
-- Hiçbir politika tanımlanmaz: anonim kullanıcılar tabloya erişemez; sunucu fonksiyonu servis anahtarıyla erişir.
