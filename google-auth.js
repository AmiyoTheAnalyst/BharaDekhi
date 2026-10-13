import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {
  GoogleAuthProvider,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  signInWithRedirect,
  signOut
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';

const signInButton = document.getElementById('googleSignInBtn');
const authStatus = document.getElementById('googleAuthStatus');
const requiredConfigKeys = ['apiKey', 'authDomain', 'projectId', 'appId'];
const hasFirebaseConfig = firebaseConfig && requiredConfigKeys.every(key => Boolean(firebaseConfig[key]));

function showAuthError(error) {
  console.error('Google sign-in error:', error);
  const messages = {
    'auth/unauthorized-domain': 'This site domain is not authorized in Firebase Authentication.',
    'auth/network-request-failed': 'Google sign-in could not connect. Check your internet connection and try again.',
    'auth/popup-blocked': 'Your browser blocked sign-in. Allow redirects and try again.'
  };
  const message = messages[error.code] || 'Google sign-in failed. Check Firebase Authentication setup and try again.';
  authStatus.textContent = message;
  authStatus.className = 'text-xs text-rose-700';
  window.showToast(message);
}

function clearLocalLogin() {
  window.stopCurrentUserPresence();
  localStorage.removeItem('commuteHubLoggedIn');
  localStorage.removeItem('commuteHubRole');
  localStorage.removeItem('commuteHubCurrentUser');
  window.showView('auth');
}

if (!hasFirebaseConfig) {
  signInButton.disabled = true;
  authStatus.textContent = 'Google sign-in is not configured. Add this site’s Firebase web-app config and enable Google Authentication before sign-in.';
} else {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });

  signInButton.disabled = false;
  authStatus.textContent = 'Continue with Google to create or access your account.';
  authStatus.className = 'text-xs text-slate-500';

  signInButton.addEventListener('click', async () => {
    signInButton.disabled = true;
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (error) {
      showAuthError(error);
      signInButton.disabled = false;
    }
  });

  for (const buttonId of ['logoutBtn', 'adminLogoutBtn']) {
    document.getElementById(buttonId).addEventListener('click', async () => {
      try {
        await signOut(auth);
      } catch (error) {
        showAuthError(error);
      }
    });
  }

  getRedirectResult(auth).catch(showAuthError);

  onAuthStateChanged(auth, user => {
    if (!user) {
      clearLocalLogin();
      return;
    }

    const googleAccount = user.providerData.some(provider => provider.providerId === 'google.com');
    if (!googleAccount || !user.email || !user.emailVerified) {
      signOut(auth).catch(showAuthError);
      authStatus.textContent = 'Use a verified Google account to access CommuteHub.';
      authStatus.className = 'text-xs text-rose-700';
      return;
    }

    const account = {
      name: user.displayName || user.email,
      email: user.email.toLowerCase()
    };
    const previousRole = localStorage.getItem('commuteHubRole');
    localStorage.setItem('commuteHubLoggedIn', 'true');
    localStorage.setItem('commuteHubCurrentUser', JSON.stringify(account));
    window.updateUserGreeting();

    if (account.email === window.COMMUTEHUB_ADMIN_EMAIL) {
      if (previousRole === 'admin') {
        window.stopCurrentUserPresence();
        window.showView('admin');
      } else if (previousRole === 'user') {
        window.startCurrentUserPresence(account.email);
        window.recordAuthenticatedUser(account);
        window.showView('user');
      } else {
        window.stopCurrentUserPresence();
        localStorage.setItem('commuteHubRole', 'admin-pending');
        window.showView('role');
      }
      return;
    }

    localStorage.setItem('commuteHubRole', 'user');
    window.recordAuthenticatedUser(account);
    window.startCurrentUserPresence(account.email);
    window.showView('user');
  });
}
