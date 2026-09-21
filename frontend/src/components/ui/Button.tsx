'use client';

import React from 'react';
import styles from './ui.module.css';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
}

export function Spinner({ size = 'md', className = '', style }: SpinnerProps) {
  const sizeClass = size === 'sm' ? styles.spinnerSm : size === 'lg' ? styles.spinnerLg : styles.spinnerMd;
  return <span className={`${styles.spinner} ${sizeClass} ${className}`} style={style} role="status" aria-label="Loading" />;
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const variantClass =
      variant === 'secondary'
        ? styles.btnSecondary
        : variant === 'ghost'
        ? styles.btnGhost
        : variant === 'danger'
        ? styles.btnDanger
        : styles.btnPrimary;

    const sizeClass = size === 'sm' ? styles.btnSm : size === 'lg' ? styles.btnLg : styles.btnMd;

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        className={`${styles.btn} ${variantClass} ${sizeClass} ${className}`}
        {...props}
      >
        {loading && <Spinner size={size === 'lg' ? 'md' : 'sm'} />}
        {!loading && leftIcon}
        <span>{children}</span>
        {!loading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
