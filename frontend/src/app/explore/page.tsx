'use client';

import React, { useEffect, useState } from 'react';
import {
  Search,
  Sparkles,
  ExternalLink,
  Play,
  X,
  Eye,
  Clock,
  Compass,
} from 'lucide-react';
import { api } from '@/lib/api';
import { DiscoveryItem, DiscoverySource } from '@/lib/types';
import {
  Button,
  IconButton,
  Card,
  Badge,
  Input,
  Modal,
  Skeleton,
  EmptyState,
  PageHeader,
} from '@/components/ui';

const POPULAR_TAGS = [
  'tech',
  'ai',
  'nature',
  'coding',
  'art',
  'fitness',
  'comedy',
  'travel',
  'education',
];

const SOURCE_FILTERS: { label: string; value: DiscoverySource | 'all' }[] = [
  { label: 'All Sources', value: 'all' },
  { label: 'YouTube Shorts', value: 'youtube_shorts' },
  { label: 'Pexels Video', value: 'pexels' },
  { label: 'Pixabay Video', value: 'pixabay' },
];

export default function ExplorePage() {
  const [query, setQuery] = useState<string>('nature');
  const [selectedSource, setSelectedSource] = useState<DiscoverySource | 'all'>('all');
  const [selectedTag, setSelectedTag] = useState<string>('nature');
  const [items, setItems] = useState<DiscoveryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [previewItem, setPreviewItem] = useState<DiscoveryItem | null>(null);

  const fetchResults = (q: string, source: DiscoverySource | 'all', tag: string) => {
    setLoading(true);
    api.discovery
      .search({
        q: q || undefined,
        source: source !== 'all' ? source : undefined,
        tag: tag || undefined,
        limit: 24,
      })
      .then((res) => {
        setItems(res.items);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchResults(query, selectedSource, selectedTag);
  }, [selectedSource, selectedTag]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchResults(query, selectedSource, selectedTag);
  };

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-16)' }}>
      {/* Header */}
      <PageHeader
        title="Explore & Discover Reels"
        description="Search public short-form content with guaranteed creator attribution and zero tracking."
      />

      {/* Search Input Bar */}
      <form
        onSubmit={handleSearchSubmit}
        style={{
          display: 'flex',
          gap: 'var(--space-2)',
          maxWidth: '640px',
          marginBottom: 'var(--space-6)',
        }}
      >
        <div style={{ flex: 1, position: 'relative' }}>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topics, creators, or keywords..."
            aria-label="Search reels"
            style={{ paddingLeft: 'var(--space-10)' }}
          />
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: 'var(--space-4)',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
        </div>
        <Button variant="primary" type="submit">
          Search
        </Button>
      </form>

      {/* Source Filter Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        {SOURCE_FILTERS.map((f) => {
          const isSelected = selectedSource === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setSelectedSource(f.value)}
              style={{
                padding: 'var(--space-1) var(--space-4)',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid',
                borderColor: isSelected ? 'var(--brand-primary)' : 'var(--border-subtle)',
                backgroundColor: isSelected ? 'var(--brand-primary)' : 'var(--surface-paper)',
                color: isSelected ? 'var(--brand-primary-text)' : 'var(--text-secondary)',
                fontSize: 'var(--text-xs)',
                fontWeight: isSelected ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Popular Tag Chips */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-2)',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          paddingBottom: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
        }}
      >
        {POPULAR_TAGS.map((tag) => {
          const isSelected = selectedTag === tag;
          return (
            <button
              key={tag}
              type="button"
              onClick={() => {
                setSelectedTag(tag);
                setQuery(tag);
              }}
              style={{
                padding: 'var(--space-1) var(--space-3)',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid',
                borderColor: isSelected ? 'var(--border-medium)' : 'var(--border-subtle)',
                backgroundColor: isSelected ? 'var(--accent-soft)' : 'transparent',
                color: isSelected ? 'var(--brand-primary)' : 'var(--text-muted)',
                fontSize: 'var(--text-xs)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              #{tag}
            </button>
          );
        })}
      </div>

      {/* Content Grid */}
      {loading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 'var(--space-6)',
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} style={{ padding: 0, overflow: 'hidden' }}>
              <Skeleton width="100%" height="320px" borderRadius="0" />
              <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <Skeleton width="80%" height="16px" />
                <Skeleton width="50%" height="12px" />
              </div>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card style={{ padding: 'var(--space-12) var(--space-4)' }}>
          <EmptyState
            title="No Matching Reels Found"
            description="Try adjusting your keywords or source filter to explore more content."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery('nature');
                  setSelectedTag('nature');
                  setSelectedSource('all');
                }}
              >
                Reset Search Filters
              </Button>
            }
          />
        </Card>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 'var(--space-6)',
          }}
        >
          {items.map((item) => (
            <Card
              key={item.item_id}
              variant="raised"
              interactive
              style={{
                padding: 0,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
              onClick={() => setPreviewItem(item)}
            >
              {/* Media Thumbnail Container (9:16 vertical ratio) */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '9 / 14',
                  backgroundColor: 'var(--player-bg)',
                  overflow: 'hidden',
                }}
              >
                {item.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnail_url}
                    alt={item.title}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform var(--transition-normal)',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <Play size={36} />
                  </div>
                )}

                {/* Source Badge */}
                <div style={{ position: 'absolute', top: 'var(--space-3)', left: 'var(--space-3)' }}>
                  <Badge variant="sage">
                    {item.source.replace('_', ' ')}
                  </Badge>
                </div>

                {/* Duration Badge */}
                {item.duration && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 'var(--space-3)',
                      right: 'var(--space-3)',
                      backgroundColor: 'var(--scrim-modal)',
                      color: 'var(--cream-50)',
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-pill)',
                    }}
                  >
                    {item.duration}s
                  </div>
                )}
              </div>

              {/* Card Meta Content */}
              <div
                style={{
                  padding: 'var(--space-4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-2)',
                  flex: 1,
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <h4
                    style={{
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--text-primary)',
                      lineHeight: 1.4,
                      marginBottom: '4px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {item.title}
                  </h4>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {item.author_name ? `@${item.author_name}` : 'Creator'}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: 'var(--space-2)',
                    borderTop: '1px solid var(--border-subtle)',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Eye size={12} />
                    <span>{item.views_count?.toLocaleString() || '1.2k'}</span>
                  </div>

                  {item.source_url && (
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        color: 'var(--brand-primary)',
                        fontWeight: 'var(--font-weight-semibold)',
                      }}
                    >
                      <span>Open original</span>
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Video Preview Modal */}
      {previewItem && (
        <Modal
          isOpen={Boolean(previewItem)}
          onClose={() => setPreviewItem(null)}
          title={previewItem.title}
          description={`By ${previewItem.author_name || 'Creator'} • ${previewItem.source.replace('_', ' ')}`}
        >
          <div
            style={{
              width: '100%',
              aspectRatio: '9 / 16',
              maxHeight: '480px',
              backgroundColor: 'var(--player-bg)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              margin: 'var(--space-4) 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {previewItem.embed_url ? (
              previewItem.player_type === 'iframe' ||
              previewItem.source === 'youtube_shorts' ||
              previewItem.embed_url.includes('youtube.com') ||
              previewItem.embed_url.includes('youtube-nocookie.com') ? (
                <iframe
                  src={previewItem.embed_url}
                  title={previewItem.title}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={previewItem.embed_url}
                  controls
                  autoPlay
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              )
            ) : (
              <p style={{ color: 'var(--player-text-muted)' }}>Video playback preview</p>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {previewItem.source_url && (
              <a
                href={previewItem.source_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: 'var(--brand-primary)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                }}
              >
                <span>Visit original source</span>
                <ExternalLink size={14} />
              </a>
            )}
            <Button variant="secondary" onClick={() => setPreviewItem(null)}>
              Close
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
