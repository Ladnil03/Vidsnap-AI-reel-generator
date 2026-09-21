'use client';

/**
 * VidSnap.AI Reel Gallery
 * Searchable personal reel library with video modal, download, and soft-delete.
 * Redesigned in the Forest & Paper design system.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Film,
  Search,
  Play,
  Download,
  Trash2,
  Share2,
  Plus,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { ReelItem } from '../../lib/types';
import {
  Button,
  IconButton,
  Card,
  Badge,
  Input,
  Modal,
  Spinner,
  EmptyState,
  useToast,
} from '@/components/ui';
import styles from './gallery.module.css';

export default function GalleryPage() {
  const { user, loading: authLoading } = useAuth();
  const { success, error: toastError } = useToast();

  const [reels, setReels] = useState<ReelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalReel, setActiveModalReel] = useState<ReelItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmReel, setDeleteConfirmReel] = useState<ReelItem | null>(null);

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
    setDeletingId(jobId);
    try {
      await api.reelStudio.deleteReel(jobId);
      setReels((prev) => prev.filter((r) => r.job_id !== jobId));
      if (activeModalReel?.job_id === jobId) {
        setActiveModalReel(null);
      }
      setDeleteConfirmReel(null);
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
      <div className={styles.container}>
        <EmptyState
          icon={<Film size={40} />}
          title="Sign in to View Gallery"
          description="Your rendered AI reels are safely stored in your private gallery for playback and download."
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
          <h1 className={styles.title}>Reel Gallery</h1>
          <p className={styles.description}>
            Your collection of rendered 720p AI reels. Stream directly, download the MP4 asset, or share with friends.
          </p>
        </div>

        <Link href="/create">
          <Button variant="primary" leftIcon={<Plus size={18} />}>
            Create New Reel
          </Button>
        </Link>
      </div>

      {/* Search Input */}
      <div className={styles.searchWrap}>
        <Input
          type="text"
          placeholder="Filter reels by script keyword..."
          leftIcon={<Search size={18} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Gallery Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-16) 0' }}>
          <Spinner size="lg" style={{ margin: '0 auto var(--space-4) auto' }} />
          <p style={{ color: 'var(--text-muted)' }}>Fetching your rendered reels...</p>
        </div>
      ) : filteredReels.length === 0 ? (
        <EmptyState
          icon={<Film size={40} />}
          title={searchQuery ? 'No Matching Reels' : 'Gallery is Empty'}
          description={
            searchQuery
              ? `No reels match your search for '${searchQuery}'.`
              : 'You have not created any AI reels yet. Use our Reel Studio to craft your first video!'
          }
          actionLabel={searchQuery ? undefined : 'Create Your First Reel'}
          onAction={searchQuery ? undefined : () => { window.location.href = '/create'; }}
        />
      ) : (
        <div className={styles.grid}>
          {filteredReels.map((reel) => (
            <Card key={reel.job_id} variant="raised" className={styles.card}>
              <div>
                {/* Media Preview container */}
                <div
                  className={styles.mediaPreview}
                  onClick={() => setActiveModalReel(reel)}
                >
                  <video
                    src={reel.reel_url}
                    muted
                    preload="metadata"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div className={styles.playOverlay}>
                    <div className={styles.playBtnCircle}>
                      <Play size={20} style={{ marginLeft: '3px' }} />
                    </div>
                  </div>
                </div>

                {/* Metadata row */}
                <div className={styles.metaRow}>
                  <Badge variant="sage" size="sm">
                    {reel.status.toUpperCase()}
                  </Badge>
                  {reel.duration && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Clock size={12} /> {Math.round(reel.duration)}s
                    </span>
                  )}
                </div>

                {/* Voiceover text */}
                <p className={styles.voiceoverText}>
                  {reel.voiceover_text || 'AI Generated Voiceover Reel'}
                </p>
              </div>

              {/* Action row */}
              <div className={styles.actionsRow}>
                <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                  <IconButton
                    icon={<Share2 size={16} />}
                    aria-label="Share reel link"
                    variant="ghost"
                    size="sm"
                    onClick={() => copyShareLink(reel.reel_url)}
                  />
                  <a href={reel.reel_url} download target="_blank" rel="noopener noreferrer">
                    <IconButton
                      icon={<Download size={16} />}
                      aria-label="Download video MP4"
                      variant="ghost"
                      size="sm"
                    />
                  </a>
                </div>

                <IconButton
                  icon={<Trash2 size={16} />}
                  aria-label="Delete reel"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteConfirmReel(reel)}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* FULL VIDEO PLAYER MODAL */}
      <Modal
        isOpen={Boolean(activeModalReel)}
        onClose={() => setActiveModalReel(null)}
        title="Reel Playback"
        size="md"
      >
        {activeModalReel && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div
              style={{
                width: '100%',
                aspectRatio: '9 / 16',
                maxHeight: '520px',
                background: 'var(--player-bg)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                margin: '0 auto',
              }}
            >
              <video
                src={activeModalReel.reel_url}
                controls
                autoPlay
                loop
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>

            {activeModalReel.voiceover_text && (
              <div
                style={{
                  padding: 'var(--space-3) var(--space-4)',
                  background: 'var(--bg-sunken)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                }}
              >
                <strong style={{ color: 'var(--text-primary)' }}>Voiceover:</strong>{' '}
                {activeModalReel.voiceover_text}
              </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <Button
                variant="secondary"
                style={{ flex: 1 }}
                leftIcon={<Share2 size={16} />}
                onClick={() => copyShareLink(activeModalReel.reel_url)}
              >
                Share
              </Button>
              <a
                href={activeModalReel.reel_url}
                download
                target="_blank"
                rel="noopener noreferrer"
                style={{ flex: 1 }}
              >
                <Button variant="primary" style={{ width: '100%' }} leftIcon={<Download size={16} />}>
                  Download MP4
                </Button>
              </a>
            </div>
          </div>
        )}
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={Boolean(deleteConfirmReel)}
        onClose={() => setDeleteConfirmReel(null)}
        title="Delete Reel"
        size="sm"
      >
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <Trash2 size={36} style={{ color: 'var(--danger)', margin: '0 auto var(--space-3) auto' }} />
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
            Remove from Gallery?
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', margin: 0 }}>
            This will remove this 720p reel from your personal library. This action cannot be undone.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Button
            variant="ghost"
            onClick={() => setDeleteConfirmReel(null)}
            style={{ flex: 1 }}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={deletingId === deleteConfirmReel?.job_id}
            onClick={() => deleteConfirmReel && handleDelete(deleteConfirmReel.job_id)}
            style={{ flex: 1 }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
