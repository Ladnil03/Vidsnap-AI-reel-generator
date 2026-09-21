'use client';

import React from 'react';
import Link from 'next/link';

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const iconSize = size === 'sm' ? 28 : size === 'lg' ? 42 : 34;

  return (
    <Link
      href="/"
      aria-label="VidSnap.AI Home"
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        textDecoration: 'none',
        color: 'var(--text-primary)',
        fontWeight: 800,
        letterSpacing: '-0.02em',
      }}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        {/* Rounded organic container */}
        <rect
          width="40"
          height="40"
          rx="12"
          fill="var(--brand-primary)"
        />
        {/* Stylized leaf + play vector */}
        <path
          d="M14 26C14 18 20 12 28 12C28 20 22 26 14 26Z"
          fill="var(--raw-sage)"
        />
        {/* Play triangle inside leaf */}
        <path
          d="M19 16.5L25 20L19 23.5V16.5Z"
          fill="var(--forest-900)"
        />
      </svg>

      {showText && (
        <span
          style={{
            fontFamily: 'var(--font-family-display)',
            fontSize: size === 'sm' ? '1.1rem' : size === 'lg' ? '1.5rem' : '1.25rem',
            lineHeight: 1,
          }}
        >
          VidSnap<span style={{ color: 'var(--moss-500)' }}>.AI</span>
        </span>
      )}
    </Link>
  );
}
