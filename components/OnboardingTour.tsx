import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronRight, ChevronLeft, Check, X, Sparkles, LayoutDashboard, BarChart2, Plus, PenTool } from 'lucide-react';
import { Button } from './ui/Button';

interface TourStep {
  targetId?: string; // If undefined, it's a centered modal
  title: string;
  description: string;
  icon?: React.ReactNode;
  placement?: 'top' | 'bottom';
  requiresInteraction?: boolean;
}

interface OnboardingTourProps {
  onComplete: () => void;
  isFormOpen: boolean;
}

const STEPS: TourStep[] = [
  {
    title: "Welcome to HabitFlow",
    description: "Your new premium workspace for personal growth. Let's take a quick tour and create your first habit.",
    icon: <Sparkles className="w-8 h-8 text-indigo-600" />,
  },
  {
    targetId: 'habit-grid-area',
    title: "Your Weekly Grid",
    description: "This is your command center. Click any day to log a habit. We've optimized this view to give you a clear snapshot of your week at a glance.",
    placement: 'top',
    icon: <LayoutDashboard className="w-6 h-6 text-indigo-600" />,
  },
  {
    targetId: 'view-toggles',
    title: "Analytics & Settings",
    description: "Switch seamlessly between your Daily Dashboard, detailed Analytics to visualize trends, and Settings to manage your data backup.",
    placement: 'bottom',
    icon: <BarChart2 className="w-6 h-6 text-indigo-600" />,
  },
  {
    targetId: 'btn-new-habit',
    title: "Create a Habit",
    description: "Ready? Click the 'New Habit' button now to open the creation form.",
    placement: 'bottom',
    icon: <Plus className="w-6 h-6 text-indigo-600" />,
    requiresInteraction: true,
  },
  {
    targetId: 'habit-form-modal',
    title: "Customize Your Habit",
    description: "Give your habit a name, pick a category, and choose a color. When you're ready, click 'Create Habit' to save it.",
    placement: 'top',
    icon: <PenTool className="w-6 h-6 text-indigo-600" />,
    requiresInteraction: true,
  }
];

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ onComplete, isFormOpen }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const cardRef = useRef<HTMLDivElement>(null);

  const currentStep = STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === STEPS.length - 1;

  // --- Automatic Step Progression based on App State ---
  useEffect(() => {
    // If we are on the "Click New Habit" step and the form opens -> Go next
    if (currentStepIndex === 3 && isFormOpen) {
      setCurrentStepIndex(4);
    }
    // If we are on the "Customize Habit" step and the form closes -> Complete tour
    if (currentStepIndex === 4 && !isFormOpen) {
      onComplete();
    }
  }, [isFormOpen, currentStepIndex, onComplete]);

  // 1. Handle Scrolling (Only when step changes)
  useEffect(() => {
    if (currentStep.targetId) {
      // Small timeout to allow element to render (especially the modal)
      setTimeout(() => {
        const element = document.getElementById(currentStep.targetId!);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
      }, 150);
    }
  }, [currentStep.targetId]);

  // 2. Handle Positioning (Idempotent, safe to call frequently)
  const updatePosition = useCallback(() => {
    if (currentStep.targetId) {
      const element = document.getElementById(currentStep.targetId);
      if (element) {
        const r = element.getBoundingClientRect();
        
        // Check if element is effectively hidden
        if (r.width === 0 && r.height === 0) {
            setRect(null);
            setPopoverStyle({});
            return;
        }

        setRect(r);

        const cardHeight = 280; 
        const cardWidth = 380; // max-w-[380px]
        const padding = 20;

        const spaceBelow = window.innerHeight - r.bottom;
        const spaceAbove = r.top;
        
        let placement = currentStep.placement || 'bottom';

        // Auto-flip logic
        if (placement === 'bottom' && spaceBelow < cardHeight && spaceAbove > cardHeight) {
          placement = 'top';
        } 
        else if (placement === 'top' && spaceAbove < cardHeight && spaceBelow > cardHeight) {
          placement = 'bottom';
        }

        const style: React.CSSProperties = {};

        // Horizontal centering with viewport clamping
        let left = r.left + (r.width / 2) - (cardWidth / 2);
        left = Math.max(16, Math.min(window.innerWidth - cardWidth - 16, left));
        
        style.left = left;

        if (placement === 'top') {
          style.bottom = window.innerHeight - r.top + padding;
          style.top = 'auto';
        } else {
          style.top = r.bottom + padding;
          style.bottom = 'auto';
        }

        setPopoverStyle(style);
      } else {
        setRect(null);
        setPopoverStyle({});
      }
    } else {
      setRect(null);
      setPopoverStyle({});
    }
  }, [currentStep.targetId, currentStep.placement]);

  useEffect(() => {
    updatePosition();
    let rafId: number;
    const handleUpdate = () => { rafId = requestAnimationFrame(updatePosition); };
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, { capture: true });
    
    // Additional interval to catch layout changes (like modal appearing)
    const interval = setInterval(updatePosition, 500);

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(interval);
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, { capture: true });
    };
  }, [updatePosition, currentStepIndex]);

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const isCentered = !rect;

  return (
    <div className="fixed inset-0 z-[100] font-sans pointer-events-none">
      {/* Spotlight Backdrop */}
      <div 
        className="absolute inset-0 transition-all duration-500 ease-in-out pointer-events-none"
        style={rect ? {
            boxShadow: `0 0 0 9999px rgba(15, 23, 42, 0.75)`, 
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            borderRadius: '12px'
        } : {
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            top: 0, left: 0, width: '100%', height: '100%'
        }}
      >
         {/* Animated ring around the target */}
         {rect && (
           <div className="absolute -inset-[2px] rounded-xl border-2 border-indigo-400 opacity-50 animate-pulse" />
         )}
      </div>

      {/* Popover Card */}
      <div 
        ref={cardRef}
        className={`absolute transition-all duration-300 ease-out flex flex-col items-center justify-center w-full ${isCentered ? 'inset-0 pointer-events-none' : ''}`}
        style={!isCentered ? { position: 'absolute', ...popoverStyle, width: 'auto' } : {}}
      >
        <div className={`
            bg-white p-6 rounded-2xl shadow-2xl w-full max-w-[380px] border border-white/20 
            animate-in fade-in zoom-in-95 duration-300 pointer-events-auto
            ${isCentered ? 'mx-4' : ''}
          `}>
          
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="p-3 bg-indigo-50 rounded-xl shrink-0">
              {currentStep.icon}
            </div>
            <button 
              onClick={onComplete}
              className="text-xs font-medium text-slate-400 hover:text-slate-600 px-2 py-1 rounded hover:bg-slate-50 transition-colors"
            >
              Skip Tour
            </button>
          </div>

          {/* Content */}
          <div className="space-y-2 mb-8">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              {currentStep.title}
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              {currentStep.description}
            </p>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {/* Dots */}
            <div className="flex gap-1.5">
              {STEPS.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStepIndex ? 'w-4 bg-indigo-600' : 'w-1.5 bg-slate-200'
                  }`}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              {currentStepIndex > 0 && !currentStep.requiresInteraction && (
                <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={handlePrev}
                    className="!px-2"
                    aria-label="Previous step"
                >
                    <ChevronLeft size={16} />
                </Button>
              )}
              
              {currentStep.requiresInteraction ? (
                <div className="text-sm font-medium text-indigo-600 animate-pulse px-3 py-1">
                  Waiting for you...
                </div>
              ) : (
                <Button onClick={handleNext} size="sm" className="gap-2 pl-4 pr-3">
                  {isLastStep ? 'Get Started' : 'Next'}
                  {isLastStep ? <Check size={14} /> : <ChevronRight size={14} />}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};