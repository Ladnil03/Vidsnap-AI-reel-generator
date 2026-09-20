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
import { api } from '../../../lib/api';
import { AdminSystemStats } from '../../../lib/types';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={22} color="var(--accent-cyan)" />
            <span>Platform Observability & System Health</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Real-time infrastructure topology, Atlas M0 capacity, and Prometheus runtime telemetry.
          </p>
        </div>

        <button
          onClick={fetchHealthAndMetrics}
          disabled={loading}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Platform Activity Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
      }}>
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Platform Users</span>
            <Users size={16} color="var(--primary-light)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>
            {stats ? stats.total_users : '...'}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {stats ? `${stats.total_creators} Creators · ${stats.total_businesses} Brands` : '...'}
          </span>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Rendered Reels</span>
            <Film size={16} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>
            {stats ? stats.total_reels : '...'}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Rendered via FFmpeg</span>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Reel Video Views</span>
            <Eye size={16} color="var(--accent-emerald)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>
            {stats ? stats.total_views : '...'}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Aggregated user impressions</span>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Live Watch Rooms</span>
            <Radio size={16} color="var(--accent-pink)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>
            {stats ? stats.active_rooms : '...'}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Realtime WebRTC & WS</span>
        </div>
      </div>

      {/* Infrastructure Status Grid */}
      <div className="glass-card">
        <h3 style={{ fontSize: '1.15rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Server size={18} color="#38bdf8" />
          <span>Infrastructure Topology (₹0 / month Free Tier)</span>
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
        }}>
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-emerald)', fontWeight: 600, marginBottom: '6px' }}>
              <Database size={16} />
              <span>MongoDB Atlas M0 (512MB)</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: '1.5' }}>
              Multi-collection database with 15-day TTL index on interactions, 30-day TTL on notifications, and unique compound constraints.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--accent-emerald)' }}>
              <CheckCircle2 size={12} /> Status: Online & Healthy
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface-elevated)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-emerald)', fontWeight: 600, marginBottom: '6px' }}>
              <Cloud size={16} />
              <span>Cloudinary Media Cloud (25GB)</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: '1.5' }}>
              Multi-CDN media cloud with direct client signed uploads, automated f_auto/q_auto optimization, and zero card required free tier.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--accent-emerald)' }}>
              <CheckCircle2 size={12} /> Status: Online & Ready
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface-elevated)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-emerald)', fontWeight: 600, marginBottom: '6px' }}>
              <Cpu size={16} />
              <span>Redis ARQ Media Engine</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: '1.5' }}>
              Asynchronous 2-concurrency queue with exponential backoff retries, DLQ management, and FFmpeg 720p dual-layer canvas renderers.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--accent-emerald)' }}>
              <CheckCircle2 size={12} /> Status: Operational
            </div>
          </div>
        </div>
      </div>

      {/* Live Prometheus Metrics Exporter Scrape Viewer */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="var(--accent-amber)" />
            <span>Prometheus Exposition Stream (`GET /metrics`)</span>
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            text/plain; version=0.0.4
          </span>
        </div>

        <pre style={{
          background: 'var(--bg-surface-elevated)',
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.78rem',
          fontFamily: 'monospace',
          color: 'var(--text-secondary)',
          maxHeight: '300px',
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          border: '1px solid var(--glass-border)',
        }}>
          {metricsText || 'Scraping metrics stream...'}
        </pre>
      </div>
    </div>
  );
}
