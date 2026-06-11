# GeoLeadScraper

Open-source Chrome/Chromium extension that collects public business data from
**Google Maps**, **Yandex Maps** and **2GIS**, and exports it to CSV / XLSX / JSON.

Free, no account, no quotas, no tracking. An **optional** self-hosted backend
adds website contact enrichment (emails, phones, social links).

> ⚠️ Use responsibly and in compliance with the terms of service of the
> platforms you scrape and with applicable data-protection laws.

## Monorepo layout

```
geoleadscraper/
└── apps/
    ├── api/         # Optional stateless backend (NestJS + Puppeteer) — website contact scraping
    └── extension/   # Chrome MV3 extension (Turbo + Vite + React)
```

Tooling: **pnpm workspaces + Turborepo**.

## Quick start

### Requirements
- Node.js >= 20
- pnpm >= 9 (`npm i -g pnpm`)

### Install
```bash
pnpm install
```

### Build the extension
```bash
pnpm build:extension
```
Then load it in Chrome: `chrome://extensions` → enable **Developer mode** →
**Load unpacked** → select `apps/extension/dist`.

The extension works **standalone** — map scraping needs no backend, no login.

### Optional: run the contact-enrichment backend
Website contact scraping (emails/phones/socials) is the only feature that needs
a backend. Run it locally:
```bash
pnpm dev:api
# or with Docker:
cd apps/api && docker compose up --build
```
Then open the extension settings and set the **Backend URL** (default
`http://localhost:5050`). When the backend is reachable, contact fields become
available; otherwise that feature is simply hidden.

## Development
```bash
pnpm dev:extension   # watch-build the extension
pnpm dev:api         # run the backend in watch mode
pnpm lint
pnpm type-check
pnpm test
```

## License
[MIT](./LICENSE)
