import React, { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftAddon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftAddon, className = '', ...props }, ref) => {
    return (
      <div className="w-full mb-4">
        {label && (
          <label className="block text-sm font-medium text-neutral-text mb-1">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftAddon && (
            <div className="flex items-center justify-center bg-neutral-bg border border-r-0 border-neutral-border rounded-l-btn px-3 h-12 text-neutral-muted">
              {leftAddon}
            </div>
          )}
          <input
            ref={ref}
            className={`flex-1 h-12 px-3 border border-neutral-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all ${leftAddon ? 'rounded-r-btn' : 'rounded-btn'} ${error ? 'border-danger-DEFAULT focus:border-danger-DEFAULT focus:ring-danger-DEFAULT' : ''} ${className}`}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-danger-DEFAULT">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-neutral-muted">{helperText}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
