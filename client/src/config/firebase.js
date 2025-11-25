// Firebase Configuration for KOLO
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Firebase configuration
// IMPORTANT: Remplacer avec vos vraies credentials Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "kolo-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "kolo-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "kolo-app.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-XXXXXXXXXX"
};

// Initialize Firebase
let app;
let messaging;

try {
  app = initializeApp(firebaseConfig);
  
  // Check if messaging is supported
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    messaging = getMessaging(app);
    console.log('✅ Firebase Messaging initialized');
  } else {
    console.warn('⚠️  Firebase Messaging not supported in this browser');
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
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
