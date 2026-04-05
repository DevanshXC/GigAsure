import React from 'react';
import { RegisterFormData } from '@/app/register/page';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface Props {
  formData: RegisterFormData;
  updateFormData: (data: Partial<RegisterFormData>) => void;
  onNext: () => void;
}

export const StepPlatform: React.FC<Props> = ({ formData, updateFormData, onNext }) => {
  const isFormValid = 
    formData.platform !== '' && 
    formData.partnerId.trim() !== '';

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <h2 className="text-xl font-bold text-neutral-text mb-6">Which platform do you deliver for?</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button 
          onClick={() => updateFormData({ platform: 'zomato' })}
          className={`relative p-4 rounded-card border text-center transition-all ${formData.platform === 'zomato' ? 'bg-primary-light border-2 border-primary' : 'bg-white border-neutral-border hover:border-primary'}`}
        >
          {formData.platform === 'zomato' && (
             <span className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 bg-primary text-white rounded-full text-xs">✓</span>
          )}
          <div className="w-10 h-10 bg-red-600 text-white rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-2">Z</div>
          <p className="font-medium text-neutral-text">Zomato</p>
        </button>
        <button 
          onClick={() => updateFormData({ platform: 'swiggy' })}
          className={`relative p-4 rounded-card border text-center transition-all ${formData.platform === 'swiggy' ? 'bg-primary-light border-2 border-primary' : 'bg-white border-neutral-border hover:border-primary'}`}
        >
          {formData.platform === 'swiggy' && (
             <span className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 bg-primary text-white rounded-full text-xs">✓</span>
          )}
          <div className="w-10 h-10 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-2">S</div>
          <p className="font-medium text-neutral-text">Swiggy</p>
        </button>
      </div>

      <Input
        label="Your Partner ID"
        placeholder="e.g. ZMT-MUM-4872"
        value={formData.partnerId}
        onChange={(e) => updateFormData({ partnerId: e.target.value.toUpperCase() })}
        helperText="Found in your delivery app → Profile → Partner ID"
      />

      <Button
        variant="primary"
        size="full"
        onClick={onNext}
        disabled={!isFormValid}
        className="mt-6"
      >
        Continue →
      </Button>
    </div>
  );
};
