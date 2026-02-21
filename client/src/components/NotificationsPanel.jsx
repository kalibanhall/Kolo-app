import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationsContext';
import { useTheme } from '../context/ThemeContext';
import { LoadingSpinner } from './LoadingSpinner';
import TicketPreviewModal from './TicketPreviewModal';

export const NotificationsPanel = ({ className = '', maxHeight = 'max-h-[600px]', onClose }) => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    fetchNotifications,
  } = useNotifications();
  
  const [expandedNotifications, setExpandedNotifications] = useState(new Set());
  const [selectedWinnerTicket, setSelectedWinnerTicket] = useState(null); // Pour la prévisualisation du ticket gagnant

  const handleNotificationClick = (notification) => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // Parse notification data
    const data = notification.data 
      ? (typeof notification.data === 'string' ? (() => { try { return JSON.parse(notification.data); } catch { return {}; } })() : notification.data)
      : {};
    
    // Navigate based on type
    switch (notification.type) {
      case 'purchase_confirmation':
      case 'payment_success':
        if (data.campaign_id) {
          navigate(`/campaigns/${data.campaign_id}`);
        } else {
          navigate('/profile');
        }
        break;
      case 'winner':
        // Stay on notification to see winner details
        return;
      case 'promotion':
        if (data.campaign_id) {
          navigate(`/campaigns/${data.campaign_id}`);
        } else {
          navigate('/');
        }
        break;
      default:
        if (data.campaign_id) {
          navigate(`/campaigns/${data.campaign_id}`);
        }
        return;
    }
    // Close panel after navigation
    if (onClose) onClose();
  };

  const toggleExpanded = (notificationId) => {
    setExpandedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR');
  };

  const getNotificationIcon = (type) => {
    const icons = {
      purchase_confirmation: '●',
      payment_success: '●',
      winner: '★',
      promotion: '●',
      system: '●',
      alert: '!',
      info: 'i',
    };
    return icons[type] || '●';
  };

  const getNotificationColor = (type) => {
    const colors = isDarkMode ? {
      purchase_confirmation: 'border-l-blue-500 bg-blue-900/30',
      payment_success: 'border-l-green-500 bg-green-900/30',
      winner: 'border-l-yellow-500 bg-yellow-900/30',
      promotion: 'border-l-purple-500 bg-purple-900/30',
      system: 'border-l-gray-500 bg-gray-800',
      alert: 'border-l-red-500 bg-red-900/30',
      info: 'border-l-indigo-500 bg-indigo-900/30',
    } : {
      purchase_confirmation: 'border-l-blue-500 bg-blue-50',
      payment_success: 'border-l-green-500 bg-green-50',
      winner: 'border-l-yellow-500 bg-yellow-50',
      promotion: 'border-l-purple-500 bg-purple-50',
      system: 'border-l-gray-500 bg-gray-50',
      alert: 'border-l-red-500 bg-red-50',
      info: 'border-l-indigo-500 bg-indigo-50',
    };
    return colors[type] || (isDarkMode ? 'border-l-gray-500 bg-gray-800' : 'border-l-gray-500 bg-gray-50');
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b rounded-t-lg ${
        isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
      }`}>
        <div className="flex items-center gap-3">
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Notifications</h3>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className={`text-sm font-medium transition-colors ${
              isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
            }`}
          >
            Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className={`overflow-y-auto ${maxHeight} ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        {loading && notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <LoadingSpinner />
            <p className={`text-sm mt-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Chargement des notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <svg className={`w-12 h-12 mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Aucune notification pour le moment</p>
          </div>
        ) : (
          <div className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`border-l-4 p-4 transition-colors cursor-pointer ${getNotificationColor(notification.type)} ${
                  isDarkMode ? 'hover:bg-opacity-50' : 'hover:bg-opacity-75'
                } ${!notification.read ? 'font-medium' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <span className="text-2xl flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {notification.title}
                    </h4>
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {notification.message}
                    </p>

                    {/* Additional Data / Expandable Details for Winners */}
                    {notification.type === 'winner' && (
                      <div className="mt-2">
                        {/* Bouton voir le ticket gagnant */}
                        <button
                          onClick={() => {
                            const data = typeof notification.data === 'string' 
                              ? JSON.parse(notification.data) 
                              : notification.data;
                            setSelectedWinnerTicket({
                              ticketNumber: data?.ticket_number || data?.ticket_numbers?.[0] || 'N/A',
                              campaignTitle: data?.campaign_title || 'KOMA',
                              prizeName: data?.prize_name || notification.title,
                            });
                          }}
                          className="mb-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-lg text-sm font-semibold hover:from-amber-600 hover:to-yellow-600 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                        >
                          <span>🎟️</span> Voir mon ticket gagnant
                        </button>

                        <button
                          onClick={() => toggleExpanded(notification.id)}
                          className={`text-xs font-medium flex items-center gap-1 ${isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}
                        >
                          {expandedNotifications.has(notification.id) ? '▼' : '▶'} 
                          {expandedNotifications.has(notification.id) ? 'Masquer les détails' : 'Voir les détails'}
                        </button>
                        
                        {expandedNotifications.has(notification.id) && (
                          <div className={`mt-3 p-3 border rounded-lg text-sm ${isDarkMode ? 'bg-gray-800 border-yellow-700' : 'bg-white border-yellow-200'}`}>
                            <p className={`font-bold mb-2 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>📍 Instructions pour retirer votre prix</p>
                            <div className={`space-y-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              <p>Merci de vous présenter à nos bureaux munie de votre pièce d'identité afin de retirer votre prix.</p>
                              <div className={`mt-3 pt-2 border-t ${isDarkMode ? 'border-yellow-800' : 'border-yellow-100'}`}>
                                <p className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>📍 Adresse:</p>
                                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Avenue de la Révolution, Kinshasa, RDC</p>
                              </div>
                              <div>
                                <p className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>⏰ Horaires:</p>
                                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Lundi - Vendredi: 9h00 - 17h00</p>
                                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Samedi: 9h00 - 13h00</p>
                              </div>
                              <div>
                                <p className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>📞 Contact:</p>
                                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>+243 XX XXX XXXX</p>
                              </div>
                              <div className={`mt-3 p-2 rounded text-xs ${isDarkMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-700'}`}>
                                ⚠️ N'oubliez pas de vous munir de votre pièce d'identité et de ce message de notification.
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Additional Data for other types */}
                    {notification.data && notification.type !== 'winner' && (
                      <div className={`text-xs mt-2 space-y-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {typeof notification.data === 'string' && (
                          <p>{JSON.parse(notification.data).toString()}</p>
                        )}
                      </div>
                    )}

                    {/* Meta Info */}
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        {formatDate(notification.created_at)}
                      </span>
                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className={`text-xs font-medium transition-colors ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                          >
                            Marquer comme lu
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className={`text-xs font-medium transition-colors ${isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'}`}
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Unread Indicator */}
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`p-4 border-t rounded-b-lg text-center ${
        isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'
      }`}>
        <button
          onClick={fetchNotifications}
          className={`text-sm font-medium transition-colors flex items-center justify-center gap-2 mx-auto ${
            isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Rafraîchir
        </button>
      </div>

      {/* Modal de prévisualisation du ticket gagnant */}
      <TicketPreviewModal
        isOpen={!!selectedWinnerTicket}
        onClose={() => setSelectedWinnerTicket(null)}
        ticketNumber={selectedWinnerTicket?.ticketNumber}
        ownerName={selectedWinnerTicket?.ownerName}
        campaignTitle={selectedWinnerTicket?.campaignTitle}
        isWinner={true}
        prize={selectedWinnerTicket?.prizeName}
        prizeCategory={selectedWinnerTicket?.prizeCategory}
      />
    </div>
  );
};

export default NotificationsPanel;
