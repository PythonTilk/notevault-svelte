import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

function createToastStore() {
  const { subscribe, update } = writable<Toast[]>([]);

  function addToast(toast: Omit<Toast, 'id'>) {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      id,
      duration: toast.duration || 5000,
      ...toast,
    };

    update(toasts => [...toasts, newToast]);

    // Auto-remove toast after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }

    return id;
  }

  function removeToast(id: string) {
    update(toasts => toasts.filter(toast => toast.id !== id));
  }

  function clearAll() {
    update(() => []);
  }

  // Convenience methods
  function success(title: string, message?: string, duration?: number) {
    return addToast({ type: 'success', title, message, duration: duration ?? 5000 });
  }

  function error(title: string, message?: string, duration?: number) {
    return addToast({ type: 'error', title, message, duration: duration ?? 7000 });
  }

  function warning(title: string, message?: string, duration?: number) {
    return addToast({ type: 'warning', title, message, duration: duration ?? 6000 });
  }

  function info(title: string, message?: string, duration?: number) {
    return addToast({ type: 'info', title, message, duration: duration ?? 4000 });
  }

  return {
    subscribe,
    addToast,
    removeToast,
    clearAll,
    success,
    error,
    warning,
    info,
  };
}

export const toastStore = createToastStore();

// Global error handler
export function handleError(error: unknown, context?: string) {
  console.error('Error in', context || 'application:', error);
  
  let title = 'Something went wrong';
  let message = 'An unexpected error occurred. Please try again.';

  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }

  if (context) {
    title = `Error in ${context}`;
  }

  toastStore.error(title, message);
}