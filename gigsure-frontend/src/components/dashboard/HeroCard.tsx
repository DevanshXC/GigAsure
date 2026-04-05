import React from 'react';
import { Policy } from '@/types';
import { formatDate } from '@/lib/utils';
import { Shield } from 'lucide-react';
import { motion } from 'framer-motion';

export const HeroCard: React.FC<{ policy: Policy }> = ({ policy }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="google-card-elevated p-6 mb-5 relative overflow-hidden bg-primary-light border-none"
    >
      <div className="flex items-center gap-3 mb-3 relative z-10">
        <div className="p-2 bg-primary text-white rounded-full">
          <Shield size={20} fill="currentColor" className="text-white" />
        </div>
        <h2 className="font-bold tracking-tight text-[14px] text-primary-text">Protected This Week</h2>
      </div>
      
      <p className="text-neutral-text text-sm mb-4 relative z-10 font-medium tracking-wide">
        {formatDate(policy.coverage_start)} – {formatDate(policy.coverage_end)}
      </p>
      
      <div className="border-t border-primary/20 my-4 relative z-10" />
      
      <div className="grid grid-cols-2 gap-4 relative z-10">
        <div>
          <p className="text-primary-text text-[11px] font-semibold tracking-wide">Premium</p>
          <p className="font-bold text-2xl text-primary-hover mt-0.5">₹{(policy?.weekly_premium || 0).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-primary-text text-[11px] font-semibold tracking-wide">Active Zone</p>
          <p className="font-bold text-2xl text-primary-hover mt-0.5 truncate">
            {(policy?.zone_id || '').replace('MUM-', '').replace('DEL-', '').replace('BLR-', '') || 'Unknown'}
          </p>
        </div>
      </div>
    </motion.div>
  );
};
