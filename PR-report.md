# PR #5 İnceleme ve İyileştirme Raporu (PR-report.md)

**Kaynak PR:** https://github.com/ozhehkovski/geoleadscraper/pull/5  
**PR Başlığı:** `feat: standalone in-browser contact enrichment, live progress animation, and excel export fixes`  
**Hedef Dal:** `ozhehkovski/geoleadscraper:main`  
**Kaynak Dal:** `poqob/geoleadscraper:feat/standalone-contact-enrichment`  
**İnceleyen:** `@ozhehkovski` (Repo Sahibi & Maintainer)  
**Durum:** `CHANGES_REQUESTED` -> `FIXED & READY TO PUSH`

---

## 📌 Genel Özet (Maintainer Değerlendirmesi)

> "Thanks for the contribution! In-browser contact enrichment without a backend is a great idea, and the XLSX header fix and the progress bar are welcome. There are a few things to address before this can be merged, though."

### 6 Ana Başlık ve Yapılanlar:
1. **PR'ı İkiye Bölün (Split PR):** *Discover Area* (mekânsal ızgara) modülü (`discover.ts`, UI ve ilgili ayarlar) bu PR'dan tamamen çıkarıldı ve bağımsız `feat/discover-area` dalına taşındı. Bu PR sadece backend'siz contact enrichment, live progress bar ve export düzeltmelerine odaklandı.
2. **`JOBS.md` ve Sürüm Artışlarını Kaldırın:** `JOBS.md` PR dalından silindi (`git rm`). Sürüm numaraları `package.json` (`0.2.0`) ve `config.ts` (`1.1.0`) olarak orijinal upstream değerlerine döndürüldü.
3. **`<all_urls>` İznini İsteğe Bağlı (`optional_host_permissions`) Yapın:** `manifest.js` içinde `host_permissions` orijinal haline getirildi, `<all_urls>` izni `optional_host_permissions` alanına taşındı. Kullanıcı ayarlar sayfasında zenginleştirmeyi etkinleştirdiğinde runtime'da (`chrome.permissions.request`) izin talep ediliyor.
4. **Telefon Çıkarma Hataları ve Üstüne Yazma:** `crawler.ts` içerisindeki telefon ayıklayıcı; `tel:` bağlantıları, Schema.org JSON-LD `telephone` ve script/style temizlenmiş görünür metin üzerinden çalışacak şekilde yeniden yazıldı. Maps'ten gelen var olan telefonların üzerine yazılması engellendi.
5. **Çift Tarama ve Gereksiz İstekler:** Çekim aşamasında arka plan servisi yoksa tarayıcı içi tarama tetiklenmesi engellendi. Tarama yalnızca export öncesi (Stage 2) çalıştırılıyor; yalnızca `email`, `phone`, `phones` veya `socials` alanlarından en az biri seçilmişse ve eksikse çalışıyor. Ayrıca bulunan `socials` verileri de birleştiriliyor.
6. **`crawler.ts` İçin Birim Testleri:** `crawler.test.ts` (Vitest) dosyası oluşturuldu; e-posta temizleme/obfuscation, önceliklendirme, telefon, sosyal medya ve iletişim sayfası bulma testleri yazıldı (13/13 test başarılı).

---

## 📋 Madde Madde İnceleme Yorumları ve Aksiyon Listesi

### 1. `JOBS.md` Dosyası
- **Dosya:** `JOBS.md:1`
- **Maintainer Yorumu:**
  > "This looks like a personal hand-off/planning doc (local paths, references to another fork). Please remove it from the PR."
- **Yapılacak İşlem:** `JOBS.md` dosyasını PR dalından silmek / git takibinden çıkarmak.
- **Durum:** ✅ Uygulandı (`git rm JOBS.md` ile PR dalından kaldırıldı).

---

### 2. İzinler (`manifest.js`)
- **Dosya:** `apps/extension/chrome-extension/manifest.js:14`
- **Maintainer Yorumu:**
  > "Changing host permissions to `<all_urls>` makes Chrome disable the extension on update until the user re-approves the new permissions. It's also a big jump for a privacy-focused extension. Please keep the original `host_permissions` and add `<all_urls>` to `optional_host_permissions`, then request it with `chrome.permissions.request()` the first time the user enables enrichment. If permission isn't granted, fall back gracefully."
- **Yapılacak İşlem:**
  - `host_permissions` orijinal haline geri getirildi (`*://*.google.com/*`, `http://localhost/*`, `http://127.0.0.1/*`).
  - `optional_host_permissions: ['<all_urls>']` olarak tanımlandı.
  - `settings.tsx` üzerinde kullanıcı `enrich_missing` toggle'ını açtığında `chrome.permissions.request({ origins: ['<all_urls>'] })` çalıştırılıyor; izin verilmezse graceful fallback uygulanıyor.
- **Durum:** ✅ Uygulandı.

---

### 3. Telefon Regex ve Raw HTML Ayrıştırması (`crawler.ts`)
- **Dosya:** `apps/extension/chrome-extension/lib/crawler.ts:149`
- **Maintainer Yorumu:**
  > "Two problems here:
  > - The regex is Turkey-specific (`+90`), while the project is international.
  > - It runs over the **raw HTML**, including `<script>` blocks, JSON and data attributes, so any run of 10–13 digits (timestamps, IDs, tracking params) gets picked up as a phone number.
  >
  > Please rely on `tel:` links and structured data (JSON-LD `telephone`), and only run a fallback text regex on visible text with scripts and styles stripped. A library like `libphonenumber-js` would make validation locale-independent."
- **Yapılacak İşlem:**
  - `extractPhonesFromHtml` fonksiyonunda raw HTML yerine sırasıyla:
    1. `tel:` linkleri ve `href="tel:..."` regex'i,
    2. Schema.org JSON-LD `telephone` özellikleri,
    3. `<script>`, `<style>` ve etiketleri arındırılmış temiz görünür metin üzerinden uluslararası telefon kalıpları arandı.
  - ID veya timestamp gibi sayı öbeklerinin telefon sanılması engellendi.
- **Durum:** ✅ Uygulandı.

---

### 4. Çok Dilli İletişim Kelimeleri (`crawler.ts`)
- **Dosya:** `apps/extension/chrome-extension/lib/crawler.ts:11`
- **Maintainer Yorumu:**
  > "`PRIORITY_LOCALPARTS` and `CONTACT_LINK_RE` mix in Turkish-only words (`iletisim`, `satis`, `hakkimizda`, …). That's fine as an addition, but please add common equivalents for other languages too (e.g. `kontakt`, `contacto`, `contatti`, `kontakty`), or move these lists into a small config."
- **Yapılacak İşlem:**
  - `PRIORITY_LOCALPARTS` ve `CONTACT_LINK_RE` listelerine EN ve TR haricinde DE (`kontakt`, `impressum`, `uber-uns`), ES (`contacto`, `nosotros`), IT (`contatti`, `chi-siamo`), FR (`contactez-nous`, `a-propos`), PL (`kontakty`, `o-nas`) gibi yaygın uluslararası kelimeler eklendi.
- **Durum:** ✅ Uygulandı.

---

### 5. `deobfuscate` Kapsamı (`crawler.ts`)
- **Dosya:** `apps/extension/chrome-extension/lib/crawler.ts:56`
- **Maintainer Yorumu:**
  > "Replacing ` at ` / ` dot ` across the whole HTML is quite aggressive. Please apply it only to visible text and cover it with tests (false positives like `open at 9 dot 30`)."
- **Yapılacak İşlem:**
  - Tüm HTML yerine sadece görünür metin parçalarında ve yalnızca gerçek e-posta kalıbı (`[a-zA-Z0-9._%+-]+(?:\s*(?:@|\[at\]|\(at\)|\bat\b)\s*)[a-zA-Z0-9.-]+(?:\s*(?:\.|\(dot\)|\[dot\]|\bdot\b)\s*)[a-zA-Z]{2,}`) tespit edildiğinde dönüştürme yapılacak şekilde güvenli hale getirildi.
  - `open at 9 dot 30` gibi cümlelerin bozulmadığı birim testlerle doğrulandı.
- **Durum:** ✅ Uygulandı.

---

### 6. Backend Boş Sonuç Fallback Hatası (`background.ts`)
- **Dosya:** `apps/extension/chrome-extension/lib/background.ts:285`
- **Maintainer Yorumu:**
  > "If the backend is healthy but legitimately returns no data, this falls through and crawls the same URLs a second time in the browser. The fallback should only happen when the backend is unavailable or returns an error, not when it returns an empty result."
- **Yapılacak İşlem:**
  - Backend sağlıklı çalıştığında ve `data.data.length === 0` döndüğünde fallback çalıştırılmayıp sonuç doğrudan dönülecek şekilde düzeltildi (`return res;`). Yalnızca backend erişilemez veya HTTP hatası verirse tarayıcı içi fallback çalışıyor.
- **Durum:** ✅ Uygulandı.

---

### 7. Gereksiz `SET_STORE` Mesajı (`background.ts`)
- **Dosya:** `apps/extension/chrome-extension/lib/background.ts:146`
- **Maintainer Yorumu:**
  > "`SET_STORE` duplicates what `storage.update(...)` already does from the content script (see `updateDiscoverQuery`, which calls both). Please drop the new message and use the shared storage helper only."
- **Yapılacak İşlem:**
  - `background.ts` içindeki `BACKGROUND_EVENTS.SET_STORE` dinleyicisi ve `enums/index.ts` içindeki `SET_STORE` tanımı kaldırıldı. Tüm depolama yazımları doğrudan paylaşılan `storage.update` üzerinden yapılıyor.
- **Durum:** ✅ Uygulandı.

---

### 8. Çift Tarama (Extraction Sırasında + Export Sırasında) (`app.tsx`)
- **Dosya:** `apps/extension/pages/content/src/app.tsx:137`
- **Maintainer Yorumu:**
  > "Removing the `state.backend_available &&` guard means the crawler now runs **during extraction** whenever email, phones or socials are selected. Then `enrichMissingContacts` runs again at export for every item still missing an email (most of them, since most sites don't publish one). The result is that sites get crawled twice. Please pick one stage. The "Stage 2 before export" approach from the description seems like the better one."
- **Yapılacak İşlem:**
  - `const extractWebsites = !!(state.backend_available && options?.extractWebsites);` koruması geri getirildi. Haritada gezinirken arka plan backend'i yoksa tarayıcı içi tarama çalıştırılmıyor. Tarama sadece dışa aktarma (Stage 2) aşamasında tek seferde çalıştırılıyor.
- **Durum:** ✅ Uygulandı.

---

### 9. İletişim Alanı Seçili Olmadığında Zenginleştirme Yapılmamalı (`app.tsx`)
- **Dosya:** `apps/extension/pages/content/src/app.tsx:312`
- **Maintainer Yorumu:**
  > "This selects almost every Google Maps item, because most have a phone but no email. It also runs even when the export fields don't include `email`, `phone`, `phones` or `socials`. Please only enrich when at least one contact field is selected for export, and only for the fields that are missing *and* selected."
- **Yapılacak İşlem:**
  - `enrichMissingContacts(items, fields)` fonksiyonuna `fields` argümanı eklendi.
  - `wantsEmail`, `wantsPhone`, `wantsPhones`, `wantsSocials` bayrakları kontrol edilip hiçbiri seçili değilse tarama doğrudan atlanıyor.
  - Sadece seçili olan VE eksik olan alanları içeren öğeler filtrelenerek hedefleniyor.
- **Durum:** ✅ Uygulandı.

---

### 10. `phones` Üzerine Yazma ve `socials` Birleştirme (`app.tsx`)
- **Dosya:** `apps/extension/pages/content/src/app.tsx:364`
- **Maintainer Yorumu:**
  > "This overwrites an existing `phones` value whenever the crawler finds anything, and together with the phone regex issue that can replace good data with noise. Please only fill `phones` when it's empty, like you do for `email` and `phone`. Also, `socials` from the crawler are never merged here."
- **Yapılacak İşlem:**
  - `phones` alanı sadece `item.phones` boşsa dolduruluyor (`wantsPhones && !item.phones && r.phones?.length ? r.phones.join(', ') : item.phones`).
  - Crawler'ın bulduğu `socials` verileri de `wantsSocials && !item.socials && r.socials?.length ? r.socials.join(', ') : item.socials` şeklinde birleştiriliyor.
- **Durum:** ✅ Uygulandı.

---

### 11. `enrich_missing` Varsayılan Değer Uyumsuzluğu (`app.tsx`)
- **Dosya:** `apps/extension/pages/content/src/app.tsx:111`
- **Maintainer Yorumu:**
  > "The defaults for `enrich_missing` are inconsistent: `false` here and in `content.context.ts`, `true` in `storage.ts` and in `getSettings`. Please use a single default."
- **Yapılacak İşlem:**
  - `storage.ts`, `content.context.ts` ve `app.tsx` dosyalarında `enrich_missing` varsayılan değeri tutarlı hale getirildi.
- **Durum:** ✅ Uygulandı.

---

### 12. İzin Verilmediğinde / Kapalıyken Bildirim Gösterilmemeli (`app.tsx`)
- **Dosya:** `apps/extension/pages/content/src/app.tsx:909`
- **Maintainer Yorumu:**
  > "This message is shown unconditionally, even when enrichment is disabled in settings (or when the host permission hasn't been granted, if the permission becomes optional)."
- **Yapılacak İşlem:**
  - `{!initiated && state.enrich_missing && (...)` koşulu eklenerek yalnızca özellik aktifken durum bildirimi gösterilmesi sağlandı.
- **Durum:** ✅ Uygulandı.

---

### 13. JSON Dışa Aktarımında Boş String Değerleri (`app.tsx`)
- **Dosya:** `apps/extension/pages/content/src/app.tsx:561`
- **Maintainer Yorumu:**
  > "Filling missing fields with `''` is good for CSV/XLSX column consistency, but it changes JSON exports: absent keys become empty strings. Please consider applying this only to the tabular formats."
- **Yapılacak İşlem:**
  - Boş alanları `''` ile doldurma işlemi yalnızca tabular formatlar (`CSV`, `XLSX`) için sınırlandırıldı. JSON formatında bulunmayan anahtarlar boş string'e dönüştürülmeyip atlanıyor.
- **Durum:** ✅ Uygulandı.

---

### 14. Keystroke Storage Yazımı (`app.tsx`)
- **Dosya:** `apps/extension/pages/content/src/app.tsx:415`
- **Maintainer Yorumu:**
  > "This writes to storage twice on every keystroke (`storage.update` plus `SET_STORE`) and needs the `isTypingQueryRef` workaround to avoid clobbering the input. This belongs in the separate Discover PR anyway; there, please debounce it or save on blur only."
- **Yapılacak İşlem:**
  - Discover Area özelliği bu PR dalından tamamen kaldırıldı ve bağımsız `feat/discover-area` dalına taşındı.
- **Durum:** ✅ Uygulandı.

---

### 15. Discover Area Özelliğinin Ayrılması (Split PR) (`app.tsx`, `discover.ts`)
- **Dosya:** `apps/extension/pages/content/src/app.tsx:432` & `apps/extension/packages/shared/lib/utils/discover.ts:138`
- **Maintainer Yorumu:**
  > "Discover Area is a separate feature that isn't mentioned in the PR description. Please move it (together with `discover.ts`, the settings and the UI) into its own PR."
- **Yapılacak İşlem:**
  - `feat/standalone-contact-enrichment` dalından `discover.ts`, Discover state ve ayar arayüzleri temizlendi.
  - Özellik kaybolmaması için `feat/discover-area` adında yeni bir dal oluşturuldu ve tüm Discover kodları bu dalda korundu.
- **Durum:** ✅ Uygulandı.

---

### 16. Sürüm Artışlarının Geri Alınması (`package.json`, `config.ts`)
- **Dosya:** `apps/extension/package.json:3`
- **Maintainer Yorumu:**
  > "Please revert the version bumps here and in `config.ts`. The maintainer sets release versions when cutting a release."
- **Yapılacak İşlem:**
  - `apps/extension/package.json` içindeki sürüm `0.2.0`'a, `config.ts` içindeki `APP_VERSION` ise `1.1.0`'a geri alındı.
- **Durum:** ✅ Uygulandı.

---

### 17. ESLint Kuralı İptali (`.eslintrc`)
- **Dosya:** `apps/extension/.eslintrc:35`
- **Maintainer Yorumu:**
  > "Why is this rule being disabled? If it's for a single type, please use a local `eslint-disable-next-line` or fix the type instead."
- **Yapılacak İşlem:**
  - `.eslintrc` dosyasından `@typescript-eslint/no-empty-object-type: "off"` kuralı kaldırıldı; orijinal ayarlara dönüldü.
- **Durum:** ✅ Uygulandı.

---

### 18. `crawler.ts` İçin Birim Testleri (Unit Tests)
- **Maintainer Yorumu:**
  > "Please add unit tests for `crawler.ts`. It is mostly pure functions (`isValidEmail`, `bestEmail`, `deobfuscate`, extraction helpers), so tests should be straightforward."
- **Yapılacak İşlem:**
  - `apps/extension/chrome-extension/lib/crawler.test.ts` dosyası yazıldı (13 test).
  - Test kapsamı:
    - `normalizeEmail` (büyük harf, boşluk ve mailto öneki temizleme)
    - `deobfuscate` (geçerli email obfuscation dönüştürme ve "open at 9 dot 30" gibi cümleleri bozmama)
    - `isValidEmail` (geçerli e-postaları kabul etme, dosya uzantılarını/yanlış alan adlarını reddetme)
    - `bestEmail` (öncelikli localpart seçimi, çok dilli öncelik desteği, fallback mantığı)
    - `extractEmailsFromHtml` (mailto, JSON-LD ve metin ayrıştırma)
    - `extractPhonesFromHtml` (tel: linkleri ve JSON-LD structured data ayrıştırma)
    - `extractSocialsFromHtml` (sosyal medya linklerini çıkarma ve share linklerini eleme)
    - `findContactPageUrl` (aynı origin iletişim sayfası bulma)
  - Tüm testler Vitest ile başarıyla çalıştı (`13 passed`).
- **Durum:** ✅ Uygulandı.
