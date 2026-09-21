import { getReviewsRequestPlaceId, parseReviewsBatchResponse } from '@chrome-extension/shared/lib';
import type { IGoogleMapsReviewsPage } from '@chrome-extension/shared/lib';

type Listener = (page: IGoogleMapsReviewsPage) => void;

// Reviews pages Google Maps loaded in this tab, grouped by place. Filled from
// page load on, so reviews fetched before the user clicks "Export" still count.
const pagesByPlace = new Map<string, IGoogleMapsReviewsPage[]>();
const listeners = new Set<Listener>();

/** Handle a reviews response forwarded by the injected page script. */
export const receiveReviewsResponse = ({ request, response }: { request: string; response: string }): void => {
  const placeId = getReviewsRequestPlaceId(request);
  if (!placeId) return;

  for (const page of parseReviewsBatchResponse(response, placeId)) {
    const pages = pagesByPlace.get(placeId) || [];
    pages.push(page);
    pagesByPlace.set(placeId, pages);
    listeners.forEach(listener => listener(page));
  }
};

export const getReceivedReviewsPages = (placeId: string): IGoogleMapsReviewsPage[] => pagesByPlace.get(placeId) || [];

export const subscribeToReviewsPages = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
