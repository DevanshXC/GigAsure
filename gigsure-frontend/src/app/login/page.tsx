'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { sendOtp, verifyOtp } from '@/lib/api';
import { savePhone } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [otpError, setOtpError] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSendOtp = async () => {
    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const fullPhone = `+91${phone}`;
      const res = await sendOtp(fullPhone);
      toast.success(res.message || `OTP sent to ${fullPhone}`);
      savePhone(fullPhone);
      setDevOtp(res.dev_otp || null);
      setStep('otp');
      setResendTimer(30);
      setOtpError(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pasted = value.slice(0, 6).split('');
      const newOtp = [...otp];
      for (let i = 0; i < pasted.length; i++) {
        if (index + i < 6) newOtp[index + i] = pasted[i];
      }
      setOtp(newOtp);
      // Focus the right-most filled box
      const nextIndex = Math.min(index + pasted.length, 5);
      otpRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setOtpError(false);

    // Auto-focus next
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const fullOtp = otp.join('');
    if (fullOtp.length < 6) {
      toast.error('Complete the 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const fullPhone = `+91${phone}`;
      const data = await verifyOtp(fullPhone, fullOtp);
      
      login(data);
      
      if (data.is_new_rider) {
        router.push('/register');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setOtpError(true);
      toast.error('Invalid OTP');
      // Shake animation class will trigger on otpError
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit when all 6 digits entered
  useEffect(() => {
    if (step === 'otp' && otp.every((d) => d !== '') && otp.length === 6 && !loading) {
      // Don't auto-submit immediately to show the last digit visually for a frame
      const timer = setTimeout(() => {
        handleVerifyOtp();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [otp, step, loading]);

  return (
    <div className="min-h-screen bg-neutral-bg flex flex-col items-center">
      {/* Top Section */}
      <div className="w-full flex-1 flex flex-col items-center justify-center pt-10 pb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-3xl mb-4 shadow-md">
          G
        </div>
        <h1 className="text-neutral-text text-3xl font-bold tracking-tight mb-2">GigaSure</h1>
        <p className="text-neutral-muted text-sm max-w-[250px] text-center">
          Parametric income protection for delivery partners.
        </p>
      </div>

      {/* Bottom Sheet */}
      <div className="w-full max-w-md bg-white rounded-t-[32px] px-6 pt-8 pb-12 shadow-[0_-4px_24px_rgba(0,0,0,0.05)] flex-1 min-h-[60vh]">
        {step === 'phone' ? (
          <div className="animate-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-2xl font-bold text-neutral-text mb-6">Welcome back</h2>
            
            <Input
              label="Mobile Number"
              placeholder="9876543210"
              type="tel"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              leftAddon={<span className="text-lg font-medium">+91</span>}
            />

            <Button 
              variant="cta" 
              size="full" 
              className="mt-4"
              onClick={handleSendOtp}
              loading={loading}
              disabled={phone.length !== 10}
            >
              Send OTP →
            </Button>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center mb-6">
              <button 
                onClick={() => setStep('phone')} 
                className="mr-3 p-1 rounded-full hover:bg-neutral-bg"
              >
                <ArrowLeft size={20} className="text-neutral-text" />
              </button>
              <h2 className="text-2xl font-bold text-neutral-text">Enter OTP</h2>
            </div>
            
            <p className="text-neutral-muted text-sm mb-6">
              Enter the 6-digit code sent to +91 {phone}
            </p>

            {devOtp && (
              <div className="bg-primary-light border border-primary text-primary-text rounded-md p-2 mb-6 text-sm text-center">
                Dev OTP: <strong className="font-mono text-lg">{devOtp}</strong>
              </div>
            )}

            <div className={`flex justify-between gap-2 mb-6 ${otpError ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="tel"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className={`w-11 h-12 text-center text-xl font-mono rounded-lg outline-none transition-all
                    ${digit ? 'bg-primary-light border-primary border-2 text-primary-text' : 'bg-white border border-neutral-border focus:border-primary focus:ring-1 focus:ring-primary'}
                    ${otpError ? 'border-danger-DEFAULT ring-danger-DEFAULT focus:ring-danger-DEFAULT' : ''}
                  `}
                />
              ))}
            </div>

            <div className="flex justify-center mb-6">
              {resendTimer > 0 ? (
                <span className="text-neutral-muted text-sm">Resend in {resendTimer}s</span>
              ) : (
                <button 
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="text-primary text-sm font-medium hover:underline"
                >
                  Resend OTP
                </button>
              )}
            </div>

            <Button 
              variant="primary" 
              size="full" 
              onClick={handleVerifyOtp}
              loading={loading}
              disabled={otp.join('').length !== 6}
            >
              Verify OTP →
            </Button>
            
            <style jsx global>{`
              @keyframes shake {
                0%, 100% { transform: translateX(0); }
                20%, 60% { transform: translateX(-5px); }
                40%, 80% { transform: translateX(5px); }
              }
            `}</style>
          </div>
        )}
      </div>
    </div>
  );
}
