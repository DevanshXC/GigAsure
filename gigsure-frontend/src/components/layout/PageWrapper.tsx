'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '../ui/Spinner';

interface PageWrapperProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export const PageWrapper: React.FC<PageWrapperProps> = ({ children, requireAuth = true }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && requireAuth && !isAuthenticated) {
      if (pathname !== '/login' && !pathname.startsWith('/register')) {
        router.push('/login');
      }
    }
  }, [isLoading, isAuthenticated, requireAuth, router, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-bg flex items-center justify-center pt-14 pb-20 max-w-md mx-auto px-4">
        <Spinner className="w-8 h-8 text-primary" />
      </div>
    );
  }

  // Determine paddings dynamically based on whether it's an auth page or general app page
  const isAuthPage = pathname === '/login' || pathname.startsWith('/register');
  const pt = isAuthPage ? 'pt-0' : 'pt-14';
  const pb = isAuthPage ? 'pb-0' : 'pb-20';

  return (
    <div className={`min-h-screen bg-neutral-bg ${pt} ${pb} px-4 max-w-md mx-auto w-full transition-all duration-300`}>
      {children}
    </div>
  );
};
