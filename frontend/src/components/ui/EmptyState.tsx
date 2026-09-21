'use client';

import React from 'react';
import styles from './ui.module.css';

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`${styles.emptyState} ${className}`}>
      {icon ? (
        <div className={styles.emptyStateIcon}>{icon}</div>
      ) : (
        <svg
          className={styles.emptyStateIcon}
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Nature leaf + paper roll illustration */}
          <circle cx="40" cy="40" r="36" fill="var(--surface-sunken)" />
          <path
            d="M26 52C26 38 38 26 54 26C54 42 42 54 26 52Z"
            fill="var(--brand-secondary)"
          />
          <path
            d="M32 48C36 40 44 32 50 28"
            stroke="var(--brand-primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="52" cy="50" r="10" fill="var(--accent-fill)" fillOpacity="0.2" />
          <path
            d="M50 46L56 50L50 54V46Z"
            fill="var(--brand-primary)"
          />
        </svg>
      )}

      <h3 className={styles.emptyStateTitle}>{title}</h3>
      {description && <p className={styles.emptyStateDescription}>{description}</p>}
      {action && <div style={{ marginTop: 'var(--space-2)' }}>{action}</div>}
    </div>
  );
}
