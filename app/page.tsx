'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import RegisterModal from '@/components/RegisterModal';
import VerificationModal from '@/components/VerificationModal';
import BookingForm from '@/components/BookingForm';
import Toast, { ToastType } from '@/components/Toast';

type Domain = 'discountbnbclub.com' | 'homestayclub.ca';
type Step = 'idle' | 'register' | 'verify' | 'book';

interface ToastState {
  message: string;
  type: ToastType;
}

const STEP_DOTS: Record<Domain, string> = {
  'discountbnbclub.com': 'bg-[#0052CC]',
  'homestayclub.ca':     'bg-[#059669]',
};

function getClientDomain(): Domain {
  // Dev override: set NEXT_PUBLIC_FORCE_DOMAIN=homestayclub.ca in .env.local
  const forced = process.env.NEXT_PUBLIC_FORCE_DOMAIN as Domain | undefined;
  if (forced === 'homestayclub.ca' || forced === 'discountbnbclub.com') return forced;

  if (typeof window === 'undefined') return 'discountbnbclub.com';
  return window.location.hostname.includes('homestayclub.ca')
    ? 'homestayclub.ca'
    : 'discountbnbclub.com';
}

export default function Home() {
  const [domain, setDomain] = useState<Domain>('discountbnbclub.com');
  const [step, setStep] = useState<Step>('idle');
  const [pendingEmail, setPendingEmail] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    const d = getClientDomain();
    setDomain(d);

    fetch(`/api/session?domain=${encodeURIComponent(d)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.verified && data.email) setVerifiedEmail(data.email);
      })
      .catch(() => {})
      .finally(() => setSessionChecked(true));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  }, []);

  function handleRegisterSuccess(email: string) {
    setPendingEmail(email);
    setStep('verify');
  }

  function handleVerifySuccess() {
    setVerifiedEmail(pendingEmail);
    setStep('idle');
    showToast('Email verified! You can now book.', 'success');
  }

  function handleBookSuccess() {
    setStep('idle');
    showToast('Your submission has been sent!', 'success');
  }

  function handleLogout() {
    fetch('/api/session', { method: 'DELETE' })
      .then(() => {
        setVerifiedEmail('');
        showToast('Signed out.', 'info');
      })
      .catch(() => {});
  }

  const isVerified = !!verifiedEmail;

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header — logo + gradient hero + CTA buttons */}
      <Header
        domain={domain}
        verifiedEmail={verifiedEmail}
        sessionChecked={sessionChecked}
        onRegister={() => setStep('register')}
        onBook={() => setStep('book')}
        onLogout={handleLogout}
      />

      {/* How it works */}
      <div className="max-w-4xl mx-auto px-6 py-16 w-full">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">How It Works</h2>
        <div className="grid sm:grid-cols-3 gap-8">
          {[
            { n: '1', title: 'Register', desc: 'Enter your email to receive a one-time verification code.' },
            { n: '2', title: 'Verify',   desc: 'Enter the 6-digit code we emailed you to confirm your address.' },
            { n: '3', title: 'Book',     desc: "Submit your booking request. We'll confirm with you directly." },
          ].map(({ n, title, desc }) => (
            <div key={n} className="flex flex-col items-center text-center">
              <div
                className={`w-12 h-12 rounded-full ${STEP_DOTS[domain]} text-white font-bold text-lg
                  flex items-center justify-center mb-4 shadow`}
              >
                {n}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-gray-500 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-200 py-6 text-center text-sm text-gray-400">
        {domain} &copy; {new Date().getFullYear()}
      </footer>

      {/* Modals */}
      {step === 'register' && (
        <RegisterModal
          domain={domain}
          onSuccess={handleRegisterSuccess}
          onClose={() => setStep('idle')}
        />
      )}
      {step === 'verify' && (
        <VerificationModal
          email={pendingEmail}
          domain={domain}
          onSuccess={handleVerifySuccess}
          onBack={() => setStep('register')}
          onClose={() => setStep('idle')}
        />
      )}
      {step === 'book' && isVerified && (
        <BookingForm
          email={verifiedEmail}
          domain={domain}
          onSuccess={handleBookSuccess}
          onClose={() => setStep('idle')}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </main>
  );
}
