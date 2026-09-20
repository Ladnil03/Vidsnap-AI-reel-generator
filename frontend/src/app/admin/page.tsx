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
import { api } from '../../lib/api';
import { AdminReel, AdminUser, FeedbackItem } from '../../lib/types';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Metric Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px',
      }}>
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Users</span>
            <div style={{ padding: '8px', borderRadius: 'var(--radius-sm)', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary-light)' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '4px' }}>
            {loading ? '...' : users.length}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registered accounts</span>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Completed Reels</span>
            <div style={{ padding: '8px', borderRadius: 'var(--radius-sm)', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)' }}>
              <Film size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '4px' }}>
            {loading ? '...' : reels.length}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rendered via FFmpeg</span>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Active Token Pool</span>
            <div style={{ padding: '8px', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)' }}>
              <Coins size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '4px' }}>
            {loading ? '...' : totalTokensDistributed}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Circulating user credits</span>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>User Feedback</span>
            <div style={{ padding: '8px', borderRadius: 'var(--radius-sm)', background: 'rgba(217, 70, 239, 0.15)', color: 'var(--accent-pink)' }}>
              <MessageSquare size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '4px' }}>
            {loading ? '...' : feedback.length}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Messages received</span>
        </div>
      </div>

      {/* Free-Tier Infrastructure Health Card */}
      <div className="glass-card">
        <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Server size={18} color="#38bdf8" />
          <span>Infrastructure Topology (₹0 / month Target)</span>
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}>
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-emerald)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
              <CheckCircle2 size={14} />
              <span>MongoDB Atlas M0</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>512MB shared tier with unique & TTL indexes.</p>
          </div>

          <div style={{ background: 'var(--bg-surface-elevated)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-emerald)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
              <CheckCircle2 size={14} />
              <span>Redis ARQ Media Worker</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Asynchronous 2-concurrency queue with auto-retry.</p>
          </div>

          <div style={{ background: 'var(--bg-surface-elevated)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-emerald)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
              <CheckCircle2 size={14} />
              <span>Microsoft Edge-TTS</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Neural voiceover engine with zero API charges.</p>
          </div>

          <div style={{ background: 'var(--bg-surface-elevated)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-emerald)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
              <CheckCircle2 size={14} />
              <span>FFmpeg 720p Dual-Layer</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>H.264 vertical video encoding with faststart.</p>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
      }}>
        <Link href="/admin/users" className="glass-card glass-card-interactive" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>Manage Users & Credits</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>View accounts, grant or deduct tokens</p>
          </div>
          <ArrowRight size={20} color="var(--primary-light)" />
        </Link>

        <Link href="/admin/reels" className="glass-card glass-card-interactive" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>Reel Moderation</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>Inspect rendered reels across all users</p>
          </div>
          <ArrowRight size={20} color="var(--primary-light)" />
        </Link>

        <Link href="/admin/feedback" className="glass-card glass-card-interactive" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>User Feedback Inbox</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>Read comments, ratings, and bug reports</p>
          </div>
          <ArrowRight size={20} color="var(--primary-light)" />
        </Link>
      </div>
    </div>
  );
}
