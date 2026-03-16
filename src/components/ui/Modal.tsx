import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal = ({ isOpen, onClose, title, children, size = 'md' }: ModalProps) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className={`relative ${sizeClasses[size]} w-full bg-gradient-to-br from-[#0f0f1a] to-[#141425] border border-[#c9a84c]/30 rounded-2xl shadow-2xl shadow-[#c9a84c]/20 animate-scaleIn`}>
        <div className="flex items-center justify-between p-6 border-b border-[#22223a]">
          <h2 className="text-2xl font-semibold text-[#e8c97a]">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#22223a] transition-colors duration-200 group"
            aria-label="Fermer"
          >
            <X className="w-5 h-5 text-[#5a587a] group-hover:text-[#e8c97a] transition-colors" />
          </button>
        </div>

        <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};
