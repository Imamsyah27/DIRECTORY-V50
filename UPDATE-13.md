# Update 13 (di atas Update 12)

## SQL — Supabase SQL Editor, berurutan 13, 14, 14b, 14c, 15, 16, 17, 18, 19, 20, 21, 22, 23, 23b, 24, 24b; satu file satu kali Run (aman diulang). Dipecah karena SQL Editor memotong skrip ±20.000 karakter.
| # | File | Isi |
|---|------|-----|
| 1 | `sql/koin-usdt-13-preorder-per10k.sql` | Harga Pre Order = per **10.000 barang** |
| 2 | `sql/koin-usdt-14-modal.sql` | Tabel Modal + daftar barang (menu **Modal**) |
| 2b | `sql/koin-usdt-14b-modal-bsl.sql` | Modal -> BSL Profit + Catat Penjualan Barang |
| 2c | `sql/koin-usdt-14c-modal-cashflow.sql` | Modal & profit di CashFlow |
| 3 | `sql/koin-usdt-15-bulk-order.sql` | **Bulk Order** (BEM+SEM+LEM 1 pesanan) + harga tier |
| 4 | `sql/koin-usdt-16-kirim-hari-ini.sql` | Pesanan harian: **kirim hari ini / besok** |
| 5 | `sql/koin-usdt-17-supply-kontak.sql` | Supply & Stock: **catatan + kontak** untuk admin |
| 6 | `sql/koin-usdt-18-hold-tagar.sql` | **Tunda (hold)** langganan harian |
| 7 | `sql/koin-usdt-19-preorder-minmax.sql` | Pre Order: **minimal 10.000 / maksimal 10.000 per batch** |
| 8 | `sql/koin-usdt-20-request-langganan.sql` | **Request pelanggan**: arsipkan / tunda / aktifkan kembali |
| 9 | `sql/koin-usdt-21-autorefresh.sql` | **Auto-refresh** web admin & pelanggan |
| 10 | `sql/koin-usdt-22-kontak-tagar.sql` | **Kontak + tagar wajib** (Koin, Voucher, Supply) + tab **Supply** di Order |
| 11 | `sql/koin-usdt-23-bot-batch.sql` | **Batch tagar bot**: antrian, ACC masuk antrian, fungsi pelanggan |
| 12 | `sql/koin-usdt-23b-batch-admin.sql` | **Batch tagar bot**: fungsi admin, batalkan pesanan setelah ACC |

Jangan menjalankan ulang `bot-order.sql` / `bsl-profit.sql` / `bot-order-kirim-arsip.sql` setelah #2 dan #3 (akan menimpa fungsi modal dengan versi lama).

## 1. Pre Order per 10.000 barang
- Admin (Supply & Stock → Pre Order): angka harga = koin untuk 10.000 barang. Pelanggan membayar `barang × harga ÷ 10.000` (dibulatkan ke atas per batch).
- Harga lama (per barang) dan Custom Price / Harga Pelanggan Pre Order otomatis dikali 10.000 SEKALI saja, jadi nilai riil tetap sama. Riwayat pesanan lama tetap benar.
- Tampilan pelanggan (5 bahasa), daftar harga item, dan menu Order → Pre Order ikut menampilkan "/ 10.000 barang".

## 2. Menu Modal (DIRECTORY → Modal)
- Satu tempat untuk semua modal: Farm, Hav Token, Product (tiap tier 100/500/1000), Koin/Voucher/kategori lain, Pre Order, ditambah modal BSL (BEM/SEM/LEM harian dan Bot). Barang baru di etalase otomatis muncul.
- Modal yang dulu ada di BSL Profit dipindahkan otomatis ke menu Modal. Panel modal di BSL Profit kini hanya ringkasan + tombol ke menu Modal.
- BSL Profit → **Catat Penjualan Barang**: pilih barang + jumlah → omset (harga etalase, bisa diubah), modal (dari menu Modal), profit otomatis.
- CashFlow: form punya **Pilih Barang (etalase)**; harga jual & modal terisi otomatis, kolom Modal/Profit ada di tabel, batch, dan ringkasan.
- Modal disimpan sebagai snapshot saat transaksi; mengubah modal tidak mengubah transaksi lama.
- Jumlah barang berupa bilangan bulat. Untuk Pre Order, 1 jumlah = 10.000 barang.

## 3. Bulk Order (BEM + SEM + LEM dalam 1 pesanan)
- **Pelanggan** (dashboard → Bot Order / Order): tombol **Pesan Bulk Order**. Isi tagar BEM, SEM, LEM (boleh sebagian dikosongkan), maks. 100 tagar total, plus catatan. Total harga tampil langsung, tabel tier bisa dibuka. Bayar dengan koin seperti Bot Order; ditolak / dihapus saat menunggu → koin kembali.
- **Admin → Price → Harga Bulk Order**: harga per tagar untuk BEM/SEM/LEM pada 4 tier jumlah total tagar: 1–5, 6–10, 11–50, 51–100 (12 angka) + saklar tersedia. Paket yang dipakai pelanggan wajib berharga > 0.
- **Admin → Order**: tab **🤖 Bot Order** dan **🧺 Bulk Order** terpisah (daftar, badge, filter, dan "arsipkan semua terkirim" masing-masing sendiri, jadi tidak tertukar). Pesanan bulk tampil dengan jumlah per paket + tier. Klik jumlah tagar untuk melihat daftar tagar per paket (BEM/SEM/LEM, tombol salin per paket/semua) dan catatan pelanggan. Alur Setujui → Dikirim → Arsip sama dengan Bot Order.
- Setujui otomatis tercatat di BSL Profit (kategori "BULK Bot"): omset = total, modal = jumlah tagar tiap paket × modal Bot paket itu (menu Modal).
- Harga Bulk tidak terpengaruh Custom Price / Harga Pelanggan.

## 4. Menu Price bisa di-minimize
Klik judul panel mana pun di Price untuk minimize / buka; ada tombol Minimize semua / Buka semua. Status diingat di browser.

- Sisi pelanggan: di tab Bot Order ada filter Semua / Bot / Bulk. Di form Bulk Order, pelanggan bebas memilih paket BEM, SEM, dan/atau LEM (isi tagar hanya pada paket yang diinginkan).

## 5. Pesanan harian: kirim hari ini / besok
- Saat pelanggan memesan langganan baru atau perpanjang BEM/SEM/LEM ada centang **⚡ Kirim hari ini**. Tidak dicentang = dikirim besok.
- Admin (Dashboard → Perpanjangan & Pesanan Baru): hari ini = **🔥 merah bercahaya** (kartu, badge tab BEM/SEM/LEM/Fast, badge menu); besok = **📅 biru**. Badge tab merah bila ada minimal 1 pesanan hari ini, biru bila semuanya besok. Pesanan lama tanpa pilihan tampil seperti biasa.
- Bila SQL 16 belum dijalankan, pemesanan tetap jalan (tanpa pilihan kirim).

## 6. Mode Edit List-Farm (menu List-Farm → Daftar Produk)
- Tombol **✏️ Mode Edit** di atas tabel: SEMUA produk di daftar yang sedang dibuka (kategori + dashboard) jadi kolom isian sekaligus: Nama Produk, Akun terpakai / Kapasitas, dan Tagar Error. Ubah banyak baris, lalu **💾 Simpan Semua** (sekali simpan). **✕ Batal** membuang perubahan.
- Baris yang diubah ditandai kuning + penghitung "n produk diubah". Validasi sama dengan edit per baris (nama wajib, kapasitas ≥ 1, terpakai ≤ kapasitas; bila tidak penuh lagi, keputusan isi ulang direset).
- Selama Mode Edit, ganti kategori/dashboard, tambah/hapus produk, keputusan, dan List Tagar dikunci agar perubahan tidak hilang. Tombol ✏️ per baris tetap ada untuk edit satu baris.
- Tidak butuh SQL baru.

## 7. Supply & Stock: catatan + kontak untuk admin
- Di kotak konfirmasi pemesanan (pelanggan) ada kolom **📱 Kontak** (nomor WhatsApp atau link profil Messenger) dan **📝 Catatan untuk admin**, keduanya opsional. Kontak diingat di browser untuk pesanan berikutnya.
- Admin (Supply & Stock → Order Masuk): kontak dan catatan tampil di bawah nama pelanggan. Nomor WhatsApp dan link Messenger/WA/Telegram bisa diklik langsung (nomor berawalan 0 otomatis diubah ke 62).
- Bila SQL 17 belum dijalankan, pemesanan tetap jalan tanpa kontak/catatan.

## 8. Pemilih barang CashFlow & BSL Profit = 2 dropdown
Pilih **Kategori** (Farm, Hav Token, Product, Pre Order, …) lalu **Barang** di kategori itu (nama + harga jual). CashFlow punya pilihan "Ketik manual". Tidak butuh SQL baru.

## 9. Tab HAV di menu Order (admin)
Order → **🔑 HAV**: daftar pembelian key (waktu, pembeli, batch, jumlah, harga/key, total koin) + pencarian. Isi key tidak ditampilkan. Tidak butuh SQL baru (memakai data HAV yang sudah ada).

## 10. Form manual CashFlow & BSL Profit lebih rapi
- CashFlow: form dibagi 3 bagian: ① Pilih barang (Kategori, 🔍 Cari barang, Barang), ② Detail transaksi (nama pembeli, produk, harga jual, modal, jumlah), lalu Total / Profit / Tambah.
- BSL Profit (Catat Penjualan Barang & Pemasukan Manual): kolom cari barang, dan hasil ditampilkan sebagai kotak kecil (Harga, Modal, Omset, Profit). Mengetik di kolom cari mencari di SEMUA kategori.

## 11. Pre Order: minimal 10.000, maksimal 10.000 per batch
- Minimal pembelian = total barang semua batch dalam 1 pemesanan (default 10.000); maksimal per batch default 10.000. Barang lama otomatis diset 10.000 / 10.000 sekali. Admin tetap bisa mengubah per barang (kolom "Minimal pembelian" di form Pre Order).
- Pelanggan melihat aturan di kotak pemesanan; form menolak bila total < minimum (juga dicek server).

## 12. Tunda (hold) langganan harian BEM/SEM/LEM
- Admin (Dashboard → BEM/SEM/LEM/Fast): sub-tab **▶ Aktif** dan **⏸ Tunda**. Centang langganan (kotak di samping nama pemesan, atau "Pilih semua yang tampil") lalu **⏸ Tunda yang dipilih**. Di tab Tunda: **▶ Aktifkan yang dipilih** (atau tombol ▶ per baris).
- Yang ditunda tidak dihitung di statistik, "Belum dicentang hari ini", Ceklis Semua, dan Arsipkan Limit; tombol ✓ harian dikunci.
- Dashboard pelanggan: tab baru **⏸ Ditunda** (muncul bila ada), di tampilan Tabel maupun Box. Tab Semua / Limit / Besok hanya menampilkan yang aktif.
- **Arsipkan yang dipilih (admin):** di bar centang yang sama (tab Aktif maupun Tunda) ada tombol **📥 Arsipkan yang dipilih**. Langganan yang dicentang dipindahkan ke Data Arsip walau BELUM selesai (konfirmasi menyebut berapa yang belum selesai), dan otomatis muncul di Arsip pelanggan. Tidak butuh SQL baru.

## 13. Request pelanggan: arsipkan / tunda / aktifkan kembali
- **Pelanggan:** tiap langganan (tabel & box) punya tombol **📨 Request**. Pilihan: ⏸ Tunda (untuk langganan aktif) atau ▶ Aktifkan kembali (untuk yang ditunda), dan 📥 Arsipkan; plus catatan opsional. Satu langganan hanya boleh punya 1 request yang menunggu. Tab baru **📨 Request** di samping tab Ditunda menampilkan riwayat request + status (Menunggu / Disetujui / Ditolak) + catatan admin; request yang menunggu bisa dibatalkan.
- **Admin:** Dashboard → BEM/SEM/LEM/Fast → tab baru **📨 Request** di samping tab Tunda (angka merah = ada yang menunggu). Tabel request: **✓ Setujui** (langsung menjalankan: tunda / aktifkan / arsipkan, arsip muncul juga di Arsip pelanggan) atau **✖ Tolak** (+ catatan untuk pelanggan), serta **Setujui semua yang menunggu**. Angka di tab baru muncul setelah PIN admin dimasukkan (sama dengan menu Order / Akun Pelanggan).

## 14. Auto-refresh web pelanggan & web admin
- Setiap perubahan data menaikkan "versi" per kelompok (orders, requests, coin, catalog, price, announce) di tabel `sync_state` lewat trigger — berlaku untuk perubahan dari web admin, web pelanggan, maupun SQL Editor.
- Kedua web memeriksa versi tiap ±12 detik (hanya saat tab terlihat) dan memuat ulang data HANYA bila ada yang berubah. Pelanggan: langganan, request, koin, katalog/stok, harga, pengumuman. Admin: halaman yang sedang dibuka (Dashboard, Arsip, Order, Akun Pelanggan, Supply, Farm/HAV/Koin&Voucher, Statistik, Pengumuman) + semua lencana notifikasi.
- Tidak menimpa pekerjaan: ditunda bila kotak dialog terbuka, sedang mengetik, atau Mode Edit List-Farm aktif. Halaman berformulir (Price, Panel, CashFlow, BSL Profit, Modal, Custom Price) sengaja tidak dimuat ulang otomatis.
- Tanpa SQL 21 web tetap normal (auto-refresh berhenti sendiri setelah 3 kali gagal).

## 15. Tampilan tablet (portrait & landscape)
- File baru `tablet.css` (admin) dan `pelanggan/tablet.css` (pelanggan), dimuat paling akhir. Rentang 600–1400 px.
- Layar penuh: batas lebar tetap dilepas (admin `app-shell`, pelanggan `portal-shell`), tinggi memakai `dvh` (tidak terpotong bilah alamat Safari), area aman notch/sudut (`viewport-fit=cover`), tidak ada geser samping.
- Portrait: header tidak menempel, menu atas bisa digeser, kartu statistik 2 kolom. Landscape: statistik 4 kolom; landscape pendek (keyboard muncul): header tidak memakan tinggi layar. Pelanggan: kartu langganan tersusun grid beberapa kolom.
- Layar sentuh: tombol minimal 40 px, kotak centang lebih besar, input 16 px (tidak memicu zoom otomatis iOS), kotak dialog tidak lebih tinggi dari layar.
- Ditambahkan meta "web app" agar saat dipasang ke layar utama tablet (Add to Home Screen) tampil tanpa bilah browser.
- **Menu atas bisa digeser kiri-kanan di tablet (portrait & landscape):** DIRECTORY → SETTING → PRICE kini satu baris penuh di bawah judul yang bisa digeser dengan jari (sebelumnya SETTING & PRICE terpotong di landscape). Tombol yang diklik / grup yang dibuka otomatis digeser agar terlihat penuh (`js/nav-scroll.js`).

## 16. Kontak + tagar WAJIB (Koin Hayday, Voucher, Supply & Stock) & tab Supply di menu Order
- **Pelanggan:** saat memesan Koin Hayday, Voucher (semua kategori katalog selain Farm/HAV) dan Supply & Stock ada 2 kotak terpisah yang WAJIB diisi: **📱 Kontak** (nomor WhatsApp atau link profil Messenger/Facebook, divalidasi) dan **🏷️ Tagar akun yang akan dikirim**. Dicek sebelum koin dipotong (di form dan di server). Kontak & tagar terakhir diingat di browser.
- **Admin:** di Order → Koin Hayday / Voucher / **📦 Supply** dan di Supply & Stock → Order Masuk: tagar tampil sebagai tombol — **klik = tagar tersalin**; kontak WhatsApp / Messenger — **klik = langsung membuka chat WhatsApp / Messenger**. Daftar tagar di Bot/Bulk Order juga bisa disalin satu per satu dengan klik.
- **Tab 📦 Supply di menu Order** (di samping Dashboard → Order): daftar pesanan Supply & Stock dengan filter ⏳ Menunggu / ✅ Terkirim / ✖ Ditolak / Semua, aksi Sudah dikirim, Batal kirim, **Tolak (koin dikembalikan)**, Hapus, dan lencana jumlah menunggu. Pelanggan melihat status "Ditolak" di riwayat Supply.

## 17. Batch Tagar Bot (Order → 📋 Batch Tagar)
- Tagar pesanan Bot/Bulk yang **di-ACC** masuk antrian per paket (BEM / SEM / LEM), urutan = urutan di-ACC. Antrian dibagi per **batch**; isi per batch diatur admin (mis. 50 → 100), batch pelanggan ikut menyesuaikan. Pesanan lama yang sudah di-ACC otomatis dimasukkan.
- **Salin satu klik:** semua tagar belum terkirim / semua tagar / per paket / per batch, plus total tagar. Klik tagar = salin satu tagar. **⬇ Download ZIP** berisi file `.txt` per batch (opsi: hanya yang belum terkirim).
- **Centang "Sudah dikirim"** pada sebuah batch menandai semua tagar di dalamnya terkirim (lepas centang = kembali). Pesanan yang tagarnya terkirim sebagian tampil "Terkirim sebagian"; bila semua tagarnya terkirim, otomatis berstatus Terkirim (sinkron dengan alur lama).
- **Pelanggan** (Bot Order): tiap pesanan menampilkan rincian miliknya saja, mis. `BEM · Batch 1: 25 tagar ✅ · Batch 2: 25 tagar ⏳`, tanpa melihat tagar orang lain; status "Terkirim sebagian (25/50 tagar)".
- **Pesanan Aktif** (di bawah batch): tombol **✖ Batalkan & kembalikan koin** untuk pesanan yang sudah di-ACC dan belum ada tagar yang dikirim: tagar keluar dari antrian, catatan BSL Profit dihapus, koin kembali, status Ditolak.
- Mengarsipkan pesanan mengeluarkan tagarnya dari antrian batch (nomor batch tagar yang tersisa menyesuaikan).

## 18. Notifikasi Bot Telegram khusus admin (SETTING → ✈️ Telegram)
- Setiap **order masuk** dikirim ke Telegram admin lengkap dengan detail: jenis order, pelanggan, paket / barang, tagar, total, **kirim hari ini / besok** (langganan harian), kontak & tagar tujuan (Koin, Voucher, Supply), catatan, waktu, dan nomor order. Jenis: langganan baru / perpanjang, Bot Order, Bulk Order, Koin Hayday, Voucher, Supply & Stock, Pre Order, Top Up Koin, request pelanggan (+ opsional pembelian Farm/HAV otomatis). Tiap jenis bisa dimatikan.
- Cara kerja: trigger database memanggil API Telegram lewat ekstensi **pg_net** (tanpa server tambahan). Kegagalan Telegram tidak pernah menggagalkan pesanan pelanggan.
- Pasang: SQL `koin-usdt-24-telegram.sql` lalu `24b` → buat bot di @BotFather (token) → kirim /start ke bot → di halaman Telegram isi token, **Cari Chat ID**, centang Aktifkan, Simpan, **Kirim tes**. Bila pg_net belum aktif: Supabase → Database → Extensions → aktifkan pg_net lalu jalankan ulang file 24.
- Token tersimpan di database (tanpa akses publik, hanya fungsi berPIN admin). Jangan tambahkan bot ke grup umum.
