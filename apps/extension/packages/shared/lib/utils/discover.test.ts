import { describe, expect, it } from 'vitest';
import { generateGridTiles, getFallbackKeyword } from './discover';

describe('discover grid tests', () => {
  describe('getFallbackKeyword', () => {
    it('returns Turkish industrial/business keywords for tr', () => {
      const kw = getFallbackKeyword('tr');
      expect(kw).toContain('sanayi');
      expect(kw).toContain('fabrika');
    });

    it('returns German keywords for de', () => {
      const kw = getFallbackKeyword('de');
      expect(kw).toContain('industrie');
    });

    it('returns English keywords for en and unknown locales', () => {
      expect(getFallbackKeyword('en')).toContain('businesses');
      expect(getFallbackKeyword('xyz')).toContain('businesses');
    });
  });

  describe('generateGridTiles', () => {
    const baseOptions = {
      centerLat: 40.2,
      centerLng: 29.22,
      zoom: 15,
      width: 1280,
      height: 800,
    };

    it('generates 9 tiles for 3x3 grid within viewport bounds', () => {
      const tiles = generateGridTiles({ ...baseOptions, gridSize: 3 });
      expect(tiles).toHaveLength(9);
      expect(tiles[0].index).toBe(1);
      expect(tiles[8].index).toBe(9);

      // Verify all tiles are tightly bounded around center (within ~0.02 lat, ~0.03 lng)
      for (const t of tiles) {
        expect(Math.abs(t.lat - 40.2)).toBeLessThan(0.02);
        expect(Math.abs(t.lng - 29.22)).toBeLessThan(0.04);
        expect(t.alt).toBeGreaterThan(0);
      }
    });

    it('generates 16 tiles for 4x4 grid', () => {
      const tiles = generateGridTiles({ ...baseOptions, gridSize: 4 });
      expect(tiles).toHaveLength(16);
      expect(tiles[15].index).toBe(16);
    });

    it('generates 36 tiles for 6x6 grid in snake traversal order', () => {
      const tiles = generateGridTiles({ ...baseOptions, gridSize: 6 });
      expect(tiles).toHaveLength(36);

      // Row 0 (even): col 0 -> 5 (lng should increase)
      const row0 = tiles.filter(t => t.row === 0);
      expect(row0[0].col).toBe(0);
      expect(row0[5].col).toBe(5);
      expect(row0[5].lng).toBeGreaterThan(row0[0].lng);

      // Row 1 (odd): col 5 -> 0 (lng should decrease, snake reversal)
      const row1 = tiles.filter(t => t.row === 1);
      expect(row1[0].col).toBe(5);
      expect(row1[5].col).toBe(0);
      expect(row1[0].lng).toBeGreaterThan(row1[5].lng);
    });
  });
});
