import React, { createContext, useState, useEffect, useCallback, useContext, useRef } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const NotificationsContext = createContext();

// Polling interval: 60 seconds
const POLL_INTERVAL_MS = 60000;
// Minimum time between fetches to prevent bursts
const MIN_FETCH_INTERVAL_MS = 10000;
// Max consecutive errors before stopping
const MAX_ERROR_COUNT = 5;

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
};

export const NotificationsProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Prevent multiple simultaneous requests and error loops
  const isFetchingRef = useRef(false);
  const errorCountRef = useRef(0);
  const lastFetchRef = useRef(0);
  // Track if the tab is visible
  const isVisibleRef = useRef(!document.hidden);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async (force = false) => {
    if (!user) return;
    
    // Prevent concurrent requests
    if (isFetchingRef.current) return;
    
    // Don't poll when tab is hidden (unless forced)
    if (!force && !isVisibleRef.current) return;
    
    // Rate limit: minimum interval between requests
    const now = Date.now();
    if (!force && now - lastFetchRef.current < MIN_FETCH_INTERVAL_MS) return;
    
    // Stop fetching after too many consecutive errors (will reset on success)
    if (errorCountRef.current >= MAX_ERROR_COUNT) {
      return;
    }

    try {
      isFetchingRef.current = true;
      lastFetchRef.current = now;
      setLoading(true);
      setError(null);
      
      const response = await api.notifications.getAll({ limit: 50 });
      if (response.success) {
        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.unread_count || 0);
        errorCountRef.current = 0; // Reset error count on success
      }
    } catch (err) {
      setError(err.message);
      errorCountRef.current += 1;
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [user]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await api.notifications.markAsRead(notificationId);
      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await api.notifications.markAllAsRead();
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await api.notifications.delete(notificationId);
      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      // Recalculate unread count
      const newNotifications = notifications.filter(n => n.id !== notificationId);
      setUnreadCount(newNotifications.filter(n => !n.read).length);
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  }, [notifications]);

  // Add new notification to the list (for real-time updates)
  const addNotification = useCallback((notification) => {
    setNotifications(prev => [notification, ...prev]);
    if (!notification.read) {
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  // Reset state when user changes
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      errorCountRef.current = 0;
      lastFetchRef.current = 0;
    }
  }, [user]);

  // Visibility-aware polling: pause when tab is hidden, resume when visible
  useEffect(() => {
    if (!user) return;

    // Fetch immediately on mount
    fetchNotifications(true);

    // Set up polling interval
    const interval = setInterval(() => {
      fetchNotifications();
    }, POLL_INTERVAL_MS);

    // Listen for tab visibility changes
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
      if (!document.hidden) {
        // Tab became visible — fetch fresh data
        fetchNotifications(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, fetchNotifications]);

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    addNotification,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

export default NotificationsContext;
