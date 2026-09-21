'use client';

import React from 'react';
import styles from './ui.module.css';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string;
  icon: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'secondary' | 'primary' | 'danger';
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, 'aria-label': ariaLabel, size = 'md', variant = 'ghost', className = '', ...props }, ref) => {
    const variantClass =
      variant === 'secondary'
        ? styles.btnSecondary
        : variant === 'primary'
        ? styles.btnPrimary
        : variant === 'danger'
        ? styles.btnDanger
        : '';

    return (
      <button
        ref={ref}
        type="button"
        aria-label={ariaLabel}
        className={`${styles.iconBtn} ${variantClass} ${className}`}
        {...props}
      >
        {icon}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
