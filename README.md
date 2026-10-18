# Situs Pribadi Bowie

Dua halaman, keduanya satu berkas HTML tanpa dependensi eksternal.

- **Situs live:** https://netbowie.github.io/
- **`index.html` — LUNA 26 · Overview**: dashboard pemantauan tumpukan agen AI lokal (CPU, RAM, disk, daya BLUETTI, tugas terjadwal, jaringan, pemutar YouTube). Angka di layar adalah **data contoh**, bukan pembacaan langsung. Skala 1600×1000 diturunkan otomatis agar pas di layar lebar; di ponsel tata letaknya menumpuk (reflow).
- **`lama.html`**: landing page lama (hero, tentang, proyek, tumpukan, kontak) — disimpan sebagai arsip, tidak lagi menjadi halaman utama.
- **`ruang/`**: kantor virtual agen 3D (three.js, di-vendor lokal). Tautan "Kantor 3D" di bilah atas `index.html` menuju halaman ini.
- **`og.png`**: gambar pratinjau tautan 1600×1000 untuk `og:image`.

## Cara memperbarui

```bash
git add -A
git commit -m "perbarui isi halaman"
git push
```

GitHub Pages membangun ulang otomatis setiap kali `main` menerima commit (biasanya < 1 menit).

Untuk mengembalikan landing page lama sebagai halaman utama:

```bash
git mv index.html dashboard.html && git mv lama.html index.html && git commit -m "kembalikan landing page" && git push
```

## Catatan

- Repositori ini publik karena GitHub Pages gratis mensyaratkan repo publik.
- Halaman statis: tidak ada kode server, tidak ada data pribadi selain yang tertulis di halaman.
- Dashboard memakai data contoh; tidak ada kredensial atau token di dalam berkas.
