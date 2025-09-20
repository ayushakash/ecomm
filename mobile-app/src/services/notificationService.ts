// Simple notification service that can be used anywhere
// This will be replaced with the context-based approach once we refactor

interface NotificationData {
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

class NotificationService {
  private showNotificationFunction: ((data: NotificationData) => void) | null = null;

  setShowNotification(fn: (data: NotificationData) => void) {
    this.showNotificationFunction = fn;
  }

  show(data: NotificationData) {
    if (this.showNotificationFunction) {
      this.showNotificationFunction(data);
    } else {
      console.warn('Notification service not initialized');
    }
  }

  success(title: string, message?: string) {
    this.show({ type: 'success', title, message });
  }

  error(title: string, message?: string) {
    this.show({ type: 'error', title, message });
  }

  info(title: string, message?: string) {
    this.show({ type: 'info', title, message });
  }

  warning(title: string, message?: string) {
    this.show({ type: 'warning', title, message });
  }
}

export const notificationService = new NotificationService();
export default notificationService;