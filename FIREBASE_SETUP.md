# Google Sign-In Setup

The app now uses Firebase Authentication with Google as its only identity provider. The sign-in button stays disabled until a Firebase web-app configuration is added.

1. Create a Firebase project at https://console.firebase.google.com/.
2. Add a Web app to the project and copy its Firebase config object.
3. Replace `null` in `firebase-config.js` with the web config values:

   ```js
   export const firebaseConfig = {
     apiKey: 'YOUR_FIREBASE_WEB_API_KEY',
     authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
     projectId: 'YOUR_PROJECT_ID',
     appId: 'YOUR_FIREBASE_APP_ID'
   };
   ```

4. In Firebase Console, open Authentication, enable the Google sign-in provider, and set a support email.
5. In Authentication settings, add `commute-dhaka.netlify.app` to Authorized domains. Add `localhost` for local testing.
6. Deploy `index.html`, `google-auth.js`, and `firebase-config.js` together to Netlify.
7. Test with a Google account. New users are created by Google sign-in; email/password accounts are no longer accepted.

The Firebase web config is intended to be present in browser code. Do not put service-account credentials or private server keys in this project. For any future private user data, enforce access with Firebase Security Rules or a trusted backend.

Only the verified Google account `amiyohasan23@gmail.com` receives the in-app admin mode chooser. Protecting private admin data would additionally require server-side authorization; this static app currently has no private server data.
