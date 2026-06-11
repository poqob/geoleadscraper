export const SOCIAL_DOMAINS = [
  'facebook.com',
  'fb.com',
  'twitter.com',
  'x.com',
  'instagram.com',
  'youtube.com',
  'linkedin.com',
  'tiktok.com',
  'wa.me',
  'api.whatsapp.com',
  'tripadvisor.com',
];

export const EXCLUDED_EMAIL_DOMAINS = [
  'sentry',
  'sentry.io',
  'domain.com',
  'example.com',
  'email.here',
  'email.com',
];

export const PATTERNS = {
  EMAIL: /\b[A-Za-z0-9._%+-]+\s*@\s*[A-Za-z0-9.-]+\.[A-Z|a-z]{2,9}\b/gi,
  SOCIAL_DOMAIN: new RegExp(
    SOCIAL_DOMAINS.map(
      (domain) => `(?:^|\\.)${domain.replace('.', '\\.')}`,
    ).join('|'),
    'i',
  ),
  EXCLUDED_EMAIL_DOMAIN: new RegExp(
    EXCLUDED_EMAIL_DOMAINS.map(
      (domain) => `@.*${domain.replace('.', '\\.')}`,
    ).join('|'),
    'i',
  ),
};
