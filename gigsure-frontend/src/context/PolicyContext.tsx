'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  Policy, 
  Claim, 
  RiskScore, 
  PayoutSummary, 
  PremiumResponse 
} from '@/types';
import { 
  getActivePolicy, 
  getActiveClaim, 
  getPayoutSummary, 
  getRiskScore, 
  getPremiumQuote 
} from '@/lib/api';
import { useAuth } from './AuthContext';

interface PolicyContextType {
  activePolicy: Policy | null;
  activeClaim: Claim | null;
  riskScore: RiskScore | null;
  payoutSummary: PayoutSummary | null;
  premiumQuote: PremiumResponse | null;
  isLoading: boolean;
  lastRefresh: Date | null;
  fetchAll: (riderId: string) => Promise<void>;
  refreshClaim: () => Promise<void>;
  clearAll: () => void;
}

const PolicyContext = createContext<PolicyContextType | undefined>(undefined);

export function PolicyProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, riderId } = useAuth();
  const [activePolicy, setActivePolicy] = useState<Policy | null>(null);
  const [activeClaim, setActiveClaim] = useState<Claim | null>(null);
  const [riskScore, setRiskScore] = useState<RiskScore | null>(null);
  const [payoutSummary, setPayoutSummary] = useState<PayoutSummary | null>(null);
  const [premiumQuote, setPremiumQuote] = useState<PremiumResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchAll = async (targetRiderId: string) => {
    setIsLoading(true);
    try {
      const results = await Promise.allSettled([
        getActivePolicy(targetRiderId),
        getActiveClaim(targetRiderId),
        getPayoutSummary(targetRiderId)
      ]);

      let foundPolicy: Policy | null = null;

      if (results[0].status === 'fulfilled') {
        foundPolicy = results[0].value;
        setActivePolicy(results[0].value);
      } else {
        setActivePolicy(null);
      }

      if (results[1].status === 'fulfilled' && results[1].value?.active_claim) {
        setActiveClaim(results[1].value.active_claim);
      } else {
        setActiveClaim(null);
      }

      if (results[2].status === 'fulfilled') {
        setPayoutSummary(results[2].value);
      } else {
        setPayoutSummary(null);
      }

      // Chain secondary queries
      if (foundPolicy) {
        const secondary = await Promise.allSettled([
          getRiskScore(foundPolicy.zone_id),
          getPremiumQuote(targetRiderId)
        ]);
        if (secondary[0].status === 'fulfilled') setRiskScore(secondary[0].value);
        if (secondary[1].status === 'fulfilled') setPremiumQuote(secondary[1].value);
      } else {
        setRiskScore(null);
        setPremiumQuote(null);
      }
      
      setLastRefresh(new Date());
    } catch (e) {
      console.error('Failed to fetch policy data', e);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshClaim = async () => {
    if (!riderId) return;
    try {
      const res = await getActiveClaim(riderId);
      setActiveClaim(res.active_claim ? res.active_claim : null);
    } catch (e) {
      console.error('Failed to refresh claim', e);
    }
  };

  const clearAll = () => {
    setActivePolicy(null);
    setActiveClaim(null);
    setRiskScore(null);
    setPayoutSummary(null);
    setPremiumQuote(null);
    setLastRefresh(null);
  };

  // Auto-refresh activeClaim every 30 seconds if it's open
  useEffect(() => {
    if (activeClaim?.status === 'open' && riderId) {
      const interval = setInterval(() => {
        refreshClaim();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [activeClaim?.status, riderId]);

  return (
    <PolicyContext.Provider value={{
      activePolicy, activeClaim, riskScore, payoutSummary, premiumQuote,
      isLoading, lastRefresh, fetchAll, refreshClaim, clearAll
    }}>
      {children}
    </PolicyContext.Provider>
  );
}

export const usePolicy = () => {
  const context = useContext(PolicyContext);
  if (context === undefined) {
    throw new Error('usePolicy must be used within a PolicyProvider');
  }
  return context;
};
