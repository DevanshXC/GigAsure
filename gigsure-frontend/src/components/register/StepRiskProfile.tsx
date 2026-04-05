import React, { useEffect } from 'react';
import { DetectedZone, RiskScore } from '@/types';
import { getRiskScore } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { RiskBar } from '@/components/ui/RiskBar';
import { Skeleton } from '@/components/ui/Skeleton';

interface Props {
  detectedZone: DetectedZone | null;
  city: string;
  riskScore: RiskScore | null;
  setRiskScore: React.Dispatch<React.SetStateAction<RiskScore | null>>;
  onNext: () => void;
  onUpdateZone: () => void;
}

export const StepRiskProfile: React.FC<Props> = ({
  detectedZone,
  city,
  riskScore,
  setRiskScore,
  onNext,
  onUpdateZone
}) => {
  useEffect(() => {
    const fetchRisk = async () => {
      try {
        const zoneIdToUse = detectedZone?.zone_id || `DEFAULT-${city.toUpperCase()}`;
        const data = await getRiskScore(zoneIdToUse);
        setRiskScore(data);
      } catch (err) {
        // Mock fallback if API not ready during Hackathon dev or default zone
        setRiskScore({
          p_weather: 0.15,
          p_civic: 0.35,
          p_pollution: 0.8,
          risk_score: 0.43,
          zone_id: detectedZone?.zone_id || `DEFAULT-${city.toUpperCase()}`,
          computed_at: new Date().toISOString()
        });
      }
    };
    fetchRisk();
  }, [detectedZone, city, setRiskScore]);

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <h2 className="text-xl font-bold text-neutral-text mb-4">Zone Risk Profile</h2>
      
      {!riskScore ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-card" />
          <Skeleton.Text lines={2} />
        </div>
      ) : (
        <>
          <div className="bg-teal-light border-l-4 border-teal-DEFAULT rounded-card p-4 shadow-sm mb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-neutral-text">
                {detectedZone?.zone_name || `${city} Region`}
              </h3>
              <Badge 
                variant={(detectedZone?.zone_tier || 2) <= 2 ? 'success' : ((detectedZone?.zone_tier || 2) === 3 ? 'warning' : 'danger')}
              >
                Tier {detectedZone?.zone_tier || 2}
              </Badge>
            </div>
            
            <RiskBar label="Weather" value={riskScore.p_weather} />
            <RiskBar label="Civic" value={riskScore.p_civic} />
            <RiskBar label="Pollution" value={riskScore.p_pollution} />
            <div className="mt-4 pt-4 border-t border-teal-DEFAULT/20">
              <RiskBar label="Overall Risk" value={riskScore.risk_score} showBadge />
            </div>
          </div>

          <div className="bg-primary-light rounded-card p-3 mb-6 flex items-start">
            <span className="text-primary-text mr-2 mt-0.5">ℹ</span>
            <p className="text-primary-text text-sm leading-snug">
              Your premium is adjusted for your zone's historical disruption risk. 
              Lower risk zones pay less. Your discount grows with clean weeks.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button variant="primary" size="full" onClick={onNext}>
              This looks right →
            </Button>
            <Button variant="ghost" size="full" onClick={onUpdateZone}>
              Update my zone
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
