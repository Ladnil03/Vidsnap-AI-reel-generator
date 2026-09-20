'use client';

/**
 * VidSnap.AI Creator Studio (/creator)
 * Creator management dashboard: Verification, Audience Analytics,
 * Creator Copilot AI viral strategy assistant, and Community Event Scheduling.
 */

import React, { useEffect, useState } from 'react';
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
  VerificationStatusType,
} from '@/lib/types';

export default function CreatorStudioPage() {
  const { user } = useAuth();
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

  // Notification Banner
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);

  const loadData = async () => {
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
  };

  useEffect(() => {
    loadData();
  }, [user]);

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
    } catch (err: any) {
      setBannerMsg(err.message || 'Copilot generation failed');
    } finally {
      setCopilotLoading(false);
    }
  };

  // Handle Verification Application
  const handleApplyVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setVerifySubmitting(true);
      const links = verifyPortfolio
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await api.creator.applyVerification(verifyNiche, links, verifyStatement);
      setBannerMsg('Verification application submitted! Our team is reviewing your profile. 🌟');
      setShowVerifyModal(false);
      await loadData();
    } catch (err: any) {
      setBannerMsg(err.message || 'Verification submission failed');
    } finally {
      setVerifySubmitting(false);
    }
  };

  // Handle Schedule Event
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle || !eventDate) return;

    try {
      setEventSubmitting(true);
      await api.creator.createEvent(
        eventTitle,
        new Date(eventDate).toISOString(),
        eventDesc || undefined
      );
      setBannerMsg('Community Event scheduled successfully! 📅');
      setEventTitle('');
      setEventDesc('');
      setEventDate('');
      const updatedEvents = await api.creator.listEvents(user?.user_id, 20);
      setEvents(updatedEvents);
    } catch (err: any) {
      setBannerMsg(err.message || 'Event creation failed');
    } finally {
      setEventSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!user) {
    return (
      <div style={{ minHeight: '80vh', paddingTop: '120px', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '600px' }}>
          <div
            style={{
              background: 'var(--glass-bg)',
              padding: '40px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--glass-border)',
            }}
          >
            <Sparkles size={48} color="var(--primary-light)" style={{ marginBottom: '16px' }} />
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '12px' }}>
              Welcome to Creator Studio
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Sign in or create an account to access Creator Copilot AI, audience analytics, and brand sponsorships.
            </p>
            <Link href="/login" className="btn btn-primary btn-lg">
              Sign In to Creator Studio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', paddingTop: '88px', paddingBottom: '80px' }}>
      <div className="container" style={{ maxWidth: '1120px' }}>
        {/* Banner Alert */}
        {bannerMsg && (
          <div
            style={{
              padding: '12px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.95rem',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{bannerMsg}</span>
            <button
              onClick={() => setBannerMsg(null)}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* CREATOR HERO PROFILE CARD */}
        <div
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'var(--glass-blur)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
            marginBottom: '32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                fontWeight: 800,
                color: '#fff',
                boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
              }}
            >
              {profile?.display_name?.charAt(0).toUpperCase() || 'C'}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>
                  {profile?.display_name || user.name}
                </h1>
                {profile?.verification_status === 'verified' ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      color: '#38bdf8',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    <ShieldCheck size={14} /> Verified
                  </span>
                ) : profile?.verification_status === 'pending' ? (
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: 'rgba(234, 179, 8, 0.15)',
                      color: '#eab308',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    Pending Review
                  </span>
                ) : null}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <span>@{profile?.handle || user.name.toLowerCase().replace(' ', '_')}</span>
                <span>•</span>
                <span style={{ textTransform: 'capitalize' }}>{profile?.niche || 'General'} Creator</span>
                <span>•</span>
                <span>{profile?.followers_count || 0} Followers</span>
              </div>
            </div>
          </div>

          <div>
            {profile?.verification_status !== 'verified' && profile?.verification_status !== 'pending' && (
              <button
                onClick={() => setShowVerifyModal(true)}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Award size={16} />
                Get Verified Badge
              </button>
            )}
            <Link
              href="/create"
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginLeft: '10px' }}
            >
              <Video size={16} />
              Create Reel
            </Link>
          </div>
        </div>

        {/* METRICS ROW */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '0.825rem', marginBottom: '8px' }}>
              <Eye size={16} color="var(--primary-light)" />
              <span>Total Impressions</span>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>
              {analytics?.total_impressions.toLocaleString() || 0}
            </div>
          </div>

          <div
            style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '0.825rem', marginBottom: '8px' }}>
              <TrendingUp size={16} color="#10b981" />
              <span>Video Views</span>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>
              {analytics?.total_views.toLocaleString() || 0}
            </div>
          </div>

          <div
            style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '0.825rem', marginBottom: '8px' }}>
              <Clock size={16} color="#38bdf8" />
              <span>Watch Time</span>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>
              {Math.round((analytics?.total_watch_seconds || 0) / 60)} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>mins</span>
            </div>
          </div>

          <div
            style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '0.825rem', marginBottom: '8px' }}>
              <Zap size={16} color="#eab308" />
              <span>Completion Rate</span>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>
              {analytics?.avg_completion_rate_pct || 0}%
            </div>
          </div>
        </div>

        {/* TABS SELECTOR */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid var(--glass-border)',
            paddingBottom: '12px',
            marginBottom: '28px',
          }}
        >
          <button
            onClick={() => setActiveTab('copilot')}
            style={{
              padding: '8px 20px',
              borderRadius: 'var(--radius-full)',
              background: activeTab === 'copilot' ? 'var(--primary-gradient)' : 'transparent',
              color: activeTab === 'copilot' ? '#fff' : 'var(--text-secondary)',
              border: activeTab === 'copilot' ? 'none' : '1px solid var(--glass-border)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Sparkles size={16} />
            Creator Copilot 🤖
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            style={{
              padding: '8px 20px',
              borderRadius: 'var(--radius-full)',
              background: activeTab === 'analytics' ? 'var(--primary-gradient)' : 'transparent',
              color: activeTab === 'analytics' ? '#fff' : 'var(--text-secondary)',
              border: activeTab === 'analytics' ? 'none' : '1px solid var(--glass-border)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <BarChart3 size={16} />
            Audience Insights 📊
          </button>

          <button
            onClick={() => setActiveTab('events')}
            style={{
              padding: '8px 20px',
              borderRadius: 'var(--radius-full)',
              background: activeTab === 'events' ? 'var(--primary-gradient)' : 'transparent',
              color: activeTab === 'events' ? '#fff' : 'var(--text-secondary)',
              border: activeTab === 'events' ? 'none' : '1px solid var(--glass-border)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Calendar size={16} />
            Live Events & Parties 📅
          </button>
        </div>

        {/* TAB 1: CREATOR COPILOT */}
        {activeTab === 'copilot' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
            {/* Input Form */}
            <div
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
              }}
            >
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 14px 0' }}>
                Viral Hook & Strategy Generator
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
                Creator Copilot uses retention models to suggest 3-second visual hooks, predict viral potential, and pinpoint peak audience hours.
              </p>

              <form onSubmit={handleGenerateCopilot} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Reel Topic / Idea *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 5 AI tools that will replace boring daily tasks"
                    value={copilotTopic}
                    onChange={(e) => setCopilotTopic(e.target.value)}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Target Audience (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. University students, Freelancers, Tech geeks"
                    value={copilotAudience}
                    onChange={(e) => setCopilotAudience(e.target.value)}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Mood / Tone
                  </label>
                  <select
                    value={copilotMood}
                    onChange={(e) => setCopilotMood(e.target.value)}
                    className="input"
                    style={{ width: '100%' }}
                  >
                    <option value="engaging">Energetic & Fast-Paced ⚡</option>
                    <option value="chill">Chill & Aesthetic 🌿</option>
                    <option value="inspiring">Inspiring & Motivational ✨</option>
                    <option value="humorous">Humorous & Relatable 😂</option>
                    <option value="curious">Curiosity Gap & Mysterious 🕵️</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={copilotLoading}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}
                >
                  <Sparkles size={16} />
                  {copilotLoading ? 'Analyzing Topic...' : 'Generate Viral Strategy ✨'}
                </button>
              </form>
            </div>

            {/* Results Panel */}
            <div>
              {copilotResponse ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Viral Potential Gauge */}
                  <div
                    style={{
                      background: 'var(--glass-bg)',
                      border: '1px solid rgba(99, 102, 241, 0.4)',
                      borderRadius: 'var(--radius-md)',
                      padding: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        Viral Potential Score
                      </div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#10b981' }}>
                        {copilotResponse.viral_potential_score} / 100
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {copilotResponse.viral_score_breakdown}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '8px 14px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                      }}
                    >
                      High Resonance 🔥
                    </div>
                  </div>

                  {/* Hooks Proposals */}
                  <div
                    style={{
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '20px',
                    }}
                  >
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>
                      Recommended Opening Hooks (0–3s)
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {copilotResponse.hooks.map((h, i) => (
                        <div
                          key={i}
                          style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '14px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-light)' }}>
                              {h.hook_style}
                            </span>
                            <button
                              onClick={() => copyToClipboard(h.hook_text, i)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                            >
                              {copiedIndex === i ? <CheckCircle2 size={14} color="#10b981" /> : <Copy size={14} />}
                              {copiedIndex === i ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.9rem', fontStyle: 'italic' }}>
                            "{h.hook_text}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Optimal Timing & Hashtags */}
                  <div
                    style={{
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '20px',
                    }}
                  >
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Optimal Posting Window</div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary-light)' }}>
                        {copilotResponse.optimal_posting_window}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Target Hashtags</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {copilotResponse.recommended_hashtags.map((tag, idx) => (
                          <span
                            key={idx}
                            style={{
                              padding: '3px 10px',
                              borderRadius: '999px',
                              background: 'rgba(99, 102, 241, 0.15)',
                              color: 'var(--primary-light)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px dashed var(--glass-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '60px 20px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                  }}
                >
                  <Sparkles size={36} style={{ marginBottom: '12px', opacity: 0.5 }} />
                  <div style={{ fontSize: '1rem', fontWeight: 600 }}>No active strategy generated</div>
                  <div style={{ fontSize: '0.85rem' }}>Enter an idea on the left and click Generate to see AI hooks.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: AUDIENCE INSIGHTS */}
        {activeTab === 'analytics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Trend Chart Mock */}
            <div
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
              }}
            >
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>
                Daily Views Trajectory (Past 14 Days)
              </h3>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '12px',
                  height: '140px',
                  paddingTop: '20px',
                }}
              >
                {analytics?.daily_views_trend.map((point, idx) => {
                  const maxViews = Math.max(...(analytics.daily_views_trend.map((p) => p.views) || [1]));
                  const heightPct = Math.min(100, Math.max(15, Math.round((point.views / maxViews) * 100)));

                  return (
                    <div
                      key={idx}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        height: '100%',
                        justifyContent: 'flex-end',
                      }}
                    >
                      <div
                        title={`${point.date}: ${point.views} views`}
                        style={{
                          width: '100%',
                          height: `${heightPct}%`,
                          background: 'linear-gradient(180deg, var(--primary-light), rgba(99, 102, 241, 0.2))',
                          borderRadius: '4px',
                        }}
                      />
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {point.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tags & Moods Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
              <div
                style={{
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                }}
              >
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px' }}>
                  Top Performing Tags
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {analytics?.top_tags.map((t, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--primary-light)' }}>
                        #{t.tag}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {t.views.toLocaleString()} views
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                }}
              >
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px' }}>
                  Audience Mood Distribution
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {analytics?.audience_mood_affinity.map((m, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ textTransform: 'capitalize', fontSize: '0.9rem' }}>
                        {m.mood}
                      </span>
                      <span style={{ fontWeight: 700, color: '#10b981', fontSize: '0.85rem' }}>
                        {m.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: COMMUNITY EVENTS */}
        {activeTab === 'events' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
            {/* Schedule Form */}
            <div
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
              }}
            >
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '14px' }}>
                Schedule Watch Party or Event
              </h3>
              <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Event Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Exclusive Reel Premiere & AMA"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Description
                  </label>
                  <textarea
                    placeholder="Tell your followers what you'll be watching or discussing..."
                    value={eventDesc}
                    onChange={(e) => setEventDesc(e.target.value)}
                    className="input"
                    rows={3}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={eventSubmitting}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <Calendar size={16} />
                  {eventSubmitting ? 'Scheduling...' : 'Schedule Event'}
                </button>
              </form>
            </div>

            {/* Events List */}
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>
                Your Scheduled Events
              </h3>
              {events.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {events.map((evt) => (
                    <div
                      key={evt.event_id}
                      style={{
                        background: 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '18px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '1rem' }}>{evt.title}</span>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '999px',
                            background: 'rgba(56, 189, 248, 0.15)',
                            color: '#38bdf8',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                          }}
                        >
                          {evt.status}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 10px 0' }}>
                        {evt.description || 'No description provided.'}
                      </p>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} />
                        <span>{new Date(evt.scheduled_at).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px dashed var(--glass-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '40px 20px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                  }}
                >
                  <Calendar size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                  <div>No scheduled events yet. Schedule one on the left!</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VERIFICATION MODAL */}
        {showVerifyModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1100,
              padding: '20px',
            }}
          >
            <div
              style={{
                background: '#0f172a',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '32px',
                maxWidth: '520px',
                width: '100%',
              }}
            >
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 8px 0' }}>
                Apply for Creator Verification 🌟
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
                Verified creators earn an official verification badge, priority discovery recommendations, and access to brand sponsorships.
              </p>

              <form onSubmit={handleApplyVerification} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Primary Category Niche *
                  </label>
                  <select
                    value={verifyNiche}
                    onChange={(e) => setVerifyNiche(e.target.value)}
                    className="input"
                    style={{ width: '100%' }}
                  >
                    <option value="tech">Technology & AI</option>
                    <option value="comedy">Comedy & Entertainment</option>
                    <option value="fitness">Health & Fitness</option>
                    <option value="art">Art & Visuals</option>
                    <option value="gaming">Gaming</option>
                    <option value="music">Music & Performance</option>
                    <option value="lifestyle">Lifestyle & Travel</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Portfolio / Social Links (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="https://youtube.com/@handle, https://x.com/handle"
                    value={verifyPortfolio}
                    onChange={(e) => setVerifyPortfolio(e.target.value)}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Why should your profile be verified? *
                  </label>
                  <textarea
                    required
                    minLength={10}
                    placeholder="Describe your content background, creative process, and audience..."
                    value={verifyStatement}
                    onChange={(e) => setVerifyStatement(e.target.value)}
                    className="input"
                    rows={4}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setShowVerifyModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={verifySubmitting}
                    className="btn btn-primary"
                  >
                    {verifySubmitting ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
