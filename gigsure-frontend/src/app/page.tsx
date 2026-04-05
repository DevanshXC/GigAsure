'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Shield, TrendingUp, Zap } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // DEMO OVERRIDE: Disabled auto-redirect so you can view the landing page 
    // even while keeping your demo driver session active!
    // if (!isLoading && isAuthenticated) {
    //   router.push('/dashboard');
    // }
  }, [isLoading, isAuthenticated, router]);

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-neutral-bg flex items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-3xl animate-pulse shadow-md">
          G
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-bg flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="w-20 h-20 rounded-[28px] bg-primary text-white flex items-center justify-center font-bold text-4xl mb-8 shadow-md">
          G
        </div>
        
        <h1 className="text-4xl font-bold text-neutral-text text-center tracking-tight mb-4 leading-tight">
          GigaSure
        </h1>
        
        <p className="text-lg text-neutral-muted text-center max-w-[280px] mb-12">
          Parametric income protection for India's delivery economy.
        </p>

        {/* Feature Pills */}
        <div className="flex flex-col gap-3 mb-12 w-full max-w-xs">
          <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl shadow-sm border border-neutral-border">
            <div className="bg-success-light p-2 rounded-full text-success"><Zap size={18} /></div>
            <span className="text-sm font-medium text-neutral-text">Zero-touch instant claims</span>
          </div>
          <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl shadow-sm border border-neutral-border">
            <div className="bg-primary-light p-2 rounded-full text-primary"><Shield size={18} /></div>
            <span className="text-sm font-medium text-neutral-text">Weather & Traffic coverage</span>
          </div>
          <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl shadow-sm border border-neutral-border">
            <div className="bg-warning-light p-2 rounded-full text-warning-text"><TrendingUp size={18} /></div>
            <span className="text-sm font-medium text-neutral-text">Income-linked premiums</span>
          </div>
        </div>

        {/* Call to Action Actions */}
        <div className="w-full max-w-xs flex flex-col gap-3 mt-auto">
          <Link href="/login" className="w-full">
            <Button variant="primary" size="full" className="h-14 text-base bg-neutral-text hover:bg-black rounded-full shadow-md transition-transform duration-300 active:scale-95 text-white">
              Get Protected Now &rarr;
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
