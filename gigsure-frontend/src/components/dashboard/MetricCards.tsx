import React from 'react';
import { PayoutSummary, RiskScore } from '@/types';
import { getRiskLabel } from '@/lib/utils';
import { motion } from 'framer-motion';

interface Props {
  payoutSummary: PayoutSummary | null;
  riskScore: RiskScore | null;
}

export const MetricCards: React.FC<Props> = ({ payoutSummary, riskScore }) => {
  const overallRisk = riskScore ? riskScore.risk_score : 0;
  const riskData = getRiskLabel(overallRisk);

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
      },
    }),
  };

  return (
    <div className="grid grid-cols-2 gap-3 mt-4 mb-6">
      <motion.div 
        custom={1}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        className="google-card p-4 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-success hidden" />
        <p className="text-[12px] text-neutral-muted mb-1 font-medium relative z-10">Protected Balance</p>
        <p className="text-2xl font-bold text-neutral-text mb-1 relative z-10 tracking-tight">
          ₹{payoutSummary?.total_protected?.toFixed(2) || '0.00'}
        </p>
        <p className="text-[12px] text-success-text font-medium relative z-10">
          {payoutSummary?.disruption_events || 0} event(s)
        </p>
      </motion.div>

      <motion.div 
        custom={2}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        className="google-card p-4 relative overflow-hidden"
      >
        <div className={`absolute top-0 left-0 w-full h-1 hidden ${riskData.label === 'High' ? 'bg-danger' : riskData.label === 'Medium' ? 'bg-warning' : 'bg-success'}`} />
        <p className="text-[12px] text-neutral-muted mb-1 font-medium relative z-10">Live Zone Risk</p>
        <p className={`text-2xl font-bold mb-1 tracking-tight relative z-10 ${riskData.label === 'High' ? 'text-danger-text' : riskData.label === 'Medium' ? 'text-warning-text' : 'text-success-text'}`}>
          {riskData.label}
        </p>
        <p className="text-[12px] text-neutral-muted font-medium relative z-10">
          Score: {(overallRisk * 100).toFixed(0)}%
        </p>
      </motion.div>
    </div>
  );
};
