'use client';

/**
 * VidSnap.AI Admin Reel Moderation
 * Inspect and review reels generated across the entire platform.
 */

import React, { useState, useEffect } from 'react';
import { Film, Search, Play, Download, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { AdminReel } from '@/lib/types';
import {
  Button,
  Input,
  Badge,
  Spinner,
} from '@/components/ui';
import styles from '../admin.module.css';

export default function AdminReelsPage() {
  const { error: toastError } = useToast();

  const [reels, setReels] = useState<AdminReel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalReel, setActiveModalReel] = useState<AdminReel | null>(null);

  useEffect(() => {
    fetchReels();
  }, []);

  const fetchReels = async () => {
    setLoading(true);
    try {
      const data = await api.admin.getReels(0, 100);
      setReels(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch reels';
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  const filteredReels = reels.filter((r) =>
    (r.user_email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.job_id || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Header & Search */}
      <div className={styles.toolbar}>
        <div>
          <h2 style={{ fontSize: 'var(--text-xl)', fontFamily: 'var(--font-display)', margin: '0 0 var(--space-1) 0', color: 'var(--color-text)' }}>
            Platform Reel Directory
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', margin: 0 }}>
            {reels.length} total reels rendered by the FFmpeg worker.
          </p>
        </div>

        <div style={{ width: '280px' }}>
          <Input
            type="text"
            placeholder="Search by creator email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search size={16} />}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spinner size="lg" />
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-3)' }}>
            Loading reels...
          </p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.adminTable}>
            <thead>
              <tr>
                <th>Job ID</th>
                <th>Creator Email</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReels.map((r) => (
                <tr key={r.job_id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    {r.job_id.slice(0, 12)}...
                  </td>

                  <td style={{ color: 'var(--color-text)', fontWeight: 600 }}>
                    {r.user_email}
                  </td>

                  <td>
                    <Badge
                      variant={r.status === 'completed' ? 'success' : 'warning'}
                      size="sm"
                    >
                      {r.status}
                    </Badge>
                  </td>

                  <td style={{ color: 'var(--color-text-muted)' }}>
                    {r.duration ? `${r.duration}s` : 'N/A'}
                  </td>

                  <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                    {r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Recent'}
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    {r.reel_url ? (
                      <div style={{ display: 'inline-flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setActiveModalReel(r)}
                          leftIcon={<Play size={13} />}
                        >
                          Preview
                        </Button>
                        <a
                          href={r.reel_url}
                          download="reel.mp4"
                          title="Download MP4"
                        >
                          <Button variant="ghost" size="sm" aria-label="Download MP4">
                            <Download size={13} />
                          </Button>
                        </a>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>No URL</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Fullscreen Video Modal */}
      {activeModalReel && activeModalReel.reel_url && (
        <div className={styles.modalBackdrop}>
          <div className={styles.videoModalContent}>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-2)' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveModalReel(null)}
                style={{ color: 'var(--color-cream-100)' }}
                aria-label="Close preview"
              >
                <X size={20} />
              </Button>
            </div>

            <div className={styles.videoContainer}>
              <video
                src={activeModalReel.reel_url}
                controls
                autoPlay
                loop
                playsInline
                className={styles.videoPlayer}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
