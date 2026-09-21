'use client';

import React, { useState } from 'react';
import styles from './ui.module.css';

export interface AvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg';
  level?: number;
  showRing?: boolean;
  className?: string;
}

export function Avatar({
  src,
  alt = 'Avatar',
  fallback,
  size = 'md',
  level,
  showRing = false,
  className = '',
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);

  const sizeClass =
    size === 'sm' ? styles.avatarSm : size === 'lg' ? styles.avatarLg : styles.avatarMd;

  const initials = fallback
    ? fallback.slice(0, 2).toUpperCase()
    : alt
    ? alt.slice(0, 2).toUpperCase()
    : 'VS';

  return (
    <div className={`${styles.avatarWrapper} ${className}`}>
      {(showRing || level !== undefined) && <div className={styles.avatarRing} />}
      <div className={`${styles.avatar} ${sizeClass}`} aria-label={alt}>
        {src && !imageError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            onError={() => setImageError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      {level !== undefined && (
        <span className={styles.avatarLevelBadge} title={`Level ${level}`}>
          {level}
        </span>
      )}
    </div>
  );
}
