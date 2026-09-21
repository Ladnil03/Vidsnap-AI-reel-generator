'use client';

import React from 'react';
import styles from './ui.module.css';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'raised' | 'sunken';
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', interactive = false, className = '', children, ...props }, ref) => {
    const variantClass =
      variant === 'raised' ? styles.cardRaised : variant === 'sunken' ? styles.cardSunken : '';
    const interactiveClass = interactive ? styles.cardInteractive : '';

    return (
      <div
        ref={ref}
        className={`${styles.card} ${variantClass} ${interactiveClass} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'sage' | 'moss' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

export function Badge({
  variant = 'default',
  size = 'md',
  icon,
  children,
  className = '',
  ...props
}: BadgeProps) {
  const variantClass =
    variant === 'primary'
      ? styles.badgePrimary
      : variant === 'sage'
      ? styles.badgeSage
      : variant === 'moss'
      ? styles.badgeMoss
      : variant === 'success'
      ? styles.badgeSuccess
      : variant === 'warning'
      ? styles.badgeWarning
      : variant === 'danger'
      ? styles.badgeDanger
      : styles.badgeDefault;

  return (
    <span className={`${styles.badge} ${variantClass} ${className}`} {...props}>
      {icon}
      <span>{children}</span>
    </span>
  );
}
