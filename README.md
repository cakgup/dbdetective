# Belajar Oracle AVDF — DB Detective

Panduan interaktif **12 skenario, 156 langkah, 192 aktivitas** berdasarkan `basis_data/DB Security/avdf_handson`.
Halaman **Belajar** menjadi titik awal; katalog 394 potongan Day 1–5 tersedia sebagai referensi lama.

## Jalankan

Butuh Node.js 20 atau lebih baru. Tidak perlu memasang paket npm.

```powershell
npm start
```

Buka http://127.0.0.1:4173. Login `admin` / `oracle` atau `auditor` / `oracle`.
Gunakan HTTP atau GitHub Pages; membuka `index.html` langsung lewat `file://` tidak didukung karena aplikasi memuat JSON.

## Cara belajar

1. Buka **TRAINING → Belajar**, pilih **01**, lalu **Mulai / Ulangi dari awal**.
2. Baca tujuan, target akhir, dan petunjuk. Checkpoint menyiapkan prasyarat skenario yang dipilih.
3. Di setiap langkah, jalankan aktivitas **berurutan**. Label **OS Terminal**, **SQL*Plus**, **AVCLI**, atau **Web Console** menunjukkan tempat eksekusinya. Tombol panduan memakai mesin yang sama dengan CLI dan console.
4. Baca output. Error yang disengaja diberi label, misalnya **ORA-01017** untuk password salah. Error lain harus diperbaiki sebelum lanjut.
5. Klik **Buka halaman bukti** untuk melihat laporan/status. Kembali lewat **Belajar**; langkah tetap terbuka. Pada langkah observasi, isi catatan temuan sebelum lanjut.
6. Klik **Sudah diperiksa → Berikutnya**. Setelah semua langkah ditinjau, klik **Verifikasi & selesaikan skenario**. Penyelesaian memerlukan aktivitas berhasil serta bukti yang benar-benar ada dalam state.
7. Pilih skenario berikutnya dan mulai. Setiap skenario dapat dijalankan mandiri; hasil skenario sebelumnya tidak menjadi prasyarat.

**Jika buntu:** klik **Menyerah — bantu & lanjut** di samping tombol Berikutnya. Bantuan menjalankan contoh sampai langkah aktif dan menyiapkan kondisi untuk langkah berikutnya, tanpa mewajibkan catatan. Langkah tersebut ditandai **Dibantu**, dan skenario akhirnya ditandai **Selesai dengan bantuan**. Catatan pribadi serta progres skenario lain tetap tersimpan. Konfigurasi/evidence latihan aktif dibangun ulang; eksperimen dan progres setelah langkah yang dipilih harus diulang. Output contoh tetap bisa dibaca dengan memilih langkah sebelumnya.

**Mulai/ulangi checkpoint mengganti konfigurasi, history CLI, dan evidence latihan aktif.** Progres skenario lain tetap tersimpan. Catat bukti yang ingin dipertahankan sebelum berpindah. Progres lokal tersimpan per browser/origin; menghapus storage browser menghapusnya.

### Bedakan akun web dan database

| Akun | Digunakan untuk |
|---|---|
| `admin` / `auditor` di login web | Mengubah menu console; bukan akun database |
| `SYS` pada SQL*Plus | Membuat pengguna/policy, GRANT/REVOKE, membaca audit dan dictionary |
| `AVDF_DEMO`, `AVDF_D2_APP`, `AVDF_D2_READER`, `HR` | Menghasilkan aktivitas sesuai skenario |

Koneksi `sqlplus` di OS Terminal mengubah sesi SQL*Plus berikutnya. Password salah memutus sesi. Untuk kembali menjadi SYS, di OS Terminal:

```bash
sqlplus / as sysdba
```

Lalu di SQL*Plus:

```sql
ALTER SESSION SET CONTAINER=PDB1;
```

Panduan menyisipkan pergantian sesi ini saat diperlukan. **Buka di CLI** memungkinkan eksperimen; untuk pencatatan progres otomatis, jalankan aktivitas melalui panduan. Jika eksperimen telah membuat user/policy yang sama, ulangi checkpoint sebelum kembali ke urutan latihan.

## Urutan dan bukti akhir

| Skenario | Fokus | Bukti keberhasilan |
|---|---|---|
| 01 | Environment dan Unified Audit | SELECT AVDF_DEMO serta login gagal 1017 pada native audit |
| 02 | AVDFCOLLECT dan TABLE collection | Trail COLLECTING; event lokal masuk repository |
| 03 | Policy, retention, alert | Policy aktif, retention 3/0 bulan, alert tiga login gagal |
| 04 | Agent, Host Monitor, DBFW | Jalur berjalan; monitoring point harus di-START |
| 05 | Database Response dan gangguan | Error 942/1031 tercatat; monitoring dapat dihentikan dan dipulihkan |
| 06 | Baseline dan policy lifecycle | Tiga cluster SQL; policy Published lalu deployed |
| 07 | Data sensitif dan row count | Full read 5 baris memicu threshold >3; rollback mempertahankan evidence |
| 08 | Reports, groups, compliance | Saved report, metadata jadwal, target group, PCI-DSS membership |
| 09 | Entitlement drift | Snapshot sebelum/sesudah menunjukkan HR SELECT dan power role |
| 10 | Stored procedure | SPA Created versi 1 dan Modified versi 2 |
| 11 | Triage dan health | Alert Open → Acknowledged → Closed; jalur tetap sehat |
| 12 | Forensic capstone | GRANT → login → SELECT/UPDATE → drift → REVOKE, dengan evidence terkait |

## Jika hasil membingungkan

- **SQL berhasil tetapi audit kosong:** periksa definisi policy, status enabled, pengguna dan objek yang dicakup.
- **Native audit ada tetapi report kosong:** periksa TABLE trail dan jaringan/listener/PDB. Clear Failures memulihkan status sebelumnya; collection mengumpulkan backlog tanpa duplikasi.
- **Firewall kosong:** periksa agent, Host Monitor, DBFW network, alamat monitor, status Running, dan NETWORK trail. Stopped tidak memblokir query database.
- **Hasil COUNT = 5 tetapi tidak ada alert >3:** COUNT mengembalikan satu baris hasil. `SELECT *` mengembalikan lima baris dataset.
- **SELECT SYSDATE tidak cocok Default:** Session Context dapat cocok lebih dahulu. Urutan rule menentukan hasil; perubahan draft baru berlaku setelah Publish dan Deploy ulang.
- **Login gagal:** kode 1017 disengaja pada langkah tertentu; hubungkan ulang sebelum menjalankan SQL berikutnya.
- **User/table/policy sudah ada:** aktivitas pembuatan tidak dimaksudkan untuk diulang tanpa reset. Gunakan Ulangi dari awal.

## Sumber dan penyesuaian

Salinan asli 12 worksheet berada di [training/avdf_handson](training/avdf_handson), tanpa perubahan terhadap file sumber di repository `basis_data`.
`scripts/build-scenarios.cjs` menyusun [scenarios.json](scenarios.json) dari worksheet dan menambahkan:

- koneksi kembali sebagai SYS sebelum pemeriksaan dictionary atau administrasi;
- quota USERS dan CREATE PROCEDURE untuk pemilik dataset;
- GRANT/REVOKE audit pada latihan entitlement;
- aksi web yang sebelumnya hanya disebutkan tanpa instruksi konkret;
- error yang disengaja, tips interpretasi, dan checklist state aktual.

```powershell
npm run build:scenarios
npm test
```

Uji menjalankan seluruh aktivitas 12 skenario dari checkpoint masing-masing dan memeriksa hasil. Uji tambahan mencakup jalur failure, backlog collection, row count, sesi login, snapshot immutable, dan deployment policy.

## Cakupan simulator

Ini simulator pembelajaran lokal, bukan produk Oracle dan bukan pengujian instalasi AVDF/Oracle nyata. Engine mengimplementasikan subset SQL/OS/AVCLI pada panduan 12 skenario; bukan interpreter SQL atau shell umum. Dataset HR sintetis berjumlah 107, dataset customer berjumlah 5. Waktu event adalah waktu browser; collection/retrieval berjalan langsung untuk latihan.

Policy firewall beroperasi dalam mode monitoring, tidak memblokir SQL. Event jaringan dicatat per eksekusi agar latihan frekuensi dapat dibaca; metadata `Logging: Unique` tidak menerapkan deduplikasi AVDF produksi. Konfigurasi Unknown Traffic dan Login/Logout disimpan sebagai materi policy; simulator tidak mengemulasikan paket protokol jaringan. Retention hanya konfigurasi, bukan proses penghapusan/arsip berbasis waktu. Jadwal report hanya metadata, tanpa scheduler, PDF, email, atau SMTP sungguhan. Hybrid Oracle tidak tersedia. Katalog Day 1–5 lama tidak seluruhnya termasuk cakupan eksekusi yang diuji.

State mesin lama (`avdf_pages_state_v1`) tidak dimigrasikan karena hanya mencatat pesan sukses generik. Edisi ini menggunakan key `avdf_pages_state_v2`; key lama tetap disimpan.

## GitHub Pages

Publikasikan seluruh file root beserta folder `training` ke branch Pages. Pilih **Settings → Pages → Deploy from a branch → main / root**. Tidak ada backend atau build dependency. Jalankan build katalog dan test sebelum push jika worksheet diubah.
