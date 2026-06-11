# GeoLeadScraper — Free Google Maps Scraper (Chrome Extension)

**GeoLeadScraper is a free, open-source Google Maps scraper** — a Chrome /
Chromium extension that extracts public business data from **Google Maps**
(plus **Yandex Maps** and **2GIS**) and exports it to **CSV, XLSX or JSON** in
one click. No account, no API key, no quotas, no tracking.

If you've been looking for a **free Google Maps scraper for lead generation**
that runs entirely in your browser, this is it: search any place on Google Maps,
hit **Start extracting**, and download a clean spreadsheet of business leads —
names, addresses, phone numbers, websites, ratings, reviews and more.

**🌐 Website & docs: [geoleadscraper.com](https://geoleadscraper.com/)** — install guide, how-to and FAQ.

<p>
  <a href="https://geoleadscraper.com/"><img alt="Website" src="https://img.shields.io/badge/website-geoleadscraper.com-0a7cff.svg"></a>
  <img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-green.svg">
  <img alt="Manifest V3" src="https://img.shields.io/badge/Chrome-MV3-blue.svg">
  <img alt="Free & Open Source" src="https://img.shields.io/badge/free-open--source-brightgreen.svg">
</p>

> ⚠️ Use responsibly and in compliance with the terms of service of the maps you
> scrape and with applicable data-protection laws. Only public business data.

## Why GeoLeadScraper?

- 🆓 **Truly free Google Maps scraper** — MIT-licensed, no paywall, no sign-up, no credit card.
- 🗺️ **Google Maps, Yandex Maps & 2GIS** — one tool, three of the biggest map providers.
- 🔑 **No API key, no Google Places API** — scrapes the page you're looking at, in your browser.
- 📤 **One-click export** to **CSV / Excel (XLSX) / JSON**.
- 🧲 **Built for lead generation** — turn any map search into a list of business leads.
- 🔌 **Optional self-hosted backend** to also scrape **emails, phone numbers and social links** from each business website.
- 🤖 **MCP server included** — let Claude (or any MCP client) collect and analyze leads on command.
- 🕵️ **Private** — runs locally, your data never touches our servers (there are none).

## What you can extract

Business name · category · full address · phone number · website · rating ·
review count · latitude / longitude · opening hours · claimed status · menu /
booking links — and, with the optional backend, **email addresses, phone numbers
and social media links** scraped from each business's own website.

## Supported platforms

| Map | Status |
| --- | --- |
| Google Maps | ✅ Google Maps scraper (search results) |
| Yandex Maps | ✅ |
| 2GIS | ✅ |

## Quick start (install the Chrome extension)

### Requirements
- Node.js >= 20
- pnpm >= 9 (`npm i -g pnpm`)

### Build & load
```bash
pnpm install
pnpm build:extension
```
Then in Chrome: open `chrome://extensions` → enable **Developer mode** →
**Load unpacked** → select `apps/extension/dist`.
(Prefer not to build? Grab the packaged `dist.zip` from the repo and load that.)

📖 Step-by-step install guide with screenshots: **[geoleadscraper.com/install](https://geoleadscraper.com/install)**.

Open Google Maps, search for anything (e.g. *"coffee shops in Berlin"*), click
**Start extracting**, then **Export** to download your CSV. The extension works
**standalone** — Google Maps scraping needs no backend and no login.

### Optional: scrape website contacts (emails / phones / socials)
The only feature that needs a backend is **website contact enrichment**:
```bash
pnpm dev:api
# or: cd apps/api && docker compose up --build
```
Then open the extension **Settings** and set the **Backend URL** (default
`http://localhost:5050`). When it's reachable, email / phone / social columns
become available; otherwise that feature is simply hidden.

### Optional: MCP server (collect leads from Claude)
A built-in [MCP server](apps/api/MCP.md) lets an AI assistant such as Claude run
`collect_maps(...)` to scrape businesses through the extension and analyze them.
See [apps/api/MCP.md](apps/api/MCP.md).

## Monorepo layout
```
geoleadscraper/
└── apps/
    ├── api/         # Optional stateless backend (NestJS + Puppeteer) + MCP server
    └── extension/   # Chrome MV3 extension (Turborepo + Vite + React)
```
Tooling: **pnpm workspaces + Turborepo**.

## Development
```bash
pnpm dev:extension   # watch-build the extension
pnpm dev:api         # run the backend in watch mode
pnpm lint
pnpm type-check
pnpm test
```

## FAQ

**Is this really a free Google Maps scraper?**
Yes — 100% free and open-source (MIT). No account, no quotas, no trial, no
hidden Pro tier.

**Do I need the Google Places API or an API key?**
No. GeoLeadScraper reads the public Google Maps search results in your browser —
there's no API key and no Google Maps API billing.

**Is there a limit on how many results I can scrape?**
No paid limit. You can collect the businesses Google Maps returns for a search;
use a reasonable pace to stay within the platforms' terms of service.

**Can it scrape emails and phone numbers from business websites?**
Yes, with the optional self-hosted backend, which visits each business website
and extracts publicly listed emails, phones and social links.

**Does it work with Yandex Maps and 2GIS too?**
Yes — the same extension scrapes Google Maps, Yandex Maps and 2GIS.

## Keywords

free google maps scraper · google maps scraper chrome extension · google maps
data extractor · scrape google maps · google maps lead generation · business
leads scraper · yandex maps scraper · 2gis scraper · email & phone scraper ·
export google maps to csv/excel · open-source web scraper · no API key.

## Links
- 🌐 Website & docs: **[geoleadscraper.com](https://geoleadscraper.com/)**
- 📖 How to use: [geoleadscraper.com/how-to-use](https://geoleadscraper.com/how-to-use)
- ❓ FAQ: [geoleadscraper.com/faq](https://geoleadscraper.com/faq)

## License
[MIT](./LICENSE) — free for personal and commercial use.
