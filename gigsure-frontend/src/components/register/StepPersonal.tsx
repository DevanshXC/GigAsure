import React, { useState } from 'react';
import { RegisterFormData } from '@/app/register/page';
import { DetectedZone } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { detectZone } from '@/lib/api';

interface Props {
  formData: RegisterFormData;
  updateFormData: (data: Partial<RegisterFormData>) => void;
  onNext: () => void;
  detectedZone: DetectedZone | null;
  setDetectedZone: React.Dispatch<React.SetStateAction<DetectedZone | null>>;
}

export const StepPersonal: React.FC<Props> = ({
  formData,
  updateFormData,
  onNext,
  detectedZone,
  setDetectedZone
}) => {
  const [zoneLoading, setZoneLoading] = useState(false);
  const [zoneError, setZoneError] = useState(false);

  // Maximum date for 18 years old
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 18);
  const maxDateString = maxDate.toISOString().split('T')[0];

  const handlePinCodeChange = async (pinCode: string) => {
    updateFormData({ pinCode });
    if (pinCode.length === 6) {
      setZoneLoading(true);
      setZoneError(false);
      try {
        const zone = await detectZone(pinCode);
        setDetectedZone(zone);
      } catch (err) {
        setDetectedZone(null);
        setZoneError(true);
      } finally {
        setZoneLoading(false);
      }
    } else {
      setDetectedZone(null);
      setZoneError(false);
    }
  };

  const isFormValid = 
    formData.name.trim() !== '' && 
    formData.dob !== '' && 
    formData.city !== '' && 
    formData.pinCode.length === 6;

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <h2 className="text-xl font-bold text-neutral-text mb-4">Personal Details</h2>
      
      <Input
        label="Full name"
        placeholder="e.g. Rahul Sharma"
        value={formData.name}
        onChange={(e) => updateFormData({ name: e.target.value })}
      />

      <Input
        label="Date of birth"
        type="date"
        max={maxDateString}
        value={formData.dob}
        onChange={(e) => updateFormData({ dob: e.target.value })}
      />

      <div className="w-full mb-4">
        <label className="block text-sm font-medium text-neutral-text mb-1">City</label>
        <select
          className="w-full h-12 px-3 border border-neutral-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all rounded-btn bg-white"
          value={formData.city}
          onChange={(e) => updateFormData({ city: e.target.value })}
        >
          <option value="Mumbai">Mumbai</option>
          <option value="Delhi">Delhi</option>
          <option value="Bengaluru">Bengaluru</option>
          <option value="Hyderabad">Hyderabad</option>
          <option value="Chennai">Chennai</option>
          <option value="Pune">Pune</option>
          <option value="Kolkata">Kolkata</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div className="mb-6">
        <Input
          label="Pin code"
          type="tel"
          maxLength={6}
          placeholder="e.g. 400058"
          value={formData.pinCode}
          onChange={(e) => handlePinCodeChange(e.target.value.replace(/\D/g, ''))}
        />
        
        {zoneLoading && <p className="text-sm text-neutral-muted mt-1 animate-pulse">Detecting zone...</p>}
        
        {detectedZone && (
          <div className="inline-block bg-primary-light border border-primary rounded-pill px-3 py-1 text-primary text-sm mt-1">
            📍 {detectedZone.zone_name} · Tier {detectedZone.zone_tier}
          </div>
        )}

        {zoneError && (
          <div className="inline-block bg-warning-light border border-warning-DEFAULT text-warning-text rounded-pill px-3 py-1 text-sm mt-1">
            Zone not mapped — will use city default
          </div>
        )}
      </div>

      <Button
        variant="primary"
        size="full"
        onClick={onNext}
        disabled={!isFormValid || zoneLoading}
      >
        Continue →
      </Button>
    </div>
  );
};
