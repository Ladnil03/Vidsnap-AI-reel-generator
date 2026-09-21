'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { MoodType } from '@/lib/types';
import { Spinner } from './ui';

interface MoodOption {
  type: MoodType;
  label: string;
  emoji: string;
}

const MOODS: MoodOption[] = [
  { type: 'energized', label: 'Energized', emoji: '⚡' },
  { type: 'chill', label: 'Chill', emoji: '🌊' },
  { type: 'focused', label: 'Focused', emoji: '🎯' },
  { type: 'curious', label: 'Curious', emoji: '🔍' },
  { type: 'melancholic', label: 'Melancholic', emoji: '🌧️' },
  { type: 'inspired', label: 'Inspired', emoji: '💡' },
  { type: 'humorous', label: 'Humorous', emoji: '😂' },
];

interface MoodSelectorProps {
  currentMood?: MoodType | null;
  onMoodChange?: (mood: MoodType) => void;
  compact?: boolean;
}

export function MoodSelector({ currentMood, onMoodChange, compact = false }: MoodSelectorProps) {
  const [activeMood, setActiveMood] = useState<MoodType | null>(currentMood || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentMood !== undefined) {
      setActiveMood(currentMood);
    } else {
      api.companion
        .getMood()
        .then((m) => {
          if (m?.consent_given) setActiveMood(m.mood);
        })
        .catch(() => {});
    }
  }, [currentMood]);

  const handleSelectMood = async (mood: MoodType) => {
    setActiveMood(mood);
    if (onMoodChange) onMoodChange(mood);

    setLoading(true);
    try {
      await api.companion.setMood(mood, true);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-muted)',
        }}
      >
        <span
          style={{
            fontWeight: 'var(--font-weight-semibold)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Sparkles size={13} style={{ color: 'var(--raw-sage)' }} />
          <span>Viewing Vibe</span>
          {loading && <Spinner size="sm" />}
        </span>
        <span style={{ fontSize: '10px' }}>Consent-gated • Zero tracking</span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          paddingBottom: '4px',
          flexWrap: compact ? 'wrap' : 'nowrap',
        }}
      >
        {MOODS.map((m) => {
          const isSelected = activeMood === m.type;
          return (
            <button
              key={m.type}
              type="button"
              onClick={() => handleSelectMood(m.type)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: compact ? '4px 10px' : '6px 14px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid',
                borderColor: isSelected ? 'var(--brand-primary)' : 'var(--border-subtle)',
                backgroundColor: isSelected ? 'var(--accent-soft)' : 'var(--surface-paper)',
                color: isSelected ? 'var(--brand-primary)' : 'var(--text-secondary)',
                fontWeight: isSelected ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                fontSize: compact ? 'var(--text-xs)' : 'var(--text-sm)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{m.emoji}</span>
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
