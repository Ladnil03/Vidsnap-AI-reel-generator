'use client';

/**
 * VidSnap.AI Admin Feedback Inbox
 * View user ratings, issues, and feature suggestions.
 */

import React, { useState, useEffect } from 'react';
import { MessageSquare, Calendar, Mail, User, Loader2 } from 'lucide-react';
import { api } from '../../../lib/api';
import { useToast } from '../../../components/Toast';
import { FeedbackItem } from '../../../lib/types';

export default function AdminFeedbackPage() {
  const { error: toastError } = useToast();

  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const data = await api.feedback.list(0, 100);
      setFeedback(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch feedback';
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '4px' }}>Feedback & User Reports</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          {feedback.length} messages submitted by registered users.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Loader2 size={32} color="var(--primary-light)" style={{ animation: 'spinSlow 2s linear infinite', margin: '0 auto 12px auto' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading user messages...</p>
        </div>
      ) : feedback.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <MessageSquare size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>Inbox is Clear</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            No user feedback or bug reports submitted yet.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {feedback.map((item) => (
            <div key={item.feedback_id} className="glass-card" style={{ padding: '20px 24px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
                flexWrap: 'wrap',
                gap: '10px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--primary-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#fff',
                  }}>
                    {(item.user_name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {item.user_name || 'Anonymous User'}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                      ({item.user_email})
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <Calendar size={13} />
                  <span>{item.created_at ? new Date(item.created_at).toLocaleString() : 'Recent'}</span>
                </div>
              </div>

              <div style={{
                background: 'var(--bg-surface-elevated)',
                padding: '14px 18px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--glass-border)',
                fontSize: '0.9rem',
                lineHeight: '1.6',
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap',
              }}>
                {item.message}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
