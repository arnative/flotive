# Flotive

Aplikasi pengelolaan uang **local-first** — data tersedia offline di IndexedDB dan otomatis tersinkron antar perangkat melalui Flotive Cloud (Cloudflare D1).

## Stack

- **Framework**: SvelteKit 2 + Svelte 5 (runes)
- **Bahasa**: TypeScript
- **CSS**: TailwindCSS v4 + shadcn-svelte
- **Font**: Inter (Fontsource, self-hosted)
- **Icons**: @tabler/icons-svelte
- **Motion**: motion (motion.dev)
- **DnD**: svelte-dnd-action
- **ORM**: Drizzle ORM
- **Database**: IndexedDB (local) + Cloudflare D1 (sync opsional)
- **PWA**: @vitejs/plugin-pwa + workbox

## Fitur

- Akun lintas perangkat dengan session cookie HttpOnly
- Transaksi: pemasukan / pengeluaran / transfer
- Hutang dan piutang (menu terpisah)
- Kategori (10 default + custom, icon picker Tabler)
- To-do dengan drag-and-drop reorder
- Dashboard: saldo, metrik bulan ini, chart pengeluaran dan tren
- Riwayat dengan search dan filter
- Pengaturan: profil, mata uang, akun/dompet, sync, ekspor JSON/CSV, tema
- Dark mode default, light mode tersedia
- Hormati prefers-reduced-motion
- Offline-first — semua fitur inti jalan tanpa internet

## Menjalankan

```sh
npm install
cp .env.example .env
npm run dev
```

Build produksi:

```sh
npm run build
npm run preview
```

Type-check:

```sh
npm run check
```

## Konfigurasi Cloudflare D1

Atur binding database D1 bernama `DB` pada Cloudflare Pages/Workers (dengan `database_id: <your-d1-database-id>`) dan `SESSION_SECRET` sebagai environment variable. Untuk pengembangan lokal, isi `.env` berdasarkan `.env.example`.

Setelah login, setiap perubahan ditulis ke IndexedDB terlebih dahulu lalu otomatis disinkronkan saat online. Perangkat baru cukup login dengan email dan password yang sama.

## Migrasi skema Cloudflare D1

```sh
npx wrangler d1 execute flotive --remote --file=./src/lib/db/migrations/0000_...sql
```

## Struktur

```
src/
  app.html / app.css        (font, OKLCH tokens, dark mode)
  routes/                   (dashboard, auth, history, categories, todos, debts, settings)
  lib/
    auth/                   (store, actions, onboarding)
    db/                     (schema, client, sync)
    storage/                (IndexedDB local-first: idb, manager, transactions, todos)
    data/                   (default-categories, icons registry)
    components/             (UI + fitur)
    utils/                  (format, currency, export)
```

> Catatan: IndexedDB menjaga aplikasi tetap dapat digunakan offline. Cloudflare D1 menjadi penyimpanan pusat untuk akun dan sinkronisasi antar perangkat.
