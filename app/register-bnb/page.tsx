'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import Toast, { ToastType } from '@/components/Toast';

type Domain = 'discountbnbclub.com' | 'homestayclub.ca';
type Step = 'details' | 'verify' | 'done';

function getClientDomain(): Domain {
  const forced = process.env.NEXT_PUBLIC_FORCE_DOMAIN as Domain | undefined;
  if (forced === 'homestayclub.ca' || forced === 'discountbnbclub.com') return forced;

  if (typeof window === 'undefined') return 'discountbnbclub.com';
  return window.location.hostname.includes('homestayclub.ca')
    ? 'homestayclub.ca'
    : 'discountbnbclub.com';
}

interface FormState {
  ownerName: string;
  bnbName: string;
  address: string;
  email: string;
}

interface FormErrors {
  ownerName?: string;
  bnbName?: string;
  address?: string;
  email?: string;
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (form.ownerName.trim().length < 2) errors.ownerName = 'Name must be at least 2 characters.';
  if (form.bnbName.trim().length < 2) errors.bnbName = 'BNB name must be at least 2 characters.';
  if (form.address.trim().length < 5) errors.address = 'Please enter a full address.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid email address.';
  return errors;
}

export default function RegisterBnbPage() {
  const [domain, setDomain] = useState<Domain>('discountbnbclub.com');
  const [step, setStep] = useState<Step>('details');
  const [form, setForm] = useState<FormState>({ ownerName: '', bnbName: '', address: '', email: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => { setDomain(getClientDomain()); }, []);
  useEffect(() => { if (step === 'verify') inputs.current[0]?.focus(); }, [step]);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleDetailsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError('');
    const fieldErrors = validate(form);
    if (Object.keys(fieldErrors).length > 0) { setErrors(fieldErrors); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/bnb/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, domain }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setServerError(data.message ?? 'Something went wrong');
      } else {
        setStep('verify');
      }
    } catch {
      setServerError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleCodeChange(index: number, value: string) {
    if (value.length > 1) {
      const stripped = value.replace(/\D/g, '').slice(0, 6);
      if (stripped.length === 6) {
        setDigits(stripped.split(''));
        inputs.current[5]?.focus();
        return;
      }
    }
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (digit && index < 5) inputs.current[index + 1]?.focus();
  }

  function handleCodeKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  async function handleVerifySubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = digits.join('');
    if (code.length !== 6) return;

    setServerError('');
    setLoading(true);
    try {
      const res = await fetch('/api/bnb/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.trim(), code, domain }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setServerError(data.message ?? 'Verification failed');
        setDigits(Array(6).fill(''));
        inputs.current[0]?.focus();
      } else {
        setStep('done');
        setToast({ message: 'Email verified! Your listing is pending review.', type: 'success' });
      }
    } catch {
      setServerError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const code = digits.join('');

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-12">
      <Link href="/" className="mb-10">
        <Logo domain={domain} size="md" />
      </Link>

      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">
        {step === 'details' && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">List Your BNB</h1>
            <p className="text-gray-500 text-sm mb-6">
              Register your property so we can confirm bookings with your guests directly.
            </p>

            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              <Field label="Your Name *" error={errors.ownerName}>
                <input type="text" value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)}
                  placeholder="Todd Ogryzlo" autoFocus className={`input ${errors.ownerName ? 'border-red-400' : ''}`} />
              </Field>

              <Field label="BNB Name *" error={errors.bnbName}>
                <input type="text" value={form.bnbName} onChange={(e) => set('bnbName', e.target.value)}
                  placeholder="Westcoast Guesthouse" className={`input ${errors.bnbName ? 'border-red-400' : ''}`} />
              </Field>

              <Field label="Address *" error={errors.address}>
                <input type="text" value={form.address} onChange={(e) => set('address', e.target.value)}
                  placeholder="7116 Grant Road W, Sooke, BC" className={`input ${errors.address ? 'border-red-400' : ''}`} />
              </Field>

              <Field label="Email address *" error={errors.email}>
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                  placeholder="you@example.com" className={`input ${errors.email ? 'border-red-400' : ''}`} />
              </Field>

              {serverError && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {serverError}
                </p>
              )}

              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300
                  text-white font-semibold py-3 rounded-lg transition-colors text-sm">
                {loading ? 'Sending code…' : 'Send Verification Code'}
              </button>
            </form>
          </>
        )}

        {step === 'verify' && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h1>
            <p className="text-gray-500 text-sm mb-1">We sent a 6-digit code to</p>
            <p className="text-blue-600 font-semibold text-sm mb-6 break-all">{form.email}</p>

            <form onSubmit={handleVerifySubmit} className="space-y-5">
              <div className="flex gap-2 justify-center">
                {digits.map((d, i) => (
                  <input key={i} ref={(el) => { inputs.current[i] = el; }}
                    type="text" inputMode="numeric" maxLength={6} value={d}
                    onChange={(e) => handleCodeChange(i, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(i, e)}
                    className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-300 rounded-lg
                      focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
                ))}
              </div>

              {serverError && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">
                  {serverError}
                </p>
              )}

              <button type="submit" disabled={loading || code.length !== 6}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300
                  text-white font-semibold py-3 rounded-lg transition-colors text-sm">
                {loading ? 'Verifying…' : 'Verify Code'}
              </button>

              <button type="button" onClick={() => { setStep('details'); setDigits(Array(6).fill('')); setServerError(''); }}
                className="w-full text-sm text-gray-500 hover:text-gray-700 underline">
                Use a different email
              </button>
            </form>

            <p className="text-xs text-gray-400 mt-4 text-center">Code expires in 30 minutes</p>
          </>
        )}

        {step === 'done' && (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center
              justify-center text-2xl mx-auto mb-4">✓</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Thanks, {form.ownerName}!</h1>
            <p className="text-gray-500 text-sm">
              Your email is verified and <strong>{form.bnbName}</strong> is now pending review.
              We&apos;ll be in touch once it&apos;s approved.
            </p>
            <Link href="/" className="inline-block mt-6 text-sm text-blue-600 hover:underline">
              Back to home
            </Link>
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </main>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
