'use client';

import React from 'react';

const THEMES = {
  'discountbnbclub.com': { start: '#0052CC', end: '#003D99', label: 'Discount BNB Club' },
  'homestayclub.ca':     { start: '#059669', end: '#047857', label: 'Homestay Club' },
} as const;

type Domain = keyof typeof THEMES;

interface LogoProps {
  domain?: Domain;
  size?: 'sm' | 'md' | 'lg';
  /** Render white icon + text — use on colored/dark backgrounds */
  inverted?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: { width: 140, height: 35 },
  md: { width: 200, height: 50 },
  lg: { width: 280, height: 70 },
};

export const Logo: React.FC<LogoProps> = ({
  domain = 'discountbnbclub.com',
  size = 'md',
  inverted = false,
  className = '',
}) => {
  const { width, height } = SIZE_MAP[size];
  const theme = THEMES[domain] ?? THEMES['discountbnbclub.com'];

  // When inverted (on dark bg): solid white fill — no gradient needed, avoids url() resolution bugs
  const houseFill = inverted ? '#ffffff' : theme.start;
  const textFill  = inverted ? '#ffffff' : theme.start;
  // Checkmark stroke: use the brand color so it contrasts with the white badge circle
  const checkStroke = inverted ? theme.start : theme.start;
  // Unique gradient ID — only used in non-inverted mode
  const gradId = `logoGrad-${domain.replace(/[^a-z]/gi, '')}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 240 60"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={theme.label}
      role="img"
    >
      {!inverted && (
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   style={{ stopColor: theme.start, stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: theme.end,   stopOpacity: 1 }} />
          </linearGradient>
        </defs>
      )}

      {/* House icon — translate(20,20) keeps all paths inside viewBox "0 0 240 60" */}
      <g transform="translate(20, 20)">
        {/* Roof */}
        <path
          d="M -16 0 L 0 -18 L 16 0 Z"
          fill={inverted ? houseFill : `url(#${gradId})`}
          stroke="none"
        />
        {/* Body */}
        <rect
          x="-16" y="0" width="32" height="18"
          fill={inverted ? houseFill : `url(#${gradId})`}
          stroke="none"
        />
        {/* Door accent */}
        <rect x="-5.5" y="5.5" width="11" height="12.5" fill="white" stroke="none" opacity="0.15" />
        {/* Checkmark badge */}
        <g transform="translate(12, -4)">
          <circle cx="0" cy="0" r="8" fill="white" />
          <path
            d="M -2.5 0 L 1.5 3.5 L 4 -1"
            stroke={checkStroke}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>

      {/* Label */}
      <text
        x="60"
        y="42"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="20"
        fontWeight="500"
        fill={textFill}
        letterSpacing="-0.3"
      >
        {theme.label}
      </text>
    </svg>
  );
};

// Icon-only variant (no text)
export const LogoIcon: React.FC<{
  domain?: Domain;
  size?: number;
  inverted?: boolean;
  className?: string;
}> = ({ domain = 'discountbnbclub.com', size = 40, inverted = false, className = '' }) => {
  const theme = THEMES[domain] ?? THEMES['discountbnbclub.com'];
  const gradId = `logoIconGrad-${domain.replace(/[^a-z]/gi, '')}`;
  const houseFill = inverted ? '#ffffff' : theme.start;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={theme.label}
      role="img"
    >
      {!inverted && (
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   style={{ stopColor: theme.start, stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: theme.end,   stopOpacity: 1 }} />
          </linearGradient>
        </defs>
      )}
      {/* translate(22,20) keeps paths inside viewBox "0 0 44 44" */}
      <g transform="translate(22, 20)">
        <path d="M -16 0 L 0 -18 L 16 0 Z"
          fill={inverted ? houseFill : `url(#${gradId})`} stroke="none" />
        <rect x="-16" y="0" width="32" height="18"
          fill={inverted ? houseFill : `url(#${gradId})`} stroke="none" />
        <rect x="-5.5" y="5.5" width="11" height="12.5" fill="white" stroke="none" opacity="0.15" />
        <g transform="translate(12, -4)">
          <circle cx="0" cy="0" r="8" fill="white" />
          <path
            d="M -2.5 0 L 1.5 3.5 L 4 -1"
            stroke={inverted ? theme.start : theme.start}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>
    </svg>
  );
};

export default Logo;
