'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { NotificationItem } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
}

export default function NotificationsDrawer({ isOpen, onClose, onUnreadChange }: NotificationsDrawerProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [pushStatus, setPushStatus] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        setPushStatus('unsupported');
      } else {
        setPushStatus(Notification.permission);
      }
    }
  }, []);

  const loadNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.notifications.list(false, 40);
      setNotifications(res.items);
      setUnreadCount(res.unread_count);
      onUnreadChange?.(res.unread_count);
    } catch {
      // Ignored for graceful degradation
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      loadNotifications();
    }
  }, [isOpen, user]);

  const handleMarkRead = async (notificationId: string) => {
    try {
      await api.notifications.markRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => {
        const next = Math.max(0, c - 1);
        onUnreadChange?.(next);
        return next;
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      onUnreadChange?.(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEnablePush = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const permission = await Notification.requestPermission();
      setPushStatus(permission);
      if (permission === 'granted') {
        const vapidData = await api.notifications.getVapidKey();
        if (vapidData.public_key && 'serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: vapidData.public_key,
          });
          const subJson = sub.toJSON();
          if (subJson.endpoint && subJson.keys?.p256dh && subJson.keys?.auth) {
            await api.notifications.subscribePush({
              endpoint: subJson.endpoint,
              keys: {
                p256dh: subJson.keys.p256dh,
                auth: subJson.keys.auth,
              },
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to enable Web Push:', err);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <span style={{ color: 'var(--color-rose)' }}>❤️</span>;
      case 'comment':
        return <span style={{ color: 'var(--color-indigo)' }}>💬</span>;
      case 'follow':
        return <span style={{ color: 'var(--color-cyan)' }}>👤</span>;
      case 'friend':
        return <span style={{ color: 'var(--color-emerald)' }}>🤝</span>;
      case 'community':
        return <span style={{ color: 'var(--color-amber)' }}>🌐</span>;
      default:
        return <span style={{ color: 'var(--color-violet)' }}>⚡</span>;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          height: '100%',
          background: 'var(--surface-primary)',
          borderLeft: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.5)',
          animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Notifications</h2>
            {unreadCount > 0 && (
              <span
                style={{
                  background: 'var(--brand-gradient)',
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '999px',
                }}
              >
                {unreadCount}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                }}
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Web Push Prompt Banner */}
        {pushStatus === 'default' && (
          <div
            style={{
              padding: '0.75rem 1.25rem',
              background: 'rgba(99, 102, 241, 0.08)',
              borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              🔔 Enable browser push notifications for real-time reel activity.
            </div>
            <button
              onClick={handleEnablePush}
              style={{
                background: 'var(--color-indigo)',
                border: 'none',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Enable
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📭</div>
              <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                All caught up!
              </div>
              <p style={{ fontSize: '0.85rem', margin: 0 }}>
                When someone likes, comments, or follows you, it will show up here.
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.notification_id}
                onClick={() => !n.is_read && handleMarkRead(n.notification_id)}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  marginBottom: '0.5rem',
                  background: n.is_read ? 'rgba(255, 255, 255, 0.02)' : 'rgba(99, 102, 241, 0.08)',
                  border: n.is_read ? '1px solid rgba(255, 255, 255, 0.04)' : '1px solid rgba(99, 102, 241, 0.25)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.85rem',
                  cursor: n.is_read ? 'default' : 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                {/* Actor Avatar or Icon */}
                <div style={{ position: 'relative' }}>
                  {n.actor_avatar ? (
                    <img
                      src={n.actor_avatar}
                      alt={n.actor_name}
                      style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {n.actor_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-3px',
                      right: '-3px',
                      background: 'var(--surface-primary)',
                      borderRadius: '50%',
                      padding: '2px',
                      fontSize: '0.8rem',
                      lineHeight: 1,
                    }}
                  >
                    {getTypeIcon(n.type)}
                  </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    {n.message}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                    {formatTimeAgo(n.created_at)}
                  </div>
                </div>

                {/* Unread indicator */}
                {!n.is_read && (
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: 'var(--color-indigo)',
                      marginTop: '0.4rem',
                      flexShrink: 0,
                    }}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
