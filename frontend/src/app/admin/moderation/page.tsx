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
  Search,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../../lib/api';
import {
  ContentReport,
  ModerationActionType,
  ModerationStats,
  ReportStatusType,
  ReportTargetType,
} from '../../../lib/types';

export default function AdminModerationPage() {
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
      // Handled
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
      setActionModalReport(null);
      // Refresh stats
      const st = await api.moderation.getStats();
      setStats(st);
    } catch (e: unknown) {
      alert((e as Error).message || 'Failed to execute moderation action.');
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header & Refresh */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={22} color="var(--accent-rose)" />
            <span>Content Moderation Queue</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Review user-reported reels, comments, and accounts with automated heuristic toxicity scores.
          </p>
        </div>

        <button
          onClick={fetchReportsAndStats}
          disabled={loading}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
      }}>
        <div className="glass-card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pending Review</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-amber)', marginTop: '4px' }}>
            {stats ? stats.pending_reports : '...'}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Urgent moderator items</span>
        </div>

        <div className="glass-card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Resolved Reports</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-emerald)', marginTop: '4px' }}>
            {stats ? stats.resolved_reports : '...'}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Actioned or dismissed</span>
        </div>

        <div className="glass-card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Enforcements</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-rose)', marginTop: '4px' }}>
            {stats ? stats.total_actions : '...'}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Audit actions logged</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card" style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Filter size={14} /> Status:
          </span>
          {(['pending', 'reviewing', 'resolved_action_taken', 'resolved_dismissed', ''] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className="btn btn-sm"
              style={{
                fontSize: '0.78rem',
                background: statusFilter === st ? 'var(--primary-gradient)' : 'var(--bg-surface-elevated)',
                color: statusFilter === st ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {st === '' ? 'All' : st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>Target:</span>
          {(['video', 'comment', 'user', ''] as const).map((tt) => (
            <button
              key={tt}
              onClick={() => setTargetFilter(tt)}
              className="btn btn-sm"
              style={{
                fontSize: '0.78rem',
                background: targetFilter === tt ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                borderColor: targetFilter === tt ? 'var(--accent-cyan)' : 'var(--glass-border)',
                color: targetFilter === tt ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              }}
            >
              {tt === '' ? 'All Types' : tt}
            </button>
          ))}
        </div>
      </div>

      {/* Report Cards / List */}
      {loading ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Loading moderation queue...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px' }}>
          <CheckCircle size={36} color="var(--accent-emerald)" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>Moderation Queue Clear!</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            No flagged content requires review under the selected filter.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {reports.map((rep) => (
            <div key={rep.report_id} className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      background:
                        rep.priority === 'high'
                          ? 'rgba(244, 63, 94, 0.2)'
                          : 'rgba(99, 102, 241, 0.2)',
                      color:
                        rep.priority === 'high'
                          ? 'var(--accent-rose)'
                          : 'var(--primary-light)',
                    }}
                  >
                    {rep.priority === 'high' ? '🔥 HIGH PRIORITY' : 'NORMAL'}
                  </span>

                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.72rem',
                      background: 'var(--bg-surface-elevated)',
                      color: 'var(--accent-cyan)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {rep.target_type}
                  </span>

                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    ID: <code>{rep.report_id}</code>
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      background:
                        rep.status === 'pending'
                          ? 'rgba(245, 158, 11, 0.15)'
                          : rep.status === 'resolved_action_taken'
                          ? 'rgba(239, 68, 68, 0.15)'
                          : 'rgba(16, 185, 129, 0.15)',
                      color:
                        rep.status === 'pending'
                          ? 'var(--accent-amber)'
                          : rep.status === 'resolved_action_taken'
                          ? 'var(--accent-rose)'
                          : 'var(--accent-emerald)',
                    }}
                  >
                    {rep.status}
                  </span>
                </div>
              </div>

              {/* Reason & Content snippet */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Reason: <span style={{ color: 'var(--accent-amber)', textTransform: 'capitalize' }}>{rep.reason.replace('_', ' ')}</span>
                  {rep.report_count > 1 && (
                    <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: 'var(--accent-rose)' }}>
                      ({rep.report_count} user reports)
                    </span>
                  )}
                </div>

                {rep.details && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', background: 'var(--bg-surface-elevated)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                    &ldquo;{rep.details}&rdquo;
                  </p>
                )}

                {rep.target_meta && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    {Boolean(rep.target_meta.title) && <span>Target Title: <strong>{String(rep.target_meta.title)}</strong></span>}
                    {Boolean(rep.target_meta.text) && <span>Target Text: <strong>{String(rep.target_meta.text)}</strong></span>}
                    {Boolean(rep.target_meta.name) && <span>Target User: <strong>{String(rep.target_meta.name)}</strong></span>}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {rep.status === 'pending' && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid var(--glass-border)', paddingTop: '12px' }}>
                  <button
                    onClick={() => handleOpenActionModal(rep, 'hide_content')}
                    className="btn btn-sm btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-amber)' }}
                  >
                    <EyeOff size={13} />
                    <span>Hide Content</span>
                  </button>

                  <button
                    onClick={() => handleOpenActionModal(rep, 'delete_content')}
                    className="btn btn-sm btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-rose)' }}
                  >
                    <Trash2 size={13} />
                    <span>Delete Content</span>
                  </button>

                  <button
                    onClick={() => handleOpenActionModal(rep, 'ban_user')}
                    className="btn btn-sm btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-rose)' }}
                  >
                    <Ban size={13} />
                    <span>Ban Creator</span>
                  </button>

                  <button
                    onClick={() => handleOpenActionModal(rep, 'dismiss')}
                    className="btn btn-sm btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-emerald)', marginLeft: 'auto' }}
                  >
                    <CheckCircle size={13} />
                    <span>Dismiss</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action Confirmation Modal */}
      {actionModalReport && (
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
          zIndex: 9999,
          padding: '16px',
        }}>
          <div className="glass-card" style={{ maxWidth: '480px', width: '100%', padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={20} color="var(--accent-amber)" />
              <span>Confirm Action: {selectedAction.replace('_', ' ').toUpperCase()}</span>
            </h3>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Applying enforcement to <strong>{actionModalReport.target_type}</strong> (ID: <code>{actionModalReport.target_id}</code>).
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Resolution / Audit Log Note:
              </label>
              <textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                rows={3}
                className="input"
                style={{ width: '100%', fontSize: '0.85rem' }}
                placeholder="Enter mandatory reason for audit trail..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setActionModalReport(null)}
                className="btn btn-secondary"
                disabled={submittingAction}
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteAction}
                disabled={submittingAction || !resolutionNote.trim()}
                className="btn btn-primary"
              >
                {submittingAction ? 'Enforcing...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
