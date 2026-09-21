'use client';

/**
 * VidSnap.AI Admin Feedback Inbox
 * View user ratings, issues, and feature suggestions.
 */

import React, { useState, useEffect } from 'react';
import { MessageSquare, Calendar } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { FeedbackItem } from '@/lib/types';
import { Card, EmptyState, Spinner } from '@/components/ui';
import styles from '../admin.module.css';

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
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: 'var(--text-xl)', fontFamily: 'var(--font-display)', margin: '0 0 var(--space-1) 0', color: 'var(--color-text)' }}>
          Feedback & User Reports
        </h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', margin: 0 }}>
          {feedback.length} messages submitted by registered users.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spinner size="lg" />
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-3)' }}>
            Loading user messages...
          </p>
        </div>
      ) : feedback.length === 0 ? (
        <EmptyState
          icon={<MessageSquare size={40} />}
          title="Inbox is Clear"
          description="No user feedback or bug reports submitted yet."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {feedback.map((item) => (
            <Card key={item.feedback_id} variant="default" style={{ padding: 'var(--space-5)' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-3)',
                flexWrap: 'wrap',
                gap: 'var(--space-2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--color-forest-700)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 700,
                    color: 'var(--color-cream-50)',
                  }}>
                    {(item.user_name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
                      {item.user_name || 'Anonymous User'}
                    </span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginLeft: 'var(--space-2)' }}>
                      ({item.user_email})
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                  <Calendar size={13} />
                  <span>{item.created_at ? new Date(item.created_at).toLocaleString() : 'Recent'}</span>
                </div>
              </div>

              <div style={{
                background: 'var(--color-surface-hover)',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                fontSize: 'var(--text-sm)',
                lineHeight: 1.6,
                color: 'var(--color-text)',
                whiteSpace: 'pre-wrap',
              }}>
                {item.message}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
