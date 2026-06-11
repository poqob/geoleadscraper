import { extractPhones } from './phone';
import { RawPageData } from './types';

const raw = (over: Partial<RawPageData>): RawPageData => ({
  text: '',
  hrefs: [],
  jsonLd: [],
  ...over,
});

describe('extractPhones', () => {
  it('parses tel: hrefs into E.164', () => {
    const data = raw({ hrefs: ['tel:+1 (415) 555-2671'] });
    expect(extractPhones(data)).toEqual(['+14155552671']);
  });

  it('finds valid international numbers in text', () => {
    const data = raw({ text: 'Call us: +44 20 7946 0958 today' });
    expect(extractPhones(data)).toEqual(['+442079460958']);
  });

  it('ignores junk number sequences (prices, ids, dates)', () => {
    const data = raw({ text: 'Order #1234567 total $19.99 on 2021-01-01' });
    expect(extractPhones(data)).toEqual([]);
  });

  it('parses national numbers when a default country is given', () => {
    const data = raw({ text: 'Phone: (415) 555-2671' });
    expect(extractPhones(data, 'US')).toEqual(['+14155552671']);
  });

  it('dedupes numbers found in both href and text', () => {
    const data = raw({
      hrefs: ['tel:+14155552671'],
      text: 'or call +1 415 555 2671',
    });
    expect(extractPhones(data)).toEqual(['+14155552671']);
  });
});
