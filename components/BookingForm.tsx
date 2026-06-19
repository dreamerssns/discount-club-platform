'use client';

import { useState } from 'react';

interface Props {
  email: string;
  domain: string;
  onSuccess: () => void;
  onClose: () => void;
}

interface FormState {
  name: string;
  phoneNumber: string;
  bnbName: string;
  checkInDate: string;
  checkOutDate: string;
  vehicle: string;
  priceExpectation: string;
  priceType: 'nightly' | 'total';
  comments: string;
}

interface FormErrors {
  name?: string;
  phoneNumber?: string;
  bnbName?: string;
  checkInDate?: string;
  checkOutDate?: string;
  priceExpectation?: string;
  comments?: string;
}

const SUBMIT_BTN: Record<string, string> = {
  'discountbnbclub.com': 'bg-[#0052CC] hover:bg-[#003D99] disabled:opacity-50',
  'homestayclub.ca':     'bg-[#059669] hover:bg-[#047857] disabled:opacity-50',
};

function digitsOnly(val: string) {
  return val.replace(/\D/g, '');
}

function toIso(dateInput: string) {
  // date inputs return yyyy-mm-dd; convert to Date for comparison
  return new Date(dateInput + 'T00:00:00');
}

function validate(form: FormState, email: string): FormErrors {
  const errors: FormErrors = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (form.name.trim().length < 2) errors.name = 'Name must be at least 2 characters.';
  if (digitsOnly(form.phoneNumber).length < 10) errors.phoneNumber = 'Phone must have at least 10 digits.';
  if (form.bnbName.trim().length < 2) errors.bnbName = 'BNB name must be at least 2 characters.';
  if (!form.priceExpectation.trim()) errors.priceExpectation = 'Price expectation is required.';

  if (!form.checkInDate) {
    errors.checkInDate = 'Check-in date is required.';
  } else if (toIso(form.checkInDate) < today) {
    errors.checkInDate = 'Check-in date cannot be in the past.';
  }

  if (!form.checkOutDate) {
    errors.checkOutDate = 'Check-out date is required.';
  } else if (form.checkInDate && toIso(form.checkOutDate) <= toIso(form.checkInDate)) {
    errors.checkOutDate = 'Check-out must be after check-in.';
  }

  if (form.comments.length > 500) errors.comments = 'Comments cannot exceed 500 characters.';

  return errors;
}

export default function BookingForm({ email, domain, onSuccess, onClose }: Props) {
  const [form, setForm] = useState<FormState>({
    name: '',
    phoneNumber: '',
    bnbName: '',
    checkInDate: '',
    checkOutDate: '',
    vehicle: '',
    priceExpectation: '',
    priceType: 'nightly',
    comments: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear field error on change
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError('');

    const fieldErrors = validate(form, email);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, domain, ...form }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setServerError(data.message ?? 'Submission failed. Please try again.');
      } else {
        onSuccess();
      }
    } catch {
      setServerError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const submitClass = SUBMIT_BTN[domain] ?? SUBMIT_BTN['discountbnbclub.com'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative max-h-[90vh] flex flex-col">
        {/* Fixed header */}
        <div className="px-8 pt-8 pb-4 border-b border-gray-100">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
          >
            ✕
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Book Now</h2>
          <p className="text-gray-500 text-sm mt-2 leading-relaxed">
            Fill out this form and we will contact and request your place in the BnB.
            Please pay the BnB directly — they will message you back.
          </p>
        </div>

        {/* Scrollable form body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-8 py-6 space-y-5">
          {/* Email (read-only) */}
          <Field label="Email">
            <input
              type="email"
              value={email}
              readOnly
              className="input bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </Field>

          {/* Name */}
          <Field label="Full Name *" error={errors.name}>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Jane Smith"
              className={`input ${errors.name ? 'border-red-400' : ''}`}
            />
          </Field>

          {/* Phone */}
          <Field label="Phone Number *" error={errors.phoneNumber}>
            <input
              type="tel"
              value={form.phoneNumber}
              onChange={(e) => set('phoneNumber', e.target.value)}
              placeholder="+1 (555) 000-0000"
              className={`input ${errors.phoneNumber ? 'border-red-400' : ''}`}
            />
          </Field>

          {/* BNB Name */}
          <Field label="BNB Name *" error={errors.bnbName}>
            <input
              type="text"
              value={form.bnbName}
              onChange={(e) => set('bnbName', e.target.value)}
              placeholder="Beachfront Villa"
              className={`input ${errors.bnbName ? 'border-red-400' : ''}`}
            />
          </Field>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Check-in *" error={errors.checkInDate}>
              <input
                type="date"
                value={form.checkInDate}
                onChange={(e) => set('checkInDate', e.target.value)}
                className={`input ${errors.checkInDate ? 'border-red-400' : ''}`}
              />
            </Field>
            <Field label="Check-out *" error={errors.checkOutDate}>
              <input
                type="date"
                value={form.checkOutDate}
                onChange={(e) => set('checkOutDate', e.target.value)}
                className={`input ${errors.checkOutDate ? 'border-red-400' : ''}`}
              />
            </Field>
          </div>

          {/* Vehicle (optional) */}
          <Field label="Vehicle (optional)">
            <input
              type="text"
              value={form.vehicle}
              onChange={(e) => set('vehicle', e.target.value)}
              placeholder="Blue Honda Civic"
              className="input"
            />
          </Field>

          {/* Price Expectation (required) */}
          <Field label="Price Expectation *" error={errors.priceExpectation}>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.priceExpectation}
                onChange={(e) => set('priceExpectation', e.target.value)}
                placeholder="$100"
                className={`input flex-1 ${errors.priceExpectation ? 'border-red-400' : ''}`}
              />
              <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm font-medium shrink-0">
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, priceType: 'nightly' }))}
                  className={`px-3 py-2 transition-colors ${
                    form.priceType === 'nightly'
                      ? 'bg-gray-800 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  /night
                </button>
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, priceType: 'total' }))}
                  className={`px-3 py-2 border-l border-gray-300 transition-colors ${
                    form.priceType === 'total'
                      ? 'bg-gray-800 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  total
                </button>
              </div>
            </div>
          </Field>

          {/* Comments (optional, 500 char limit) */}
          <Field label="Comments (optional)" error={errors.comments}>
            <div className="relative">
              <textarea
                value={form.comments}
                onChange={(e) => set('comments', e.target.value)}
                placeholder="Any special requests or questions…"
                rows={3}
                maxLength={500}
                className={`input resize-none pb-6 ${errors.comments ? 'border-red-400' : ''}`}
              />
              <span className={`absolute bottom-2 right-3 text-xs ${
                form.comments.length > 450 ? 'text-orange-500' : 'text-gray-400'
              }`}>
                {form.comments.length}/500
              </span>
            </div>
          </Field>

          {serverError && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {serverError}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1 pb-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3
                rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 ${submitClass} text-white font-semibold py-3
                rounded-lg transition-colors text-sm`}
            >
              {loading ? 'Submitting…' : 'Submit Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Small helper to reduce repetition
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
