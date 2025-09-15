import React, { createContext, useCallback, useContext, useState } from 'react';
import AlertDialog, { AlertType } from '../components/AlertDialog';

interface AlertOptions {
  title?: string;
  type?: AlertType;
  confirmText?: string;
}

interface AlertState {
  open: boolean;
  message: string;
  title?: string;
  type: AlertType;
  confirmText: string;
}

interface AlertContextType {
  showAlert: (message: string, options?: AlertOptions) => void;
  showSuccess: (message: string, options?: Omit<AlertOptions, 'type'>) => void;
  showError: (message: string, options?: Omit<AlertOptions, 'type'>) => void;
  showWarning: (message: string, options?: Omit<AlertOptions, 'type'>) => void;
  showInfo: (message: string, options?: Omit<AlertOptions, 'type'>) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: '',
    type: 'info',
    confirmText: 'OK',
  });

  const showAlert = useCallback((message: string, options: AlertOptions = {}) => {
    setAlertState({
      open: true,
      message,
      title: options.title,
      type: options.type || 'info',
      confirmText: options.confirmText || 'OK',
    });
  }, []);

  const showSuccess = useCallback(
    (message: string, options: Omit<AlertOptions, 'type'> = {}) => {
      showAlert(message, { ...options, type: 'success' });
    },
    [showAlert]
  );

  const showError = useCallback(
    (message: string, options: Omit<AlertOptions, 'type'> = {}) => {
      showAlert(message, { ...options, type: 'error' });
    },
    [showAlert]
  );

  const showWarning = useCallback(
    (message: string, options: Omit<AlertOptions, 'type'> = {}) => {
      showAlert(message, { ...options, type: 'warning' });
    },
    [showAlert]
  );

  const showInfo = useCallback(
    (message: string, options: Omit<AlertOptions, 'type'> = {}) => {
      showAlert(message, { ...options, type: 'info' });
    },
    [showAlert]
  );

  const closeAlert = useCallback(() => {
    setAlertState(prev => ({ ...prev, open: false }));
  }, []);

  const contextValue: AlertContextType = {
    showAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <AlertContext.Provider value={contextValue}>
      {children}
      <AlertDialog
        open={alertState.open}
        onClose={closeAlert}
        message={alertState.message}
        title={alertState.title}
        type={alertState.type}
        confirmText={alertState.confirmText}
      />
    </AlertContext.Provider>
  );
};

export const useAlert = (): AlertContextType => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};