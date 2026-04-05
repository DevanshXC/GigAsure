import React, { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  padding?: string;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  hoverable = false,
  padding = 'p-4',
  ...props 
}) => {
  const base = 'bg-white rounded-card border border-neutral-border shadow-card';
  const hover = hoverable ? 'hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer' : '';
  
  return (
    <div className={`${base} ${hover} ${padding} ${className}`} {...props}>
      {children}
    </div>
  );
};
