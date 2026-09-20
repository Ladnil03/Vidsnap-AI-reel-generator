'use client';

/**
 * VidSnap.AI User Content Reporting Modal
 * Enables viewers to flag abusive, harmful, or copyright-violating content.
 */

import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { api } from '../lib/api';
import { ReportReasonType, ReportTargetType } from '../lib/types';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  targetTitle?: string;
}

const REPORT_REASONS: { value: ReportReasonType; label: string; desc: string }[] = [
  { value: 'spam', label: 'Spam or Scam', desc: 'Commercial advertising, phishing, or bot behavior' },
  { value: 'harassment', label: 'Harassment & Bullying', desc: 'Targeted attacks or intimidation' },
  { value: 'hate_speech', label: 'Hate Speech', desc: 'Attacks based on protected identity characteristics' },
  { value: 'nudity_nsfw', label: 'Nudity or Sexual Content', desc: 'Inappropriate or sexually explicit material' },
  { value: 'copyright', label: 'Copyright Infringement', desc: 'Unlicensed reuse of intellectual property' },
  { value: 'misinformation', label: 'Harmful Misinformation', desc: 'Deceptive or dangerous false information' },
  { value: 'dangerous', label: 'Dangerous Goods or Activity', desc: 'Illegal acts or self-harm encouragement' },
  { value: 'other', label: 'Other Concern', desc: 'Other violation of community guidelines' },
];

export default function ReportModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetTitle,
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReasonType>('spam');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.moderation.report({
        target_type: targetType,
        target_id: targetId,
        reason: selectedReason,
        details: details.trim() || undefined,
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setDetails('');
        onClose();
      }, 1800);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to submit report. Please log in first.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '16px',
    }}>
      <div className="glass-card" style={{ maxWidth: '480px', width: '100%', padding: '24px', position: 'relative' }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          <X size={20} />
        </button>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '30px 10px' }}>
            <CheckCircle size={44} color="var(--accent-emerald)" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Thank You for Reporting</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Your report has been submitted to the moderation review queue to keep VidSnap safe.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <ShieldAlert size={22} color="var(--accent-rose)" />
              <h3 style={{ fontSize: '1.2rem' }}>Report Inappropriate Content</h3>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: '16px' }}>
              Reporting {targetType}: {targetTitle ? <strong>&ldquo;{targetTitle}&rdquo;</strong> : <code>{targetId}</code>}
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                Select Reason for Report:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                {REPORT_REASONS.map((r) => (
                  <label
                    key={r.value}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: selectedReason === r.value ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-surface-elevated)',
                      border: selectedReason === r.value ? '1px solid var(--primary-light)' : '1px solid transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="report_reason"
                      checked={selectedReason === r.value}
                      onChange={() => setSelectedReason(r.value)}
                      style={{ marginTop: '3px' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{r.label}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Additional Details (Optional):
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={2}
                className="input"
                style={{ width: '100%', fontSize: '0.85rem' }}
                placeholder="Help us understand the issue..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={onClose} className="btn btn-secondary" disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
