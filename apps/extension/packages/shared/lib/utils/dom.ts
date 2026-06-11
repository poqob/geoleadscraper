export const createIframe = async ({ url, id }: { url: string; id: string }): Promise<Document | null> => {
  if (!document) return null;

  const frame = document.createElement('iframe');

  frame.id = id;
  frame.src = url;

  frame.style.display = 'block';
  frame.style.position = 'fixed';
  frame.style.top = '0px';
  frame.style.bottom = '0px';
  frame.style.right = '0px';
  frame.style.left = '0px';
  frame.style.width = '100%';
  frame.style.height = '100%';
  frame.style.zIndex = '-1000000000';

  document.body.appendChild(frame);

  return new Promise((resolve, reject) => {
    frame.onload = () => resolve(frame.contentDocument);
    frame.onerror = () => reject(new Error('iframe failed to load'));
  });
};

export const getIframeById = (id: string): Document | null => {
  if (!document) return null;
  const element = document.getElementById(id) as HTMLIFrameElement;
  const dom = element ? element.contentDocument : null;
  return dom;
};
