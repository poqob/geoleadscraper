import * as puppeteer from 'puppeteer';
import type { CountryCode } from 'libphonenumber-js';

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { performance } from '@/utils';
import { Logger } from '@/modules/logger';
import { PATTERNS, ServiceException, ServiceForbiddenException } from '@/common';

import { extractContacts, ContactResult, RawPageData } from './extractors';

const NAV_TIMEOUT = Number(process.env.EXTRACT_TIMEOUT) || 15000;
const MAX_CONCURRENCY = Number(process.env.EXTRACT_CONCURRENCY) || 5;
const DEFAULT_COUNTRY = (process.env.EXTRACT_DEFAULT_COUNTRY as CountryCode) || undefined;

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Anchor text / hrefs that likely point at a contact page.
const CONTACT_LINK_RE = /contact|contacts|kontakt|контакт|about|impressum|связ/i;
const BLOCKED_RESOURCES = new Set(['image', 'media', 'font']);

/** Run async tasks with a bounded concurrency. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

@Injectable()
export class AppService implements OnModuleInit, OnModuleDestroy {
  private browser: puppeteer.Browser | null = null;

  constructor(private logger: Logger) {}

  async onModuleInit() {
    try {
      await this.getBrowser();
      this.logger.log('puppeteer: ok');
    } catch (error) {
      this.logger.error(`puppeteer: ${error.message}`);
      this.browser = null;
    }
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async getBrowser(): Promise<puppeteer.Browser> {
    if (!this.browser || !this.browser.connected) {
      this.browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
        timeout: 60000,
      });
    }
    return this.browser;
  }

  async extractWebsites({ urls }: { urls: string[] }) {
    try {
      const data = await mapWithConcurrency(urls, MAX_CONCURRENCY, (url) =>
        this.extractWebsite({ url }).catch((e) => {
          this.logger.error(`extract failed for ${url}: ${e.message}`);
          return { url, emails: [], phones: [], socials: [] } as ContactResult;
        }),
      );
      return { data, results: data.length };
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('failed to extract website');
      throw exception;
    }
  }

  async extractWebsite({ url }: { url: string }): Promise<ContactResult> {
    performance.start();

    const normalized = this.normalizeUrl(url);
    if (!normalized) {
      return { url, emails: [], phones: [], socials: [], _exec: performance.complete() };
    }

    let hostname: string;
    try {
      hostname = new URL(normalized).hostname;
    } catch {
      return { url, emails: [], phones: [], socials: [], _exec: performance.complete() };
    }

    // Don't crawl social networks themselves.
    if (PATTERNS.SOCIAL_DOMAIN.test(hostname)) {
      return { url: normalized, emails: [], phones: [], socials: [], _exec: performance.complete() };
    }

    const browser = await this.getBrowser();

    // Scrape the landing page (with one retry), then optionally the contact page.
    let raw = await this.scrapePage(browser, normalized).catch(() => null);
    if (!raw) raw = await this.scrapePage(browser, normalized).catch(() => null);
    if (!raw) {
      return { url: normalized, emails: [], phones: [], socials: [], _exec: performance.complete() };
    }

    let merged = raw;
    const contactUrl = this.findContactLink(raw.hrefs, normalized);
    if (contactUrl) {
      const contactRaw = await this.scrapePage(browser, contactUrl).catch(() => null);
      if (contactRaw) merged = this.mergeRaw(raw, contactRaw);
    }

    const result = extractContacts(normalized, merged, DEFAULT_COUNTRY);
    result._exec = performance.complete();
    return result;
  }

  private normalizeUrl(url: string): string | null {
    if (!url) return null;
    const trimmed = url.trim();
    if (!trimmed) return null;
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }

  /** Load a page (JS enabled, heavy assets blocked) and collect raw contact data. */
  private async scrapePage(browser: puppeteer.Browser, url: string): Promise<RawPageData> {
    const page = await browser.newPage();
    try {
      page.setDefaultTimeout(NAV_TIMEOUT);
      await page.setUserAgent(USER_AGENT);
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        if (BLOCKED_RESOURCES.has(request.resourceType())) request.abort();
        else request.continue();
      });

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });

      return await page.evaluate(() => {
        const hrefs = Array.from(document.querySelectorAll('a[href]')).map(
          (a) => (a as HTMLAnchorElement).href,
        );
        const jsonLd = Array.from(
          document.querySelectorAll('script[type="application/ld+json"]'),
        ).map((s) => s.textContent || '');
        return { text: document.body?.innerText || '', hrefs, jsonLd };
      });
    } finally {
      await page.close().catch(() => undefined);
    }
  }

  private findContactLink(hrefs: string[], baseUrl: string): string | null {
    let baseHost: string;
    try {
      baseHost = new URL(baseUrl).hostname;
    } catch {
      return null;
    }
    for (const href of hrefs) {
      if (!CONTACT_LINK_RE.test(href)) continue;
      try {
        const u = new URL(href, baseUrl);
        if (u.hostname !== baseHost) continue; // stay on-site
        if (u.href.replace(/\/$/, '') === baseUrl.replace(/\/$/, '')) continue;
        return u.href;
      } catch {
        // ignore
      }
    }
    return null;
  }

  private mergeRaw(a: RawPageData, b: RawPageData): RawPageData {
    return {
      text: `${a.text}\n${b.text}`,
      hrefs: [...a.hrefs, ...b.hrefs],
      jsonLd: [...a.jsonLd, ...b.jsonLd],
    };
  }
}
