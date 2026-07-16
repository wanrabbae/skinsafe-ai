# Components and State

## Component ownership

| Domain | Komponen | Tanggung jawab |
|---|---|---|
| Shared | `AppHeader`, `PageShell`, `DisclaimerBanner`, `ErrorState`, `EmptyState` | layout dan feedback konsisten |
| Profile | `SkinProfileIntake`, narrative form, A-D questionnaire, resolution panel | input profil, clarification, dan ranked recommendation |
| Scan | `ScanModeTabs`, `ImageDropzone`, `UploadPreview`, `ManualInputForm` | capture dan draft scan |
| Processing | `ProcessingStepper`, `StatusMessage` | status aktual dan recovery |
| Report | `ScoreGauge`, `SubScoreBar`, `BPOMPanel`, `ClaimFlags`, `IngredientGroups`, `CompatibilityPanel`, `ConflictAlert`, `RecommendationCard` | presentasi evidence dan hasil |

Komponen report menerima data siap tampil dan tidak menghitung business score. Mapper di server/API client mengubah contract menjadi view model jika format UI berbeda.

## State ownership

- URL: identity resource, filter shareable, dan active tab yang perlu dipertahankan.
- Server: profile, scan, status, report, ingredient records.
- Form local state: nilai belum disimpan dan validation feedback.
- Browser storage: hanya draft non-sensitif dan preferensi UI. Jangan simpan report lengkap atau foto di `localStorage`.
- Service worker cache: static shell dan offline fallback, bukan response privat API.

## Validation and errors

Validasi client mempercepat feedback; error server tetap authoritative. Tampilkan `fieldErrors` di dekat input dan `requestId` pada generic error agar dapat ditelusuri.

Error UI minimum:

- invalid file type/size;
- upload terputus dan retry;
- OCR memerlukan input manual;
- profile belum lengkap;
- scan tidak ditemukan atau bukan milik session;
- service AI tidak tersedia;
- koneksi offline.

## Score presentation

Band score memakai label dan ikon selain warna:

| Score | Label |
|---|---|
| 85–100 | Recommended / Low Risk |
| 70–84 | Generally OK |
| 50–69 | Use with Caution |
| 30–49 | High Caution |
| 0–29 | Avoid |

Confidence (`high`, `medium`, `low`) terpisah dari score. Produk berscore tinggi dengan confidence rendah tetap harus menampilkan limitation sebelum recommendation.
