/**
 * Raw data collected from a page inside the browser context.
 * Kept intentionally serializable so the extraction functions stay pure and
 * unit-testable without a real browser.
 */
export interface RawPageData {
  /** document.body.innerText */
  text: string;
  /** href attribute of every <a> element (includes mailto:/tel:) */
  hrefs: string[];
  /** raw contents of every <script type="application/ld+json"> tag */
  jsonLd: string[];
}

export interface ContactResult {
  url: string;
  /** best single email (highest priority match), if any */
  email?: string;
  emails: string[];
  phones: string[];
  socials: string[];
  _exec?: number;
}
