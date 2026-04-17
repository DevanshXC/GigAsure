import React, { useEffect, useState } from 'react';
import { getNextWeekPreview } from '@/lib/api';
import { TrendingDown, TrendingUp, CalendarDays, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const NextWeekCoverage: React.FC<{ riderId: string }> = ({ riderId }) => {
  const [data, setData] = useState<any>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNext = async () => {
      try {
        const preview = await getNextWeekPreview(riderId);
        setData(preview);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (riderId) fetchNext();
  }, [riderId]);

  if (loading) return null;
  if (!data) return null;

  const isDown = data.direction === 'down';

  return (
    <div className="bg-white rounded-[24px] shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)] overflow-hidden mb-6 border border-neutral-200 hover:border-primary/30 transition-colors">
      {/* Header / Summary Bar */}
      <div 
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-neutral-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${isDown ? 'bg-success-light text-success-text' : 'bg-warning-light text-warning-text'}`}>
            <CalendarDays size={18} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-neutral-text tracking-wide">Next Week Preview</h3>
            <p className="text-xs text-neutral-muted">Est. Premium: ₹{data.next?.final_premium?.toFixed(2)}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {isDown ? (
              <TrendingDown size={16} className="text-success-text" />
            ) : (
              <TrendingUp size={16} className="text-warning-text" />
            )}
            <span className={`text-sm font-bold ${isDown ? 'text-success-text' : 'text-warning-text'}`}>
              {isDown ? '-' : '+'}₹{Math.abs(data.delta).toFixed(2)}
            </span>
          </div>
          {expanded ? <ChevronUp size={16} className="text-neutral-muted" /> : <ChevronDown size={16} className="text-neutral-muted" />}
        </div>
      </div>

      {/* Expanded Collapse Area */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-neutral-border bg-neutral-bg"
          >
            <div className="p-4 px-5">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-semibold uppercase text-neutral-muted tracking-wide">Base Trend</span>
                <span className="text-sm font-medium">{isDown ? 'Clean Week Discount' : 'Base Rate Adjust'}</span>
              </div>
              
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-semibold uppercase text-neutral-muted tracking-wide">Zone Risk Score (Next Wk)</span>
                <span className="text-sm font-medium">{data.next?.risk_score?.toFixed(3)}</span>
              </div>
              
              <div className="bg-white rounded-lg p-3 mt-4 border border-neutral-border/50 text-xs text-neutral-text leading-relaxed">
                Maintain a clean streak (no fraudulent claims) for another 7 days to permanently lock in this lower predictive premium limit!
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
