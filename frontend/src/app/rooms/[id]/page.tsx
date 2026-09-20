'use client';

/**
 * VidSnap.AI Watch Together Theater (/rooms/[id])
 * Real-time synchronized video player with sub-second drift correction, live chat,
 * floating reaction bursts, participant presence, and AI Room Assistant.
 */

import React, { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Tv,
  Users,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Send,
  Crown,
  Volume2,
  VolumeX,
  Maximize,
  ArrowLeft,
  Loader2,
  Radio,
  Lock,
  Globe,
  Settings,
  X,
  Share2,
  CheckCircle2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/Toast';
import { api, getStoredToken } from '../../../lib/api';
import { Room, RoomWatchState, RoomChatMessage, RoomParticipant, RoomSummaryResponse } from '../../../lib/types';

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
    return () => { isMounted = false; };
  }, [roomId]);

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
  }, [room?.room_id]);

  // 3. Handle WebSocket Events
  const handleIncomingWsEvent = (msg: any) => {
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
  };

  // 4. Server-Authoritative Drift Correction Engine
  const applyServerSyncState = (serverWatch: RoomWatchState) => {
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
  };

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

  const triggerFloatingReaction = (emoji: string, userName: string) => {
    const id = `${Date.now()}_${Math.random()}`;
    setFloatingReactions((prev) => [...prev.slice(-8), { id, emoji, user: userName }]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2800);

    // Minor confetti effect for 🔥 and ❤️
    if (emoji === '🔥' || emoji === '❤️') {
      try {
        confetti({ particleCount: 15, spread: 45, origin: { x: 0.8, y: 0.8 } });
      } catch {}
    }
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
      <div className="container" style={{ textAlign: 'center', padding: '100px 16px' }}>
        <Loader2 size={36} className="spin" color="var(--primary-light)" style={{ margin: '0 auto 16px auto' }} />
        <p style={{ color: 'var(--text-muted)' }}>Entering Watch Together room...</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '80px 16px' }}>
        <h2>Room Not Found</h2>
        <Link href="/rooms" className="btn btn-primary" style={{ marginTop: '16px' }}>
          Back to Lobby
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 16px 60px 16px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Top Navigation Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/rooms" className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '0.85rem' }}>
            <ArrowLeft size={16} />
            <span>Lobby</span>
          </Link>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
                {room.name}
              </h1>
              <span className={`badge ${room.room_type === 'public' ? 'badge-primary' : 'badge-amber'}`}>
                {room.room_type}
              </span>
              <span className={`badge ${wsConnected ? 'badge-emerald' : 'badge-amber'}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Radio size={10} className={wsConnected ? 'spin' : ''} />
                <span>{wsConnected ? 'Live Sync' : 'Connecting'}</span>
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <span>Host: <strong style={{ color: 'var(--text-primary)' }}>{room.host_name}</strong></span>
              <span>•</span>
              <span>{room.control_mode === 'host_only' ? '👑 Host Controls Only' : '🗳️ Democratic Control'}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* AI Room Assistant Catch Me Up Button */}
          <button
            onClick={handleOpenAiSummary}
            className="btn btn-secondary"
            style={{
              padding: '8px 14px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(6, 182, 212, 0.15))',
              borderColor: 'rgba(124, 58, 237, 0.3)',
            }}
          >
            <Sparkles size={15} color="var(--accent-cyan)" />
            <span>Catch Me Up ✨</span>
          </button>

          {canControl && (
            <button
              onClick={() => setChangeMediaOpen(true)}
              className="btn btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            >
              <span>Change Video</span>
            </button>
          )}

          <button
            onClick={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href);
                toastSuccess('Room link copied to clipboard!');
              }
            }}
            className="btn btn-secondary"
            style={{ padding: '8px 12px' }}
            title="Share Room Link"
          >
            <Share2 size={16} />
          </button>
        </div>
      </div>

      {/* Main Grid: Video Player + Chat Drawer */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.8fr) minmax(320px, 1fr)',
        gap: '20px',
        alignItems: 'start',
      }}>
        {/* Left Column: Synchronized Theater Player */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Player Container */}
          <div style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16/9',
            maxHeight: '620px',
            background: '#04060a',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}>
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
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Tv size={48} color="var(--primary-light)" style={{ margin: '0 auto 12px auto', opacity: 0.7 }} />
                <p style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '6px' }}>Ready to Stream</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {canControl ? 'Click "Change Video" to load a video for the party!' : 'Waiting for host to pick a video...'}
                </p>
              </div>
            )}

            {/* Floating Reactions Overlay */}
            <div style={{
              position: 'absolute',
              bottom: '40px',
              right: '24px',
              display: 'flex',
              flexDirection: 'column-reverse',
              gap: '8px',
              pointerEvents: 'none',
              zIndex: 20,
            }}>
              {floatingReactions.map((r) => (
                <div
                  key={r.id}
                  style={{
                    animation: 'floatUp 2.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(10, 14, 23, 0.85)',
                    backdropFilter: 'blur(6px)',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '1.1rem',
                    border: '1px solid var(--glass-border)',
                  }}
                >
                  <span>{r.emoji}</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{r.user}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Synchronized Control Bar */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.025)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}>
            {/* Play/Pause */}
            <button
              onClick={handleTogglePlay}
              disabled={!canControl}
              className="btn btn-primary"
              style={{
                width: '40px',
                height: '40px',
                padding: 0,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: canControl ? 1 : 0.6,
              }}
              title={canControl ? (isPlaying ? 'Pause for all' : 'Play for all') : 'Host control only'}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
            </button>

            {/* Mute Toggle */}
            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.muted = !isMuted;
                  setIsMuted(!isMuted);
                }
              }}
              style={{ color: 'var(--text-secondary)', background: 'transparent', cursor: 'pointer' }}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>

            {/* Scrubber */}
            <input
              type="range"
              min={0}
              max={videoDuration || 100}
              step={0.1}
              value={currentTime}
              disabled={!canControl}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              style={{ flex: 1, cursor: canControl ? 'pointer' : 'default', accentColor: 'var(--primary-light)' }}
            />

            {/* Timestamp */}
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              {formatTime(currentTime)} / {formatTime(videoDuration)}
            </span>
          </div>

          {/* Video Title & Info */}
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '4px' }}>
              {watchState?.media_title || 'No video active'}
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {room.description || 'Watch party in progress.'}
            </p>
          </div>
        </div>

        {/* Right Column: Live Chat & Presence Drawer */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '660px' }}>
          {/* Chat Header with Participants */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '12px',
            borderBottom: '1px solid var(--glass-border)',
            marginBottom: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={16} color="var(--accent-cyan)" />
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Live Chat</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-emerald)', display: 'inline-block' }} />
              <span>{participants.length || 1} online</span>
            </div>
          </div>

          {/* Chat Messages Feed */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            paddingRight: '6px',
            marginBottom: '12px',
          }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                👋 Say hi to the party! Chat messages and emoji reactions sync in real-time.
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.message_id}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: m.is_assistant
                      ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(6, 182, 212, 0.15))'
                      : m.is_system
                      ? 'rgba(255, 255, 255, 0.02)'
                      : 'rgba(255, 255, 255, 0.04)',
                    border: m.is_assistant ? '1px solid rgba(124, 58, 237, 0.3)' : '1px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span style={{
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      color: m.is_assistant ? 'var(--accent-cyan)' : 'var(--primary-light)',
                    }}>
                      {m.user_name}
                    </span>
                    {m.user_id === room.host_id && (
                      <Crown size={12} color="var(--accent-amber)" />
                    )}
                    {m.is_assistant && (
                      <Sparkles size={12} color="var(--accent-cyan)" />
                    )}
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    {m.text}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Quick Reaction Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            padding: '8px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '10px',
          }}>
            {['❤️', '🔥', '👏', '😂', '😮', '🚀'].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleSendReaction(emoji)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.3)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Chat Input Box */}
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder={user ? "Type a message or @assistant..." : "Sign in to chat..."}
              disabled={!user}
              className="form-input"
              style={{ fontSize: '0.88rem', padding: '10px 14px' }}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button
              type="submit"
              disabled={!user || !chatInput.trim()}
              className="btn btn-primary"
              style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>

      {/* CHANGE MEDIA MODAL */}
      {changeMediaOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '16px',
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '480px', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Change Watch Party Video</h3>
              <button onClick={() => setChangeMediaOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleChangeMediaSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label">Video URL *</label>
                <input
                  type="text"
                  required
                  placeholder="Direct video URL or YouTube Shorts link"
                  className="form-input"
                  value={newMediaUrl}
                  onChange={(e) => setNewMediaUrl(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Video Title</label>
                <input
                  type="text"
                  placeholder="e.g. Crazy Drone Shot in Tokyo"
                  className="form-input"
                  value={newMediaTitle}
                  onChange={(e) => setNewMediaTitle(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setChangeMediaOpen(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                  Broadcast Video
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI CATCH ME UP MODAL */}
      {summaryOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '16px',
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>AI Room Recap ✨</h3>
              </div>
              <button onClick={() => setSummaryOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {summaryLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Loader2 size={32} className="spin" color="var(--accent-cyan)" style={{ margin: '0 auto 12px auto' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Analyzing recent chat & video moments...</p>
              </div>
            ) : summaryData ? (
              <div>
                <div style={{
                  background: 'rgba(124, 58, 237, 0.08)',
                  border: '1px solid rgba(124, 58, 237, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '16px',
                  marginBottom: '16px',
                  fontSize: '0.92rem',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-line',
                }}>
                  {summaryData.summary}
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Key Highlights
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {summaryData.highlights.map((h, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem' }}>
                        <CheckCircle2 size={14} color="var(--accent-emerald)" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setSummaryOpen(false)}
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Got It, Let's Watch!
                </button>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>No summary available.</p>
            )}
          </div>
        </div>
      )}
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
