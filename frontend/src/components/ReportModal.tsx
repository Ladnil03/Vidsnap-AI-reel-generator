'use client';

import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { ReportReasonType, ReportTargetType } from '../lib/types';
import { Modal, Button, FormField, Textarea, Radio, useToast } from './ui';

export interface ReportModalProps {
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
  { value: 'other', label: 'Other Concern', desc: 'Other violation of community safety standards' },
];

export default function ReportModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetTitle,
}: ReportModalProps) {
  const { success, error: toastError } = useToast();
  const [selectedReason, setSelectedReason] = useState<ReportReasonType>('spam');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
      success('Report submitted for moderation review. Thank you for keeping our community safe.');
      setTimeout(() => {
        setSubmitted(false);
        setDetails('');
        onClose();
      }, 1600);
    } catch (err: unknown) {
      toastError((err as Error).message || 'Failed to submit report. Please log in first.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Report Content"
      description={targetTitle ? `Target: "${targetTitle}"` : 'Submit a moderation flag.'}
    >
      {submitted ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-6) 0' }}>
          <CheckCircle2 size={48} style={{ color: 'var(--success)', margin: '0 auto var(--space-3) auto' }} />
          <h4>Report Received</h4>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            Our moderation team will review this content against community safety guidelines.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
              Reason for report
            </span>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
                maxHeight: '220px',
                overflowY: 'auto',
                paddingRight: 'var(--space-1)',
              }}
            >
              {REPORT_REASONS.map((r) => (
                <div
                  key={r.value}
                  style={{
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: selectedReason === r.value ? 'var(--accent-soft)' : 'transparent',
                    border: '1px solid',
                    borderColor: selectedReason === r.value ? 'var(--border-medium)' : 'var(--border-subtle)',
                  }}
                >
                  <Radio
                    id={`reason-${r.value}`}
                    name="report-reason"
                    label={r.label}
                    checked={selectedReason === r.value}
                    onChange={() => setSelectedReason(r.value)}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '28px' }}>
                    {r.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <FormField id="report-details" label="Additional Details (Optional)">
            <Textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide timestamps or specific context to assist moderators..."
              rows={3}
            />
          </FormField>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            <Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="danger" type="submit" loading={submitting}>
              Submit Report
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
