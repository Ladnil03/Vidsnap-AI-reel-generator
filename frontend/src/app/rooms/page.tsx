'use client';

/**
 * VidSnap.AI Watch Parties Lobby
 * Discover and join live Watch Together rooms, or host your own watch party.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Tv,
  Users,
  Plus,
  Lock,
  Globe,
  Sparkles,
  Search,
  Crown,
  Play,
  Volume2,
  X,
  Loader2,
  Radio,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { api } from '../../lib/api';
import { Room, CreateRoomRequest } from '../../lib/types';

export default function RoomsLobbyPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { error: toastError, success } = useToast();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Private room passcode prompt state
  const [joiningRoom, setJoiningRoom] = useState<Room | null>(null);
  const [passcode, setPasscode] = useState('');
  const [joiningLoading, setJoiningLoading] = useState(false);

  // Create form state
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [newPasscode, setNewPasscode] = useState('');
  const [controlMode, setControlMode] = useState<'host_only' | 'democratic'>('host_only');
  const [initialMediaUrl, setInitialMediaUrl] = useState('');
  const [initialMediaTitle, setInitialMediaTitle] = useState('');

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const data = await api.rooms.listRooms(0, 30, searchQuery || undefined);
      setRooms(data);
    } catch {
      // Offline / initial fallback
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [searchQuery]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toastError('Please sign in to host a Watch Party.');
      return;
    }
    if (!newRoomName.trim()) {
      toastError('Please enter a room name.');
      return;
    }

    setCreating(true);
    try {
      const payload: CreateRoomRequest = {
        name: newRoomName.trim(),
        description: newRoomDesc.trim(),
        room_type: isPrivate ? 'private' : 'public',
        passcode: isPrivate ? newPasscode.trim() : undefined,
        control_mode: controlMode,
        initial_media_url: initialMediaUrl.trim() || undefined,
        initial_media_title: initialMediaTitle.trim() || undefined,
      };

      const room = await api.rooms.createRoom(payload);
      success(`Watch party '${room.name}' created!`);
      setCreateModalOpen(false);
      router.push(`/rooms/${room.room_id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create room';
      toastError(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleJoinClick = (room: Room) => {
    if (room.room_type === 'private') {
      setJoiningRoom(room);
      setPasscode('');
    } else {
      router.push(`/rooms/${room.room_id}`);
    }
  };

  const handleJoinPrivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joiningRoom) return;

    setJoiningLoading(true);
    try {
      await api.rooms.joinRoom(joiningRoom.room_id, passcode);
      router.push(`/rooms/${joiningRoom.room_id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid passcode';
      toastError(msg);
    } finally {
      setJoiningLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '40px 16px 80px 16px' }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '20px',
        marginBottom: '36px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Radio size={12} className="spin" />
              <span>Real-Time Sync</span>
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Drift-Corrected Sub-Second Latency</span>
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '6px' }}>
            Watch Parties & Live Rooms
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '640px', fontSize: '0.95rem' }}>
            Watch viral reels, YouTube Shorts, and creative clips in sync with friends. Includes real-time chat, emoji reactions, LiveKit audio lounge, and 30-second AI recaps.
          </p>
        </div>

        <button
          onClick={() => {
            if (!user) {
              toastError('Please sign in to host a Watch Party.');
              router.push('/login');
              return;
            }
            setCreateModalOpen(true);
          }}
          className="btn btn-primary"
          style={{ padding: '12px 22px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={18} />
          <span>Host Watch Party</span>
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: '32px', maxWidth: '540px' }}>
        <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          placeholder="Search rooms by title or host..."
          className="form-input"
          style={{ paddingLeft: '44px', height: '46px', borderRadius: 'var(--radius-full)' }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Rooms Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Loader2 size={32} className="spin" color="var(--primary-light)" style={{ margin: '0 auto 12px auto' }} />
          <p style={{ color: 'var(--text-muted)' }}>Scanning active watch parties...</p>
        </div>
      ) : rooms.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 24px', maxWidth: '520px', margin: '0 auto' }}>
          <Tv size={48} color="var(--primary-light)" style={{ margin: '0 auto 16px auto', opacity: 0.8 }} />
          <h3 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>No Active Rooms Found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
            {searchQuery ? `No rooms match '${searchQuery}'. Try another search.` : 'Be the first to create a Watch Party and invite your community!'}
          </p>
          <button
            onClick={() => {
              if (!user) {
                router.push('/login');
              } else {
                setCreateModalOpen(true);
              }
            }}
            className="btn btn-primary"
            style={{ margin: '0 auto' }}
          >
            <Plus size={16} />
            <span>Create First Room</span>
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '24px',
        }}>
          {rooms.map((room) => (
            <div
              key={room.room_id}
              className="glass-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '1px solid var(--glass-border)',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
              }}
            >
              <div>
                {/* Badges row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span className={`badge ${room.room_type === 'public' ? 'badge-primary' : 'badge-amber'}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {room.room_type === 'public' ? <Globe size={11} /> : <Lock size={11} />}
                    <span>{room.room_type.toUpperCase()}</span>
                  </span>

                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Users size={13} color="var(--accent-cyan)" />
                    <span>{room.participant_count} online</span>
                  </span>
                </div>

                {/* Room Title */}
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px' }}>
                  {room.name}
                </h3>
                {room.description && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginBottom: '14px', lineHeight: 1.4 }}>
                    {room.description}
                  </p>
                )}

                {/* Currently playing card */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '16px',
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--primary-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Play size={14} color="#fff" style={{ marginLeft: '2px' }} />
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {room.watch_state.state === 'playing' ? '🟢 Playing Now' : '⏸️ Paused'}
                    </div>
                    <div style={{
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {room.watch_state.media_title || 'Ready for stream'}
                    </div>
                  </div>
                </div>

                {/* Host Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <Crown size={14} color="var(--accent-amber)" />
                  <span>Host: <strong style={{ color: 'var(--text-primary)' }}>{room.host_name}</strong></span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleJoinClick(room)}
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'center', padding: '10px 16px' }}
              >
                <span>{room.room_type === 'private' ? 'Enter Passcode' : 'Join Watch Party'}</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* CREATE ROOM MODAL */}
      {createModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '16px',
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '520px', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tv size={22} color="var(--primary-light)" />
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>Host Watch Party</h2>
              </div>
              <button onClick={() => setCreateModalOpen(false)} style={{ color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="form-label">Room Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Late Night Tech Reel Binge"
                  className="form-input"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Tell friends what you're watching tonight..."
                  className="form-textarea"
                  value={newRoomDesc}
                  onChange={(e) => setNewRoomDesc(e.target.value)}
                />
              </div>

              {/* Initial Video (Optional) */}
              <div>
                <label className="form-label">Initial Video URL / Title (Optional)</label>
                <input
                  type="text"
                  placeholder="Paste direct MP4 URL or YouTube Short URL"
                  className="form-input"
                  value={initialMediaUrl}
                  onChange={(e) => {
                    setInitialMediaUrl(e.target.value);
                    if (!initialMediaTitle && e.target.value) {
                      setInitialMediaTitle('Watch Party Featured Reel');
                    }
                  }}
                  style={{ marginBottom: '8px' }}
                />
                <input
                  type="text"
                  placeholder="Video Title"
                  className="form-input"
                  value={initialMediaTitle}
                  onChange={(e) => setInitialMediaTitle(e.target.value)}
                />
              </div>

              {/* Room Privacy & Control Mode */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="form-label">Privacy</label>
                  <select
                    className="form-select"
                    value={isPrivate ? 'private' : 'public'}
                    onChange={(e) => setIsPrivate(e.target.value === 'private')}
                  >
                    <option value="public" style={{ background: '#0e131f' }}>Public Room</option>
                    <option value="private" style={{ background: '#0e131f' }}>Private (Passcode)</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Playback Control</label>
                  <select
                    className="form-select"
                    value={controlMode}
                    onChange={(e) => setControlMode(e.target.value as any)}
                  >
                    <option value="host_only" style={{ background: '#0e131f' }}>👑 Host Only</option>
                    <option value="democratic" style={{ background: '#0e131f' }}>🗳️ Anyone Can Control</option>
                  </select>
                </div>
              </div>

              {isPrivate && (
                <div>
                  <label className="form-label">Room Passcode *</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter a secret passcode"
                    className="form-input"
                    value={newPasscode}
                    onChange={(e) => setNewPasscode(e.target.value)}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newRoomName.trim()}
                  className="btn btn-primary"
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  {creating ? <Loader2 size={18} className="spin" /> : <Sparkles size={18} />}
                  <span>Launch Watch Party</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRIVATE ROOM PASSCODE PROMPT */}
      {joiningRoom && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '16px',
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '28px', textAlign: 'center' }}>
            <Lock size={36} color="var(--accent-amber)" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '6px' }}>Private Watch Party</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
              '{joiningRoom.name}' requires a secret passcode to enter.
            </p>

            <form onSubmit={handleJoinPrivate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                type="password"
                required
                autoFocus
                placeholder="Enter passcode"
                className="form-input"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                style={{ textAlign: 'center', fontSize: '1rem', letterSpacing: '0.1em' }}
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setJoiningRoom(null)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joiningLoading || !passcode.trim()}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  {joiningLoading ? <Loader2 size={16} className="spin" /> : 'Enter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
