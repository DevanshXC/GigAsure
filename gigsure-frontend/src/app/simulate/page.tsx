'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { simulateDisruption } from '@/lib/api';
import { usePolicy } from '@/context/PolicyContext';
import { useAuth } from '@/context/AuthContext';

export default function SimulatePage() {
  const router = useRouter();
  const { rider } = useAuth();
  const riderId = rider?.rider_id;
  const { fetchAll } = usePolicy();

  const [zoneId, setZoneId] = useState('MUM-ANDHERI-W');
  const [triggerType, setTriggerType] = useState('weather');
  const [threshold, setThreshold] = useState('26.0');
  
  const [durationHours, setDurationHours] = useState('2');
  const [durationMinutes, setDurationMinutes] = useState('0');
  
  const [latitude, setLatitude] = useState('19.1136');
  const [longitude, setLongitude] = useState('72.8697');
  const [radius, setRadius] = useState('2.0');
  const [severity, setSeverity] = useState('moderate');
  const [dataSource, setDataSource] = useState('IMD');

  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [result, setResult] = useState<any>(null);

  const zones = [
    { id: 'MUM-ANDHERI-W', lat: 19.1136, lng: 72.8697 },
    { id: 'MUM-DHARAVI', lat: 19.0425, lng: 72.8559 },
    { id: 'MUM-BANDRA-W', lat: 19.0596, lng: 72.8295 },
    { id: 'MUM-POWAI', lat: 19.1197, lng: 72.9051 },
    { id: 'DEL-CONNAUGHT', lat: 28.6315, lng: 77.2167 },
    { id: 'DEL-OKHLA', lat: 28.5355, lng: 77.2688 },
    { id: 'BLR-WHITEFIELD', lat: 12.9698, lng: 77.7500 },
    { id: 'BLR-KORAMANGALA', lat: 12.9352, lng: 77.6245 },
  ];

  const handleZoneChange = (newZoneId: string) => {
    setZoneId(newZoneId);
    const z = zones.find(z => z.id === newZoneId);
    if (z) {
      setLatitude(z.lat.toString());
      setLongitude(z.lng.toString());
    }
  };

  const handleTriggerSelect = (type: string) => {
    setTriggerType(type);
    if (type === 'weather') setThreshold('26.0');
    if (type === 'civic') setThreshold('1.0');
    if (type === 'aqi') setThreshold('320.0');
  };

  const getUnit = () => {
    if (triggerType === 'weather') return 'mm/hr';
    if (triggerType === 'aqi') return 'AQI level';
    return '(binary)';
  };

  const steps = [
    { title: 'Trigger Fires', desc: 'API threshold crossed', icon: '⚡' },
    { title: 'Policy Checked', desc: 'Active cover verified', icon: '🛡' },
    { title: 'Fraud Verified', desc: 'GPS + duty confirmed', icon: '✓' },
    { title: 'Payout Released', desc: 'Razorpay credit sent', icon: '💰' }
  ];

  const handleSimulate = async () => {
    setLoading(true);
    setResult(null);
    setActiveStep(null);

    try {
      const decimalHours = Number(durationHours) + (Number(durationMinutes) / 60);

      // Concurrently make the API call while showing the animation
      const apiPromise = simulateDisruption({
        zone_id: zoneId,
        trigger_type: triggerType,
        threshold_value: Number(threshold),
        source: 'demo_simulation',
        duration_hrs: decimalHours,
        latitude: Number(latitude),
        longitude: Number(longitude),
        affected_radius_km: Number(radius),
        severity,
        data_source: dataSource,
      });

      const animPromise = (async () => {
        for (let i = 0; i <= 3; i++) {
          setActiveStep(i);
          await new Promise(r => setTimeout(r, 800));
        }
      })();

      // Wait for both to finish (this masks the backend processing time gracefully)
      const [, data] = await Promise.all([animPromise, apiPromise]);

      setResult(data);
      
      // Silent refresh of the policy contexts globally so banner appears!
      if (riderId) {
        fetchAll(riderId);
      }
      
    } catch (err: any) {
      toast.error(err.message || 'Simulation failed');
      setActiveStep(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TopBar 
        title="Demo Mode" 
        rightElement={<Badge variant="warning">DEMO</Badge>} 
      />
      
      <PageWrapper requireAuth={true}>
        <div className="pt-4 pb-10">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-neutral-text">Simulate a Disruption</h2>
            <p className="text-sm text-neutral-muted">Trigger the zero-touch claim flow for demo.</p>
          </div>

          {/* Form */}
          {!result && (
            <div className="animate-in fade-in duration-300">
              <div className="w-full mb-4">
                <label className="block text-sm font-medium text-neutral-text mb-1">Target Zone</label>
                <select
                  className="w-full h-12 px-3 border border-neutral-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all rounded-btn bg-white"
                  value={zoneId}
                  onChange={(e) => handleZoneChange(e.target.value)}
                >
                  {zones.map(z => <option key={z.id} value={z.id}>{z.id}</option>)}
                </select>
              </div>

              <div className="w-full mb-4">
                <label className="block text-sm font-medium text-neutral-text mb-1">Trigger Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => handleTriggerSelect('weather')} className={`relative p-3 rounded-card border transition-all ${triggerType === 'weather' ? 'bg-primary-light border-primary border-2 text-primary-text font-medium' : 'bg-white border-neutral-border text-neutral-text hover:border-primary'}`}>
                    🌧 Weather
                  </button>
                  <button onClick={() => handleTriggerSelect('civic')} className={`relative p-3 rounded-card border transition-all ${triggerType === 'civic' ? 'bg-primary-light border-primary border-2 text-primary-text font-medium' : 'bg-white border-neutral-border text-neutral-text hover:border-primary'}`}>
                    🚫 Civic
                  </button>
                  <button onClick={() => handleTriggerSelect('aqi')} className={`relative p-3 rounded-card border transition-all ${triggerType === 'aqi' ? 'bg-primary-light border-primary border-2 text-primary-text font-medium' : 'bg-white border-neutral-border text-neutral-text hover:border-primary'}`}>
                    💨 AQI
                  </button>
                  <div className="relative p-3 rounded-card border border-neutral-border bg-neutral-bg text-neutral-muted text-center flex items-center justify-center italic text-xs">
                    (Unavailable)
                  </div>
                </div>
              </div>

              <Input
                label="Threshold Value"
                type="number"
                step="0.1"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                leftAddon={<span className="text-xs">{getUnit()}</span>}
              />

              <div className="w-full mt-4 flex gap-4">
                <div className="flex-1">
                  <Input
                    label="Duration (Hours)"
                    type="number"
                    min={0}
                    max={24}
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    label="Duration (Minutes)"
                    type="number"
                    min={0}
                    max={59}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                  />
                </div>
              </div>

              {/* Epicenter Coordinates */}
              <div className="w-full mt-4">
                <label className="block text-sm font-medium text-neutral-text mb-2">📍 Epicenter Coordinates</label>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      label="Latitude"
                      type="number"
                      step="0.0001"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      label="Longitude"
                      type="number"
                      step="0.0001"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Radius */}
              <div className="w-full mt-4">
                <Input
                  label="Affected Radius (km)"
                  type="number"
                  step="0.5"
                  min={0.5}
                  max={25}
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                />
              </div>

              {/* Severity & Data Source */}
              <div className="w-full mt-4 flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-neutral-text mb-1">Severity</label>
                  <select
                    className="w-full h-12 px-3 border border-neutral-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all rounded-btn bg-white text-sm"
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                  >
                    <option value="low">🟢 Low</option>
                    <option value="moderate">🟡 Moderate</option>
                    <option value="severe">🟠 Severe</option>
                    <option value="extreme">🔴 Extreme</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-neutral-text mb-1">Data Source</label>
                  <select
                    className="w-full h-12 px-3 border border-neutral-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all rounded-btn bg-white text-sm"
                    value={dataSource}
                    onChange={(e) => setDataSource(e.target.value)}
                  >
                    <option value="IMD">🌦 IMD (Weather)</option>
                    <option value="CPCB">🏭 CPCB (AQI)</option>
                    <option value="Municipal">🏛 Municipal</option>
                    <option value="Manual">✍ Manual Entry</option>
                  </select>
                </div>
              </div>

              <Button
                variant="cta"
                size="full"
                className="mt-4"
                onClick={handleSimulate}
                loading={loading && activeStep === null}
                disabled={loading}
              >
                Fire Disruption 🔥
              </Button>
            </div>
          )}

          {/* Animation Steps */}
          {activeStep !== null && !result && (
            <div className="mt-8 flex justify-between items-center relative animate-in fade-in zoom-in-95 duration-200">
              {/* Backline */}
              <div className="absolute left-4 right-4 top-5 h-0.5 bg-neutral-border -z-10" />
              
              {steps.map((step, idx) => {
                const isActive = activeStep === idx;
                const isPast = activeStep > idx;
                const isPending = activeStep < idx;

                return (
                  <div key={idx} className="flex flex-col items-center flex-1 relative z-10 w-16">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-300
                      ${isPast ? 'bg-success-DEFAULT text-white scale-110' : ''}
                      ${isActive ? 'bg-cta text-white animate-[pulse_0.5s_infinite] scale-125 shadow-lg' : ''}
                      ${isPending ? 'bg-neutral-bg text-neutral-muted border-2 border-neutral-border' : ''}
                    `}>
                      {isPast ? '✓' : step.icon}
                    </div>
                    <p className={`text-[10px] whitespace-nowrap mt-2 font-bold transition-all duration-300
                      ${isPast ? 'text-success-DEFAULT' : ''}
                      ${isActive ? 'text-cta' : ''}
                      ${isPending ? 'text-neutral-muted' : ''}
                    `}>
                      {step.title}
                    </p>
                    {isActive && (
                      <p className="text-[8px] text-neutral-text whitespace-nowrap absolute -bottom-4 animate-in slide-in-from-top-1">
                        {step.desc}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Result Card */}
          {result && (
            <div className="mt-4 bg-success-light border border-success-DEFAULT rounded-card p-5 animate-in slide-in-from-bottom-4 duration-500">
              <h3 className="font-bold text-success-text text-lg mb-4 flex items-center gap-2">
                <span>✓</span> Disruption Fired!
              </h3>
              
              <div className="space-y-3 text-sm mb-6 bg-white/50 p-3 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-neutral-text">Event ID</span>
                  <span className="font-mono text-xs">{result.event_id?.split('-')[0]}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-text">Claims opened</span>
                  <span className="font-bold">{result.claims_opened}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-text">Auto-approved</span>
                  <span className="font-bold text-success-text">{result.auto_approved_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-text">Flagged for review</span>
                  <span className="font-bold text-warning-text">{result.flagged_count}</span>
                </div>
                <div className="flex justify-between border-t border-success-DEFAULT/20 pt-2 mt-1">
                  <span className="text-neutral-text">Sample payout gen.</span>
                  <span className="font-bold text-success-text">₹{(result.sample_payout_amount || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button variant="primary" size="full" onClick={() => router.push('/claims')}>
                  View Active Claim →
                </Button>
                <Button variant="ghost" size="full" onClick={() => router.push('/dashboard')}>
                  View Dashboard
                </Button>
              </div>
            </div>
          )}

        </div>
      </PageWrapper>

      {/* Inject custom BottomNav manually because the global one might miss this route visually if not mapped, 
          actually global BottomNav looks at path. Wait, BottomNav doesn't map to /simulate. So let's render it 
          anyway to keep the layout consistent, but we added "Demo 🔥" manually as requested! */}
      <div className="fixed bottom-[70px] right-2 z-50">
        <button 
          onClick={() => router.push('/simulate')} 
          className="bg-cta text-white text-[10px] font-bold px-3 py-1.5 rounded-pill shadow-lg border border-white/20 animate-bounce"
        >
          Demo 🔥
        </button>
      </div>

      <BottomNav />
    </>
  );
}