'use client';

/**
 * VidSnap.AI Admin Users Management
 * Inspect user accounts and modify credit ledger balances.
 */

import React, { useState, useEffect } from 'react';
import { Users, Search, Coins, Edit3, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { AdminUser } from '@/lib/types';
import {
  Button,
  Input,
  Badge,
  Modal,
  FormField,
  Spinner,
} from '@/components/ui';
import styles from '../admin.module.css';

export default function AdminUsersPage() {
  const { success, error: toastError } = useToast();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Token edit modal state
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [newTokens, setNewTokens] = useState<number>(0);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await api.admin.getUsers(0, 100);
      setUsers(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch users';
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTokens = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setUpdating(true);
    try {
      await api.admin.updateUserTokens(editingUser.user_id, newTokens);
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === editingUser.user_id ? { ...u, tokens_remaining: newTokens } : u
        )
      );
      success(`Updated token balance to ${newTokens} for ${editingUser.email}`);
      setEditingUser(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update tokens';
      toastError(msg);
    } finally {
      setUpdating(false);
    }
  };

  const filteredUsers = users.filter((u) =>
    (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Header & Search */}
      <div className={styles.toolbar}>
        <div>
          <h2 style={{ fontSize: 'var(--text-xl)', fontFamily: 'var(--font-display)', margin: '0 0 var(--space-1) 0', color: 'var(--color-text)' }}>
            Registered Accounts
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', margin: 0 }}>
            {users.length} total registered users across all roles.
          </p>
        </div>

        <div style={{ width: '280px' }}>
          <Input
            type="text"
            placeholder="Search by name or email..."
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
            Loading user directory...
          </p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.adminTable}>
            <thead>
              <tr>
                <th>User</th>
                <th>Roles</th>
                <th>Tokens</th>
                <th>Reels Made</th>
                <th>Joined</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.user_id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{u.name}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{u.email}</div>
                  </td>

                  <td>
                    <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
                      {u.roles.map((r, i) => (
                        <Badge
                          key={i}
                          variant={r === 'admin' ? 'moss' : 'sage'}
                          size="sm"
                        >
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </td>

                  <td>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', fontWeight: 700, color: 'var(--color-forest-700)' }}>
                      <Coins size={14} />
                      <span>{u.tokens_remaining}</span>
                    </div>
                  </td>

                  <td style={{ color: 'var(--color-text-muted)' }}>
                    {u.reels_count || 0}
                  </td>

                  <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setEditingUser(u);
                        setNewTokens(u.tokens_remaining);
                      }}
                      leftIcon={<Edit3 size={13} />}
                    >
                      Adjust Tokens
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Adjust Tokens Modal */}
      <Modal
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        title="Adjust User Tokens"
        description={editingUser ? `Updating token balance for ${editingUser.email}. This records an atomic ledger event.` : ''}
        size="sm"
      >
        <form onSubmit={handleUpdateTokens} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="New Token Balance" required>
            <Input
              type="number"
              min={0}
              max={10000}
              required
              value={newTokens}
              onChange={(e) => setNewTokens(parseInt(e.target.value, 10) || 0)}
            />
          </FormField>

          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditingUser(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={updating}
            >
              Save Balance
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
