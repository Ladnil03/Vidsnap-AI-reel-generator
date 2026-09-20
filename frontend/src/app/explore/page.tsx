'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Sparkles, 
  ExternalLink, 
  Play, 
  X, 
  Eye, 
  Clock, 
  CheckCircle2 
} from 'lucide-react';
import { api } from '@/lib/api';
import { DiscoveryItem, DiscoverySource } from '@/lib/types';

const POPULAR_TAGS = [
  'tech',
  'ai',
  'coding',
  'cyberpunk',
  'nature',
  'fitness',
  'comedy',
  'dance',
  'art',
  'coffee',
];

const SOURCE_FILTERS: { label: string; value: DiscoverySource | 'all' }[] = [
  { label: 'All Sources', value: 'all' },
  { label: 'YouTube Shorts', value: 'youtube_shorts' },
  { label: 'Pexels Video', value: 'pexels' },
  { label: 'Pixabay Video', value: 'pixabay' },
];

export default function ExplorePage() {
  const [query, setQuery] = useState<string>('tech');
  const [selectedSource, setSelectedSource] = useState<DiscoverySource | 'all'>('all');
  const [selectedTag, setSelectedTag] = useState<string>('tech');
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
      .catch((err) => {
        console.error('Failed to search discovery catalog:', err);
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

  const getSourceBadgeColor = (source: DiscoverySource) => {
    switch (source) {
      case 'youtube_shorts':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.4)' };
      case 'pexels':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.4)' };
      case 'pixabay':
        return { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.4)' };
      default:
        return { bg: 'rgba(99, 102, 241, 0.15)', text: '#a5b4fc', border: 'rgba(99, 102, 241, 0.4)' };
    }
  };

  return (
    <main
      style={{
        paddingTop: '80px',
        minHeight: '100vh',
        background: '#04060a',
        color: '#f8fafc',
        paddingBottom: '4rem',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem' }}>
        {/* Header Section */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 14px',
              borderRadius: '999px',
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: 'var(--primary-light)',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '1rem',
            }}
          >
            <Sparkles size={14} />
            <span>Legal-by-Design Multi-Source Discovery</span>
          </div>
          <h1
            style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #fff 40%, #94a3b8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '0.75rem',
            }}
          >
            Explore Viral Short Videos
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto', fontSize: '1rem' }}>
            Search curated vertical reels across YouTube Shorts, Pexels, Pixabay, and our Creator Community.
            Zero re-hosting, 100% compliant.
          </p>
        </div>

        {/* Search Bar Form */}
        <form
          onSubmit={handleSearchSubmit}
          style={{
            maxWidth: '680px',
            margin: '0 auto 2rem',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: '16px',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
              color: 'var(--text-secondary)',
            }}
          >
            <Search size={20} />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search keywords like 'cyberpunk', 'python coding', 'nature'..."
            style={{
              width: '100%',
              padding: '14px 120px 14px 48px',
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '999px',
              color: '#fff',
              fontSize: '1rem',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
          <button
            type="submit"
            style={{
              position: 'absolute',
              right: '6px',
              padding: '9px 20px',
              background: 'var(--primary-gradient)',
              border: 'none',
              borderRadius: '999px',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            Search
          </button>
        </form>

        {/* Source Filter Pills */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '1.25rem',
          }}
        >
          {SOURCE_FILTERS.map((s) => {
            const isSelected = selectedSource === s.value;
            return (
              <button
                key={s.value}
                onClick={() => setSelectedSource(s.value)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  border: isSelected ? '1px solid var(--primary-light)' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  color: isSelected ? 'var(--primary-light)' : 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  fontWeight: isSelected ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Popular Tag Chips */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '6px',
            marginBottom: '2.5rem',
          }}
        >
          {POPULAR_TAGS.map((tag) => {
            const isSelected = selectedTag === tag;
            return (
              <button
                key={tag}
                onClick={() => {
                  setSelectedTag(isSelected ? '' : tag);
                  if (!isSelected) setQuery(tag);
                }}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: isSelected ? '1px solid rgba(165, 180, 252, 0.5)' : '1px solid rgba(255, 255, 255, 0.06)',
                  background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  color: isSelected ? '#a5b4fc' : '#94a3b8',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                #{tag}
              </button>
            );
          })}
        </div>

        {/* Video Grid */}
        {loading ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '5rem 0',
              color: 'var(--text-secondary)',
              gap: '1rem',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                border: '3px solid rgba(99, 102, 241, 0.2)',
                borderTopColor: 'var(--primary-light)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span>Discovering vertical reels...</span>
          </div>
        ) : items.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '4rem 1rem',
              color: 'var(--text-secondary)',
            }}
          >
            <p style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '0.5rem' }}>No discovery items found</p>
            <p style={{ fontSize: '0.9rem' }}>Try searching for a different topic or select &quot;All Sources&quot;</p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {items.map((item) => {
              const badge = getSourceBadgeColor(item.source);
              return (
                <div
                  key={item.item_id}
                  onClick={() => setPreviewItem(item)}
                  style={{
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Thumbnail Container (9:16 Aspect Ratio) */}
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '9 / 16',
                      background: '#0a0d14',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {item.thumbnail_url ? (
                      <img
                        src={item.thumbnail_url}
                        alt={item.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
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
                          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                        }}
                      >
                        <Play size={36} color="rgba(255,255,255,0.4)" />
                      </div>
                    )}

                    {/* Source Badge Pill */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        background: badge.bg,
                        border: `1px solid ${badge.border}`,
                        color: badge.text,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textTransform: 'capitalize',
                        backdropFilter: 'blur(8px)',
                      }}
                    >
                      {item.source.replace('_', ' ')}
                    </div>

                    {/* Duration Pill */}
                    {item.duration > 0 && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          background: 'rgba(0, 0, 0, 0.7)',
                          color: '#fff',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <Clock size={10} />
                        <span>{Math.round(item.duration)}s</span>
                      </div>
                    )}

                    {/* Play Hover Overlay */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                      }}
                      className="play-overlay"
                    >
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: 'rgba(99, 102, 241, 0.9)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Play size={22} color="#fff" style={{ marginLeft: '3px' }} />
                      </div>
                    </div>
                  </div>

                  {/* Metadata Container */}
                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <h4
                      style={{
                        margin: 0,
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: '#f8fafc',
                        lineHeight: 1.3,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {item.title}
                    </h4>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: '#94a3b8' }}>
                      <span>@{item.author_name}</span>
                      {item.views_count > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Eye size={12} />
                          <span>{item.views_count}</span>
                        </div>
                      )}
                    </div>

                    {/* Attribution Line */}
                    <div
                      style={{
                        fontSize: '0.72rem',
                        color: '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginTop: '2px',
                      }}
                    >
                      <CheckCircle2 size={11} color="#10b981" />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.attribution_text}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Video Preview Modal */}
        {previewItem && (
          <div
            onClick={() => setPreviewItem(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(12px)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '440px',
                background: '#090d16',
                borderRadius: '20px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                boxShadow: '0 24px 48px rgba(0, 0, 0, 0.9)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--primary-light)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {previewItem.source.replace('_', ' ')}
                  </span>
                </div>
                <button
                  onClick={() => setPreviewItem(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Player Area (9:16) */}
              <div
                style={{
                  width: '100%',
                  aspectRatio: '9 / 16',
                  maxHeight: '65vh',
                  background: '#000',
                  position: 'relative',
                }}
              >
                {previewItem.player_type === 'iframe' ? (
                  <iframe
                    src={`${previewItem.embed_url}?autoplay=1&controls=1&modestbranding=1&rel=0`}
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
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
              </div>

              {/* Details & Actions */}
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: '#fff' }}>
                  {previewItem.title}
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.4 }}>
                  {previewItem.description || previewItem.attribution_text}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px' }}>
                  <a
                    href={previewItem.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: 'var(--primary-light)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    <span>View on Source</span>
                    <ExternalLink size={14} />
                  </a>

                  <Link
                    href="/feed"
                    style={{
                      padding: '8px 16px',
                      background: 'var(--primary-gradient)',
                      color: '#fff',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    Open in Feed
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        .play-overlay:hover {
          opacity: 1 !important;
        }
      `}</style>
    </main>
  );
}
