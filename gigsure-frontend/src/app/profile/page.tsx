'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/layout/TopBar';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { User, LogOut, Phone, MapPin, Briefcase } from 'lucide-react';

export default function ProfilePage() {
  const { rider, logout } = useAuth();
  const router = useRouter();

  return (
    <>
      <TopBar title="Profile" showBack />
      <PageWrapper requireAuth={true}>
        <div className="pt-6 pb-20">
          
          <div className="google-card p-6 flex flex-col items-center mb-6">
            <div className="w-20 h-20 rounded-full bg-primary-light text-primary flex items-center justify-center mb-4">
              <User size={40} />
            </div>
            <h2 className="text-xl font-bold text-neutral-text mb-1">
              {rider?.name || 'Giga Rider'}
            </h2>
            <div className="bg-success-light px-3 py-1 rounded-pill mt-2">
              <span className="text-xs font-bold text-success uppercase tracking-wider">
                {rider?.coverage_tier || 'Full'} Coverage Active
              </span>
            </div>
          </div>

          <div className="google-card p-0 overflow-hidden mb-6">
            <h3 className="px-5 pt-5 pb-2 text-sm font-bold text-neutral-muted uppercase tracking-wider">
              Verification Details
            </h3>
            
            <div className="border-b border-neutral-bg">
              <div className="px-5 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-neutral-bg flex items-center justify-center text-neutral-muted">
                  <Phone size={20} />
                </div>
                <div>
                  <p className="text-xs text-neutral-muted">Mobile Number</p>
                  <p className="font-semibold text-neutral-text">{rider?.phone || '--'}</p>
                </div>
              </div>
            </div>

            <div className="border-b border-neutral-bg">
              <div className="px-5 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-neutral-bg flex items-center justify-center text-neutral-muted">
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="text-xs text-neutral-muted">Primary Zone</p>
                  <p className="font-semibold text-neutral-text">{rider?.zone_id || '--'} · {rider?.city}</p>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-neutral-bg flex items-center justify-center text-neutral-muted">
                <Briefcase size={20} />
              </div>
              <div>
                <p className="text-xs text-neutral-muted">Platform</p>
                <p className="font-semibold text-neutral-text capitalize">{rider?.platform || '--'}</p>
              </div>
            </div>
          </div>

          <div className="google-card p-5">
            <Button 
              variant="danger" 
              size="full" 
              className="py-4 font-bold flex items-center justify-center gap-2 rounded-xl"
              onClick={() => logout()}
            >
              <LogOut size={20} />
              Log Out Securely
            </Button>
            <p className="text-center text-xs text-neutral-muted mt-4">
              GigaSure App v1.0.0
            </p>
          </div>

        </div>
      </PageWrapper>
    </>
  );
}
