import React from 'react';

interface StepProgressProps {
  steps: string[];
  current: number; // 0-indexed
}

export const StepProgress: React.FC<StepProgressProps> = ({ steps, current }) => {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-neutral-bg -z-10" />
        
        {steps.map((step, index) => {
          const isCompleted = index < current;
          const isActive = index === current;
          const isPending = index > current;

          return (
            <div key={step} className="flex flex-col items-center relative z-10">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all
                  ${isCompleted ? 'bg-success-DEFAULT text-white' : ''}
                  ${isActive ? 'bg-primary text-white' : ''}
                  ${isPending ? 'bg-white border-2 border-neutral-border text-neutral-muted' : ''}
                `}
              >
                {isCompleted ? '✓' : (index + 1)}
              </div>
              
              <div 
                className={`absolute top-10 text-xs font-medium whitespace-nowrap
                  ${isActive ? 'text-primary' : 'text-neutral-muted'}
                `}
              >
                {step}
              </div>
            </div>
          );
        })}
      </div>
      {/* Spacer to account for absolute positioned labels */}
      <div className="h-6" /> 
    </div>
  );
};
