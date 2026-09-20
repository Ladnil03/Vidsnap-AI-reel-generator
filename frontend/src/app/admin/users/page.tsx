'use client';

/**
 * VidSnap.AI Admin Users Management
 * Inspect user accounts and modify credit ledger balances.
 */

import React, { useState, useEffect } from 'react';
import { Users, Search, Coins, Shield, Edit3, X, Loader2 } from 'lucide-react';
import { api } from '../../../lib/api';
import { useToast } from '../../../components/Toast';
import { AdminUser } from '../../../lib/types';

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
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '4px' }}>Registered Accounts</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {users.length} total registered users across all roles.
          </p>
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <input
            type="text"
            placeholder="Search by name or email..."
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
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading user directory...</p>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '0', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.02)' }}>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>User</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>Roles</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>Tokens</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>Reels Made</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>Joined</th>
                <th style={{ padding: '14px 18px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.user_id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.email}</div>
                  </td>

                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {u.roles.map((r, i) => (
                        <span key={i} className={`badge ${r === 'admin' ? 'badge-cyan' : 'badge-primary'}`} style={{ fontSize: '0.7rem' }}>
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--primary-light)' }}>
                      <Coins size={14} />
                      <span>{u.tokens_remaining}</span>
                    </div>
                  </td>

                  <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                    {u.reels_count || 0}
                  </td>

                  <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                  </td>

                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <button
                      onClick={() => {
                        setEditingUser(u);
                        setNewTokens(u.tokens_remaining);
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                    >
                      <Edit3 size={13} />
                      <span>Adjust Tokens</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Adjust Tokens Modal */}
      {editingUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px',
        }}>
          <div className="glass-card" style={{ maxWidth: '400px', width: '100%', background: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.25rem' }}>Adjust User Tokens</h3>
              <button onClick={() => setEditingUser(null)} style={{ color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Updating token balance for <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{editingUser.email}</span>. This will record an atomic ledger event.
            </p>

            <form onSubmit={handleUpdateTokens}>
              <div className="form-group">
                <label className="form-label">New Token Balance</label>
                <input
                  type="number"
                  min={0}
                  max={10000}
                  required
                  className="form-input"
                  value={newTokens}
                  onChange={(e) => setNewTokens(parseInt(e.target.value, 10) || 0)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  {updating ? 'Saving...' : 'Save Balance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
