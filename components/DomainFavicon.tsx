'use client';

import { useEffect } from 'react';

const FAVICONS: Record<string, string> = {
  'discountbnbclub.com': '/favicon-discountbnbclub.svg',
  'homestayclub.ca':     '/favicon-homestayclub.svg',
};

export default function DomainFavicon() {
  useEffect(() => {
    const host = process.env.NEXT_PUBLIC_FORCE_DOMAIN ?? window.location.hostname;
    const href = FAVICONS[host];
    if (!href) return;

    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = 'image/svg+xml';
    link.href = href;
  }, []);

  return null;
}
