'use client';

import React from 'react';
import styles from './ui.module.css';

export interface FormFieldProps {
  id?: string;
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  id,
  label,
  hint,
  error,
  required,
  children,
  className = '',
}: FormFieldProps) {
  const hintId = id && hint ? `${id}-hint` : undefined;
  const errorId = id && error ? `${id}-error` : undefined;

  return (
    <div className={`${styles.formField} ${className}`}>
      {label && (
        <label htmlFor={id} className={styles.formLabel}>
          <span>{label}</span>
          {required && <span className={styles.formRequired} aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <p id={hintId} className={styles.formHint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.formError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
