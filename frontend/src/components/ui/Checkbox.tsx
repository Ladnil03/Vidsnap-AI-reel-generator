'use client';

import React from 'react';
import styles from './ui.module.css';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? `cb-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
    return (
      <label htmlFor={inputId} className={`${styles.checkboxLabel} ${className}`}>
        <input
          ref={ref}
          type="checkbox"
          id={inputId}
          className={styles.checkbox}
          {...props}
        />
        {label && <span>{label}</span>}
      </label>
    );
  }
);
Checkbox.displayName = 'Checkbox';

export interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, className = '', id, checked, ...props }, ref) => {
    const inputId = id || (label ? `sw-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
    return (
      <label htmlFor={inputId} className={`${styles.switchLabel} ${className}`}>
        <div className={styles.switchContainer}>
          <input
            ref={ref}
            type="checkbox"
            role="switch"
            aria-checked={checked}
            id={inputId}
            checked={checked}
            className={styles.switchInput}
            {...props}
          />
          <div className={styles.switchTrack}>
            <div className={styles.switchThumb} />
          </div>
        </div>
        {label && <span>{label}</span>}
      </label>
    );
  }
);
Switch.displayName = 'Switch';

export interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ label, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? `radio-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
    return (
      <label htmlFor={inputId} className={`${styles.radioLabel} ${className}`}>
        <input
          ref={ref}
          type="radio"
          id={inputId}
          className={styles.radio}
          {...props}
        />
        {label && <span>{label}</span>}
      </label>
    );
  }
);
Radio.displayName = 'Radio';
