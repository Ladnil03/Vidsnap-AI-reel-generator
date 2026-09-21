'use client';

/**
 * VidSnap.AI Public Creator Profile (/profile/[id])
 * Redesigned in the Forest & Paper design system.
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  Check,
  Film,
  Heart,
  Eye,
  ArrowLeft,
  Play,
  Share2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { UserProfile, VideoContent } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import EngagementBar from '@/components/EngagementBar';
import {
  Button,
  IconButton,
  Card,
  Badge,
  Modal,
  Spinner,
  EmptyState,
  useToast,
} from '@/components/ui';
import styles from '../profile.module.css';

export default function CreatorProfilePage() {
  const params = useParams();
  const userId = params?.id as string;
  const { user } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reels, setReels] = useState<VideoContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState<VideoContent | null>(null);
  const [followingLoading, setFollowingLoading] = useState(false);

  const loadData = () => {
    if (!userId) return;
    setLoading(true);
    Promise.all([
      api.social.getProfile(userId),
      api.content.listVideos(userId, 0, 50),
    ])
      .then(([prof, vids]) => {
        setProfile(prof);
        setReels(vids);
      })
      .catch((err) => {
        console.error(err);
        toastError('Failed to load creator profile.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const handleFollowToggle = async () => {
    if (!user || !profile) {
      window.location.href = '/login';
      return;
    }

    setFollowingLoading(true);
    try {
      if (profile.is_following) {
        const res = await api.social.unfollow(userId);
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                is_following: false,
                is_friend: false,
                followers_count: res.followers_count,
              }
            : null
        );
        toastSuccess(`Unfollowed ${profile.name}`);
      } else {
        const res = await api.social.follow(userId);
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                is_following: true,
                is_friend: res.is_friend,
                followers_count: res.followers_count,
              }
            : null
        );
        toastSuccess(`Following ${profile.name}!`);
      }
    } catch {
      toastError('Failed to update follow status.');
    } finally {
      setFollowingLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-20) var(--space-4)' }}>
        <Spinner size="lg" style={{ margin: '0 auto var(--space-4) auto' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading creator profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.publicContainer}>
        <EmptyState
          icon={<Users size={40} />}
          title="Creator Not Found"
          description="The creator profile you are looking for does not exist or has been removed."
          actionLabel="Back to Feed"
          onAction={() => {
            window.location.href = '/feed';
          }}
        />
      </div>
    );
  }

  return (
    <div className={styles.publicContainer}>
      {/* Top Bar with Back Link */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <Link href="/explore">
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={16} />}>
            Back to Explore
          </Button>
        </Link>
      </div>

      {/* Creator Profile Header */}
      <Card variant="raised" className={styles.profileHeader}>
        <div className={styles.userInfo}>
          <div className={styles.avatarLarge}>
            {profile.name.charAt(0).toUpperCase()}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                {profile.name}
              </h1>
              {profile.is_friend && (
                <Badge variant="sage" size="sm">
                  Friend
                </Badge>
              )}
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', margin: '0 0 var(--space-3) 0', maxWidth: '500px' }}>
              {profile.bio || 'Creating vertical stories and immersive AI reels.'}
            </p>

            {/* Follower stats */}
            <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              <span>
                <strong style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>{profile.followers_count}</strong> followers
              </span>
              <span>
                <strong style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>{profile.following_count}</strong> following
              </span>
              <span>
                <strong style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>{reels.length}</strong> reels
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        {user?.user_id !== profile.user_id && (
          <Button
            variant={profile.is_following ? 'secondary' : 'primary'}
            loading={followingLoading}
            leftIcon={profile.is_following ? <Check size={16} /> : <UserPlus size={16} />}
            onClick={handleFollowToggle}
          >
            {profile.is_following ? 'Following' : 'Follow Creator'}
          </Button>
        )}
      </Card>

      {/* Creator Reels Grid */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, margin: 0 }}>
          Published Reels
        </h2>
      </div>

      {reels.length === 0 ? (
        <EmptyState
          icon={<Film size={40} />}
          title="No Reels Published"
          description="This creator has not published any public vertical reels yet."
        />
      ) : (
        <div className={styles.reelsGrid}>
          {reels.map((reel) => (
            <div
              key={reel.video_id}
              className={styles.reelCard}
              onClick={() => setActiveVideo(reel)}
            >
              {reel.video_url && (
                <video
                  src={reel.video_url}
                  muted
                  playsInline
                  preload="metadata"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}

              <div className={styles.reelOverlay}>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-xs)', marginBottom: 'var(--space-1)' }}>
                  {reel.title}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: '11px', opacity: 0.85 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Eye size={12} /> {reel.views_count}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Heart size={12} /> {reel.likes_count}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIDEO PLAYER MODAL */}
      <Modal
        isOpen={Boolean(activeVideo)}
        onClose={() => setActiveVideo(null)}
        title={activeVideo?.title || 'Video Player'}
        size="lg"
      >
        {activeVideo && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '9 / 16',
                maxHeight: '520px',
                background: 'var(--player-bg)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
              }}
            >
              <video
                src={activeVideo.video_url}
                controls
                autoPlay
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>

            <EngagementBar
              videoId={activeVideo.video_id}
              video={activeVideo}
              initialLikes={activeVideo.likes_count}
              initialCommentsCount={activeVideo.comments_count}
              initialSaved={false}
              layout="horizontal"
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
