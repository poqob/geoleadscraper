import { IGoogleMapsExtractItem, fetchGoogleMapsResults } from './extract';
import { altitude } from './geo';
import { sleep, randomize } from './interval';

export interface IGridTile {
  index: number;
  row: number;
  col: number;
  lat: number;
  lng: number;
  alt: number;
  zoom: number;
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
  zoomOffset?: number; // default 1 (1 level deeper zoom)
  queryKeyword?: string;
  delayMs?: number;
  controller: AbortController;
  onProgress?: (progress: IDiscoverProgress) => void;
  onUpdate?: (items: IGoogleMapsExtractItem[]) => void;
}

/**
 * Generate a 4x4 (or NxN) spatial grid around the current map center in snake traversal order.
 */
export function generateGridTiles({
  centerLat,
  centerLng,
  zoom,
  width = 1280,
  height = 800,
  gridSize = 4,
  zoomOffset = 1,
}: {
  centerLat: number;
  centerLng: number;
  zoom: number;
  width?: number;
  height?: number;
  gridSize?: number;
  zoomOffset?: number;
}): IGridTile[] {
  const alt = altitude({ zoom, latitude: centerLat });
  const groundHeightMeters = alt * 0.45;
  const groundWidthMeters = groundHeightMeters * (width / Math.max(1, height));
  const degLatPerMeter = 1 / 111320;
  const degLngPerMeter = 1 / (111320 * Math.max(0.1, Math.cos((centerLat * Math.PI) / 180)));

  const stepLat = (groundHeightMeters / (gridSize / 2)) * degLatPerMeter;
  const stepLng = (groundWidthMeters / (gridSize / 2)) * degLngPerMeter;

  // Offsets centered around 0 (e.g. for gridSize 4: -1.5, -0.5, 0.5, 1.5)
  const offsets: number[] = [];
  for (let i = 0; i < gridSize; i++) {
    offsets.push(i - (gridSize - 1) / 2);
  }

  const tiles: IGridTile[] = [];
  let index = 1;

  for (let r = 0; r < gridSize; r++) {
    const rowOffset = offsets[r];
    const isEven = r % 2 === 0;
    const colIndices: number[] = [];
    for (let c = 0; c < gridSize; c++) colIndices.push(c);
    if (!isEven) colIndices.reverse(); // Snake traversal order

    for (const c of colIndices) {
      const colOffset = offsets[c];
      const tileLat = centerLat + rowOffset * stepLat;
      const tileLng = centerLng + colOffset * stepLng;
      const scanZoom = zoom + zoomOffset;
      const tileAlt = Math.round(altitude({ zoom: scanZoom, latitude: tileLat }));

      tiles.push({
        index: index++,
        row: r,
        col: c,
        lat: tileLat,
        lng: tileLng,
        alt: tileAlt,
        zoom: scanZoom,
      });
    }
  }

  return tiles;
}

/**
 * Execute 4x4 spatial grid discovery without requiring a manual keyword search.
 * Scans each tile with 1 zoom level deeper and deduplicates all places by place_id / CID.
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
    zoomOffset = 1,
    queryKeyword,
    delayMs = 1400,
    controller,
    onProgress,
    onUpdate,
  } = options;

  // Select generic query based on language if not explicitly provided
  const searchKeyword =
    queryKeyword && queryKeyword.trim().length > 0
      ? queryKeyword.trim()
      : language.toLowerCase().startsWith('tr')
        ? 'firmalar'
        : 'businesses';

  const tiles = generateGridTiles({
    centerLat,
    centerLng,
    zoom,
    width,
    height,
    gridSize,
    zoomOffset,
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

    try {
      // 1. Fetch page 1 of this tile
      const res = await fetchGoogleMapsResults({
        search: searchKeyword,
        lat: tile.lat,
        long: tile.lng,
        alt: tile.alt,
        page: 1,
        take: 20,
        language,
        region,
        psi,
        width,
        height,
      });

      let newInTile = 0;
      if (res.data && res.data.length > 0) {
        for (const item of res.data) {
          const key = getDedupeKey(item);
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, item);
            newInTile++;
          }
        }
      }

      // If page 1 was full (20 items), fetch page 2 for deeper coverage if not aborted
      if (res.results >= 20 && !controller.signal.aborted) {
        await sleep(randomize(500));
        if (!controller.signal.aborted) {
          const page2 = await fetchGoogleMapsResults({
            search: searchKeyword,
            lat: tile.lat,
            long: tile.lng,
            alt: tile.alt,
            page: 2,
            take: 20,
            language,
            region,
            psi,
            width,
            height,
          });

          if (page2.data && page2.data.length > 0) {
            for (const item of page2.data) {
              const key = getDedupeKey(item);
              if (!uniqueMap.has(key)) {
                uniqueMap.set(key, item);
                newInTile++;
              }
            }
          }
        }
      }

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
    } catch (err) {
      console.warn(`[GeoLeadScraper] Tile ${tile.index} error:`, err);
    }

    if (!controller.signal.aborted) {
      await sleep(randomize(delayMs));
    }
  }

  const finalItems = Array.from(uniqueMap.values());
  return {
    data: finalItems,
    results: finalItems.length,
  };
}
