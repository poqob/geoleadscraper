const ACTIONS = {
  UPDATE_GOOGLE_MAPS_CONFIG: 'UPDATE_GOOGLE_MAPS_CONFIG',
};

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
  const [language, region] = (options?.[8] as [string, string, string]) || [];

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

const main = async () => {
  message({ action: ACTIONS.UPDATE_GOOGLE_MAPS_CONFIG, data: getGoogleMapsConfig() });

  setInterval(() => {
    message({ action: ACTIONS.UPDATE_GOOGLE_MAPS_CONFIG, data: getGoogleMapsConfig() });
  }, 500);
};

main();
