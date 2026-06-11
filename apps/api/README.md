# @geoleadscraper/api

Stateless website **contact-scraping** backend for the GeoLeadScraper extension.
No database, no auth, no billing — just a single endpoint that visits a list of
URLs with Puppeteer and returns emails, phones and social links.

This service is **optional**: the extension scrapes maps entirely on its own.
Run this only if you want website contact enrichment.

## Endpoints

| Method | Path                | Description                                  |
| ------ | ------------------- | -------------------------------------------- |
| GET    | `/`                 | Health check (used by the extension)         |
| POST   | `/v1/extract-website` | `{ "urls": string[] }` → contacts per URL |

Response shape per URL:
```json
{
  "url": "https://acme.com",
  "email": "info@acme.com",
  "emails": ["info@acme.com", "sales@acme.com"],
  "phones": ["+14155552671"],
  "socials": ["https://facebook.com/acme"],
  "_exec": 842
}
```

## Run

```bash
# from the monorepo root
pnpm --filter mapscan_api start:dev      # dev (watch)
pnpm --filter mapscan_api build && pnpm --filter mapscan_api start

# or with Docker (bundles Chromium)
docker compose up --build
```

Copy `.env.example` → `.env` to tune host/port, CORS (`ALLOWED_ORIGINS`),
rate limiting and the default phone-parsing country.

## Test
```bash
pnpm --filter mapscan_api test
```
Unit tests cover the pure extractors in `src/modules/app/extractors`
(email / phone / social) against HTML-derived fixtures.
