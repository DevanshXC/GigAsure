import React from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'primary' | 'teal' | 'neutral';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ 
  variant = 'neutral', 
  size = 'sm',
  children,
  className = ''
}) => {
  const base = 'inline-flex items-center justify-center font-medium rounded-pill';
  
  const variants = {
    success: 'bg-success-light text-success-text',
    warning: 'bg-warning-light text-warning-text',
    danger: 'bg-danger-light text-danger-text',
    primary: 'bg-primary-light text-primary-text',
    teal: 'bg-teal-light text-teal-DEFAULT',
    neutral: 'bg-neutral-bg text-neutral-muted'
  };

  const sizes = {
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm'
  };

  return (
    <span className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
};
