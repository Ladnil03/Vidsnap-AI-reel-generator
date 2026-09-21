'use client';

/**
 * VidSnap.AI Admin Dashboard Overview
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Film, 
  MessageSquare, 
  ArrowRight, 
  Coins, 
  CheckCircle2, 
  Cpu, 
  Server, 
  HardDrive 
} from 'lucide-react';
import { api } from '@/lib/api';
import { AdminReel, AdminUser, FeedbackItem } from '@/lib/types';
import { Card, Spinner } from '@/components/ui';
import styles from './admin.module.css';

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [reels, setReels] = useState<AdminReel[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [u, r, f] = await Promise.all([
          api.admin.getUsers(0, 100),
          api.admin.getReels(0, 100),
          api.feedback.list(0, 100),
        ]);
        setUsers(u);
        setReels(r);
        setFeedback(f);
      } catch {
        // Handled
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const totalTokensDistributed = users.reduce((acc, u) => acc + (u.tokens_remaining || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      {/* Metric Cards Grid */}
      <div className={styles.kpiGrid}>
        <Card variant="default" className={styles.kpiCard} style={{ padding: 'var(--space-5)' }}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Total Users</span>
            <div className={styles.kpiIcon}>
              <Users size={18} />
            </div>
          </div>
          <div className={styles.kpiValue}>
            {loading ? '...' : users.length}
          </div>
          <span className={styles.kpiSubtext}>Registered accounts</span>
        </Card>

        <Card variant="default" className={styles.kpiCard} style={{ padding: 'var(--space-5)' }}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Completed Reels</span>
            <div className={styles.kpiIcon}>
              <Film size={18} />
            </div>
          </div>
          <div className={styles.kpiValue}>
            {loading ? '...' : reels.length}
          </div>
          <span className={styles.kpiSubtext}>Rendered via FFmpeg</span>
        </Card>

        <Card variant="default" className={styles.kpiCard} style={{ padding: 'var(--space-5)' }}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Active Token Pool</span>
            <div className={styles.kpiIcon}>
              <Coins size={18} />
            </div>
          </div>
          <div className={styles.kpiValue}>
            {loading ? '...' : totalTokensDistributed}
          </div>
          <span className={styles.kpiSubtext}>Circulating user credits</span>
        </Card>

        <Card variant="default" className={styles.kpiCard} style={{ padding: 'var(--space-5)' }}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>User Feedback</span>
            <div className={styles.kpiIcon}>
              <MessageSquare size={18} />
            </div>
          </div>
          <div className={styles.kpiValue}>
            {loading ? '...' : feedback.length}
          </div>
          <span className={styles.kpiSubtext}>Messages received</span>
        </Card>
      </div>

      {/* Free-Tier Infrastructure Health Card */}
      <Card variant="default" style={{ padding: 'var(--space-6)' }}>
        <h3 style={{ fontSize: 'var(--text-lg)', fontFamily: 'var(--font-display)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text)' }}>
          <Server size={18} style={{ color: 'var(--color-forest-600)' }} />
          <span>Infrastructure Topology (₹0 / month Target)</span>
        </h3>

        <div className={styles.topologyGrid}>
          <div className={styles.topologyItem}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1-5)', color: 'var(--color-moss-600)', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-1)' }}>
              <CheckCircle2 size={14} />
              <span>MongoDB Atlas M0</span>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
              512MB shared tier with unique & TTL indexes.
            </p>
          </div>

          <div className={styles.topologyItem}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1-5)', color: 'var(--color-moss-600)', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-1)' }}>
              <CheckCircle2 size={14} />
              <span>Redis ARQ Media Worker</span>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
              Asynchronous 2-concurrency queue with auto-retry.
            </p>
          </div>

          <div className={styles.topologyItem}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1-5)', color: 'var(--color-moss-600)', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-1)' }}>
              <CheckCircle2 size={14} />
              <span>Microsoft Edge-TTS</span>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
              Neural voiceover engine with zero API charges.
            </p>
          </div>

          <div className={styles.topologyItem}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1-5)', color: 'var(--color-moss-600)', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-1)' }}>
              <CheckCircle2 size={14} />
              <span>FFmpeg 720p Dual-Layer</span>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
              H.264 vertical video encoding with faststart.
            </p>
          </div>
        </div>
      </Card>

      {/* Quick Action Navigation Cards */}
      <div className={styles.quickNavGrid}>
        <Link href="/admin/users" style={{ textDecoration: 'none' }}>
          <Card variant="raised" interactive className={styles.quickNavCard}>
            <div>
              <h4 style={{ fontSize: 'var(--text-base)', fontWeight: 700, margin: '0 0 var(--space-1) 0', color: 'var(--color-text)' }}>
                Manage Users & Credits
              </h4>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', margin: 0 }}>
                View accounts, grant or deduct tokens
              </p>
            </div>
            <ArrowRight size={18} style={{ color: 'var(--color-forest-600)' }} />
          </Card>
        </Link>

        <Link href="/admin/reels" style={{ textDecoration: 'none' }}>
          <Card variant="raised" interactive className={styles.quickNavCard}>
            <div>
              <h4 style={{ fontSize: 'var(--text-base)', fontWeight: 700, margin: '0 0 var(--space-1) 0', color: 'var(--color-text)' }}>
                Reel Moderation
              </h4>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', margin: 0 }}>
                Inspect rendered reels across all users
              </p>
            </div>
            <ArrowRight size={18} style={{ color: 'var(--color-forest-600)' }} />
          </Card>
        </Link>

        <Link href="/admin/feedback" style={{ textDecoration: 'none' }}>
          <Card variant="raised" interactive className={styles.quickNavCard}>
            <div>
              <h4 style={{ fontSize: 'var(--text-base)', fontWeight: 700, margin: '0 0 var(--space-1) 0', color: 'var(--color-text)' }}>
                User Feedback Inbox
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', margin: 0 }}>
                Read comments, ratings, and bug reports
              </p>
            </div>
            <ArrowRight size={18} style={{ color: 'var(--color-forest-600)' }} />
          </Card>
        </Link>
      </div>
    </div>
  );
}
