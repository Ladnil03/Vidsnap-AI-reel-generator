'use client';

/**
 * VidSnap.AI User Profile & Quotas
 * Redesigned in the Forest & Paper design system.
 */

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Shield,
  Coins,
  LogOut,
  Sparkles,
  CheckCircle2,
  KeyRound,
  HardDrive,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  Button,
  Card,
  Badge,
  EmptyState,
  useToast,
} from '@/components/ui';
import styles from './profile.module.css';

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { success } = useToast();

  const handleLogout = async () => {
    await logout();
    success('Logged out successfully.');
    router.push('/');
  };

  if (!user) {
    return (
      <div className={styles.container}>
        <EmptyState
          icon={<User size={40} />}
          title="Sign in to View Profile"
          description="Access your creation tokens, free-tier quotas, and session security."
          actionLabel="Sign In"
          onAction={() => router.push('/login')}
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 800, margin: '0 0 var(--space-1) 0' }}>
          Account &amp; Quotas
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', margin: 0 }}>
          Manage your personal details, free-tier quotas, and session credentials.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {/* User Details Card */}
        <Card variant="raised">
          <div className={styles.profileHeader} style={{ padding: 0, background: 'transparent', border: 'none', marginBottom: 'var(--space-4)' }}>
            <div className={styles.userInfo}>
              <div className={styles.avatarLarge}>
                {user.name.charAt(0).toUpperCase()}
              </div>

              <div>
                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, margin: '0 0 var(--space-1) 0', color: 'var(--text-primary)' }}>
                  {user.name}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
                  <Mail size={14} />
                  <span>{user.email}</span>
                </div>
              </div>
            </div>

            {/* Role Badges */}
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {user.roles.map((role, idx) => (
                <Badge key={idx} variant={role === 'admin' ? 'moss' : 'sage'} size="sm">
                  <Shield size={12} style={{ marginRight: '4px' }} />
                  <span>{role.toUpperCase()}</span>
                </Badge>
              ))}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 'var(--space-4)',
              paddingTop: 'var(--space-4)',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: 'var(--text-xs)',
            }}
          >
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>User ID</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                {user.user_id.slice(0, 14)}...
              </span>
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Account Status</span>
              <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                <CheckCircle2 size={14} /> Active &amp; Verified
              </span>
            </div>
          </div>
        </Card>

        {/* Free Tier Quotas & Credits */}
        <Card variant="raised">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <Coins size={20} style={{ color: 'var(--color-forest-700)' }} />
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: 0 }}>
              Credits &amp; Free-Tier Quota
            </h3>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Creation Tokens</span>
              <div className={styles.statValue}>{user.tokens_remaining}</div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>1 token = 1 complete 720p reel</span>
            </div>

            <div className={styles.statCard}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Active Plan</span>
              <div className={styles.statValue} style={{ fontSize: 'var(--text-xl)' }}>Free-Tier (₹0)</div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Always-free cloud stack</span>
            </div>

            <div className={styles.statCard}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Upload Concurrency</span>
              <div className={styles.statValue} style={{ fontSize: 'var(--text-xl)' }}>1-5 Images / Reel</div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>50MB batch limit</span>
            </div>
          </div>

          <div
            style={{
              marginTop: 'var(--space-4)',
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-sunken)',
              border: '1px solid var(--border-subtle)',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            <Sparkles size={16} style={{ color: 'var(--color-moss-500)', flexShrink: 0 }} />
            <span>Need more tokens? Earn daily via streaks or submit feedback to the team!</span>
          </div>
        </Card>

        {/* Account Actions */}
        <Card variant="raised" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div>
            <h4 style={{ fontSize: 'var(--text-base)', fontWeight: 700, margin: '0 0 var(--space-1) 0' }}>
              Session Management
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', margin: 0 }}>
              Sign out from this device to invalidate active session tokens.
            </p>
          </div>

          <Button
            variant="danger"
            onClick={handleLogout}
            leftIcon={<LogOut size={16} />}
          >
            Sign Out
          </Button>
        </Card>
      </div>
    </div>
  );
}
