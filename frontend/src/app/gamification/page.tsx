'use client';

/**
 * VidSnap.AI Gamification & Rewards Hub (/gamification)
 * Interactive dashboard for Levels, Flame Streaks, Daily Quests,
 * Podium Leaderboards, and Achievement Trophy Room.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Flame,
  Shield,
  Sparkles,
  Award,
  Crown,
  CheckCircle2,
  Clock,
  Zap,
  Lock,
  Calendar,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import {
  BadgeCatalogItem,
  GamificationProfile,
  LeaderboardResponse,
  LeaderboardScopeType,
  UserChallenge,
} from '@/lib/types';

export default function GamificationPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [badges, setBadges] = useState<BadgeCatalogItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [lbScope, setLbScope] = useState<LeaderboardScopeType>('all_time');
  const [activeTab, setActiveTab] = useState<'quests' | 'leaderboard' | 'badges'>('quests');
  const [badgeFilter, setBadgeFilter] = useState<string>('all');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Load Gamification Data
  const loadData = async () => {
    try {
      setLoading(true);
      const [badgesData, lbData] = await Promise.all([
        api.gamification.getBadges(),
        api.gamification.getLeaderboard(lbScope, 20),
      ]);
      setBadges(badgesData);
      setLeaderboard(lbData);

      if (user) {
        const profData = await api.gamification.getProfile();
        setProfile(profData);
      }
    } catch (err) {
      console.error('Failed to load gamification data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, lbScope]);

  // Daily Streak Check-in
  const handleDailyCheckIn = async () => {
    if (!user) return;
    try {
      setActionLoading(true);
      const res = await api.gamification.recordStreak('daily');
      setActionMessage(`🔥 Streak updated! Current streak: ${res.current_streak} days!`);
      await loadData();
    } catch (err: any) {
      setActionMessage(err.message || 'Check-in failed');
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  // Consume Streak Freeze Shield
  const handleUseFreeze = async () => {
    if (!user) return;
    try {
      setActionLoading(true);
      await api.gamification.useFreeze('daily');
      setActionMessage('🛡️ Streak Freeze Shield activated for today!');
      await loadData();
    } catch (err: any) {
      setActionMessage(err.message || 'Freeze activation failed');
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  // Claim Quest Reward
  const handleClaimChallenge = async (challengeId: string) => {
    if (!user) return;
    try {
      setActionLoading(true);
      const res = await api.gamification.claimChallenge(challengeId);
      setActionMessage(`🎉 Claimed +${res.amount} XP reward!`);
      await loadData();
    } catch (err: any) {
      setActionMessage(err.message || 'Claim failed');
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const streak = profile?.streaks?.[0];
  const level = profile?.level;

  const filteredBadges = badges.filter((b) => {
    if (badgeFilter === 'all') return true;
    if (badgeFilter === 'unlocked') return b.is_unlocked;
    return b.category === badgeFilter;
  });

  return (
    <div style={{ minHeight: '100vh', paddingTop: '88px', paddingBottom: '80px' }}>
      <div className="container" style={{ maxWidth: '1120px' }}>
        {/* Action / Notification Banner */}
        {actionMessage && (
          <div
            style={{
              padding: '12px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(168, 85, 247, 0.25))',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.95rem',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 20px rgba(99, 102, 241, 0.2)',
            }}
          >
            <span>{actionMessage}</span>
            <button
              onClick={() => setActionMessage(null)}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* HERO HEADER & STATS BAR */}
        <div
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'var(--glass-blur)',
            WebkitBackdropFilter: 'var(--glass-blur)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '32px',
            marginBottom: '32px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Ambient background glow */}
          <div
            style={{
              position: 'absolute',
              top: '-40px',
              right: '-40px',
              width: '240px',
              height: '240px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px',
              alignItems: 'center',
            }}
          >
            {/* Level & XP Progression */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(99, 102, 241, 0.15)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    color: 'var(--primary-light)',
                    fontSize: '0.825rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  <Crown size={14} />
                  {level ? level.title : 'Novice Explorer 🧭'}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Total XP: <strong style={{ color: 'var(--text-primary)' }}>{level ? level.current_xp.toLocaleString() : 0}</strong>
                </span>
              </div>

              <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 16px 0', letterSpacing: '-0.02em' }}>
                Level {level ? level.level : 1}
              </h1>

              {/* Progress Bar */}
              <div style={{ marginBottom: '8px' }}>
                <div
                  style={{
                    height: '10px',
                    borderRadius: '999px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${level ? level.progress_pct : 0}%`,
                      background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)',
                      borderRadius: '999px',
                      transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <span>{level ? level.current_xp : 0} XP</span>
                <span>{level ? level.progress_pct : 0}% to Level {(level?.level || 1) + 1}</span>
                <span>{level ? level.xp_for_next_level : 100} XP</span>
              </div>
            </div>

            {/* Flame Streak & Quick Check-in */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px',
                justifyContent: 'flex-start',
              }}
            >
              {/* Flame Streak Card */}
              <div
                style={{
                  flex: '1 1 200px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(239, 68, 68, 0.2))',
                    border: '1px solid rgba(249, 115, 22, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#f97316',
                  }}
                >
                  <Flame size={26} />
                </div>
                <div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                    {streak ? streak.current_streak : 0} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>days</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Record: {streak ? streak.longest_streak : 0} days
                  </div>
                </div>
              </div>

              {/* Streak Freeze Shields */}
              <div
                style={{
                  flex: '1 1 200px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(99, 102, 241, 0.2))',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#38bdf8',
                  }}
                >
                  <Shield size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                    {streak ? streak.freeze_tokens : 2} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Shields</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {streak?.is_frozen_today ? 'Protected today ❄️' : 'Ready to protect'}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            {user ? (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleDailyCheckIn}
                  disabled={actionLoading}
                  className="btn btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 18px',
                    fontSize: '0.9rem',
                  }}
                >
                  <Flame size={16} />
                  <span>Daily Check-in 🔥</span>
                </button>

                <button
                  onClick={handleUseFreeze}
                  disabled={actionLoading || (streak?.freeze_tokens || 0) <= 0 || streak?.is_frozen_today}
                  className="btn btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 18px',
                    fontSize: '0.9rem',
                  }}
                >
                  <Shield size={16} />
                  <span>Freeze Day 🛡️</span>
                </button>
              </div>
            ) : (
              <div>
                <Link href="/login" className="btn btn-primary">
                  Log in to track XP & Rewards
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* SECTION NAV TABS */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid var(--glass-border)',
            paddingBottom: '12px',
            marginBottom: '32px',
          }}
        >
          <button
            onClick={() => setActiveTab('quests')}
            style={{
              padding: '8px 20px',
              borderRadius: 'var(--radius-full)',
              background: activeTab === 'quests' ? 'var(--primary-gradient)' : 'transparent',
              color: activeTab === 'quests' ? '#fff' : 'var(--text-secondary)',
              border: activeTab === 'quests' ? 'none' : '1px solid var(--glass-border)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Sparkles size={16} />
            Daily Quests 🎯
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            style={{
              padding: '8px 20px',
              borderRadius: 'var(--radius-full)',
              background: activeTab === 'leaderboard' ? 'var(--primary-gradient)' : 'transparent',
              color: activeTab === 'leaderboard' ? '#fff' : 'var(--text-secondary)',
              border: activeTab === 'leaderboard' ? 'none' : '1px solid var(--glass-border)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Trophy size={16} />
            Leaderboard 🏆
          </button>

          <button
            onClick={() => setActiveTab('badges')}
            style={{
              padding: '8px 20px',
              borderRadius: 'var(--radius-full)',
              background: activeTab === 'badges' ? 'var(--primary-gradient)' : 'transparent',
              color: activeTab === 'badges' ? '#fff' : 'var(--text-secondary)',
              border: activeTab === 'badges' ? 'none' : '1px solid var(--glass-border)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Award size={16} />
            Trophy Room 🏅
          </button>
        </div>

        {/* TAB CONTENT */}

        {/* 1. QUESTS / CHALLENGES TAB */}
        {activeTab === 'quests' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 6px 0' }}>
                Active Quests & Challenges
              </h2>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
                Complete daily tasks and weekly community marathons to earn bonus XP and climb the ranks.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '20px',
              }}
            >
              {profile?.active_challenges?.map((ch) => {
                const progressPct = Math.min(100, Math.round((ch.current_count / ch.target_count) * 100));

                return (
                  <div
                    key={ch.challenge_id}
                    style={{
                      background: 'var(--glass-bg)',
                      border: ch.is_completed && !ch.is_claimed
                        ? '1px solid rgba(168, 85, 247, 0.5)'
                        : '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: ch.is_completed && !ch.is_claimed
                        ? '0 0 20px rgba(168, 85, 247, 0.15)'
                        : 'none',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '12px',
                        }}
                      >
                        <span style={{ fontSize: '1.8rem' }}>{ch.icon}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              background: ch.is_weekly ? 'rgba(56, 189, 248, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                              color: ch.is_weekly ? '#38bdf8' : 'var(--primary-light)',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}
                          >
                            {ch.is_weekly ? 'Weekly' : 'Daily'}
                          </span>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              background: 'rgba(234, 179, 8, 0.15)',
                              color: '#eab308',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}
                          >
                            +{ch.reward_xp} XP
                          </span>
                        </div>
                      </div>

                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 6px 0' }}>
                        {ch.title}
                      </h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 16px 0' }}>
                        {ch.description}
                      </p>
                    </div>

                    <div>
                      {/* Quest Progress Bar */}
                      <div style={{ marginBottom: '8px' }}>
                        <div
                          style={{
                            height: '6px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            borderRadius: '999px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${progressPct}%`,
                              background: ch.is_completed ? '#10b981' : 'var(--primary-light)',
                              borderRadius: '999px',
                            }}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '14px',
                          fontSize: '0.8rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <span>Progress: {ch.current_count} / {ch.target_count}</span>
                        <span>{progressPct}%</span>
                      </div>

                      {/* Action / Claim Button */}
                      {ch.is_claimed ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '8px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(16, 185, 129, 0.1)',
                            color: '#10b981',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                          }}
                        >
                          <CheckCircle2 size={16} />
                          Claimed
                        </div>
                      ) : ch.is_completed ? (
                        <button
                          onClick={() => handleClaimChallenge(ch.challenge_id)}
                          disabled={actionLoading}
                          className="btn btn-primary btn-sm"
                          style={{
                            width: '100%',
                            background: 'linear-gradient(90deg, #10b981, #059669)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            fontWeight: 700,
                          }}
                        >
                          <GiftIcon size={16} />
                          Claim +{ch.reward_xp} XP!
                        </button>
                      ) : (
                        <div
                          style={{
                            textAlign: 'center',
                            fontSize: '0.825rem',
                            color: 'var(--text-muted)',
                            padding: '6px',
                          }}
                        >
                          In Progress
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. LEADERBOARD TAB */}
        {activeTab === 'leaderboard' && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '28px',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 6px 0' }}>
                  Global Hall of Fame
                </h2>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
                  Top creators and viewers dominating the platform.
                </p>
              </div>

              {/* Timeframe selector */}
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '4px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <button
                  onClick={() => setLbScope('weekly')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    background: lbScope === 'weekly' ? 'var(--primary-light)' : 'transparent',
                    color: lbScope === 'weekly' ? '#000' : 'var(--text-secondary)',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.825rem',
                    cursor: 'pointer',
                  }}
                >
                  This Week 🔥
                </button>
                <button
                  onClick={() => setLbScope('all_time')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    background: lbScope === 'all_time' ? 'var(--primary-light)' : 'transparent',
                    color: lbScope === 'all_time' ? '#000' : 'var(--text-secondary)',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.825rem',
                    cursor: 'pointer',
                  }}
                >
                  All-Time 👑
                </button>
              </div>
            </div>

            {/* TOP 3 PODIUM */}
            {leaderboard && leaderboard.entries.length >= 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-end',
                  gap: '16px',
                  marginBottom: '40px',
                  padding: '20px 0',
                }}
              >
                {/* 2nd Place */}
                {leaderboard.entries[1] && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      flex: '1',
                      maxWidth: '180px',
                    }}
                  >
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #94a3b8, #cbd5e1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        fontWeight: 800,
                        color: '#0f172a',
                        marginBottom: '8px',
                        boxShadow: '0 4px 15px rgba(148, 163, 184, 0.4)',
                      }}
                    >
                      🥈
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                      {leaderboard.entries[1].display_name}
                    </div>
                    <div style={{ color: 'var(--primary-light)', fontSize: '0.825rem', fontWeight: 600 }}>
                      {leaderboard.entries[1].score.toLocaleString()} XP
                    </div>
                    {/* Pedestal */}
                    <div
                      style={{
                        width: '100%',
                        height: '70px',
                        background: 'linear-gradient(180deg, rgba(148, 163, 184, 0.15), rgba(148, 163, 184, 0.05))',
                        border: '1px solid rgba(148, 163, 184, 0.3)',
                        borderBottom: 'none',
                        borderTopLeftRadius: 'var(--radius-md)',
                        borderTopRightRadius: 'var(--radius-md)',
                        marginTop: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '1.2rem',
                        color: '#94a3b8',
                      }}
                    >
                      2
                    </div>
                  </div>
                )}

                {/* 1st Place (Center & Highest) */}
                {leaderboard.entries[0] && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      flex: '1',
                      maxWidth: '200px',
                    }}
                  >
                    <div
                      style={{
                        width: '68px',
                        height: '68px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #eab308, #fef08a)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.6rem',
                        fontWeight: 800,
                        color: '#713f12',
                        marginBottom: '8px',
                        boxShadow: '0 6px 25px rgba(234, 179, 8, 0.5)',
                      }}
                    >
                      👑
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>
                      {leaderboard.entries[0].display_name}
                    </div>
                    <div style={{ color: '#eab308', fontSize: '0.9rem', fontWeight: 700 }}>
                      {leaderboard.entries[0].score.toLocaleString()} XP
                    </div>
                    {/* Pedestal */}
                    <div
                      style={{
                        width: '100%',
                        height: '100px',
                        background: 'linear-gradient(180deg, rgba(234, 179, 8, 0.2), rgba(234, 179, 8, 0.05))',
                        border: '1px solid rgba(234, 179, 8, 0.4)',
                        borderBottom: 'none',
                        borderTopLeftRadius: 'var(--radius-md)',
                        borderTopRightRadius: 'var(--radius-md)',
                        marginTop: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '1.5rem',
                        color: '#eab308',
                      }}
                    >
                      1
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {leaderboard.entries[2] && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      flex: '1',
                      maxWidth: '180px',
                    }}
                  >
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #b45309, #d97706)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        fontWeight: 800,
                        color: '#fff',
                        marginBottom: '8px',
                        boxShadow: '0 4px 15px rgba(180, 83, 9, 0.4)',
                      }}
                    >
                      🥉
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                      {leaderboard.entries[2].display_name}
                    </div>
                    <div style={{ color: 'var(--primary-light)', fontSize: '0.825rem', fontWeight: 600 }}>
                      {leaderboard.entries[2].score.toLocaleString()} XP
                    </div>
                    {/* Pedestal */}
                    <div
                      style={{
                        width: '100%',
                        height: '50px',
                        background: 'linear-gradient(180deg, rgba(180, 83, 9, 0.15), rgba(180, 83, 9, 0.05))',
                        border: '1px solid rgba(180, 83, 9, 0.3)',
                        borderBottom: 'none',
                        borderTopLeftRadius: 'var(--radius-md)',
                        borderTopRightRadius: 'var(--radius-md)',
                        marginTop: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '1.2rem',
                        color: '#d97706',
                      }}
                    >
                      3
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* FULL LEADERBOARD TABLE */}
            <div
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 1fr 120px 120px',
                  padding: '12px 20px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderBottom: '1px solid var(--glass-border)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                }}
              >
                <span>Rank</span>
                <span>Creator / Player</span>
                <span style={{ textAlign: 'center' }}>Level</span>
                <span style={{ textAlign: 'right' }}>Total XP</span>
              </div>

              {leaderboard?.entries.map((entry) => {
                const isCurrentUser = user && entry.user_id === user.user_id;

                return (
                  <div
                    key={entry.user_id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '60px 1fr 120px 120px',
                      padding: '14px 20px',
                      alignItems: 'center',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      background: isCurrentUser ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                    }}
                  >
                    <span style={{ fontWeight: 700, color: entry.rank <= 3 ? 'var(--primary-light)' : 'var(--text-secondary)' }}>
                      #{entry.rank}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                        }}
                      >
                        {entry.display_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{entry.display_name}</span>
                          {isCurrentUser && (
                            <span
                              style={{
                                padding: '1px 6px',
                                borderRadius: '999px',
                                background: 'var(--primary-gradient)',
                                color: '#fff',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                              }}
                            >
                              YOU
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {entry.title}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'center', fontWeight: 600, fontSize: '0.85rem' }}>
                      Lvl {entry.level}
                    </div>

                    <div style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-light)', fontSize: '0.9rem' }}>
                      {entry.score.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. TROPHY ROOM / BADGES TAB */}
        {activeTab === 'badges' && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 6px 0' }}>
                  Trophy Room & Achievements
                </h2>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
                  Unlock badges across viewing, creating, community, and milestones.
                </p>
              </div>

              {/* Category filter tabs */}
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  flexWrap: 'wrap',
                }}
              >
                {['all', 'unlocked', 'watch', 'creation', 'streak', 'social', 'special'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setBadgeFilter(cat)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 'var(--radius-full)',
                      background: badgeFilter === cat ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                      color: badgeFilter === cat ? 'var(--primary-light)' : 'var(--text-secondary)',
                      border: badgeFilter === cat ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Badges Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '18px',
              }}
            >
              {filteredBadges.map((badge) => (
                <div
                  key={badge.badge_id}
                  style={{
                    background: badge.is_unlocked ? 'var(--glass-bg)' : 'rgba(255, 255, 255, 0.02)',
                    border: badge.is_unlocked
                      ? '1px solid rgba(99, 102, 241, 0.4)'
                      : '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    opacity: badge.is_unlocked ? 1 : 0.65,
                    boxShadow: badge.is_unlocked ? '0 4px 20px rgba(99, 102, 241, 0.15)' : 'none',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: badge.is_unlocked
                        ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(168, 85, 247, 0.25))'
                        : 'rgba(255, 255, 255, 0.05)',
                      border: badge.is_unlocked
                        ? '2px solid var(--primary-light)'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.8rem',
                      marginBottom: '12px',
                    }}
                  >
                    {badge.icon}
                  </div>

                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 4px 0' }}>
                    {badge.name}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
                    {badge.description}
                  </p>

                  <div
                    style={{
                      marginTop: 'auto',
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-full)',
                      background: badge.is_unlocked ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      color: badge.is_unlocked ? '#10b981' : 'var(--text-muted)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {badge.is_unlocked ? (
                      <>
                        <CheckCircle2 size={12} />
                        Unlocked
                      </>
                    ) : (
                      <>
                        <Lock size={12} />
                        Requires {badge.threshold}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GiftIcon({ size }: { size: number }) {
  return <Sparkles size={size} />;
}
