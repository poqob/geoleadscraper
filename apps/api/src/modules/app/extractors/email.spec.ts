import { bestEmail, deobfuscate, extractEmails, isValidEmail, normalizeEmail } from './email';
import { RawPageData } from './types';

const raw = (over: Partial<RawPageData>): RawPageData => ({
  text: '',
  hrefs: [],
  jsonLd: [],
  ...over,
});

describe('normalizeEmail', () => {
  it('lowercases, trims and strips spaces / mailto', () => {
    expect(normalizeEmail('  Info@Example.COM ')).toBe('info@example.com');
    expect(normalizeEmail('mailto:Hello@Site.io')).toBe('hello@site.io');
  });
});

describe('isValidEmail', () => {
  it('accepts well-formed addresses', () => {
    expect(isValidEmail('info@example.org')).toBe(true);
  });
  it('rejects image filenames and junk', () => {
    expect(isValidEmail('logo@2x.png')).toBe(false);
    expect(isValidEmail('foo@@bar.com')).toBe(false);
    expect(isValidEmail('foo@bar')).toBe(false);
    expect(isValidEmail('a..b@bar.com')).toBe(false);
  });
});

describe('deobfuscate', () => {
  it('decodes (at)/(dot) obfuscation', () => {
    expect(deobfuscate('john (at) example (dot) com')).toBe('john@example.com');
    expect(deobfuscate('jane at example dot com')).toBe('jane@example.com');
  });
});

describe('extractEmails', () => {
  it('prefers mailto: hrefs, then text, deduped', () => {
    const data = raw({
      hrefs: ['mailto:contact@acme.com?subject=hi', '/about'],
      text: 'reach us at sales@acme.com or contact@acme.com',
    });
    expect(extractEmails(data)).toEqual(['contact@acme.com', 'sales@acme.com']);
  });

  it('pulls emails out of JSON-LD', () => {
    const data = raw({
      jsonLd: [JSON.stringify({ '@type': 'Organization', email: 'hi@jsonld.com' })],
    });
    expect(extractEmails(data)).toContain('hi@jsonld.com');
  });

  it('filters excluded/junk domains', () => {
    const data = raw({ text: 'noreply@sentry.io support@example.com real@business.com' });
    expect(extractEmails(data)).toEqual(['real@business.com']);
  });

  it('decodes obfuscated emails from text', () => {
    const data = raw({ text: 'write to john (at) shop (dot) com' });
    expect(extractEmails(data)).toContain('john@shop.com');
  });
});

describe('bestEmail', () => {
  it('prefers role addresses over personal ones', () => {
    expect(bestEmail(['john.doe@acme.com', 'info@acme.com'])).toBe('info@acme.com');
  });
  it('falls back to the first when no role address', () => {
    expect(bestEmail(['john.doe@acme.com'])).toBe('john.doe@acme.com');
  });
  it('returns undefined for empty input', () => {
    expect(bestEmail([])).toBeUndefined();
  });
});
