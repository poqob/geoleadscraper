export type JobPlatform = 'google_maps' | 'yandex_maps' | 'gis';
export type JobStatus = 'pending' | 'running' | 'done' | 'error';

export interface Job {
  id: string;
  platform: JobPlatform;
  query: string;
  /** Optional explicit maps URL to open instead of building one from `query`. */
  url?: string;
  limit: number;
  /** Also scrape website contacts (requires the same backend running). */
  extractContacts: boolean;
  /** Optional subset of fields the caller cares about (informational). */
  fields?: string[];
  status: JobStatus;
  results: number;
  data: Record<string, unknown>[];
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreateJobInput {
  platform: JobPlatform;
  query: string;
  url?: string;
  limit?: number;
  extractContacts?: boolean;
  fields?: string[];
}
