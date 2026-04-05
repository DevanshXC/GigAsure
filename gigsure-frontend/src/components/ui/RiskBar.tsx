import React from 'react';
import { getRiskLabel } from '@/lib/utils';
import { Badge } from './Badge';

interface RiskBarProps {
  label: string;
  value: number; // 0 to 1
  showBadge?: boolean;
}

export const RiskBar: React.FC<RiskBarProps> = ({ label, value, showBadge = false }) => {
  const percentage = Math.min(Math.max(value * 100, 0), 100);
  const colorData = getRiskLabel(value);
  
  let mapColor = 'bg-success-DEFAULT';
  if (value > 0.25) mapColor = 'bg-primary';
  if (value > 0.50) mapColor = 'bg-warning-DEFAULT';
  if (value > 0.75) mapColor = 'bg-danger-DEFAULT';

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1 text-sm text-neutral-text">
        <span className="font-medium">{label}</span>
        <div className="flex items-center space-x-2">
          <span>{percentage.toFixed(0)}%</span>
          {showBadge && (
            <Badge variant={colorData.color as any}>{colorData.label}</Badge>
          )}
        </div>
      </div>
      <div className="h-2 w-full bg-neutral-bg rounded-full overflow-hidden">
        <div 
          className={`h-full ${mapColor} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
