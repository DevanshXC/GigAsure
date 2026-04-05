'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { RiskScore } from '@/types';
import { Skeleton } from '@/components/ui/Skeleton';
import { RiskBar } from '@/components/ui/RiskBar';

// Dynamically import Leaflet map to avoid SSR 'window' issues
const MapContent = dynamic(
  () => import('./MapContent'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[250px] w-full rounded-xl flex items-center justify-center bg-neutral-bg">
        <Skeleton.Text lines={2} />
      </div>
    )
  }
);

interface ZoneRiskMapProps {
  riskScore: RiskScore;
}

export const ZoneRiskMap: React.FC<ZoneRiskMapProps> = ({ riskScore }) => {
  return (
    <div className="google-card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] text-neutral-text font-bold tracking-wide">
          Zone Risk Map · {riskScore.zone_id}
        </h3>
        <div className="flex items-center gap-2 text-[11px] font-medium text-neutral-muted">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-danger"></span> High</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warning"></span> Med</span>
        </div>
      </div>
      
      <div className="h-[200px] w-full rounded-2xl overflow-hidden border border-neutral-border relative mb-5 shadow-sm">
        <MapContent riskScore={riskScore} />
        
        {/* Subtle inner shadow for embedded feel */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] z-[400]" />
      </div>
      
      <div className="space-y-3 px-1">
        <RiskBar label="Weather Factor" value={riskScore.p_weather} />
        <RiskBar label="Traffic/Civic" value={riskScore.p_civic} />
        <RiskBar label="Pollution Index" value={riskScore.p_pollution} />
      </div>
    </div>
  );
};
