'use client';

import React, { useEffect, useState } from 'react';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Sparkles, 
  Film, 
  X, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import { api } from '@/lib/api';
import { NotificationItem } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { Button, IconButton, Badge, Spinner } from './ui';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
}

export default function NotificationsDrawer({
  isOpen,
  onClose,
  onUnreadChange,
}: NotificationsDrawerProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const loadNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.notifications.list(false, 40);
      setNotifications(res.items);
      setUnreadCount(res.unread_count);
      onUnreadChange?.(res.unread_count);
    } catch {
      // Graceful error handling
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      loadNotifications();
    }
  }, [isOpen, user]);

  // Handle ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
    } catch {
      // Handled
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      onUnreadChange?.(0);
    } catch {
      // Handled
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--overlay-scrim)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        zIndex: 500,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notifications-title"
        style={{
          width: '100%',
          maxWidth: '420px',
          height: '100%',
          backgroundColor: 'var(--surface-paper)',
          borderLeft: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          padding: 'var(--space-6)',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-4)',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: 'var(--space-3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Bell size={20} style={{ color: 'var(--brand-primary)' }} />
            <h3 id="notifications-title" style={{ fontSize: 'var(--text-lg)' }}>
              Notifications
            </h3>
            {unreadCount > 0 && <Badge variant="primary">{unreadCount} new</Badge>}
          </div>
          <IconButton icon={<X size={18} />} aria-label="Close notifications" onClick={onClose} size="sm" />
        </div>

        {/* Action bar */}
        {unreadCount > 0 && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<CheckCheck size={14} />}
              onClick={handleMarkAllRead}
            >
              Mark all as read
            </Button>
          </div>
        )}

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
              <Spinner size="md" />
            </div>
          ) : notifications.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 'var(--space-10) var(--space-4)',
                color: 'var(--text-muted)',
                fontSize: 'var(--text-sm)',
              }}
            >
              <Bell size={36} style={{ margin: '0 auto var(--space-2) auto', opacity: 0.4 }} />
              <p>You&apos;re all caught up! No notifications right now.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.notification_id}
                style={{
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: n.is_read ? 'transparent' : 'var(--surface-raised)',
                  border: '1px solid',
                  borderColor: n.is_read ? 'var(--border-subtle)' : 'var(--border-medium)',
                  display: 'flex',
                  gap: 'var(--space-3)',
                  alignItems: 'flex-start',
                  transition: 'background-color var(--transition-fast)',
                }}
              >
                <div style={{ marginTop: '2px', color: 'var(--brand-primary)' }}>
                  {n.type === 'like' || n.type === 'comment' ? (
                    <Film size={18} />
                  ) : (
                    <Sparkles size={18} />
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 'var(--text-sm)',
                      fontWeight: n.is_read ? 'var(--font-weight-medium)' : 'var(--font-weight-bold)',
                      color: 'var(--text-primary)',
                      marginBottom: '2px',
                    }}
                  >
                    {n.actor_name || 'Notification'}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {n.message}
                  </div>
                  {n.created_at && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        marginTop: 'var(--space-1)',
                      }}
                    >
                      <Clock size={11} />
                      <span>{new Date(n.created_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {!n.is_read && (
                  <IconButton
                    icon={<Check size={14} />}
                    aria-label="Mark as read"
                    size="sm"
                    onClick={() => handleMarkRead(n.notification_id)}
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
