import React, { ButtonHTMLAttributes } from 'react';
import { Spinner } from './Spinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'cta' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'full';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  ...props
}) => {
  const baseClasses = 'rounded-btn font-medium transition-all duration-150 inline-flex items-center justify-center active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-primary hover:bg-primary-hover text-white',
    cta: 'bg-cta hover:bg-cta-hover text-white',
    secondary: 'bg-transparent border border-teal text-teal hover:bg-teal-light',
    danger: 'bg-transparent border border-danger text-danger-text hover:bg-danger-light',
    ghost: 'bg-transparent text-neutral-muted hover:bg-neutral-bg'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5',
    lg: 'px-6 py-3 text-base',
    full: 'w-full px-4 py-3'
  };

  const variantClass = variants[variant] || variants.primary;
  const sizeClass = sizes[size] || sizes.md;

  return (
    <button 
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Spinner className="mr-2" />
          Loading...
        </>
      ) : children}
    </button>
  );
};
