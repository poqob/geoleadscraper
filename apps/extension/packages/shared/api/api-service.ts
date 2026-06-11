import { sleep } from './../lib';
import { IApiResponse, IExtractWebsiteResult } from './../interfaces';

export class ApiService {
  public baseUrl: string;

  constructor({ baseUrl }: { baseUrl: string }) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  setBaseUrl(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async request<T = any>({
    path,
    method,
    body,
    timeoutMs,
  }: {
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: Record<string, number | number[] | string | string[] | boolean>;
    timeoutMs?: number;
  }): Promise<IApiResponse<T>> {
    const { baseUrl } = this;

    const headers: Record<string, string> = {};
    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const controller = new AbortController();
    const timer = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : null;

    try {
      const response = await fetch(`${baseUrl}/${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const contentType = response.headers.get('content-type');
      const result: { message?: string; data?: any } = {};

      if (contentType && contentType.includes('application/json')) {
        const json = await response.json();
        if (json?.message) {
          result.message = json.message;
        } else {
          result.data = json;
        }
      }

      return {
        ...result,
        status: response.status,
        error: !response.ok,
      } as IApiResponse<T>;
    } catch (e) {
      return { error: true, status: 0, message: (e as Error)?.message } as IApiResponse<T>;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /** Health check — used to detect whether a backend is reachable. */
  async health() {
    return this.request<{ status: string }>({
      method: 'GET',
      path: '',
      timeoutMs: 2500,
    });
  }

  async extractWebsites({ urls }: { urls: string[] }) {
    return this.request<IExtractWebsiteResult>({
      path: 'v1/extract-website',
      method: 'POST',
      body: { urls },
    });
  }
}

export { sleep };
