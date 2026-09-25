/**
 * In-browser native contact scraper (standalone client-side crawler).
 * Visited via fetch from the Chrome Service Worker with <all_urls> permission.
 * No external backend, Node.js or Puppeteer required!
 */

const EMAIL_RE = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,24}/g;
const FILE_EXTENSIONS = /\.(png|jpe?g|gif|svg|webp|css|js|woff2?|ttf|ico)$/i;
const EXCLUDED_DOMAINS = ['sentry', 'sentry.io', 'domain.com', 'example.com', 'email.com', 'wixpress.com'];

const PRIORITY_LOCALPARTS = [
  'info',
  'iletisim',
  'contact',
  'contacts',
  'hello',
  'merhaba',
  'sales',
  'satis',
  'office',
  'ofis',
  'support',
  'destek',
  'admin',
  'mail',
];

const CONTACT_LINK_RE = /(?:contact|contacts|iletisim|iletişim|bize-ulasin|bize-ulaşın|about|hakkimizda|hakkımızda|impressum)/i;

const SOCIAL_DOMAINS = [
  'facebook.com',
  'fb.com',
  'instagram.com',
  'linkedin.com',
  'twitter.com',
  'x.com',
  'youtube.com',
  'youtu.be',
  'tiktok.com',
  'pinterest.com',
];

export interface IExtractedContact {
  url: string;
  email?: string;
  emails: string[];
  phones: string[];
  socials: string[];
  _exec?: number;
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '').replace(/^mailto:/, '');
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/gi, '&')
    .replace(/&#64;|&commat;|&#x40;/gi, '@')
    .replace(/&#46;|&#x2e;/gi, '.')
    .replace(/&nbsp;/gi, ' ');
}

export function deobfuscate(text: string): string {
  return text
    .replace(/\s*[([{]\s*(?:at|@)\s*[)\]}]\s*/gi, '@')
    .replace(/\s+at\s+/gi, '@')
    .replace(/\s*[([{]\s*(?:dot|\.)\s*[)\]}]\s*/gi, '.')
    .replace(/\s+dot\s+/gi, '.');
}

export function isValidEmail(email: string): boolean {
  if (!email.includes('@')) return false;
  const [local, domain] = email.split('@');
  if (!local || !domain) return false;
  if (!domain.includes('.')) return false;
  if (FILE_EXTENSIONS.test(email)) return false;
  if (/\.\./.test(email)) return false;
  if (email.startsWith('.') || local.endsWith('.')) return false;
  if (EXCLUDED_DOMAINS.some(d => domain.includes(d))) return false;
  return /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,24}$/.test(email);
}

export function bestEmail(emails: string[]): string | undefined {
  if (emails.length === 0) return undefined;
  for (const localpart of PRIORITY_LOCALPARTS) {
    const match = emails.find(e => e.split('@')[0] === localpart);
    if (match) return match;
  }
  return emails[0];
}

function extractEmailsFromHtml(html: string): string[] {
  const candidates: string[] = [];

  // 1. mailto: links (highest reliability)
  const mailtoMatches = html.matchAll(/href=["']mailto:([^"'?]+)[^"']*["']/gi);
  for (const m of mailtoMatches) {
    if (m[1]) candidates.push(normalizeEmail(decodeURIComponent(m[1])));
  }

  // 2. JSON-LD blocks
  const jsonLdBlocks = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const block of jsonLdBlocks) {
    try {
      const parsed = JSON.parse(block[1]);
      const walk = (node: any) => {
        if (!node) return;
        if (Array.isArray(node)) return node.forEach(walk);
        if (typeof node === 'object') {
          for (const [key, val] of Object.entries(node)) {
            if (key.toLowerCase() === 'email' && typeof val === 'string') {
              candidates.push(normalizeEmail(val));
            } else {
              walk(val);
            }
          }
        }
      };
      walk(parsed);
    } catch {
      // ignore invalid json
    }
  }

  // 3. Text emails (deobfuscated + entity decoded)
  const cleanText = deobfuscate(
    decodeHtmlEntities(
      html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' '),
    ),
  );
  const textMatches = cleanText.match(EMAIL_RE) || [];
  for (const em of textMatches) {
    candidates.push(normalizeEmail(em));
  }

  // Deduplicate & filter
  const seen = new Set<string>();
  const valid: string[] = [];
  for (const email of candidates) {
    if (!isValidEmail(email)) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    valid.push(email);
  }

  return valid;
}

function extractPhonesFromHtml(html: string): string[] {
  const phones: string[] = [];

  // 1. tel: links
  const telMatches = html.matchAll(/href=["']tel:([^"'\s]+)["']/gi);
  for (const m of telMatches) {
    const raw = decodeURIComponent(m[1]).trim().replace(/[^\d+]/g, '');
    if (raw.length >= 7) phones.push(raw);
  }

  // 2. Generic phone patterns (+90 5XX XXX XX XX, 05XX XXX XX XX, etc.)
  const phoneRegex = /(?:\+90|0)?\s*[1-9]\d{2}\s*\d{3}\s*\d{2}\s*\d{2}/g;
  const matches = html.match(phoneRegex) || [];
  for (const p of matches) {
    const clean = p.replace(/\s+/g, '');
    if (clean.length >= 10 && clean.length <= 13) {
      phones.push(clean);
    }
  }

  return Array.from(new Set(phones)).slice(0, 5);
}

function extractSocialsFromHtml(html: string): string[] {
  const socials: string[] = [];
  const hrefMatches = html.matchAll(/href=["'](https?:\/\/[^"'\s>]+)["']/gi);

  for (const m of hrefMatches) {
    const link = m[1];
    try {
      const parsed = new URL(link);
      const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
      if (SOCIAL_DOMAINS.some(d => host === d || host.endsWith(`.${d}`))) {
        // Exclude share links
        if (!link.includes('/share') && !link.includes('/intent') && !link.includes('sharer.php')) {
          socials.push(link.replace(/\/$/, ''));
        }
      }
    } catch {
      // ignore invalid URLs
    }
  }

  return Array.from(new Set(socials)).slice(0, 10);
}

function findContactPageUrl(baseUrl: string, html: string): string | null {
  try {
    const origin = new URL(baseUrl).origin;
    const aTags = html.matchAll(/<a[^>]*href=["']([^"'#\s]+)["'][^>]*>([\s\S]*?)<\/a>/gi);

    for (const tag of aTags) {
      const href = tag[1].trim();
      const text = tag[2].trim();

      if (CONTACT_LINK_RE.test(href) || CONTACT_LINK_RE.test(text)) {
        try {
          const resolved = new URL(href, baseUrl);
          // Only stay within the same domain
          if (resolved.origin === origin && resolved.href !== baseUrl) {
            return resolved.href;
          }
        } catch {
          // ignore invalid relative url
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

async function fetchWithTimeout(url: string, timeoutMs = 6000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) return '';
    const contentType = response.headers.get('content-type') || '';
    if (contentType && !contentType.includes('text/') && !contentType.includes('xml')) {
      return '';
    }
    return await response.text();
  } catch {
    clearTimeout(timer);
    return '';
  }
}

export async function crawlWebsite(rawUrl: string): Promise<IExtractedContact> {
  const startTime = Date.now();
  try {
    let url = rawUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    let html = await fetchWithTimeout(url, 6000);

    // If first attempt failed, attempt alternate protocol fallback (https <-> http)
    if (!html) {
      const altUrl = url.startsWith('https://')
        ? url.replace(/^https:\/\//i, 'http://')
        : url.replace(/^http:\/\//i, 'https://');
      html = await fetchWithTimeout(altUrl, 3500);
    }

    if (!html) {
      return {
        url: rawUrl,
        emails: [],
        phones: [],
        socials: [],
        _exec: Date.now() - startTime,
      };
    }

    let emails = extractEmailsFromHtml(html);
    const phones = extractPhonesFromHtml(html);
    const socials = extractSocialsFromHtml(html);

    // If no email found on homepage, crawl contact page if present
    if (emails.length === 0) {
      const contactUrl = findContactPageUrl(url, html);
      if (contactUrl) {
        const contactHtml = await fetchWithTimeout(contactUrl, 3500);
        if (contactHtml) {
          const contactEmails = extractEmailsFromHtml(contactHtml);
          const contactPhones = extractPhonesFromHtml(contactHtml);
          emails = Array.from(new Set([...emails, ...contactEmails]));
          for (const p of contactPhones) {
            if (!phones.includes(p)) phones.push(p);
          }
        }
      }
    }

    return {
      url: rawUrl,
      email: bestEmail(emails),
      emails,
      phones,
      socials,
      _exec: Date.now() - startTime,
    };
  } catch (err) {
    return {
      url: rawUrl,
      emails: [],
      phones: [],
      socials: [],
      _exec: Date.now() - startTime,
    };
  }
}

/**
 * Concurrency worker pool: crawls multiple URLs concurrently with a maximum parallel limit.
 */
export async function crawlWebsitesConcurrently(
  urls: string[],
  concurrency = 8,
): Promise<{ data: IExtractedContact[]; results: number }> {
  const results: IExtractedContact[] = new Array(urls.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(concurrency, urls.length) }, async () => {
    while (cursor < urls.length) {
      const index = cursor++;
      try {
        results[index] = await crawlWebsite(urls[index]);
      } catch {
        results[index] = {
          url: urls[index],
          emails: [],
          phones: [],
          socials: [],
          _exec: 0,
        };
      }
    }
  });

  await Promise.all(workers);

  return {
    data: results,
    results: results.length,
  };
}
