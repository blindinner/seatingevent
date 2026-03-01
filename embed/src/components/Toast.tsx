import { useEffect, useState } from 'react';

interface ToastMessage {
  id: string;
  type: 'error' | 'success' | 'info';
  message: string;
}

interface ToastContainerProps {
  error: string | null;
  onClearError: () => void;
}

export function ToastContainer({ error, onClearError }: ToastContainerProps) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    if (error) {
      const id = Date.now().toString();
      setToasts((prev) => [...prev, { id, type: 'error', message: error }]);

      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        onClearError();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [error, onClearError]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="smw-toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`smw-toast smw-toast-${toast.type}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
