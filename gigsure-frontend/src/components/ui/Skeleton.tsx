import React from 'react';

export const Skeleton = ({ className = '' }: { className?: string }) => {
  return <div className={`bg-neutral-bg animate-pulse rounded ${className}`} />;
};

Skeleton.Card = ({ className = '' }: { className?: string }) => (
  <Skeleton className={`h-36 w-full rounded-card ${className}`} />
);

Skeleton.Text = ({ className = '', lines = 1 }: { className?: string, lines?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className={`h-4 w-full rounded ${className}`} />
    ))}
  </div>
);

Skeleton.Circle = ({ className = '' }: { className?: string }) => (
  <Skeleton className={`h-10 w-10 rounded-full ${className}`} />
);

Skeleton.Metric = ({ className = '' }: { className?: string }) => (
  <Skeleton className={`h-24 w-full rounded-card ${className}`} />
);
