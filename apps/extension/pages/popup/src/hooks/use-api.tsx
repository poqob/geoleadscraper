import { useApi as useApiHook } from '@chrome-extension/shared/hooks';

const BASE_URL = import.meta.env.API_HOST || "http://localhost:5050/v1";

export const useApi = () => {
  return useApiHook(BASE_URL);
};
