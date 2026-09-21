'use client';

/**
 * VidSnap.AI Admin Moderation Review Queue
 * Manage flagged reels, comments, and accounts with automated toxicity indicators.
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  EyeOff,
  Trash2,
  Ban,
  CheckCircle,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  ContentReport,
  ModerationActionType,
  ModerationStats,
  ReportStatusType,
  ReportTargetType,
} from '@/lib/types';
import {
  Card,
  Button,
  Badge,
  Modal,
  Textarea,
  FormField,
  Spinner,
  EmptyState,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import styles from '../admin.module.css';

export default function AdminModerationPage() {
  const { success: toastSuccess, error: toastError } = useToast();

  const [reports, setReports] = useState<ContentReport[]>([]);
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ReportStatusType | ''>('pending');
  const [targetFilter, setTargetFilter] = useState<ReportTargetType | ''>('');
  const [actionModalReport, setActionModalReport] = useState<ContentReport | null>(null);
  const [selectedAction, setSelectedAction] = useState<ModerationActionType>('hide_content');
  const [resolutionNote, setResolutionNote] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchReportsAndStats = async () => {
    setLoading(true);
    try {
      const [reps, st] = await Promise.all([
        api.moderation.getQueue(
          statusFilter ? (statusFilter as ReportStatusType) : undefined,
          targetFilter ? (targetFilter as ReportTargetType) : undefined,
          0,
          50
        ),
        api.moderation.getStats(),
      ]);
      setReports(reps);
      setStats(st);
    } catch {
      toastError('Failed to load moderation queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsAndStats();
  }, [statusFilter, targetFilter]);

  const handleOpenActionModal = (report: ContentReport, action: ModerationActionType) => {
    setActionModalReport(report);
    setSelectedAction(action);
    setResolutionNote(
      action === 'dismiss'
        ? 'Reviewed and dismissed as non-violating.'
        : `Enforced ${action} due to verified policy violation.`
    );
  };

  const handleExecuteAction = async () => {
    if (!actionModalReport) return;
    setSubmittingAction(true);
    try {
      await api.moderation.takeAction(
        actionModalReport.report_id,
        selectedAction,
        resolutionNote,
        true
      );
      // Optimistically update list
      setReports((prev) =>
        prev.map((r) =>
          r.report_id === actionModalReport.report_id
            ? {
                ...r,
                status:
                  selectedAction === 'dismiss'
                    ? 'resolved_dismissed'
                    : 'resolved_action_taken',
                resolution_note: resolutionNote,
              }
            : r
        )
      );
      toastSuccess(`Moderation action executed: ${selectedAction}`);
      setActionModalReport(null);
      // Refresh stats
      const st = await api.moderation.getStats();
      setStats(st);
    } catch (e: unknown) {
      toastError((e as Error).message || 'Failed to execute moderation action.');
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header & Refresh */}
      <div className={styles.toolbar}>
        <div>
          <h2 style={{ fontSize: 'var(--text-xl)', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', margin: '0 0 var(--space-1) 0', color: 'var(--color-text)' }}>
            <ShieldAlert size={22} style={{ color: 'var(--color-terracotta-600)' }} />
            <span>Content Moderation Queue</span>
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', margin: 0 }}>
            Review user-reported reels, comments, and accounts with automated heuristic toxicity scores.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchReportsAndStats}
          loading={loading}
          leftIcon={<RefreshCw size={14} />}
        >
          Refresh Queue
        </Button>
      </div>

      {/* Stats Cards */}
      <div className={styles.kpiGrid}>
        <Card variant="default" className={styles.kpiCard} style={{ padding: 'var(--space-5)' }}>
          <span className={styles.kpiLabel}>Pending Review</span>
          <div className={styles.kpiValue} style={{ color: 'var(--color-ochre-700)' }}>
            {stats ? stats.pending_reports : '...'}
          </div>
          <span className={styles.kpiSubtext}>Urgent moderator items</span>
        </Card>

        <Card variant="default" className={styles.kpiCard} style={{ padding: 'var(--space-5)' }}>
          <span className={styles.kpiLabel}>Resolved Reports</span>
          <div className={styles.kpiValue} style={{ color: 'var(--color-moss-600)' }}>
            {stats ? stats.resolved_reports : '...'}
          </div>
          <span className={styles.kpiSubtext}>Actioned or dismissed</span>
        </Card>

        <Card variant="default" className={styles.kpiCard} style={{ padding: 'var(--space-5)' }}>
          <span className={styles.kpiLabel}>Total Enforcements</span>
          <div className={styles.kpiValue} style={{ color: 'var(--color-terracotta-600)' }}>
            {stats ? stats.total_actions : '...'}
          </div>
          <span className={styles.kpiSubtext}>Audit actions logged</span>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card variant="default" style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 'var(--space-1-5)', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontWeight: 600 }}>
            <Filter size={14} /> Status:
          </span>
          {(['pending', 'reviewing', 'resolved_action_taken', 'resolved_dismissed', ''] as const).map((st) => (
            <Button
              key={st}
              variant={statusFilter === st ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter(st)}
              style={{ padding: 'var(--space-1) var(--space-2-5)', fontSize: 'var(--text-xs)' }}
            >
              {st === '' ? 'All' : st.replace(/_/g, ' ')}
            </Button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-1-5)', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 600 }}>Target:</span>
          {(['video', 'comment', 'user', ''] as const).map((tt) => (
            <Button
              key={tt}
              variant={targetFilter === tt ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setTargetFilter(tt)}
              style={{ padding: 'var(--space-1) var(--space-2-5)', fontSize: 'var(--text-xs)' }}
            >
              {tt === '' ? 'All Types' : tt}
            </Button>
          ))}
        </div>
      </Card>

      {/* Report Cards / List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spinner size="lg" />
          <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
            Loading moderation queue...
          </p>
        </div>
      ) : reports.length === 0 ? (
        <EmptyState
          icon={<CheckCircle size={40} />}
          title="Moderation Queue Clear!"
          description="No flagged content requires review under the selected filter."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {reports.map((rep) => (
            <Card key={rep.report_id} variant="default" style={{ padding: 'var(--space-5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  <Badge
                    variant={rep.priority === 'high' ? 'danger' : 'sage'}
                    size="sm"
                  >
                    {rep.priority === 'high' ? 'HIGH PRIORITY' : 'NORMAL'}
                  </Badge>

                  <Badge variant="default" size="sm">
                    {rep.target_type.toUpperCase()}
                  </Badge>

                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    ID: <code>{rep.report_id}</code>
                  </span>
                </div>

                <Badge
                  variant={
                    rep.status === 'pending'
                      ? 'warning'
                      : rep.status === 'resolved_action_taken'
                      ? 'danger'
                      : 'success'
                  }
                  size="sm"
                >
                  {rep.status}
                </Badge>
              </div>

              {/* Reason & Content snippet */}
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, marginBottom: 'var(--space-1)', color: 'var(--color-text)' }}>
                  Reason: <span style={{ color: 'var(--color-forest-700)', textTransform: 'capitalize' }}>{rep.reason.replace(/_/g, ' ')}</span>
                  {rep.report_count > 1 && (
                    <span style={{ marginLeft: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-terracotta-600)' }}>
                      ({rep.report_count} user reports)
                    </span>
                  )}
                </div>

                {rep.details && (
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text)', marginBottom: 'var(--space-2)', background: 'var(--color-surface-hover)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontStyle: 'italic' }}>
                    &ldquo;{rep.details}&rdquo;
                  </p>
                )}

                {rep.target_meta && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                    {Boolean(rep.target_meta.title) && <span>Target Title: <strong>{String(rep.target_meta.title)}</strong></span>}
                    {Boolean(rep.target_meta.text) && <span>Target Text: <strong>{String(rep.target_meta.text)}</strong></span>}
                    {Boolean(rep.target_meta.name) && <span>Target User: <strong>{String(rep.target_meta.name)}</strong></span>}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {rep.status === 'pending' && (
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenActionModal(rep, 'hide_content')}
                    leftIcon={<EyeOff size={13} />}
                  >
                    Hide Content
                  </Button>

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleOpenActionModal(rep, 'delete_content')}
                    leftIcon={<Trash2 size={13} />}
                  >
                    Delete Content
                  </Button>

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleOpenActionModal(rep, 'ban_user')}
                    leftIcon={<Ban size={13} />}
                  >
                    Ban Creator
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenActionModal(rep, 'dismiss')}
                    leftIcon={<CheckCircle size={13} />}
                    style={{ marginLeft: 'auto' }}
                  >
                    Dismiss
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Action Confirmation Modal */}
      <Modal
        isOpen={Boolean(actionModalReport)}
        onClose={() => setActionModalReport(null)}
        title={actionModalReport ? `Confirm: ${selectedAction.replace(/_/g, ' ').toUpperCase()}` : ''}
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="Resolution / Audit Log Note" required hint="Mandatory explanation recorded in audit trail">
            <Textarea
              value={resolutionNote}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setResolutionNote(e.target.value)}
              rows={3}
              placeholder="Enter mandatory reason for audit trail..."
            />
          </FormField>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
            <Button
              variant="secondary"
              onClick={() => setActionModalReport(null)}
              disabled={submittingAction}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleExecuteAction}
              loading={submittingAction}
              disabled={!resolutionNote.trim()}
            >
              Confirm Action
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
