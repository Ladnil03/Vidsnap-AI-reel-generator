'use client';

/**
 * VidSnap.AI Gamification & Rewards Hub (/gamification)
 * Interactive dashboard for Levels, Flame Streaks, Daily Quests,
 * Podium Leaderboards, and Achievement Trophy Room.
 * Redesigned in the Forest & Paper design system.
 */

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Flame,
  Shield,
  Sparkles,
  Award,
  Crown,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import {
  BadgeCatalogItem,
  GamificationProfile,
  LeaderboardResponse,
  LeaderboardScopeType,
} from '@/lib/types';
import {
  Button,
  Card,
  Badge,
  ProgressBar,
  Spinner,
  EmptyState,
  useToast,
} from '@/components/ui';
import styles from './gamification.module.css';

export default function GamificationPage() {
  const { user } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [badges, setBadges] = useState<BadgeCatalogItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [lbScope, setLbScope] = useState<LeaderboardScopeType>('all_time');
  const [activeTab, setActiveTab] = useState<'quests' | 'leaderboard' | 'badges'>('quests');
  const [badgeFilter, setBadgeFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState(false);

  // Load Gamification Data
  const loadData = useCallback(async () => {
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
  }, [user, lbScope]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Daily Streak Check-in
  const handleDailyCheckIn = async () => {
    if (!user) return;
    try {
      setActionLoading(true);
      const res = await api.gamification.recordStreak('daily');
      toastSuccess(`🔥 Streak updated! Current streak: ${res.current_streak} days!`);
      await loadData();
    } catch (err: unknown) {
      toastError((err as Error).message || 'Check-in failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Consume Streak Freeze Shield
  const handleUseFreeze = async () => {
    if (!user) return;
    try {
      setActionLoading(true);
      await api.gamification.useFreeze('daily');
      toastSuccess('🛡️ Streak Freeze Shield activated for today!');
      await loadData();
    } catch (err: unknown) {
      toastError((err as Error).message || 'Freeze activation failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Claim Quest Reward
  const handleClaimChallenge = async (challengeId: string) => {
    if (!user) return;
    try {
      setActionLoading(true);
      const res = await api.gamification.claimChallenge(challengeId);
      toastSuccess(`🎉 Claimed +${res.amount} XP reward!`);
      await loadData();
    } catch (err: unknown) {
      toastError((err as Error).message || 'Claim failed');
    } finally {
      setActionLoading(false);
    }
  };

  const levelNum = profile?.level?.level ?? 1;
  const xpCurrent = profile?.level?.current_xp ?? 0;
  const xpNext = profile?.level?.xp_for_next_level ?? 1000;
  const xpProgress = profile?.level?.progress_pct ?? Math.min(100, Math.round((xpCurrent / xpNext) * 100));
  const streakDays = profile?.streaks?.[0]?.current_streak ?? 0;
  const freezeCount = profile?.freeze_tokens_available ?? 0;
  const entries = leaderboard?.entries ?? [];

  return (
    <div className={styles.container}>
      {/* Hero Stats Card */}
      <div className={styles.heroCard}>
        <div className={styles.levelSection}>
          <div className={styles.levelRing}>
            <span className={styles.levelNumber}>{levelNum}</span>
            <span className={styles.levelLabel}>Level</span>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
              <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                {user ? user.name : 'Adventurer'}
              </h1>
              <Badge variant="sage" size="sm">
                Rank #{leaderboard?.user_entry?.rank ?? '—'}
              </Badge>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', margin: '0 0 var(--space-3) 0' }}>
              {xpCurrent} / {xpNext} XP to Level {levelNum + 1}
            </p>
            <div style={{ width: '240px' }}>
              <ProgressBar value={xpProgress} max={100} />
            </div>
          </div>
        </div>

        {/* Streak & Freeze Card */}
        <div className={styles.streakCard}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Flame size={24} style={{ color: 'var(--warning)' }} />
              <span className={styles.streakNumber}>{streakDays}</span>
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Day Streak</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <Button
              variant="primary"
              size="sm"
              loading={actionLoading}
              disabled={actionLoading || !user}
              onClick={handleDailyCheckIn}
            >
              Check-In Today
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Shield size={14} />}
              disabled={actionLoading || freezeCount === 0}
              onClick={handleUseFreeze}
            >
              Freeze ({freezeCount})
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabBar}>
        <button
          type="button"
          onClick={() => setActiveTab('quests')}
          className={`${styles.tabBtn} ${activeTab === 'quests' ? styles.tabBtnActive : ''}`}
        >
          <Sparkles size={16} />
          <span>Daily Quests</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('leaderboard')}
          className={`${styles.tabBtn} ${activeTab === 'leaderboard' ? styles.tabBtnActive : ''}`}
        >
          <Crown size={16} />
          <span>Podium Leaderboard</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('badges')}
          className={`${styles.tabBtn} ${activeTab === 'badges' ? styles.tabBtnActive : ''}`}
        >
          <Trophy size={16} />
          <span>Trophy Badges</span>
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-16) 0' }}>
          <Spinner size="lg" style={{ margin: '0 auto var(--space-4) auto' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading achievements and ranks...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: Quests */}
          {activeTab === 'quests' && (
            <div className={styles.questsGrid}>
              {profile?.active_challenges && profile.active_challenges.length > 0 ? (
                profile.active_challenges.map((quest) => (
                  <Card key={quest.challenge_id} variant="raised" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                        <Badge variant="sage" size="sm">
                          +{quest.reward_xp} XP
                        </Badge>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                          {quest.is_weekly ? 'Weekly Quest' : 'Daily Quest'}
                        </span>
                      </div>

                      <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 'var(--space-1)' }}>
                        {quest.title}
                      </h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-3)' }}>
                        {quest.description}
                      </p>

                      <div style={{ marginBottom: 'var(--space-4)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                          <span>Progress</span>
                          <span>{quest.current_count} / {quest.target_count}</span>
                        </div>
                        <ProgressBar value={quest.current_count} max={quest.target_count} />
                      </div>
                    </div>

                    <Button
                      variant={quest.is_completed && !quest.is_claimed ? 'primary' : 'secondary'}
                      size="sm"
                      disabled={!quest.is_completed || quest.is_claimed || actionLoading}
                      onClick={() => handleClaimChallenge(quest.challenge_id)}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      {quest.is_claimed ? 'Claimed' : quest.is_completed ? 'Claim Reward' : 'In Progress'}
                    </Button>
                  </Card>
                ))
              ) : (
                <EmptyState
                  icon={<Sparkles size={40} />}
                  title="No Active Quests"
                  description="Check back tomorrow for fresh daily quests and watch party missions!"
                />
              )}
            </div>
          )}

          {/* TAB 2: Leaderboard */}
          {activeTab === 'leaderboard' && (
            <div>
              {/* Scope Pills */}
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)', overflowX: 'auto' }}>
                {(['weekly', 'all_time'] as LeaderboardScopeType[]).map((scope) => (
                  <Button
                    key={scope}
                    variant={lbScope === scope ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setLbScope(scope)}
                  >
                    {scope === 'weekly' ? 'THIS WEEK' : 'ALL TIME'}
                  </Button>
                ))}
              </div>

              {/* Podium Top 3 */}
              {entries.length >= 3 && (
                <div className={styles.podiumGrid}>
                  {/* 2nd Place */}
                  <Card variant="raised" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                    <Badge variant="sage" size="sm" style={{ marginBottom: 'var(--space-2)' }}>
                      🥈 2nd Place
                    </Badge>
                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: 'var(--space-1) 0' }}>
                      {entries[1].display_name || entries[1].username}
                    </h3>
                    <p style={{ color: 'var(--color-moss-600)', fontWeight: 700 }}>
                      {entries[1].score.toLocaleString()} XP
                    </p>
                  </Card>

                  {/* 1st Place */}
                  <Card variant="raised" style={{ textAlign: 'center', padding: 'var(--space-6)', border: '2px solid var(--color-moss-500)' }}>
                    <Badge variant="primary" size="sm" style={{ marginBottom: 'var(--space-2)' }}>
                      👑 Champion 1st
                    </Badge>
                    <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, margin: 'var(--space-1) 0' }}>
                      {entries[0].display_name || entries[0].username}
                    </h3>
                    <p style={{ color: 'var(--color-forest-800)', fontWeight: 800, fontSize: 'var(--text-lg)' }}>
                      {entries[0].score.toLocaleString()} XP
                    </p>
                  </Card>

                  {/* 3rd Place */}
                  <Card variant="raised" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                    <Badge variant="sage" size="sm" style={{ marginBottom: 'var(--space-2)' }}>
                      🥉 3rd Place
                    </Badge>
                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: 'var(--space-1) 0' }}>
                      {entries[2].display_name || entries[2].username}
                    </h3>
                    <p style={{ color: 'var(--color-moss-600)', fontWeight: 700 }}>
                      {entries[2].score.toLocaleString()} XP
                    </p>
                  </Card>
                </div>
              )}

              {/* Ranks list */}
              <div className={styles.rankList}>
                {entries.map((item) => (
                  <div key={item.user_id} className={styles.rankItem}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                      <span style={{ fontWeight: 800, fontSize: 'var(--text-base)', width: '24px', color: 'var(--text-muted)' }}>
                        #{item.rank}
                      </span>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.display_name || item.username}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Level {item.level} • {item.title}</div>
                      </div>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--color-forest-800)' }}>
                      {item.score.toLocaleString()} XP
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Badges */}
          {activeTab === 'badges' && (
            <div>
              {/* Category Filters */}
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)', overflowX: 'auto' }}>
                {['all', 'watch', 'creation', 'streak', 'social', 'special'].map((cat) => (
                  <Button
                    key={cat}
                    variant={badgeFilter === cat ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setBadgeFilter(cat)}
                  >
                    {cat.toUpperCase()}
                  </Button>
                ))}
              </div>

              {/* Badges Grid */}
              <div className={styles.badgesGrid}>
                {badges
                  .filter((b) => badgeFilter === 'all' || b.category === badgeFilter)
                  .map((badge) => {
                    const isUnlocked = Boolean(
                      badge.is_unlocked ||
                        profile?.badges_unlocked?.some((b) => b.badge_id === badge.badge_id)
                    );
                    return (
                      <Card key={badge.badge_id} variant="raised" className={styles.badgeCard}>
                        <div
                          style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            background: isUnlocked ? 'var(--color-forest-800)' : 'var(--bg-sunken)',
                            color: isUnlocked ? 'var(--color-cream-100)' : 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem',
                            marginBottom: 'var(--space-3)',
                            border: `2px solid ${isUnlocked ? 'var(--color-moss-500)' : 'var(--border-subtle)'}`,
                          }}
                        >
                          {isUnlocked ? (
                            <Award size={24} />
                          ) : (
                            <Lock size={20} className={styles.badgeIconLocked} />
                          )}
                        </div>

                        <Badge variant={isUnlocked ? 'success' : 'default'} size="sm" style={{ marginBottom: 'var(--space-2)' }}>
                          {isUnlocked ? 'UNLOCKED' : 'LOCKED'}
                        </Badge>

                        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 'var(--space-1)' }}>
                          {badge.name}
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', lineHeight: 1.4, margin: 0 }}>
                          {badge.description}
                        </p>
                      </Card>
                    );
                  })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
