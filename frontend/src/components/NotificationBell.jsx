import React, { useState, useEffect } from 'react';
import notificationService from '../services/notificationService';
import { useAuth } from '../context/AuthContext';
import './NotificationBell.css';

function NotificationBell({ t }) {
  const [showPanel, setShowPanel] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const { isAdmin } = useAuth();

  useEffect(() => {
    // Only load notifications if user is admin
    if (!isAdmin()) {
      return;
    }

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
  }, [isAdmin]);

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

  // Don't render anything if not admin
  if (!isAdmin()) {
    return null;
  }

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      new_issue: '📋',
      issue_resolved: '✅',
      new_research: '🔬',
      connection_made: '🔗'
    };
    return icons[type] || '🔔';
  };

  // Get notification color class
  const getNotificationClass = (type) => {
    const classes = {
      success: 'notification-success',
      error: 'notification-error',
      warning: 'notification-warning',
      new_issue: 'notification-issue',
      issue_resolved: 'notification-resolved',
      new_research: 'notification-research',
      connection_made: 'notification-connection'
    };
    return classes[type] || 'notification-info';
  };

  return (
    <div className="notification-bell-container">
      <button 
        className="notification-bell-btn"
        onClick={() => setShowPanel(!showPanel)}
        title={t?.('notifications') || 'Notifications'}
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
              <h3>
                <span className="header-icon">🔔</span>
                {t?.('notifications') || 'Notifications'}
              </h3>
              <div className="notification-actions">
                {!permissionGranted && (
                  <button 
                    className="enable-notif-btn"
                    onClick={requestPermission}
                    title={t?.('enableBrowserNotifications') || 'Enable browser notifications'}
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
                  <span className="no-notif-icon">🔕</span>
                  <p>{t?.('noNotifications') || 'No notifications yet'}</p>
                  <small>{t?.('notificationsWillAppear') || 'When new issues or research are added, you will see them here'}</small>
                </div>
              ) : (
                notifications.map(notif => (
                  <div 
                    key={notif.id} 
                    className={`notification-item ${!notif.read ? 'unread' : ''} ${getNotificationClass(notif.type)}`}
                    onClick={() => markAsRead(notif.id)}
                  >
                    <div className={`notification-icon ${notif.type}`}>
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div className="notification-content">
                      <div className="notification-title">{notif.title}</div>
                      <div className="notification-message">{notif.body || notif.message}</div>
                      <div className="notification-time">{formatTime(notif.timestamp)}</div>
                    </div>
                    {!notif.read && <div className="unread-dot"></div>}
                  </div>
                ))
              )}
            </div>
            
            {notifications.length > 0 && (
              <div className="notification-footer">
                <span className="notification-stats">
                  📊 {unreadCount} {t?.('unread') || 'unread'} • {notifications.length} {t?.('total') || 'total'}
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default NotificationBell;