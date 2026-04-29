import React, { useState, useEffect } from 'react';
import notificationService from '../services/notificationService';
import './NotificationBell.css';

function NotificationBell({ t }) {
  const [showPanel, setShowPanel] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    // Check permission
    if (typeof window !== 'undefined' && "Notification" in window && Notification.permission === "granted") {
      setPermissionGranted(true);
    }

    // Listen for notification updates
    notificationService.addListener((updatedNotifications) => {
      setNotifications(updatedNotifications);
      setUnreadCount(updatedNotifications.filter(n => !n.read).length);
    });

    // Load existing notifications
    setNotifications(notificationService.getNotifications());
    setUnreadCount(notificationService.getUnreadCount());
  }, []);

  const requestPermission = async () => {
    const granted = await notificationService.requestPermission();
    setPermissionGranted(granted);
  };

  const markAsRead = (id) => {
    notificationService.markAsRead(id);
  };

  const clearAll = () => {
    notificationService.clearNotifications();
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const diff = now - new Date(timestamp);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="notification-bell-container">
      <button 
        className="notification-bell-btn"
        onClick={() => setShowPanel(!showPanel)}
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-count">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {showPanel && (
        <>
          <div className="notification-overlay" onClick={() => setShowPanel(false)}></div>
          <div className="notification-panel">
            <div className="notification-header">
              <h3>🔔 {t?.('notifications') || 'Notifications'}</h3>
              <div className="notification-actions">
                {!permissionGranted && (
                  <button 
                    className="enable-notif-btn"
                    onClick={requestPermission}
                  >
                    🔔 {t?.('enable') || 'Enable'}
                  </button>
                )}
                {notifications.length > 0 && (
                  <button className="clear-all-btn" onClick={clearAll}>
                    🗑️ {t?.('clearAll') || 'Clear'}
                  </button>
                )}
              </div>
            </div>

            <div className="notification-list">
              {notifications.length === 0 ? (
                <div className="no-notifications">
                  <span>🔕</span>
                  <p>{t?.('noNotifications') || 'No notifications yet'}</p>
                  <small>{t?.('notificationsWillAppear') || 'Notifications will appear here'}</small>
                </div>
              ) : (
                notifications.map(notif => (
                  <div 
                    key={notif.id} 
                    className={`notification-item ${!notif.read ? 'unread' : ''}`}
                    onClick={() => markAsRead(notif.id)}
                  >
                    <div className={`notification-icon ${notif.type}`}>
                      {notif.type === 'success' ? '✅' : 
                       notif.type === 'error' ? '❌' : 
                       notif.type === 'warning' ? '⚠️' : 'ℹ️'}
                    </div>
                    <div className="notification-content">
                      <div className="notification-title">{notif.title}</div>
                      <div className="notification-message">{notif.body}</div>
                      <div className="notification-time">{formatTime(notif.timestamp)}</div>
                    </div>
                    {!notif.read && <div className="unread-dot"></div>}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default NotificationBell;