import React from 'react';
import Link from 'next/link';
import { Compass, Film, Sparkles, Home, Search } from 'lucide-react';
import { Card, Button } from '@/components/ui';

export default function NotFound() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '75vh',
        padding: 'var(--space-8) var(--space-4)',
      }}
    >
      <Card
        variant="raised"
        style={{
          maxWidth: '520px',
          width: '100%',
          padding: 'var(--space-8)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: 'var(--radius-xl)',
            background: 'var(--color-sage-100)',
            color: 'var(--color-forest-700)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--space-4) auto',
            border: '1px solid var(--color-forest-200)',
          }}
        >
          <Compass size={32} />
        </div>

        <div
          style={{
            display: 'inline-block',
            padding: 'var(--space-1) var(--space-3)',
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-surface-hover)',
            border: '1px solid var(--color-border)',
            fontSize: 'var(--text-xs)',
            fontWeight: 700,
            color: 'var(--color-text-muted)',
            marginBottom: 'var(--space-3)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          404 · Page Not Found
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-3xl)',
            fontWeight: 800,
            color: 'var(--color-text)',
            margin: '0 0 var(--space-2) 0',
            lineHeight: 1.2,
          }}
        >
          Lost in the Forest?
        </h1>

        <p
          style={{
            color: 'var(--color-text-muted)',
            fontSize: 'var(--text-sm)',
            lineHeight: 1.6,
            margin: '0 auto var(--space-6) auto',
            maxWidth: '420px',
          }}
        >
          The trail you&apos;re following doesn&apos;t exist or has moved deeper into the canopy. Let&apos;s guide you back to familiar paths.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <Link href="/feed" style={{ textDecoration: 'none' }}>
            <div
              style={{
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface-hover)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--space-1)',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                transition: 'border-color var(--duration-fast)',
              }}
            >
              <Film size={18} style={{ color: 'var(--color-forest-600)' }} />
              <span>Watch Feed</span>
            </div>
          </Link>

          <Link href="/explore" style={{ textDecoration: 'none' }}>
            <div
              style={{
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface-hover)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--space-1)',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                transition: 'border-color var(--duration-fast)',
              }}
            >
              <Search size={18} style={{ color: 'var(--color-forest-600)' }} />
              <span>Explore</span>
            </div>
          </Link>

          <Link href="/create" style={{ textDecoration: 'none' }}>
            <div
              style={{
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface-hover)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--space-1)',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                transition: 'border-color var(--duration-fast)',
              }}
            >
              <Sparkles size={18} style={{ color: 'var(--color-forest-600)' }} />
              <span>Create Reel</span>
            </div>
          </Link>
        </div>

        <Link href="/">
          <Button variant="primary" leftIcon={<Home size={14} />}>
            Return to Home
          </Button>
        </Link>
      </Card>
    </div>
  );
}
