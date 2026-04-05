'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Shield, FileText, Wallet, User } from 'lucide-react';
import { usePolicy } from '@/context/PolicyContext';
import { useAuth } from '@/context/AuthContext';

export const BottomNav = () => {
  const pathname = usePathname();
  const { activeClaim } = usePolicy();
  const { isAuthenticated } = useAuth();

  // Do not show on unauthenticated routes (login/register)
  if (!isAuthenticated || pathname === '/login' || pathname.startsWith('/register')) {
    return null;
  }

  const tabs = [
    { name: 'Home', href: '/dashboard', icon: Home },
    { name: 'Coverage', href: '/coverage', icon: Shield },
    { name: 'Claims', href: '/claims', icon: FileText },
    { name: 'Payouts', href: '/payouts', icon: Wallet },
    { name: 'Profile', href: '/profile', icon: User }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-neutral-border z-50 pb-[env(safe-area-inset-bottom)] max-w-md mx-auto">
      <div className="flex justify-around items-center h-full">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          const Icon = tab.icon;

          return (
            <Link key={tab.name} href={tab.href} className="relative flex flex-col items-center justify-center w-16 h-full">
              <div className="relative">
                <Icon size={24} className={isActive ? 'text-primary' : 'text-neutral-muted'} strokeWidth={isActive ? 2.5 : 2} />
                {tab.name === 'Claims' && activeClaim?.status === 'open' && (
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-cta rounded-full animate-pulse border-2 border-white" />
                )}
              </div>
              <span className={`text-[10px] mt-1 font-medium ${isActive ? 'text-primary' : 'text-neutral-muted'}`}>
                {tab.name}
              </span>
              {isActive && (
                <div className="absolute -bottom-2 w-1 h-1 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
};
