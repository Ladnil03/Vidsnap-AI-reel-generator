'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { CompanionMessage, MoodType } from '@/lib/types';
import { MoodSelector } from './MoodSelector';

export function CompanionWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<CompanionMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeMood, setActiveMood] = useState<MoodType | null>(null);
  const [suggestedActions, setSuggestedActions] = useState<string[]>([
    '⚡ Boost My Energy',
    '🌙 5m Chill Journey',
    '😂 Show Funny Clips',
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

  const loadHistory = async () => {
    try {
      const history = await api.companion.getHistory(20);
      if (history.length > 0) {
        setMessages(history);
      } else {
        // Welcome greeting
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
      // Default welcome
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
    } catch (err: unknown) {
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

  const handleClearHistory = async () => {
    try {
      await api.companion.clearHistory();
      setMessages([
        {
          message_id: 'cleared',
          role: 'assistant',
          content: 'Conversation history cleared. Fresh slate! What vibe shall we explore?',
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch {
      // ignore
    }
  };

  return (
    <>
      {/* Floating launcher button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-semibold shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 border border-white/20 cursor-pointer backdrop-blur-md"
        >
          <span className="text-xl animate-pulse">✨</span>
          <span className="text-sm font-medium tracking-wide">AI Companion</span>
        </button>
      )}

      {/* Expanded chat drawer */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] sm:w-[420px] h-[580px] max-h-[85vh] bg-slate-900/95 backdrop-blur-xl border border-slate-700/60 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="p-4 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center text-sm shadow-md">
                ✨
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                  VidSnap Companion
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    AI Co-Pilot
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">Personalized vibe & video guide</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Link
                href="/companion"
                className="p-1.5 text-slate-400 hover:text-white text-xs rounded-lg hover:bg-slate-800 transition"
                title="Open Full Studio"
              >
                ↗️
              </Link>
              <button
                type="button"
                onClick={handleClearHistory}
                className="p-1.5 text-slate-400 hover:text-rose-400 text-xs rounded-lg hover:bg-slate-800 transition"
                title="Clear history"
              >
                🗑️
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white text-xs rounded-lg hover:bg-slate-800 transition"
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Mood Selector Bar */}
          <div className="px-4 py-2.5 bg-slate-950/30 border-b border-slate-800/40">
            <MoodSelector
              currentMood={activeMood}
              onMoodChange={(m) => {
                setActiveMood(m);
                handleSendMessage(`I'm feeling ${m} right now!`);
              }}
              compact
            />
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div key={msg.message_id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      isUser
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-xs'
                        : 'bg-slate-800/80 text-slate-200 border border-slate-700/50 rounded-bl-xs shadow-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>

                    {/* Embedded Reels Card (from Tool Calling) */}
                    {msg.reels && msg.reels.length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-slate-700/60 pt-2.5">
                        <span className="text-[11px] font-semibold tracking-wider uppercase text-indigo-400 block">
                          🎬 Found Reels
                        </span>
                        <div className="space-y-1.5">
                          {msg.reels.map((r) => (
                            <Link
                              key={r.reel_id}
                              href={`/feed?video=${r.reel_id}`}
                              className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-700/40 transition group"
                            >
                              <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center text-xs overflow-hidden shrink-0">
                                {r.thumbnail_url ? (
                                  <img src={r.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  '▶️'
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-white truncate group-hover:text-indigo-300">
                                  {r.title}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate">{r.creator_name}</p>
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

            {loading && (
              <div className="flex items-center gap-2 text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-2 rounded-xl w-fit">
                <span className="animate-spin">✨</span>
                <span>Companion is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions Chips */}
          <div className="px-4 py-1.5 bg-slate-950/40 flex items-center gap-1.5 overflow-x-auto scrollbar-none border-t border-slate-800/40">
            {suggestedActions.map((action, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSendMessage(action)}
                className="whitespace-nowrap px-2.5 py-1 text-xs rounded-full bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/40 transition cursor-pointer shrink-0"
              >
                {action}
              </button>
            ))}
          </div>

          {/* Input form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for reels, journeys, or vibes..."
              className="flex-1 bg-slate-800/90 text-sm text-white placeholder-slate-400 px-3.5 py-2.5 rounded-xl border border-slate-700/60 focus:outline-none focus:border-indigo-500 transition"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium text-sm hover:opacity-95 active:scale-95 disabled:opacity-40 transition cursor-pointer"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
