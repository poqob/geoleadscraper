import React from 'react';

import { createRoot } from 'react-dom/client';

import App from './app';

const init = async () => {
  const container = document.querySelector('#app-container');
  if (!container) {
    throw new Error('Can not find #app-container');
  }
  const root = createRoot(container);

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
};

init();
