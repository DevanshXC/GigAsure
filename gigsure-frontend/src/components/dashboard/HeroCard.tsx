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
      className="p-6 mb-5 relative overflow-hidden rounded-[24px] border border-white/20 shadow-2xl bg-gradient-to-br from-primary via-primary-hover to-neutral-900 text-white"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[50px] pointer-events-none rounded-full" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-black/20 blur-[50px] pointer-events-none rounded-full" />
      
      <div className="flex items-center gap-3 mb-3 relative z-10">
        <div className="p-2 bg-white/20 backdrop-blur-md rounded-full shadow-inner border border-white/30">
          <Shield size={20} className="text-white" />
        </div>
        <h2 className="font-bold tracking-tight text-[15px] text-white/90 drop-shadow-md">Active Policy Protection</h2>
      </div>
      
      <p className="text-white/80 text-sm mb-4 relative z-10 font-medium tracking-wide">
        {formatDate(policy.coverage_start)} – {formatDate(policy.coverage_end)}
      </p>
      
      <div className="border-t border-white/20 my-4 relative z-10" />
      
      <div className="grid grid-cols-2 gap-4 relative z-10">
        <div>
          <p className="text-white/70 text-[11px] font-semibold tracking-wider uppercase">Premium</p>
          <p className="font-bold text-2xl text-white mt-0.5 drop-shadow-md">₹{(policy?.weekly_premium || 0).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-white/70 text-[11px] font-semibold tracking-wider uppercase">Active Zone</p>
          <p className="font-bold text-2xl text-white mt-0.5 truncate drop-shadow-md">
            {(policy?.zone_id || '').replace('MUM-', '').replace('DEL-', '').replace('BLR-', '') || 'Unknown'}
          </p>
        </div>
      </div>
    </motion.div>
  );
};
