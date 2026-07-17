'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Apple,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Contact,
  FileBadge,
  Home,
  Loader2,
  QrCode,
  RefreshCw,
  Save,
  Smartphone,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { getHumanReadableDeviceName } from '@/lib/deviceMapping';
import { getSystemSetting } from '@/app/actions/settings';
import type { Customer, OsPlatform, PaymentCycle, ResidentialStatus } from '@/types';

type Workflow = 'Android' | 'iOS';
type StepId = 'qr' | 'device' | 'identity' | 'contact' | 'location' | 'work';

type StepDef = { id: StepId; label: string; icon: React.ReactNode };

type DiscoveredDevice = {
  id: string;
  serial: string;
  model: string;
  imei?: string;
  os_version?: string;
};

type DeviceProfile = {
  id: number;
  name: string;
  type: string;
};

type RegisterForm = {
  full_name: string;
  phone_number: string;
  ghana_card_id: string;
  ghana_card_scan: File | null;
  alternative_phone_number: string;
  whatsapp_number: string;
  digital_address: string;
  location_landmarks: string;
  residential_status: ResidentialStatus | '';
  landlord_contact: string;
  occupation: string;
  place_of_work: string;
  payment_cycle: PaymentCycle | '';
  device_model: string;
  mdm_device_id: string;
  imei: string;
  serial_number: string;
  os_version: string;
  base_price: string;
  contract_duration_months: string;
  interest_rate: string;
  down_payment_type: 'percentage' | 'fixed';
  down_payment_value: string;
};

type RegisterResponse = {
  success: boolean;
  error?: string;
  data?: {
    customer: Customer;
    miradoreSync: {
      attempted: boolean;
      success: boolean;
      error?: string;
    };
  };
};

type DiscoverResponse = {
  success: boolean;
  error?: string;
  data?: DiscoveredDevice[];
};

const emptyForm: RegisterForm = {
  full_name: '',
  phone_number: '',
  ghana_card_id: '',
  ghana_card_scan: null,
  alternative_phone_number: '',
  whatsapp_number: '',
  digital_address: '',
  location_landmarks: '',
  residential_status: '',
  landlord_contact: '',
  occupation: '',
  place_of_work: '',
  payment_cycle: '',
  device_model: '',
  mdm_device_id: '',
  imei: '',
  serial_number: '',
  os_version: '',
  base_price: '',
  contract_duration_months: '3',
  interest_rate: '',
  down_payment_type: 'percentage',
  down_payment_value: '',
};

// Android gets 6 steps: QR Enrollment → Device → Identity → Contact → Location → Work
const androidSteps: StepDef[] = [
  { id: 'qr', label: 'QR Enrollment', icon: <QrCode size={15} /> },
  { id: 'device', label: 'Device', icon: <Smartphone size={15} /> },
  { id: 'identity', label: 'Identity', icon: <FileBadge size={15} /> },
  { id: 'contact', label: 'Contact', icon: <Contact size={15} /> },
  { id: 'location', label: 'Location', icon: <Home size={15} /> },
  { id: 'work', label: 'Work', icon: <BriefcaseBusiness size={15} /> },
];

// iOS keeps 5 steps: Device → Identity → Contact → Location → Work
const iosSteps: StepDef[] = [
  { id: 'device', label: 'Device', icon: <Smartphone size={15} /> },
  { id: 'identity', label: 'Identity', icon: <FileBadge size={15} /> },
  { id: 'contact', label: 'Contact', icon: <Contact size={15} /> },
  { id: 'location', label: 'Location', icon: <Home size={15} /> },
  { id: 'work', label: 'Work', icon: <BriefcaseBusiness size={15} /> },
];

const androidQrImage = process.env.NEXT_PUBLIC_ANDROID_ENTERPRISE_QR_IMAGE_URL ?? '';
const androidQrPayload = process.env.NEXT_PUBLIC_ANDROID_ENTERPRISE_ENROLLMENT_QR ?? '';

const GHANA_CARD_PATTERN = /^GHA-\d{9}-\d$/i;

export default function DeviceOnboardingPage() {
  const [workflow, setWorkflow] = useState<Workflow>('Android');
  const [stepIndex, setStepIndex] = useState(0);
  const [androidForm, setAndroidForm] = useState<RegisterForm>(emptyForm);
  const [iosForm, setIosForm] = useState<RegisterForm>(emptyForm);
  const router = useRouter();

  // Devices fetched from Miradore (filtered by platform, cross-checked against Nexora DB)
  const [androidDevices, setAndroidDevices] = useState<DiscoveredDevice[]>([]);
  const [iosDevices, setIosDevices] = useState<DiscoveredDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [fetchingDevices, setFetchingDevices] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastCustomer, setLastCustomer] = useState<Customer | null>(null);

  const [profiles, setProfiles] = useState<DeviceProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [fetchingProfiles, setFetchingProfiles] = useState(false);

  const [defaultDownPaymentRate, setDefaultDownPaymentRate] = useState('40');

  useEffect(() => {
    // Fetch global default financial settings
    Promise.all([
      getSystemSetting('payment_interest_rate'),
      getSystemSetting('payment_down_payment_rate')
    ]).then(([ir, dpr]) => {
      const defaultIr = ir || '30';
      const defaultDpr = dpr || '40';
      setDefaultDownPaymentRate(defaultDpr);
      
      setAndroidForm(prev => ({ ...prev, interest_rate: defaultIr, down_payment_value: defaultDpr }));
      setIosForm(prev => ({ ...prev, interest_rate: defaultIr, down_payment_value: defaultDpr }));
    });
  }, []);

  useEffect(() => {
    fetchDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow]);

  // QR enrollment confirmation gate (Android only)
  const [qrConfirmed, setQrConfirmed] = useState(false);

  const activeSteps = workflow === 'Android' ? androidSteps : iosSteps;
  const activeForm = workflow === 'Android' ? androidForm : iosForm;
  const activeDevices = workflow === 'Android' ? androidDevices : iosDevices;
  const currentStep = activeSteps[stepIndex];

  const selectedDevice = useMemo(
    () => activeDevices.find((device) => device.id === selectedDeviceId) ?? null,
    [activeDevices, selectedDeviceId]
  );

  const updateForm = (platform: Workflow, field: keyof RegisterForm, value: string | File | null) => {
    const setter = platform === 'Android' ? setAndroidForm : setIosForm;
    setter((prev) => ({ ...prev, [field]: value }));
  };

  const handleDeviceSelect = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    const device = activeDevices.find((d) => d.id === deviceId);
    if (device) {
      updateForm(workflow, 'mdm_device_id', device.id);
      updateForm(workflow, 'device_model', device.model);
      updateForm(workflow, 'serial_number', device.serial || '');
      updateForm(workflow, 'imei', device.imei || '');
      updateForm(workflow, 'os_version', device.os_version || '');
    }
  };

  const validateStep = (step: StepId) => {
    if (step === 'qr') {
      if (!qrConfirmed) return 'Confirm that you have completed the Android Enterprise setup on the device.';
    }

    if (step === 'device') {
      if (!selectedDeviceId) return `Select a discovered ${workflow} device from the list.`;
      if (!activeForm.base_price) return 'Enter the device base price.';
      if (!Number.isFinite(Number(activeForm.base_price)) || Number(activeForm.base_price) <= 0) return 'Base price must be a positive number.';
      if (!activeForm.contract_duration_months) return 'Enter the contract duration.';
      if (!Number.isFinite(Number(activeForm.contract_duration_months)) || Number(activeForm.contract_duration_months) <= 0) return 'Contract duration must be positive.';
      
      if (!activeForm.interest_rate) return 'Enter the interest/installation fee rate.';
      if (!activeForm.down_payment_value) return 'Enter the down payment value.';
      
      if (activeForm.down_payment_type === 'fixed') {
        const base = Number(activeForm.base_price);
        const interest = Number(activeForm.interest_rate);
        const defDpRate = Number(defaultDownPaymentRate);
        const totalValue = base * (1 + interest / 100);
        const minDp = totalValue * (defDpRate / 100);
        
        if (Number(activeForm.down_payment_value) < minDp) {
          return `Fixed down payment cannot be less than the default ${defDpRate}% (GH₵ ${minDp.toFixed(2)}).`;
        }
      }
    }

    if (step === 'identity') {
      if (!activeForm.ghana_card_id || !GHANA_CARD_PATTERN.test(activeForm.ghana_card_id)) return 'Enter a valid Ghana Card ID in the format GHA-XXXXXXXXX-X.';
      if (!activeForm.ghana_card_scan) return 'Upload a Ghana Card photo or scan.';
      if (!activeForm.full_name) return 'Enter the full legal name exactly as it appears on the Ghana Card.';
    }

    if (step === 'contact') {
      if (!activeForm.phone_number || !activeForm.alternative_phone_number || !activeForm.whatsapp_number) return 'Complete primary, emergency, and WhatsApp numbers.';
    }

    if (step === 'location') {
      if (!activeForm.digital_address || !activeForm.location_landmarks || !activeForm.residential_status) return 'Complete digital address, landmarks, and residential status.';
    }

    if (step === 'work') {
      if (!activeForm.occupation || !activeForm.place_of_work || !activeForm.payment_cycle) return 'Complete occupation, place of work, and payment cycle.';
    }

    return null;
  };

  const goNext = () => {
    const error = validateStep(currentStep.id);
    if (error) {
      toast.error(error);
      return;
    }
    setStepIndex((prev) => Math.min(prev + 1, activeSteps.length - 1));
  };

  const fetchDevices = async () => {
    setFetchingDevices(true);
    const platform = workflow === 'Android' ? 'android' : 'ios';
    try {
      const url = `/api/devices/discover?platform=${platform}`;
      const response = await fetch(url, { method: 'GET' });
      const result = await response.json() as DiscoverResponse;

      if (!response.ok || !result.success) throw new Error(result.error ?? 'Unable to fetch devices.');

      const devices = result.data ?? [];
      if (workflow === 'Android') {
        setAndroidDevices(devices);
      } else {
        setIosDevices(devices);
      }
      setSelectedDeviceId('');
      toast.success(`${devices.length} discovered ${workflow} device${devices.length === 1 ? '' : 's'} found.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to fetch devices.');
    } finally {
      setFetchingDevices(false);
    }
  };

  const registerDevice = async (platform: OsPlatform, form: RegisterForm) => {
    const formData = new FormData();
    formData.set('full_name', form.full_name);
    formData.set('phone_number', form.phone_number);
    formData.set('ghana_card_id', form.ghana_card_id);
    formData.set('alternative_phone_number', form.alternative_phone_number);
    formData.set('whatsapp_number', form.whatsapp_number);
    formData.set('digital_address', form.digital_address);
    formData.set('location_landmarks', form.location_landmarks);
    formData.set('residential_status', form.residential_status);
    formData.set('landlord_contact', form.landlord_contact);
    formData.set('occupation', form.occupation);
    formData.set('place_of_work', form.place_of_work);
    formData.set('payment_cycle', form.payment_cycle);
    formData.set('os_platform', platform);
    formData.set('device_model', form.device_model);
    formData.set('mdm_device_id', form.mdm_device_id);
    formData.set('imei', form.imei);
    formData.set('serial_number', form.serial_number);
    formData.set('os_version', form.os_version);
    formData.set('base_price', form.base_price);
    formData.set('contract_duration_months', form.contract_duration_months);
    formData.set('interest_rate', form.interest_rate);
    formData.set('down_payment_type', form.down_payment_type);
    formData.set('down_payment_value', form.down_payment_value);

    if (form.ghana_card_scan) formData.set('ghana_card_scan', form.ghana_card_scan);

    const response = await fetch('/api/devices/register', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json() as RegisterResponse;
    if (!response.ok || !result.success || !result.data) throw new Error(result.error ?? 'Registration failed.');

    return result.data;
  };

  const submitActiveWorkflow = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = validateStep(currentStep.id);
    if (error) {
      toast.error(error);
      return;
    }

    setSubmitting(true);
    setLastCustomer(null);

    try {
      const data = await registerDevice(workflow, activeForm);
      setLastCustomer(data.customer);

      if (workflow === 'Android') {
        setAndroidForm(emptyForm);
        setAndroidDevices((prev) => prev.filter((device) => device.id !== selectedDeviceId));
        setQrConfirmed(false);
      } else {
        setIosForm(emptyForm);
        setIosDevices((prev) => prev.filter((device) => device.id !== selectedDeviceId));

        if (data.miradoreSync.attempted && !data.miradoreSync.success) {
          toast.warning(`Registered, but Scalefusion asset sync failed: ${data.miradoreSync.error ?? 'Unknown error'}`);
          return;
        }
      }

      setSelectedDeviceId('');
      setStepIndex(0);
      toast.success(`${(data.customer as any).device_model} registered to ${data.customer.full_name}.`);
      router.push(`/dashboard/admin/customers/${data.customer.id}`);
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };



  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="max-w-[1180px] mx-auto space-y-5"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Smartphone size={18} className="text-blue-400" />
            <h1 className="text-xl font-semibold text-white">Device Onboarding</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">Capture device, identity, contact, location, and payment baseline before assignment.</p>
        </div>

        <div className="inline-flex w-full sm:w-auto rounded-xl border border-white/8 bg-white/5 p-1">
          {(['Android', 'iOS'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setWorkflow(item);
                setStepIndex(0);
                setLastCustomer(null);
                setSelectedDeviceId('');
                if (item === 'Android') setQrConfirmed(false);
              }}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all
                ${workflow === item ? 'bg-blue-600 text-white shadow-[0_4px_16px_rgba(37,99,235,0.25)]' : 'text-slate-400 hover:text-white'}
              `}
            >
              {item === 'Android' ? <Smartphone size={16} /> : <Apple size={16} />}
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        <Stepper steps={activeSteps} stepIndex={stepIndex} onStepChange={setStepIndex} />
        <section className="rounded-2xl border border-white/8 bg-[#111827] p-5">
          <form onSubmit={submitActiveWorkflow} className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-blue-400">Step {stepIndex + 1} of {activeSteps.length}</p>
                <h2 className="text-lg font-semibold text-white">{currentStep.label}</h2>
              </div>
              <span className="text-sm text-slate-500">{workflow} onboarding</span>
            </div>

            {currentStep.id === 'qr' && (
              <QrEnrollmentStep
                confirmed={qrConfirmed}
                onConfirmChange={setQrConfirmed}
              />
            )}

            {currentStep.id === 'device' && (
              <DeviceStep
                workflow={workflow}
                form={activeForm}
                selectedDeviceId={selectedDeviceId}
                selectedDevice={selectedDevice}
                devices={activeDevices}
                fetchingDevices={fetchingDevices}
                profiles={profiles}
                fetchingProfiles={fetchingProfiles}
                selectedProfileId={selectedProfileId}
                onProfileSelect={setSelectedProfileId}
                onFetchDevices={fetchDevices}
                onSelectDevice={handleDeviceSelect}
                onChange={(field, value) => updateForm(workflow, field, value)}
              />
            )}

            {currentStep.id === 'identity' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Input id="ghana-card-id" label="Ghana Card Unique ID" value={activeForm.ghana_card_id} onChange={(value) => updateForm(workflow, 'ghana_card_id', value.toUpperCase())} placeholder="GHA-123456789-0" required />
                <Input id="legal-name" label="Full Legal Name" value={activeForm.full_name} onChange={(value) => updateForm(workflow, 'full_name', value)} required />
                <FileInput id="ghana-card-scan" label="Ghana Card Photo / Scan" file={activeForm.ghana_card_scan} onChange={(file) => updateForm(workflow, 'ghana_card_scan', file)} />
              </div>
            )}

            {currentStep.id === 'contact' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Input id="primary-phone" label="Primary Phone / MoMo Number" value={activeForm.phone_number} onChange={(value) => updateForm(workflow, 'phone_number', value)} required />
                <Input id="alt-phone" label="Alternative / Emergency Phone" value={activeForm.alternative_phone_number} onChange={(value) => updateForm(workflow, 'alternative_phone_number', value)} required />
                <Input id="whatsapp-phone" label="Active WhatsApp Number" value={activeForm.whatsapp_number} onChange={(value) => updateForm(workflow, 'whatsapp_number', value)} required />
              </div>
            )}

            {currentStep.id === 'location' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Input id="digital-address" label="Ghana Post Digital Address" value={activeForm.digital_address} onChange={(value) => updateForm(workflow, 'digital_address', value.toUpperCase())} placeholder="GA-123-4567" required />
                <Select id="residential-status" label="Residential Status" value={activeForm.residential_status} onChange={(value) => updateForm(workflow, 'residential_status', value)} options={[
                  { value: 'owner', label: 'Owner' },
                  { value: 'renting', label: 'Renting' },
                  { value: 'family_house', label: 'Family house' },
                  { value: 'other', label: 'Other' },
                ]} />
                <TextArea id="landmarks" label="Landmarks" value={activeForm.location_landmarks} onChange={(value) => updateForm(workflow, 'location_landmarks', value)} className="sm:col-span-2" required />
                <Input id="landlord-contact" label="Landlord / Caretaker Contact" value={activeForm.landlord_contact} onChange={(value) => updateForm(workflow, 'landlord_contact', value)} />
              </div>
            )}

            {currentStep.id === 'work' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Input id="occupation" label="Occupation" value={activeForm.occupation} onChange={(value) => updateForm(workflow, 'occupation', value)} required />
                <Input id="workplace" label="Place of Work" value={activeForm.place_of_work} onChange={(value) => updateForm(workflow, 'place_of_work', value)} required />
                <Select id="payment-cycle" label="Preferred Payment Cycle" value={activeForm.payment_cycle} onChange={(value) => updateForm(workflow, 'payment_cycle', value)} options={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'bi_weekly', label: 'Bi-weekly' },
                ]} />
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-white/5 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setStepIndex((prev) => Math.max(prev - 1, 0))}
                disabled={stepIndex === 0 || submitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-300 transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft size={16} />
                Back
              </button>

              {stepIndex < activeSteps.length - 1 ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-[0_4px_20px_rgba(37,99,235,0.35)] transition-all hover:bg-blue-500 disabled:opacity-60"
                >
                  Continue
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-[0_4px_20px_rgba(37,99,235,0.35)] transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Complete Registration
                </button>
              )}
            </div>
          </form>

          {lastCustomer && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-emerald-300">Registration complete</p>
                <p className="mt-1 text-xs text-slate-400">
                  {lastCustomer.full_name} now owes GHS {Number((lastCustomer as any).remaining_balance).toLocaleString()} for {(lastCustomer as any).device_model}.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </motion.div>
  );
}

/* ─── Stepper ────────────────────────────────────────────────────────────────── */

function Stepper({
  steps,
  stepIndex,
  onStepChange,
}: {
  steps: StepDef[];
  stepIndex: number;
  onStepChange: (index: number) => void;
}) {
  return (
    <nav className="rounded-2xl border border-white/8 bg-[#111827] px-4 py-5 shadow-[0_12px_30px_rgba(2,6,23,0.18)]">
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-[720px] items-start">
          {steps.map((step, index) => {
            const isComplete = index < stepIndex;
            const isActive = index === stepIndex;

            return (
              <div key={step.id} className="flex flex-1 items-start last:flex-none">
                <button
                  type="button"
                  onClick={() => onStepChange(index)}
                  className="group flex min-w-[104px] flex-col items-center gap-2 text-center"
                  aria-current={isActive ? 'step' : undefined}
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all
                      ${isComplete ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]' : ''}
                      ${isActive ? 'border-blue-300 bg-blue-500 text-white shadow-[0_0_0_5px_rgba(59,130,246,0.18)]' : ''}
                      ${!isComplete && !isActive ? 'border-blue-500/20 bg-blue-500/10 text-blue-300 group-hover:border-blue-400/40' : ''}
                    `}
                  >
                    {isComplete ? <Check size={18} strokeWidth={3} /> : step.icon}
                  </span>
                  <span className={`text-xs font-semibold ${isActive ? 'text-white' : isComplete ? 'text-emerald-200' : 'text-slate-500'}`}>
                    {step.label}
                  </span>
                </button>

                {index < steps.length - 1 && (
                  <div className="mt-5 h-1 flex-1 min-w-[80px] rounded-full px-2">
                    <div className={`h-full rounded-full transition-colors ${index < stepIndex ? 'bg-emerald-400' : 'bg-blue-500/20'}`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

/* ─── QR Enrollment Step (Android only) ──────────────────────────────────────── */

function QrEnrollmentStep({
  confirmed,
  onConfirmChange,
}: {
  confirmed: boolean;
  onConfirmChange: (value: boolean) => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 md:grid-cols-[260px_minmax(0,1fr)]">
        <div 
          className="rounded-xl border border-emerald-500/20 bg-white p-3 cursor-pointer hover:ring-2 hover:ring-emerald-500/50 transition-all group relative"
          onClick={() => setIsModalOpen(true)}
        >
          <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
            <span className="bg-black/80 text-white text-xs font-semibold px-2 py-1 rounded-md">Click to enlarge</span>
          </div>
          <div
            role="img"
            aria-label="Android Enterprise enrollment QR"
            className="aspect-square w-full bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: `url('/androidqrcode.png')` }}
          />
        </div>
        <div className="flex flex-col justify-center">
          <h3 className="text-sm font-semibold text-white">Android Enterprise Enrollment</h3>
          <p className="mt-1 text-sm text-slate-400">
            Scan the QR code on the new Android device to begin the Android Enterprise setup. Complete all on-device configuration steps before continuing.
          </p>
          {androidQrPayload && (
            <p className="mt-3 truncate rounded-lg bg-white/5 px-2 py-2 font-mono text-xs text-slate-500">{androidQrPayload}</p>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
              >
                <X size={24} />
              </button>
              <div
                role="img"
                aria-label="Android Enterprise enrollment QR large"
                className="aspect-square w-full bg-contain bg-center bg-no-repeat"
                style={{ backgroundImage: `url('/androidqrcode.png')` }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <label
        htmlFor="qr-confirmed"
        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all ${
          confirmed
            ? 'border-emerald-500/30 bg-emerald-500/10'
            : 'border-white/8 bg-white/5 hover:border-white/15'
        }`}
      >
        <div className="relative flex h-5 w-5 shrink-0 items-center justify-center">
          <input
            id="qr-confirmed"
            type="checkbox"
            checked={confirmed}
            onChange={(e) => onConfirmChange(e.target.checked)}
            className="peer sr-only"
          />
          <div className={`h-5 w-5 rounded-md border-2 transition-all ${
            confirmed
              ? 'border-emerald-400 bg-emerald-500'
              : 'border-slate-500 bg-white/5'
          }`}>
            {confirmed && <Check size={14} strokeWidth={3} className="text-white mx-auto mt-px" />}
          </div>
        </div>
        <span className={`text-sm font-medium ${confirmed ? 'text-emerald-200' : 'text-slate-300'}`}>
          I have scanned the QR code and completed the Android Enterprise setup on the device.
        </span>
      </label>
    </div>
  );
}

/* ─── Device Step (Shared by both workflows) ─────────────────────────────────── */

function DeviceStep({
  workflow,
  form,
  selectedDeviceId,
  selectedDevice,
  devices,
  fetchingDevices,
  profiles,
  fetchingProfiles,
  selectedProfileId,
  onProfileSelect,
  onFetchDevices,
  onSelectDevice,
  onChange,
}: {
  workflow: Workflow;
  form: RegisterForm;
  selectedDeviceId: string;
  selectedDevice: DiscoveredDevice | null;
  devices: DiscoveredDevice[];
  fetchingDevices: boolean;
  profiles: DeviceProfile[];
  fetchingProfiles: boolean;
  selectedProfileId: string;
  onProfileSelect: (id: string) => void;
  onFetchDevices: () => void;
  onSelectDevice: (id: string) => void;
  onChange: (field: keyof RegisterForm, value: string | File | null) => void;
}) {
  const platformLabel = workflow === 'Android' ? 'Android' : 'Apple';
  const PlatformIcon = workflow === 'Android' ? Smartphone : Apple;

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-xl border border-white/8 bg-white/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <PlatformIcon size={18} className="text-slate-300" />
            <h3 className="text-sm font-semibold text-white">{platformLabel} Inventory</h3>
          </div>
          <button
            type="button"
            onClick={onFetchDevices}
            disabled={fetchingDevices}
            className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition-all hover:bg-white/10 disabled:opacity-60"
          >
            {fetchingDevices ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Fetch Devices
          </button>
        </div>

        {/* Profile select hidden for now
        <select
          id={`${workflow.toLowerCase()}-profile`}
          value={selectedProfileId}
          onChange={(event) => onProfileSelect(event.target.value)}
          disabled={fetchingProfiles || fetchingDevices}
          className="w-full rounded-xl border border-white/10 bg-[#0D1526] px-3 py-3 text-sm text-white outline-none transition-all focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60 mb-3"
        >
          <option value="">All Profiles (or Global Default)</option>
          {profiles
            .filter((p) => workflow === 'Android' ? p.type.toLowerCase().includes('android') : p.type.toLowerCase().includes('apple') || p.type.toLowerCase().includes('ios'))
            .map((profile) => (
            <option key={profile.id} value={String(profile.id)}>
              {profile.name} ({profile.type})
            </option>
          ))}
        </select>
        */}

        {fetchingDevices ? (
          <div className="w-full flex items-center justify-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-6 text-sm text-blue-400">
            <Loader2 size={20} className="animate-spin" />
            <span>Fetching discovered devices from MDM Server...</span>
          </div>
        ) : (
          <select
            id={`${workflow.toLowerCase()}-device`}
            value={selectedDeviceId}
            onChange={(event) => onSelectDevice(event.target.value)}
            disabled={fetchingDevices}
            className="w-full rounded-xl border border-white/10 bg-[#0D1526] px-3 py-3 text-sm text-white outline-none transition-all focus:ring-2 focus:ring-blue-500/40"
          >
            <option value="" className="bg-[#0D1526]">Select discovered hardware</option>
            {devices.map((device) => (
              <option key={device.id} value={device.id} className="bg-[#0D1526]">
                {device.serial} - {getHumanReadableDeviceName(device.model) || device.model}
              </option>
            ))}
          </select>
        )}

        {selectedDevice ? (
          <div className="rounded-xl border border-white/8 bg-white/5 p-3">
            <p className="text-sm font-semibold text-white">{getHumanReadableDeviceName(selectedDevice.model) || selectedDevice.model}</p>
            <p className="mt-1 text-xs text-slate-500">Serial: {selectedDevice.serial}</p>
            <p className="mt-1 text-xs text-slate-500">MDM Device ID: {selectedDevice.id}</p>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>No {platformLabel} device selected.</span>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input id={`${workflow}-model`} label="Device Model" value={form.device_model} onChange={(value) => onChange('device_model', value)} disabled={Boolean(selectedDevice)} required />
        <Input id={`${workflow}-device-id`} label="MDM Device ID" value={form.mdm_device_id} onChange={(value) => onChange('mdm_device_id', value)} disabled={Boolean(selectedDevice)} required />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input id={`${workflow}-base`} label="Device Base Price (GH₵)" type="number" min="1" step="1" value={form.base_price} onChange={(value) => onChange('base_price', value)} required />
        <Input id={`${workflow}-duration`} label="Contract Duration (Months)" type="number" min="1" step="1" value={form.contract_duration_months} onChange={(value) => onChange('contract_duration_months', value)} required />
      </div>

      <div className="pt-4 border-t border-white/5 space-y-4">
        <h4 className="text-sm font-semibold text-white">Financial Configuration</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input id={`${workflow}-interest`} label="Interest / Fee (%)" type="number" min="0" step="0.1" value={form.interest_rate} onChange={(value) => onChange('interest_rate', value)} required />
          <Select id={`${workflow}-dp-type`} label="Down Payment Type" value={form.down_payment_type} onChange={(value) => onChange('down_payment_type', value as any)} options={[{ value: 'percentage', label: 'Percentage (%)' }, { value: 'fixed', label: 'Fixed Amount (GH₵)' }]} />
          <Input id={`${workflow}-dp-value`} label={form.down_payment_type === 'percentage' ? 'Down Payment (%)' : 'Down Payment Amount (GH₵)'} type="number" min="0" step="1" value={form.down_payment_value} onChange={(value) => onChange('down_payment_value', value)} required />
        </div>
      </div>
    </div>
  );
}

/* ─── Form primitives ────────────────────────────────────────────────────────── */

function Input({
  id,
  label,
  value,
  onChange,
  type = 'text',
  disabled = false,
  required = false,
  min,
  step,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
  required?: boolean;
  min?: string;
  step?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-slate-400">
        {label}
      </label>
      <input
        id={id}
        type={type}
        min={min}
        step={step}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required={required}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white placeholder:text-slate-600 outline-none transition-all focus:ring-2 focus:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </div>
  );
}

function TextArea({
  id,
  label,
  value,
  onChange,
  className = '',
  required = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-slate-400">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        rows={4}
        className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white placeholder:text-slate-600 outline-none transition-all focus:ring-2 focus:ring-blue-500/40"
      />
    </div>
  );
}

function Select({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-slate-400">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none transition-all focus:ring-2 focus:ring-blue-500/40"
      >
        <option value="" className="bg-[#0D1526]">Select one</option>
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-[#0D1526]">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function FileInput({
  id,
  label,
  file,
  onChange,
}: {
  id: string;
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <div className="sm:col-span-2">
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-slate-400">
        {label}
      </label>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        required
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
      />
      {file && <p className="mt-2 text-xs text-slate-500">{file.name}</p>}
    </div>
  );
}
