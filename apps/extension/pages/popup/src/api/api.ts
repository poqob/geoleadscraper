import { ApiService } from '@chrome-extension/shared/api';

const baseUrl = import.meta.env.API_HOST || "http://localhost:5050/v1";

export const api = new ApiService({ baseUrl });
