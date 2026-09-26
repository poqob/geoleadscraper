export interface IAppStoreState {
  auto_download: boolean;
  request_interval: number;
  export_format: string;
  export_fields: string[];
  /** Optional self-hosted backend used for website contact enrichment. */
  backend_url?: string;
  /** Before export, fill missing email/phone by scraping each business website. */
  enrich_missing?: boolean;
  /** Keywords/query for Discover Area mode. If empty, automatically uses "firmalar" / "businesses". */
  discover_query?: string;
  /** Grid matrix size for Discover Area mode: 3 (3x3), 4 (4x4), 6 (6x6). Default 4. */
  discover_grid_size?: number;
  /** Whether to render the visual spatial grid overlay directly on the Google Maps viewport. Default false. */
  show_grid_overlay?: boolean;
}

export interface IExtractWebsiteResult {
  data: {
    url: string;
    email?: string;
    emails?: string[];
    socials?: string[];
    phones?: string[];
  }[];
  results: number;
}
