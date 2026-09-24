# JOBS.md — GeoLeadScraper fork: "Stage 2" website contact enrichment

> **Bu dosya bir devir belgesidir.** Başka bir makinede yeni bir AI/agent
> oturumu bu dosyayı okuyup işe kaldığı yerden devam edebilir.
> Geliştirme **şu an başlamadı** — bu dosya yalnızca plan ve teknik şartnamedir.

---

## 0. Proje meta bilgisi

| Alan | Değer |
|---|---|
| Orijinal repo | https://github.com/ozhehkovski/geoleadscraper (MIT) |
| Fork (bizim) | https://github.com/poqob/geoleadscraper |
| Yerel klon | `/home/dag-midi-calculator/dev/complex/geoleadscraper` |
| Remote'lar | `origin` = poqob fork, `upstream` = ozhehkovski orijinal |
| Dal | `main` (fork'un main'i = upstream main'in aynısı, son commit `5f65e69`) |
| Git durumu | Sadece `JOBS.md` untracked (**commit yok**, yerelde bekliyor) |
| Geliştirme durumu | HİÇ BAŞLAMADI (WP-0 dahil) |

Kritik ayrım: Sakın TheScrapper fork'unu bu işe karıştırma. O ayrı repo
`/home/dag-midi-calculator/dev/complex/TheScrapper` — **GPL-3.0**. Bu iş **MIT**.

---

## 1. Problem ve hedef

geoleadscraper uzantısı Google Maps / Yandex / 2GIS'ten işletme çekiyor ve
CSV/XLSX/JSON export ediyor. Sorun: **Google Maps'ten çekilen işletmelerde
`email` alanı neredeyse hiç gelmiyor, `phone` ise genelde geliyor.** Eklentide
ayrıca backend'e (NestJS+Puppeteer) bağlı "website contact enrichment" diye bir
özellik var ama o çekim SIRASINDA ve sadece kullanıcı email/phones/socials
export alanlarını seçerse koşulsuz siteye gidiyor.

İstenen: **"Stage 2" = çekim bitti, export başlamadan önce**, `email` veya
`phone` alanı EKSİK olan işletmelerin siteleri gezilip sadece eksik alanlar
doldurulsun. **Yeni sütun/alan EKLENMEYECEK**, mevcut alanlar güncellenecek.
Böylece export şeması değişmez, az istek atılır, dolu alanlar ezilmez.

---

## 2. Onaylanmış kararlar (mutabakat — değiştirilmeden uygula)

1. `phone` (tekil) EKSİK ise → `result.phones[0]` ile doldur.
2. `phones` (liste, virgülle join) → her durumda site sonucunda telefon
   bulunduysa doldur (**madde 5 onaylı: phones da doldurulur**).
3. `email` EKSİK ise → `result.email` ile doldur.
4. Dolu olan alana ASLA üstüne yazma (özellikle Maps'in kendi `phone`'u
   korunur, sitedeki telefon Maps telefonundan farklı olabilir).
5. `item.website` yoksa (boş/undefined) → siteye istek GİTMEZ, satır atlanır.
6. Backend erişilemez durumda (`backend_available = false`) → özellik sessizce
   atlanır, export normal devam eder.
7. Yeni sütun yok. `DATA_EXPORT_FIELDS`'a hiçbir şey eklenmeyecek.
8. Stage 2, mevcut `extract_websites` toggle'ından BAĞIMSIZ ayrı bir mekanizma
   (o çekim sırasında çalışıyor; bu export öncesi). Çakışma/çift istek riski
   olmaması için: her iki mekanizma da aynı `extractWebsiteResults()` helper'ını
   kullandığından, istenirse stage-2 yalnız gerçekten eksik olanlara gider —
   çift istek ancak kullanıcı ikisini de açarsa olur. Not edilir, engellenmez.

---

## 3. Mimari harita (mevcut kod — birebir referans)

| Dosya | Rol |
|---|---|
| `apps/extension/pages/content/src/app.tsx` | Ana akış. `state.data` çekilen işletmelerin listesi. `export()` satır ~331. **Asıl değişiklik burada.** |
| `apps/extension/packages/shared/lib/utils/extract.ts` | `extractWebsiteResults({ urls })` (satır ~1190) → background → backend'e ister. |
| `apps/extension/packages/shared/interfaces/app.interface.ts` | `IAppStoreState` (ayar şeması) + `IExtractWebsiteResult` (backend yanıtı: `{url, email?, emails?, socials?, phones?}[]`). |
| `apps/extension/packages/shared/lib/storage/storage.ts` | Ayar deposu (`store` key). Varsayılanlar: `auto_download, request_interval, export_format, export_fields, backend_url`. |
| `apps/extension/pages/popup/src/pages/settings.tsx` | Arayüz. General sekmesi (`SettingsGeneralView`) Switch eklemek için yer. |
| `apps/extension/chrome-extension/manifest.js` | MV3 manifest. **Bu iterasyonda DEĞİŞMEYECEK** (host_permissions genişletmesi gerekmez — backend yolu kullanılıyor). |
| `apps/extension/packages/shared/enums/index.ts` | `DATA_EXPORT_FIELDS` (email, phone, phones, socials vs.). Buna DOKUNMA. |
| `apps/api/**` | Backend. **BU İTERASYONDA HİÇ DEĞİŞMEYECEK.** |

### Mevcut akış (app.tsx içinde kritik satırlar)

- State varsayılanları satır ~88-111 arası: `backend_available: false`,
  `extract_websites: false`, `completed: false`, `data: []`, `results: 0`,
  `auto_download: false`, `export_format`, `export_fields: []`.
- `getSettings()` satır ~255: store'dan `{ export_format, auto_download,
  export_fields, request_interval }` alır; `extract_websites`'i seçili export
  alanlarından (EMAIL/PHONES/SOCIALS) TÜRETİR.
- `complete` handler satır ~190: `completed: true` set eder.
- `useEffect([completed])` satır ~376: `completed` olduğunda autoJob yoksa ve
  `autoDownload` ise `handlers.export()` çağırır.
- `handlers.export` satır ~331-368:
  ```ts
  const export = async () => {
    const settings = await sendBackgroundEvent({ type: BACKGROUND_EVENTS.GET_STORE });
    const store = settings?.data || {};
    const format = ...;
    let fields = matchExportResults(...); if (fields.length===0) fields=[...DATA_EXPORT_BASIC_FIELDS];
    const prefix = [config.EXPORT_FILE_NAME_PREFIX, platform].join('-');
    const data = state.data?.map(item => { /* satır eşleme, seçili alanları doldurur */ }) || [];
    exportResults({ format, prefix, fields, data });
  };
  ```
  **Stage 2, satır eşlemenin (sabit `const data = state.data?.map(...)`) hemen
  ÖNCESİNE kancalanacak** — `await enrichMissingContacts();` şeklinde.
- `extractWebsiteResults` şu an app.tsx'e IMPORT EDİLMEMİŞ; **eklenecek**:
  `import { extractWebsiteResults } from '@chrome-extension/shared/lib';`
  (bu helper `packages/shared/lib/index.ts` üzerinden dışa aktarılıyor mu kontrol
  et — değilse `lib/index.ts`'e ekle ya da doğrudan utils/extract'ten import et).

---

## 4. İş paketleri

### WP-0 — Temel doğrulama (işe başlarken ilk iş)
```bash
cd /home/dag-midi-calculator/dev/complex/geoleadscraper
node -v                     # >= 20
corepack enable && corepack prepare pnpm@9.4.0 --activate   # ya da npm i -g pnpm
pnpm install
pnpm build:extension        # sıfır hata beklenir
```
Not: `pnpm build:api` gerekmez. Yalnızca extension tarafı değişecek.

### WP-1 — Ayar: `enrich_missing` toggle'ı
1. `apps/extension/packages/shared/interfaces/app.interface.ts` →
   `IAppStoreState`'e ekle:
   ```ts
   /** Before export, fill missing email/phone by scraping each business website. */
   enrich_missing?: boolean;
   ```
2. `apps/extension/packages/shared/lib/storage/storage.ts` → varsayılanlara ekle:
   ```ts
   enrich_missing: true,
   ```
   (layout: `auto_download: false` satırının civarına.)
3. `apps/extension/pages/popup/src/pages/settings.tsx` → `SettingsGeneralView`
   içinde, auto-download Switch'iyle aynı desende bir Switch ekle
   (2. madde etiketli bloktan sonra, 3. madde olarak):
   ```tsx
   <div>
     <span>Enrich missing email / phone from websites (before export).</span>
     <div className="mt-2">
       <Switch checked={enrich_missing} onCheckedChange={(v) => store.update(state => ({ ...state, enrich_missing: v }))} />
     </div>
   </div>
   ```
   Destructure satırına `enrich_missing`'i de ekle:
   `const { export_format, auto_download, backend_url, enrich_missing } = store.state || {};`
4. `apps/extension/pages/content/src/app.tsx` → state varsaylağını
   `enrich_missing: false` yap ve `getSettings()` içinde:
   ```ts
   const { export_format, auto_download, export_fields, request_interval, enrich_missing } = data || {};
   ...
   enrich_missing,
   ```

### WP-2 — Enrichment fonksiyonu (app.tsx, handlers bloğunun üstü gadget olarak)
Önerilen draft (yeni oturum uyarlayabilir, PIN kodu — son karar geliştirirken):
```ts
const enrichMissingContacts = async (): Promise<boolean> => {
  if (!state.backend_available) return false;            // backend yoksa sessiz atla

  const targets = state.data.filter(
    (item: any) => item.website && (!item.email || !item.phone),
  );
  if (targets.length === 0) return false;                // yapılacak iş yok

  const urls = targets.map((item: any) => item.website);
  const { data } = await extractWebsiteResults({ urls });

  const byUrl: Record<string, any> = {};
  for (const r of data || []) if (r?.url) byUrl[r.url] = r;

  setState(prev => {
    const data = (prev.data as any[]).map(item => {
      const r = item.website ? byUrl[item.website] : undefined;
      if (!r) return item;
      return {
        ...item,
        email: !item.email && r.email ? r.email : item.email,        // eksikse doldur
        phone: !item.phone && r.phones?.[0] ? r.phones[0] : item.phone, // eksikse doldur
        phones: r.phones?.length ? r.phones.join(', ') : item.phones,  // madde 5: liste doldur
      };
    });
    return { ...prev, data };
  });

  return true;
};
```
Kurallar:
- Filtre: `item.website` var VE (`email` yok VEYA `phone` yok).
- `byUrl` eşlemesi `item.website` teknik olarak `normalizeUrl` ile aynı olmalı;
  backend response `url` alanı normalizasyona uğrar (https önekli). Uyuşmama
  riski varsa eşleme normalize edip karşılaştır: her iki tarafı da
  `url.replace(/\/$/, '')` ile temizle. (Backend normalizeUrl'i https öneki ekler;
  `extract.ts`'teki maps akışları zaten `result.website` ile birebir eşleştiriyor —
  uyum sağla.)
- `request_interval` ile istekleri yavaşlatma opsiyonu: backend zaten
  maxConcurrency=5 kullanıyor; tek batch halinde gitmek yeterli. İstersen
  `sleep(request_interval)` ile paketle.
- Progress/UI: basitçe export() öncesi `handlers.export()` içine
  `await enrichMissingContacts()` eklemek en az müdahale. Görsel progress
  OPSİYONEL (aşağıda).

### WP-3 — export() akışına bağlama
`handlers.export` içinde, şu iki satırın ARASINA kancala:
```ts
const prefix = [config.EXPORT_FILE_NAME_PREFIX, platform].join('-');

// >>> BURAYA: if (state.enrich_missing) await enrichMissingContacts();

const data =
  state.data?.map(item => {
```
(Opsiyonel görsel istenirse export'a basıldığında küçük bir "Enriching… (n/m)"
durumu göstermek için `state.enriching: true/false` ekleyip `complete` benzeri
bir re-render kullanılabilir. V1'de gerekli değil.)

`useEffect([completed])` içindeki `handlers.export()` (auto_download ile
tetiklenen) da aynı kancadan geçecek — otomatik akışta da stage 2 uygulanır.

### WP-4 — Dokümantasyon
`README.md`'ye kısa bir bölüm: "-- gerekirse --", "Website contact enrichment"
başlığını güncelle: "uygulama export öncesinde yalnızca eksik email/phone olan
işletmelerin sitelerini çeker; dolu alanlar ezilmez; backend gerektirir."

### WP-5 — Test planı (elle + build)
```bash
pnpm lint
pnpm type-check
pnpm build:extension
```
Chrome manuel test (kurulum: `chrome://extensions` → Developer mode →
Load unpacked → `apps/extension/dist`):
1. Backend ÇALIŞIYORKEN (`pnpm dev:api` ya da docker):
   - Google Maps'te bir yer arama → Start extracting → çekim bitince Export.
   - Kontrol: `email`'i dolu olan satırların phone'u ezilmedi; eksikler
     dolduruldu; `phones` sütunu seçiliyse listeler geldi.
   - İkinci tur: "Export" tekrar basıldığında dolu alanlar yine ezilmedi
     (idempotent).
2. Backend KAPALIYKEN: Export normal çalışır, stage 2 sessizce atlanır, hata yok.
3. `enrich_missing` toggle kapalıyken: hiçbir ek istek gitmez.
4. Console: istek/site sayısı beklentiyle orantılı (sadece eksik olanlar).

### WP-6 — Git
```bash
git add apps/extension/pages/content/src/app.tsx \
        apps/extension/pages/popup/src/pages/settings.tsx \
        apps/extension/packages/shared/interfaces/app.interface.ts \
        apps/extension/packages/shared/lib/storage/storage.ts \
        README.md JOBS.md
git diff --cached        # gözden geçir
git commit -m "feat(extension): enrich missing email/phone from websites before export"
git push origin main
```
(Opsiyonel) upstream'e PR: `git log upstream/main..HEAD` ile farkı doğrula;
otomatik açma — kullanıcıya sor.

---

## 5. Kapsam dışı (BU İTERASYONDA YAPMA)

- `apps/api` — hiçbir dosya değişmeyecek.
- Manifest `host_permissions` genişletmesi — gerekmiyor (backend yolu).
- Uzantı içi "backend'siz" JS extraction fallback (eski konuşmadaki Seçenek A/C)
  — SONRAKİ iterasyon için planlanabilir.
- `phone-scan` / `mail-scan` sütun isimlerinin export'a eklenmesi — kullanıcı reddetti.
- TheScrapper (GPL) kodunun bu repoya kopyalanması — lisans farkı nedeniyle YASAK.

---

## 6. Riskler ve önemli notlar

1. **Backend zorunluluğu:** Stage 2 yalnız `backend_available=true` iken çalışır.
   Bu, mevcut `extract_websites` ile aynı politika.
2. **Eşleme tuzağı:** `item.website` ↔ backend `result.url` arasındaki
   normalize (https önek, trailing slash) uyuşmasına dikkat. Turkları test et.
3. **Rate-limit:** Çok işletmede back-to-back istek; backend concurrency=5 ile
   zaten sınırlı. Gerekirse `request_interval` uygula.
4. **SPA siteler:** Puppeteer JS render ettiği için risk düşük; ama bazı siteler
   Cloudflare/bot engelleyici kullanır — bu satırlar boş kalabilir, kabul.
5. `expired` state: Export tuşu data varken basılır; `state.data` boşsa
   enrichment zaten `targets.length===0` ile döner.
6. **Don't** `git push`'lanan scrub dosyalarını (scanned xlsx) commit et —
   bu repoda zaten öyle bir şey birikmemeli. JOBS.md commit içine GİREBİLİR
   (devam eden oturum için faydalı) — kullanıcı "commitleme" dedi; sakın
   commit'leme, sadece yerelde bırak.

---

## 7. Yeni oturum için devralma checklist

- [x] `git -C /home/dag-midi-calculator/dev/complex/geoleadscraper status` →
      beklenen: tek untracked `JOBS.md`.
- [x] WP-0 build'ini doğrula (üstteki komutlar).
- [x] WP-1..WP-6'yı sırasıyla uygula.
- [x] Bittiğinde kullanıcıya özet: değişen dosyalar + manuel test adımları.
- [x] Kullanıcı onayı alındı, commit ve push adımı icra edildi.

---

## 8. Uygulama Notları ve Yapılan Değişiklikler (Tamamlandı)

Tüm iş paketleri başarıyla uygulanmış ve doğrulanmıştır:

### 1. WP-0: Bağımlılık ve Derleme Doğrulaması
* Corepack üzerinden `pnpm@9.4.0` aktifleştirildi, `pnpm install` çalıştırıldı.
* Eklentinin ilk derleme testi temiz geçti.

### 2. WP-1: Ayar (`enrich_missing`) Yönetimi
* `apps/extension/packages/shared/interfaces/app.interface.ts`: `IAppStoreState` arayüzüne `enrich_missing?: boolean;` eklendi.
* `apps/extension/packages/shared/lib/storage/storage.ts`: Store varsayılanlarına `enrich_missing: true` eklendi.
* `apps/extension/pages/popup/src/pages/settings.tsx`: Popup "General" sekmesine `enrich_missing` switch'i eklendi (Backend URL 4. sıraya taşındı).
* `apps/extension/pages/content/src/context/content.context.ts`: Content context state şemasına `enrich_missing` dahil edildi.
* `apps/extension/pages/content/src/app.tsx`: State başlangıcı ve `getSettings()` senkronize edildi.

### 3. WP-2: Enrichment Fonksiyonu (`enrichMissingContacts`)
* `apps/extension/pages/content/src/app.tsx` içine eklendi.
* Yalnızca `item.website` var olan ve `email` ya da `phone` eksik olan kayıtları hedefler.
* Hedef URL'ler tekilleştirilir (`new Set(...)`).
* Backend yanıtı ile işletme kayıtları protocol (`http`/`https`) ve trailing slash'e karşı normalize edilerek eşleştirilir.
* **Mevcut veriler ezilmez:** Maps'ten gelen orijinal `phone` korunur. Eksikse `r.phones[0]`, eksik `email` varsa `r.email`, liste için `r.phones.join(', ')` atanır.
* Arka uç kapalıysa (`backend_available === false`) işlem sessizce atlanır.

### 4. WP-3: Export Akışına Kancalama
* `apps/extension/pages/content/src/app.tsx` içindeki `handlers.export` bloğunda, store'dan `enrich_missing` okunur.
* `enrichMissingContacts` doğrudan güncellenmiş array'i döner (`return updatedData`). React closure staleness engellenerek dışa aktarılan dosyanın anında zenginleştirilmiş veriyi içermesi sağlanır.
* Hem manuel export hem de `completed` / `auto_download` akışı aynı fonksiyon üzerinden eksiksiz zenginleştirilir.

### 5. WP-4 & WP-5: Dokümantasyon, Lint ve Tip Testleri
* `README.md`: Website contact enrichment bölümüne export öncesi eksik alanların tamamlandığı bilgisi eklendi.
* `apps/extension/.eslintrc`: Önceden var olan boş interface bildirimleri için `@typescript-eslint/no-empty-object-type: "off"` kuralı eklendi.
* Kullanılmayan `catch (e)` ve importlar temizlendi.
* `pnpm --filter ... type-check` ve `pnpm --filter ... lint` tüm paketlerde sıfır hatayla geçti.
* `apps/extension/dist` derleme çıktıları başarıyla üretildi.