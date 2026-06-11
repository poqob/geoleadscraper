# GeoLeadScraper MCP server

An MCP (Model Context Protocol) server that lets an MCP client — e.g. **Claude
Code** or **Claude Desktop** — collect businesses from maps and scrape website
contacts, on demand.

Collection itself happens in the **Chrome extension**: the MCP `collect_maps`
tool creates a job on the backend, the extension (running in your browser, with
this backend configured) picks it up, opens a background tab, scrapes the map
and submits the results — which the tool returns to Claude.

```
Claude ──MCP(stdio)──▶ mcp-server.mjs ──HTTP──▶ backend (job queue)
                                                     ▲
                          Chrome + extension ────────┘
                          opens map tab, scrapes, submits results
```

## Tools

| Tool | What it does |
| --- | --- |
| `collect_maps` | Scrape businesses for a query from `google_maps` / `yandex_maps` / `gis`. Optional `extract_contacts` enriches each result with website email/phones/socials. Needs Chrome + the extension running. |
| `extract_website_contacts` | Scrape emails/phones/socials from a list of website URLs. Backend only — no extension needed. |
| `list_jobs` | List recent collection jobs and their status. |

## Setup

### 1. Run the backend
```bash
pnpm --filter mapscan_api start:dev          # http://localhost:5050
# (Puppeteer needs a Chrome — see ../api/.env.example if it can't find one)

# or with Docker:
cd apps/api && docker compose up --build
```



### 2. Load the extension and point it at the backend
- Load `apps/extension/dist` as an unpacked extension (`chrome://extensions`).
- Open the popup → **Settings** → set **Backend URL** to `http://localhost:5050`.
- Keep Chrome open — the extension polls the backend for jobs.

### 3. Register the MCP server with Claude

**Claude Code:**
```bash
claude mcp add geoleadscraper \
  --env BACKEND_URL=http://localhost:5050 \
  -- node /ABSOLUTE/PATH/TO/geoleadscraper/apps/api/mcp-server.mjs
```

**Claude Desktop** — add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "geoleadscraper": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/geoleadscraper/apps/api/mcp-server.mjs"],
      "env": { "BACKEND_URL": "http://localhost:5050" }
    }
  }
}
```

### 4. (Optional) Install the skill
Copy [`skill/SKILL.md`](./skill/SKILL.md) into `~/.claude/skills/collect-leads/SKILL.md`
(Claude Code) so Claude knows when and how to use the tools.

## Try it
Ask Claude: *"Collect 50 coffee shops in Warsaw from Google Maps and group them
by rating."* Claude calls `collect_maps`, the extension scrapes them, and Claude
analyzes the returned data.

> The browser tab opens in the background. The first map collection after Chrome
> starts may take up to ~1 minute to be picked up (service-worker wake-up); after
> that, jobs are claimed within a few seconds.
