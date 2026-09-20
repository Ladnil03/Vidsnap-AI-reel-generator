'use client';

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
  Share2, 
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { api } from '@/lib/api';
import { UserProfile, VideoContent } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import EngagementBar from '@/components/EngagementBar';

export default function CreatorProfilePage() {
  const params = useParams();
  const userId = params?.id as string;
  const { user } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reels, setReels] = useState<VideoContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState<VideoContent | null>(null);

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
      .catch((err) => console.error(err))
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
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ paddingTop: '100px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading creator profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ paddingTop: '120px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <h2>User Not Found</h2>
        <Link href="/feed" style={{ color: 'var(--primary-light)' }}>
          Back to Feed
        </Link>
      </div>
    );
  }

  const isSelf = user?.user_id === profile.user_id;

  return (
    <div style={{ paddingTop: '88px', minHeight: '100vh', paddingBottom: '4rem' }}>
      <div className="container" style={{ maxWidth: '1000px' }}>
        {/* Back link */}
        <Link
          href="/feed"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontSize: '0.9rem',
            marginBottom: '1.5rem',
          }}
        >
          <ArrowLeft size={16} /> Back to Feed
        </Link>

        {/* Profile Card Header */}
        <div
          style={{
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            marginBottom: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1.5rem',
              flexWrap: 'wrap',
            }}
          >
            {/* Avatar and Details */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div
                style={{
                  width: '76px',
                  height: '76px',
                  borderRadius: '50%',
                  background: 'var(--primary-gradient)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '2rem',
                  fontWeight: 800,
                  boxShadow: '0 4px 16px var(--primary-glow)',
                }}
              >
                {profile.name.charAt(0).toUpperCase()}
              </div>

              <div>
                <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.75rem', fontWeight: 800 }}>
                  {profile.name}
                </h1>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  @{profile.name.toLowerCase().replace(/\s+/g, '')}
                </div>
                {profile.bio && (
                  <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.95rem', maxWidth: '500px', lineHeight: 1.4 }}>
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div>
              {!isSelf ? (
                <button
                  onClick={handleFollowToggle}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 22px',
                    borderRadius: 'var(--radius-sm)',
                    background: profile.is_following ? 'rgba(255, 255, 255, 0.1)' : 'var(--brand-gradient)',
                    border: profile.is_following ? '1px solid var(--border-subtle)' : 'none',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    boxShadow: profile.is_following ? 'none' : '0 4px 14px var(--primary-glow)',
                    transition: 'all 0.2s',
                  }}
                >
                  {profile.is_friend ? (
                    <>
                      <Check size={18} /> Mutual Friends
                    </>
                  ) : profile.is_following ? (
                    <>
                      <Check size={18} /> Following
                    </>
                  ) : (
                    <>
                      <UserPlus size={18} /> Follow
                    </>
                  )}
                </button>
              ) : (
                <Link
                  href="/profile"
                  style={{
                    padding: '10px 20px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                  }}
                >
                  Edit Profile
                </Link>
              )}
            </div>
          </div>

          {/* Social Stats Numbers */}
          <div
            style={{
              display: 'flex',
              gap: '2.5rem',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '1.25rem',
            }}
          >
            <div>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {profile.followers_count}
              </span>
              <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Followers
              </span>
            </div>
            <div>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {profile.following_count}
              </span>
              <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Following
              </span>
            </div>
            <div>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {reels.length}
              </span>
              <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Reels
              </span>
            </div>
          </div>

          {/* Joined Communities Badges */}
          {profile.communities && profile.communities.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tribes:</span>
              {profile.communities.map((c) => (
                <span
                  key={c.community_id}
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: '999px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    color: 'var(--primary-light)',
                  }}
                >
                  c/{c.slug}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Creator's Published Reels Grid */}
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Film size={20} /> Published Reels
        </h2>

        {reels.length === 0 ? (
          <div
            style={{
              padding: '3rem',
              textAlign: 'center',
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)',
            }}
          >
            No published reels yet from this creator.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '1rem',
            }}
          >
            {reels.map((reel) => (
              <div
                key={reel.video_id}
                onClick={() => setActiveVideo(reel)}
                style={{
                  position: 'relative',
                  aspectRatio: '9 / 16',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: '#000',
                  border: '1px solid var(--glass-border)',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <video
                  src={reel.video_url}
                  poster={reel.thumbnail_url}
                  muted
                  playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />

                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    padding: '12px',
                  }}
                >
                  <h4
                    style={{
                      margin: '0 0 4px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#fff',
                      lineHeight: 1.3,
                    }}
                  >
                    {reel.title}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)' }}>
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
      </div>

      {/* Modal Video Player */}
      {activeVideo && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem',
          }}
          onClick={() => setActiveVideo(null)}
        >
          <div
            style={{
              position: 'relative',
              height: '90vh',
              aspectRatio: '9 / 16',
              maxWidth: '420px',
              borderRadius: '16px',
              overflow: 'hidden',
              background: '#000',
              boxShadow: '0 16px 48px rgba(0, 0, 0, 0.9)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src={activeVideo.video_url}
              poster={activeVideo.thumbnail_url}
              controls
              autoPlay
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{ position: 'absolute', right: '8px', bottom: '24px', zIndex: 5 }}>
              <EngagementBar video={activeVideo} />
            </div>
            <button
              onClick={() => setActiveVideo(null)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(0, 0, 0, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#fff',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 6,
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
