export const objectToQueryString = (obj: Record<string, any>): string => {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      value.forEach(v => params.append(key, encodeURIComponent(v)));
    } else {
      params.append(key, encodeURIComponent(value));
    }
  }

  return params.toString();
};

export const updateUrlSearchParams = ({
  url,
  params,
}: {
  url: string;
  params: Record<string, number | string>;
}): string => {
  // Create a URL object
  const urlObj = new URL(url);

  // Update search parameters
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === 'string' || typeof value === 'number') {
      urlObj.searchParams.set(key, `${value}`);
    }
  });

  // Return the updated URL as a string
  return urlObj.toString();
};
