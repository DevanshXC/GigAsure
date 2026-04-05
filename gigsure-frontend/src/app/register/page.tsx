'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/layout/TopBar';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { StepProgress } from '@/components/ui/StepProgress';
import { DetectedZone, RiskScore, PremiumResponse } from '@/types';

import { StepPlatform } from '@/components/register/StepPlatform';
import { StepMagicSync } from '@/components/register/StepMagicSync';
import { StepActivate } from '@/components/register/StepActivate';

export interface RegisterFormData {
  name: string;
  dob: string;
  city: string;
  pinCode: string;
  platform: 'zomato' | 'swiggy' | 'zepto' | '';
  partnerId: string;
  weeklyIncome: string;
  upiId: string;
}

const defaultFormData: RegisterFormData = {
  name: '',
  dob: '',
  city: 'Mumbai',
  pinCode: '',
  platform: '',
  partnerId: '',
  weeklyIncome: '',
  upiId: ''
};

export default function RegisterPage() {
  const router = useRouter();
  
  const [step, setStep] = useState<number>(0); // 0 to 3
  const [formData, setFormData] = useState<RegisterFormData>(defaultFormData);
  
  const [detectedZone, setDetectedZone] = useState<DetectedZone | null>(null);
  const [riskScore, setRiskScore] = useState<RiskScore | null>(null);
  const [premiumQuote, setPremiumQuote] = useState<PremiumResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Resume from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('gigsure_register_data');
    if (saved) {
      try {
        setFormData({ ...defaultFormData, ...JSON.parse(saved) });
      } catch (e) {}
    }
  }, []);

  // Save on change
  useEffect(() => {
    localStorage.setItem('gigsure_register_data', JSON.stringify(formData));
  }, [formData]);

  const updateFormData = (data: Partial<RegisterFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const stepsList = ['Platform', 'Magic Sync', 'Activate'];

  return (
    <>
      <TopBar title="Complete Profile" showBack />
      <PageWrapper requireAuth={true}>
        <div className="pt-2">
          <StepProgress steps={stepsList} current={step} />
          
            {step === 0 && (
              <StepPlatform
                formData={formData}
                updateFormData={updateFormData}
                onNext={() => setStep(1)}
              />
            )}
            
            {step === 1 && (
              <StepMagicSync
                formData={formData}
                updateFormData={updateFormData}
                onNext={() => setStep(2)}
                phone={localStorage.getItem('gigsure_temp_phone') || '+919999999999'}
                setPremiumQuote={setPremiumQuote}
                setDetectedZone={setDetectedZone}
              />
            )}
            
            {step === 2 && (
              <StepActivate
                formData={formData}
                updateFormData={updateFormData}
                detectedZone={detectedZone}
                premiumQuote={premiumQuote}
                setPremiumQuote={setPremiumQuote} // not used to set anymore, but required by props
              />
            )}
        </div>
      </PageWrapper>
    </>
  );
}
