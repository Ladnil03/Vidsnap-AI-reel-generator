'use client';

/**
 * VidSnap.AI Admin Reel Moderation
 * Inspect and review reels generated across the entire platform.
 */

import React, { useState, useEffect } from 'react';
import { Film, Search, Play, Download, X, Calendar, Clock, Loader2 } from 'lucide-react';
import { api } from '../../../lib/api';
import { useToast } from '../../../components/Toast';
import { AdminReel } from '../../../lib/types';

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
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '4px' }}>Platform Reel Directory</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {reels.length} total reels rendered by the FFmpeg worker.
          </p>
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <input
            type="text"
            placeholder="Search by creator email..."
            className="form-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '36px', fontSize: '0.85rem' }}
          />
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Loader2 size={32} color="var(--primary-light)" style={{ animation: 'spinSlow 2s linear infinite', margin: '0 auto 12px auto' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading reels...</p>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '0', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.02)' }}>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>Job ID</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>Creator Email</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>Duration</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>Created</th>
                <th style={{ padding: '14px 18px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReels.map((r) => (
                <tr key={r.job_id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '14px 18px', fontFamily: 'var(--font-family-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {r.job_id.slice(0, 12)}...
                  </td>

                  <td style={{ padding: '14px 18px', color: 'var(--text-primary)', fontWeight: 500 }}>
                    {r.user_email}
                  </td>

                  <td style={{ padding: '14px 18px' }}>
                    <span className={`badge ${r.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                      {r.status}
                    </span>
                  </td>

                  <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                    {r.duration ? `${r.duration}s` : 'N/A'}
                  </td>

                  <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Recent'}
                  </td>

                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    {r.reel_url ? (
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setActiveModalReel(r)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                        >
                          <Play size={13} />
                          <span>Preview</span>
                        </button>
                        <a
                          href={r.reel_url}
                          download="reel.mp4"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '6px 10px' }}
                          title="Download MP4"
                        >
                          <Download size={13} />
                        </a>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>No URL</span>
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

            <a
              href={activeModalReel.reel_url}
              download="moderation_reel.mp4"
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px' }}
            >
              <Download size={16} />
              <span>Download for Inspection</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
