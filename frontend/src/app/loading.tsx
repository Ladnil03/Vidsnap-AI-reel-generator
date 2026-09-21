'use client';

import React from 'react';
import { Spinner } from '@/components/ui';

export default function RootLoading() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        padding: 'var(--space-8)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-md)',
          marginBottom: 'var(--space-4)',
        }}
      >
        <Spinner size="lg" />
      </div>

      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-lg)',
          fontWeight: 700,
          color: 'var(--color-text)',
          margin: '0 0 var(--space-1) 0',
        }}
      >
        Loading VidSnap.AI
      </h3>
      <p
        style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-muted)',
          margin: 0,
        }}
      >
        Crafting your vertical canvas...
      </p>
    </div>
  );
}
