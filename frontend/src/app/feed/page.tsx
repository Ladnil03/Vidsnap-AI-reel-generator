'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { 
  Flame, 
  Users, 
  UserCheck, 
  Compass, 
  Clock, 
  Bookmark, 
  Volume2, 
  VolumeX, 
  Play, 
  UserPlus,
  Check,
  Sparkles,
  ExternalLink,
  HeartHandshake
} from 'lucide-react';
import { api } from '@/lib/api';
import { 
  DiscoverySource, 
  FeedTab, 
  PlayerType, 
  VideoContent, 
  WatchProgress, 
  WellbeingCard 
} from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import EngagementBar from '@/components/EngagementBar';

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
  { id: 'for_you', label: 'For You ✨', icon: <Sparkles size={16} /> },
  { id: 'trending', label: 'Trending', icon: <Flame size={16} /> },
  { id: 'following', label: 'Following', icon: <Users size={16} /> },
  { id: 'friends', label: 'Friends', icon: <UserCheck size={16} /> },
  { id: 'communities', label: 'Communities', icon: <Compass size={16} /> },
  { id: 'continue_watching', label: 'Continue Watching', icon: <Clock size={16} /> },
  { id: 'saved', label: 'Saved', icon: <Bookmark size={16} /> },
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
  const [progressMap, setProgressMap] = useState<Record<string, WatchProgress>>({});
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // Load feed videos whenever tab changes
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setVideos([]);
    setCurrentIndex(0);

    if (activeTab === 'for_you') {
      api.recsys.getFeed(sessionReelCount, 15)
        .then((res) => {
          if (!isMounted) return;
          const mapped: FeedItem[] = res.items.map((it) => ({
            video_id: it.video_id,
            user_id: it.source === 'community' ? (it.id || 'creator') : it.source,
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
        .catch((err) => {
          console.error('Failed to load recommendation feed:', err);
          if (isMounted) setLoading(false);
        });
    } else {
      api.feed.getFeed(activeTab, 20)
        .then((res) => {
          if (isMounted) {
            setVideos(res.items);
            setLoading(false);

            if (activeTab === 'continue_watching' && user) {
              res.items.forEach((v) => {
                api.feed.getWatchProgress(v.video_id).then((wp) => {
                  if (wp && isMounted) {
                    setProgressMap((prev) => ({ ...prev, [v.video_id]: wp }));
                  }
                }).catch(() => {});
              });
            }
          }
        })
        .catch((err) => {
          console.error('Failed to load feed:', err);
          if (isMounted) setLoading(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [activeTab, user, sessionReelCount]);

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
              const currentVideo = videos[index];
              if (currentVideo && progressMap[currentVideo.video_id]?.watched_seconds && vid.currentTime === 0) {
                vid.currentTime = progressMap[currentVideo.video_id].watched_seconds;
              }
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

    const slides = containerRef.current?.querySelectorAll('.reel-slide');
    slides?.forEach((s) => observer.observe(s));

    return () => observer.disconnect();
  }, [videos, progressMap]);

  // Keyboard controls: Up/Down arrow for scroll, Space for play/pause, M for mute
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'KeyM'].includes(e.code)) {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
          return;
        }
        if (e.code === 'Space') {
          e.preventDefault();
          togglePlay();
        } else if (e.code === 'KeyM') {
          e.preventDefault();
          setMuted((m) => !m);
        } else if (e.code === 'ArrowDown') {
          e.preventDefault();
          scrollToIndex(currentIndex + 1);
        } else if (e.code === 'ArrowUp') {
          e.preventDefault();
          scrollToIndex(currentIndex - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isPlaying, videos.length]);

  // Report watch progress every 4 seconds
  useEffect(() => {
    if (videos.length === 0) return;
    const currentVideo = videos[currentIndex];
    const vid = videoRefs.current[currentIndex];
    if (!currentVideo || !vid) return;

    const interval = setInterval(() => {
      if (!vid.paused && vid.duration > 0) {
        const watched = Math.floor(vid.currentTime);
        const total = Math.floor(vid.duration);

        if (user) {
          api.feed.recordWatchProgress({
            video_id: currentVideo.video_id,
            watched_seconds: watched,
            total_seconds: total,
            completed: vid.currentTime >= vid.duration - 1,
          }).catch(() => {});
        }

        if (watched >= 3) {
          api.recsys.logInteraction({
            item_id: currentVideo.video_id,
            source: currentVideo.source || 'community',
            interaction_type: 'view',
            watched_seconds: watched,
            total_seconds: total,
          }).catch(() => {});
        }
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [currentIndex, videos, user]);

  const scrollToIndex = (idx: number) => {
    if (idx < 0 || idx >= videos.length) return;
    const slides = containerRef.current?.querySelectorAll('.reel-slide');
    if (slides && slides[idx]) {
      slides[idx].scrollIntoView({ behavior: 'smooth' });
    }
  };

  const togglePlay = () => {
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

  const handleFollowToggle = async (creatorId: string) => {
    if (!user) return;
    const isFollowed = followingMap[creatorId];
    try {
      if (isFollowed) {
        await api.social.unfollow(creatorId);
        setFollowingMap((prev) => ({ ...prev, [creatorId]: false }));
      } else {
        await api.social.follow(creatorId);
        setFollowingMap((prev) => ({ ...prev, [creatorId]: true }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <main
      style={{
        paddingTop: '68px',
        height: '100vh',
        background: '#04060a',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Feed Tabs Bar */}
      <nav
        style={{
          height: '52px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(7, 9, 14, 0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          overflowX: 'auto',
          padding: '0 1rem',
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '999px',
                border: isActive ? '1px solid var(--primary-light)' : '1px solid transparent',
                background: isActive ? 'rgba(99, 102, 241, 0.16)' : 'transparent',
                color: isActive ? 'var(--primary-light)' : 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Main Snap-Scrolling Feed Container */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {loading ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              color: 'var(--text-secondary)',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(99, 102, 241, 0.2)',
                borderTopColor: 'var(--primary-light)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span>Loading {activeTab.replace('_', ' ')} reels...</span>
          </div>
        ) : videos.length === 0 ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              maxWidth: '400px',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✨</div>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              No reels found in {activeTab.replace('_', ' ')}
            </h3>
            <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              {activeTab === 'for_you'
                ? 'Discover personalized AI recommendations tailored to your favorite categories!'
                : activeTab === 'following'
                ? 'Follow your favorite creators to see their published reels appear in your stream!'
                : activeTab === 'friends'
                ? 'When you and other creators follow each other, you become mutual friends and unlock private friend reels.'
                : activeTab === 'communities'
                ? 'Join communities in Tech, Comedy, Fitness, or Art to see curated community reels here.'
                : activeTab === 'continue_watching'
                ? 'Videos you watch halfway will sync here so you can continue where you left off on any device.'
                : 'Explore trending reels or create your own with AI!'}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Link
                href="/explore"
                style={{
                  padding: '8px 18px',
                  background: 'var(--brand-gradient)',
                  color: '#fff',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Search Explore
              </Link>
              {activeTab !== 'trending' && (
                <button
                  onClick={() => setActiveTab('trending')}
                  style={{
                    padding: '8px 18px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                  }}
                >
                  Explore Trending
                </button>
              )}
            </div>
          </div>
        ) : (
          videos.map((video, idx) => {
            const isCurrent = idx === currentIndex;
            const resumePoint = progressMap[video.video_id];
            const isFollowed = followingMap[video.user_id] ?? false;

            // Render Anti-Doomscroll Wellbeing Break Card
            if (video.is_wellbeing_card && video.wellbeing_card) {
              return (
                <div
                  key={video.video_id}
                  data-index={idx}
                  className="reel-slide"
                  style={{
                    width: '100%',
                    height: 'calc(100vh - 120px)',
                    scrollSnapAlign: 'start',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px 0',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      aspectRatio: '9 / 16',
                      maxWidth: '420px',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      background: 'radial-gradient(circle at 50% 30%, rgba(16, 185, 129, 0.25), rgba(7, 9, 14, 0.95))',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      boxShadow: '0 8px 32px rgba(16, 185, 129, 0.15)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2.5rem 1.5rem',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '50%',
                        background: 'rgba(16, 185, 129, 0.2)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1.5rem',
                      }}
                    >
                      <HeartHandshake size={36} color="#34d399" />
                    </div>
                    <span
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: '#34d399',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        marginBottom: '0.5rem',
                      }}
                    >
                      Digital Wellbeing
                    </span>
                    <h2
                      style={{
                        fontSize: '1.4rem',
                        fontWeight: 700,
                        color: '#fff',
                        marginBottom: '0.75rem',
                      }}
                    >
                      {video.wellbeing_card.title}
                    </h2>
                    <p
                      style={{
                        fontSize: '0.95rem',
                        color: 'rgba(255, 255, 255, 0.8)',
                        lineHeight: 1.6,
                        marginBottom: '2rem',
                      }}
                    >
                      {video.wellbeing_card.message}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '280px' }}>
                      <button
                        onClick={() => scrollToIndex(idx + 1)}
                        style={{
                          padding: '12px',
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '12px',
                          fontWeight: 600,
                          fontSize: '0.95rem',
                          cursor: 'pointer',
                        }}
                      >
                        Continue Mindfully
                      </button>
                      <Link
                        href="/create"
                        style={{
                          padding: '12px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: 'rgba(255, 255, 255, 0.8)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '12px',
                          fontWeight: 600,
                          fontSize: '0.95rem',
                          textDecoration: 'none',
                        }}
                      >
                        Create Instead
                      </Link>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={video.video_id}
                data-index={idx}
                className="reel-slide"
                style={{
                  width: '100%',
                  height: 'calc(100vh - 120px)',
                  scrollSnapAlign: 'start',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  padding: '12px 0',
                }}
              >
                {/* 9:16 Vertical Video Container */}
                <div
                  style={{
                    height: '100%',
                    aspectRatio: '9 / 16',
                    maxWidth: '420px',
                    position: 'relative',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: '#000',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  {/* Playback Layer: Iframe (YouTube) or Direct HTML5 Video */}
                  {video.player_type === 'iframe' ? (
                    <iframe
                      src={`${video.embed_url}?autoplay=${isCurrent ? 1 : 0}&mute=${muted ? 1 : 0}&controls=1&modestbranding=1&rel=0`}
                      title={video.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                      }}
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
                      onClick={togglePlay}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        cursor: 'pointer',
                      }}
                    />
                  )}

                  {/* Play / Pause overlay indicator for direct video */}
                  {video.player_type !== 'iframe' && !isPlaying && isCurrent && (
                    <div
                      onClick={togglePlay}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0, 0, 0, 0.35)',
                        cursor: 'pointer',
                        zIndex: 2,
                      }}
                    >
                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '50%',
                          background: 'rgba(255, 255, 255, 0.2)',
                          backdropFilter: 'blur(8px)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                        }}
                      >
                        <Play size={28} color="#fff" style={{ marginLeft: '4px' }} />
                      </div>
                    </div>
                  )}

                  {/* Top Control Bar: Audio Mute, Explainability, & Resume Banner */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      right: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      zIndex: 3,
                    }}
                  >
                    {/* Explainability Tag Floating Badge */}
                    {video.explainability_tag && (
                      <div
                        style={{
                          background: 'rgba(15, 23, 42, 0.85)',
                          backdropFilter: 'blur(8px)',
                          border: '1px solid rgba(99, 102, 241, 0.4)',
                          color: '#c7d2fe',
                          padding: '4px 10px',
                          borderRadius: '999px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                        }}
                      >
                        {video.explainability_tag}
                      </div>
                    )}

                    {/* Resume Badge */}
                    {activeTab === 'continue_watching' && resumePoint && (
                      <div
                        style={{
                          background: 'rgba(0, 0, 0, 0.65)',
                          backdropFilter: 'blur(8px)',
                          border: '1px solid rgba(99, 102, 241, 0.4)',
                          color: 'var(--primary-light)',
                          padding: '4px 10px',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <Clock size={12} />
                        <span>Resume at {Math.floor(resumePoint.watched_seconds)}s</span>
                      </div>
                    )}
                    <div style={{ flex: 1 }} />

                    {/* Mute Button for HTML5 Video */}
                    {video.player_type !== 'iframe' && (
                      <button
                        onClick={() => setMuted(!muted)}
                        style={{
                          background: 'rgba(0, 0, 0, 0.55)',
                          backdropFilter: 'blur(8px)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#fff',
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                        title={muted ? 'Unmute' : 'Mute'}
                      >
                        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                      </button>
                    )}
                  </div>

                  {/* Bottom Video Metadata & Author Overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '0',
                      left: '0',
                      right: '64px',
                      padding: '24px 16px 16px',
                      background: 'linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.4) 60%, transparent 100%)',
                      zIndex: 3,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {/* Legal Attribution Badge for External Content */}
                    {video.attribution_text && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {video.external_source_url ? (
                          <a
                            href={video.external_source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: 'rgba(0, 0, 0, 0.65)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              color: '#cbd5e1',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              textDecoration: 'none',
                            }}
                          >
                            <span>{video.attribution_text}</span>
                            <ExternalLink size={10} />
                          </a>
                        ) : (
                          <span
                            style={{
                              background: 'rgba(0, 0, 0, 0.65)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              color: '#cbd5e1',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                            }}
                          >
                            {video.attribution_text}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Author row + Follow button */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {video.source === 'community' || !video.source ? (
                        <>
                          <Link
                            href={`/profile/${video.user_id}`}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: 'var(--primary-gradient)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: '0.9rem',
                              textDecoration: 'none',
                              border: '2px solid rgba(255, 255, 255, 0.3)',
                            }}
                          >
                            {video.author_name.charAt(0).toUpperCase()}
                          </Link>
                          <Link
                            href={`/profile/${video.user_id}`}
                            style={{
                              color: '#fff',
                              fontWeight: 600,
                              fontSize: '0.95rem',
                              textDecoration: 'none',
                              textShadow: '0 2px 4px rgba(0,0,0,0.6)',
                            }}
                          >
                            @{video.author_name}
                          </Link>
                        </>
                      ) : (
                        <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>
                          @{video.author_name}
                        </div>
                      )}

                      {user && user.user_id !== video.user_id && (video.source === 'community' || !video.source) && (
                        <button
                          onClick={() => handleFollowToggle(video.user_id)}
                          style={{
                            padding: '3px 10px',
                            borderRadius: '999px',
                            background: isFollowed ? 'rgba(255, 255, 255, 0.2)' : 'var(--primary-light)',
                            border: 'none',
                            color: isFollowed ? '#fff' : '#000',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          {isFollowed ? (
                            <>
                              <Check size={12} /> Following
                            </>
                          ) : (
                            <>
                              <UserPlus size={12} /> Follow
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Title */}
                    <h4
                      style={{
                        margin: 0,
                        fontSize: '0.95rem',
                        fontWeight: 500,
                        color: '#f1f5f9',
                        lineHeight: 1.3,
                        textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                      }}
                    >
                      {video.title}
                    </h4>

                    {/* Hashtags */}
                    {video.hashtags && video.hashtags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {video.hashtags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            style={{
                              fontSize: '0.8rem',
                              color: 'var(--primary-light)',
                              fontWeight: 600,
                            }}
                          >
                            #{tag.replace(/^#/, '')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Floating Engagement Bar */}
                  <div
                    style={{
                      position: 'absolute',
                      right: '8px',
                      bottom: '24px',
                      zIndex: 4,
                    }}
                  >
                    <EngagementBar video={video} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </main>
  );
}
