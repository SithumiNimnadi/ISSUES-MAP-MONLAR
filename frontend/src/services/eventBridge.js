import notificationService from './notificationService';

class EventBridge {
  constructor() {
    this.eventSource = null;
    this.pollingInterval = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  // Setup Server-Sent Events for real-time notifications
  setupSSE() {
    if (typeof window !== 'undefined' && !!window.EventSource) {
      try {
        this.eventSource = new EventSource('http://localhost:5001/api/events');
        
        this.eventSource.onopen = () => {
          console.log('SSE connection established');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          notificationService.success('Connected to server', '✅ Backend Connected');
        };
        
        this.eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleBackendEvent(data);
          } catch (error) {
            console.error('Error parsing event data:', error);
          }
        };
        
        this.eventSource.onerror = (error) => {
          console.error('SSE error:', error);
          if (this.isConnected) {
            this.isConnected = false;
            notificationService.error('Lost connection to server', '⚠️ Connection Lost');
          }
          this.reconnect();
        };
      } catch (error) {
        console.error('SSE setup error:', error);
        this.setupPolling();
      }
    } else {
      this.setupPolling();
    }
  }

  // Reconnect with exponential backoff
  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached, using polling fallback');
      this.setupPolling();
      return;
    }
    
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    
    setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      if (this.eventSource) {
        this.eventSource.close();
      }
      this.setupSSE();
    }, delay);
  }

  // Fallback: Polling for updates
  setupPolling() {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    
    this.pollingInterval = setInterval(async () => {
      await this.checkForUpdates();
    }, 30000); // Check every 30 seconds
  }

  // Check for backend updates
  async checkForUpdates() {
    try {
      const response = await fetch('http://localhost:5001/api/notifications/check');
      if (response.ok) {
        const data = await response.json();
        if (data.hasUpdates) {
          await this.fetchNewNotifications();
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }

  // Fetch new notifications from backend
  async fetchNewNotifications() {
    try {
      const response = await fetch('http://localhost:5001/api/notifications/recent');
      const notifications = await response.json();
      
      notifications.forEach(notification => {
        this.handleBackendEvent(notification);
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }

  // Handle different types of backend events
  handleBackendEvent(event) {
    console.log('Received event:', event);
    
    switch (event.type) {
      case 'new_issue':
        notificationService.notify(
          `${event.data?.title || 'A new environmental issue'} was reported in ${event.data?.district || 'your area'}`,
          '📍 New Issue Reported',
          'info'
        );
        break;

      case 'issue_resolved':
        notificationService.success(
          `${event.data?.title || 'An issue'} has been marked as resolved!`,
          '✅ Issue Resolved'
        );
        break;

      case 'issue_updated':
        notificationService.info(
          `${event.data?.title || 'An issue'} has been updated`,
          '📝 Issue Updated'
        );
        break;

      case 'new_research':
        notificationService.info(
          `"${event.data?.title || 'New research'}" has been published`,
          '🔬 Research Added'
        );
        break;

      case 'connection_made':
        notificationService.success(
          `Connected: "${event.data?.researchTitle}" → "${event.data?.issueTitle}"`,
          '🔗 Connection Made'
        );
        break;

      default:
        if (event.message) {
          const type = event.status === 'error' ? 'error' : 'info';
          notificationService[type](event.message, event.title || "Update");
        }
    }
  }

  // Trigger custom event for API calls
  triggerEvent(eventType, data) {
    this.handleBackendEvent({
      type: eventType,
      data: data,
      timestamp: new Date()
    });
  }

  // Clean up
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isConnected = false;
  }
}

const eventBridge = new EventBridge();
export default eventBridge;