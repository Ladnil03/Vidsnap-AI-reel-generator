'use client';

import React from 'react';
import styles from './ui.module.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ error, leftIcon, rightIcon, className = '', style, ...props }, ref) => {
    if (leftIcon || rightIcon) {
      return (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%', ...style }}>
          {leftIcon && (
            <span
              style={{
                position: 'absolute',
                left: 'var(--space-3)',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
                color: 'var(--text-muted)',
                zIndex: 1,
              }}
            >
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            aria-invalid={error ? 'true' : undefined}
            className={`${styles.input} ${error ? styles.inputError : ''} ${className}`}
            style={{
              paddingLeft: leftIcon ? 'calc(var(--space-3) + 24px)' : undefined,
              paddingRight: rightIcon ? 'calc(var(--space-3) + 24px)' : undefined,
            }}
            {...props}
          />
          {rightIcon && (
            <span
              style={{
                position: 'absolute',
                right: 'var(--space-3)',
                display: 'flex',
                alignItems: 'center',
                color: 'var(--text-muted)',
                zIndex: 1,
              }}
            >
              {rightIcon}
            </span>
          )}
        </div>
      );
    }

    return (
      <input
        ref={ref}
        aria-invalid={error ? 'true' : undefined}
        className={`${styles.input} ${error ? styles.inputError : ''} ${className}`}
        style={style}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className = '', ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        aria-invalid={error ? 'true' : undefined}
        className={`${styles.textarea} ${error ? styles.inputError : ''} ${className}`}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  options?: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ error, options, children, className = '', ...props }, ref) => {
    return (
      <select
        ref={ref}
        aria-invalid={error ? 'true' : undefined}
        className={`${styles.select} ${error ? styles.inputError : ''} ${className}`}
        {...props}
      >
        {options
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
    );
  }
);
Select.displayName = 'Select';
