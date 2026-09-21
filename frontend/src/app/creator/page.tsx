'use client';

/**
 * VidSnap.AI Creator Studio (/creator)
 * Creator management dashboard: Verification, Audience Analytics,
 * Creator Copilot AI viral strategy assistant, and Community Event Scheduling.
 * Redesigned in the Forest & Paper design system.
 */

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  TrendingUp,
  Award,
  Calendar,
  Eye,
  Clock,
  ThumbsUp,
  CheckCircle2,
  Copy,
  Plus,
  Send,
  ShieldCheck,
  Zap,
  BarChart3,
  Video,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import {
  CreatorAnalytics,
  CreatorCopilotResponse,
  CreatorEvent,
  CreatorProfile,
} from '@/lib/types';
import {
  Button,
  IconButton,
  Card,
  Badge,
  Input,
  Textarea,
  Select,
  FormField,
  Modal,
  Spinner,
  EmptyState,
  useToast,
} from '@/components/ui';
import styles from './creator.module.css';

export default function CreatorStudioPage() {
  const { user } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();

  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [analytics, setAnalytics] = useState<CreatorAnalytics | null>(null);
  const [events, setEvents] = useState<CreatorEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'copilot' | 'analytics' | 'events'>('copilot');

  // Creator Copilot States
  const [copilotTopic, setCopilotTopic] = useState('');
  const [copilotAudience, setCopilotAudience] = useState('');
  const [copilotMood, setCopilotMood] = useState('engaging');
  const [copilotResponse, setCopilotResponse] = useState<CreatorCopilotResponse | null>(null);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Verification Modal State
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyNiche, setVerifyNiche] = useState('tech');
  const [verifyPortfolio, setVerifyPortfolio] = useState('');
  const [verifyStatement, setVerifyStatement] = useState('');
  const [verifySubmitting, setVerifySubmitting] = useState(false);

  // Event Scheduler State
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventSubmitting, setEventSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [profData, analyticsData, eventsData] = await Promise.all([
        api.creator.getProfile(),
        api.creator.getAnalytics(30),
        api.creator.listEvents(user.user_id, 20),
      ]);
      setProfile(profData);
      setAnalytics(analyticsData);
      setEvents(eventsData);
    } catch (err) {
      console.error('Failed to load creator data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Copilot Strategy Request
  const handleGenerateCopilot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copilotTopic.trim()) return;

    try {
      setCopilotLoading(true);
      const res = await api.creator.getCopilotInsights(
        copilotTopic.trim(),
        copilotAudience.trim() || undefined,
        copilotMood || undefined
      );
      setCopilotResponse(res);
      toastSuccess('Copilot strategy generated!');
    } catch (err: unknown) {
      toastError((err as Error).message || 'Copilot generation failed');
    } finally {
      setCopilotLoading(false);
    }
  };

  // Handle Verification Application
  const handleApplyVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setVerifySubmitting(true);
      await api.creator.applyVerification(
        verifyNiche,
        verifyPortfolio ? [verifyPortfolio] : [],
        verifyStatement
      );
      setProfile((prev) => prev ? { ...prev, verification_status: 'pending' } : null);
      setShowVerifyModal(false);
      toastSuccess('Verification application submitted for review!');
    } catch (err: unknown) {
      toastError((err as Error).message || 'Application failed');
    } finally {
      setVerifySubmitting(false);
    }
  };

  // Handle Event Creation
  const handleScheduleEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || !eventDate) return;

    try {
      setEventSubmitting(true);
      const newEv = await api.creator.createEvent(
        eventTitle.trim(),
        new Date(eventDate).toISOString(),
        eventDesc.trim() || undefined
      );
      setEvents((prev) => [newEv, ...prev]);
      setEventTitle('');
      setEventDesc('');
      setEventDate('');
      toastSuccess('Event scheduled successfully!');
    } catch (err: unknown) {
      toastError((err as Error).message || 'Event creation failed');
    } finally {
      setEventSubmitting(false);
    }
  };

  const copyHook = (text: string, idx: number) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(text);
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 2000);
      toastSuccess('Hook copied to clipboard!');
    }
  };

  if (!user) {
    return (
      <div className={styles.container}>
        <EmptyState
          icon={<Video size={40} />}
          title="Sign in to Access Creator Studio"
          description="Track your performance metrics, unlock monetization badges, and consult your AI viral strategy copilot."
          actionLabel="Sign In"
          onAction={() => {
            window.location.href = '/login';
          }}
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <Badge variant="sage" size="sm">
              <ShieldCheck size={12} style={{ marginRight: '4px' }} />
              <span>Creator Hub</span>
            </Badge>
            {profile?.verification_status === 'verified' && (
              <Badge variant="success" size="sm">
                Verified Creator
              </Badge>
            )}
          </div>
          <h1 className={styles.title}>Creator Studio</h1>
          <p className={styles.description}>
            Empower your short-form reach with audience analytics, AI viral copilot, and scheduled community events.
          </p>
        </div>

        {profile?.verification_status !== 'verified' && (
          <Button
            variant="secondary"
            leftIcon={<Award size={18} />}
            onClick={() => setShowVerifyModal(true)}
          >
            {profile?.verification_status === 'pending' ? 'Verification In Review' : 'Apply for Verification'}
          </Button>
        )}
      </div>

      {/* KPI Stats Grid */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Total Views</span>
            <Eye size={16} style={{ color: 'var(--color-moss-500)' }} />
          </div>
          <div className={styles.kpiValue}>
            {loading ? '...' : (analytics?.total_views || 0).toLocaleString()}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Last 30 days</span>
        </div>

        <div className={styles.kpiCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Watch Time</span>
            <Clock size={16} style={{ color: 'var(--color-moss-500)' }} />
          </div>
          <div className={styles.kpiValue}>
            {loading ? '...' : `${Math.round((analytics?.total_watch_seconds || 0) / 60)}m`}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Cumulative audience duration</span>
        </div>

        <div className={styles.kpiCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Total Impressions</span>
            <ThumbsUp size={16} style={{ color: 'var(--color-moss-500)' }} />
          </div>
          <div className={styles.kpiValue}>
            {loading ? '...' : (analytics?.total_impressions || 0).toLocaleString()}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Content discovery reach</span>
        </div>

        <div className={styles.kpiCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Engagement Rate</span>
            <TrendingUp size={16} style={{ color: 'var(--color-moss-500)' }} />
          </div>
          <div className={styles.kpiValue}>
            {loading ? '...' : `${(analytics?.engagement_rate_pct || 0).toFixed(1)}%`}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Views to interaction ratio</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabBar}>
        <button
          type="button"
          onClick={() => setActiveTab('copilot')}
          className={`${styles.tabBtn} ${activeTab === 'copilot' ? styles.tabBtnActive : ''}`}
        >
          <Sparkles size={16} />
          <span>AI Viral Copilot</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`${styles.tabBtn} ${activeTab === 'analytics' ? styles.tabBtnActive : ''}`}
        >
          <BarChart3 size={16} />
          <span>Audience Analytics</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('events')}
          className={`${styles.tabBtn} ${activeTab === 'events' ? styles.tabBtnActive : ''}`}
        >
          <Calendar size={16} />
          <span>Watch Events</span>
        </button>
      </div>

      {/* TAB 1: AI Viral Copilot */}
      {activeTab === 'copilot' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-6)' }}>
          <Card variant="raised">
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
              Consult Creator Copilot
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)' }}>
              Formulate viral hook angles, caption structures, and optimal posting schedules powered by LLM routing.
            </p>

            <form onSubmit={handleGenerateCopilot} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <FormField label="Video Topic / Concept" required>
                <Input
                  type="text"
                  required
                  placeholder="e.g. 3 Hidden Features in Python 3.14 You Didn't Know"
                  value={copilotTopic}
                  onChange={(e) => setCopilotTopic(e.target.value)}
                />
              </FormField>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <FormField label="Target Audience">
                  <Input
                    type="text"
                    placeholder="e.g. Junior software developers"
                    value={copilotAudience}
                    onChange={(e) => setCopilotAudience(e.target.value)}
                  />
                </FormField>

                <FormField label="Tone / Energy">
                  <Select
                    value={copilotMood}
                    onChange={(e) => setCopilotMood(e.target.value)}
                    options={[
                      { value: 'engaging', label: '⚡ High Energy & Hook-Heavy' },
                      { value: 'informative', label: '🧠 Deep Dive & Educational' },
                      { value: 'chill', label: '🌿 Relaxed & Storytelling' },
                      { value: 'humorous', label: '😂 Funny & Relatable' },
                    ]}
                  />
                </FormField>
              </div>

              <Button
                type="submit"
                variant="primary"
                loading={copilotLoading}
                disabled={copilotLoading || !copilotTopic.trim()}
                leftIcon={<Sparkles size={16} />}
                style={{ marginTop: 'var(--space-2)', alignSelf: 'flex-start' }}
              >
                Generate Viral Blueprint
              </Button>
            </form>
          </Card>

          {/* Copilot Output Display */}
          {copilotResponse && (
            <Card variant="raised">
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
                🚀 Strategy Blueprint
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {/* Hooks list */}
                <div>
                  <h4 style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 'var(--space-2)' }}>
                    High-Retention Hook Options
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {copilotResponse.hooks.map((hook, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: 'var(--space-3)',
                          background: 'var(--bg-sunken)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: 'var(--text-sm)',
                        }}
                      >
                        <span style={{ color: 'var(--text-primary)' }}>&quot;{hook.hook_text}&quot; <small style={{ color: 'var(--text-muted)' }}>({hook.hook_style})</small></span>
                        <IconButton
                          icon={copiedIndex === idx ? <CheckCircle2 size={16} style={{ color: 'var(--success)' }} /> : <Copy size={16} />}
                          aria-label="Copy hook"
                          variant="ghost"
                          size="sm"
                          onClick={() => copyHook(hook.hook_text, idx)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Call to action & hashtags */}
                <div>
                  <h4 style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 'var(--space-2)' }}>
                    Suggested Call to Action
                  </h4>
                  <div
                    style={{
                      padding: 'var(--space-4)',
                      background: 'var(--bg-sunken)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--text-sm)',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {copilotResponse.suggested_call_to_action}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* TAB 2: Audience Analytics */}
      {activeTab === 'analytics' && (
        <div>
          {/* Top Tags Table */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-3)' }}>
              Top Tag Niches
            </h3>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Tag</th>
                    <th>Views</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics?.top_tags && analytics.top_tags.length > 0 ? (
                    analytics.top_tags.map((tagItem, idx: number) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>#{tagItem.tag}</td>
                        <td>{tagItem.views.toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-6)' }}>
                        No tag engagement data available yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Watch Events */}
      {activeTab === 'events' && (
        <div>
          {/* Schedule Form */}
          <Card variant="raised" style={{ marginBottom: 'var(--space-6)' }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
              Schedule Community Watch Party
            </h3>
            <form onSubmit={handleScheduleEvent} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)', alignItems: 'end' }}>
              <FormField label="Event Title" required>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Friday Community Screening"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                />
              </FormField>

              <FormField label="Date & Time" required>
                <Input
                  type="datetime-local"
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </FormField>

              <Button
                type="submit"
                variant="primary"
                loading={eventSubmitting}
                leftIcon={<Plus size={16} />}
              >
                Schedule Event
              </Button>
            </form>
          </Card>

          {/* Events List */}
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Event Name</th>
                  <th>Scheduled Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {events.length > 0 ? (
                  events.map((ev) => (
                    <tr key={ev.event_id}>
                      <td style={{ fontWeight: 600 }}>{ev.title}</td>
                      <td>{new Date(ev.scheduled_at).toLocaleString()}</td>
                      <td>
                        <Badge variant="sage" size="sm">
                          {ev.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-6)' }}>
                      No upcoming community events scheduled.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VERIFICATION APPLICATION MODAL */}
      <Modal
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        title="Apply for Creator Verification"
        size="md"
      >
        <form onSubmit={handleApplyVerification} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="Primary Creative Niche" required>
            <Select
              value={verifyNiche}
              onChange={(e) => setVerifyNiche(e.target.value)}
              options={[
                { value: 'tech', label: 'Tech & Software' },
                { value: 'comedy', label: 'Comedy & Entertainment' },
                { value: 'fitness', label: 'Fitness & Health' },
                { value: 'art', label: 'Art, VFX & Design' },
                { value: 'education', label: 'Education & Knowledge' },
              ]}
            />
          </FormField>

          <FormField label="Portfolio Link (YouTube, Instagram, or Website)">
            <Input
              type="url"
              placeholder="https://..."
              value={verifyPortfolio}
              onChange={(e) => setVerifyPortfolio(e.target.value)}
            />
          </FormField>

          <FormField label="Statement of Intent">
            <Textarea
              rows={3}
              placeholder="Tell our review team about your creative content style..."
              value={verifyStatement}
              onChange={(e) => setVerifyStatement(e.target.value)}
            />
          </FormField>

          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
            <Button type="button" variant="ghost" onClick={() => setShowVerifyModal(false)} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={verifySubmitting} style={{ flex: 2 }}>
              Submit Application
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
