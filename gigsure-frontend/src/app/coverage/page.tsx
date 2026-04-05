'use client';

import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { usePolicy } from '@/context/PolicyContext';
import {
  getActivePolicy,
  getPolicyHistory,
  getNextWeekPreview,
  renewPolicy,
  pausePolicy
} from '@/lib/api';
import { Policy } from '@/types';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { RiskBar } from '@/components/ui/RiskBar';

// ---------- SAFE DATE ----------
const formatSafeDate = (date: any) => {
  if (!date) return '—';
  try {
    return new Date(date).toLocaleDateString();
  } catch {
    return '—';
  }
};

export default function CoveragePage() {
  const { rider } = useAuth();
  const riderId = rider?.rider_id;
  const { fetchAll } = usePolicy();

  const [localPolicy, setLocalPolicy] = useState<Policy | null>(null);
  const [history, setHistory] = useState<Policy[]>([]);
  const [nextWeek, setNextWeek] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [hasRenewed, setHasRenewed] = useState(false);

  // ---------- FETCH ----------
  const fetchCoverageData = async () => {
    if (!riderId) return;
    setLoading(true);

    try {
      const [pol, hist, next] = await Promise.all([
        getActivePolicy(riderId).catch(() => null),
        getPolicyHistory(riderId).catch(() => []),
        getNextWeekPreview(riderId).catch(() => null),
      ]);

      const policyObj = Array.isArray(pol)
        ? pol
          .filter(p => p.status === 'active')
          .sort(
            (a, b) =>
              new Date(b.coverage_start).getTime() -
              new Date(a.coverage_start).getTime()
          )[0]
        : pol;

      setLocalPolicy(policyObj && policyObj._id ? policyObj : null);

      const historyArr = Array.isArray(hist) ? hist : hist?.policies || [];
      setHistory(historyArr);

      setNextWeek(next);

    } catch (e) {
      console.error(e);
      toast.error('Failed to load coverage');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoverageData();
  }, [riderId]);

  // ---------- RENEW ----------
  const handleRenew = async () => {
    if (!localPolicy?._id || !riderId || hasRenewed) return;

    setActionLoading(true);

    try {
      await renewPolicy(localPolicy._id, riderId);

      setHasRenewed(true);

      const start = new Date(localPolicy.coverage_start);
      const end = new Date(localPolicy.coverage_end);

      start.setDate(start.getDate() + 7);
      end.setDate(end.getDate() + 7);

      setLocalPolicy({
        ...localPolicy,
        coverage_start: start.toISOString(),
        coverage_end: end.toISOString(),
      });

      toast.success(
        'Renewed! Amount will be auto-deducted on your next payday.'
      );

      fetchCoverageData();
      fetchAll(riderId);

    } catch (e: any) {
      toast.error(e?.message || 'Renewal failed');
    } finally {
      setActionLoading(false);
    }
  };

  // ---------- PAUSE ----------
  const handlePause = async () => {
    if (!localPolicy?._id || !riderId) return;

    setActionLoading(true);
    try {
      await pausePolicy(localPolicy._id, riderId);
      toast.success('Coverage paused');
      setShowPauseModal(false);
      fetchCoverageData();
      fetchAll(riderId);
    } catch (e: any) {
      toast.error(e?.message || 'Pause failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <TopBar title="My Coverage" showBack />

      <PageWrapper requireAuth={true}>
        <div className="pt-4 pb-6">

          {loading ? (
            <div className="space-y-4">
              <Skeleton.Card />
              <Skeleton.Card />
            </div>
          ) : !localPolicy ? (
            <div className="bg-white rounded-card p-6 text-center shadow-sm">
              <p className="text-neutral-muted">No active policy found.</p>
            </div>
          ) : (
            <div className="animate-in fade-in duration-300">

              {/* ACTIVE POLICY */}
              <div className="bg-white rounded-card border shadow-sm border-t-4 border-t-primary p-4 mb-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-[10px] uppercase font-bold text-neutral-muted">
                      Active Policy
                    </h3>
                    <p className="font-mono text-xs mt-1 text-neutral-muted">
                      {localPolicy?.policy_ref || '—'}
                    </p>
                  </div>
                  <Badge variant={localPolicy?.status === 'active' ? 'success' : 'warning'}>
                    {localPolicy?.status}
                  </Badge>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-xs text-neutral-muted">Zone & Platform</span>
                    <div className="font-medium">
                      {localPolicy?.zone_id || '—'}
                      <Badge variant="neutral" className="ml-2 text-[10px]">
                        Tier {localPolicy?.zone_tier ?? '—'}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-neutral-muted">Coverage Period</span>
                    <div className="font-medium">
                      {formatSafeDate(localPolicy?.coverage_start)} — {formatSafeDate(localPolicy?.coverage_end)}
                    </div>
                  </div>
                </div>
              </div>

              {/* NEXT WEEK */}
              {nextWeek && (
                <div className="mb-6">
                  <h3 className="text-xs uppercase font-bold mb-3">Next Week Forecast</h3>

                  <div className="grid grid-cols-2 gap-3">

                    <div className="bg-white p-4 rounded shadow">
                      <p className="text-xs">This week</p>
                      <p className="font-bold text-lg">
                        ₹{(nextWeek.current?.final_premium || 0).toFixed(2)}
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded shadow">
                      <p className="text-xs">Next week</p>

                      <div className="flex justify-between items-center">
                        <p className="font-bold text-lg">
                          ₹{(nextWeek.next?.final_premium || 0).toFixed(2)}
                        </p>

                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          (nextWeek.next?.risk_score || 0) > 0.4 ? 'bg-red-100 text-red-700' :
                          (nextWeek.next?.risk_score || 0) > 0.15 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          Risk: {(nextWeek.next?.risk_score || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 🔥 RISK EXPLANATION */}
              {nextWeek?.next?.breakdown && (
                <div className="bg-white p-4 rounded shadow mb-6">
                  <h3 className="text-xs uppercase font-bold mb-2">
                    Why your premium changed
                  </h3>

                  <div className="space-y-1 mt-2">
                    <RiskBar label="🌧 Weather Risk" value={nextWeek.next.breakdown.weather} />
                    <RiskBar label="🚧 Civic Risk" value={nextWeek.next.breakdown.civic} />
                    <RiskBar label="💨 AQI Risk" value={nextWeek.next.breakdown.pollution} />
                  </div>
                </div>
              )}

              {/* PRODUCTION NOTE */}
              <div className="bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded p-3 mb-6">
                💡 In production, policy renewals and risk recalculations are processed every Saturday.
              </div>

              {/* ACTIONS */}
              <div className="space-y-3">

                <Button
                  onClick={handleRenew}
                  loading={actionLoading}
                  disabled={hasRenewed}
                >
                  {hasRenewed
                    ? 'Renewed ✅'
                    : `Renew (₹${nextWeek?.next?.final_premium?.toFixed(2) || '--'})`}
                </Button>

                <p className="text-xs text-green-600 text-center">
                  💰 Renewal scheduled. Premium will be automatically deducted on your next payday
                </p>

                <Button
                  variant="danger"
                  onClick={() => setShowPauseModal(true)}
                  disabled={localPolicy?.status !== 'active'}
                >
                  Pause Coverage
                </Button>

                <p className="text-xs text-neutral-muted text-center">
                  Pausing stops future renewals. Current coverage remains active until expiry.
                </p>
              </div>

            </div>
          )}
        </div>
      </PageWrapper>

      <BottomNav />
    </>
  );
}