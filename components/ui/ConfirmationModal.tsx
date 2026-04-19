import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: 'danger' | 'primary';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Delete',
  variant = 'danger'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="ghost-panel-elevated w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 flex gap-4">
          <div className="p-3 rounded bg-[rgba(240,240,250,0.06)] h-fit shrink-0">
            <AlertTriangle className="w-5 h-5 text-spectral/50" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-nav text-spectral">{title}</h3>
            <p className="text-xs text-spectral/40 mt-2 leading-relaxed">{description}</p>
          </div>
        </div>
        <div className="border-t border-[rgba(240,240,250,0.08)] px-6 py-4 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={variant} onClick={() => { onConfirm(); onClose(); }}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};