'use client';

/**
 * VidSnap.AI Watch Parties Lobby
 * Discover and join live Watch Together rooms, or host your own watch party.
 * Redesigned in the Forest & Paper design system.
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
  Radio,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Room, CreateRoomRequest } from '../../lib/types';
import {
  Button,
  Card,
  Badge,
  Input,
  Textarea,
  Select,
  FormField,
  Modal,
  Spinner,
  EmptyState,
  useToast,
} from '@/components/ui';
import styles from './rooms.module.css';

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
    <div className={styles.container}>
      {/* Header Banner */}
      <div className={styles.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <Badge variant="sage" size="sm">
              <Radio size={12} style={{ animation: 'pulse 2s infinite', marginRight: '4px' }} />
              <span>Real-Time Sync</span>
            </Badge>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Sub-Second Drift Correction
            </span>
          </div>
          <h1 className={styles.headerTitle}>Watch Parties & Live Rooms</h1>
          <p className={styles.headerDesc}>
            Watch viral reels, YouTube Shorts, and creative clips in sync with friends. Includes real-time chat,
            emoji reactions, and 30-second AI summaries.
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus size={18} />}
          onClick={() => {
            if (!user) {
              toastError('Please sign in to host a Watch Party.');
              router.push('/login');
              return;
            }
            setCreateModalOpen(true);
          }}
        >
          Host Watch Party
        </Button>
      </div>

      {/* Search Bar */}
      <div className={styles.searchWrap}>
        <Input
          type="text"
          placeholder="Search rooms by title or host..."
          leftIcon={<Search size={18} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Rooms Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-16) 0' }}>
          <Spinner size="lg" style={{ margin: '0 auto var(--space-4) auto' }} />
          <p style={{ color: 'var(--text-muted)' }}>Scanning active watch parties...</p>
        </div>
      ) : rooms.length === 0 ? (
        <EmptyState
          icon={<Tv size={40} />}
          title={searchQuery ? 'No Matching Rooms' : 'No Active Rooms'}
          description={
            searchQuery
              ? `No rooms match '${searchQuery}'. Try another search term.`
              : 'Be the first to create a Watch Together party and invite friends!'
          }
          actionLabel="Host Watch Party"
          onAction={() => {
            if (!user) {
              router.push('/login');
            } else {
              setCreateModalOpen(true);
            }
          }}
        />
      ) : (
        <div className={styles.grid}>
          {rooms.map((room) => (
            <Card key={room.room_id} variant="raised" className={styles.roomCard}>
              <div>
                {/* Badges row */}
                <div className={styles.badgeRow}>
                  <Badge variant={room.room_type === 'public' ? 'sage' : 'warning'} size="sm">
                    {room.room_type === 'public' ? <Globe size={11} style={{ marginRight: '4px' }} /> : <Lock size={11} style={{ marginRight: '4px' }} />}
                    <span>{room.room_type.toUpperCase()}</span>
                  </Badge>

                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Users size={13} style={{ color: 'var(--color-moss-500)' }} />
                    <span>{room.participant_count} online</span>
                  </span>
                </div>

                {/* Room Title & Description */}
                <h2 className={styles.roomTitle}>{room.name}</h2>
                {room.description && <p className={styles.roomDesc}>{room.description}</p>}

                {/* Currently playing card */}
                <div className={styles.playingMedia}>
                  <div className={styles.playCircle}>
                    <Play size={14} style={{ marginLeft: '2px' }} />
                  </div>
                  <div style={{ overflow: 'hidden', flex: 1 }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {room.watch_state.state === 'playing' ? '🟢 Playing Now' : '⏸️ Paused'}
                    </div>
                    <div
                      style={{
                        fontSize: 'var(--text-sm)',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {room.watch_state.media_title || 'Ready for stream'}
                    </div>
                  </div>
                </div>

                {/* Host Info */}
                <div className={styles.hostInfo}>
                  <Crown size={14} style={{ color: 'var(--color-moss-500)' }} />
                  <span>
                    Host: <strong style={{ color: 'var(--text-primary)' }}>{room.host_name}</strong>
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <Button
                variant={room.room_type === 'private' ? 'secondary' : 'primary'}
                size="md"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => handleJoinClick(room)}
              >
                {room.room_type === 'private' ? 'Enter Passcode' : 'Join Watch Party'}
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* CREATE ROOM MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Host Watch Party"
        size="md"
      >
        <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="Room Name" required>
            <Input
              type="text"
              required
              placeholder="e.g. Late Night Tech Reel Binge"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
            />
          </FormField>

          <FormField label="Description (Optional)">
            <Textarea
              rows={2}
              placeholder="Tell friends what you're watching..."
              value={newRoomDesc}
              onChange={(e) => setNewRoomDesc(e.target.value)}
            />
          </FormField>

          <FormField label="Initial Video URL (Optional)">
            <Input
              type="text"
              placeholder="Paste direct MP4 or YouTube Short link"
              value={initialMediaUrl}
              onChange={(e) => {
                setInitialMediaUrl(e.target.value);
                if (!initialMediaTitle && e.target.value) {
                  setInitialMediaTitle('Featured Reel');
                }
              }}
            />
          </FormField>

          {initialMediaUrl && (
            <FormField label="Video Title">
              <Input
                type="text"
                placeholder="Video Title"
                value={initialMediaTitle}
                onChange={(e) => setInitialMediaTitle(e.target.value)}
              />
            </FormField>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <FormField label="Privacy">
              <Select
                value={isPrivate ? 'private' : 'public'}
                onChange={(e) => setIsPrivate(e.target.value === 'private')}
                options={[
                  { value: 'public', label: 'Public Room' },
                  { value: 'private', label: 'Private (Passcode)' },
                ]}
              />
            </FormField>

            <FormField label="Playback Control">
              <Select
                value={controlMode}
                onChange={(e) => setControlMode(e.target.value as 'host_only' | 'democratic')}
                options={[
                  { value: 'host_only', label: '👑 Host Only' },
                  { value: 'democratic', label: '🗳️ Anyone Can Control' },
                ]}
              />
            </FormField>
          </div>

          {isPrivate && (
            <FormField label="Room Passcode" required>
              <Input
                type="password"
                required
                placeholder="Enter secret passcode"
                value={newPasscode}
                onChange={(e) => setNewPasscode(e.target.value)}
              />
            </FormField>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCreateModalOpen(false)}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={creating}
              disabled={creating || !newRoomName.trim()}
              leftIcon={<Sparkles size={16} />}
              style={{ flex: 2 }}
            >
              Launch Watch Party
            </Button>
          </div>
        </form>
      </Modal>

      {/* PRIVATE ROOM PASSCODE MODAL */}
      <Modal
        isOpen={Boolean(joiningRoom)}
        onClose={() => setJoiningRoom(null)}
        title="Private Watch Party"
        size="sm"
      >
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
          <Lock size={32} style={{ color: 'var(--color-forest-700)', margin: '0 auto var(--space-2) auto' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
            &apos;{joiningRoom?.name}&apos; requires a secret passcode to enter.
          </p>
        </div>

        <form onSubmit={handleJoinPrivate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            type="password"
            required
            autoFocus
            placeholder="Enter passcode"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            style={{ textAlign: 'center', letterSpacing: '0.1em' }}
          />

          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setJoiningRoom(null)}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={joiningLoading}
              disabled={joiningLoading || !passcode.trim()}
              style={{ flex: 1 }}
            >
              Enter
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
