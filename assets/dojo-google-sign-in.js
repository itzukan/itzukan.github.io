import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {
  initializeAuth, browserPopupRedirectResolver, inMemoryPersistence,
  connectAuthEmulator, GoogleAuthProvider, signInWithPopup, signOut,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';

export async function createGoogleSignIn({ authEmulator, ...config }) {
  const app = initializeApp(config, 'dojo-sync');
  const auth = initializeAuth(app, { persistence: inMemoryPersistence, popupRedirectResolver: browserPopupRedirectResolver });
  if (authEmulator) connectAuthEmulator(auth, authEmulator, { disableWarnings: true });
  await auth.authStateReady();
  return {
    async login() {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const { user } = await signInWithPopup(auth, provider);
      try { return await user.getIdToken(); }
      finally { await signOut(auth); }
    },
  };
}
