'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { MoodType } from '@/lib/types';

interface MoodOption {
  type: MoodType;
  label: string;
  emoji: string;
  gradient: string;
  glowColor: string;
}

const MOODS: MoodOption[] = [
  { type: 'energized', label: 'Energized', emoji: '⚡', gradient: 'from-amber-500/20 to-orange-500/20', glowColor: '#f59e0b' },
  { type: 'chill', label: 'Chill', emoji: '🌊', gradient: 'from-teal-500/20 to-cyan-500/20', glowColor: '#06b6d4' },
  { type: 'focused', label: 'Focused', emoji: '🎯', gradient: 'from-indigo-500/20 to-purple-500/20', glowColor: '#8b5cf6' },
  { type: 'curious', label: 'Curious', emoji: '🔍', gradient: 'from-blue-500/20 to-sky-500/20', glowColor: '#0ea5e9' },
  { type: 'melancholic', label: 'Melancholic', emoji: '🌧️', gradient: 'from-slate-500/20 to-blue-500/20', glowColor: '#64748b' },
  { type: 'inspired', label: 'Inspired', emoji: '💡', gradient: 'from-emerald-500/20 to-green-500/20', glowColor: '#10b981' },
  { type: 'humorous', label: 'Humorous', emoji: '😂', gradient: 'from-yellow-500/20 to-amber-500/20', glowColor: '#eab308' },
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
      // Fetch user's stored mood from API
      api.companion.getMood()
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
      // Silently persist or fallback locally
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="font-semibold tracking-wider uppercase flex items-center gap-1.5">
          <span>✨ Current Vibe</span>
          {loading && <span className="animate-spin text-[10px]">⏳</span>}
        </span>
        <span className="text-[11px] text-slate-500">Zero tracking • Consent-gated</span>
      </div>

      <div className={`flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none ${compact ? 'flex-wrap' : ''}`}>
        {MOODS.map((m) => {
          const isSelected = activeMood === m.type;
          return (
            <button
              key={m.type}
              type="button"
              onClick={() => handleSelectMood(m.type)}
              style={{
                borderColor: isSelected ? m.glowColor : 'rgba(255, 255, 255, 0.1)',
                boxShadow: isSelected ? `0 0 15px -3px ${m.glowColor}50` : 'none',
              }}
              className={`flex items-center gap-1.5 rounded-full border transition-all duration-200 cursor-pointer ${
                compact ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'
              } ${
                isSelected
                  ? 'bg-gradient-to-r text-white font-medium scale-105'
                  : 'bg-slate-900/60 text-slate-300 hover:border-slate-600 hover:text-white'
              }`}
            >
              <span className="text-sm">{m.emoji}</span>
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
