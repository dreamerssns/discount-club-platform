'use client';

import React from 'react';
import Logo from './Logo';

type Domain = 'discountbnbclub.com' | 'homestayclub.ca';

interface HeaderProps {
  domain?: Domain;
  verifiedEmail?: string;
  onRegister?: () => void;
  onBook?: () => void;
  onLogout?: () => void;
  sessionChecked?: boolean;
}

const DOMAIN_CONFIG: Record<Domain, { gradient: string; subtitle: string }> = {
  'discountbnbclub.com': {
    gradient: 'bg-linear-to-br from-[#0052CC] to-[#003D99]',
    subtitle: 'Exclusive member discounts on short-term rentals and BNB properties.',
  },
  'homestayclub.ca': {
    gradient: 'bg-linear-to-br from-[#059669] to-[#047857]',
    subtitle: 'Connect with welcoming homestay hosts and experience travel like a local.',
  },
};

export const Header: React.FC<HeaderProps> = ({
  domain = 'discountbnbclub.com',
  verifiedEmail,
  onRegister,
  onBook,
  onLogout,
  sessionChecked = true,
}) => {
  const config = DOMAIN_CONFIG[domain] ?? DOMAIN_CONFIG['discountbnbclub.com'];
  const isVerified = !!verifiedEmail;

  return (
    <header className={`${config.gradient} text-white`}>
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Logo domain={domain} size="lg" inverted />
        </div>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-white/80 max-w-xl mx-auto mb-10">
          {config.subtitle}
        </p>

        {/* CTA buttons */}
        {sessionChecked ? (
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {!isVerified ? (
              <button
                onClick={onRegister}
                className="bg-white text-gray-900 font-bold px-8 py-4 rounded-xl shadow-lg
                  hover:bg-gray-100 active:scale-95 transition-all text-base"
              >
                Register to Get Access
              </button>
            ) : (
              <>
                <button
                  onClick={onBook}
                  className="bg-white text-gray-900 font-bold px-8 py-4 rounded-xl shadow-lg
                    hover:bg-gray-100 active:scale-95 transition-all text-base"
                >
                  Book Now
                </button>
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <span>
                    Signed in as{' '}
                    <span className="font-semibold text-white">{verifiedEmail}</span>
                  </span>
                  <span>·</span>
                  <button
                    onClick={onLogout}
                    className="underline hover:text-white transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="h-14 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
