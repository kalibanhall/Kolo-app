import { useState, useEffect } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { requestNotificationPermission } from '../config/firebase';

/**
 * NotificationPermissionBanner
 * Banner component to request push notification permission from users
 * Appears at the top of the page for authenticated users who haven't granted permission
 */
export const NotificationPermissionBanner = () => {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState('default');

  useEffect(() => {
    // Check current notification permission
    if ('Notification' in window) {
      setPermission(Notification.permission);
      
      // Show banner if permission is not granted and not dismissed
      const dismissed = localStorage.getItem('notification_banner_dismissed');
      if (Notification.permission === 'default' && !dismissed) {
        // Show banner after 3 seconds
        setTimeout(() => setShow(true), 3000);
      }
    }
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const token = await requestNotificationPermission();
      if (token) {
        setPermission('granted');
        setShow(false);
        console.log('✅ Notifications enabled');
      } else {
        setPermission('denied');
        console.log('❌ Notifications denied');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('notification_banner_dismissed', 'true');
  };

  // Don't show if permission already granted or not supported
  if (!show || permission === 'granted' || !('Notification' in window)) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 flex-1">
            <Bell className="w-6 h-6 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                🔔 Activez les notifications pour ne rien manquer !
              </p>
              <p className="text-xs opacity-90 mt-0.5">
                Recevez des alertes pour vos achats, tirages au sort et plus encore
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleEnable}
              disabled={loading}
              className="bg-white text-purple-600 px-4 py-2 rounded-lg font-medium text-sm hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                  Activation...
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  Activer
                </>
              )}
            </button>
            
            <button
              onClick={handleDismiss}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * NotificationSettings
 * Component for managing notification preferences in user settings/profile
 */
export const NotificationSettings = () => {
  const [permission, setPermission] = useState('default');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const handleToggle = async () => {
    if (permission === 'granted') {
      // Can't programmatically revoke permission, show instructions
      alert('Pour désactiver les notifications, allez dans les paramètres de votre navigateur.');
      return;
    }

    setLoading(true);
    try {
      const token = await requestNotificationPermission();
      if (token) {
        setPermission('granted');
      } else {
        setPermission('denied');
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = () => {
    switch (permission) {
      case 'granted':
        return {
          icon: Bell,
          text: 'Activées',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          description: 'Vous recevez les notifications push'
        };
      case 'denied':
        return {
          icon: BellOff,
          text: 'Refusées',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          description: 'Réactivez-les dans les paramètres du navigateur'
        };
      default:
        return {
          icon: Bell,
          text: 'Non configurées',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          description: 'Cliquez pour activer les notifications'
        };
    }
  };

  const status = getStatusConfig();
  const Icon = status.icon;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          <div className={`p-3 rounded-lg ${status.bgColor}`}>
            <Icon className={`w-6 h-6 ${status.color}`} />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              Notifications Push
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {status.description}
            </p>
            
            <div className="mt-3 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                <div className="w-2 h-2 rounded-full bg-current"></div>
                {status.text}
              </span>
            </div>
          </div>
        </div>

        {permission !== 'denied' && (
          <button
            onClick={handleToggle}
            disabled={loading || permission === 'granted'}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              permission === 'granted'
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            {loading ? 'Chargement...' : permission === 'granted' ? 'Activé' : 'Activer'}
          </button>
        )}
      </div>

      {permission === 'denied' && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Comment réactiver les notifications :</strong>
          </p>
          <ul className="text-sm text-yellow-700 mt-2 space-y-1 list-disc list-inside">
            <li>Chrome : Paramètres → Confidentialité → Paramètres de site → Notifications</li>
            <li>Firefox : Paramètres → Vie privée → Permissions → Notifications</li>
            <li>Safari : Préférences → Sites web → Notifications</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default NotificationPermissionBanner;
