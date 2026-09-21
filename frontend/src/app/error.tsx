'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Card, Button } from '@/components/ui';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled app runtime error:', error);
  }, [error]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        padding: 'var(--space-8) var(--space-4)',
      }}
    >
      <Card
        variant="raised"
        style={{
          maxWidth: '480px',
          width: '100%',
          padding: 'var(--space-8)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-terracotta-100)',
            color: 'var(--color-terracotta-700)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--space-4) auto',
          }}
        >
          <AlertTriangle size={28} />
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-2xl)',
            fontWeight: 800,
            color: 'var(--color-text)',
            margin: '0 0 var(--space-2) 0',
          }}
        >
          Something Went Astray
        </h1>

        <p
          style={{
            color: 'var(--color-text-muted)',
            fontSize: 'var(--text-sm)',
            lineHeight: 1.6,
            margin: '0 0 var(--space-6) 0',
          }}
        >
          An unexpected interruption occurred while rendering this page. Our team has been notified.
        </p>

        {error.message && (
          <div
            style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-surface-hover)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)',
              marginBottom: 'var(--space-6)',
              wordBreak: 'break-word',
              textAlign: 'left',
            }}
          >
            {error.message}
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
          <Button
            variant="primary"
            onClick={() => reset()}
            leftIcon={<RefreshCw size={14} />}
          >
            Try Again
          </Button>

          <Link href="/">
            <Button
              variant="secondary"
              leftIcon={<Home size={14} />}
            >
              Back to Home
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
