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
        className="p-5 relative overflow-hidden bg-white rounded-3xl border border-neutral-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-1"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-success/10 blur-[30px] rounded-full pointer-events-none -mt-4 -mr-4" />
        <p className="text-[12px] text-neutral-500 mb-1 font-semibold uppercase tracking-wider relative z-10">Protected Earnings</p>
        <p className="text-3xl font-extrabold text-neutral-800 mb-1 relative z-10 tracking-tight">
          ₹{payoutSummary?.total_protected?.toFixed(2) || '0.00'}
        </p>
        <p className="text-[12px] text-success-text font-bold bg-success/10 inline-block px-2 py-0.5 rounded-full relative z-10">
          {payoutSummary?.disruption_events || 0} Event(s) Paid
        </p>
      </motion.div>

      <motion.div 
        custom={2}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        className="p-5 relative overflow-hidden bg-white rounded-3xl border border-neutral-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-1"
      >
        <div className={`absolute top-0 right-0 w-24 h-24 blur-[30px] rounded-full pointer-events-none -mt-4 -mr-4 ${riskData.label === 'High' ? 'bg-danger/10' : riskData.label === 'Medium' ? 'bg-warning/10' : 'bg-success/10'}`} />
        <p className="text-[12px] text-neutral-500 mb-1 font-semibold uppercase tracking-wider relative z-10">Live Zone Risk</p>
        <p className={`text-3xl font-extrabold mb-1 tracking-tight relative z-10 ${riskData.label === 'High' ? 'text-danger-text' : riskData.label === 'Medium' ? 'text-warning-text' : 'text-success-text'}`}>
          {riskData.label}
        </p>
        <p className="text-[12px] text-neutral-600 font-bold bg-neutral-100 inline-block px-2 py-0.5 rounded-full relative z-10">
          AI Score: {(overallRisk * 100).toFixed(0)}%
        </p>
      </motion.div>
    </div>
  );
};
