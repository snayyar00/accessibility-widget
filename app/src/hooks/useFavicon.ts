import { useEffect } from 'react';

export function useFavicon(url: string | null) {
  useEffect(() => {
    if (!url) return;

    let link = document.querySelector(
      `link[rel~="icon"]`,
    ) as HTMLLinkElement | null;

    if (!link) {
      link = document.createElement('link') as HTMLLinkElement;
      link.type = 'image/x-icon';
      link.rel = 'icon';
      link.href = url;
      document.head.appendChild(link);
    } else {
      link.href = url;
    }
  }, [url]);
}
