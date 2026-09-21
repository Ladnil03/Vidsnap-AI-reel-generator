'use client';

/**
 * VidSnap.AI AI Companion & Personalization Studio (/companion)
 * Chat co-pilot, Entertainment Journeys, Daily Watch Planner, and Creator Digital Twin.
 * Redesigned in the Forest & Paper design system.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Send,
  Trash2,
  Compass,
  Calendar,
  UserCheck,
  Bot,
  MessageSquare,
  Play,
  Clock,
  CheckCircle2,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  CompanionMessage,
  DailyPlan,
  DigitalTwinProfile,
  EntertainmentJourney,
  MoodType,
} from '@/lib/types';
import { MoodSelector } from '@/components/MoodSelector';
import {
  Button,
  IconButton,
  Card,
  Badge,
  Input,
  Textarea,
  FormField,
  Spinner,
  EmptyState,
  useToast,
} from '@/components/ui';
import styles from './companion.module.css';

export default function CompanionPage() {
  const { error: toastError, success: toastSuccess } = useToast();

  const [activeTab, setActiveTab] = useState<'chat' | 'journeys' | 'planner' | 'twin'>('chat');
  const [activeMood, setActiveMood] = useState<MoodType | null>(null);

  // Chat state
  const [messages, setMessages] = useState<CompanionMessage[]>([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [suggestedActions, setSuggestedActions] = useState<string[]>([
    '⚡ Boost My Energy',
    '🌙 5-Minute Chill Journey',
    '🎬 Curate Playlist',
    '😂 Show Me Funny Clips',
  ]);

  // Journeys state
  const [journeys, setJourneys] = useState<EntertainmentJourney[]>([]);

  // Daily Plan state
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);

  // Digital Twin state
  const [digitalTwin, setDigitalTwin] = useState<DigitalTwinProfile>({
    creator_id: '',
    creator_name: 'Creator',
    persona_name: 'AI Twin',
    bio: 'Sharing insights, behind-the-scenes thoughts, and video breakdowns.',
    voice_tone: 'friendly, inspiring, tech-savvy',
    greeting_template: "Hey! I'm your AI Digital Twin. Ask me anything about our reels!",
    topics: ['tech', 'creative', 'coding'],
    is_ai_labeled: true,
    is_active: true,
    updated_at: new Date().toISOString(),
  });
  const [twinPrompt, setTwinPrompt] = useState('');
  const [twinReply, setTwinReply] = useState('');
  const [twinLoading, setTwinLoading] = useState(false);
  const [twinSaving, setTwinSaving] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // 1. Load mood
      const m = await api.companion.getMood();
      if (m?.consent_given) setActiveMood(m.mood);

      // 2. Load companion chat history
      const hist = await api.companion.getHistory(25);
      if (hist.length > 0) {
        setMessages(hist);
      } else {
        setMessages([
          {
            message_id: 'welcome',
            role: 'assistant',
            content:
              "Welcome to your AI Personalization Studio ✨! I'm your entertainment co-pilot. I can find reels tailored to your mood, build custom playlists, guide you through timed entertainment journeys, or configure your creator digital twin.",
            timestamp: new Date().toISOString(),
          },
        ]);
      }

      // 3. Load journeys
      const jList = await api.companion.listJourneys();
      setJourneys(jList);

      // 4. Load daily plan
      const plan = await api.companion.getDailyPlan();
      setDailyPlan(plan);
    } catch {
      // Fallback
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || chatLoading) return;

    setInput('');
    const tempUserMsg: CompanionMessage = {
      message_id: `u_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setChatLoading(true);

    try {
      const res = await api.companion.chat(text, activeMood || undefined);
      setMessages((prev) => [...prev, res.message]);
      if (res.suggested_actions) setSuggestedActions(res.suggested_actions);
      if (res.active_mood) setActiveMood(res.active_mood);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          message_id: `err_${Date.now()}`,
          role: 'assistant',
          content: 'Companion network error. Reconnecting to the free-tier fallback router...',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await api.companion.clearHistory();
      setMessages([
        {
          message_id: 'cleared',
          role: 'assistant',
          content: 'Chat history cleared. What kind of vibe are we going for now?',
          timestamp: new Date().toISOString(),
        },
      ]);
      toastSuccess('Chat history cleared.');
    } catch {
      // ignore
    }
  };

  const handleSaveDigitalTwin = async () => {
    setTwinSaving(true);
    try {
      const updated = await api.companion.updateDigitalTwin(digitalTwin);
      setDigitalTwin(updated);
      toastSuccess('Digital Twin persona updated successfully!');
    } catch {
      toastError('Failed to save Digital Twin.');
    } finally {
      setTwinSaving(false);
    }
  };

  const handleTestDigitalTwin = async () => {
    if (!twinPrompt.trim() || twinLoading) return;
    setTwinLoading(true);
    try {
      const res = await api.companion.interactDigitalTwin('me', twinPrompt);
      setTwinReply(res.reply);
    } catch {
      setTwinReply("I'm experiencing high traffic. Please check back shortly!");
    } finally {
      setTwinLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header Banner */}
      <div className={styles.banner}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Badge variant="sage" size="sm">
              <Sparkles size={12} style={{ marginRight: '4px' }} />
              <span>AI Personalization Studio</span>
            </Badge>
          </div>
          <h1 className={styles.bannerTitle}>Entertainment Companion &amp; Mood Studio</h1>
          <p className={styles.bannerDesc}>
            Tailor your viewing universe with real-time mood tuning, smart dynamic playlists, structured journeys, and
            consented digital twins.
          </p>
        </div>

        <div className={styles.moodCard}>
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
            CURRENT VIBE
          </div>
          <MoodSelector
            currentMood={activeMood}
            onMoodChange={(m) => {
              setActiveMood(m);
              handleSendMessage(`Switching my vibe to ${m}!`);
            }}
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabBar}>
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`${styles.tabBtn} ${activeTab === 'chat' ? styles.tabBtnActive : ''}`}
        >
          <MessageSquare size={16} />
          <span>AI Companion Chat</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('journeys')}
          className={`${styles.tabBtn} ${activeTab === 'journeys' ? styles.tabBtnActive : ''}`}
        >
          <Compass size={16} />
          <span>Entertainment Journeys</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('planner')}
          className={`${styles.tabBtn} ${activeTab === 'planner' ? styles.tabBtnActive : ''}`}
        >
          <Calendar size={16} />
          <span>Daily Watch Planner</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('twin')}
          className={`${styles.tabBtn} ${activeTab === 'twin' ? styles.tabBtnActive : ''}`}
        >
          <Bot size={16} />
          <span>Creator Digital Twin</span>
        </button>
      </div>

      {/* TAB 1: AI Companion Chat */}
      {activeTab === 'chat' && (
        <div className={styles.chatGrid}>
          {/* Main Chat Box */}
          <div className={styles.chatBox}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: 'var(--space-3)',
                borderBottom: '1px solid var(--border-subtle)',
                marginBottom: 'var(--space-3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Badge variant="sage" size="sm">
                  Online
                </Badge>
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>VidSnap Companion</span>
              </div>
              <IconButton
                icon={<Trash2 size={16} />}
                aria-label="Clear chat history"
                variant="ghost"
                size="sm"
                onClick={handleClearHistory}
              />
            </div>

            {/* Chat Feed */}
            <div className={styles.chatFeed}>
              {messages.map((m) => (
                <div
                  key={m.message_id}
                  className={m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant}
                >
                  <div>{m.content}</div>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '10px',
                      opacity: 0.7,
                      marginTop: 'var(--space-1)',
                      textAlign: m.role === 'user' ? 'right' : 'left',
                    }}
                  >
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              {chatLoading && (
                <div className={styles.bubbleAssistant} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Spinner size="sm" />
                  <span>Curating mood recommendations...</span>
                </div>
              )}
            </div>

            {/* Suggested Prompt Chips */}
            <div className={styles.chipsRow}>
              {suggestedActions.map((act) => (
                <button
                  key={act}
                  type="button"
                  className={styles.chipBtn}
                  onClick={() => handleSendMessage(act)}
                >
                  {act}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}
            >
              <Input
                type="text"
                placeholder="Ask companion to find reels, create a journey, or summarize topics..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                style={{ flex: 1 }}
              />
              <IconButton
                type="submit"
                icon={<Send size={16} />}
                aria-label="Send message"
                variant="primary"
                disabled={chatLoading || !input.trim()}
              />
            </form>
          </div>

          {/* Side Panel: Context & Quick Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Card variant="raised">
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                🎯 Mood Alignment
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', lineHeight: 1.5 }}>
                Your current vibe is{' '}
                <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                  {activeMood || 'Chill'}
                </strong>
                . Companion automatically biasses discovery search and feed recommendations toward this frequency.
              </p>
            </Card>

            <Card variant="raised">
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                ⚡ Fast Commands
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  style={{ justifyContent: 'flex-start' }}
                  onClick={() => handleSendMessage('Create a 10-minute focus journey for coding')}
                >
                  🎧 10m Focus Coding Session
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  style={{ justifyContent: 'flex-start' }}
                  onClick={() => handleSendMessage('Give me 3 top trending nature reels')}
                >
                  🌿 Trending Nature Reels
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  style={{ justifyContent: 'flex-start' }}
                  onClick={() => handleSendMessage('Show me motivation reels under 30 seconds')}
                >
                  🚀 Quick Creator Motivation
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: Entertainment Journeys */}
      {activeTab === 'journeys' && (
        <div className={styles.journeysGrid}>
          {journeys.length === 0 ? (
            <EmptyState
              icon={<Compass size={40} />}
              title="No Journeys Available"
              description="Ask companion to generate an entertainment journey curated specifically for your mood!"
              actionLabel="Ask Companion"
              onAction={() => {
                setActiveTab('chat');
                handleSendMessage('Generate a new entertainment journey for me');
              }}
            />
          ) : (
            journeys.map((j) => (
              <Card key={j.journey_id} variant="raised" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                    <Badge variant="sage" size="sm">
                      {j.mood.toUpperCase()}
                    </Badge>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      <span>{j.total_duration_minutes} min</span>
                    </span>
                  </div>

                  <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                    {j.title}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.5, marginBottom: 'var(--space-4)' }}>
                    {j.description}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                    {j.steps.map((step, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: 'var(--space-2) var(--space-3)',
                          background: 'var(--bg-sunken)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 'var(--text-xs)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <span style={{ fontWeight: 700, color: 'var(--color-forest-700)' }}>{idx + 1}.</span>
                          <span>{step.title}</span>
                        </div>
                        <span style={{ color: 'var(--text-muted)' }}>{Math.max(1, Math.round(step.duration_seconds / 60))}m</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link href="/feed">
                  <Button variant="primary" style={{ width: '100%', justifyContent: 'center' }} leftIcon={<Play size={16} />}>
                    Begin Journey
                  </Button>
                </Link>
              </Card>
            ))
          )}
        </div>
      )}

      {/* TAB 3: Daily Watch Planner */}
      {activeTab === 'planner' && (
        <div className={styles.plannerGrid}>
          {dailyPlan ? (
            dailyPlan.slots.map((slot, idx) => (
              <Card key={idx} variant="raised">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                  <Badge variant="sage" size="sm">
                    {slot.time_of_day.toUpperCase()}
                  </Badge>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{slot.duration_minutes} min</span>
                </div>

                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-1)' }}>
                  {slot.name}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-4)' }}>
                  Status: <strong>{slot.is_completed ? 'Completed' : 'Upcoming'}</strong>
                </p>

                <Link href="/feed">
                  <Button variant="secondary" size="sm" style={{ width: '100%', justifyContent: 'center' }}>
                    Watch Slot
                  </Button>
                </Link>
              </Card>
            ))
          ) : (
            <EmptyState
              icon={<Calendar size={40} />}
              title="Daily Planner Generating"
              description="Your personalized time-of-day slots are computing based on your watch streak and mood preferences."
            />
          )}
        </div>
      )}

      {/* TAB 4: Creator Digital Twin */}
      {activeTab === 'twin' && (
        <div className={styles.twinGrid}>
          <Card variant="raised">
            <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
              Configure AI Digital Twin
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)' }}>
              Provide instructions, persona tone, and voice parameters for your AI representative that answers comments
              and co-hosts watch parties.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveDigitalTwin();
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
            >
              <FormField label="Persona Name" required>
                <Input
                  type="text"
                  required
                  value={digitalTwin.persona_name}
                  onChange={(e) => setDigitalTwin({ ...digitalTwin, persona_name: e.target.value })}
                />
              </FormField>

              <FormField label="Voice Tone">
                <Input
                  type="text"
                  value={digitalTwin.voice_tone}
                  onChange={(e) => setDigitalTwin({ ...digitalTwin, voice_tone: e.target.value })}
                />
              </FormField>

              <FormField label="Bio / Mission">
                <Textarea
                  rows={3}
                  value={digitalTwin.bio}
                  onChange={(e) => setDigitalTwin({ ...digitalTwin, bio: e.target.value })}
                />
              </FormField>

              <FormField label="Greeting Template">
                <Input
                  type="text"
                  value={digitalTwin.greeting_template}
                  onChange={(e) => setDigitalTwin({ ...digitalTwin, greeting_template: e.target.value })}
                />
              </FormField>

              <Button type="submit" variant="primary" loading={twinSaving} style={{ marginTop: 'var(--space-2)' }}>
                Save Digital Twin Persona
              </Button>
            </form>
          </Card>

          {/* Interactive Sandbox Test */}
          <Card variant="raised">
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
              🧪 Twin Sandbox Test
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-4)' }}>
              Send a test inquiry to preview how your digital twin answers fans and viewers.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <Input
                type="text"
                placeholder="Ask your twin: 'What camera setup do you use?'"
                value={twinPrompt}
                onChange={(e) => setTwinPrompt(e.target.value)}
              />
              <Button variant="secondary" onClick={handleTestDigitalTwin} loading={twinLoading}>
                Simulate Response
              </Button>

              {twinReply && (
                <div
                  style={{
                    padding: 'var(--space-4)',
                    background: 'var(--bg-sunken)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: 'var(--text-sm)',
                    lineHeight: 1.5,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 'var(--text-xs)', color: 'var(--color-forest-700)', marginBottom: 'var(--space-1)' }}>
                    🤖 {digitalTwin.persona_name} replied:
                  </div>
                  <div>{twinReply}</div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
