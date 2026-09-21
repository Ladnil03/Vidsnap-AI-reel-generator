'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  Film, 
  ExternalLink, 
  Compass, 
  MessageSquare 
} from 'lucide-react';
import { api } from '@/lib/api';
import { CompanionMessage, MoodType } from '@/lib/types';
import { Button, IconButton, Badge, Spinner } from './ui';

export function CompanionWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<CompanionMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeMood, setActiveMood] = useState<MoodType | null>(null);
  const [suggestedActions, setSuggestedActions] = useState<string[]>([
    '⚡ Boost My Energy',
    '🌙 5m Chill Journey',
    '🎬 Curate Playlist',
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadHistory();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const loadHistory = async () => {
    try {
      const history = await api.companion.getHistory(20);
      if (history.length > 0) {
        setMessages(history);
      } else {
        setMessages([
          {
            message_id: 'welcome',
            role: 'assistant',
            content: "Hey there! I'm your VidSnap AI Companion ✨. What kind of vibe or reels are you in the mood for right now?",
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      setMessages([
        {
          message_id: 'welcome',
          role: 'assistant',
          content: "Hey there! I'm your VidSnap AI Companion ✨. What kind of vibe or reels are you in the mood for right now?",
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    setInput('');
    const tempUserMsg: CompanionMessage = {
      message_id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const res = await api.companion.chat(text, activeMood || undefined);
      setMessages((prev) => [...prev, res.message]);
      if (res.suggested_actions?.length > 0) {
        setSuggestedActions(res.suggested_actions);
      }
      if (res.active_mood) {
        setActiveMood(res.active_mood);
      }
    } catch {
      const errorMsg: CompanionMessage = {
        message_id: `err_${Date.now()}`,
        role: 'assistant',
        content: 'I had trouble connecting to the free-tier router. Let me help you find popular reels instead!',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside
      aria-label="AI Companion Widget"
      style={{
        position: 'fixed',
        bottom: 'calc(var(--space-6) + env(safe-area-inset-bottom, 0px))',
        right: 'var(--space-6)',
        zIndex: 400,
      }}
    >
      {/* Floating Trigger */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-expanded="false"
          aria-label="Open AI Companion"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'var(--brand-primary)',
            color: 'var(--brand-primary-text)',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-medium)',
            fontWeight: 'var(--font-weight-semibold)',
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
            transition: 'transform var(--transition-fast)',
          }}
        >
          <Bot size={20} />
          <span>AI Companion</span>
        </button>
      )}

      {/* Expanded Chat Drawer / Card */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby="companion-title"
          style={{
            width: '360px',
            maxWidth: 'calc(100vw - 32px)',
            height: '520px',
            maxHeight: 'calc(100vh - 120px)',
            backgroundColor: 'var(--surface-paper)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: 'var(--space-3) var(--space-4)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--surface-raised)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Bot size={18} style={{ color: 'var(--brand-primary)' }} />
              <div>
                <h4 id="companion-title" style={{ fontSize: 'var(--text-sm)', margin: 0 }}>
                  AI Companion
                </h4>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Mood & Reel Assistant
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              <Link href="/companion" title="Open Full Companion Page">
                <IconButton icon={<ExternalLink size={15} />} aria-label="Open full page" size="sm" />
              </Link>
              <IconButton icon={<X size={16} />} aria-label="Close widget" onClick={() => setIsOpen(false)} size="sm" />
            </div>
          </div>

          {/* Messages Area */}
          <div
            aria-live="polite"
            style={{
              flex: 1,
              padding: 'var(--space-4)',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}
          >
            {messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.message_id}
                  style={{
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isUser ? 'var(--brand-primary)' : 'var(--surface-sunken)',
                    color: isUser ? 'var(--brand-primary-text)' : 'var(--text-primary)',
                    fontSize: 'var(--text-sm)',
                    lineHeight: 'var(--line-height-normal)',
                  }}
                >
                  <p style={{ margin: 0, color: 'inherit' }}>{m.content}</p>
                </div>
              );
            })}

            {loading && (
              <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Spinner size="sm" />
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion Chips */}
          {suggestedActions.length > 0 && (
            <div
              style={{
                padding: 'var(--space-2) var(--space-3)',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                gap: 'var(--space-1)',
                overflowX: 'auto',
                scrollbarWidth: 'none',
              }}
            >
              {suggestedActions.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => handleSendMessage(action)}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-pill)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--surface-paper)',
                    color: 'var(--text-secondary)',
                    fontSize: '11px',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                  }}
                >
                  {action}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{
              padding: 'var(--space-3)',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              gap: 'var(--space-2)',
              backgroundColor: 'var(--surface-raised)',
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for vibes or reels..."
              aria-label="Message companion"
              style={{
                flex: 1,
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--border-medium)',
                backgroundColor: 'var(--surface-input)',
                fontSize: 'var(--text-xs)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
            <IconButton
              icon={<Send size={15} />}
              aria-label="Send message"
              variant="primary"
              size="sm"
              disabled={!input.trim() || loading}
            />
          </form>
        </div>
      )}
    </aside>
  );
}
