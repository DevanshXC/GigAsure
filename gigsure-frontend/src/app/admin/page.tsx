'use client';

import React, { useEffect, useState } from 'react';
import { Shield, TrendingUp, AlertTriangle, CloudRain, Activity, BarChart3, AlertCircle } from 'lucide-react';
import { getAdminDashboard } from '@/lib/api';
import { Button } from '@/components/ui/Button';

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await getAdminDashboard();
        setData(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center">
        <Activity className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  if (!data) return <div className="text-white p-6">Error loading admin dashboard</div>;

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans p-6 pb-24 selection:bg-primary/30">
      
      {/* Header */}
      <header className="mb-8 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shadow-[0_0_15px_rgba(var(--primary),0.3)]">
          <Shield className="text-primary w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Insurer Dashboard</h1>
          <p className="text-neutral-400 text-sm">Real-time risk & portfolio analytics</p>
        </div>
      </header>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricBox 
          title="Active Policies" 
          value={data.active_policies} 
          icon={<Shield size={18} />} 
          color="text-emerald-400" 
          bg="bg-emerald-400/10" 
        />
        <MetricBox 
          title="Loss Ratio" 
          value={`${data.loss_ratio || 0}%`} 
          icon={<BarChart3 size={18} />} 
          color={data.loss_ratio > 80 ? "text-red-400" : "text-primary"} 
          bg={data.loss_ratio > 80 ? "bg-red-400/10" : "bg-primary/10"} 
        />
        <MetricBox 
          title="Fraud Flags" 
          value={data.fraud_flags_pending} 
          icon={<AlertTriangle size={18} />} 
          color="text-amber-400" 
          bg="bg-amber-400/10" 
        />
        <MetricBox 
          title="Burned Capital" 
          value={`${((data.bcr_current || 0) * 100).toFixed(1)}%`} 
          icon={<Activity size={18} />} 
          color={data.bcr_current > 0.85 ? "text-red-400" : "text-blue-400"} 
          bg="bg-blue-400/10" 
        />
      </div>

      {/* Complex Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Predictive Analytics */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden group hover:border-white/20 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[50px] -mr-10 -mt-10 pointer-events-none"></div>
          
          <div className="flex items-center gap-3 mb-6">
            <CloudRain className="text-amber-400" />
            <h2 className="text-xl font-semibold text-white">Next Week's Forecast</h2>
          </div>
          
          <div className="flex gap-4 mb-6">
            <div className="bg-black/20 rounded-2xl p-4 flex-1">
              <p className="text-neutral-400 text-xs uppercase tracking-wider mb-1">Projected Claims</p>
              <p className="text-2xl font-bold text-white">{data.predictive_analytics?.projected_claims_count || 0}</p>
            </div>
            <div className="bg-black/20 rounded-2xl p-4 flex-1">
              <p className="text-neutral-400 text-xs uppercase tracking-wider mb-1">Expected Payouts</p>
              <p className="text-2xl font-bold text-white">₹{(data.predictive_analytics?.projected_payout_volume || 0).toLocaleString()}</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-neutral-400 uppercase tracking-widest font-semibold mb-2">High Risk Zones</p>
            {data.predictive_analytics?.likely_disruptions_next_week?.map((disruption: any, i: number) => (
              <div key={i} className="flex flex-col gap-2 bg-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-white">{disruption.zone}</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    disruption.probability > 0.7 ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {(disruption.probability * 100).toFixed(0)}% Risk
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-neutral-400">
                  <AlertCircle size={14} className="text-neutral-500"/>
                  {disruption.reason}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Center */}
        <div className="flex flex-col gap-6">
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden group hover:border-white/20 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/20 blur-[50px] -mr-10 -mt-10 pointer-events-none"></div>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="text-amber-400" />
              Manual Review Queue
            </h2>
            <p className="text-neutral-400 mb-6 text-sm">
              You have <span className="font-bold text-white">{data.fraud_flags_pending}</span> claims flagged by Advanced AI Fraud Detection requiring manual review.
            </p>
            <Button variant="primary" size="lg" className="w-full bg-amber-500 hover:bg-amber-600 text-auth-bg border-none shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              Review Flagged Claims →
            </Button>
          </div>

          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden group hover:border-white/20 transition-all duration-300 flex-1">
            <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-400/10 blur-[50px] -ml-10 -mt-10 pointer-events-none"></div>
            <h2 className="text-xl font-semibold text-white mb-4">Financial Overview</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <span className="text-neutral-400">Total Payouts (This Week)</span>
                <span className="font-bold text-lg text-white">₹{(data.total_payouts_this_week || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <span className="text-neutral-400">Total Claims (This Week)</span>
                <span className="font-bold text-lg text-white">{data.claims_this_week}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Pool Stability</span>
                <span className="font-bold text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full text-sm">Target Met</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function MetricBox({ title, value, icon, color, bg }: { title: string, value: string | number, icon: any, color: string, bg: string }) {
  return (
    <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-3 hover:bg-white/10 transition-colors shadow-lg">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bg} ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-neutral-400 text-xs uppercase font-semibold tracking-wider mb-1">{title}</p>
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      </div>
    </div>
  );
}
