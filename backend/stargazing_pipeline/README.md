# Pipeline: Dataset Real GaN-MN untuk Stargazing Score

Pipeline ini mengganti `synthetic_data_generator.py` dengan dataset REAL dari
observasi Sky Quality Meter (GaN-MN) + cuaca historis asli (Open-Meteo) +
astronomi eksak (ephem).

## Hasil Stage 1 (sudah dijalankan, bukti konsep)

- Input: file GaN-MN 2024 + 2025 (24 file CSV bulanan, 53 stasiun aktif)
- Setelah filter nsb tidak valid + agregasi per jam:
  **279.832 baris (stasiun, jam)**
- Dari 53 stasiun, **45 punya koordinat yang berhasil dipetakan** dari daftar
  resmi GaN-MN (globeatnight-network.org), 8 kode stasiun (`BAN`, `BAS`,
  `CEN`, `LUM`, `MON`, `MP2`, `SOL`, `XLS`) **tidak ditemukan** di daftar
  resmi — kemungkinan stasiun baru yang belum terdaftar di halaman tsb.
  Baris dari 8 stasiun ini dibuang dari training set.
- **231.160 baris siap dipakai** (stasiun dengan koordinat diketahui).

## Cara menjalankan

### Stage 1 — sudah dijalankan, hasilnya ada di `ganmn_hourly_aggregated.csv`
Kalau ingin ganti rentang tahun, edit `RAW_DIRS` di `stage1_aggregate_ganmn.py`
lalu jalankan ulang:
```bash
python stage1_aggregate_ganmn.py
```

### Stage 2 — HARUS dijalankan di komputer Anda sendiri (butuh internet)
Script ini tidak bisa saya jalankan di sandbox ini karena tidak ada akses
internet. Jalankan di VS Code lokal Anda:

```bash
pip install pandas requests ephem
python stage2_enrich_with_weather_astronomy.py
```

Script akan memanggil Open-Meteo Archive API **satu kali per stasiun**
(bukan per baris!) untuk menarik seluruh rentang tanggal sekaligus — jadi
total hanya ~45 API call, bukan 231.160 call. Prosesnya mungkin makan waktu
beberapa menit karena perhitungan astronomi (`ephem`) dilakukan per baris.

Hasil akhir: `stargazing_real_dataset.csv` dengan skema fitur yang SAMA
dengan model yang sudah ada (`model_metadata.json`), siap dipakai ganti
`SyntheticStargazingDataGenerator.generate_dataset()` di `train.py`.

## ⚠️ Yang masih perlu Anda lengkapi sebelum training ulang

1. **`bortle_scale` masih kosong** di `stargazing_real_dataset.csv`. Isi
   manual dari `light_pollution_service.py` yang sudah ada (cocokkan
   koordinat tiap stasiun dengan `KNOWN_SITES`, atau dataset VIIRS yang
   dibahas sebelumnya) sebelum dipakai training.
2. **8 stasiun tanpa koordinat** (`BAN`, `BAS`, dst.) — cari manual di
   situs GaN-MN kalau mau menyertakan datanya, atau biarkan terbuang (tidak
   masalah, masih tersisa 231rb+ baris dari 45 stasiun).
3. **Koordinat berlabel `confidence: low`** di `station_coordinates.csv`
   (7 stasiun: Dal, ELO, Heh, Jub, LASO, Nrnr, SR, Tura, UO) adalah estimasi
   kasar dari nama lokasi, bukan koordinat presisi — cek ulang kalau
   dipakai untuk kesimpulan yang sangat bergantung pada stasiun tsb.
4. **Formula konversi NSB → skor 0-100** (`nsb_to_score` di Stage 2) pakai
   mapping linear sederhana (17→0, 22→100). Ini keputusan desain Anda
   sendiri — boleh disesuaikan, tapi harus dijelaskan alasannya di laporan.

## File di folder ini

| File | Isi |
|---|---|
| `stage1_aggregate_ganmn.py` | Parsing + filter + agregasi per jam (sudah dijalankan) |
| `ganmn_hourly_aggregated.csv` | Hasil nyata Stage 1 (279.832 baris) |
| `station_coordinates.csv` | Lookup 53 device_code → lat/lon (45 diketahui, 8 unknown) |
| `stage2_enrich_with_weather_astronomy.py` | Join cuaca+astronomi (jalankan di lokal) |

---

## UPDATE — Hasil Final (sudah divalidasi penuh)

Stage 2 berhasil sempurna: **231.160 baris dari semua 45 stasiun** (tidak ada
yang gagal). File `stargazing_real_dataset.csv` yang Anda hasilkan sudah
benar.

### Langkah selanjutnya (urutan jalan)

1. `python fill_bortle_scale.py`
   Mengisi `bortle_scale` per stasiun berdasarkan **pembacaan SQM stasiun itu
   sendiri** (ambil persentil-90 dari `nsb_mean`, dipetakan ke kelas Bortle
   pakai tabel korespondensi SQM-Bortle standar) — bukan tebakan dari nama
   lokasi, tapi dari data real yang sudah Anda kumpulkan sendiri.
   Hasil: `stargazing_real_dataset_bortled.csv` (sudah disertakan di zip ini,
   siap pakai, tidak perlu dijalankan ulang kecuali mau audit).

   Sebaran Bortle yang dihasilkan (masuk akal secara geografis):
   - Bortle 1 (langit sangat gelap): Namib Desert, Merimbula NSW — 2 stasiun
   - Bortle 4 (rural): 16 stasiun (taman nasional, pedesaan)
   - Bortle 5-7 (suburban): 13 stasiun
   - Bortle 8-9 (urban/kota besar): 14 stasiun (Hong Kong, Seoul, Arlington, Belgrade, dll)

2. `pip install xgboost pandas scikit-learn`
   `python train_real.py`
   Melatih ulang XGBoost dengan dataset real. **Hasil sanity-check yang
   sudah saya validasi** (pakai RandomForest sebagai preview cepat, bukan
   model final):

   | Metrik | Versi Sintetis (lama) | Versi Real (baru) |
   |---|---|---|
   | R² | 0.976 | **~0.70** |
   | MAE | 3.224 | **~11.5** |
   | RMSE | 4.445 | **~17.3** |

   **Penting untuk dijelaskan di presentasi:** R² yang turun dari 0,976 ke
   ~0,70 BUKAN kemunduran — itu justru tanda model sekarang jujur belajar
   dari noise dan variasi dunia nyata, bukan menghafal rumus buatan sendiri
   yang dipakai untuk membangkitkan data sintetis. R² 0,976 pada data
   sintetis itu yang sebenarnya patut dicurigai validitasnya.

   Feature importance dari sanity-check (masuk akal secara astronomi):
   `bortle_scale` (60%) jauh paling dominan, lalu `moon_altitude` (21%),
   `moon_illumination` (10%), sisanya (Milky Way altitude, cloud cover,
   dew point, humidity) masing-masing kontribusi kecil.

3. Angka final dari `train_real.py` (`model_metadata_real.json`) itulah yang
   dipakai mengisi ulang Slide 6 presentasi Anda — menggantikan versi
   sintetis.

## File tambahan di folder ini

| File | Isi |
|---|---|
| `fill_bortle_scale.py` | Isi bortle_scale dari data SQM stasiun sendiri |
| `stargazing_real_dataset.csv` | Output Stage 2 Anda (231.160 baris, 45 stasiun) — *tidak disertakan di zip karena besar, pakai hasil run Anda sendiri* |
| `stargazing_real_dataset_bortled.csv` | Dataset final siap training (sudah ada bortle_scale) |
| `train_real.py` | Pengganti train.py, baca dataset real |

---

## UPDATE 2 — Perbandingan 4 Model (sudah dijalankan, real)

Dijalankan dengan split train/val/test yang SAMA (random_state=42,
80/10/10) untuk ketiga model berikut, supaya perbandingan adil:

| Model | MAE | RMSE | R² |
|---|---|---|---|
| Linear Regression | 16.312 | 21.762 | 0.5169 |
| Ridge Regression | 16.312 | 21.762 | 0.5169 |
| Random Forest | 10.861 | 16.503 | **0.7222** |
| XGBoost | *jalankan `python compare_models.py` di lokal Anda* | | |

### Analisis singkat untuk slide presentasi

- **Linear/Ridge Regression** performanya jauh di bawah dua lainnya (R²~0,52)
  — menunjukkan hubungan antar fitur (terutama `bortle_scale`,
  `moon_altitude`, `moon_illumination` terhadap skor) bersifat **non-linear**,
  sesuatu yang tidak bisa ditangkap model linear sederhana.
- **Ridge Regression identik dengan Linear Regression** di sini karena nilai
  regularisasi (alpha=1.0) terlalu kecil untuk berpengaruh pada skala data
  ini — bisa disebutkan sebagai temuan jujur, bukan masalah.
- **Random Forest jauh lebih baik** (R² 0,72) dibanding model linear,
  mengonfirmasi dugaan di atas: pohon keputusan mampu menangkap interaksi
  non-linear antar fitur cuaca-astronomi-polusi cahaya.
- **XGBoost** diperkirakan sedikit mengungguli Random Forest (boosting
  biasanya unggul tipis dibanding bagging pada data tabular seperti ini) —
  jalankan `compare_models.py` di lokal untuk angka pastinya, lalu isi baris
  terakhir tabel di atas.

Jalankan: `pip install pandas scikit-learn xgboost` lalu `python compare_models.py`

---

## UPDATE 3 — Rentang Diperlebar ke 2014-2026 (FULL)

Atas permintaan, seluruh 13 tahun data GaN-MN (2014-2026) sudah diproses,
bukan cuma subset 2024-2025.

### Hasil Stage 1 yang baru

- **1.208.118 baris (stasiun, jam)** total, dari **105 stasiun unik**
  sepanjang 2014-11-04 s.d. 2026-05-31.
- Dari 105 stasiun: **51 berhasil dipetakan koordinatnya** (45 dari batch
  2024-2025 sebelumnya + 6 stasiun lama yang baru teridentifikasi: `NAOJ`,
  `TAM`, `NTHU`, `SAAO`, `DAO`, `NUM`).
- **46 stasiun TIDAK bisa saya petakan dengan jujur** — kode-kode seperti
  `AGR`, `CGAO`, `KHG`, `MSP`, dll tidak saya kenali dari pengetahuan umum
  astronomi, dan saya tidak mau menebak koordinatnya asal-asalan (risiko
  mencemari dataset dengan lokasi yang salah). Baris dari 46 stasiun ini
  dibuang dari training set.
- **Hasil akhir: 830.453 baris usable** (68,7% dari total) — naik hampir
  **4x lipat** dari 231.160 baris sebelumnya.

### ⚠️ Kalau Anda punya waktu, ini bisa ditingkatkan lagi

46 stasiun tak dikenal itu kemungkinan ada di daftar resmi GaN-MN
(globeatnight-network.org) yang scope pencariannya kemarin tidak menjangkau
semua entri, atau mereka stasiun yang lebih baru/jarang dipakai. Kalau Anda
cek manual satu-satu ke situs resminya dan isi koordinatnya di
`station_coordinates.csv` (ubah `confidence` dari `unmapped` ke `high`/
`medium`/`low` dan isi `latitude`/`longitude`), baris yang usable bisa
bertambah signifikan dari 830rb jadi mendekati 1,2 juta.

### Langkah selanjutnya (SAMA seperti sebelumnya, tinggal data sumbernya saja yang diganti)

1. `python stage2_enrich_with_weather_astronomy.py` — HARUS dijalankan
   ulang karena `ganmn_hourly_aggregated.csv` sekarang isinya rentang penuh
   2014-2026, bukan cuma 2024-2025. **Peringatan: ini akan makan waktu
   jauh lebih lama** (51 stasiun x bertahun-tahun data vs 45 stasiun x 2
   tahun sebelumnya) — bisa 2-4x lebih lama dari run pertama Anda.
2. `python fill_bortle_scale.py`
3. `python train_real.py` dan `python compare_models.py` — jalankan ulang
   untuk dapat angka final dengan dataset yang jauh lebih besar ini.

Angka MAE/RMSE/R² yang saya laporkan sebelumnya (R² Random Forest 0,72,
dll) itu berdasarkan dataset LAMA (2024-2025 saja, 231rb baris) — **akan
berubah** setelah Anda retrain dengan 830rb baris yang baru ini. Biasanya
dataset lebih besar menghasilkan model lebih stabil, tapi angka pastinya
baru bisa dipastikan setelah dijalankan ulang.
