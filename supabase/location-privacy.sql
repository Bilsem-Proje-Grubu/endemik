-- Supabase SQL Editor'de BİR KEZ çalıştırın (schema.sql'den sonra). Tekrar çalıştırmak zararsızdır.
-- Kullanıcı kayıtlarının konumu, kaydedilmeden önce yaklaşık 5 km'lik bir ızgaranın merkezine yuvarlanır
-- (0,05 derece ≈ 5,5 km enlemde, ≈ 4,2 km boylamda). Böylece nesli tehlike altındaki türlerin tam konumu
-- veritabanında hiç tutulmaz; kayıt API'den doğrudan gönderilse bile yuvarlanır.

create or replace function public.blur_sighting_location() returns trigger
language plpgsql as $fn$
begin
  new.lat := round((floor(new.lat / 0.05) * 0.05 + 0.025)::numeric, 3);
  new.lng := round((floor(new.lng / 0.05) * 0.05 + 0.025)::numeric, 3);
  return new;
end
$fn$;

drop trigger if exists blur_sighting_location on public.sightings;
create trigger blur_sighting_location
  before insert on public.sightings
  for each row execute function public.blur_sighting_location();
