'use client';

/**
 * VidSnap.AI Communities Page
 * Connect, share reels, and collaborate with creators across specialized creative niches.
 * Redesigned in the Forest & Paper design system.
 */

import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Check,
  Globe,
  Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Community, CommunityCategory } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import {
  Button,
  Card,
  Badge,
  Input,
  Select,
  Textarea,
  FormField,
  Modal,
  EmptyState,
  Spinner,
  useToast,
} from '@/components/ui';
import styles from './communities.module.css';

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
  const { error: toastError, success } = useToast();

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
    api.social
      .getCommunities(cat, searchQuery || undefined, 50)
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
          prev.map((c) =>
            c.community_id === community.community_id
              ? { ...c, is_member: false, members_count: updated.members_count }
              : c
          )
        );
        success(`Left ${community.name}`);
      } else {
        const updated = await api.social.joinCommunity(community.community_id);
        setCommunities((prev) =>
          prev.map((c) =>
            c.community_id === community.community_id
              ? { ...c, is_member: true, members_count: updated.members_count }
              : c
          )
        );
        success(`Joined ${community.name}!`);
      }
    } catch (err: unknown) {
      toastError((err as Error).message || 'Failed to update community membership.');
    }
  };

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const created = await api.social.createCommunity({
        name: name.trim(),
        description: description.trim(),
        category,
      });
      setCommunities((prev) => [created, ...prev]);
      setCreateModalOpen(false);
      setName('');
      setDescription('');
      setCategory('general');
      success(`Tribe '${created.name}' created successfully!`);
    } catch (err: unknown) {
      toastError((err as Error).message || 'Failed to create community.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <Badge variant="sage" size="sm">
              <Globe size={12} style={{ marginRight: '4px' }} />
              <span>Cultural Tribes</span>
            </Badge>
          </div>
          <h1 className={styles.title}>Interest Communities</h1>
          <p className={styles.description}>
            Connect, share reels, and collaborate with creators across specialized creative niches.
          </p>
        </div>

        {user && (
          <Button
            variant="primary"
            leftIcon={<Plus size={18} />}
            onClick={() => setCreateModalOpen(true)}
          >
            Create Community
          </Button>
        )}
      </div>

      {/* Search & Category Filter Toolbar */}
      <div className={styles.toolbar}>
        <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
          <Input
            type="text"
            placeholder="Search communities by name or topic..."
            leftIcon={<Search size={18} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>

        {/* Category Chips */}
        <div className={styles.categoryChips}>
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`${styles.categoryBtn} ${active ? styles.categoryBtnActive : ''}`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Communities Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-16) 0' }}>
          <Spinner size="lg" style={{ margin: '0 auto var(--space-4) auto' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading creative communities...</p>
        </div>
      ) : communities.length === 0 ? (
        <EmptyState
          icon={<Globe size={40} />}
          title="No Communities Found"
          description={
            searchQuery
              ? `No communities match '${searchQuery}'. Try another category or query.`
              : 'Be the pioneer! Create the very first community for this category.'
          }
          actionLabel={user ? 'Create Community' : 'Sign In to Create'}
          onAction={() => {
            if (!user) {
              window.location.href = '/login';
            } else {
              setCreateModalOpen(true);
            }
          }}
        />
      ) : (
        <div className={styles.grid}>
          {communities.map((comm) => (
            <Card key={comm.community_id} variant="raised" className={styles.communityCard}>
              <div>
                <div className={styles.cardHeader}>
                  <Badge variant="sage" size="sm">
                    {comm.category.toUpperCase()}
                  </Badge>
                  <span
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Users size={14} style={{ color: 'var(--color-moss-500)' }} />
                    <span>{comm.members_count} members</span>
                  </span>
                </div>

                <h2 className={styles.cardTitle}>{comm.name}</h2>
                <div className={styles.cardSlug}>c/{comm.slug}</div>

                <p className={styles.cardDesc}>
                  {comm.description || 'A community dedicated to sharing short-form video stories and creative insights.'}
                </p>
              </div>

              <div className={styles.cardFooter}>
                <Button
                  variant={comm.is_member ? 'secondary' : 'primary'}
                  size="sm"
                  style={{ width: '100%', justifyContent: 'center' }}
                  leftIcon={comm.is_member ? <Check size={16} /> : <Plus size={16} />}
                  onClick={() => handleJoinToggle(comm)}
                >
                  {comm.is_member ? 'Joined' : 'Join Community'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Community Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Community Tribe"
        size="md"
      >
        <form onSubmit={handleCreateCommunity} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="Community Name" required>
            <Input
              type="text"
              required
              placeholder="e.g. Next-Gen Cinephiles"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FormField>

          <FormField label="Category">
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value as CommunityCategory)}
              options={[
                { value: 'general', label: 'General' },
                { value: 'tech', label: 'Tech & AI' },
                { value: 'comedy', label: 'Comedy' },
                { value: 'fitness', label: 'Fitness' },
                { value: 'art', label: 'Art & Design' },
                { value: 'gaming', label: 'Gaming' },
                { value: 'music', label: 'Music' },
                { value: 'lifestyle', label: 'Lifestyle' },
              ]}
            />
          </FormField>

          <FormField label="Description / Mission">
            <Textarea
              rows={3}
              placeholder="What is this community about? What kind of reels are shared here?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormField>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
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
              loading={submitting}
              disabled={submitting || !name.trim()}
              leftIcon={<Sparkles size={16} />}
              style={{ flex: 2 }}
            >
              Create Tribe
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
