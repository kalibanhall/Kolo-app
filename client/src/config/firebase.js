// Firebase Configuration for KOLO
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

// Firebase configuration
// IMPORTANT: Variables d'environnement requises dans .env
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validation de la configuration Firebase
const validateFirebaseConfig = () => {
  const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId'];
  const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);
  
  if (missingKeys.length > 0) {
    console.error('❌ Firebase configuration missing keys:', missingKeys);
    console.error('📋 Please set these environment variables in .env:');
    console.error('   VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID');
    return false;
  }
  return true;
};

// Initialize Firebase
let app;
let messaging;
let auth;
let googleProvider;
let firebaseInitialized = false;

try {
  if (!validateFirebaseConfig()) {
    throw new Error('Firebase configuration is incomplete');
  }
  
  app = initializeApp(firebaseConfig);
  firebaseInitialized = true;
  
  // Initialize Firebase Auth
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.addScope('email');
  googleProvider.addScope('profile');
  
  // Check if messaging is supported
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      messaging = getMessaging(app);
      console.log('✅ Firebase Messaging initialized');
    } catch (msgError) {
      console.warn('⚠️  Firebase Messaging initialization error:', msgError.message);
    }
  } else {
    console.warn('⚠️  Firebase Messaging not supported in this browser');
  }
  
  console.log('✅ Firebase Auth initialized');
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
  console.error('⚠️  Auth features may not work. Check your Firebase configuration.');
  firebaseInitialized = false;
}

// Request permission and get FCM token
export const requestNotificationPermission = async () => {
  try {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return null;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('✅ Notification permission granted');
      
      // Get FCM token
      if (messaging) {
        const token = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || 'YOUR_VAPID_KEY'
        });
        
        if (token) {
          console.log('✅ FCM Token:', token);
          // Save token to backend
          await saveTokenToBackend(token);
          return token;
        } else {
          console.warn('⚠️  No registration token available');
          return null;
        }
      }
    } else if (permission === 'denied') {
      console.warn('❌ Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('Error getting notification permission:', error);
    return null;
  }
};

// Save FCM token to backend
const saveTokenToBackend = async (token) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/fcm-token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ fcm_token: token })
      }
    );

    if (response.ok) {
      console.log('✅ FCM token saved to backend');
    } else {
      console.error('❌ Failed to save FCM token to backend');
    }
  } catch (error) {
    console.error('Error saving FCM token:', error);
  }
};

// Listen for foreground messages
export const onMessageListener = () =>
  new Promise((resolve) => {
    if (messaging) {
      onMessage(messaging, (payload) => {
        console.log('📩 Foreground message received:', payload);
        resolve(payload);
      });
    }
  });

// Show notification
export const showNotification = (title, options) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/logo-kolo-192.png',
      badge: '/logo-kolo-96.png',
      ...options
    });
  }
};

export { app, messaging };

// Google Sign-In
export const signInWithGoogle = async () => {
  try {
    if (!firebaseInitialized) {
      throw new Error('Firebase not properly initialized. Check your configuration.');
    }
    
    if (!auth || !googleProvider) {
      throw new Error('Google Auth provider not initialized');
    }
    
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const idToken = await user.getIdToken();
    
    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      },
      idToken,
    };
  } catch (error) {
    console.error('❌ Google Sign-In error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Sign out from Google
export const signOutGoogle = async () => {
  try {
    if (!firebaseInitialized) {
      console.warn('⚠️  Firebase not initialized, clearing local auth state');
      return { success: true };
    }
    
    if (!auth) {
      throw new Error('Auth not initialized');
    }
    
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('❌ Google Sign-Out error:', error);
    return { success: false, error: error.message };
  }
};

export { auth, googleProvider };
