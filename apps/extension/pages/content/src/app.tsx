import { useEffect, useRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';

import {
  extractGoogleMapsResults,
  createIframe,
  extractYandexMapsResults,
  DataPlatform,
  extract2GisMapsResults,
  getGoogleMapsConfig,
  getIframeById,
  sendBackgroundEvent,
  matchExportResults,
  logger,
  exportResults,
  sleep,
  extractWebsiteResults,
  discoverGoogleMapsGrid,
  storage,
  type IDiscoverProgress,
} from '@chrome-extension/shared/lib';
import { Button, Stack, Spinner, AppProvider, Logo } from '@chrome-extension/shared/components';
import {
  BACKGROUND_EVENTS,
  DATA_EXPORT_BASIC_FIELDS,
  DATA_EXPORT_FIELDS,
  DATA_EXPORT_FORMATS,
  DATA_PARSING_MODES,
  DATA_PLATFORMS,
} from '@chrome-extension/shared/enums';

import { ContentContext, IContentContextState } from '@/context';
import { Layout } from '@/layout';
import { config } from '@chrome-extension/shared';

const { EXTRACT_LIMIT } = config;
const IFRAME_ID = 'mapscan-frame';

const getStyles = ({ position, platform }: { position: string; platform: string }): string => {
  const className =
    'fixed shadow-md top-[60px] z-50 flex text-black bg-white border border-solid border-gray-200 rounded-md w-[325px] h-auto';

  switch (position) {
    case 'right':
      return twMerge(className, 'right-[20px]');
    case 'left':
      if (platform === DATA_PLATFORMS.GOOGLE_MAPS) {
        return twMerge(className, 'left-[501px]');
      }
      return twMerge(className, 'left-[428px]');
    default:
      return className;
  }
};

const getRequestInterval = ({ platform }: { platform: DataPlatform }): number => {
  let interval = 1000;

  if (!platform) return interval;

  switch (platform) {
    case DATA_PLATFORMS.GOOGLE_MAPS:
      interval = config.REQUEST_INTERVAL.GOOGLE_MAPS;
      break;
    case DATA_PLATFORMS.YANDEX_MAPS:
      interval = config.REQUEST_INTERVAL.YANDEX_MAPS;
      break;
    case DATA_PLATFORMS.GIS:
      interval = config.REQUEST_INTERVAL.GIS_MAPS;
      break;
  }

  return interval;
};

// For auto-collection: wait until the page is actually ready to extract.
// Google needs the @lat,long to appear in the URL after the SPA settles.
const waitForExtractable = async (platform: DataPlatform): Promise<void> => {
  const deadline = Date.now() + 20000;
  if (platform !== DATA_PLATFORMS.GOOGLE_MAPS) {
    await sleep(3000);
    return;
  }
  while (Date.now() < deadline) {
    const cfg = await getGoogleMapsConfig().catch(() => null);
    if (cfg && cfg.lat && cfg.long && cfg.search) return;
    await sleep(1000);
  }
};

const App = ({ platform }: { platform: DataPlatform }) => {
  const [state, setState] = useState<IContentContextState>({
    platform,
    mode: DATA_PARSING_MODES.INTERVAL,
    position: 'left',
    search: null,
    results: 0,
    data: [],
    initiated: false,
    paused: false,
    extracting: false,
    completed: false,
    page: 1,
    pages: 0,
    current: 0,
    total: 0,
    backend_available: false,
    extract_websites: false,
    request_interval: 0,
    auto_download: false,
    enrich_missing: false,
    discover_query: '',
    discover_grid_size: 4,
    export_format: DATA_EXPORT_FORMATS.CSV,
    export_fields: [],
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [enrichmentProgress, setEnrichmentProgress] = useState<{ current: number; total: number } | null>(null);
  const [discoverProgress, setDiscoverProgress] = useState<IDiscoverProgress | null>(null);
  const [isDiscoverMode, setIsDiscoverMode] = useState<boolean>(false);
  const [showDiscoverSettings, setShowDiscoverSettings] = useState<boolean>(false);
  const [discoverQueryInput, setDiscoverQueryInput] = useState<string>('');
  const isTypingQueryRef = useRef<boolean>(false);

  const stateRef = useRef(state);
  const controllerRef = useRef<AbortController | null>(null);
  // Set when this tab was opened by the backend for an MCP auto-collection job.
  const autoJobRef = useRef<{ id: string; limit: number; extractContacts: boolean } | null>(null);

  const { completed, initiated, results, position, auto_download: autoDownload, extracting, backend_available } = state;

  const styles = getStyles({ platform, position });

  const extract = async (options?: { page: number; next: boolean; extractWebsites?: boolean }) => {
    // Website contact enrichment uses the standalone in-browser crawler or backend.
    const extractWebsites = !!options?.extractWebsites;
    const url = document.location.href;
    const page = options?.page ? options.page : stateRef.current.page;
    const limit = autoJobRef.current?.limit || EXTRACT_LIMIT;
    const controller = controllerRef.current as AbortController;
    const interval = getRequestInterval({ platform });

    let query: any = {};

    switch (platform) {
      case DATA_PLATFORMS.GOOGLE_MAPS:
        query = await getGoogleMapsConfig().catch(() => null);

        await extractGoogleMapsResults({
          query,
          state: {
            value: state,
            update: callback => setState(state => ({ ...state, ...callback(state) })),
          },
          timeout: interval,
          extractWebsites,
          page,
          limit,
          controller,
          complete,
          onRequestComplete,
        });
        break;
      case DATA_PLATFORMS.YANDEX_MAPS:
        await extractYandexMapsResults({
          state: {
            value: state,
            update: callback => setState(state => ({ ...state, ...callback(state) })),
          },
          timeout: interval,
          page,
          limit,
          controller,
          extractWebsites,
          document: getIframeById(IFRAME_ID) as Document,
          complete,
          onRequestComplete,
        });
        break;
      case DATA_PLATFORMS.GIS:
        await extract2GisMapsResults({
          state: {
            value: state,
            update: callback => setState(state => ({ ...state, ...callback(state) })),
          },
          url,
          timeout: interval,
          extractWebsites,
          limit,
          page,
          controller,
          complete,
          onRequestComplete,
        });
        break;
      default:
        break;
    }
  };

  const complete = ({ results }: { results: number }) => {
    const controller = controllerRef.current;
    if (controller) controller.abort();

    logger('extract completed', { platform, results });

    setState(state => ({
      ...state,
      extracting: false,
      paused: false,
      completed: true,
    }));
  };

  const onRequestComplete = async ({ data, results }: { data: any[]; results: number }) => {
    const interval = getRequestInterval({ platform });
    logger('extract request', { platform, interval, data, results });
  };

  const pause = () => {
    const controller = controllerRef.current;
    logger('extract paused', { platform, results: state.results });
    if (controller) controller.abort();

    setState(state => ({ ...state, extracting: false, paused: true }));
  };

  const stop = async () => {
    const controller = controllerRef.current;
    logger('extract stopped', { platform, results: state.results });
    if (controller) controller.abort();

    setState(state => ({
      ...state,
      initiated: true,
      completed: true,
      extracting: false,
      paused: false,
    }));
  };

  const getPlatform = () => {
    let position: 'left' | 'right' = 'left';
    let mode = '';

    switch (platform) {
      case DATA_PLATFORMS.GOOGLE_MAPS:
      case DATA_PLATFORMS.YANDEX_MAPS:
        position = 'left';
        mode = DATA_PARSING_MODES.INTERVAL;
        break;
      case DATA_PLATFORMS.GIS:
        position = 'right';
        mode = DATA_PARSING_MODES.PAGE;
        break;
    }

    setState(state => ({ ...state, position, mode }));
  };

  const checkBackend = async () => {
    const { data } = await sendBackgroundEvent<{ available: boolean }>({ type: BACKGROUND_EVENTS.CHECK_BACKEND });
    setState(state => ({ ...state, backend_available: !!data?.available }));
  };

  const getSettings = async () => {
    const { data } = await sendBackgroundEvent({ type: BACKGROUND_EVENTS.GET_STORE });
    const {
      export_format,
      auto_download,
      export_fields,
      request_interval,
      enrich_missing,
      discover_query,
      discover_grid_size,
    } = data || {};

    const extract_websites = ((export_fields as string[]) || []).some(field =>
      [DATA_EXPORT_FIELDS.EMAIL, DATA_EXPORT_FIELDS.PHONES, DATA_EXPORT_FIELDS.SOCIALS].includes(field),
    );

    const storedGridSize = discover_grid_size !== undefined ? Number(discover_grid_size) : 4;
    const storedQuery = discover_query !== undefined ? discover_query : '';

    if (!isTypingQueryRef.current) {
      setDiscoverQueryInput(storedQuery);
    }

    setState(state => ({
      ...state,
      extract_websites,
      export_format,
      auto_download,
      export_fields: Array.isArray(export_fields) ? export_fields : [],
      request_interval,
      enrich_missing: enrich_missing !== undefined ? enrich_missing : true,
      discover_query: isTypingQueryRef.current ? state.discover_query : storedQuery,
      discover_grid_size: storedGridSize,
    }));
  };

  const init = async () => {
    setLoading(true);
    getPlatform();
    await Promise.all([getSettings(), checkBackend()]);
    setLoading(false);
  };

  const enrichMissingContacts = async (items: any[]): Promise<any[]> => {
    const targets = (items || []).filter(
      (item: any) => item?.website && (!item.email || !item.phone),
    );
    if (targets.length === 0) return items;

    const urls = Array.from(new Set(targets.map((item: any) => item.website.trim()).filter(Boolean)));
    if (urls.length === 0) return items;

    setEnrichmentProgress({ current: 0, total: urls.length });

    const BATCH_SIZE = 6;
    const allExtractedData: any[] = [];

    try {
      for (let i = 0; i < urls.length; i += BATCH_SIZE) {
        const chunk = urls.slice(i, i + BATCH_SIZE);
        const res: any = await extractWebsiteResults({ urls: chunk });
        const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
        if (list.length > 0) {
          allExtractedData.push(...list);
        }
        const processed = Math.min(i + chunk.length, urls.length);
        setEnrichmentProgress({ current: processed, total: urls.length });
      }

      console.log(`[GeoLeadScraper] Finished enrichment crawl. Extracted ${allExtractedData.length} website results.`);

      const normalize = (u: string) =>
        u ? u.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '') : '';

      const byNormalizedUrl: Record<string, any> = {};
      for (const r of allExtractedData) {
        if (r?.url) {
          const key = normalize(r.url);
          byNormalizedUrl[key] = r;
          const hostOnly = key.split('/')[0];
          if (hostOnly && !byNormalizedUrl[hostOnly]) {
            byNormalizedUrl[hostOnly] = r;
          }
        }
      }

      const updatedData = (items || []).map(item => {
        if (!item?.website) return item;
        const key = normalize(item.website);
        const hostOnly = key.split('/')[0];
        const r = byNormalizedUrl[key] || byNormalizedUrl[hostOnly];
        if (!r) return item;

        return {
          ...item,
          email: !item.email && r.email ? r.email : item.email,
          phone: !item.phone && r.phones?.[0] ? r.phones[0] : item.phone,
          phones: r.phones?.length ? r.phones.join(', ') : item.phones,
        };
      });

      setState(prev => ({ ...prev, data: updatedData }));
      return updatedData;
    } catch (err) {
      console.error('[GeoLeadScraper] Website enrichment failed:', err);
      return items;
    } finally {
      await sleep(500);
      setEnrichmentProgress(null);
    }
  };

  const handlers = {
    pause,
    stop,
    start: async () => {
      const page = 1;
      const interval = getRequestInterval({ platform });
      const extractWebsites = state.extract_websites || false;

      logger('extract', { platform, interval });

      controllerRef.current = new AbortController();

      setState(state => ({ ...state, initiated: true, extracting: true, paused: false, page }));

      await extract({ page, next: true, extractWebsites });
    },
    extractStartClick: async () => {
      setState(state => ({ ...state, initiated: true, extracting: true }));

      if (platform === DATA_PLATFORMS.YANDEX_MAPS) {
        await createIframe({ url: document.location.href, id: IFRAME_ID });
      }

      handlers.start();
    },
    resume: async () => {
      const page = state.page + 1;
      const extractWebsites = state.extract_websites || false;

      controllerRef.current = new AbortController();
      logger('extract resume', { page });

      setState(state => ({ ...state, initiated: true, extracting: true, paused: false }));

      await extract({ page, extractWebsites, next: true });
    },
    updateDiscoverQuery: (query: string) => {
      setDiscoverQueryInput(query);
      setState(prev => ({ ...prev, discover_query: query }));
      storage.update(s => ({ ...s, discover_query: query.trim() }));
      sendBackgroundEvent({
        type: BACKGROUND_EVENTS.SET_STORE,
        payload: { store: { discover_query: query.trim() } },
      });
    },
    updateDiscoverGridSize: (size: number) => {
      setState(prev => ({ ...prev, discover_grid_size: size }));
      storage.update(s => ({ ...s, discover_grid_size: size }));
      sendBackgroundEvent({
        type: BACKGROUND_EVENTS.SET_STORE,
        payload: { store: { discover_grid_size: size } },
      });
    },
    discover: async () => {
      if (platform !== DATA_PLATFORMS.GOOGLE_MAPS) return;

      const query = await getGoogleMapsConfig().catch(() => null);
      if (!query || !query.lat || !query.long) {
        console.warn('[GeoLeadScraper] Could not determine coordinates for Discover mode');
        return;
      }

      const gridSize = state.discover_grid_size || 4;
      const totalTiles = gridSize * gridSize;
      const queryKeyword =
        state.discover_query && state.discover_query.trim().length > 0 ? state.discover_query.trim() : undefined;

      controllerRef.current = new AbortController();
      setIsDiscoverMode(true);
      setState(state => ({
        ...state,
        initiated: true,
        extracting: true,
        completed: false,
        paused: false,
        results: 0,
        data: [],
      }));

      setDiscoverProgress({
        currentTile: 0,
        totalTiles,
        totalUnique: 0,
        newInTile: 0,
        percent: 0,
      });

      try {
        const { data } = await discoverGoogleMapsGrid({
          centerLat: query.lat,
          centerLng: query.long,
          zoom: query.zoom,
          width: query.width,
          height: query.height,
          language: query.language,
          region: query.region,
          psi: query.psi,
          gridSize,
          zoomOffset: 1,
          queryKeyword,
          controller: controllerRef.current,
          onProgress: p => setDiscoverProgress(p),
          onUpdate: items => {
            setState(prev => ({
              ...prev,
              data: items,
              results: items.length,
            }));
          },
        });

        setState(prev => ({
          ...prev,
          data,
          results: data.length,
          extracting: false,
          completed: true,
          paused: false,
        }));
      } catch (err) {
        console.error('[GeoLeadScraper] Discover failed:', err);
        setState(prev => ({ ...prev, extracting: false, completed: true }));
      } finally {
        await sleep(500);
        setDiscoverProgress(null);
        setIsDiscoverMode(false);
      }
    },
    reset: () => {
      if (controllerRef.current) controllerRef.current.abort();
      setDiscoverProgress(null);
      setIsDiscoverMode(false);
      setShowDiscoverSettings(false);
      setEnrichmentProgress(null);

      setState(state => ({
        ...state,
        initiated: false,
        extracting: false,
        completed: false,
        paused: false,
        results: 0,
        data: [],
        page: 1,
      }));

      const iframe = document.getElementById(IFRAME_ID);
      if (iframe) iframe.remove();
    },
    export: async () => {
      try {
        // Read the current settings at export time so the selected export
        // fields are always up to date (avoids any stale-state mismatch).
        const settings = await sendBackgroundEvent({ type: BACKGROUND_EVENTS.GET_STORE });
        const store =
          (settings?.data as { export_format?: string; export_fields?: string[]; enrich_missing?: boolean }) || {};

        const format = store.export_format || state.export_format || DATA_EXPORT_FORMATS.CSV;

        // The columns to export = the user's selection (validated). Fall back to
        // the basic fields when nothing is selected — never dump every column.
        let fields = matchExportResults(
          Array.isArray(store.export_fields) ? store.export_fields : state.export_fields,
        );
        if (fields.length === 0) fields = [...DATA_EXPORT_BASIC_FIELDS];

        const prefix = [config.EXPORT_FILE_NAME_PREFIX, platform].join('-');

        const shouldEnrich =
          store.enrich_missing !== undefined ? store.enrich_missing : (state.enrich_missing ?? true);

        let exportItems = state.data || [];
        if (shouldEnrich) {
          exportItems = await enrichMissingContacts(exportItems);
        }

        // Build each row using ONLY the selected fields, ensuring empty fields are preserved
        const data =
          exportItems.map(item => {
            const result: { [key: string]: number | string | boolean } = {};
            for (const field of fields) {
              const val = (item as Record<string, any>)[field];
              result[field] = val !== undefined && val !== null ? val : '';
            }
            return result;
          }) || [];

        logger('export', { format, results: data.length, fields });

        exportResults({ format, prefix, fields, data });
      } catch (e) {
        // Surface failures to the page console for debugging instead of failing silently.
        console.error('geoleadscraper export error:', (e as Error)?.message, (e as Error)?.stack);
      }
    },
  };

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!completed) return;

    // Auto-collection job: hand the results back to the backend (via the
    // background worker) and let it close this tab. No file download.
    if (autoJobRef.current) {
      const job = autoJobRef.current;
      autoJobRef.current = null;
      sendBackgroundEvent({
        type: BACKGROUND_EVENTS.SUBMIT_JOB_RESULTS,
        payload: { jobId: job.id, data: state.data, results: state.results },
      });
      return;
    }

    if (autoDownload) handlers.export();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completed]);

  // Auto-collection: if this tab was opened by the backend for an MCP job,
  // start extracting once the page is ready and report the results back.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await sendBackgroundEvent<{ job: { id: string; limit: number; extractContacts: boolean } | null }>({
        type: BACKGROUND_EVENTS.CONTENT_READY,
      }).catch(() => ({ data: null }) as { data: null });

      const job = res?.data?.job;
      if (!job || cancelled) return;

      autoJobRef.current = { id: job.id, limit: job.limit, extractContacts: !!job.extractContacts };
      logger('auto-collect job', { id: job.id, platform });

      await waitForExtractable(platform);
      if (cancelled) return;

      handlers.extractStartClick();
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    init();

    const interval = setInterval(() => {
      getSettings();
    }, 500);

    return () => {
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppProvider>
      <ContentContext.Provider
        value={{
          context: state,
          setContext: context => {
            setState(state => ({ ...state, ...context }));
          },
        }}>
        {loading ? (
          <></>
        ) : (
          <div className={styles}>
            <Layout>
              <div className="w-full flex flex-col gap-2">
                <div className="w-full flex flex-col">
                  <div className="w-full flex flex-row justify-between items-center">
                    <Logo size="sm" />
                    <div>{(extracting || enrichmentProgress !== null || discoverProgress !== null) && <Spinner />}</div>
                  </div>
                  <div className="mt-4 w-full flex flex-col gap-2 text-sm">
                    {extracting ? (
                      <div>
                        <span>
                          {isDiscoverMode
                            ? `Discovering area (${results} places found)`
                            : `Extracting ${results >= 1 ? `(${results})` : '..'}`}
                        </span>
                      </div>
                    ) : initiated ? (
                      <div>
                        <span>Results: {results}</span>
                      </div>
                    ) : (
                      <></>
                    )}

                    {/* Live Progress Bar during Grid Discovery */}
                    {discoverProgress !== null && (
                      <div className="mt-2 w-full flex flex-col gap-1.5 p-2.5 bg-blue-50/70 rounded-md border border-blue-200 shadow-sm">
                        <div className="flex justify-between items-center text-xs font-semibold text-blue-900">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                            Discovering {state.discover_grid_size || 4}x{state.discover_grid_size || 4} Grid...
                          </span>
                          <span className="text-blue-700 font-bold">
                            Tile {discoverProgress.currentTile} / {discoverProgress.totalTiles} ({discoverProgress.percent}%)
                          </span>
                        </div>
                        <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                            style={{
                              width: `${discoverProgress.percent}%`,
                            }}
                          />
                        </div>
                        <span className="text-[11px] text-blue-700/80 font-medium">
                          Found {discoverProgress.totalUnique} unique places so far...
                        </span>
                      </div>
                    )}

                    {/* Live Progress Bar during enrichment */}
                    {enrichmentProgress !== null && (
                      <div className="mt-2 w-full flex flex-col gap-1.5 p-2.5 bg-neutral-100 rounded-md border border-neutral-300 shadow-sm">
                        <div className="flex justify-between items-center text-xs font-semibold text-neutral-800">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Enriching contacts...
                          </span>
                          <span className="text-emerald-700 font-bold">
                            {enrichmentProgress.current} / {enrichmentProgress.total} ({Math.round((enrichmentProgress.current / Math.max(1, enrichmentProgress.total)) * 100)}%)
                          </span>
                        </div>
                        <div className="w-full bg-neutral-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-emerald-600 h-2 rounded-full transition-all duration-300 ease-out"
                            style={{
                              width: `${Math.round((enrichmentProgress.current / Math.max(1, enrichmentProgress.total)) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-[11px] text-neutral-500">
                          Scanning {enrichmentProgress.total} websites found in {results} places...
                        </span>
                      </div>
                    )}

                    <div className="mt-2 flex flex-col">
                      {initiated ? (
                        <Stack>
                          {extracting ? (
                            <>
                              {platform === DATA_PLATFORMS.GOOGLE_MAPS && (
                                <Button variant="secondary" size="sm" onClick={handlers.pause}>
                                  Pause
                                </Button>
                              )}
                              {(platform === DATA_PLATFORMS.YANDEX_MAPS || platform === DATA_PLATFORMS.GIS) && (
                                <Button variant="secondary" size="sm" onClick={handlers.stop}>
                                  Stop
                                </Button>
                              )}
                            </>
                          ) : (
                            <>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={handlers.export}
                                disabled={enrichmentProgress !== null || discoverProgress !== null}>
                                {enrichmentProgress !== null
                                  ? `Enriching (${enrichmentProgress.current}/${enrichmentProgress.total})...`
                                  : `Export results (${results})`}
                              </Button>
                              {platform === DATA_PLATFORMS.GOOGLE_MAPS && !completed && !isDiscoverMode && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={handlers.resume}
                                  disabled={enrichmentProgress !== null || discoverProgress !== null}>
                                  Resume
                                </Button>
                              )}
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={handlers.reset}
                                disabled={enrichmentProgress !== null || discoverProgress !== null}>
                                Reset
                              </Button>
                            </>
                          )}
                        </Stack>
                      ) : (
                        <Stack>
                          {platform === DATA_PLATFORMS.GOOGLE_MAPS && (
                            <div className="flex flex-col gap-1.5 w-full">
                              <div className="flex flex-row items-center gap-1.5 w-full">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={handlers.discover}
                                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm flex items-center justify-center gap-1.5 py-1.5 text-xs">
                                  🧭 Discover Area ({state.discover_grid_size || 4}x{state.discover_grid_size || 4} Grid)
                                </Button>
                                <button
                                  type="button"
                                  onClick={() => setShowDiscoverSettings(prev => !prev)}
                                  title="Discover settings (keywords & grid)"
                                  className={twMerge(
                                    'w-8 h-8 shrink-0 flex items-center justify-center rounded border transition-colors shadow-sm cursor-pointer',
                                    showDiscoverSettings
                                      ? 'bg-emerald-100 border-emerald-500 text-emerald-800'
                                      : 'bg-white hover:bg-neutral-50 border-neutral-300 text-neutral-600 hover:text-neutral-900',
                                  )}>
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="w-4 h-4">
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="m21 21-4.3-4.3" />
                                  </svg>
                                </button>
                              </div>

                              {showDiscoverSettings && (
                                <div className="w-full p-2.5 bg-neutral-50 rounded-md border border-neutral-300/80 shadow-sm flex flex-col gap-2.5 text-xs text-neutral-700">
                                  <div className="flex justify-between items-center font-semibold text-neutral-800 border-b border-neutral-200 pb-1.5">
                                    <span className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-neutral-500 font-bold">
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="13"
                                        height="13"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="w-3.5 h-3.5 text-emerald-600">
                                        <circle cx="11" cy="11" r="8" />
                                        <path d="m21 21-4.3-4.3" />
                                      </svg>
                                      Discover Settings
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setShowDiscoverSettings(false)}
                                      className="text-neutral-400 hover:text-neutral-600 text-xs px-1 py-0.5 rounded hover:bg-neutral-200 cursor-pointer">
                                      ✕
                                    </button>
                                  </div>

                                  {/* Keywords input */}
                                  <div className="flex flex-col gap-1">
                                    <label className="font-semibold text-neutral-700 text-[11px]">
                                      Target Keywords (optional):
                                    </label>
                                    <input
                                      type="text"
                                      value={discoverQueryInput}
                                      onFocus={() => {
                                        isTypingQueryRef.current = true;
                                      }}
                                      onChange={e => {
                                        isTypingQueryRef.current = true;
                                        handlers.updateDiscoverQuery(e.target.value);
                                      }}
                                      onBlur={e => {
                                        isTypingQueryRef.current = false;
                                        handlers.updateDiscoverQuery(e.target.value);
                                      }}
                                      placeholder="e.g. firmalar, sanayi, restoran..."
                                      className="w-full px-2 py-1 bg-white border border-neutral-300 rounded text-xs text-neutral-800 focus:outline-none focus:border-emerald-500 shadow-inner"
                                    />
                                    <span className="text-[10px] text-neutral-500">
                                      Empty = auto discover all businesses in area
                                    </span>
                                  </div>

                                  {/* Grid size selection (3x3, 4x4, 6x6) */}
                                  <div className="flex flex-col gap-1">
                                    <label className="font-semibold text-neutral-700 text-[11px]">
                                      Scan Grid Area:
                                    </label>
                                    <div className="grid grid-cols-3 gap-1.5">
                                      {[3, 4, 6].map(size => {
                                        const isSelected = (state.discover_grid_size || 4) === size;
                                        const tileCount = size * size;
                                        return (
                                          <button
                                            key={size}
                                            type="button"
                                            onClick={() => handlers.updateDiscoverGridSize(size)}
                                            className={twMerge(
                                              'py-1 px-1 rounded text-center border font-medium transition-all text-xs cursor-pointer flex flex-col items-center justify-center',
                                              isSelected
                                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs font-semibold'
                                                : 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-100',
                                            )}>
                                            <span>{size}x{size}</span>
                                            <span className={twMerge('text-[9px]', isSelected ? 'text-emerald-100' : 'text-neutral-400')}>
                                              {tileCount} tiles
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          <Button variant="secondary" size="sm" onClick={handlers.extractStartClick}>
                            Start extracting (Search)
                          </Button>
                        </Stack>
                      )}
                    </div>
                    {!initiated && (
                      <span className="mt-1 text-xs text-neutral-500">
                        ✓ Standalone contact enrichment active
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Layout>
          </div>
        )}
      </ContentContext.Provider>
    </AppProvider>
  );
};

export default App;
