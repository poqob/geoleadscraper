import { IApiResponse } from './../interfaces';

export const useApi = (baseUrl: string) => {
  const request = async <T = any,>({
    path,
    method,
    body,
  }: {
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: Record<string, number | string | boolean>;
  }): Promise<IApiResponse<T>> => {
    const headers: Record<string, string> = {};

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${baseUrl}/${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const contentType = response.headers.get('content-type');

    const result = {
      message: undefined,
      data: undefined,
    };

    if (contentType && contentType.includes('application/json')) {
      const json = await response.json();

      if (json?.message) {
        result.message = json.message;
        delete result.data;
      } else {
        result.data = json;
        delete result.message;
      }
    }

    const status = response.status;
    const error = !response.ok;

    return {
      ...result,
      status,
      error,
    } as IApiResponse<T>;
  };

  return { request };
};
