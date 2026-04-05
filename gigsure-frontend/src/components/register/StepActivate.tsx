import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { RegisterFormData } from '@/app/register/page';
import { DetectedZone, PremiumResponse } from '@/types';
import { calculatePremium, registerRider, createPolicy } from '@/lib/api';
import { getPhone } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';

interface Props {
  formData: RegisterFormData;
  updateFormData: (data: Partial<RegisterFormData>) => void;
  detectedZone: DetectedZone | null;
  premiumQuote: PremiumResponse | null;
  setPremiumQuote: React.Dispatch<React.SetStateAction<PremiumResponse | null>>;
}

export const StepActivate: React.FC<Props> = ({
  formData,
  updateFormData,
  detectedZone,
  premiumQuote,
  setPremiumQuote
}) => {
  const router = useRouter();
  const { refreshRider, login } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    // In the Magic Sync flow, the premium is already calculated and passed down. 
    // We only fetch it if it's somehow missing.
    if (premiumQuote) return;
    
    const fetchPremium = async () => {
      try {
        const payload = {
          rider_id: localStorage.getItem('gigsure_rider_id') || 'temp-id',
          avg_weekly_income: Number(formData.weeklyIncome),
          zone_tier: detectedZone?.zone_tier || 2,
          clean_weeks: 0,
          zone_id: detectedZone?.zone_id || '',
          city: formData.city || 'Mumbai',
          active_days_last_30: 15
        };
        const quote = await calculatePremium(payload);
        setPremiumQuote(quote);
      } catch (err) {
        toast.error('Failed to calculate premium');
      }
    };
    fetchPremium();
  }, []);

  const handleActivate = async () => {
    if (!agreed) return;
    setLoading(true);

    try {
      // 1. Register rider
      const actPayload = {
        name: formData.name,
        phone: getPhone() || '+919999999999',
        city: formData.city,
        pin_code: formData.pinCode,
        zone_id: detectedZone?.zone_id || `DEFAULT-${formData.city.toUpperCase()}`,
        zone_tier: detectedZone?.zone_tier || 2,
        platform: formData.platform as 'zomato'|'swiggy'|'zepto',
        partner_id: formData.partnerId,
        upi_id: formData.upiId || `${(getPhone() || '').replace('+91', '')}@okaxis`,
        avg_weekly_income: Number(formData.weeklyIncome),
        clean_weeks: 0,
        active_days_last_30: 15
      };

      const riderData = await registerRider(actPayload);
      
      // Save full proper rider ID given by backend registration
      localStorage.setItem('gigsure_rider_id', riderData.rider_id);

      // 2. Create Policy
      await createPolicy(riderData.rider_id);

      // Force context state to hydrate newly inserted Rider DB record to stop Dashboard skipping render!
      await refreshRider();

      // 3. Complete
      toast.success('Coverage activated! 🛡️');
      router.push('/dashboard');
      
    } catch (err: any) {
      toast.error(err.message || 'Failed to activate coverage');
    } finally {
      setLoading(false);
    }
  };

  const setUpiHint = (domain: string) => {
    const formattedPhone = getPhone()?.replace('+91', '') || '9876543210';
    updateFormData({ upiId: `${formattedPhone}@${domain}` });
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <h2 className="text-xl font-bold text-neutral-text mb-4">Activate Coverage</h2>
      
      {!premiumQuote ? (
        <Skeleton className="h-48 w-full rounded-card mb-6" />
      ) : (
        <div className="border-t-4 border-primary bg-white shadow-card rounded-b-card p-4 mb-6">
          <p className="text-[10px] uppercase font-bold text-neutral-muted mb-3">Your Policy Details</p>
          
          <div className="space-y-2 mb-4 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-muted">Coverage</span>
              <span className="font-medium">Income loss only</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-muted">Triggers</span>
              <div className="flex gap-1.5">
                <span className="bg-primary-light text-primary-text px-2 py-0.5 rounded-pill text-xs">🌧 Weather</span>
                <span className="bg-primary-light text-primary-text px-2 py-0.5 rounded-pill text-xs">🚫 Civic</span>
                <span className="bg-primary-light text-primary-text px-2 py-0.5 rounded-pill text-xs">💨 AQI</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-muted">Payday</span>
              <span className="font-medium">Every Sunday</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-muted">Coverage Level</span>
              <span className={premiumQuote.coverage_tier === 'full' ? 'text-success-text font-medium' : 'text-warning-text font-medium'}>
                {premiumQuote.coverage_tier === 'full' ? '✓ Full Coverage' : '⚡ Reduced Coverage'}
              </span>
            </div>
          </div>
          
          <div className="border-t border-neutral-border my-4" />
          
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-neutral-muted text-sm">Weekly protection fee</p>
              <button 
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="text-primary text-xs underline mt-0.5"
              >
                {showBreakdown ? 'Hide details' : 'View breakdown'}
              </button>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-primary">₹{(premiumQuote.final_premium || 0).toFixed(2)}</span>
            </div>
          </div>

          {showBreakdown && (
            <div className="bg-neutral-bg p-3 rounded-lg text-xs space-y-1 mt-3">
              <div className="flex justify-between">
                <span className="text-neutral-muted">Base (2% of ₹{formData.weeklyIncome})</span>
                <span>₹{(premiumQuote.actuarial_base || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-muted">Risk score ({premiumQuote.risk_breakdown?.risk_score?.toFixed(2) || '0.0'})</span>
                <span>×{premiumQuote.geo_multiplier || 1}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-muted">Loyalty bonus</span>
                <span className="text-success-text">×{premiumQuote.ncb_multiplier || 1}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* UPI Section */}
      <div className="mb-6">
        <h3 className="font-bold text-sm text-neutral-text">Set up auto-deduction</h3>
        <p className="text-xs text-neutral-muted mb-3">One-time setup. Deducted every Sunday.</p>
        
        <Input
          placeholder="yourname@okaxis"
          value={formData.upiId}
          onChange={(e) => updateFormData({ upiId: e.target.value })}
        />
        
        <div className="flex gap-2 -mt-2 mb-4">
          <button onClick={() => setUpiHint('okicici')} className="px-2 py-1 bg-white border border-neutral-border rounded-lg text-xs font-medium hover:border-primary">GPay</button>
          <button onClick={() => setUpiHint('ybl')} className="px-2 py-1 bg-white border border-neutral-border rounded-lg text-xs font-medium hover:border-primary">PhonePe</button>
          <button onClick={() => setUpiHint('paytm')} className="px-2 py-1 bg-white border border-neutral-border rounded-lg text-xs font-medium hover:border-primary">Paytm</button>
        </div>
        
        <div className="bg-warning-light border border-warning-DEFAULT rounded-lg p-2 text-xs text-warning-text flex gap-2 items-start">
          <span>⚠</span>
          <p><strong>AutoPay limit: ₹500/week.</strong> Actual deduction always lower than this limit.</p>
        </div>
      </div>

      <div className="mb-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <div className="relative flex items-center justify-center mt-0.5">
            <input 
              type="checkbox" 
              className="peer sr-only"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <div className="w-5 h-5 border-2 border-neutral-border rounded bg-white peer-checked:bg-primary peer-checked:border-primary transition-all"></div>
            {agreed && <span className="absolute text-white text-xs">✓</span>}
          </div>
          <span className="text-sm text-neutral-text leading-tight">
            I understand GigaSure covers income loss only — not health, accidents, or vehicle damage.
          </span>
        </label>
      </div>

      <Button
        variant="cta"
        size="full"
        onClick={handleActivate}
        disabled={!agreed || !premiumQuote || !formData.upiId}
        loading={loading}
      >
        Activate My Coverage →
      </Button>
    </div>
  );
};
