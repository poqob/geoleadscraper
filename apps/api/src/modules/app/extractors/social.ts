import { RawPageData } from './types';

/** Map of canonical platform name -> hostnames that belong to it. */
const PLATFORMS: Record<string, string[]> = {
  facebook: ['facebook.com', 'fb.com'],
  twitter: ['twitter.com', 'x.com'],
  instagram: ['instagram.com'],
  youtube: ['youtube.com', 'youtu.be'],
  linkedin: ['linkedin.com'],
  tiktok: ['tiktok.com'],
  telegram: ['t.me', 'telegram.me'],
  vk: ['vk.com'],
  ok: ['ok.ru'],
  pinterest: ['pinterest.com'],
  whatsapp: ['wa.me', 'api.whatsapp.com'],
  tripadvisor: ['tripadvisor.com'],
};

// Paths on social hosts that are never a business profile.
const IGNORED_EXACT = new Set(['', '/', '/home']);
const IGNORED_PREFIXES = ['/sharer', '/share', '/intent'];

function isIgnoredPath(path: string): boolean {
  if (IGNORED_EXACT.has(path)) return true;
  return IGNORED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}.`));
}

function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

export function platformOf(url: string): string | null {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
  for (const [platform, domains] of Object.entries(PLATFORMS)) {
    if (domains.some((d) => hostMatches(host, d))) return platform;
  }
  return null;
}

/** Strip query/hash/trailing slash and normalize host casing. */
export function normalizeSocialUrl(url: string): string | null {
  try {
    const u = new URL(url);
    u.hash = '';
    u.search = '';
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
    u.protocol = 'https:';
    let normalized = u.toString();
    if (normalized.endsWith('/')) normalized = normalized.slice(0, -1);
    return normalized;
  } catch {
    return null;
  }
}

/**
 * Extract distinct social profile links, one per platform (first seen wins),
 * normalized and de-duplicated.
 */
export function extractSocials(raw: RawPageData): string[] {
  const byPlatform = new Map<string, string>();

  for (const href of raw.hrefs) {
    const platform = platformOf(href);
    if (!platform) continue;

    const normalized = normalizeSocialUrl(href);
    if (!normalized) continue;

    let path: string;
    try {
      path = new URL(normalized).pathname.replace(/\/$/, '');
    } catch {
      continue;
    }
    if (isIgnoredPath(path)) continue;

    if (!byPlatform.has(platform)) byPlatform.set(platform, normalized);
  }

  return Array.from(byPlatform.values());
}
