'use client';

import React from 'react';
import styles from './ui.module.css';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  label?: string;
  className?: string;
}

export function Divider({ orientation = 'horizontal', label, className = '' }: DividerProps) {
  if (orientation === 'vertical') {
    return <div className={`${styles.dividerV} ${className}`} role="separator" aria-orientation="vertical" />;
  }

  return (
    <div className={`${styles.dividerH} ${className}`} role="separator" aria-orientation="horizontal">
      {label && <span className={styles.dividerText}>{label}</span>}
    </div>
  );
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  backAction?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  action,
  backAction,
  className = '',
}: PageHeaderProps) {
  return (
    <header className={`${styles.pageHeader} ${className}`}>
      {backAction && <div style={{ marginBottom: 'var(--space-1)' }}>{backAction}</div>}
      <div className={styles.pageHeaderTop}>
        <div>
          <h1 className={styles.pageHeaderTitle}>{title}</h1>
          {description && <p className={styles.pageHeaderDescription}>{description}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
    </header>
  );
}

export interface VisuallyHiddenProps {
  children: React.ReactNode;
  as?: React.ElementType;
}

export function VisuallyHidden({ children, as: Component = 'span' }: VisuallyHiddenProps) {
  return <Component className={styles.visuallyHidden}>{children}</Component>;
}
