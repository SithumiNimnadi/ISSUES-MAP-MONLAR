// Notification Service for browser push notifications
class NotificationService {
  constructor() {
    this.permission = false;
    this.notifications = [];
    this.listeners = [];
  }

  // Request permission for notifications
  async requestPermission() {
    if (!("Notification" in window)) {
      console.log("This browser does not support notifications");
      return false;
    }

    const permission = await Notification.requestPermission();
    this.permission = permission === "granted";
    
    if (this.permission) {
      this.showToast("✅ Notifications enabled! You'll receive real-time updates.", "success");
      this.addToHistory("Notifications Enabled", "You'll receive real-time updates", "success");
    }
    
    return this.permission;
  }

  // Check if notifications are supported and permitted
  isSupported() {
    return "Notification" in window && this.permission;
  }

  // Show toast notification
  showToast(message, type = 'info') {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('showToast', {
        detail: { message, type }
      }));
    }
  }

  // Show browser notification
  showBrowserNotification(title, options = {}) {
    if (!this.isSupported()) return null;

    const defaultOptions = {
      body: "",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      silent: false,
      vibrate: [200, 100, 200],
      requireInteraction: false,
      tag: Date.now().toString(),
      ...options
    };

    const notification = new Notification(title, defaultOptions);
    
    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);

    // Handle click
    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      notification.close();
      
      if (options.onClick) {
        options.onClick();
      }
    };

    return notification;
  }

  // Get notification type from title
  getNotificationType(title) {
    if (title.includes('Success') || title.includes('Enabled') || title.includes('Connected')) return 'success';
    if (title.includes('Error') || title.includes('Failed') || title.includes('Lost')) return 'error';
    if (title.includes('Warning')) return 'warning';
    return 'info';
  }

  // Add notification to history
  addToHistory(title, body, type = 'info') {
    const notification = {
      id: Date.now(),
      title,
      body,
      type: this.getNotificationType(title) || type,
      timestamp: new Date(),
      read: false
    };
    this.notifications.unshift(notification);
    this.notifyListeners();
    
    // Keep only last 50 notifications
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }
    
    return notification;
  }

  // Get all notifications
  getNotifications() {
    return this.notifications;
  }

  // Get unread count
  getUnreadCount() {
    return this.notifications.filter(n => !n.read).length;
  }

  // Mark notification as read
  markAsRead(id) {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.notifyListeners();
    }
  }

  // Mark all as read
  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.notifyListeners();
  }

  // Clear all notifications
  clearNotifications() {
    this.notifications = [];
    this.notifyListeners();
  }

  // Add listener for notification changes
  addListener(callback) {
    this.listeners.push(callback);
  }

  // Remove listener
  removeListener(callback) {
    this.listeners = this.listeners.filter(cb => cb !== callback);
  }

  // Notify all listeners of changes
  notifyListeners() {
    this.listeners.forEach(callback => callback(this.notifications));
  }

  // Main notification method - shows BOTH toast, browser notification, and stores history
  notify(message, title = "Update", type = 'info') {
    // Show toast notification
    this.showToast(message, type);
    
    // Store in history
    this.addToHistory(title, message, type);
    
    // Show browser notification if permitted
    if (this.isSupported()) {
      this.showBrowserNotification(title, { body: message });
    }
    
    // Also dispatch a custom event for any other listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('notification', {
        detail: { message, title, type }
      }));
    }
  }

  // Success notification
  success(message, title = "Success") {
    this.notify(message, title, 'success');
  }

  // Error notification
  error(message, title = "Error") {
    this.notify(message, title, 'error');
  }

  // Info notification
  info(message, title = "Information") {
    this.notify(message, title, 'info');
  }

  // Warning notification
  warning(message, title = "Warning") {
    this.notify(message, title, 'warning');
  }
}

const notificationService = new NotificationService();
export default notificationService;