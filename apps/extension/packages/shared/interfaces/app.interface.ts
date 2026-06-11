export interface IAppStoreState {
  auto_download: boolean;
  request_interval: number;
  export_format: string;
  export_fields: string[];
  /** Optional self-hosted backend used for website contact enrichment. */
  backend_url?: string;
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
