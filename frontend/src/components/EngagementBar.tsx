'use client';

import React, { useState } from 'react';
import { Heart, Bookmark, MessageSquare, Share2, Send, X, Flag, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ui';
import { VideoComment, VideoContent } from '../lib/types';
import ReportModal from './ReportModal';
import { IconButton, Button, Avatar, Spinner } from './ui';

export interface EngagementBarProps {
  videoId?: string;
  video?: VideoContent;
  initialLikes?: number;
  initialSaves?: number;
  initialCommentsCount?: number;
  initialLiked?: boolean;
  initialSaved?: boolean;
  videoUrl?: string;
  layout?: 'rail' | 'horizontal';
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
  layout = 'rail',
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
    const nextState = !liked;
    setLiked(nextState);
    setLikesCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));

    try {
      const res = await api.content.toggleLike(resolvedVideoId);
      setLiked(res.liked);
      setLikesCount(res.likes_count);
    } catch {
      setLiked(!nextState);
      setLikesCount((prev) => (!nextState ? prev + 1 : Math.max(0, prev - 1)));
    }
  };

  const handleSave = async () => {
    if (!user) {
      info('Please sign in to bookmark this reel.');
      return;
    }
    const nextState = !saved;
    setSaved(nextState);
    setSavesCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));

    try {
      const res = await api.content.toggleSave(resolvedVideoId);
      setSaved(res.saved);
      setSavesCount(res.saves_count);
      if (res.saved) success('Reel saved to your bookmarks.');
    } catch {
      setSaved(!nextState);
      setSavesCount((prev) => (!nextState ? prev + 1 : Math.max(0, prev - 1)));
    }
  };

  const handleShare = async () => {
    const url = resolvedUrl || (typeof window !== 'undefined' ? window.location.href : '');
    if (navigator.share) {
      try {
        await navigator.share({
          title: video?.title || 'Watch this reel on VidSnap.AI',
          url,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      success('Reel link copied to clipboard!');
    }
  };

  const openComments = async () => {
    setCommentsOpen(true);
    setLoadingComments(true);
    try {
      const res = await api.content.listComments(resolvedVideoId);
      setComments(res);
    } catch {
      // Ignored
    } finally {
      setLoadingComments(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      info('Please sign in to comment.');
      return;
    }
    const text = newCommentText.trim();
    if (!text || submittingComment) return;

    setSubmittingComment(true);
    try {
      const newComment = await api.content.addComment(resolvedVideoId, text);
      setComments((prev) => [newComment, ...prev]);
      setCommentsCount((c) => c + 1);
      setNewCommentText('');
      success('Comment posted!');
    } catch (err: unknown) {
      toastError((err as Error).message || 'Failed to post comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const isRail = layout === 'rail';

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: isRail ? 'column' : 'row',
          alignItems: 'center',
          gap: isRail ? 'var(--space-3)' : 'var(--space-4)',
        }}
      >
        {/* Like Button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <button
            type="button"
            onClick={handleLike}
            aria-label={liked ? 'Unlike reel' : 'Like reel'}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--scrim-medium)',
              backdropFilter: 'blur(8px)',
              border: '1px solid var(--player-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: liked ? 'var(--danger)' : 'var(--player-text-primary)',
              cursor: 'pointer',
              transition: 'transform var(--transition-fast), color var(--transition-fast)',
            }}
          >
            <Heart size={22} fill={liked ? 'currentColor' : 'none'} />
          </button>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--player-text-secondary)' }}>
            {likesCount}
          </span>
        </div>

        {/* Comment Button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <button
            type="button"
            onClick={openComments}
            aria-label="View comments"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--scrim-medium)',
              backdropFilter: 'blur(8px)',
              border: '1px solid var(--player-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--player-text-primary)',
              cursor: 'pointer',
              transition: 'transform var(--transition-fast)',
            }}
          >
            <MessageSquare size={22} />
          </button>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--player-text-secondary)' }}>
            {commentsCount}
          </span>
        </div>

        {/* Save / Bookmark Button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <button
            type="button"
            onClick={handleSave}
            aria-label={saved ? 'Remove bookmark' : 'Bookmark reel'}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--scrim-medium)',
              backdropFilter: 'blur(8px)',
              border: '1px solid var(--player-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: saved ? 'var(--raw-sage)' : 'var(--player-text-primary)',
              cursor: 'pointer',
              transition: 'transform var(--transition-fast), color var(--transition-fast)',
            }}
          >
            <Bookmark size={22} fill={saved ? 'currentColor' : 'none'} />
          </button>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--player-text-secondary)' }}>
            {savesCount}
          </span>
        </div>

        {/* Share Button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <button
            type="button"
            onClick={handleShare}
            aria-label="Share reel"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--scrim-medium)',
              backdropFilter: 'blur(8px)',
              border: '1px solid var(--player-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--player-text-primary)',
              cursor: 'pointer',
              transition: 'transform var(--transition-fast)',
            }}
          >
            <Share2 size={22} />
          </button>
        </div>

        {/* Report Button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <button
            type="button"
            onClick={() => setReportModalOpen(true)}
            aria-label="Report reel"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--scrim-medium)',
              backdropFilter: 'blur(8px)',
              border: '1px solid var(--player-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--player-text-muted)',
              cursor: 'pointer',
              transition: 'transform var(--transition-fast)',
            }}
          >
            <Flag size={18} />
          </button>
        </div>
      </div>

      {/* Comments Drawer / Sheet */}
      {commentsOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'var(--overlay-scrim)',
            backdropFilter: 'blur(4px)',
            zIndex: 500,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setCommentsOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="comments-title"
            style={{
              width: '100%',
              maxWidth: '440px',
              height: '100%',
              backgroundColor: 'var(--surface-paper)',
              borderLeft: '1px solid var(--border-medium)',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              padding: 'var(--space-6)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 'var(--space-3)',
                borderBottom: '1px solid var(--border-subtle)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <MessageSquare size={18} style={{ color: 'var(--brand-primary)' }} />
                <h3 id="comments-title" style={{ fontSize: 'var(--text-base)', margin: 0 }}>
                  Comments ({commentsCount})
                </h3>
              </div>
              <IconButton icon={<X size={18} />} aria-label="Close comments" onClick={() => setCommentsOpen(false)} size="sm" />
            </div>

            {/* Comments List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {loadingComments ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
                  <Spinner size="md" />
                </div>
              ) : comments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-4)', color: 'var(--text-muted)' }}>
                  <p>No comments yet. Be the first to start the conversation!</p>
                </div>
              ) : (
                comments.map((c) => (
                  <div key={c.comment_id} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                    <Avatar fallback={c.user_name || 'U'} size="sm" />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
                        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)' }}>
                          {c.user_name || 'Anonymous'}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {new Date(c.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', marginTop: '2px', lineHeight: 1.4 }}>
                        {c.text}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment Form */}
            <form
              onSubmit={handlePostComment}
              style={{
                display: 'flex',
                gap: 'var(--space-2)',
                paddingTop: 'var(--space-3)',
                borderTop: '1px solid var(--border-subtle)',
                marginTop: 'var(--space-3)',
              }}
            >
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder={user ? 'Add a supportive comment...' : 'Sign in to comment'}
                disabled={!user || submittingComment}
                style={{
                  flex: 1,
                  padding: 'var(--space-2) var(--space-4)',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid var(--border-medium)',
                  backgroundColor: 'var(--surface-input)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
              <Button
                variant="primary"
                size="sm"
                type="submit"
                disabled={!newCommentText.trim() || !user || submittingComment}
                loading={submittingComment}
              >
                <Send size={15} />
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Report Modal */}
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        targetType="video"
        targetId={resolvedVideoId}
        targetTitle={video?.title}
      />
    </>
  );
}
export default EngagementBar;
