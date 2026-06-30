'use client';

import { FormEvent, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { toast } from 'sonner';
import type { Customer, OsPlatform, PaymentCycle, ResidentialStatus } from '@/types';

type Workflow = 'Android' | 'iOS';
type StepId = 'device' | 'identity' | 'contact' | 'location' | 'work';

type UnassignedDevice = {
  id: string;
  serial: string;
  model: string;
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
  miradore_device_id: string;
  total_owed: string;
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

type UnassignedResponse = {
  success: boolean;
  error?: string;
  data?: UnassignedDevice[];
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
  miradore_device_id: '',
  total_owed: '',
};

const steps: { id: StepId; label: string; icon: React.ReactNode }[] = [
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
  const [iosDevices, setIosDevices] = useState<UnassignedDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [fetchingDevices, setFetchingDevices] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastCustomer, setLastCustomer] = useState<Customer | null>(null);

  const activeForm = workflow === 'Android' ? androidForm : iosForm;
  const currentStep = steps[stepIndex];
  const selectedIosDevice = useMemo(
    () => iosDevices.find((device) => device.id === selectedDeviceId) ?? null,
    [iosDevices, selectedDeviceId]
  );

  const updateForm = (platform: Workflow, field: keyof RegisterForm, value: string | File | null) => {
    const setter = platform === 'Android' ? setAndroidForm : setIosForm;
    setter((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep = (step: StepId) => {
    if (step === 'device') {
      if (!activeForm.device_model || !activeForm.miradore_device_id || !activeForm.total_owed) return 'Complete the device model, device ID, and financed amount.';
      if (!Number.isFinite(Number(activeForm.total_owed)) || Number(activeForm.total_owed) <= 0) return 'Total financed amount must be a positive number.';
      if (workflow === 'iOS' && !selectedDeviceId) return 'Select an unassigned Apple device.';
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
    setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const fetchUnassignedDevices = async () => {
    setFetchingDevices(true);
    try {
      const response = await fetch('/api/devices/unassigned', { method: 'GET' });
      const result = await response.json() as UnassignedResponse;

      if (!response.ok || !result.success) throw new Error(result.error ?? 'Unable to fetch unassigned devices.');

      setIosDevices(result.data ?? []);
      setSelectedDeviceId('');
      toast.success(`${result.data?.length ?? 0} unassigned Apple device${result.data?.length === 1 ? '' : 's'} found.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to fetch unassigned devices.');
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
    formData.set('miradore_device_id', form.miradore_device_id);
    formData.set('total_owed', form.total_owed);
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
      } else {
        setIosForm(emptyForm);
        setIosDevices((prev) => prev.filter((device) => device.id !== selectedDeviceId));
        setSelectedDeviceId('');

        if (data.miradoreSync.attempted && !data.miradoreSync.success) {
          toast.warning(`Registered, but Miradore asset sync failed: ${data.miradoreSync.error ?? 'Unknown error'}`);
          return;
        }
      }

      setStepIndex(0);
      toast.success(`${data.customer.device_model} registered to ${data.customer.full_name}.`);
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleIosDeviceSelect = (id: string) => {
    const device = iosDevices.find((item) => item.id === id);
    setSelectedDeviceId(id);
    setIosForm((prev) => ({
      ...prev,
      device_model: device?.model ?? '',
      miradore_device_id: device?.id ?? '',
    }));
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
        <Stepper stepIndex={stepIndex} onStepChange={setStepIndex} />
        <section className="rounded-2xl border border-white/8 bg-[#111827] p-5">
          <form onSubmit={submitActiveWorkflow} className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-blue-400">Step {stepIndex + 1} of {steps.length}</p>
                <h2 className="text-lg font-semibold text-white">{currentStep.label}</h2>
              </div>
              <span className="text-sm text-slate-500">{workflow} onboarding</span>
            </div>

            {currentStep.id === 'device' && (
              <DeviceStep
                workflow={workflow}
                form={activeForm}
                selectedDeviceId={selectedDeviceId}
                selectedIosDevice={selectedIosDevice}
                iosDevices={iosDevices}
                fetchingDevices={fetchingDevices}
                onFetchIosDevices={fetchUnassignedDevices}
                onSelectIosDevice={handleIosDeviceSelect}
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

              {stepIndex < steps.length - 1 ? (
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
                  {lastCustomer.full_name} now owes GHS {Number(lastCustomer.remaining_balance).toLocaleString()} for {lastCustomer.device_model}.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </motion.div>
  );
}

function Stepper({
  stepIndex,
  onStepChange,
}: {
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

function DeviceStep({
  workflow,
  form,
  selectedDeviceId,
  selectedIosDevice,
  iosDevices,
  fetchingDevices,
  onFetchIosDevices,
  onSelectIosDevice,
  onChange,
}: {
  workflow: Workflow;
  form: RegisterForm;
  selectedDeviceId: string;
  selectedIosDevice: UnassignedDevice | null;
  iosDevices: UnassignedDevice[];
  fetchingDevices: boolean;
  onFetchIosDevices: () => void;
  onSelectIosDevice: (id: string) => void;
  onChange: (field: keyof RegisterForm, value: string | File | null) => void;
}) {
  return (
    <div className="space-y-5">
      {workflow === 'Android' && (
        <div className="grid gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 md:grid-cols-[180px_minmax(0,1fr)]">
          <div className="rounded-xl border border-emerald-500/20 bg-white p-3">
            {androidQrImage ? (
              <div
                role="img"
                aria-label="Android Enterprise enrollment QR"
                className="aspect-square w-full bg-contain bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${androidQrImage})` }}
              />
            ) : (
              <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-lg bg-slate-50 text-slate-600">
                <QrCode size={44} />
                <span className="text-center text-xs font-semibold uppercase">QR not configured</span>
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center">
            <h3 className="text-sm font-semibold text-white">Android Enterprise Enrollment</h3>
            <p className="mt-1 text-sm text-slate-400">
              Scan the master QR code on the new Android device, then enter the device serial or IMEI below.
            </p>
            {androidQrPayload && (
              <p className="mt-3 truncate rounded-lg bg-white/5 px-2 py-2 font-mono text-xs text-slate-500">{androidQrPayload}</p>
            )}
          </div>
        </div>
      )}

      {workflow === 'iOS' && (
        <div className="space-y-3 rounded-xl border border-white/8 bg-white/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Apple size={18} className="text-slate-300" />
              <h3 className="text-sm font-semibold text-white">Apple Inventory</h3>
            </div>
            <button
              type="button"
              onClick={onFetchIosDevices}
              disabled={fetchingDevices}
              className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition-all hover:bg-white/10 disabled:opacity-60"
            >
              {fetchingDevices ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Fetch
            </button>
          </div>

          <select
            id="ios-device"
            value={selectedDeviceId}
            onChange={(event) => onSelectIosDevice(event.target.value)}
            disabled={fetchingDevices}
            className="w-full rounded-xl border border-white/10 bg-[#0D1526] px-3 py-3 text-sm text-white outline-none transition-all focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60"
          >
            <option value="">Select discovered hardware</option>
            {iosDevices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.serial} - {device.model}
              </option>
            ))}
          </select>

          {selectedIosDevice ? (
            <div className="rounded-xl border border-white/8 bg-white/5 p-3">
              <p className="text-sm font-semibold text-white">{selectedIosDevice.model}</p>
              <p className="mt-1 text-xs text-slate-500">Serial: {selectedIosDevice.serial}</p>
              <p className="mt-1 text-xs text-slate-500">Miradore ID: {selectedIosDevice.id}</p>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>No Apple device selected.</span>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input id={`${workflow}-model`} label="Device Model" value={form.device_model} onChange={(value) => onChange('device_model', value)} disabled={workflow === 'iOS' && Boolean(selectedIosDevice)} required />
        <Input id={`${workflow}-device-id`} label={workflow === 'Android' ? 'Serial / IMEI Number' : 'Miradore Device ID'} value={form.miradore_device_id} onChange={(value) => onChange('miradore_device_id', value)} disabled={workflow === 'iOS' && Boolean(selectedIosDevice)} required />
        <Input id={`${workflow}-total`} label="Total Financed Amount" type="number" min="1" step="1" value={form.total_owed} onChange={(value) => onChange('total_owed', value)} required />
      </div>
    </div>
  );
}

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
        <option value="">Select one</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
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
