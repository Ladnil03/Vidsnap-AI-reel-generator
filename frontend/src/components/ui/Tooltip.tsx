'use client';

import React, { useState } from 'react';
import styles from './ui.module.css';

export interface TooltipProps {
  content: string;
  children: React.ReactElement;
  className?: string;
}

export function Tooltip({ content, children, className = '' }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className={`${styles.tooltipWrapper} ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div role="tooltip" className={styles.tooltipBubble}>
          {content}
        </div>
      )}
    </div>
  );
}

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  variant?: 'text' | 'rect' | 'circle';
}

export function Skeleton({
  width = '100%',
  height = '20px',
  borderRadius,
  variant = 'rect',
  className = '',
}: SkeletonProps) {
  const resolvedRadius =
    borderRadius !== undefined
      ? borderRadius
      : variant === 'circle'
      ? 'var(--radius-pill)'
      : variant === 'text'
      ? 'var(--radius-xs)'
      : 'var(--radius-md)';

  return (
    <div
      className={`${styles.skeleton} ${className}`}
      style={{
        width,
        height: variant === 'circle' && typeof width === 'number' ? width : height,
        borderRadius: resolvedRadius,
      }}
      aria-hidden="true"
    />
  );
}
