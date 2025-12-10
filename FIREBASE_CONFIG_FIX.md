# 🔧 Firebase Configuration Fix

## Error: `firebase: Error (auth/configuration-not-found)`

This error occurs when Firebase cannot find a valid configuration. Here's how to fix it:

### ✅ Step 1: Get Your Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one: `kolo-e4711`)
3. Click **Project Settings** (gear icon)
4. Go to the **General** tab
5. Scroll to **Your Apps** section
6. Find your Web app (or create one if needed)
7. Copy the Firebase configuration

### ✅ Step 2: Set Environment Variables

In `client/.env`, update these values with your Firebase credentials:

```env
# Firebase Configuration (for Push Notifications and Auth)
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=1:your_app_id:web:your_web_config
VITE_FIREBASE_MEASUREMENT_ID=G-your_measurement_id

# Firebase VAPID Key (for Push Notifications)
# Get from: Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
VITE_FIREBASE_VAPID_KEY=your_vapid_key_here
```

### ✅ Step 3: Get VAPID Key for Push Notifications

1. In Firebase Console, go to **Project Settings**
2. Go to **Cloud Messaging** tab
3. Under **Web Push certificates**, click **Generate Key Pair**
4. Copy the **Public Key** to `VITE_FIREBASE_VAPID_KEY`

### ✅ Step 4: Verify Configuration

After setting env variables, restart your development server:

```powershell
# Client
cd c:\kolo\client
npm run dev

# Backend (in another terminal)
cd c:\kolo\server
npm run dev
```

### 🔍 Troubleshooting

**Problem**: Still getting `configuration-not-found`
- **Solution**: Check that `.env` file is in `client/` folder (not `client/src/`)
- **Solution**: Make sure Vite dev server is restarted after changing `.env`
- **Solution**: Clear browser cache and localStorage

**Problem**: Google Sign-In not working
- **Solution**: Verify `VITE_FIREBASE_API_KEY` and `VITE_FIREBASE_PROJECT_ID` are correct
- **Solution**: In Firebase Console > Authentication, enable **Google** provider
- **Solution**: Add your domain to authorized origins (Firebase Console > Authentication > Settings)

**Problem**: Push notifications not working
- **Solution**: Verify `VITE_FIREBASE_VAPID_KEY` is correct
- **Solution**: Check browser supports Service Workers (Chrome, Firefox, Edge)
- **Solution**: User must grant notification permission when prompted

### 📋 Verification Checklist

- [ ] Firebase project created and accessible
- [ ] Web app registered in Firebase Console
- [ ] All environment variables set in `client/.env`
- [ ] VAPID Key generated and set
- [ ] Google Auth provider enabled in Firebase Console
- [ ] Your domain added to authorized origins
- [ ] Development server restarted after env changes
- [ ] Browser cache cleared
- [ ] Service Worker enabled in browser

### 🔐 Security Notes

- **Never** commit `.env` with real credentials to git
- Use `.env.example` for template
- For production, set env variables in your deployment platform (Render, Vercel, etc.)
- Keep API keys secret - don't expose in client-side code (but Firebase keys are public by design)

### 📚 Resources

- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Setup Guide](https://firebase.google.com/docs/web/setup)
- [Google Auth Setup](https://firebase.google.com/docs/auth/web/google-signin)
- [FCM Push Notifications](https://firebase.google.com/docs/cloud-messaging/js/client)
