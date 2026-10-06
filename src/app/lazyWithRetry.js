import { lazy } from 'react';

export function lazyWithRetry(importPage) {
  return lazy(async () => {
    try {
      const module = await importPage();
      sessionStorage.removeItem('chunk_reload_count');
      return module;
    } catch (error) {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
        try {
          const module = await importPage();
          sessionStorage.removeItem('chunk_reload_count');
          return module;
        } catch {
          // Continue to the final recovery path.
        }
      }
      const reloadCount = Number(sessionStorage.getItem('chunk_reload_count') || 0);
      if (reloadCount < 3) {
        sessionStorage.setItem('chunk_reload_count', String(reloadCount + 1));
        window.location.reload();
        return { default: () => null };
      }
      throw error;
    }
  });
}
