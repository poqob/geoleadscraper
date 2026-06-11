export * from './app.interface';
export * from './parse.interface';

export interface IApiResponse<T = any> {
  error: boolean;
  status: number;
  url?: string;
  data?: T;
  message?: string;
}
