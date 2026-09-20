'use client';

/**
 * VidSnap.AI Admin Layout & RBAC Guard
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, Users, Film, MessageSquare, LayoutDashboard, AlertTriangle, ShieldAlert, Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

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
      <div className="container" style={{ textAlign: 'center', padding: '80px 0' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Verifying administrative permissions...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '80px 16px' }}>
        <div className="glass-card" style={{ maxWidth: '460px', margin: '0 auto', padding: '40px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(244, 63, 94, 0.15)',
            color: 'var(--accent-rose)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
          }}>
            <AlertTriangle size={28} />
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Access Restricted</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: '1.6' }}>
            This portal is restricted to platform administrators. Your account ({user?.email || 'Guest'}) does not possess the required `admin` role.
          </p>
          <Link href="/" className="btn btn-secondary">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBottom: '60px' }}>
      {/* Admin Portal Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '28px',
        paddingBottom: '20px',
        borderBottom: '1px solid var(--glass-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(6, 182, 212, 0.15)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38bdf8',
          }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem' }}>Platform Administration</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              RBAC Protected: System control, credit ledger updates, and video moderation.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '6px',
          background: 'var(--bg-surface)',
          padding: '4px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--glass-border)',
        }}>
          <Link
            href="/admin"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 500,
              color: isActive('/admin') ? '#fff' : 'var(--text-secondary)',
              background: isActive('/admin') ? 'var(--primary-gradient)' : 'transparent',
              transition: 'all var(--transition-fast)',
            }}
          >
            <LayoutDashboard size={15} />
            <span>Overview</span>
          </Link>

          <Link
            href="/admin/users"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 500,
              color: isActive('/admin/users') ? '#fff' : 'var(--text-secondary)',
              background: isActive('/admin/users') ? 'var(--primary-gradient)' : 'transparent',
              transition: 'all var(--transition-fast)',
            }}
          >
            <Users size={15} />
            <span>Users</span>
          </Link>

          <Link
            href="/admin/reels"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 500,
              color: isActive('/admin/reels') ? '#fff' : 'var(--text-secondary)',
              background: isActive('/admin/reels') ? 'var(--primary-gradient)' : 'transparent',
              transition: 'all var(--transition-fast)',
            }}
          >
            <Film size={15} />
            <span>Reels</span>
          </Link>

          <Link
            href="/admin/moderation"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 500,
              color: isActive('/admin/moderation') ? '#fff' : 'var(--text-secondary)',
              background: isActive('/admin/moderation') ? 'var(--primary-gradient)' : 'transparent',
              transition: 'all var(--transition-fast)',
            }}
          >
            <ShieldAlert size={15} />
            <span>Moderation</span>
          </Link>

          <Link
            href="/admin/system"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 500,
              color: isActive('/admin/system') ? '#fff' : 'var(--text-secondary)',
              background: isActive('/admin/system') ? 'var(--primary-gradient)' : 'transparent',
              transition: 'all var(--transition-fast)',
            }}
          >
            <Activity size={15} />
            <span>System</span>
          </Link>

          <Link
            href="/admin/feedback"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 500,
              color: isActive('/admin/feedback') ? '#fff' : 'var(--text-secondary)',
              background: isActive('/admin/feedback') ? 'var(--primary-gradient)' : 'transparent',
              transition: 'all var(--transition-fast)',
            }}
          >
            <MessageSquare size={15} />
            <span>Feedback</span>
          </Link>
        </div>
      </div>

      {children}
    </div>
  );
}
