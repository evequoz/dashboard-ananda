import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  onClose: (id: string) => void;
  duration?: number;
}

export const Toast = ({ id, type, message, onClose, duration = 5000 }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
  };

  const styles = {
    success: 'bg-gradient-to-r from-[#4caf7d]/20 to-[#3d8f64]/20 border-[#4caf7d] text-[#4caf7d]',
    error: 'bg-gradient-to-r from-[#d95555]/20 to-[#c44444]/20 border-[#d95555] text-[#d95555]',
    warning: 'bg-gradient-to-r from-[#c9a84c]/20 to-[#e8c97a]/20 border-[#c9a84c] text-[#c9a84c]',
    info: 'bg-gradient-to-r from-[#7b5ea7]/20 to-[#6a4d96]/20 border-[#7b5ea7] text-[#7b5ea7]',
  };

  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border ${styles[type]} backdrop-blur-md animate-slideUp shadow-xl mb-3 min-w-[320px]`}>
      <div>{icons[type]}</div>
      <p className="flex-1 text-sm font-medium text-[#e8e4d9]">{message}</p>
      <button
        onClick={() => onClose(id)}
        className="p-1 rounded-lg hover:bg-white/10 transition-colors"
        aria-label="Fermer"
      >
        <X className="w-4 h-4 text-[#5a587a] hover:text-[#e8e4d9]" />
      </button>
    </div>
  );
};
