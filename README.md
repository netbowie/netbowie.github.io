# Situs Pribadi Bowie

Dashboard pemantauan PC ini, dengan data yang benar-benar diukur dari mesinnya.

- **Situs live:** https://netbowie.github.io/
- **`index.html` — LUNA 26 · Overview**: dashboard pemantauan tumpukan agen AI lokal dengan **data nyata**: load CPU, RAM, disk, daya BLUETTI (BLE), latensi jaringan, dan riwayat tugas Hermes. Di bawah ada pemutar YouTube **audio saja** (iframe dipasang off-screen, jadi lagu berbunyi tanpa panel video). Skala 1600×1000 diturunkan otomatis agar pas di layar lebar; di ponsel tata letaknya menumpuk (reflow).
- **`lama.html`**: landing page lama (hero, tentang, proyek, tumpukan, kontak) — disimpan sebagai arsip, tidak lagi menjadi halaman utama.
- **`ruang/`**: kantor virtual agen 3D (three.js, di-vendor lokal). Tautan "Kantor 3D" di bilah atas `index.html` menuju halaman ini.
- **`og.png`**: gambar pratinjau tautan 1600×1000 untuk `og:image`.

## Bagaimana data nyata masuk ke halaman

Halaman ini statis (GitHub Pages), jadi angka diambil dari `stats.json` yang dibuat cron Hermes setiap 5 menit:

```
tools/collect_stats.py   # sampling PC ini -> stats.json
tools/refresh_stats.sh   # collect + git commit + git push
```

| Sumber | Data |
| --- | --- |
| PowerShell / CIM | load CPU, jumlah thread, RAM terpakai, ruang disk C:, waktu boot |
| `ping 1.1.1.1` | latensi, packet loss |
| `http://127.0.0.1:11434/api/ps` | model Ollama yang sedang dimuat |
| BLUETTI AC180P via BLE | SoC baterai, daya masuk/keluar, status AC/DC |
| `AppData/Local/hermes/cron/executions.db` | riwayat jalan tugas terjadwal Hermes |

Probe yang gagal ditulis `null` dan tampil sebagai `—`; tidak ada angka karangan. Suhu CPU berasal dari zona termal ACPI yang dilaporkan Windows — kalau sensornya tidak ada, kolomnya `temp n/a`.

Grafik "System load" memakai riwayat sampel di `stats.json` (maksimal 288 titik = 24 jam pada interval 5 menit), jadi terisi sendiri seiring waktu.

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
- `stats.json` hanya berisi angka metrik (CPU, RAM, disk, baterai, latensi, nama host) — tanpa IP publik, tanpa nama pengguna sistem, tanpa isi berkas.
