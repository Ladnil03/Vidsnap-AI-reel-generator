'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import styles from './ui.module.css';
import { IconButton } from './IconButton';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  variant?: 'modal' | 'sheet';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  variant = 'modal',
  size = 'md',
  className = '',
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Save active element to restore upon close
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus first focusable item in dialog
    const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements && focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Tab' && dialogRef.current) {
        // Focus trap
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousActiveElement.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const contentClass = variant === 'sheet' ? styles.sheetContent : styles.modalContent;
  const sizeStyle: React.CSSProperties =
    variant === 'sheet'
      ? {}
      : size === 'sm'
      ? { maxWidth: '420px' }
      : size === 'lg'
      ? { maxWidth: '720px' }
      : { maxWidth: '520px' };

  return (
    <div className={styles.modalBackdrop} onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
        className={`${contentClass} ${className}`}
        style={sizeStyle}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <div className={styles.modalClose}>
          <IconButton
            icon={<X size={18} />}
            aria-label="Close dialog"
            onClick={onClose}
            size="sm"
          />
        </div>

        {title && (
          <h3 id="modal-title" style={{ marginBottom: 'var(--space-1)', paddingRight: 'var(--space-8)' }}>
            {title}
          </h3>
        )}

        {description && (
          <p id="modal-description" className={styles.formHint} style={{ marginBottom: 'var(--space-4)' }}>
            {description}
          </p>
        )}

        {children}
      </div>
    </div>
  );
}

export function Sheet(props: Omit<ModalProps, 'variant'>) {
  return <Modal {...props} variant="sheet" />;
}
