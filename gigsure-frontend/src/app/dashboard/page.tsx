'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePolicy } from '@/context/PolicyContext';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';

// Dashboard Components
import { DisruptionBanner } from '@/components/dashboard/DisruptionBanner';
import { HeroCard } from '@/components/dashboard/HeroCard';
import { MetricCards } from '@/components/dashboard/MetricCards';
import { ZoneRiskMap } from '@/components/dashboard/ZoneRiskMap';
import { NextWeekCoverage } from '@/components/dashboard/NextWeekCoverage';

export default function DashboardPage() {
  const router = useRouter();
  const { rider } = useAuth();
  const { 
    activePolicy, 
    activeClaim, 
    riskScore, 
    payoutSummary, 
    isLoading, 
    fetchAll 
  } = usePolicy();

  useEffect(() => {
    // Only fetch if rider exists and we don't have active policy loading or loaded yet.
    // fetchAll handles everything cleanly.
    if (rider?.rider_id) {
      fetchAll(rider.rider_id);
    }
  }, [rider?.rider_id]);

  return (
    <>
      <TopBar />
      
      <PageWrapper requireAuth={true}>
        {isLoading && !activePolicy ? (
          <div className="space-y-4 pt-4">
            <Skeleton.Card />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton.Metric />
              <Skeleton.Metric />
            </div>
            <div className="bg-white rounded-card p-4 shadow-card mt-6">
              <Skeleton.Text lines={4} />
            </div>
          </div>
        ) : (
          <div className="pt-4 pb-4 animate-in fade-in duration-300">
            {activeClaim?.status === 'open' && (
              <DisruptionBanner claim={activeClaim} />
            )}

            {activePolicy ? (
              // COVERED STATE
              <>
                <HeroCard policy={activePolicy} />
                <NextWeekCoverage riderId={rider?.rider_id || ''} />
                <MetricCards payoutSummary={payoutSummary} riskScore={riskScore} />
                {riskScore && <ZoneRiskMap riskScore={riskScore} />}
              </>
            ) : (
              // UNCOVERED STATE
              <div className="bg-primary-light border-2 border-dashed border-primary rounded-2xl p-6 text-center shadow-sm mt-4">
                <Shield size={48} className="text-primary mx-auto mb-3 opacity-90" />
                <h2 className="font-bold text-neutral-text text-xl mb-1">NOT COVERED</h2>
                <p className="text-sm text-neutral-muted mb-6">
                  Tap below to get protected this week
                </p>
                
                <Button 
                  variant="cta" 
                  size="full" 
                  onClick={() => router.push('/register')}
                >
                  Get Protected →
                </Button>
              </div>
            )}
          </div>
        )}
      </PageWrapper>
      
      <BottomNav />
    </>
  );
}
