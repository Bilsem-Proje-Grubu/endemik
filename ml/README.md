# Endemik sohbet modeli (sıfırdan eğitim)

Sohbet botunun cümlelerini yazan küçük dil modeli (yaklaşık 1,1 milyon parametre) bu klasörde sıfırdan yazılıp eğitilir. Hazır model kullanılmaz.

## Nasıl çalışır?
1. `src/chatmodel.js` + `scripts/train-chat.mjs`: soru neyle ilgili? (nerede yaşar, neye benzer…) ve hangi tür/yer geçiyor? Küçük bir sınıflandırıcı bunu bulur.
2. Bulunan tür kaydından ilgili bilgi parçası seçilir (`<bilgi> … <soru> … <cevap>` biçiminde).
3. Küçük transformer (`model.py`) bilgi parçasını okuyup cevabı yazar. Bilgiyi ezberlemez, **okuyup aktarır**.
4. Tarayıcıda (`src/lm.js`) cevap iki kontrolden geçer: (a) her sözcük şablondan ya da bilgiden gelmeli, (b) bilginin kendisi cevapta eksiksiz geçmeli. Küçük harf bozulmaları bilgideki en yakın sözcükle onarılır. Kontrol geçmezse hazır kalıp cevap gösterilir.

## Yeniden eğitmek
```
pip install torch numpy
python3 ml/build_data.py          # FINAL=1 ile 94 türün hepsiyle; FINAL olmadan 8 tür sınama için ayrılır
FINAL=1 EPOCHS=14 python3 ml/train.py
python3 ml/export.py              # public/model/lm.bin + lm.json
N=200 python3 ml/evaluate.py      # ayrılan türler üzerinde ölçüm
```

## Önemli ders
Yalnızca 94 türün gerçek metniyle eğitilince model metinleri ezberledi, görmediği türlerde kopyalayamadı (sınama kaybı 2,0). Bilgi alanlarına karışık sözcüklerden oluşan uydurma metinler koyunca kopyalamayı öğrendi (sınama kaybı 0,13). Yeni veri (başka konular) eklenirse aynı yöntem uygulanmalıdır: `build_data.py` içindeki `synthetic_species` ve `synthetic_lists`.

## Vikipedi parçaları (ek bilgi)
`ml/fetch_wiki.py` Hugging Face'teki `kaan39/turkish-wikipedia-dataset-clean` (CC BY-SA 4.0, Vikipedi maddeleri) akışından doğa konulu maddeleri süzer (tür maddeleri ve birkaç kavram maddesi). `ml/make_wiki_json.py` bunları `src/data/wiki.json` dosyasına çevirir (yaklaşık 210 madde; her birinin yalnızca giriş cümleleri ve kaynak bağlantısı). Soruda madde adı geçerse (`src/chatlogic.js` → `findWiki`) o parça modele verilir; modelin cevabı kaynak bağlantısıyla gösterilir. Ek eğitim için: `FT=1 INIT=<önceki.pt> EPOCHS=4 LR=6e-4 FINAL=1 python3 ml/train.py`.
