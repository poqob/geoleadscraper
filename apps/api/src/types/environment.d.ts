declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production';
      HOST: string;
      TZ: string;
      PORT: string;

      // Comma-separated list of allowed CORS origins.
      // Use "*" to allow any origin (default for self-hosted setups).
      ALLOWED_ORIGINS: string;

      // Puppeteer
      PUPPETEER_EXECUTABLE_PATH: string;

      // Rate limiting (requests per window)
      RATE_LIMIT_MAX: string;
      RATE_LIMIT_WINDOW: string;
    }
  }
}

export {};
