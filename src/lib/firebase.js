import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  GoogleAuthProvider,
  getAuth as _getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  inMemoryPersistence,
  signInWithCustomToken,
} from 'firebase/auth';
import { validateFirebaseConfig, firebaseConfigWarning } from './firebaseConfig.js';

const viteEnv = import.meta.env || {};
const isBrowser = typeof window !== 'undefined';
const isCustomDomain = isBrowser && (window.location.hostname === 'blackfighters.site' || window.location.hostname === 'www.blackfighters.site');

export const DEV_SANDBOX_USER = {
  uid: 'up3y6pub7IgB1PpEMTcMASO2ei33',
  email: 'ibrahimkandil000@gmail.com',
  displayName: 'Alpha (Trial Mode)',
  emailVerified: true,
  isAnonymous: false,
  getIdToken: async () => 'local-dev-bypass-token',
};

const firebaseConfig = {
  apiKey: viteEnv.VITE_FIREBASE_API_KEY,
  authDomain: isCustomDomain ? 'blackfighters.site' : (viteEnv.VITE_FIREBASE_AUTH_DOMAIN || 'blackfighters.site'),
  projectId: viteEnv.VITE_FIREBASE_PROJECT_ID,
  storageBucket: viteEnv.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: viteEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: viteEnv.VITE_FIREBASE_APP_ID,
};

// Fail LOUDLY and SPECIFICALLY: Firebase's own error for a missing/blank
// apiKey is a generic `auth/invalid-api-key`, which reads like an auth
// problem when it is a build-environment problem. Name the exact vars to set.
const configCheck = validateFirebaseConfig(viteEnv);
if (!configCheck.ok) {
  console.error(firebaseConfigWarning(configCheck.missing));
}

let _app, _auth, _googleProvider;
let _initOk = false;

try {
  _app = initializeApp(firebaseConfig);
  try {
    _auth = initializeAuth(_app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch (authError) {
    if (authError?.code !== 'auth/already-initialized') throw authError;
    _auth = _getAuth(_app);
  }
  _auth.useDeviceLanguage();
  _googleProvider = new GoogleAuthProvider();
  _googleProvider.addScope('email');
  _googleProvider.addScope('profile');
  _initOk = true;

  // Automatically sign in silently with a server-minted custom token in local dev
  // so Firestore client SDK queries pass security rules without manual login.
  if (viteEnv.DEV && isBrowser && _auth) {
    setTimeout(async () => {
      try {
        if (_auth.currentUser) return;
        const res = await fetch('/api/__dev-token');
        const data = await res.json().catch(() => ({}));
        if (data?.token && !_auth.currentUser) {
          await signInWithCustomToken(_auth, data.token);
          console.info('[local trial] Authenticated Firebase session silently as Alpha');
        }
      } catch (err) {
        console.warn('[local trial] Silent custom token sign-in skipped:', err?.message);
      }
    }, 50);
  }
} catch (e) {
  console.warn('Firebase init failed:', e.message);
}

const baseAuth = _auth || { currentUser: DEV_SANDBOX_USER, onAuthStateChanged: (cb) => { cb(DEV_SANDBOX_USER); return () => {}; } };

// In DEV mode, always fall back to DEV_SANDBOX_USER when currentUser is null
// so no caller ever throws "سجّل دخولك أولاً" or "Not authenticated".
export const auth = viteEnv.DEV
  ? new Proxy(baseAuth, {
      get(target, prop, receiver) {
        if (prop === 'currentUser') {
          return target.currentUser || DEV_SANDBOX_USER;
        }
        const value = Reflect.get(target, prop, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    })
  : baseAuth;

export const app = _app || null;
export const googleProvider = _googleProvider || { addScope: () => {} };
export const isReady = _initOk;

export default { app, auth, googleProvider };
