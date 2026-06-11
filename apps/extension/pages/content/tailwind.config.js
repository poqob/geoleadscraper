const baseConfig = require('@chrome-extension/tailwindcss-config');

/** @type {import('tailwindcss').Config} */
module.exports = {
  ...baseConfig,
  content: ['src/**/*.{ts,tsx}'],
};
