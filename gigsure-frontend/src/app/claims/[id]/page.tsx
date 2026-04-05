'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { TopBar } from '@/components/layout/TopBar';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Claim } from '@/types';
import { getClaimDetail } from '@/lib/api';
import { 
  formatDateTime, 
  getTriggerLabel, 
  formatElapsed, 
  getDisruptionTierLabel, 
  getFraudLabel 
} from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';

const MapContent = dynamic(
  () => import('@/components/dashboard/MapContent'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[200px] w-full rounded-xl flex items-center justify-center bg-neutral-bg">
        <Skeleton.Text lines={2} />
      </div>
    )
  }
);

export default function ClaimDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const data = await getClaimDetail(id);
        setClaim(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDetail();
  }, [id]);

  useEffect(() => {
    if (claim?.status === 'open') {
      const interval = setInterval(() => {
        setElapsed(formatElapsed(claim.started_at));
      }, 1000);
      setElapsed(formatElapsed(claim.started_at));
      return () => clearInterval(interval);
    }
  }, [claim]);

  return (
    <>
      <TopBar title="Claim Detail" showBack />
      <PageWrapper requireAuth={true}>
        <div className="pt-4 pb-8">
          {loading ? (
            <div className="space-y-4">
              <Skeleton.Text lines={2} className="h-10" />
              <Skeleton.Card />
              <Skeleton.Card />
            </div>
          ) : !claim ? (
            <div className="text-center py-10 text-neutral-muted">Claim not found.</div>
          ) : (
            <div className="animate-in fade-in duration-300">
              
              {/* Status Banner */}
              <div className={`p-4 rounded-card mb-6 shadow-sm border ${
                ['approved', 'paid'].includes(claim.status) ? 'bg-success-light border-success-DEFAULT/20' :
                ['open', 'flagged'].includes(claim.status) ? 'bg-warning-light border-warning-DEFAULT/20' :
                'bg-danger-light border-danger-DEFAULT/20'
              }`}>
                <div className="flex justify-between items-center text-sm font-bold">
                  {claim.status === 'paid' && <span className="text-success-text">✓ Claim Paid · ₹{claim.payout_amount?.toFixed(2)}</span>}
                  {claim.status === 'approved' && <span className="text-success-text">✓ Claim Approved · ₹{claim.payout_amount?.toFixed(2)}</span>}
                  {claim.status === 'open' && <span className="text-warning-text animate-pulse">⏳ Disruption Tracking...</span>}
                  {claim.status === 'flagged' && <span className="text-warning-text">⏳ Verification In Progress</span>}
                  {claim.status === 'rejected' && <span className="text-danger-text">✗ Claim Rejected</span>}
                </div>
                <p className="font-mono text-[10px] text-neutral-muted mt-1 uppercase tracking-wider">
                  REF: {claim.claim_id || claim.claim_ref}
                </p>
              </div>

              {/* Map Segment */}
              <div className="bg-white shadow-card rounded-card p-4 mb-6">
                <h3 className="text-[10px] text-neutral-muted uppercase tracking-wider font-bold mb-3">Affected Zone · {claim.zone_id}</h3>
                <div className="h-[200px] w-full rounded-xl overflow-hidden border border-neutral-border relative shadow-sm pointer-events-none">
                  <MapContent riskScore={{ zone_id: claim.zone_id, p_weather: 0.1, p_civic: 0.1, p_pollution: 0.1 } as any} />
                </div>
              </div>

              {/* Vertical Timeline */}
              <div className="bg-white shadow-card rounded-card p-5 mb-6 text-sm">
                <h3 className="font-semibold text-neutral-text mb-4">Claim Timeline</h3>
                
                <div className="relative pl-6 space-y-6">
                  {/* Line */}
                  <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-neutral-border z-0" />

                  {/* 1. Detected */}
                  <div className="relative z-10 flex">
                    <div className="absolute -left-6 w-3 h-3 rounded-full bg-success-DEFAULT border-2 border-white mt-1" />
                    <div>
                      <p className="text-[10px] text-neutral-muted font-mono">{formatDateTime(claim.started_at)}</p>
                      <p className="font-medium text-neutral-text">Disruption detected</p>
                      <p className="text-xs text-neutral-muted">{getTriggerLabel(claim.trigger_type)} in {claim.zone_id}</p>
                    </div>
                  </div>

                  {/* 2. Verified */}
                  <div className="relative z-10 flex">
                    <div className="absolute -left-6 w-3 h-3 rounded-full bg-success-DEFAULT border-2 border-white mt-1" />
                    <div>
                      <p className="text-[10px] text-neutral-muted font-mono">{formatDateTime(new Date(new Date(claim.started_at).getTime() + 60000).toISOString())}</p>
                      <p className="font-medium text-neutral-text">Duty & GPS verified</p>
                      <p className="text-xs text-neutral-muted">Platform API: duty ON · GPS inside zone</p>
                    </div>
                  </div>

                  {/* 3. Opened */}
                  <div className="relative z-10 flex">
                    <div className="absolute -left-6 w-3 h-3 rounded-full bg-success-DEFAULT border-2 border-white mt-1" />
                    <div>
                      <p className="text-[10px] text-neutral-muted font-mono">{formatDateTime(new Date(new Date(claim.started_at).getTime() + 120000).toISOString())}</p>
                      <p className="font-medium text-neutral-text">Claim opened automatically</p>
                      <p className="text-xs text-neutral-muted">Claim ref: {claim.claim_id || claim.claim_ref}</p>
                    </div>
                  </div>

                  {/* 4. Tracking / Ended */}
                  {claim.status === 'open' ? (
                    <div className="relative z-10 flex border-t border-transparent">
                      <div className="absolute -left-6 w-3 h-3 rounded-full bg-primary animate-pulse border-2 border-white mt-1" />
                      <div>
                        <p className="font-medium text-primary">Tracking disruption...</p>
                        <p className="text-xs text-neutral-muted font-mono mt-1 mb-1">Live — {elapsed}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative z-10 flex">
                      <div className="absolute -left-6 w-3 h-3 rounded-full bg-success-DEFAULT border-2 border-white mt-1" />
                      <div>
                        <p className="text-[10px] text-neutral-muted font-mono">{(claim.ended_at || claim.paid_at) ? formatDateTime((claim.ended_at || claim.paid_at)!) : '--'}</p>
                        <p className="font-medium text-neutral-text">Disruption ended</p>
                        <p className="text-xs text-neutral-muted">{claim.duration_hrs?.toFixed(2)} hours · {getDisruptionTierLabel(claim.disruption_tier || '')}</p>
                      </div>
                    </div>
                  )}

                  {/* 5. Calculated */}
                  {claim.status !== 'open' && (
                    <div className="relative z-10 flex">
                      <div className="absolute -left-6 w-3 h-3 rounded-full bg-success-DEFAULT border-2 border-white mt-1" />
                      <div>
                        <p className="text-[10px] text-neutral-muted font-mono">{(claim.ended_at || claim.paid_at) ? formatDateTime((claim.ended_at || claim.paid_at)!) : '--'}</p>
                        <p className="font-medium text-neutral-text">Payout calculated</p>
                        <p className="text-xs text-neutral-muted">₹{claim.payout_amount?.toFixed(2)}</p>
                      </div>
                    </div>
                  )}

                  {/* 6. Disbursed */}
                  {claim.status === 'paid' && (
                    <div className="relative z-10 flex">
                      <div className="absolute -left-6 w-3 h-3 rounded-full bg-success-DEFAULT border-2 border-white mt-1" />
                      <div>
                        <p className="text-[10px] text-neutral-muted font-mono">{claim.paid_at ? formatDateTime(claim.paid_at) : '--'}</p>
                        <p className="font-medium text-neutral-text">Credited to UPI</p>
                        <p className="text-xs text-neutral-muted font-mono">{claim.razorpay_ref}</p>
                      </div>
                    </div>
                  )}
                  {claim.status === 'approved' && (
                    <div className="relative z-10 flex opacity-60">
                      <div className="absolute -left-6 w-3 h-3 rounded-full bg-white border-2 border-neutral-border mt-1" />
                      <div>
                        <p className="font-medium text-neutral-text">Pending Disbursal</p>
                        <p className="text-xs text-neutral-muted">Payment queued for UPI</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Payout Breakdown Card */}
              {claim.payout_amount !== null && (
                <div className="bg-white rounded-card shadow-card p-5 border-l-4 border-l-success-DEFAULT mb-6">
                  <h3 className="text-[10px] text-neutral-muted uppercase tracking-wider font-bold mb-4">Payout Breakdown</h3>
                  
                  <div className="space-y-2 text-sm bg-neutral-bg p-3 rounded-lg mb-4">
                    <div className="flex justify-between">
                      <span className="text-neutral-muted">Daily income rate</span>
                      <span className="font-medium">₹{claim.avg_daily_income?.toFixed(2) || '0.00'}/day</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-muted">Disruption tier</span>
                      <span className="font-medium truncate ml-3 text-right max-w-[150px]">{getDisruptionTierLabel(claim.disruption_tier || '')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-muted">Duration</span>
                      <span className="font-medium">{claim.duration_hrs?.toFixed(2)} hrs</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-neutral-muted">Coverage tier</span>
                      <Badge variant={(claim.coverage_tier || 'full') === 'full' ? 'success' : 'warning'} className="text-[10px]">
                        {(claim.coverage_tier || 'full').toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-neutral-muted">Fraud check</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-medium">{claim.fraud_score !== undefined ? claim.fraud_score.toFixed(2) : '0.00'}</span>
                        <Badge variant={getFraudLabel(claim.fraud_score).color as any} className="text-[10px]">
                          {getFraudLabel(claim.fraud_score).label}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between border-t border-neutral-border pt-4">
                    <span className="font-bold">Total payout</span>
                    <span className="font-bold text-lg text-success-text">₹{claim.payout_amount.toFixed(2)}</span>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </PageWrapper>
    </>
  );
}
