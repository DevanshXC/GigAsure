'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell } from 'lucide-react';
import { usePolicy } from '@/context/PolicyContext';
import { useAuth } from '@/context/AuthContext';

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  rightElement?: React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = ({ title, showBack = false, rightElement }) => {
  const router = useRouter();
  const { activeClaim } = usePolicy();
  const { isAuthenticated } = useAuth();

  return (
    <div className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-neutral-border z-40 max-w-md mx-auto px-4 flex items-center justify-between">
      <div className="flex items-center flex-1">
        {showBack ? (
          <button onClick={() => router.back()} className="mr-3 p-1 rounded-full hover:bg-neutral-bg transition-colors">
            <ArrowLeft className="text-neutral-text" size={24} />
          </button>
        ) : (
          <div className="flex items-center space-x-2 mr-3">
            <div className="w-8 h-8 rounded bg-primary text-white flex items-center justify-center font-bold">
              G
            </div>
          </div>
        )}
        <h1 className="font-semibold text-lg text-neutral-text truncate">
          {title || 'GigaSure'}
        </h1>
      </div>

      <div className="flex items-center space-x-3">
        {rightElement ? rightElement : null}
        
        {/* Default Bell Icon if authenticated and no rightElement explicitly provided */}
        {isAuthenticated && !rightElement && (
          <button className="relative p-1 rounded-full hover:bg-neutral-bg transition-colors">
            <Bell className="text-neutral-text" size={24} />
            {activeClaim?.status === 'open' && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-cta rounded-full animate-pulse border-2 border-white" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};
