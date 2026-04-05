'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getClaimHistory } from '@/lib/api';
import { formatDate, getTriggerIcon } from '@/lib/utils';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';

export default function PayoutsPage() {
  const { rider } = useAuth();
  const riderId = rider?.rider_id;
  
  const [total, setTotal] = useState(0);
  const [count, setCount] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayouts = async () => {
      if (!riderId) return;

      try {
        const res = await getClaimHistory(riderId);
        const claims = res.claims || [];

        // ✅ filter only paid/approved claims
        const validClaims = claims.filter(
          (c: any) => c.status === 'paid' || c.status === 'approved'
        );

        // ✅ total amount
        const totalAmount = validClaims.reduce(
          (sum: number, c: any) => sum + (c.payout_amount || 0),
          0
        );

        setTotal(totalAmount);
        setCount(validClaims.length);

        // ✅ convert to history format (same UI)
        const payoutHistory = validClaims.map((c: any) => ({
          amount: c.payout_amount,
          status: c.status === 'paid' ? 'completed' : 'pending',
          initiated_at: c.started_at,
          claim_ref: c.claim_id || 'AUTO',
          claim_event: {
            trigger_type: c.trigger_type
          }
        }));

        setHistory(payoutHistory);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPayouts();
  }, [riderId]);

  return (
    <>
      <TopBar title="Payouts" />
      
      <PageWrapper requireAuth={true}>
        <div className="pt-4 pb-6">
          {loading ? (
            <div className="space-y-4">
              <Skeleton.Card />
              <div className="grid grid-cols-2 gap-3"><Skeleton.Metric /><Skeleton.Metric /></div>
              <Skeleton.Text lines={5} />
            </div>
          ) : (
            <div className="animate-in fade-in duration-300">
              
              {/* Summary Hero Card */}
              <div className="bg-primary rounded-2xl p-6 text-white shadow-hero mb-4 text-center">
                <p className="text-xs text-blue-200 uppercase tracking-wider font-semibold mb-2">Total Income Protected</p>
                <h2 className="text-4xl font-bold mb-1">₹{total.toFixed(2)}</h2>
                <p className="text-sm text-blue-200">{count} disruption event(s)</p>
              </div>

              {/* Two Info Cards */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-card p-4 shadow-sm border border-neutral-border text-center">
                  <p className="text-[10px] text-neutral-muted uppercase tracking-wider font-bold mb-2">Payout Cycle</p>
                  <p className="font-bold text-success-DEFAULT text-lg leading-none mb-1">Immediate</p>
                  <p className="text-[10px] text-neutral-muted">Released on claim clearance</p>
                </div>
                <div className="bg-white rounded-card p-4 shadow-sm border border-neutral-border text-center">
                  <p className="text-[10px] text-neutral-muted uppercase tracking-wider font-bold mb-2">Premium Cycle</p>
                  <p className="font-bold text-primary text-lg leading-none mb-1">Every Sunday</p>
                  <p className="text-[10px] text-neutral-muted">Via UPI AutoPay</p>
                </div>
              </div>

              {/* Note Card */}
              <div className="bg-primary-light rounded-card p-4 mb-6 border border-primary/20">
                <p className="text-primary-text text-xs leading-relaxed">
                  Payouts are sent immediately when your claim is verified — no payday wait. 
                  Premiums are deducted separately every Sunday. These are two separate UPI transactions.
                </p>
              </div>

              {/* History */}
              {history.length > 0 && (
                <div>
                  <h3 className="text-xs text-neutral-muted uppercase tracking-wider font-bold mb-3">History</h3>
                  <div className="space-y-3 pb-8">
                    {history.map((payout, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-card shadow-sm border border-neutral-border flex items-center justify-between">
                        
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-neutral-bg flex items-center justify-center text-lg mr-3">
                            {getTriggerIcon(payout.claim_event?.trigger_type || 'system')}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-neutral-text">{formatDate(payout.initiated_at)}</p>
                            <p className="text-[10px] text-neutral-muted font-mono mt-0.5">
                              REF: {payout.claim_ref}
                            </p>
                          </div>
                        </div>

                        <div className="text-right flex flex-col items-end">
                          <p className="font-bold text-sm text-neutral-text mb-1">
                            ₹{payout.amount.toFixed(2)}
                          </p>
                          <Badge variant={payout.status === 'completed' ? 'success' : 'warning'} className="text-[10px]">
                            {payout.status === 'completed' ? 'Paid' : 'Pending'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </PageWrapper>

      <BottomNav />
    </>
  );
}