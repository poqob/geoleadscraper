import '@chrome-extension/shared/styles/styles.css';
import './app.css';

import { withErrorBoundary, withSuspense, config } from '@chrome-extension/shared';
import { Button, Copyright, Logo } from '@chrome-extension/shared/components';

const links = {
  repo: 'https://github.com/geoleadscraper/geoleadscraper',
  guide: config.GUIDE_URL,
};

const App = () => {
  return (
    <div className="w-full min-h-screen flex flex-col justify-start items-center">
      <header className="w-full max-w-screen-md h-[80px] flex items-center">
        <div className="container">
          <Logo />
        </div>
      </header>
      <main className="w-full max-w-screen-md flex-1 flex flex-col gap-6 py-8">
        <h1 className="text-3xl font-extrabold text-gray-900">GeoLeadScraper</h1>
        <p className="text-gray-600">
          Free &amp; open-source. Collect public business data from Google Maps, Yandex Maps and 2GIS,
          and export it to CSV / XLSX / JSON — no account, no quotas.
        </p>
        <p className="text-gray-600">
          Website contact enrichment (emails, phones, socials) is optional and runs through a
          self-hosted backend. Configure its URL in the popup settings.
        </p>
        <div className="flex flex-row gap-3">
          <Button variant="primary" size="base" onClick={() => chrome.tabs.create({ url: links.repo })}>
            GitHub
          </Button>
          <Button variant="secondary" size="base" onClick={() => chrome.tabs.create({ url: links.guide })}>
            How to use
          </Button>
        </div>
      </main>
      <footer className="w-full max-w-screen-md h-[80px] flex items-center">
        <div className="container">
          <Copyright />
        </div>
      </footer>
    </div>
  );
};

export default withErrorBoundary(withSuspense(App, <div> Loading ... </div>), <div> Error Occur </div>);
