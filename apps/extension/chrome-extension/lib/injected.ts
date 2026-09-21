// Wrapped in an IIFE: this runs as a classic <script> in the page, so any
// top-level const would leak into Google Maps' global scope and collide with
// its own lazily loaded modules ("Identifier 's' has already been declared").
(() => {
  const ACTIONS = {
    UPDATE_GOOGLE_MAPS_CONFIG: 'UPDATE_GOOGLE_MAPS_CONFIG',
    GOOGLE_MAPS_REVIEWS_RESPONSE: 'GOOGLE_MAPS_REVIEWS_RESPONSE',
  };

  // Google Maps loads reviews via `batchexecute?rpcids=qv9Egd`.
  const REVIEWS_RPC_PATTERN = /\/batchexecute\?[^#]*rpcids=[^&#]*qv9Egd/;

  const message = ({ action, data }: { action: string; data: any }) => {
    window.postMessage(JSON.stringify({ action, data }), '*');
  };

  const getGoogleMapsConfig = () => {
    const url = window.location.href;
    const options = (window as any).APP_OPTIONS;
    const width = window.innerWidth;
    const height = window.innerHeight;

    const config = { url, page: '', search: '', lat: 0, long: 0, zoom: 0, language: '', region: '', psi: '' };

    // parse the config object
    const locale = options?.[8];
    const [language, region] = Array.isArray(locale) ? (locale as string[]) : [];

    config.psi = options?.[11];
    config.language = language;
    config.region = region;

    // parse the url
    const pattern = /maps\/(?:(\w+)\/?)?(?:([^/@]+)\/?)?@(-?\d+\.\d+),(-?\d+\.\d+),(\d+(?:\.\d+)?)[z|m]/;
    const match = url.match(pattern);

    if (match) {
      const [, page, search, lat, long, zoom] = match;

      config.page = page;
      config.lat = parseFloat(lat);
      config.long = parseFloat(long);
      config.zoom = parseInt(zoom.charAt(0), 10);

      if (page === 'search') {
        config.search = decodeURIComponent(search.replace(/\+/g, ' '));
      }
    }

    return { ...config, width, height };
  };

  // Passively forward the reviews responses Google Maps itself requests while
  // the user (or the extension) scrolls the Reviews tab. We never send these
  // requests ourselves: they carry a BotGuard token only Maps can produce.
  const observeReviewsResponses = () => {
    const { open, send } = XMLHttpRequest.prototype;
    const urls = new WeakMap<XMLHttpRequest, string>();

    XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, ...args: unknown[]) {
      urls.set(this, String(args[1]));
      return (open as (...params: unknown[]) => void).apply(this, args);
    } as typeof XMLHttpRequest.prototype.open;

    XMLHttpRequest.prototype.send = function (this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null) {
      const url = urls.get(this) || '';

      if (REVIEWS_RPC_PATTERN.test(url)) {
        const request = typeof body === 'string' ? body : '';
        this.addEventListener('load', () => {
          if (this.status !== 200 || typeof this.responseText !== 'string') return;
          message({
            action: ACTIONS.GOOGLE_MAPS_REVIEWS_RESPONSE,
            data: { request, response: this.responseText },
          });
        });
      }

      return send.call(this, body);
    };
  };

  const main = async () => {
    if (window.location.pathname.startsWith('/maps')) observeReviewsResponses();

    message({ action: ACTIONS.UPDATE_GOOGLE_MAPS_CONFIG, data: getGoogleMapsConfig() });

    setInterval(() => {
      message({ action: ACTIONS.UPDATE_GOOGLE_MAPS_CONFIG, data: getGoogleMapsConfig() });
    }, 500);
  };

  main();
})();
