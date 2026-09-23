'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Flame,
  Users,
  Compass,
  Bookmark,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Sparkles,
  ExternalLink,
  Clock,
  Check,
  UserPlus,
} from 'lucide-react';
import styles from './feed.module.css';
import { api } from '@/lib/api';
import {
  DiscoverySource,
  FeedTab,
  PlayerType,
  VideoContent,
  WatchProgress,
  WellbeingCard,
} from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { EngagementBar } from '@/components/EngagementBar';
import { Button, IconButton, Badge, Avatar, Skeleton, EmptyState } from '@/components/ui';
import { MoodSelector } from '@/components/MoodSelector';

interface FeedItem extends VideoContent {
  explainability_tag?: string;
  is_wellbeing_card?: boolean;
  wellbeing_card?: WellbeingCard;
  source?: DiscoverySource;
  embed_url?: string;
  player_type?: PlayerType;
  attribution_text?: string;
  external_source_url?: string;
}

const TABS: { id: FeedTab; label: string; icon: React.ReactNode }[] = [
  { id: 'for_you', label: 'For You', icon: <Sparkles size={15} /> },
  { id: 'trending', label: 'Trending', icon: <Flame size={15} /> },
  { id: 'following', label: 'Following', icon: <Users size={15} /> },
  { id: 'saved', label: 'Saved', icon: <Bookmark size={15} /> },
];

export default function FeedPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<FeedTab>('for_you');
  const [videos, setVideos] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [sessionReelCount, setSessionReelCount] = useState<number>(0);
  const [muted, setMuted] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [expandedCaption, setExpandedCaption] = useState<Record<string, boolean>>({});
  const [videoProgress, setVideoProgress] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // Fetch videos for active tab
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setVideos([]);
    setCurrentIndex(0);

    if (activeTab === 'for_you') {
      api.recsys
        .getFeed(sessionReelCount, 15)
        .then((res) => {
          if (!isMounted) return;
          const mapped: FeedItem[] = res.items.map((it) => ({
            video_id: it.video_id,
            user_id: it.source === 'community' ? it.id || 'creator' : it.source,
            author_name: it.author_name,
            title: it.title,
            description: it.description,
            hashtags: it.tags,
            video_url: it.embed_url,
            thumbnail_url: it.thumbnail_url,
            duration: it.duration,
            visibility: 'public',
            status: 'published',
            likes_count: it.likes_count,
            saves_count: 0,
            comments_count: 0,
            views_count: it.views_count,
            has_liked: it.has_liked,
            has_saved: it.has_saved,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            explainability_tag: it.explainability_tag,
            is_wellbeing_card: it.is_wellbeing_card,
            wellbeing_card: it.wellbeing_card,
            source: it.source,
            embed_url: it.embed_url,
            player_type: it.player_type,
            attribution_text: it.attribution_text,
            external_source_url: it.source_url,
          }));
          setVideos(mapped);
          setLoading(false);
        })
        .catch(() => {
          if (isMounted) setLoading(false);
        });
    } else {
      api.feed
        .getFeed(activeTab, 20)
        .then((res) => {
          if (isMounted) {
            setVideos(res.items);
            setLoading(false);
          }
        })
        .catch(() => {
          if (isMounted) setLoading(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [activeTab, sessionReelCount]);

  // Handle active video playback on scroll intersection
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = Number(entry.target.getAttribute('data-index'));
          const vid = videoRefs.current[index];
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            setCurrentIndex(index);
            setSessionReelCount((prev) => prev + 1);
            if (vid) {
              vid.play().catch(() => {});
              setIsPlaying(true);
            }
          } else {
            if (vid) {
              vid.pause();
            }
          }
        });
      },
      { threshold: [0.6] }
    );

    const slides = containerRef.current?.querySelectorAll(`.${styles.reelSlide}`);
    slides?.forEach((s) => observer.observe(s));

    return () => observer.disconnect();
  }, [videos]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((e.target as HTMLElement).tagName.toLowerCase())) {
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = Math.min(videos.length - 1, currentIndex + 1);
        const nextSlide = containerRef.current?.children[nextIndex] as HTMLElement;
        nextSlide?.scrollIntoView({ behavior: 'smooth' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = Math.max(0, currentIndex - 1);
        const prevSlide = containerRef.current?.children[prevIndex] as HTMLElement;
        prevSlide?.scrollIntoView({ behavior: 'smooth' });
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlayCurrent();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setMuted((m) => !m);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, videos.length]);

  const togglePlayCurrent = () => {
    const vid = videoRefs.current[currentIndex];
    if (vid) {
      if (vid.paused) {
        vid.play().catch(() => {});
        setIsPlaying(true);
      } else {
        vid.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleToggleFollow = (creatorId: string) => {
    setFollowingMap((prev) => ({
      ...prev,
      [creatorId]: !prev[creatorId],
    }));
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const target = e.currentTarget;
    if (target.duration) {
      setVideoProgress((target.currentTime / target.duration) * 100);
    }
  };

  return (
    <div className={styles.feedContainer}>
      {/* Top Segmented Tab Switcher */}
      <div className={styles.topTabsWrapper}>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: 'var(--space-1) var(--space-3)',
                  borderRadius: 'var(--radius-pill)',
                  border: 'none',
                  backgroundColor: isActive ? 'var(--brand-primary)' : 'transparent',
                  color: isActive ? 'var(--brand-primary-text)' : 'var(--text-secondary)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: isActive ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Snap Player Viewport */}
      {loading ? (
        <div
          style={{
            width: '100%',
            maxWidth: '440px',
            height: 'calc(100dvh - 170px)',
            minHeight: '520px',
            borderRadius: 'var(--radius-xl)',
            backgroundColor: 'var(--player-bg)',
            border: '1px solid var(--player-border)',
            padding: 'var(--space-6)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <Skeleton width="120px" height="28px" borderRadius="var(--radius-pill)" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Skeleton width="36px" height="36px" variant="circle" />
              <Skeleton width="140px" height="18px" />
            </div>
            <Skeleton width="90%" height="16px" />
            <Skeleton width="65%" height="14px" />
          </div>
        </div>
      ) : videos.length === 0 ? (
        <div
          style={{
            width: '100%',
            maxWidth: '440px',
            padding: 'var(--space-10) var(--space-4)',
            backgroundColor: 'var(--surface-paper)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <EmptyState
            title="No Reels in this Feed"
            description="Be the first to publish a high-impact 720p reel in this category!"
            action={
              <Link href="/create">
                <Button variant="primary" leftIcon={<Sparkles size={16} />}>
                  Create a Reel
                </Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div ref={containerRef} className={styles.playerViewport}>
          {videos.map((video, idx) => {
            const isCurrent = idx === currentIndex;
            const isFollowed = followingMap[video.user_id] || false;
            const isExpanded = expandedCaption[video.video_id] || false;

            const isIframe =
              video.player_type === 'iframe' ||
              video.source === 'youtube_shorts' ||
              Boolean(video.video_url?.includes('youtube.com')) ||
              Boolean(video.video_url?.includes('youtube-nocookie.com')) ||
              Boolean(video.embed_url?.includes('youtube.com')) ||
              Boolean(video.embed_url?.includes('youtube-nocookie.com'));

            return (
              <div key={video.video_id} data-index={idx} className={styles.reelSlide}>
                {/* Video Player Element */}
                {isIframe ? (
                  <iframe
                    src={video.embed_url || video.video_url}
                    title={video.title}
                    className={styles.videoElement}
                    style={{ border: 'none' }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    ref={(el) => {
                      videoRefs.current[idx] = el;
                    }}
                    src={video.video_url}
                    poster={video.thumbnail_url}
                    loop
                    muted={muted}
                    playsInline
                    className={styles.videoElement}
                    onClick={togglePlayCurrent}
                    onTimeUpdate={isCurrent ? handleTimeUpdate : undefined}
                  />
                )}

                {/* Top Overlay Controls */}
                <div className={styles.topOverlay}>
                  {video.explainability_tag ? (
                    <Badge variant="primary" icon={<Sparkles size={11} />}>
                      {video.explainability_tag}
                    </Badge>
                  ) : (
                    <div />
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <button
                      type="button"
                      onClick={() => setMuted((m) => !m)}
                      aria-label={muted ? 'Unmute video' : 'Mute video'}
                      style={{
                        padding: '6px',
                        borderRadius: 'var(--radius-pill)',
                        backgroundColor: 'var(--scrim-medium)',
                        border: '1px solid var(--player-border)',
                        color: 'var(--player-text-primary)',
                        display: 'flex',
                        cursor: 'pointer',
                      }}
                    >
                      {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                  </div>
                </div>

                {/* Bottom Overlay: Metadata + Action Rail */}
                <div className={styles.bottomOverlay}>
                  {/* Creator Info & Caption */}
                  <div className={styles.metadataStack}>
                    <div className={styles.creatorRow}>
                      <Avatar
                        fallback={video.author_name || 'VS'}
                        size="sm"
                        showRing
                      />
                      <span className={styles.creatorName}>
                        {video.author_name ? `@${video.author_name}` : '@creator'}
                      </span>
                      {user && (
                        <button
                          type="button"
                          onClick={() => handleToggleFollow(video.user_id)}
                          style={{
                            padding: '2px 10px',
                            borderRadius: 'var(--radius-pill)',
                            border: '1px solid var(--player-border)',
                            backgroundColor: isFollowed ? 'transparent' : 'var(--raw-sage)',
                            color: isFollowed ? 'var(--raw-sage)' : 'var(--forest-900)',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          {isFollowed ? <Check size={11} /> : <UserPlus size={11} />}
                          <span>{isFollowed ? 'Following' : 'Follow'}</span>
                        </button>
                      )}
                    </div>

                    {/* Title / Description */}
                    <div>
                      <p
                        style={{
                          fontSize: 'var(--text-xs)',
                          lineHeight: 1.4,
                          margin: 0,
                          color: 'var(--player-text-primary)',
                        }}
                      >
                        {video.title || video.description}
                      </p>
                      {video.hashtags && video.hashtags.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                          {video.hashtags.map((tag) => (
                            <span key={tag} style={{ fontSize: '11px', color: 'var(--raw-sage)' }}>
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Source Attribution (External Reels) */}
                    {video.attribution_text && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '10px',
                          color: 'var(--player-text-muted)',
                        }}
                      >
                        <span>{video.attribution_text}</span>
                        {video.external_source_url && (
                          <a
                            href={video.external_source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--raw-sage)', display: 'inline-flex', alignItems: 'center' }}
                          >
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Action Rail */}
                  <div className={styles.actionRail}>
                    <EngagementBar
                      videoId={video.video_id}
                      video={video}
                      initialLikes={video.likes_count}
                      initialLiked={video.has_liked}
                      initialSaved={video.has_saved}
                      videoUrl={video.video_url}
                      layout="rail"
                    />
                  </div>
                </div>

                {/* Bottom Scrubbing Progress Bar */}
                {isCurrent && (
                  <div className={styles.progressBarContainer}>
                    <div
                      className={styles.progressBarFill}
                      style={{ width: `${videoProgress}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Mood Selector Dock */}
      <div className={styles.moodBarContainer}>
        <MoodSelector compact />
      </div>
    </div>
  );
}
