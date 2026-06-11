import { extractSocials, normalizeSocialUrl, platformOf } from './social';
import { RawPageData } from './types';

const raw = (over: Partial<RawPageData>): RawPageData => ({
  text: '',
  hrefs: [],
  jsonLd: [],
  ...over,
});

describe('platformOf', () => {
  it('maps hosts (and aliases) to canonical platforms', () => {
    expect(platformOf('https://www.facebook.com/acme')).toBe('facebook');
    expect(platformOf('https://x.com/acme')).toBe('twitter');
    expect(platformOf('https://t.me/acme')).toBe('telegram');
    expect(platformOf('https://acme.com')).toBeNull();
  });
});

describe('normalizeSocialUrl', () => {
  it('strips query/hash/www/trailing slash and forces https', () => {
    expect(normalizeSocialUrl('http://www.instagram.com/acme/?utm=x#top')).toBe(
      'https://instagram.com/acme',
    );
  });
});

describe('extractSocials', () => {
  it('keeps one normalized link per platform', () => {
    const data = raw({
      hrefs: [
        'https://facebook.com/acme?ref=nav',
        'https://www.facebook.com/acme',
        'https://twitter.com/acme',
      ],
    });
    expect(extractSocials(data)).toEqual([
      'https://facebook.com/acme',
      'https://twitter.com/acme',
    ]);
  });

  it('ignores share/intent and bare-host links', () => {
    const data = raw({
      hrefs: [
        'https://facebook.com/sharer?u=acme.com',
        'https://twitter.com/intent/tweet',
        'https://instagram.com/',
      ],
    });
    expect(extractSocials(data)).toEqual([]);
  });
});
