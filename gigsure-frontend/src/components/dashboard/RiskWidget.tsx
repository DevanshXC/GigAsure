import React from 'react';
import { RiskScore } from '@/types';
import { RiskBar } from '@/components/ui/RiskBar';

export const RiskWidget: React.FC<{ riskScore: RiskScore }> = ({ riskScore }) => {
  return (
    <div className="bg-white rounded-card p-4 shadow-card mb-6">
      <h3 className="text-[10px] text-neutral-muted font-semibold tracking-wider uppercase mb-3">
        LIVE RISK · {riskScore.zone_id}
      </h3>
      
      <div className="space-y-1">
        <RiskBar label="Weather" value={riskScore.p_weather} />
        <RiskBar label="Civic" value={riskScore.p_civic} />
        <RiskBar label="Pollution" value={riskScore.p_pollution} />
      </div>
    </div>
  );
};
