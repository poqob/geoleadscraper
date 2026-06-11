import { BACKGROUND_EVENTS } from '../../enums';

export interface IBackgroundMessageOptions {
  type: string;
  payload?: BackgroundMessagePayload;
}

export type BackgroundMessagePayload = Record<
  string,
  string | string[] | number | number[] | boolean | object | undefined
>;

export interface IBackgroundMessageResponse<T = any> {
  data?: T;
  error: boolean;
  message?: string;
}

export const logger = async (text: string, data?: BackgroundMessagePayload) => {
  await sendBackgroundEvent({
    type: BACKGROUND_EVENTS.LOGGER,
    payload: { text, data },
  });
};

export const sendBackgroundEvent = async <T = any>({
  type,
  payload,
}: {
  type: string;
  payload?: Record<string, string | number | boolean | object | undefined>;
}): Promise<IBackgroundMessageResponse<T>> => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, payload }, response => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
};

export const getSessionToken = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    getLocalStorageValue('session')
      .then((session: { token?: string }) => {
        const token: string | undefined = session?.token;
        if (!token) reject(new Error('session token is not found'));
        else resolve(token);
      })
      .catch(reject);
  });
};

export const getLocalStorageValue = <T = any>(key: string): Promise<T> => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(key, result => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result[key]);
      }
    });
  });
};

export const getChromeExtensionPageUrl = async () => {
  const extension = await getLocalStorageValue('extension');
  const id = extension?.id;

  if (!id) return null;

  const url = `chrome-extension://${id}/options/index.html`;
  return url;
};
