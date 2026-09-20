'use client';

/**
 * VidSnap.AI User Profile & Quotas
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
  HardDrive, 
  Layers, 
  KeyRound,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';

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
      <div className="container" style={{ textAlign: 'center', padding: '80px 16px' }}>
        <div className="glass-card" style={{ maxWidth: '440px', margin: '0 auto', padding: '40px' }}>
          <User size={40} color="var(--primary-light)" style={{ margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Sign in to View Profile</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>
            Access your quota, credits balance, and account credentials.
          </p>
          <Link href="/login" className="btn btn-primary">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-narrow" style={{ paddingBottom: '60px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '6px' }}>Account & Profile</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
          Manage your personal details, free-tier quotas, and session security.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* User Details Glass Card */}
        <div className="glass-card">
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: 'var(--radius-xl)',
                background: 'var(--primary-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
                fontWeight: 800,
                color: '#fff',
                boxShadow: '0 4px 18px var(--primary-glow)',
              }}>
                {user.name.charAt(0).toUpperCase()}
              </div>

              <div>
                <h2 style={{ fontSize: '1.4rem', marginBottom: '4px' }}>{user.name}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <Mail size={14} />
                  <span>{user.email}</span>
                </div>
              </div>
            </div>

            {/* Role Badges */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {user.roles.map((role, idx) => (
                <span
                  key={idx}
                  className={`badge ${role === 'admin' ? 'badge-cyan' : 'badge-primary'}`}
                >
                  <Shield size={12} />
                  <span>{role}</span>
                </span>
              ))}
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            paddingTop: '20px',
            borderTop: '1px solid var(--glass-border)',
            fontSize: '0.85rem',
          }}>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>User ID</span>
              <span style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--text-secondary)' }}>
                {user.user_id.slice(0, 14)}...
              </span>
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Account Status</span>
              <span style={{ color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                <CheckCircle2 size={14} /> Active & Verified
              </span>
            </div>
          </div>
        </div>

        {/* Free Tier Quotas & Credits */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Coins size={20} color="var(--primary-light)" />
            <span>Credits & Free-Tier Quota</span>
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '20px',
          }}>
            <div style={{
              background: 'var(--bg-surface-elevated)',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--glass-border)',
            }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Creation Tokens</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--primary-light)', margin: '4px 0' }}>
                {user.tokens_remaining}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>1 token = 1 complete 720p reel</span>
            </div>

            <div style={{
              background: 'var(--bg-surface-elevated)',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--glass-border)',
            }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Active Plan</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#34d399', margin: '4px 0' }}>
                Free-Tier (₹0 / mo)
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Always-free cloud stack</span>
            </div>

            <div style={{
              background: 'var(--bg-surface-elevated)',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--glass-border)',
            }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Upload Concurrency</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-cyan)', margin: '4px 0' }}>
                1-5 Images / Reel
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>50MB batch limit</span>
            </div>
          </div>

          <div style={{
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <Sparkles size={18} color="var(--primary-light)" />
            <span>Need more tokens? Submit feedback or contact the platform administrator.</span>
          </div>
        </div>

        {/* Account Actions */}
        <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h4 style={{ fontSize: '1.05rem', marginBottom: '4px' }}>Session Management</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Sign out from this device to invalidate active session tokens.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="btn btn-danger"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
