import { useNavigate } from 'react-router-dom';
import { Button } from '@chrome-extension/shared/components';
import { config } from '@chrome-extension/shared';
import { ROUTER } from '@/router';

const buttons = {
  googlemaps: () => {
    chrome.tabs.create({ url: 'https://www.google.com/maps' });
  },
  guide: () => {
    chrome.tabs.create({ url: config.GUIDE_URL });
  },
};

const Page = () => {
  const navigate = useNavigate();

  return (
    <div>
      <div className="flex flex-col gap-2 text-wrap">
        <Button variant="secondary" onClick={buttons.googlemaps}>
          Open Google Maps
        </Button>
        <Button variant="secondary" onClick={buttons.guide}>
          Watch Tutorial (Guide)
        </Button>
        <Button variant="secondary" onClick={() => navigate(ROUTER.SETTINGS)}>
          Settings
        </Button>
      </div>
      <div className="mt-4 text-xs text-neutral-500">
        Free &amp; open-source. Open a map, then use the panel to extract results.
      </div>
    </div>
  );
};

export default Page;
