'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
  email: string;
  domain: string;
  onSuccess: () => void;
  onBack: () => void;
  onClose: () => void;
}

export default function VerificationModal({ email, domain, onSuccess, onBack, onClose }: Props) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  function handleChange(index: number, value: string) {
    // Allow paste of 6-digit code
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

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = digits.join('');
    if (code.length !== 6) return;

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, domain }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message ?? 'Verification failed');
        setDigits(Array(6).fill(''));
        inputs.current[0]?.focus();
      } else {
        onSuccess();
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const code = digits.join('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h2>
        <p className="text-gray-500 text-sm mb-1">
          We sent a 6-digit code to
        </p>
        <p className="text-blue-600 font-semibold text-sm mb-6 break-all">{email}</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex gap-2 justify-center">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-300 rounded-lg
                  focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            ))}
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300
              text-white font-semibold py-3 rounded-lg transition-colors text-sm"
          >
            {loading ? 'Verifying…' : 'Verify Code'}
          </button>

          <button
            type="button"
            onClick={onBack}
            className="w-full text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Resend code / use a different email
          </button>
        </form>

        <p className="text-xs text-gray-400 mt-4 text-center">
          Code expires in 30 minutes
        </p>
      </div>
    </div>
  );
}
