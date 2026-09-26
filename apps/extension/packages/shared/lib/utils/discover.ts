import { IGoogleMapsExtractItem, fetchGoogleMapsResults } from './extract';
import { altitude } from './geo';
import { sleep, randomize } from './interval';
import { AdaptiveRateLimiter } from './rate-limiter';

export interface ITileBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface IGridTile {
  index: number;
  row: number;
  col: number;
  lat: number;
  lng: number;
  alt: number;
  zoom: number;
  bounds: ITileBounds;
}

/**
 * Checks whether a given (latitude, longitude) coordinate falls within the geographic bounding box
 * of a spatial grid tile, with an optional safety buffer margin to account for building boundaries
 * and avoid dropping places on border intersections.
 */
export function isPointInTileBounds(
  lat: number | undefined,
  lng: number | undefined,
  bounds: ITileBounds,
  bufferRatio = 0.25,
): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  if (lat === 0 && lng === 0) return false;

  const latSpan = Math.abs(bounds.maxLat - bounds.minLat);
  const lngSpan = Math.abs(bounds.maxLng - bounds.minLng);
  const latBuffer = latSpan * bufferRatio;
  const lngBuffer = lngSpan * bufferRatio;

  const minLat = Math.min(bounds.minLat, bounds.maxLat) - latBuffer;
  const maxLat = Math.max(bounds.minLat, bounds.maxLat) + latBuffer;
  const minLng = Math.min(bounds.minLng, bounds.maxLng) - lngBuffer;
  const maxLng = Math.max(bounds.minLng, bounds.maxLng) + lngBuffer;

  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

export interface IDiscoverProgress {
  currentTile: number;
  totalTiles: number;
  totalUnique: number;
  newInTile: number;
  percent: number;
}

export interface IDiscoverGridOptions {
  centerLat: number;
  centerLng: number;
  zoom: number;
  width?: number;
  height?: number;
  language?: string;
  region?: string;
  psi?: string;
  gridSize?: number; // default 4 (4x4)
  zoomOffset?: number; // optional custom offset
  queryKeyword?: string; // explicit query configured by user
  activeMapSearch?: string; // search query currently active in Google Maps URL
  delayMs?: number;
  controller: AbortController;
  onProgress?: (progress: IDiscoverProgress) => void;
  onUpdate?: (items: IGoogleMapsExtractItem[]) => void;
  onCooldownChange?: (coolingDown: boolean, reason?: string) => void;
  onTileStatusChange?: (tileIndex: number, status: 'pending' | 'scanning' | 'completed', newItemsCount?: number) => void;
  onTilesGenerated?: (tiles: IGridTile[]) => void;
}

/**
 * Universal fallback keywords across international locales when no search term is present.
 * Uses broad business/industrial terms to capture factories, manufacturers, companies, and local commerce.
 */
export function getFallbackKeyword(language = 'en'): string {
  const lang = (language || 'en').toLowerCase().split('-')[0];
  switch (lang) {
    case 'tr':
      return 'sanayi fabrika';
    case 'de':
      return 'industrie unternehmen';
    case 'es':
      return 'empresas industria';
    case 'fr':
      return 'entreprises usine';
    case 'it':
      return 'aziende industria';
    case 'nl':
      return 'bedrijven industrie';
    case 'pl':
      return 'firmy przemysl';
    case 'ru':
      return 'предприятия заводы';
    default:
      return 'businesses industrial';
  }
}

/**
 * Generate an NxN spatial grid strictly bounded within the user's visible viewport
 * in snake traversal order to minimize camera jump distance.
 */
export function generateGridTiles({
  centerLat,
  centerLng,
  zoom,
  width = 1280,
  height = 800,
  gridSize = 4,
}: {
  centerLat: number;
  centerLng: number;
  zoom: number;
  width?: number;
  height?: number;
  gridSize?: number;
  zoomOffset?: number;
}): IGridTile[] {
  // Exact Web Mercator ground coverage for the visible viewport
  const cosLat = Math.cos((centerLat * Math.PI) / 180);
  const metersPerPixel = (156543.03392 * Math.max(0.01, cosLat)) / (2 ** zoom);
  const spanHeightMeters = height * metersPerPixel;
  const spanWidthMeters = width * metersPerPixel;

  const degLatPerMeter = 1 / 111320;
  const degLngPerMeter = 1 / (111320 * Math.max(0.1, cosLat));

  const totalDeltaLat = spanHeightMeters * degLatPerMeter;
  const totalDeltaLng = spanWidthMeters * degLngPerMeter;

  // Step between tile centers so the entire viewport is evenly covered
  const stepLat = totalDeltaLat / gridSize;
  const stepLng = totalDeltaLng / gridSize;

  // Sub-zoom scales with the grid division for dense street-level extraction
  const subZoom = Math.min(21, Math.round(zoom + Math.log2(gridSize)));

  const tiles: IGridTile[] = [];
  let index = 1;

  for (let r = 0; r < gridSize; r++) {
    // Row 0 is the TOP of the screen (North, highest latitude)
    // Row gridSize-1 is the BOTTOM of the screen (South, lowest latitude)
    const latOffset = (gridSize - 1 - 2 * r) / 2;
    const tileLat = centerLat + latOffset * stepLat;

    // Snake traversal order (left-to-right on even rows, right-to-left on odd rows)
    const isEven = r % 2 === 0;
    const colIndices: number[] = [];
    for (let c = 0; c < gridSize; c++) colIndices.push(c);
    if (!isEven) colIndices.reverse();

    for (const c of colIndices) {
      // Col 0 is the LEFT of the screen (West, lowest longitude)
      // Col gridSize-1 is the RIGHT of the screen (East, highest longitude)
      const colOffset = (2 * c - (gridSize - 1)) / 2;
      const tileLng = centerLng + colOffset * stepLng;
      const tileAlt = Math.round(altitude({ zoom: subZoom, latitude: tileLat }));

      const bounds: ITileBounds = {
        minLat: tileLat - stepLat / 2,
        maxLat: tileLat + stepLat / 2,
        minLng: tileLng - stepLng / 2,
        maxLng: tileLng + stepLng / 2,
      };

      tiles.push({
        index: index++,
        row: r,
        col: c,
        lat: tileLat,
        lng: tileLng,
        alt: tileAlt,
        zoom: subZoom,
        bounds,
      });
    }
  }

  return tiles;
}

/**
 * Execute spatial grid discovery bounded to the current map view.
 * Scans each tile in snake order, paginates deeply, and deduplicates all places by place_id / CID.
 */
export async function discoverGoogleMapsGrid(
  options: IDiscoverGridOptions,
): Promise<{ data: IGoogleMapsExtractItem[]; results: number }> {
  const {
    centerLat,
    centerLng,
    zoom,
    width = 1280,
    height = 800,
    language = 'en',
    region = '',
    psi = '',
    gridSize = 4,
    queryKeyword,
    activeMapSearch,
    controller,
    onProgress,
    onUpdate,
    onCooldownChange,
    onTileStatusChange,
    onTilesGenerated,
  } = options;

  // 1. Determine search keyword(s):
  // Preference 1: User's explicitly entered target keyword (from magnifying glass popup or settings)
  // Preference 2: Currently active search query from Google Maps URL
  // Preference 3: Universal multilingual commercial fallback keyword
  const rawSearch =
    queryKeyword && queryKeyword.trim().length > 0
      ? queryKeyword.trim()
      : activeMapSearch && activeMapSearch.trim().length > 0
        ? activeMapSearch.trim()
        : getFallbackKeyword(language);

  // If user entered comma-separated terms (e.g. "tekstil, fabrika"), query each
  const searchKeywords = rawSearch.includes(',')
    ? rawSearch.split(',').map(s => s.trim()).filter(Boolean)
    : [rawSearch];

  const tiles = generateGridTiles({
    centerLat,
    centerLng,
    zoom,
    width,
    height,
    gridSize,
  });

  onTilesGenerated?.(tiles);

  const rateLimiter = new AdaptiveRateLimiter({
    controller,
    onCooldownChange,
  });

  const uniqueMap = new Map<string, IGoogleMapsExtractItem>();

  const getDedupeKey = (item: IGoogleMapsExtractItem): string => {
    if (item.place_id) return item.place_id;
    if (item.cid) return item.cid;
    if (item.datafid) return item.datafid;
    return `${item.title || ''}_${item.latitude || 0}_${item.longitude || 0}`;
  };

  for (const tile of tiles) {
    if (controller.signal.aborted) {
      break;
    }

    onTileStatusChange?.(tile.index, 'scanning');

    try {
      let newInTile = 0;

      for (const searchKw of searchKeywords) {
        if (controller.signal.aborted) break;

        let page = 1;
        const maxPagesPerTile = 4; // up to 80 results per tile for high density industrial zones

        while (page <= maxPagesPerTile && !controller.signal.aborted) {
          await rateLimiter.wait();
          if (controller.signal.aborted) break;

          try {
            const res = await fetchGoogleMapsResults({
              search: searchKw,
              lat: tile.lat,
              long: tile.lng,
              alt: tile.alt,
              page,
              take: 20,
              language,
              region,
              psi,
              width,
              height,
            });

            rateLimiter.recordSuccess();

            if (res.data && res.data.length > 0) {
              let inTileCountThisPage = 0;

              for (const item of res.data) {
                // Spatial boundary filtering: strictly verify that the place's coordinates
                // belong within the geographic boundaries of this tile (+25% safety buffer).
                // Rejects places that Google Maps returns from distant regions or previous searches.
                if (!isPointInTileBounds(item.latitude, item.longitude, tile.bounds)) {
                  continue;
                }

                inTileCountThisPage++;
                const key = getDedupeKey(item);
                if (!uniqueMap.has(key)) {
                  uniqueMap.set(key, item);
                  newInTile++;
                }
              }

              // If Google returned places on this page, but none of them fell within this tile's
              // geographic boundaries, Google has expanded into distant regions; break pagination
              // to save rate-limit quota and avoid pulling irrelevant distant data.
              if (inTileCountThisPage === 0 && res.data.length > 0) {
                break;
              }
            }

            // If this page returned fewer than 20 items, there are no more results for this query in this tile
            if (!res.results || res.results < 20) {
              break;
            }

            page++;
          } catch (reqErr: any) {
            console.warn(`[GeoLeadScraper] Tile ${tile.index} page ${page} error:`, reqErr);
            await rateLimiter.handleRateLimit(reqErr?.message || 'Rate limit');
            break;
          }
        }
      }

      onTileStatusChange?.(tile.index, 'completed', newInTile);

      const allItems = Array.from(uniqueMap.values());
      const percent = Math.round((tile.index / tiles.length) * 100);

      if (onProgress) {
        onProgress({
          currentTile: tile.index,
          totalTiles: tiles.length,
          totalUnique: allItems.length,
          newInTile,
          percent,
        });
      }

      if (onUpdate) {
        onUpdate(allItems);
      }
    } catch (err: any) {
      console.warn(`[GeoLeadScraper] Tile ${tile.index} error:`, err);
      await rateLimiter.handleRateLimit(err?.message || 'Rate limit');
    }
  }

  const finalItems = Array.from(uniqueMap.values());
  return {
    data: finalItems,
    results: finalItems.length,
  };
}
