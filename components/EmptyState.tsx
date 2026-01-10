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
      <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
        <Icon className="w-10 h-10 text-slate-400 dark:text-slate-500" strokeWidth={1.5} />
      </div>
      
      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
        {title}
      </h3>
      
      <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md leading-relaxed">
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
