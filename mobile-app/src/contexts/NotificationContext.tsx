import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import BeautifulNotification from '../components/ui/BeautifulNotification';
import { notificationService } from '../services/notificationService';

interface NotificationData {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

interface NotificationContextType {
  showNotification: (data: Omit<NotificationData, 'id'>) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notification, setNotification] = useState<NotificationData | null>(null);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Register with notification service
  useEffect(() => {
    notificationService.setShowNotification(showNotification);
  }, []);

  const showNotification = (data: Omit<NotificationData, 'id'>) => {
    const newNotification: NotificationData = {
      ...data,
      id: generateId(),
    };
    setNotification(newNotification);
  };

  const hideNotification = () => {
    setNotification(null);
  };

  const showSuccess = (title: string, message?: string) => {
    showNotification({ type: 'success', title, message });
  };

  const showError = (title: string, message?: string) => {
    showNotification({ type: 'error', title, message });
  };

  const showInfo = (title: string, message?: string) => {
    showNotification({ type: 'info', title, message });
  };

  const showWarning = (title: string, message?: string) => {
    showNotification({ type: 'warning', title, message });
  };

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        showSuccess,
        showError,
        showInfo,
        showWarning,
      }}
    >
      {children}
      {notification && (
        <BeautifulNotification
          type={notification.type}
          title={notification.title}
          message={notification.message}
          visible={!!notification}
          onDismiss={hideNotification}
          duration={notification.duration}
        />
      )}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;