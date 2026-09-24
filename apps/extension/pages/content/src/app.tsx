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
    export_format: DATA_EXPORT_FORMATS.CSV,
    export_fields: [],
  });

  const [loading, setLoading] = useState<boolean>(true);

  const stateRef = useRef(state);
  const controllerRef = useRef<AbortController | null>(null);
  // Set when this tab was opened by the backend for an MCP auto-collection job.
  const autoJobRef = useRef<{ id: string; limit: number; extractContacts: boolean } | null>(null);

  const { completed, initiated, results, position, auto_download: autoDownload, extracting, backend_available } = state;

  const styles = getStyles({ platform, position });

  const extract = async (options?: { page: number; next: boolean; extractWebsites?: boolean }) => {
    // Website contact enrichment requires a reachable backend AND selected contact fields.
    const extractWebsites = !!(state.backend_available && options?.extractWebsites);
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
    const { export_format, auto_download, export_fields, request_interval, enrich_missing } = data || {};

    const extract_websites = ((export_fields as string[]) || []).some(field =>
      [DATA_EXPORT_FIELDS.EMAIL, DATA_EXPORT_FIELDS.PHONES, DATA_EXPORT_FIELDS.SOCIALS].includes(field),
    );

    setState(state => ({
      ...state,
      extract_websites,
      export_format,
      auto_download,
      export_fields: Array.isArray(export_fields) ? export_fields : [],
      request_interval,
      enrich_missing: enrich_missing !== undefined ? enrich_missing : true,
    }));
  };

  const init = async () => {
    setLoading(true);
    getPlatform();
    await Promise.all([getSettings(), checkBackend()]);
    setLoading(false);
  };

  const enrichMissingContacts = async (items: any[]): Promise<any[]> => {
    if (!state.backend_available) return items;

    const targets = (items || []).filter(
      (item: any) => item?.website && (!item.email || !item.phone),
    );
    if (targets.length === 0) return items;

    const urls = Array.from(new Set(targets.map((item: any) => item.website.trim()).filter(Boolean)));
    if (urls.length === 0) return items;

    const { data } = await extractWebsiteResults({ urls });

    const normalize = (u: string) =>
      u ? u.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '') : '';

    const byNormalizedUrl: Record<string, any> = {};
    for (const r of data || []) {
      if (r?.url) {
        byNormalizedUrl[normalize(r.url)] = r;
      }
    }

    const updatedData = (items || []).map(item => {
      if (!item?.website) return item;
      const key = normalize(item.website);
      const r = byNormalizedUrl[key];
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
    reset: () => {
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

        // Build each row using ONLY the selected fields, so the CSV columns
        // exactly match the export configuration.
        const data =
          exportItems.map(item => {
            const result: { [key: string]: number | string | boolean } = {};
            for (const field of fields) {
              if (field in (item as object)) {
                result[field] = (item as Record<string, any>)[field];
              }
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
                    <div>{extracting && <Spinner />}</div>
                  </div>
                  <div className="mt-4 w-full flex flex-col gap-2 text-sm">
                    {extracting ? (
                      <div>
                        <span>Extracting {results >= 1 ? `(${results})` : '..'}</span>
                      </div>
                    ) : initiated ? (
                      <div>
                        <span>Results: {results}</span>
                      </div>
                    ) : (
                      <></>
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
                              <Button variant="secondary" size="sm" onClick={handlers.export}>
                                Export results ({results})
                              </Button>
                              {platform === DATA_PLATFORMS.GOOGLE_MAPS && !completed && (
                                <Button variant="secondary" size="sm" onClick={handlers.resume}>
                                  Resume
                                </Button>
                              )}
                              <Button variant="secondary" size="sm" onClick={handlers.reset}>
                                Reset
                              </Button>
                            </>
                          )}
                        </Stack>
                      ) : (
                        <Stack>
                          <Button variant="secondary" size="sm" onClick={handlers.extractStartClick}>
                            Start extracting
                          </Button>
                        </Stack>
                      )}
                    </div>
                    {!initiated && state.extract_websites && !backend_available && (
                      <span className="mt-1 text-xs text-amber-700">
                        Start the local backend to also collect website contacts.
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
