#!/usr/bin/env node
/**
 * GeoLeadScraper MCP server (stdio).
 *
 * Bridges an MCP client (e.g. Claude) to the GeoLeadScraper backend. Collection
 * itself happens in the Chrome extension: `collect_maps` creates a job on the
 * backend, the extension (running in Chrome, with this backend configured)
 * picks it up, scrapes the map and submits the results, which this tool returns.
 *
 * Run:  node mcp-server.mjs   (env: BACKEND_URL, default http://localhost:5050)
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:5050').replace(/\/$/, '');
const POLL_INTERVAL_MS = 2500;
const DEFAULT_TIMEOUT_MS = 300_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path, init) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = text;
  }
  if (!res.ok) {
    throw new Error(`backend ${res.status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
  }
  return body;
}

const ok = (data) => ({ content: [{ type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }] });
const err = (message) => ({ isError: true, content: [{ type: 'text', text: message }] });

const hostOf = (u) => {
  if (!u || typeof u !== 'string') return null;
  try {
    return new URL(u.startsWith('http') ? u : `https://${u}`).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
};

/** Scrape website contacts for the collected businesses and merge them in. */
async function enrichWithContacts(records) {
  const sites = [...new Set(records.map((r) => r.website).filter(Boolean))];
  const byHost = new Map();

  for (let i = 0; i < sites.length; i += 20) {
    const urls = sites.slice(i, i + 20);
    const res = await api('/v1/extract-website', { method: 'POST', body: JSON.stringify({ urls }) }).catch(() => null);
    for (const c of res?.data || []) {
      const host = hostOf(c.url);
      if (host) byHost.set(host, c);
    }
  }

  return records.map((r) => {
    const c = byHost.get(hostOf(r.website));
    if (!c) return r;
    return {
      ...r,
      email: r.email || c.email,
      emails: c.emails,
      phones: (c.phones && c.phones.length ? c.phones.join(', ') : undefined) || r.phones,
      socials: c.socials && c.socials.length ? c.socials.join(', ') : r.socials,
    };
  });
}

const server = new McpServer({ name: 'geoleadscraper', version: '1.0.0' });

server.registerTool(
  'collect_maps',
  {
    title: 'Collect businesses from a map',
    description:
      'Scrape businesses from Google Maps, Yandex Maps or 2GIS for a search query. ' +
      'Requires Chrome open with the GeoLeadScraper extension, configured to point at this backend. ' +
      'The extension opens a background tab, scrapes the results and returns them. ' +
      'Returns an array of business records (name, address, phone, website, rating, etc.).',
    inputSchema: {
      platform: z
        .enum(['google_maps', 'yandex_maps', 'gis'])
        .describe('Which map to scrape. Use google_maps unless asked otherwise.'),
      query: z
        .string()
        .describe('Search query, ideally including a location, e.g. "coffee shops in Warsaw".'),
      limit: z.number().int().min(1).max(10000).optional().describe('Max results to collect (default 200).'),
      extract_contacts: z
        .boolean()
        .optional()
        .describe('Also scrape emails/phones/socials from each business website (slower).'),
      timeout_seconds: z.number().int().min(10).max(900).optional().describe('How long to wait (default 300).'),
    },
  },
  async ({ platform, query, limit, extract_contacts, timeout_seconds }) => {
    let job;
    try {
      job = await api('/v1/jobs', {
        method: 'POST',
        body: JSON.stringify({ platform, query, limit, extractContacts: !!extract_contacts }),
      });
    } catch (e) {
      return err(`Could not reach the backend at ${BACKEND_URL}. Is it running? (${e.message})`);
    }

    const deadline = Date.now() + (timeout_seconds ? timeout_seconds * 1000 : DEFAULT_TIMEOUT_MS);
    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS);
      let current;
      try {
        current = await api(`/v1/jobs/${job.id}`);
      } catch {
        continue;
      }
      if (current.status === 'done') {
        let data = current.data || [];
        if (extract_contacts && data.length) {
          data = await enrichWithContacts(data);
        }
        return ok({ jobId: current.id, platform, query, results: data.length, data });
      }
      if (current.status === 'error') {
        return err(`Collection failed: ${current.error || 'unknown error'}`);
      }
    }

    return err(
      'Timed out waiting for results. Make sure Chrome is open with the GeoLeadScraper extension ' +
        'and its Backend URL points at this server, so it can pick up the job.',
    );
  },
);

server.registerTool(
  'extract_website_contacts',
  {
    title: 'Extract contacts from websites',
    description:
      'Scrape publicly available emails, phone numbers and social links from a list of website URLs ' +
      '(uses the backend directly — no extension needed).',
    inputSchema: {
      urls: z.array(z.string()).min(1).max(20).describe('Website URLs to scrape contacts from.'),
    },
  },
  async ({ urls }) => {
    try {
      const result = await api('/v1/extract-website', { method: 'POST', body: JSON.stringify({ urls }) });
      return ok(result);
    } catch (e) {
      return err(`Failed: ${e.message}`);
    }
  },
);

server.registerTool(
  'list_jobs',
  {
    title: 'List recent collection jobs',
    description: 'List recent collection jobs and their status (pending / running / done / error).',
    inputSchema: {},
  },
  async () => {
    try {
      const jobs = await api('/v1/jobs');
      return ok(
        (jobs || []).map((j) => ({
          id: j.id,
          platform: j.platform,
          query: j.query,
          status: j.status,
          results: j.results,
          error: j.error,
        })),
      );
    } catch (e) {
      return err(`Failed: ${e.message}`);
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
