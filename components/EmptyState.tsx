import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './ui/Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-4 py-12 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="w-20 h-20 rounded bg-[rgba(240,240,250,0.04)] border border-[rgba(240,240,250,0.08)] flex items-center justify-center mb-8">
        <Icon className="w-9 h-9 text-spectral/20" strokeWidth={1.5} />
      </div>
      
      <h3 className="text-sm font-bold uppercase tracking-nav text-spectral mb-3">
        {title}
      </h3>
      
      <p className="text-xs text-spectral/30 uppercase tracking-micro mb-8 max-w-sm leading-relaxed">
        {description}
      </p>

      {action && (
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={action.onClick} size="lg">
            {action.label}
          </Button>
          {secondaryAction && (
            <Button 
              onClick={secondaryAction.onClick} 
              variant="outline" 
              size="lg"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
