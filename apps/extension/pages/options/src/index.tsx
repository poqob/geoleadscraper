import { createRoot } from 'react-dom/client';

import App from './app';

const container = document.querySelector('#app');

if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
