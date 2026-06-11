import type { CountryCode } from 'libphonenumber-js';
import { bestEmail, extractEmails } from './email';
import { extractPhones } from './phone';
import { extractSocials } from './social';
import { ContactResult, RawPageData } from './types';

export * from './types';
export { extractEmails, bestEmail, isValidEmail, normalizeEmail, deobfuscate } from './email';
export { extractPhones } from './phone';
export { extractSocials, normalizeSocialUrl, platformOf } from './social';

/**
 * Pure extraction entry point: turns raw page data into a structured contact
 * result. No browser/IO here so it can be unit-tested against HTML fixtures.
 */
export function extractContacts(
  url: string,
  raw: RawPageData,
  defaultCountry?: CountryCode,
): ContactResult {
  const emails = extractEmails(raw);
  const phones = extractPhones(raw, defaultCountry);
  const socials = extractSocials(raw);

  return {
    url,
    email: bestEmail(emails),
    emails,
    phones,
    socials,
  };
}
