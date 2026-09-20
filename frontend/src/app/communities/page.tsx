'use client';

import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Check, 
  Sparkles, 
  Globe, 
  Flame, 
  Layers 
} from 'lucide-react';
import { api } from '@/lib/api';
import { Community, CommunityCategory } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';

const CATEGORIES: { id: CommunityCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All Communities' },
  { id: 'tech', label: 'Tech & AI' },
  { id: 'comedy', label: 'Comedy' },
  { id: 'fitness', label: 'Fitness' },
  { id: 'art', label: 'Art & Design' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'music', label: 'Music' },
  { id: 'lifestyle', label: 'Lifestyle' },
];

export default function CommunitiesPage() {
  const { user } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<CommunityCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CommunityCategory>('general');
  const [submitting, setSubmitting] = useState(false);

  const loadCommunities = () => {
    setLoading(true);
    const cat = selectedCategory === 'all' ? undefined : selectedCategory;
    api.social.getCommunities(cat, searchQuery || undefined, 50)
      .then((res) => {
        setCommunities(res.items);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadCommunities();
  }, [selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadCommunities();
  };

  const handleJoinToggle = async (community: Community) => {
    if (!user) {
      window.location.href = '/login';
      return;
    }

    try {
      if (community.is_member) {
        const updated = await api.social.leaveCommunity(community.community_id);
        setCommunities((prev) =>
          prev.map((c) => (c.community_id === community.community_id ? { ...c, is_member: false, members_count: updated.members_count } : c))
        );
      } else {
        const updated = await api.social.joinCommunity(community.community_id);
        setCommunities((prev) =>
          prev.map((c) => (c.community_id === community.community_id ? { ...c, is_member: true, members_count: updated.members_count } : c))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const created = await api.social.createCommunity({
        name,
        description,
        category,
      });
      setCommunities((prev) => [created, ...prev]);
      setCreateModalOpen(false);
      setName('');
      setDescription('');
      setCategory('general');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ paddingTop: '88px', minHeight: '100vh', paddingBottom: '4rem' }}>
      <div className="container" style={{ maxWidth: '1100px' }}>
        {/* Page Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '1.5rem',
            marginBottom: '2rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
              <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-light)', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
                <Globe size={13} style={{ marginRight: '4px' }} /> Cultural Tribes
              </span>
            </div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
              Interest Communities
            </h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0, maxWidth: '600px', fontSize: '1rem', lineHeight: 1.5 }}>
              Connect, share reels, and collaborate with creators across specialized creative niches.
            </p>
          </div>

          {user && (
            <button
              onClick={() => setCreateModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--brand-gradient)',
                border: 'none',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: '0 4px 14px var(--primary-glow)',
              }}
            >
              <Plus size={18} />
              <span>Create Community</span>
            </button>
          )}
        </div>

        {/* Search & Category Filter Toolbar */}
        <div
          style={{
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            marginBottom: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '14px', top: '12px' }} />
              <input
                type="text"
                placeholder="Search communities by name or topic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 42px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                padding: '0 18px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Search
            </button>
          </form>

          {/* Category Chips */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '999px',
                    border: active ? '1px solid var(--primary-light)' : '1px solid var(--glass-border)',
                    background: active ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                    color: active ? 'var(--primary-light)' : 'var(--text-secondary)',
                    fontSize: '0.85rem',
                    fontWeight: active ? 600 : 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Communities Grid */}
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading communities...
          </div>
        ) : communities.length === 0 ? (
          <div
            style={{
              padding: '4rem 2rem',
              textAlign: 'center',
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--text-secondary)',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌐</div>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No communities found</h3>
            <p style={{ margin: '0 0 1.5rem', fontSize: '0.9rem' }}>
              Be the pioneer! Create the very first community for this category.
            </p>
            {user && (
              <button
                onClick={() => setCreateModalOpen(true)}
                style={{
                  padding: '10px 20px',
                  background: 'var(--brand-gradient)',
                  color: '#fff',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                Create Community
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {communities.map((comm) => (
              <div
                key={comm.community_id}
                style={{
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.2s, border-color 0.2s',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'rgba(99, 102, 241, 0.1)',
                        color: 'var(--primary-light)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                      }}
                    >
                      {comm.category}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={14} /> {comm.members_count} members
                    </span>
                  </div>

                  <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {comm.name}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    c/{comm.slug}
                  </div>

                  <p
                    style={{
                      fontSize: '0.875rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                      margin: '0 0 1.25rem',
                      minHeight: '42px',
                    }}
                  >
                    {comm.description || 'A community dedicated to sharing short-form video stories and creative insights.'}
                  </p>
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => handleJoinToggle(comm)}
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-sm)',
                      background: comm.is_member ? 'rgba(255, 255, 255, 0.08)' : 'var(--primary-light)',
                      border: comm.is_member ? '1px solid var(--border-subtle)' : 'none',
                      color: comm.is_member ? 'var(--text-primary)' : '#000',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.2s',
                    }}
                  >
                    {comm.is_member ? (
                      <>
                        <Check size={16} /> Joined
                      </>
                    ) : (
                      <>
                        <Plus size={16} /> Join Community
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Community Modal */}
      {createModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem',
          }}
          onClick={() => setCreateModalOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              background: 'var(--surface-primary)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem',
              boxShadow: '0 20px 48px rgba(0, 0, 0, 0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Create Community</h2>
              <button
                onClick={() => setCreateModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCommunity} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Community Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Next-Gen Cinephiles"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CommunityCategory)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--surface-primary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                  }}
                >
                  <option value="general">General</option>
                  <option value="tech">Tech & AI</option>
                  <option value="comedy">Comedy</option>
                  <option value="fitness">Fitness</option>
                  <option value="art">Art & Design</option>
                  <option value="gaming">Gaming</option>
                  <option value="music">Music</option>
                  <option value="lifestyle">Lifestyle</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Description / Mission
                </label>
                <textarea
                  rows={3}
                  placeholder="What is this community about? What kind of reels are shared here?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  style={{
                    padding: '10px 18px',
                    background: 'transparent',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '10px 22px',
                    background: 'var(--brand-gradient)',
                    border: 'none',
                    color: '#fff',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px var(--primary-glow)',
                  }}
                >
                  {submitting ? 'Creating...' : 'Create Tribe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
