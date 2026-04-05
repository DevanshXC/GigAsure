import React, { useState, useEffect } from 'react';
import { Claim } from '@/types';
import { formatElapsed, getTriggerIcon } from '@/lib/utils';
import { motion } from 'framer-motion';

export const DisruptionBanner: React.FC<{ claim: Claim }> = ({ claim }) => {
  const [elapsed, setElapsed] = useState('');
  const [estimatedPayout, setEstimatedPayout] = useState(0);

  useEffect(() => {
    // Update timer every second
    const timerInterval = setInterval(() => {
      setElapsed(formatElapsed(claim.started_at));
    }, 1000);

    // Initial setting
    setElapsed(formatElapsed(claim.started_at));

    return () => clearInterval(timerInterval);
  }, [claim.started_at]);

  useEffect(() => {
    // Update estimated payout every 10 seconds based on elapsed hours
    const calcEstimate = () => {
      const seconds = Math.floor((Date.now() - new Date(claim.started_at).getTime()) / 1000);
      const hours = seconds / 3600;
      const rate = (claim.avg_daily_income || 0) / 12; // Approximation: assuming 12 hour active duty potential
      const newEstimate = hours * rate; 
      
      // Tier adjustments just for visual indication before backend zeroes true
      let adjusted = newEstimate;
      if (claim.disruption_tier === 'partial_low') adjusted = newEstimate * 0.3;
      if (claim.disruption_tier === 'partial_high') adjusted = newEstimate * 0.65;
      
      setEstimatedPayout(adjusted);
    };

    const payoutInterval = setInterval(calcEstimate, 10000);
    calcEstimate();

    return () => clearInterval(payoutInterval);
  }, [claim.started_at, claim.avg_daily_income, claim.disruption_tier]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="google-card p-5 mb-5 relative overflow-hidden bg-danger-light border-danger/20"
    >
      <div className="flex justify-between items-center mb-2 relative z-10">
        <h3 className="text-danger-text font-bold text-lg flex items-center gap-2">
          ⚠️ Disruption Active
        </h3>
        <div className="flex items-center gap-1.5 bg-danger/10 text-danger-text px-2.5 py-1 rounded-pill text-[10px] font-bold border border-danger/20 tracking-widest">
          <span className="w-1.5 h-1.5 bg-danger text-danger rounded-full animate-pulse" />
          LIVE
        </div>
      </div>
      
      <p className="text-sm text-danger-text/80 mb-4 flex items-center gap-2 font-medium relative z-10">
        <span>{getTriggerIcon(claim.trigger_type)}</span>
        <span>{claim.zone_id.replace('MUM-', '').replace('DEL-', '')}</span>
      </p>

      <div className="flex justify-between items-end relative z-10 border-t border-danger/20 pt-3 mt-1">
        <div>
          <p className="text-3xl font-mono font-bold text-danger-text tracking-tight mb-0.5">
            {elapsed}
          </p>
          <p className="text-xs text-danger-text/70 font-medium tracking-wide">No action needed.</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-danger-text">~₹{estimatedPayout.toFixed(2)}</p>
        </div>
      </div>
    </motion.div>
  );
};
