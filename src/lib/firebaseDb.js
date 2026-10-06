import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { app, isReady } from './firebase';

let database = null;

if (isReady && app) {
  try {
    database = initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch (error) {
    try {
      database = getFirestore(app);
    } catch {
      console.warn('Firestore init failed:', error.message);
    }
  }
}

// NOTE: export the real handle or null — never a `{}` fallback. With `{}`,
// every `if (!db)` guard in firestore.js was truthy (`!{}` === false) and
// collection({}, name) threw 'Expected first argument to collection()...' on
// every query when Firebase is not configured. null makes the guards work:
// silent empty results, zero console errors.
export const db = database;
