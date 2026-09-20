'use client';

/**
 * VidSnap.AI Reel Gallery
 * Searchable personal reel library with video modal, download, and soft-delete.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Film, 
  Search, 
  Play, 
  Download, 
  Trash2, 
  Sparkles, 
  Calendar, 
  Clock, 
  X, 
  Share2, 
  Loader2,
  LogIn
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { api } from '../../lib/api';
import { ReelItem } from '../../lib/types';

export default function GalleryPage() {
  const { user, loading: authLoading } = useAuth();
  const { success, error: toastError } = useToast();

  const [reels, setReels] = useState<ReelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalReel, setActiveModalReel] = useState<ReelItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchReels = async () => {
      try {
        const data = await api.reelStudio.getUserReels(50);
        setReels(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load gallery';
        toastError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchReels();
  }, [user, toastError]);

  const handleDelete = async (jobId: string) => {
    if (!confirm('Are you sure you want to remove this reel from your gallery?')) {
      return;
    }

    setDeletingId(jobId);
    try {
      await api.reelStudio.deleteReel(jobId);
      setReels((prev) => prev.filter((r) => r.job_id !== jobId));
      if (activeModalReel?.job_id === jobId) {
        setActiveModalReel(null);
      }
      success('Reel removed from gallery.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete reel';
      toastError(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const copyShareLink = (url: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(url);
      success('Reel link copied to clipboard!');
    }
  };

  const filteredReels = reels.filter((r) =>
    (r.voiceover_text || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!authLoading && !user) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '80px 16px' }}>
        <div className="glass-card" style={{ maxWidth: '440px', margin: '0 auto', padding: '40px' }}>
          <Film size={40} color="var(--primary-light)" style={{ margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Sign in to View Gallery</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>
            Your rendered AI reels will be safely stored here for playback and download.
          </p>
          <Link href="/login" className="btn btn-primary">
            <LogIn size={16} />
            <span>Sign In</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBottom: '60px' }}>
      {/* Header & Search */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '32px',
        paddingBottom: '20px',
        borderBottom: '1px solid var(--glass-border)',
      }}>
        <div>
          <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Film size={26} color="var(--primary-light)" />
            <span>My Reel Gallery</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            {reels.length} {reels.length === 1 ? 'reel' : 'reels'} created with 720p vertical encoding.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Search bar */}
          <div style={{ position: 'relative', width: '240px' }}>
            <input
              type="text"
              placeholder="Search script..."
              className="form-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '36px', paddingRight: '12px', fontSize: '0.85rem' }}
            />
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
          </div>

          <Link href="/create" className="btn btn-primary btn-sm" style={{ padding: '9px 16px' }}>
            <Sparkles size={15} />
            <span>Create New</span>
          </Link>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Loader2 size={36} color="var(--primary-light)" style={{ animation: 'spinSlow 2s linear infinite', margin: '0 auto 12px auto' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading your gallery...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && reels.length === 0 && (
        <div className="glass-card" style={{
          textAlign: 'center',
          padding: '60px 20px',
          maxWidth: '520px',
          margin: '40px auto',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: 'var(--radius-xl)',
            background: 'rgba(99, 102, 241, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
          }}>
            <Film size={32} color="var(--primary-light)" />
          </div>
          <h3 style={{ fontSize: '1.35rem', marginBottom: '8px' }}>No Reels Created Yet</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: '1.6' }}>
            Transform your photos and creative scripts into viral vertical videos with AI voiceovers.
          </p>
          <Link href="/create" className="btn btn-primary">
            <Sparkles size={16} />
            <span>Create Your First Reel</span>
          </Link>
        </div>
      )}

      {/* Reel Cards Grid */}
      {!loading && reels.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '24px',
        }}>
          {filteredReels.map((reel) => (
            <div
              key={reel.job_id}
              className="glass-card"
              style={{
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                position: 'relative',
              }}
            >
              {/* 9:16 Video Preview Card */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '9 / 16',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  background: '#05070a',
                  border: '1px solid var(--glass-border)',
                  cursor: 'pointer',
                }}
                onClick={() => setActiveModalReel(reel)}
              >
                <video
                  src={reel.reel_url}
                  muted
                  playsInline
                  preload="metadata"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />

                {/* Hover Play Button Overlay */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0, 0, 0, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background var(--transition-fast)',
                }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'var(--primary-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 14px var(--primary-glow)',
                  }}>
                    <Play size={20} color="#fff" style={{ marginLeft: '3px' }} />
                  </div>
                </div>

                {/* Duration Badge */}
                {reel.duration && (
                  <span style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(0, 0, 0, 0.7)',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    <Clock size={11} />
                    {reel.duration}s
                  </span>
                )}
              </div>

              {/* Reel Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <p style={{
                  fontSize: '0.85rem',
                  color: 'var(--text-primary)',
                  fontWeight: 500,
                  lineHeight: '1.4',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {reel.voiceover_text || 'AI Generated Reel'}
                </p>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                }}>
                  <Calendar size={12} />
                  <span>
                    {reel.created_at ? new Date(reel.created_at).toLocaleDateString() : 'Recent'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '8px',
                marginTop: 'auto',
                paddingTop: '8px',
                borderTop: '1px solid var(--glass-border)',
              }}>
                <a
                  href={reel.reel_url}
                  download="reel.mp4"
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1, padding: '6px' }}
                  title="Download MP4"
                >
                  <Download size={14} />
                  <span>Download</span>
                </a>

                <button
                  onClick={() => copyShareLink(reel.reel_url)}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '6px 10px' }}
                  title="Copy link"
                >
                  <Share2 size={14} />
                </button>

                <button
                  onClick={() => handleDelete(reel.job_id)}
                  disabled={deletingId === reel.job_id}
                  className="btn btn-danger btn-sm"
                  style={{ padding: '6px 10px' }}
                  title="Delete reel"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen Video Modal */}
      {activeModalReel && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
        }}>
          <div style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: '380px',
            width: '100%',
          }}>
            {/* Close Button */}
            <button
              onClick={() => setActiveModalReel(null)}
              style={{
                position: 'absolute',
                top: '-44px',
                right: 0,
                color: '#fff',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} />
            </button>

            {/* Modal Video Player */}
            <div className="reel-aspect-container" style={{ width: '100%', marginBottom: '16px' }}>
              <video
                src={activeModalReel.reel_url}
                controls
                autoPlay
                loop
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <a
                href={activeModalReel.reel_url}
                download="vidsnap_reel.mp4"
                className="btn btn-primary"
                style={{ flex: 1, padding: '10px' }}
              >
                <Download size={16} />
                <span>Download MP4</span>
              </a>

              <button
                onClick={() => copyShareLink(activeModalReel.reel_url)}
                className="btn btn-secondary"
                style={{ padding: '10px 14px' }}
              >
                <Share2 size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
