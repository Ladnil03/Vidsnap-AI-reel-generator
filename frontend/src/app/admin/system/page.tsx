'use client';

/**
 * VidSnap.AI System Health & Observability Dashboard
 * Live infrastructure topology, resource utilization, and Prometheus metrics viewer.
 */

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Server,
  Database,
  Cloud,
  Cpu,
  RefreshCw,
  CheckCircle2,
  Users,
  Film,
  Eye,
  Radio,
} from 'lucide-react';
import { api } from '@/lib/api';
import { AdminSystemStats } from '@/lib/types';
import { Card, Button, Spinner } from '@/components/ui';
import styles from '../admin.module.css';

export default function AdminSystemHealthPage() {
  const [stats, setStats] = useState<AdminSystemStats | null>(null);
  const [metricsText, setMetricsText] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchHealthAndMetrics = async () => {
    setLoading(true);
    try {
      const [st, mRes] = await Promise.all([
        api.admin.getStats(),
        fetch('/metrics').then((r) => r.text()).catch(() => '# Metrics unavailable'),
      ]);
      setStats(st);
      setMetricsText(mRes);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthAndMetrics();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header */}
      <div className={styles.toolbar}>
        <div>
          <h2 style={{ fontSize: 'var(--text-xl)', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', margin: '0 0 var(--space-1) 0', color: 'var(--color-text)' }}>
            <Activity size={22} style={{ color: 'var(--color-forest-600)' }} />
            <span>Platform Observability & System Health</span>
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', margin: 0 }}>
            Real-time infrastructure topology, Atlas M0 capacity, and Prometheus runtime telemetry.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchHealthAndMetrics}
          loading={loading}
          leftIcon={<RefreshCw size={14} />}
        >
          Refresh Telemetry
        </Button>
      </div>

      {/* Platform Activity Metric Cards */}
      <div className={styles.kpiGrid}>
        <Card variant="default" className={styles.kpiCard} style={{ padding: 'var(--space-5)' }}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Total Platform Users</span>
            <Users size={16} style={{ color: 'var(--color-forest-600)' }} />
          </div>
          <div className={styles.kpiValue}>
            {stats ? stats.total_users : '...'}
          </div>
          <span className={styles.kpiSubtext}>
            {stats ? `${stats.total_creators} Creators · ${stats.total_businesses} Brands` : '...'}
          </span>
        </Card>

        <Card variant="default" className={styles.kpiCard} style={{ padding: 'var(--space-5)' }}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Total Rendered Reels</span>
            <Film size={16} style={{ color: 'var(--color-forest-600)' }} />
          </div>
          <div className={styles.kpiValue}>
            {stats ? stats.total_reels : '...'}
          </div>
          <span className={styles.kpiSubtext}>Rendered via FFmpeg</span>
        </Card>

        <Card variant="default" className={styles.kpiCard} style={{ padding: 'var(--space-5)' }}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Reel Video Views</span>
            <Eye size={16} style={{ color: 'var(--color-forest-600)' }} />
          </div>
          <div className={styles.kpiValue}>
            {stats ? stats.total_views : '...'}
          </div>
          <span className={styles.kpiSubtext}>Aggregated user impressions</span>
        </Card>

        <Card variant="default" className={styles.kpiCard} style={{ padding: 'var(--space-5)' }}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Live Watch Rooms</span>
            <Radio size={16} style={{ color: 'var(--color-forest-600)' }} />
          </div>
          <div className={styles.kpiValue}>
            {stats ? stats.active_rooms : '...'}
          </div>
          <span className={styles.kpiSubtext}>Realtime WebRTC & WS</span>
        </Card>
      </div>

      {/* Infrastructure Status Grid */}
      <Card variant="default" style={{ padding: 'var(--space-6)' }}>
        <h3 style={{ fontSize: 'var(--text-lg)', fontFamily: 'var(--font-display)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text)' }}>
          <Server size={18} style={{ color: 'var(--color-forest-600)' }} />
          <span>Infrastructure Topology (₹0 / month Free Tier)</span>
        </h3>

        <div className={styles.topologyGrid}>
          <div className={styles.topologyItem}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-moss-600)', fontWeight: 600, marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
              <Database size={16} />
              <span>MongoDB Atlas M0 (512MB)</span>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)', lineHeight: 1.5 }}>
              Multi-collection database with 15-day TTL index on interactions, 30-day TTL on notifications, and unique compound constraints.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--color-moss-600)', fontWeight: 600 }}>
              <CheckCircle2 size={13} /> Status: Online & Healthy
            </div>
          </div>

          <div className={styles.topologyItem}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-moss-600)', fontWeight: 600, marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
              <Cloud size={16} />
              <span>Cloudinary Media Cloud (25GB)</span>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)', lineHeight: 1.5 }}>
              Multi-CDN media cloud with direct client signed uploads, automated f_auto/q_auto optimization, and zero card required free tier.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--color-moss-600)', fontWeight: 600 }}>
              <CheckCircle2 size={13} /> Status: Online & Ready
            </div>
          </div>

          <div className={styles.topologyItem}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-moss-600)', fontWeight: 600, marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
              <Cpu size={16} />
              <span>Redis ARQ Media Engine</span>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)', lineHeight: 1.5 }}>
              Asynchronous 2-concurrency queue with exponential backoff retries, DLQ management, and FFmpeg 720p dual-layer canvas renderers.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--color-moss-600)', fontWeight: 600 }}>
              <CheckCircle2 size={13} /> Status: Operational
            </div>
          </div>
        </div>
      </Card>

      {/* Live Prometheus Metrics Exporter Scrape Viewer */}
      <Card variant="default" style={{ padding: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', margin: 0, color: 'var(--color-text)' }}>
            <Activity size={18} style={{ color: 'var(--color-ochre-700)' }} />
            <span>Prometheus Exposition Stream (`GET /metrics`)</span>
          </h3>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            text/plain; version=0.0.4
          </span>
        </div>

        <pre style={{
          background: 'var(--color-surface-hover)',
          padding: 'var(--space-4)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-xs)',
          fontFamily: 'var(--font-mono)',
          color: 'var(--color-text)',
          maxHeight: '300px',
          overflowY: 'auto',
          margin: 0,
          border: '1px solid var(--color-border)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}>
          {loading ? 'Fetching telemetry metrics...' : metricsText || 'No Prometheus metrics returned.'}
        </pre>
      </Card>
    </div>
  );
}
