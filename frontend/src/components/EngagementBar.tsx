'use client';

/**
 * VidSnap.AI Video Engagement Bar
 * Interactive Likes, Saves/Bookmarks, Comments drawer, and Share actions.
 */

import React, { useState } from 'react';
import { Heart, Bookmark, MessageSquare, Share2, Send, X, Loader2, Flag } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { VideoComment, VideoContent } from '../lib/types';
import ReportModal from './ReportModal';

export interface EngagementBarProps {
  videoId?: string;
  video?: VideoContent;
  initialLikes?: number;
  initialSaves?: number;
  initialCommentsCount?: number;
  initialLiked?: boolean;
  initialSaved?: boolean;
  videoUrl?: string;
}

export function EngagementBar({
  videoId,
  video,
  initialLikes = 0,
  initialSaves = 0,
  initialCommentsCount = 0,
  initialLiked = false,
  initialSaved = false,
  videoUrl,
}: EngagementBarProps) {
  const { user } = useAuth();
  const { success, error: toastError, info } = useToast();

  const resolvedVideoId = video?.video_id || videoId || '';
  const resolvedLikes = video?.likes_count ?? initialLikes;
  const resolvedSaves = video?.saves_count ?? initialSaves;
  const resolvedComments = video?.comments_count ?? initialCommentsCount;
  const resolvedLiked = video?.has_liked ?? initialLiked;
  const resolvedSaved = video?.has_saved ?? initialSaved;
  const resolvedUrl = video?.video_url || videoUrl;

  const [liked, setLiked] = useState(resolvedLiked);
  const [likesCount, setLikesCount] = useState(resolvedLikes);

  const [saved, setSaved] = useState(resolvedSaved);
  const [savesCount, setSavesCount] = useState(resolvedSaves);

  const [commentsCount, setCommentsCount] = useState(resolvedComments);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const handleLike = async () => {
    if (!user) {
      info('Please sign in to like this reel.');
      return;
    }
    // Optimistic UI update
    const nextState = !liked;
    setLiked(nextState);
    setLikesCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));

    try {
      const res = await api.content.toggleLike(resolvedVideoId);
      setLiked(res.liked);
      setLikesCount(res.likes_count);
    } catch {
      // Revert on error
      setLiked(!nextState);
      setLikesCount((prev) => (!nextState ? prev + 1 : Math.max(0, prev - 1)));
    }
  };

  const handleSave = async () => {
    if (!user) {
      info('Please sign in to bookmark this reel.');
      return;
    }
    // Optimistic UI update
    const nextState = !saved;
    setSaved(nextState);
    setSavesCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));

    try {
      const res = await api.content.toggleSave(resolvedVideoId);
      setSaved(res.saved);
      setSavesCount(res.saves_count);
    } catch {
      setSaved(!nextState);
      setSavesCount((prev) => (!nextState ? prev + 1 : Math.max(0, prev - 1)));
    }
  };

  const handleOpenComments = async () => {
    setCommentsOpen(true);
    if (comments.length === 0) {
      setLoadingComments(true);
      try {
        const list = await api.content.listComments(resolvedVideoId);
        setComments(list);
      } catch {
        // Handled
      } finally {
        setLoadingComments(false);
      }
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      info('Please sign in to post comments.');
      return;
    }
    if (!newCommentText.trim()) return;

    setSubmittingComment(true);
    try {
      const comment = await api.content.addComment(resolvedVideoId, newCommentText.trim());
      setComments((prev) => [comment, ...prev]);
      setCommentsCount((prev) => prev + 1);
      setNewCommentText('');
      success('Comment added!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to post comment';
      toastError(msg);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleShare = () => {
    const url = resolvedUrl || (typeof window !== 'undefined' ? window.location.href : '');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      success('Link copied to clipboard!');
    }
  };

  return (
    <div>
      {/* Interaction Buttons Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '10px 0',
      }}>
        {/* Like */}
        <button
          onClick={handleLike}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: liked ? 'var(--accent-rose)' : 'var(--text-secondary)',
            fontSize: '0.85rem',
            fontWeight: 600,
            transition: 'transform 0.15s',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(1.2)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          title="Like video"
        >
          <Heart size={18} fill={liked ? 'var(--accent-rose)' : 'transparent'} />
          <span>{likesCount}</span>
        </button>

        {/* Save / Bookmark */}
        <button
          onClick={handleSave}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: saved ? '#fbbf24' : 'var(--text-secondary)',
            fontSize: '0.85rem',
            fontWeight: 600,
            transition: 'transform 0.15s',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(1.2)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          title="Bookmark video"
        >
          <Bookmark size={18} fill={saved ? '#fbbf24' : 'transparent'} />
          <span>{savesCount}</span>
        </button>

        {/* Comments */}
        <button
          onClick={handleOpenComments}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
          title="View comments"
        >
          <MessageSquare size={18} />
          <span>{commentsCount}</span>
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
            marginLeft: 'auto',
          }}
          title="Share video"
        >
          <Share2 size={18} />
        </button>

        {/* Report */}
        <button
          onClick={() => setReportModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
          title="Report inappropriate content"
        >
          <Flag size={16} />
        </button>
      </div>

      {/* Slide-out / Modal Comments Drawer */}
      {commentsOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <div style={{
            width: '100%',
            maxWidth: '420px',
            background: 'var(--bg-surface)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1px solid var(--glass-border)',
            boxShadow: 'var(--shadow-lg)',
            animation: 'fadeInUp 0.25s ease-out',
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid var(--glass-border)',
            }}>
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={18} color="var(--primary-light)" />
                <span>Comments ({commentsCount})</span>
              </h3>
              <button
                onClick={() => setCommentsOpen(false)}
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Comments List */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}>
              {loadingComments ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Loader2 size={24} color="var(--primary-light)" style={{ animation: 'spinSlow 2s linear infinite' }} />
                </div>
              ) : comments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  No comments yet. Be the first to share your thoughts!
                </div>
              ) : (
                comments.map((c) => (
                  <div key={c.comment_id} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--primary-light)' }}>{c.user_name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {c.created_at ? new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                      {c.text}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Comment Input */}
            <form
              onSubmit={handlePostComment}
              style={{
                padding: '16px 20px',
                borderTop: '1px solid var(--glass-border)',
                background: 'var(--bg-surface-elevated)',
                display: 'flex',
                gap: '10px',
              }}
            >
              <input
                type="text"
                placeholder={user ? "Add a comment..." : "Sign in to comment"}
                disabled={!user || submittingComment}
                className="form-input"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                style={{ fontSize: '0.875rem' }}
              />
              <button
                type="submit"
                disabled={!user || submittingComment || !newCommentText.trim()}
                className="btn btn-primary btn-sm"
                style={{ padding: '0 14px' }}
              >
                {submittingComment ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* User Content Reporting Modal */}
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        targetType="video"
        targetId={resolvedVideoId}
        targetTitle={video?.title}
      />
    </div>
  );
}

export default EngagementBar;
