'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePolicy } from '@/context/PolicyContext';
import { getClaimHistory } from '@/lib/api';
import { Claim } from '@/types';
import { 
  formatDate, 
  getTriggerIcon, 
  getTriggerLabel, 
  getClaimStatusColor 
} from '@/lib/utils';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { DisruptionBanner } from '@/components/dashboard/DisruptionBanner';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Shield } from 'lucide-react';

const FILTERS = ['All', 'Open', 'Approved', 'Paid', 'Flagged', 'Rejected'];

export default function ClaimsPage() {
  const router = useRouter();
  const { rider } = useAuth();
  const riderId = rider?.rider_id;
  const { activeClaim } = usePolicy();
  
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    const fetchClaims = async () => {
      if (!riderId) return;
      setLoading(true);

      try {
        const res = await getClaimHistory(riderId);

        let data = res.claims || [];

        // 🔥 DEMO FALLBACK (IMPORTANT FOR HACKATHON)
        if (!data.length) {
          data = [
            {
              _id: 'demo1',
              claim_ref: 'CLM-DEMO-001',
              trigger_type: 'weather',
              status: 'paid',
              payout_amount: 120,
              started_at: new Date().toISOString(),
              duration_hrs: 2.5,
              zone_id: 'MUM-ANDHERI-W'
            },
            {
              _id: 'demo2',
              claim_ref: 'CLM-DEMO-002',
              trigger_type: 'civic',
              status: 'approved',
              payout_amount: 85,
              started_at: new Date(Date.now() - 86400000).toISOString(),
              duration_hrs: 1.8,
              zone_id: 'MUM-BANDRA-W'
            },
            {
              _id: 'demo3',
              claim_ref: 'CLM-DEMO-003',
              trigger_type: 'aqi',
              status: 'flagged',
              payout_amount: 60,
              started_at: new Date(Date.now() - 2 * 86400000).toISOString(),
              duration_hrs: 3.2,
              zone_id: 'MUM-DADAR'
            }
          ] as Claim[];
        }

        setClaims(data);

      } catch (err) {
        console.error('Failed to fetch claims', err);
      } finally {
        setLoading(false);
      }
    };

    fetchClaims();
  }, [riderId]);

  const filteredClaims = claims.filter(c => 
    filter === 'All' ? true : c.status === filter.toLowerCase()
  );

  return (
    <>
      <TopBar title="Claims" />
      
      <PageWrapper requireAuth={true}>
        <div className="pt-4 pb-6">
          
          {/* Active Claim */}
          {activeClaim && (
            <div className="mb-6 cursor-pointer" onClick={() => router.push(`/claims/${activeClaim._id}`)}>
              <DisruptionBanner claim={activeClaim} />
              <div className="text-center mt-[-10px] mb-2">
                <button className="text-cta text-sm font-medium hover:underline">
                  View Details →
                </button>
              </div>
            </div>
          )}

          {/* FILTER TABS */}
          <div className="flex overflow-x-auto gap-2 pb-4 mb-2 no-scrollbar">
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`whitespace-nowrap rounded-pill px-4 py-1.5 text-sm font-medium transition-colors ${
                  filter === f 
                  ? 'bg-primary text-white' 
                  : 'bg-white border border-neutral-border text-neutral-muted hover:bg-neutral-bg'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* SMALL CONTEXT LINE (NEW) */}
          {!loading && claims.length > 0 && (
            <p className="text-xs text-neutral-muted mb-3">
              Showing recent disruption-based claims in your zone
            </p>
          )}

          {/* LIST */}
          {loading ? (
            <div className="space-y-3">
              <Skeleton.Card />
              <Skeleton.Card />
              <Skeleton.Card />
            </div>
          ) : filteredClaims.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <Shield size={48} className="text-neutral-border mb-4" />
              <h3 className="text-lg font-medium text-neutral-text mb-1">
                No {filter !== 'All' ? filter : ''} claims yet
              </h3>
              <p className="text-sm text-neutral-muted max-w-[250px] mx-auto">
                Disruptions in your zone are tracked automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-3 pb-8">
              {filteredClaims.map((claim) => {
                const statusColor = getClaimStatusColor(claim.status);

                const triggerColors: any = {
                  weather: 'bg-blue-50 text-blue-600',
                  civic: 'bg-orange-50 text-orange-600',
                  aqi: 'bg-green-50 text-green-600'
                };
                
                return (
                  <div 
                    key={claim._id}
                    onClick={() => router.push(`/claims/${claim._id}`)}
                    className={`bg-white rounded-card shadow-card py-3 px-4 flex items-center cursor-pointer hover:shadow-md transition-shadow
                      border-l-4 ${
                        claim.status === 'open' || claim.status === 'approved' || claim.status === 'paid' 
                          ? 'border-l-success-DEFAULT' 
                          : claim.status === 'flagged' 
                            ? 'border-l-warning-DEFAULT' 
                            : 'border-l-danger-DEFAULT'
                      }
                    `}
                  >
                    {/* ICON */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${triggerColors[claim.trigger_type] || 'bg-neutral-bg'}`}>
                      {getTriggerIcon(claim.trigger_type)}
                    </div>
                    
                    {/* INFO */}
                    <div className="flex-1 min-w-0 mx-3">
                      <p className="font-medium text-sm text-neutral-text truncate">
                        {getTriggerLabel(claim.trigger_type)} · {claim.zone_id.replace('MUM-','').replace('DEL-','')}
                      </p>
                      <p className="text-xs text-neutral-muted mt-0.5 truncate">
                        {formatDate(claim.started_at)} {claim.duration_hrs ? `· ${claim.duration_hrs.toFixed(1)}hrs` : ''}
                      </p>
                    </div>

                    {/* AMOUNT */}
                    <div className="text-right flex flex-col items-end">
                      <p className="font-bold text-sm text-neutral-text">
                        ₹{claim.payout_amount ? claim.payout_amount.toFixed(2) : '—'}
                      </p>
                      <Badge variant={statusColor as any} className={claim.status === 'open' ? 'animate-pulse' : ''}>
                        {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PageWrapper>
      
      <BottomNav />
    </>
  );
}