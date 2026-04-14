import { type Href, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { isPrototypeScreenId, prototypeScreenHref } from '@/constants/prototype-navigation';

/**
 * Replaces `go(id)` / `nav(id)` from `web-prototype/scripts.js` with Expo Router navigation.
 */
export function usePrototypeNavigation() {
  const router = useRouter();

  const go = useCallback(
    (id: string) => {
      if (isPrototypeScreenId(id)) {
        router.push(prototypeScreenHref[id] as Href);
      }
    },
    [router],
  );

  const nav = go;

  return { go, nav };
}
