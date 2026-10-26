# 💖 My Wife Photopack Gallery

Website photopack galeri modern bertema **Neo-Brutalism Magenta & White** (sesuai referensi desain) dengan format postingan ala **Instagram Carousel**.

---

## ✨ Fitur Utama

1. **Instagram-Style Photo Swipe / Carousel**:
   - **Jika Foto > 1**:
     - Bisa di-swipe di HP (sentuhan jari) maupun di Desktop (drag mouse).
     - Tombol navigasi panah kiri & kanan (`<` dan `>`).
     - Indikator titik (dots indicator) di bagian bawah foto.
     - Badge counter foto di pojok kanan atas (contoh: `1/4`).
   - **Jika Foto Hanya 1 (Single Shot)**:
     - **TIDAK BISA di-swipe** (sesuai permintaan).
     - Tombol panah dan indikator titik otomatis disembunyikan.
     - Label badge bertuliskan `SINGLE SHOT`.

2. **Username Akun & Keterangan Waktu Update**:
   - Header profil lengkap dengan nama tampilan, username `@my.beloved.wife`, bio, dan avatar.
   - Setiap postingan memiliki:
     - Avatar & username pemilik akun dengan badge centang official.
     - **Keterangan Terakhir Diupdate**: misal *"10 menit yang lalu"*, *"2 jam yang lalu"*, *"Hari ini, 15:45 WIB"*.
     - Timestamp detail di bagian bawah postingan.

3. **Style Desain Neo-Brutalism (Magenta & White)**:
   - Terinspirasi langsung dari screenshot referensi:
     - Garis outline tegas (*bold border* hitam).
     - Drop shadow pop-out khas neo-brutalism (`4px 4px 0px #121214`).
     - Aksen warna **Magenta (#e6007e)** dipadukan dengan **White** bersih dan highlight playful.
     - Ticker banner marquee animasi di bagian atas.
     - Menu navigasi pill bulat di tengah.

4. **Interaksi & Fitur Tambahan**:
   - **Double Tap / Double Click**: Efek hati meletup (*heart burst*) dan konfeti untuk memberi like foto.
   - **Fullscreen Lightbox**: Klik foto untuk melihat ukuran penuh / resolusi HD beserta tombol unduh langsung.
   - **Tambah Photopack Baru**: Tombol `+ Tambah Foto` memungkinkan kamu memasukkan foto dari komputer/HP (bisa pilih banyak sekaligus) atau URL gambar, atur caption, username, dan waktu update. Data otomatis tersimpan di `localStorage` browser.
   - **Filter & Pencarian**: Filter cepat untuk melihat *Semua*, *Hanya Multi-Foto*, *Hanya Single Shot*, atau *Favorit*.
   - **Edit Profil**: Bisa ubah nama, username, bio, dan foto avatar profil kapan saja.

---

## 🚀 Cara Menjalankan

### Cara 1 (Paling Mudah - Langsung Klik):
Cukup buka folder `c:\Users\Asus\Downloads\photopack` lalu **klik ganda (double-click)** pada file `index.html` untuk langsung membukanya di browser Google Chrome, Edge, atau browser favoritmu.

### Cara 2 (Menggunakan Local Server):
Jalankan perintah berikut di terminal:
```bash
npm start
# atau
npx serve .
```
Lalu buka alamat yang muncul di terminal (biasanya `http://localhost:3000`).
