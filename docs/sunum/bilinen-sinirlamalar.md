# Endemik – Bilinen Sınırlamalar ve Jüri Soru-Cevap

Durum: Firebase (FCM) bildirim testi henüz yapılmadı. Bu metin "henüz çözülmedi" sürümüdür.
Test yapılır ve başarılı olursa 1. madde ile 1. soru "çözdük" diye güncellenecek.

---

## Slayt: Bilinen Sınırlamalar

**1. Arka planda bildirim**
Honor, Huawei ve Xiaomi gibi markalar pil tasarrufu için arka plandaki uygulamaları donduruyor. Bu yüzden bu telefonlarda bölge bildirimi ancak uygulama açılınca geliyor. Bu, birçok büyük uygulamayı da etkileyen bilinen bir Android sorunu. Üç farklı yöntem denedik, sorunun nedenini bulduk. Çözüm planımız, bildirimleri sunucudan (Firebase) göndermek. Altyapı kuruldu, henüz test edilmedi.

**2. Konum gizliliği**
Hassas türlerin konumu 10 km'lik karelere genelleştiriliyor. Bunu türleri korumak için bilerek seçtik.

**3. Kullanıcı gözlemleri**
Kullanıcıların eklediği kayıtları henüz bir uzman kontrol etmiyor. Plan: kayıtları "doğrulanmış" ve "doğrulanmamış" diye ayırmak.

**4. Sohbet modeli**
Yapay zekâ bazen hata yapabilir. Kesin bilgi için tür sayfalarındaki kaynaklı bilgiler esas alınmalı.

> Not: 3. ve 4. maddelerin sitedeki gerçek duruma uyduğu ekip tarafından kontrol edilmeli.

---

## Jüri Soru-Cevap

**S1: Bildirim her telefonda çalışıyor mu?**
C: Çoğu Android telefonda çalışıyor. Honor, Huawei ve Xiaomi'de telefonun pil yöneticisi uygulamamızı donduruyor. Bu yüzden bildirim, uygulama açılınca geliyor. Üç farklı yöntem denedik ve sorunun bizim kodumuzdan değil, telefonun kendisinden kaynaklandığını belgeledik. Çözüm olarak bildirimleri sunucudan gönderen bir sistem (Firebase) kurduk. Bir sonraki adımımız bunu test etmek.

*Ek soru: "Sunucudan bildirim gizlilik sorunu yaratmaz mı?"*
C: Evet, bunun için sunucunun kullanıcının konumunu bilmesi gerekiyor. Bu yüzden önce kullanıcıdan açık izin alacağız ve yalnızca gereken bilgiyi göndereceğiz.

**S2: Hassas türlerin konumunu göstermek kaçakçılara yardım etmez mi?**
C: Bu yüzden hassas türlerin kesin konumunu göstermiyoruz. Konumu 10 km'lik karelere genelleştiriyoruz. Böylece türün bölgesi görünüyor ama tam yeri bulunamıyor.

**S3: Verileriniz nereden geliyor, güvenilir mi?**
C: Gözlem noktaları dünya çapındaki bilimsel veri tabanı GBIF'ten geliyor. Koruma durumları ulusal ve uluslararası listelere dayanıyor. Kullanıcıların eklediği gözlemleri ayrı tutuyoruz.
