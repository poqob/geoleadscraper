import { describe, expect, it } from 'vitest';
import {
  bestEmail,
  deobfuscate,
  extractEmailsFromHtml,
  extractPhonesFromHtml,
  extractSocialsFromHtml,
  findContactPageUrl,
  isValidEmail,
  normalizeEmail,
} from './crawler';

describe('crawler unit tests', () => {
  describe('normalizeEmail', () => {
    it('normalizes uppercase, whitespace, and mailto prefix', () => {
      expect(normalizeEmail('  mailto:Info@Domain.COM  ')).toBe('info@domain.com');
      expect(normalizeEmail('HELLO@TEST.ORG')).toBe('hello@test.org');
    });
  });

  describe('deobfuscate', () => {
    it('deobfuscates valid email-like patterns', () => {
      expect(deobfuscate('Contact us at info [at] example [dot] com')).toBe(
        'Contact us at info@example.com',
      );
      expect(deobfuscate('contact (at) company (dot) org')).toBe('contact@company.org');
      expect(deobfuscate('support at company dot net')).toBe('support@company.net');
    });

    it('does not falsely rewrite plain text sentences like "open at 9 dot 30"', () => {
      const sentence = 'We are open at 9 dot 30 in the morning';
      expect(deobfuscate(sentence)).toBe(sentence);
    });
  });

  describe('isValidEmail', () => {
    it('accepts legitimate business emails', () => {
      expect(isValidEmail('info@business.com')).toBe(true);
      expect(isValidEmail('contact.sales@sub.company.org')).toBe(true);
      expect(isValidEmail('kontakt@firma.de')).toBe(true);
    });

    it('rejects image files and invalid domains', () => {
      expect(isValidEmail('logo@2x.png')).toBe(false);
      expect(isValidEmail('icon@banner.jpg')).toBe(false);
      expect(isValidEmail('user@sentry.io')).toBe(false);
      expect(isValidEmail('test@example.com')).toBe(false);
      expect(isValidEmail('invalid..email@domain.com')).toBe(false);
      expect(isValidEmail('no-at-domain.com')).toBe(false);
    });
  });

  describe('bestEmail', () => {
    it('prefers priority localparts', () => {
      const emails = ['john.doe@company.com', 'info@company.com', 'support@company.com'];
      expect(bestEmail(emails)).toBe('info@company.com');
    });

    it('supports multilingual priority localparts (e.g. kontakt, contacto)', () => {
      expect(bestEmail(['dev@company.de', 'kontakt@company.de'])).toBe('kontakt@company.de');
      expect(bestEmail(['team@empresa.es', 'contacto@empresa.es'])).toBe('contacto@empresa.es');
    });

    it('falls back to first email when no priority matches', () => {
      expect(bestEmail(['custom@biz.com', 'other@biz.com'])).toBe('custom@biz.com');
      expect(bestEmail([])).toBeUndefined();
    });
  });

  describe('extractEmailsFromHtml', () => {
    it('extracts emails from mailto: links, JSON-LD, and text', () => {
      const html = `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                "email": "jsonld@company.com"
              }
            </script>
          </head>
          <body>
            <a href="mailto:sales@company.com">Email Us</a>
            <p>Direct inquiries: info [at] company [dot] com</p>
            <img src="avatar@2x.png" />
          </body>
        </html>
      `;
      const emails = extractEmailsFromHtml(html);
      expect(emails).toContain('sales@company.com');
      expect(emails).toContain('jsonld@company.com');
      expect(emails).toContain('info@company.com');
      expect(emails).not.toContain('avatar@2x.png');
    });
  });

  describe('extractPhonesFromHtml', () => {
    it('extracts phones from tel: links and JSON-LD structured data', () => {
      const html = `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "LocalBusiness",
                "telephone": "+1-202-555-0143"
              }
            </script>
          </head>
          <body>
            <a href="tel:+442079460991">Call London Office</a>
            <p>Customer line: +49 (0)30 123456</p>
          </body>
        </html>
      `;
      const phones = extractPhonesFromHtml(html);
      expect(phones.length).toBeGreaterThan(0);
      expect(phones).toContain('+442079460991');
      expect(phones).toContain('+12025550143');
    });
  });

  describe('extractSocialsFromHtml', () => {
    it('extracts supported social media links and ignores share links', () => {
      const html = `
        <html>
          <body>
            <a href="https://www.facebook.com/mybusiness">Facebook</a>
            <a href="https://linkedin.com/company/mybusiness/">LinkedIn</a>
            <a href="https://instagram.com/mybusiness">Instagram</a>
            <a href="https://www.facebook.com/sharer.php?u=foo">Share</a>
          </body>
        </html>
      `;
      const socials = extractSocialsFromHtml(html);
      expect(socials).toContain('https://www.facebook.com/mybusiness');
      expect(socials).toContain('https://linkedin.com/company/mybusiness');
      expect(socials).toContain('https://instagram.com/mybusiness');
      expect(socials.some(s => s.includes('sharer.php'))).toBe(false);
    });
  });

  describe('findContactPageUrl', () => {
    it('finds same-origin contact links', () => {
      const baseUrl = 'https://example.com/';
      const html = `
        <html>
          <body>
            <a href="/contact-us">Contact Us</a>
            <a href="https://other.com/contact">External</a>
          </body>
        </html>
      `;
      const contactUrl = findContactPageUrl(baseUrl, html);
      expect(contactUrl).toBe('https://example.com/contact-us');
    });

    it('returns null when no contact link is found', () => {
      const baseUrl = 'https://example.com/';
      const html = `<html><body><a href="/products">Products</a></body></html>`;
      expect(findContactPageUrl(baseUrl, html)).toBeNull();
    });
  });
});
