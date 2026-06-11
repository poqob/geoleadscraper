import { findPhoneNumbersInText, parsePhoneNumberFromString } from 'libphonenumber-js';
import type { CountryCode } from 'libphonenumber-js';
import { RawPageData } from './types';

/** tel: hrefs are explicit and reliable — parse them directly. */
function phonesFromHrefs(hrefs: string[], country?: CountryCode): string[] {
  const result: string[] = [];
  for (const href of hrefs) {
    if (!href.toLowerCase().startsWith('tel:')) continue;
    const raw = decodeURIComponent(href.slice('tel:'.length)).trim();
    const parsed = parsePhoneNumberFromString(raw, country);
    if (parsed?.isValid()) result.push(parsed.number); // E.164
  }
  return result;
}

/**
 * Find phone numbers in visible text. libphonenumber's text scanner is far
 * stricter than a "long sequence of digits" regex, which kills most of the
 * false positives (prices, ids, dates) the legacy implementation produced.
 */
function phonesFromText(text: string, country?: CountryCode): string[] {
  const result: string[] = [];
  for (const { number } of findPhoneNumbersInText(text, country)) {
    if (number.isValid()) result.push(number.number);
  }
  return result;
}

/**
 * Extract distinct, valid phone numbers normalized to E.164.
 * @param defaultCountry fallback region for national-format numbers (e.g. 'US').
 */
export function extractPhones(raw: RawPageData, defaultCountry?: CountryCode): string[] {
  const ordered = [
    ...phonesFromHrefs(raw.hrefs, defaultCountry),
    ...phonesFromText(raw.text, defaultCountry),
  ];
  return Array.from(new Set(ordered));
}
