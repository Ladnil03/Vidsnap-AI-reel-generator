'use client';

/**
 * VidSnap.AI Admin Layout & RBAC Guard
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldCheck,
  Users,
  Film,
  MessageSquare,
  LayoutDashboard,
  AlertTriangle,
  ShieldAlert,
  Activity,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Card, Button, Spinner } from '@/components/ui';
import styles from './admin.module.css';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, isAdmin, loading } = useAuth();

  const isActive = (path: string) => pathname === path;

  if (loading) {
    return (
      <div className={styles.container} style={{ textAlign: 'center', padding: '80px 0' }}>
        <Spinner size="lg" />
        <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
          Verifying administrative permissions...
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className={styles.container}>
        <Card variant="default" className={styles.restrictedCard} style={{ padding: 'var(--space-8)' }}>
          <div className={styles.restrictedIcon}>
            <AlertTriangle size={28} />
          </div>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontFamily: 'var(--font-display)', marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>
            Access Restricted
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)', lineHeight: 1.6 }}>
            This portal is restricted to platform administrators. Your account ({user?.email || 'Guest'}) does not possess the required `admin` role.
          </p>
          <Link href="/">
            <Button variant="secondary">
              Return to Home
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Admin Portal Header */}
      <div className={styles.portalHeader}>
        <div className={styles.headerIdentity}>
          <div className={styles.headerIcon}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className={styles.portalTitle}>Platform Administration</h1>
            <p className={styles.portalSubtitle}>
              RBAC Protected: System control, credit ledger updates, and video moderation.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className={styles.navTabs} aria-label="Admin Navigation">
          <Link
            href="/admin"
            className={`${styles.navTab} ${isActive('/admin') ? styles.navTabActive : ''}`}
          >
            <LayoutDashboard size={14} />
            <span>Overview</span>
          </Link>

          <Link
            href="/admin/users"
            className={`${styles.navTab} ${isActive('/admin/users') ? styles.navTabActive : ''}`}
          >
            <Users size={14} />
            <span>Users</span>
          </Link>

          <Link
            href="/admin/reels"
            className={`${styles.navTab} ${isActive('/admin/reels') ? styles.navTabActive : ''}`}
          >
            <Film size={14} />
            <span>Reels</span>
          </Link>

          <Link
            href="/admin/moderation"
            className={`${styles.navTab} ${isActive('/admin/moderation') ? styles.navTabActive : ''}`}
          >
            <ShieldAlert size={14} />
            <span>Moderation</span>
          </Link>

          <Link
            href="/admin/system"
            className={`${styles.navTab} ${isActive('/admin/system') ? styles.navTabActive : ''}`}
          >
            <Activity size={14} />
            <span>System</span>
          </Link>

          <Link
            href="/admin/feedback"
            className={`${styles.navTab} ${isActive('/admin/feedback') ? styles.navTabActive : ''}`}
          >
            <MessageSquare size={14} />
            <span>Feedback</span>
          </Link>
        </nav>
      </div>

      {children}
    </div>
  );
}
