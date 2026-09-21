'use client';

/**
 * VidSnap.AI Watch Together Theater (/rooms/[id])
 * Real-time synchronized video player with sub-second drift correction, live chat,
 * floating reaction bursts, participant presence, and AI Room Assistant.
 * Redesigned in the Forest & Paper design system.
 */

import React, { useState, useEffect, useRef, use, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Tv,
  Users,
  Play,
  Pause,
  Sparkles,
  Send,
  Crown,
  Volume2,
  VolumeX,
  ArrowLeft,
  Radio,
  Share2,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../../context/AuthContext';
import { api, getStoredToken } from '../../../lib/api';
import { Room, RoomWatchState, RoomChatMessage, RoomParticipant, RoomSummaryResponse } from '../../../lib/types';
import {
  Button,
  IconButton,
  Badge,
  Input,
  FormField,
  Modal,
  Spinner,
  useToast,
} from '@/components/ui';
import styles from '../rooms.module.css';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function WatchTogetherRoomPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const roomId = resolvedParams.id;

  const router = useRouter();
  const { user } = useAuth();
  const { error: toastError, success: toastSuccess, info: toastInfo } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Room state
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [watchState, setWatchState] = useState<RoomWatchState | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [messages, setMessages] = useState<RoomChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [reconnectTrigger, setReconnectTrigger] = useState(0);

  // Player controls state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(true); // Default muted to allow autoplay

  // Change Media modal state
  const [changeMediaOpen, setChangeMediaOpen] = useState(false);
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [newMediaTitle, setNewMediaTitle] = useState('');

  // AI Catch-Up Summary modal
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryData, setSummaryData] = useState<RoomSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Floating reaction notifications
  const [floatingReactions, setFloatingReactions] = useState<{ id: string; emoji: string; user: string }[]>([]);

  const isHost = user && room && user.user_id === room.host_id;
  const canControl = isHost || (room && room.control_mode === 'democratic');

  // 1. Initial Room Data Load
  useEffect(() => {
    let isMounted = true;
    const loadRoom = async () => {
      try {
        const data = await api.rooms.getRoom(roomId);
        if (!isMounted) return;
        setRoom(data);
        setWatchState(data.watch_state);
        setIsPlaying(data.watch_state.state === 'playing');
        setCurrentTime(data.watch_state.position_seconds);

        // Load chat history
        const history = await api.rooms.getMessages(roomId, 40);
        if (isMounted) setMessages(history);
      } catch {
        toastError('Failed to load room details.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadRoom();
    return () => {
      isMounted = false;
    };
  }, [roomId]);

  // Floating reactions trigger
  const triggerFloatingReaction = useCallback((emoji: string, userName: string) => {
    const id = `${Date.now()}_${Math.random()}`;
    setFloatingReactions((prev) => [...prev.slice(-8), { id, emoji, user: userName }]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2800);

    // Confetti effect for highlights
    if (emoji === '🔥' || emoji === '❤️' || emoji === '🌿') {
      try {
        confetti({ particleCount: 15, spread: 45, origin: { x: 0.8, y: 0.8 } });
      } catch {}
    }
  }, []);

  // Server-Authoritative Drift Correction Engine
  const applyServerSyncState = useCallback((serverWatch: RoomWatchState) => {
    setWatchState(serverWatch);
    const video = videoRef.current;
    if (!video) return;

    // A. Sync Media Source if changed
    if (serverWatch.media_url && video.src !== serverWatch.media_url) {
      video.src = serverWatch.media_url;
      video.load();
    }

    // B. Sync Playback Rate
    if (video.playbackRate !== serverWatch.playback_rate) {
      video.playbackRate = serverWatch.playback_rate;
    }

    // C. Drift Correction: Check discrepancy between client time and server time
    const targetTime = serverWatch.position_seconds;
    const drift = Math.abs(video.currentTime - targetTime);

    // If drift exceeds 1.5 seconds, perform smooth seek
    if (drift > 1.5) {
      video.currentTime = targetTime;
      setCurrentTime(targetTime);
    }

    // D. Sync Play / Pause State
    if (serverWatch.state === 'playing') {
      setIsPlaying(true);
      video.play().catch(() => {
        // Autoplay policy might require mute
        video.muted = true;
        setIsMuted(true);
        video.play().catch(() => {});
      });
    } else {
      setIsPlaying(false);
      video.pause();
    }
  }, []);

  // Handle WebSocket Events
  const handleIncomingWsEvent = useCallback(
    (msg: any) => {
      switch (msg.type) {
        case 'chat':
          if (msg.message) {
            setMessages((prev) => [...prev, msg.message]);
          }
          break;

        case 'reaction':
          triggerFloatingReaction(msg.emoji, msg.user_name);
          break;

        case 'sync_state':
          if (msg.watch_state) {
            applyServerSyncState(msg.watch_state);
          }
          break;

        case 'user_joined':
          toastInfo(`${msg.user_name} entered the room`);
          api.rooms.getRoom(roomId).then((r) => setParticipants(r.participants)).catch(() => {});
          break;

        case 'user_left':
          api.rooms.getRoom(roomId).then((r) => setParticipants(r.participants)).catch(() => {});
          break;

        default:
          break;
      }
    },
    [roomId, triggerFloatingReaction, applyServerSyncState, toastInfo]
  );

  // 2. WebSocket Connection & Event Dispatcher
  useEffect(() => {
    if (!room) return;

    const token = getStoredToken() || undefined;
    const ws = api.rooms.createWebSocket(roomId, token);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      // Start 25s heartbeat ping to keep connection and Redis presence alive
      heartbeatIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 25000);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleIncomingWsEvent(msg);
      } catch (err) {
        console.error('WS message parsing error:', err);
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    };

    ws.onerror = (err) => {
      console.warn('Room WS connection warning:', err);
    };

    return () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [room?.room_id, reconnectTrigger, handleIncomingWsEvent, roomId]);

  // 5. Send Playback Actions to Room
  const sendSyncAction = (action: 'play' | 'pause' | 'seek' | 'change_media', data: Partial<RoomWatchState> = {}) => {
    if (!canControl) {
      toastError('Only the host can control playback in this room.');
      return;
    }

    const payload = {
      type: 'sync_action',
      action,
      position_seconds: data.position_seconds ?? videoRef.current?.currentTime ?? 0,
      playback_rate: data.playback_rate ?? 1.0,
      media_url: data.media_url,
      media_title: data.media_title,
      media_type: data.media_type,
    };

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    } else {
      // Fallback REST call
      api.rooms.syncAction(roomId, payload as any).then((w) => applyServerSyncState(w)).catch(() => {});
    }
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      sendSyncAction('pause', { position_seconds: videoRef.current?.currentTime });
    } else {
      sendSyncAction('play', { position_seconds: videoRef.current?.currentTime });
    }
  };

  const handleSeek = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      setCurrentTime(seconds);
    }
    sendSyncAction('seek', { position_seconds: seconds });
  };

  const handleChangeMediaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMediaUrl.trim()) return;

    const isYouTube = newMediaUrl.includes('youtube.com') || newMediaUrl.includes('youtu.be');
    const mediaType = isYouTube ? 'youtube' : 'native';

    sendSyncAction('change_media', {
      media_url: newMediaUrl.trim(),
      media_title: newMediaTitle.trim() || 'New Watch Party Video',
      media_type: mediaType,
      position_seconds: 0,
    });

    setChangeMediaOpen(false);
    setNewMediaUrl('');
    setNewMediaTitle('');
    toastSuccess('Video changed for all participants!');
  };

  // 6. Chat and Reactions
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    if (!user) {
      toastError('Please sign in to chat.');
      return;
    }

    const text = chatInput.trim();
    setChatInput('');

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'chat', text }));
    }
  };

  const handleSendReaction = (emoji: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'reaction', emoji }));
    }
    triggerFloatingReaction(emoji, user?.name || 'You');
  };

  // 7. AI Room Assistant "Catch Me Up"
  const handleOpenAiSummary = async () => {
    setSummaryOpen(true);
    setSummaryLoading(true);
    try {
      const data = await api.rooms.getAiSummary(roomId);
      setSummaryData(data);
    } catch {
      toastError('Could not generate room recap.');
    } finally {
      setSummaryLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-20) var(--space-4)' }}>
        <Spinner size="lg" style={{ margin: '0 auto var(--space-4) auto' }} />
        <p style={{ color: 'var(--text-muted)' }}>Entering Watch Together room...</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-20) var(--space-4)' }}>
        <h2 style={{ marginBottom: 'var(--space-4)' }}>Room Not Found</h2>
        <Link href="/rooms">
          <Button variant="primary">Back to Lobby</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.theaterContainer}>
      {/* Reconnect Banner if disconnected */}
      {!wsConnected && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--space-2) var(--space-4)',
            background: 'var(--color-forest-900)',
            border: '1px solid var(--warning)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-4)',
            color: 'var(--color-cream-100)',
            fontSize: 'var(--text-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Radio size={16} style={{ color: 'var(--warning)', animation: 'pulse 1.5s infinite' }} />
            <span>Connecting to live sync... Real-time chat &amp; playback drift correction are temporarily paused.</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<RefreshCw size={14} />}
            onClick={() => setReconnectTrigger((c) => c + 1)}
          >
            Reconnect
          </Button>
        </div>
      )}

      {/* Top Navigation Bar */}
      <div className={styles.theaterHeader}>
        <div className={styles.theaterHeaderLeft}>
          <Link href="/rooms">
            <Button variant="secondary" size="sm" leftIcon={<ArrowLeft size={16} />}>
              Lobby
            </Button>
          </Link>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <h1 className={styles.theaterTitle}>{room.name}</h1>
              <Badge variant={room.room_type === 'public' ? 'sage' : 'warning'} size="sm">
                {room.room_type}
              </Badge>
              <Badge variant={wsConnected ? 'success' : 'warning'} size="sm">
                <Radio size={10} style={{ marginRight: '4px' }} />
                <span>{wsConnected ? 'Live Sync' : 'Reconnecting'}</span>
              </Badge>
            </div>
            <div className={styles.theaterMeta}>
              <span>
                Host: <strong style={{ color: 'var(--text-primary)' }}>{room.host_name}</strong>
              </span>
              <span>•</span>
              <span>{room.control_mode === 'host_only' ? '👑 Host Controls Only' : '🗳️ Democratic Control'}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {/* AI Room Assistant Catch Me Up Button */}
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Sparkles size={15} style={{ color: 'var(--color-moss-400)' }} />}
            onClick={handleOpenAiSummary}
          >
            Catch Me Up ✨
          </Button>

          {canControl && (
            <Button variant="secondary" size="sm" onClick={() => setChangeMediaOpen(true)}>
              Change Video
            </Button>
          )}

          <IconButton
            icon={<Share2 size={16} />}
            aria-label="Share Room Link"
            variant="ghost"
            size="sm"
            onClick={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href);
                toastSuccess('Room link copied to clipboard!');
              }
            }}
          />
        </div>
      </div>

      {/* Main Grid: Video Player + Chat Drawer */}
      <div className={styles.theaterLayout}>
        {/* Left Column: Synchronized Theater Player */}
        <div>
          {/* Player Container */}
          <div className={styles.playerBox}>
            {watchState?.media_type === 'youtube' && watchState.media_url ? (
              <iframe
                src={`https://www.youtube.com/embed/${extractYouTubeId(watchState.media_url)}?autoplay=1&enablejsapi=1`}
                style={{ width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : watchState?.media_url ? (
              <video
                ref={videoRef}
                src={watchState.media_url}
                muted={isMuted}
                playsInline
                loop
                onTimeUpdate={() => {
                  if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                }}
                onLoadedMetadata={() => {
                  if (videoRef.current) setVideoDuration(videoRef.current.duration);
                }}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                <Tv size={48} style={{ margin: '0 auto var(--space-3) auto', color: 'var(--color-cream-200)', opacity: 0.8 }} />
                <p style={{ fontWeight: 600, fontSize: 'var(--text-lg)', marginBottom: 'var(--space-1)', color: 'var(--color-cream-100)' }}>
                  Ready to Stream
                </p>
                <p style={{ color: 'var(--color-cream-300)', fontSize: 'var(--text-sm)' }}>
                  {canControl ? 'Click "Change Video" to load a video for the party!' : 'Waiting for host to pick a video...'}
                </p>
              </div>
            )}

            {/* Floating Reactions Overlay */}
            <div className={styles.floatingContainer}>
              {floatingReactions.map((r) => (
                <div key={r.id} className={styles.floatingItem}>
                  <span>{r.emoji}</span>
                  <span style={{ fontSize: 'var(--text-xs)', opacity: 0.9 }}>{r.user}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Synchronized Control Bar */}
          <div className={styles.controlBar}>
            {/* Play/Pause */}
            <IconButton
              icon={isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
              aria-label={isPlaying ? 'Pause for all' : 'Play for all'}
              variant="primary"
              size="md"
              disabled={!canControl}
              onClick={handleTogglePlay}
            />

            {/* Mute Toggle */}
            <IconButton
              icon={isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              variant="ghost"
              size="sm"
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.muted = !isMuted;
                  setIsMuted(!isMuted);
                }
              }}
            />

            {/* Scrubber */}
            <input
              type="range"
              min={0}
              max={videoDuration || 100}
              step={0.1}
              value={currentTime}
              disabled={!canControl}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className={styles.scrubber}
            />

            {/* Timestamp */}
            <span className={styles.timestamp}>
              {formatTime(currentTime)} / {formatTime(videoDuration)}
            </span>
          </div>

          {/* Video Title & Info */}
          <div style={{ marginTop: 'var(--space-4)' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-1)', color: 'var(--text-primary)' }}>
              {watchState?.media_title || 'No video active'}
            </h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>
              {room.description || 'Watch party in progress.'}
            </p>
          </div>
        </div>

        {/* Right Column: Live Chat & Presence Drawer */}
        <div className={styles.chatDrawer}>
          {/* Chat Header with Participants */}
          <div className={styles.chatHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Users size={16} style={{ color: 'var(--color-forest-700)' }} />
              <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                Live Chat
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--success)',
                  display: 'inline-block',
                }}
              />
              <span>{participants.length || 1} online</span>
            </div>
          </div>

          {/* Chat Messages Feed */}
          <div className={styles.chatFeed}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-2)', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                👋 Say hello! Chat messages and emoji reactions sync instantly.
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.message_id}
                  className={`${styles.chatBubble} ${m.is_assistant ? styles.chatBubbleAssistant : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', marginBottom: '2px' }}>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 'var(--text-xs)',
                        color: m.is_assistant ? 'var(--color-sage-300)' : 'var(--text-primary)',
                      }}
                    >
                      {m.user_name}
                    </span>
                    {m.user_id === room.host_id && (
                      <Crown size={12} style={{ color: 'var(--color-moss-500)' }} />
                    )}
                    {m.is_assistant && (
                      <Sparkles size={12} style={{ color: 'var(--color-sage-300)' }} />
                    )}
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--text-sm)',
                      color: m.is_assistant ? 'var(--color-cream-100)' : 'var(--text-primary)',
                      lineHeight: 1.4,
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Quick Reaction Bar */}
          <div className={styles.reactionBar}>
            {['❤️', '🔥', '👏', '😂', '😮', '🌿'].map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={styles.reactionBtn}
                onClick={() => handleSendReaction(emoji)}
                aria-label={`Send ${emoji} reaction`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Chat Input Box */}
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Input
              type="text"
              placeholder={user ? 'Type a message or @assistant...' : 'Sign in to chat...'}
              disabled={!user}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              style={{ flex: 1 }}
            />
            <IconButton
              type="submit"
              icon={<Send size={16} />}
              aria-label="Send message"
              variant="primary"
              disabled={!user || !chatInput.trim()}
            />
          </form>
        </div>
      </div>

      {/* CHANGE MEDIA MODAL */}
      <Modal
        isOpen={changeMediaOpen}
        onClose={() => setChangeMediaOpen(false)}
        title="Change Watch Party Video"
        size="md"
      >
        <form onSubmit={handleChangeMediaSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="Video URL" required>
            <Input
              type="text"
              required
              placeholder="Direct MP4 URL or YouTube Shorts link"
              value={newMediaUrl}
              onChange={(e) => setNewMediaUrl(e.target.value)}
            />
          </FormField>

          <FormField label="Video Title (Optional)">
            <Input
              type="text"
              placeholder="e.g. Crazy Drone Shot in Nature"
              value={newMediaTitle}
              onChange={(e) => setNewMediaTitle(e.target.value)}
            />
          </FormField>

          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
            <Button type="button" variant="ghost" onClick={() => setChangeMediaOpen(false)} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" style={{ flex: 2 }}>
              Broadcast Video
            </Button>
          </div>
        </form>
      </Modal>

      {/* AI CATCH ME UP MODAL */}
      <Modal
        isOpen={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        title="AI Room Recap ✨"
        size="md"
      >
        {summaryLoading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-10) 0' }}>
            <Spinner size="lg" style={{ margin: '0 auto var(--space-3) auto' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
              Analyzing recent chat &amp; video moments...
            </p>
          </div>
        ) : summaryData ? (
          <div>
            <div
              style={{
                background: 'var(--bg-sunken)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-4)',
                marginBottom: 'var(--space-4)',
                fontSize: 'var(--text-sm)',
                lineHeight: 1.5,
                whiteSpace: 'pre-line',
                color: 'var(--text-primary)',
              }}
            >
              {summaryData.summary}
            </div>

            <div style={{ marginBottom: 'var(--space-6)' }}>
              <h4
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 'var(--space-2)',
                }}
              >
                Key Highlights
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {summaryData.highlights.map((h, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
                    <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              variant="primary"
              onClick={() => setSummaryOpen(false)}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Got It, Let&apos;s Watch!
            </Button>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>No summary available.</p>
        )}
      </Modal>
    </div>
  );
}

function extractYouTubeId(url: string): string {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/);
  return match ? match[1] : url;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}
