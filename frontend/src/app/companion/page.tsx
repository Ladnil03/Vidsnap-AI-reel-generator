'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  CompanionMessage,
  DailyPlan,
  DailyPlanSlot,
  DigitalTwinProfile,
  EntertainmentJourney,
  MoodType,
} from '@/lib/types';
import { MoodSelector } from '@/components/MoodSelector';

export default function CompanionPage() {
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
  const [activeJourney, setActiveJourney] = useState<EntertainmentJourney | null>(null);

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
  const [twinSaved, setTwinSaved] = useState(false);

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
    } catch {
      // ignore
    }
  };

  const handleSaveDigitalTwin = async () => {
    try {
      const updated = await api.companion.updateDigitalTwin(digitalTwin);
      setDigitalTwin(updated);
      setTwinSaved(true);
      setTimeout(() => setTwinSaved(false), 3000);
    } catch {
      // ignore
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
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-20 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 rounded-3xl bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-pink-900/40 border border-slate-800/80 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="space-y-3 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider border border-indigo-500/30">
              <span>✨ Phase 8</span>
              <span>•</span>
              <span>AI Personalization Studio</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Entertainment Companion & Mood Studio
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
              Tailor your viewing universe with real-time mood tuning, smart dynamic playlists, structured journeys, and consented digital twins.
            </p>
          </div>

          <div className="z-10 bg-slate-900/80 p-4 rounded-2xl border border-slate-700/60 max-w-sm w-full">
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
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer flex items-center gap-2 ${
              activeTab === 'chat'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <span>💬</span>
            <span>AI Companion Chat</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('journeys')}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer flex items-center gap-2 ${
              activeTab === 'journeys'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <span>🚀</span>
            <span>Entertainment Journeys</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('planner')}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer flex items-center gap-2 ${
              activeTab === 'planner'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <span>📅</span>
            <span>Daily Watch Planner</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('twin')}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer flex items-center gap-2 ${
              activeTab === 'twin'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <span>👤</span>
            <span>Creator Digital Twin</span>
          </button>
        </div>

        {/* TAB 1: AI Companion Chat */}
        {activeTab === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-3xl bg-slate-900/70 border border-slate-800/80 p-6 flex flex-col h-[600px] shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-lg shadow-md">
                    ✨
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-base">VidSnap Companion Chat</h3>
                    <p className="text-xs text-slate-400">Conversational intent parsing with local tool calling</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                >
                  Clear History 🗑️
                </button>
              </div>

              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4 scrollbar-thin">
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div key={msg.message_id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${
                          isUser
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                            : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 shadow-md'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>

                        {/* Tool Execution Embedded Cards */}
                        {msg.reels && msg.reels.length > 0 && (
                          <div className="mt-3.5 space-y-2 border-t border-slate-700/80 pt-3">
                            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block">
                              🎬 Recommended Reels from Tool Search:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {msg.reels.map((reel) => (
                                <Link
                                  key={reel.reel_id}
                                  href={`/feed?video=${reel.reel_id}`}
                                  className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-700/50 transition group"
                                >
                                  <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center text-sm overflow-hidden shrink-0">
                                    {reel.thumbnail_url ? (
                                      <img src={reel.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      '▶️'
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-white truncate group-hover:text-indigo-300">
                                      {reel.title}
                                    </p>
                                    <p className="text-[11px] text-slate-400 truncate">{reel.creator_name}</p>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 px-1">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}

                {chatLoading && (
                  <div className="flex items-center gap-2 text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-2 rounded-xl w-fit">
                    <span className="animate-spin">✨</span>
                    <span>AI Companion is thinking & searching...</span>
                  </div>
                )}
              </div>

              {/* Suggestions */}
              <div className="flex items-center gap-2 py-2 overflow-x-auto scrollbar-none border-t border-slate-800/60">
                {suggestedActions.map((act, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendMessage(act)}
                    className="whitespace-nowrap px-3 py-1.5 text-xs rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/50 transition cursor-pointer shrink-0"
                  >
                    {act}
                  </button>
                ))}
              </div>

              {/* Chat Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2 pt-3"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask your companion to find reels, create a playlist, or change your vibe..."
                  className="flex-1 bg-slate-800/90 text-sm text-white placeholder-slate-400 px-4 py-3 rounded-xl border border-slate-700/60 focus:outline-none focus:border-indigo-500 transition"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || chatLoading}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium text-sm hover:opacity-95 active:scale-95 disabled:opacity-40 transition cursor-pointer"
                >
                  Send
                </button>
              </form>
            </div>

            {/* Side Tools & Quick Actions */}
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>⚡ Quick Inspiration Prompts</span>
                </h4>
                <div className="space-y-2">
                  {[
                    'Find 3 motivational reels for morning workout',
                    'Show me relaxing drone videos with nature sounds',
                    'Create a 10-minute focus playlist for coding',
                    'Give me the best comedy clips trending today',
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(p)}
                      className="w-full text-left p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/40 text-xs text-slate-300 hover:text-white transition cursor-pointer"
                    >
                      💡 {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950/40 to-slate-900/80 border border-indigo-500/20 space-y-3">
                <h4 className="text-sm font-semibold text-indigo-300 flex items-center gap-2">
                  <span>🛡️ Privacy & Free-Tier Guard</span>
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Your conversations are stored in MongoDB with 30-day auto-purging. Zero biometric surveillance is performed. All LLM queries leverage our free-tier router with offline heuristic fallback.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Entertainment Journeys */}
        {activeTab === 'journeys' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {journeys.map((j) => (
                <div
                  key={j.journey_id}
                  className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800/80 flex flex-col justify-between hover:border-indigo-500/40 transition-all duration-300 group shadow-lg"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {j.total_duration_minutes} Minutes
                      </span>
                      <span className="text-xs uppercase font-bold text-slate-500">{j.mood}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition">
                      {j.title}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                      {j.description}
                    </p>
                  </div>

                  <div className="pt-6 space-y-3">
                    <div className="text-[11px] text-slate-500 font-medium">
                      {j.steps.length} sequential steps
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveJourney(j)}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium text-xs hover:opacity-95 transition cursor-pointer"
                    >
                      Start Journey 🚀
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Journey Player Modal */}
            {activeJourney && (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/60 rounded-3xl p-6 space-y-6 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">{activeJourney.title}</h3>
                      <p className="text-xs text-slate-400">{activeJourney.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveJourney(null)}
                      className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 scrollbar-thin">
                    {activeJourney.steps.map((s) => (
                      <div
                        key={s.step_number}
                        className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/40 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-xs font-bold">
                            {s.step_number}
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-white">{s.title}</h4>
                            <p className="text-xs text-slate-400">{s.description}</p>
                          </div>
                        </div>
                        <span className="text-xs text-slate-500 whitespace-nowrap">{s.duration_seconds}s</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                    <Link
                      href="/feed"
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium hover:opacity-95 transition"
                    >
                      Begin Watching in Feed ▶️
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Daily Watch Planner */}
        {activeTab === 'planner' && (
          <div className="p-8 rounded-3xl bg-slate-900/70 border border-slate-800/80 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-white">Daily Entertainment Planner 📅</h3>
                <p className="text-xs text-slate-400">
                  Set intentional viewing sessions throughout your day to avoid endless scrolling.
                </p>
              </div>
              <div className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Digital Wellbeing Guard Active
              </div>
            </div>

            {dailyPlan && (
              <div className="space-y-4">
                {dailyPlan.slots.map((slot, index) => (
                  <div
                    key={slot.slot_id}
                    className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-xl">
                        {slot.time_of_day === 'morning' ? '🌅' : slot.time_of_day === 'afternoon' ? '☀️' : '🌙'}
                      </div>
                      <div>
                        <h4 className="text-base font-semibold text-white">{slot.name}</h4>
                        <p className="text-xs text-slate-400 capitalize">
                          {slot.time_of_day} • {slot.duration_minutes} minutes target
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Link
                        href="/feed"
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition cursor-pointer"
                      >
                        Start Session 🎯
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Creator Digital Twin */}
        {activeTab === 'twin' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-8 rounded-3xl bg-slate-900/70 border border-slate-800/80 space-y-6 shadow-xl">
              <div className="space-y-2 pb-4 border-b border-slate-800">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20 text-[11px] font-semibold uppercase">
                  Consented AI Persona
                </div>
                <h3 className="text-xl font-bold text-white">Digital Twin Configuration</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Allow your audience to chat with an AI representation of yourself. In compliance with Section 4.6, all responses are strictly watermarked with an AI Provenance badge.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Persona Name
                  </label>
                  <input
                    type="text"
                    value={digitalTwin.persona_name}
                    onChange={(e) => setDigitalTwin({ ...digitalTwin, persona_name: e.target.value })}
                    className="w-full bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Voice Tone & Style
                  </label>
                  <input
                    type="text"
                    value={digitalTwin.voice_tone}
                    onChange={(e) => setDigitalTwin({ ...digitalTwin, voice_tone: e.target.value })}
                    className="w-full bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Bio & Context for AI
                  </label>
                  <textarea
                    rows={3}
                    value={digitalTwin.bio}
                    onChange={(e) => setDigitalTwin({ ...digitalTwin, bio: e.target.value })}
                    className="w-full bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                  ⚠️ <strong>Trust & Provenance:</strong> The [AI Digital Twin] badge is permanently affixed to all messages generated by this persona.
                </div>

                <button
                  type="button"
                  onClick={handleSaveDigitalTwin}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm hover:opacity-95 transition cursor-pointer"
                >
                  {twinSaved ? 'Saved Successfully! ✅' : 'Save Digital Twin Settings 💾'}
                </button>
              </div>
            </div>

            {/* Test Interactive Digital Twin */}
            <div className="p-8 rounded-3xl bg-slate-900/70 border border-slate-800/80 space-y-6 shadow-xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <h3 className="text-xl font-bold text-white">Live Twin Simulation</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    AI Provenance Labeled
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/50 space-y-3">
                  <p className="text-xs text-slate-400">Ask your digital twin a question to preview its voice:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={twinPrompt}
                      onChange={(e) => setTwinPrompt(e.target.value)}
                      placeholder="e.g. What inspired you to start making reels?"
                      className="flex-1 bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-700 text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={handleTestDigitalTwin}
                      disabled={twinLoading || !twinPrompt.trim()}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-500 transition disabled:opacity-40"
                    >
                      {twinLoading ? 'Generating...' : 'Ask'}
                    </button>
                  </div>
                </div>

                {twinReply && (
                  <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-2 animate-in fade-in duration-300">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-indigo-300">
                        🤖 {digitalTwin.persona_name}
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        AI Digital Twin
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">{twinReply}</p>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-500 text-center">
                Powered by VidSnap Multi-Provider LLM Router with zero-cost fallback.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
