import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { RegisterFormData } from '@/app/register/page';
import { magicSync } from '@/lib/api';
import toast from 'react-hot-toast';
import { PremiumResponse, DetectedZone } from '@/types';

interface Props {
  formData: RegisterFormData;
  updateFormData: (data: Partial<RegisterFormData>) => void;
  onNext: () => void;
  phone: string;
  setPremiumQuote: (data: PremiumResponse) => void;
  setDetectedZone: (data: DetectedZone) => void;
}

export function StepMagicSync({ formData, updateFormData, onNext, phone, setPremiumQuote, setDetectedZone }: Props) {
  const [currentAnimStep, setCurrentAnimStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const animSteps = [
    "Establishing secure connection to Zomato...",
    "Authorizing Partner ID " + formData.partnerId + "...",
    "Syncing historical duty data...",
    "Retrieving geo-location accuracy metrics...",
    "Running Parametric Risk Assessment...",
    "Calculating personalized premium quote...",
    "Finalizing Rider Profile..."
  ];

  useEffect(() => {
    let unmounted = false;

    const runSync = async () => {
      // Start the visual animation sequence
      const animInterval = setInterval(() => {
        setCurrentAnimStep((prev) => {
          if (prev < animSteps.length - 1) return prev + 1;
          return prev;
        });
      }, 700);

      try {
        // Hit the magic sync endpoint concurrently
        const res = await magicSync({
          phone: phone,
          platform: formData.platform,
          partner_id: formData.partnerId
        });

        if (!unmounted) {
          // Force animation to complete visually if API was too fast
          clearInterval(animInterval);
          setCurrentAnimStep(animSteps.length);
          
          // Update the global form data with the results so StepActivate can show them
          updateFormData({
            ...formData,
            name: res.name,
            weeklyIncome: res.weekly_income.toString(),
            city: res.city || "mumbai"
          });

          setPremiumQuote({
            rider_id: res.rider_id,
            base_premium: res.premium_amount_inr,
            risk_breakdown: { p_weather: 0.2, p_civic: 0.1, p_pollution: 0.1, risk_score: 0.4, zone_id: res.zone_id, computed_at: new Date().toISOString() },
            geo_multiplier: 1.0,
            ncb_multiplier: 1.0,
            final_premium: res.premium_amount_inr,
            affordability_cap: res.weekly_income * 0.02,
            capped: false,
            week_label: "Current Week",
            coverage_tier: res.coverage_tier || 'full',
            actuarial_base: res.premium_amount_inr,
          });

          setDetectedZone({
            zone_id: res.zone_id,
            zone_name: res.zone_id.replace('ZMT-', ''),
            zone_tier: res.zone_tier || 2,
            city: res.city || "mumbai",
            city_pool: res.zone_id.startsWith('DEL') ? 'delhi_aqi_pool' : res.zone_id.startsWith('BLR') ? 'bengaluru_pool' : 'mumbai_rain_pool'
          });
          
          // We simulate a tiny delay so the user sees the "Done" state
          setTimeout(() => {
            onNext();
          }, 1000);
        }
      } catch (err: any) {
        if (!unmounted) {
          clearInterval(animInterval);
          setError(err.message || 'Failed to sync with partner app.');
          toast.error('Sync failed');
        }
      }
    };

    runSync();

    return () => {
      unmounted = true;
    };
  }, []);

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300 py-8">
      <div className="flex justify-center mb-8">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-primary" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      </div>
      
      <h2 className="text-2xl font-bold text-neutral-text text-center mb-2">
        {error ? "Sync Failed" : "Magic Sync Active"}
      </h2>
      <p className="text-neutral-muted text-sm text-center mb-10 max-w-[280px] mx-auto">
        Please wait while we automatically generate your profile from {formData.platform}.
      </p>

      <div className="space-y-4 max-w-sm mx-auto bg-neutral-bg p-5 rounded-2xl border border-neutral-border shadow-inner font-mono text-xs">
        {animSteps.map((txt, index) => {
          const isActive = currentAnimStep === index;
          const isDone = currentAnimStep > index;
          const isPending = currentAnimStep < index;
          
          if (isPending && !error) return null; // Don't show future steps yet

          return (
            <div key={index} className={`flex items-start gap-3 transition-opacity duration-300 ${isDone ? 'opacity-50' : 'opacity-100'}`}>
              <div className="mt-0.5">
                {isDone ? (
                  <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                ) : error ? (
                   <svg className="w-4 h-4 text-danger-DEFAULT" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                ) : (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>
              <span className={error ? 'text-danger-DEFAULT' : isDone ? 'text-neutral-muted' : 'text-primary'}>
                {txt}
              </span>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mt-8">
          <Button variant="secondary" size="full" onClick={() => window.location.reload()}>
            Retry Sync
          </Button>
        </div>
      )}
    </div>
  );
}
