'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Film,
  Compass,
  Tv,
  Bot,
  Flame,
  Play,
  Pause,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  Layers,
  Heart,
  MessageSquare,
  Bookmark,
} from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';

export default function HomePage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const faqs = [
    {
      q: 'Is VidSnap.AI truly ₹0 / month free?',
      a: 'Yes! VidSnap.AI is designed using 100% card-free cloud infrastructure: Microsoft Edge-TTS neural voices, MongoDB Atlas M0, Cloudinary Media Cloud, and local Redis. Zero monthly subscription costs.',
    },
    {
      q: 'What video quality does the media worker produce?',
      a: 'The FFmpeg media worker renders 720p (720x1280) H.264 MP4 vertical video with -movflags +faststart, perfectly formatted for Instagram Reels, YouTube Shorts, and mobile feeds with instant playback.',
    },
    {
      q: 'How many images can I include per reel?',
      a: 'You can upload between 1 and 5 images per reel. You can adjust the per-slide duration from 1 to 10 seconds, paired with a custom voiceover of up to 900 characters.',
    },
    {
      q: 'How do tokens and credits work?',
      a: 'Every new registered account receives 5 complimentary creation tokens upon email verification. Generating 1 reel consumes 1 token with an atomic ledger and automated refund if any worker failure occurs.',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-16)', paddingBottom: 'var(--space-12)' }}>
      {/* ========================================================================
          HERO SECTION
          ======================================================================== */}
      <section className="container" style={{ paddingTop: 'var(--space-6)' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 'var(--space-10)',
            alignItems: 'center',
          }}
        >
          {/* Left Hero Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <Badge variant="primary" icon={<Sparkles size={14} />}>
                {t('heroBadge') || 'Card-Free AI Social Reel Studio'}
              </Badge>
            </div>

            <h1 style={{ fontSize: 'var(--text-4xl)', lineHeight: 1.15 }}>
              {t('heroTitle') || 'Turn Photos & Stories into Nature-Inspired Reels'}
            </h1>

            <p style={{ fontSize: 'var(--text-lg)', color: 'var(--text-secondary)', maxWidth: '540px' }}>
              {t('heroSubtitle') ||
                'Craft high-impact 720p vertical reels with neural voiceovers, calm paper aesthetics, and card-free cloud infrastructure.'}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
              <Link href={user ? '/create' : '/register'}>
                <Button variant="primary" size="lg" rightIcon={<ArrowRight size={18} />}>
                  {t('ctaCreateNow') || 'Create a Reel (Free)'}
                </Button>
              </Link>
              <Link href="/feed">
                <Button variant="secondary" size="lg" leftIcon={<Film size={18} />}>
                  Watch Live Feed
                </Button>
              </Link>
            </div>

            {/* Micro Feature Proof */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', marginTop: 'var(--space-4)', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                <span>Zero credit card required</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                <span>Edge-TTS multilingual neural voices</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                <span>Open-source FFmpeg rendering</span>
              </div>
            </div>
          </div>

          {/* Right Hero: Lightweight 9:16 Interactive Reel Preview */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div
              className="reel-aspect-container"
              style={{
                maxWidth: '340px',
                aspectRatio: '9 / 16',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: 'var(--space-4)',
                backgroundColor: 'var(--player-bg)',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              {/* Top Scrim Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  zIndex: 2,
                }}
              >
                <Badge variant="primary" icon={<Sparkles size={12} />}>
                  Featured Reel
                </Badge>
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
                  style={{
                    color: 'var(--player-text-primary)',
                    background: 'var(--scrim-medium)',
                    border: '1px solid var(--player-border)',
                    borderRadius: 'var(--radius-pill)',
                    padding: '6px',
                    display: 'flex',
                    cursor: 'pointer',
                  }}
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                </button>
              </div>

              {/* Ambient Graphic Mockup */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0.18,
                  backgroundImage:
                    'radial-gradient(circle at 50% 40%, var(--brand-primary) 0%, transparent 60%), radial-gradient(circle at 80% 80%, var(--raw-sage) 0%, transparent 50%)',
                }}
              />

              {/* Right Mock Action Rail */}
              <div
                style={{
                  position: 'absolute',
                  right: 'var(--space-3)',
                  bottom: '80px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  zIndex: 2,
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: 'var(--scrim-modal)',
                      border: '1px solid var(--player-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--raw-sage)',
                    }}
                  >
                    <Heart size={18} fill="currentColor" />
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--player-text-secondary)', fontWeight: 'bold' }}>
                    1.4k
                  </span>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: 'var(--scrim-modal)',
                      border: '1px solid var(--player-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--player-text-primary)',
                    }}
                  >
                    <MessageSquare size={18} />
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--player-text-secondary)', fontWeight: 'bold' }}>
                    28
                  </span>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: 'var(--scrim-modal)',
                      border: '1px solid var(--player-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--player-text-primary)',
                    }}
                  >
                    <Bookmark size={18} />
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--player-text-secondary)', fontWeight: 'bold' }}>
                    420
                  </span>
                </div>
              </div>

              {/* Bottom Scrim & Caption */}
              <div style={{ zIndex: 2, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: 'var(--brand-secondary)',
                      color: 'var(--brand-secondary-text)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 'bold',
                    }}
                  >
                    VS
                  </div>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold', color: 'var(--player-text-primary)' }}>
                    @forest_creator
                  </span>
                  <Badge variant="moss">Follow</Badge>
                </div>

                <p
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--player-text-primary)',
                    lineHeight: 1.4,
                    margin: 0,
                  }}
                >
                  Morning light through the dewy canopy 🌿 • Generated with Edge-TTS Hindi neural audio.
                </p>

                {/* Scrubber indicator */}
                <div
                  style={{
                    width: '100%',
                    height: '3px',
                    backgroundColor: 'var(--sage-glow)',
                    borderRadius: 'var(--radius-pill)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: '45%',
                      height: '100%',
                      backgroundColor: 'var(--raw-sage)',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================
          5 CORE PLATFORM PILLARS
          ======================================================================== */}
      <section className="container">
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
          <h2 style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-2)' }}>
            Five Pillars of VidSnap.AI
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
            Built from first principles for social entertainment, organic clarity, and fair attribution.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--space-6)',
          }}
        >
          {/* Pillar 1: Discover */}
          <Card variant="raised" interactive>
            <div style={{ color: 'var(--brand-primary)', marginBottom: 'var(--space-3)' }}>
              <Compass size={32} />
            </div>
            <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>
              1. Discover & Feed
            </h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 'var(--line-height-normal)' }}>
              Explore trending reels, language channels, and community videos with guaranteed source attribution and legal compliance.
            </p>
          </Card>

          {/* Pillar 2: Create Studio */}
          <Card variant="raised" interactive>
            <div style={{ color: 'var(--brand-primary)', marginBottom: 'var(--space-3)' }}>
              <Sparkles size={32} />
            </div>
            <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>
              2. AI Reel Studio
            </h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 'var(--line-height-normal)' }}>
              Drag-and-drop 1-5 photos, craft your narrative, and let our media worker render a crisp 720p vertical reel in seconds.
            </p>
          </Card>

          {/* Pillar 3: Watch Together Rooms */}
          <Card variant="raised" interactive>
            <div style={{ color: 'var(--brand-primary)', marginBottom: 'var(--space-3)' }}>
              <Tv size={32} />
            </div>
            <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>
              3. Watch Together Rooms
            </h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 'var(--line-height-normal)' }}>
              Host synchronous rooms with friends featuring sub-second drift correction, live reactions, and voice/chat synchronization.
            </p>
          </Card>

          {/* Pillar 4: AI Companion */}
          <Card variant="raised" interactive>
            <div style={{ color: 'var(--brand-primary)', marginBottom: 'var(--space-3)' }}>
              <Bot size={32} />
            </div>
            <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>
              4. AI Companion
            </h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 'var(--line-height-normal)' }}>
              Zero-tracking, mood-adaptive companion that curates calm playlists, offers suggestions, and supports your viewing journey.
            </p>
          </Card>

          {/* Pillar 5: Gamification & Streaks */}
          <Card variant="raised" interactive>
            <div style={{ color: 'var(--brand-primary)', marginBottom: 'var(--space-3)' }}>
              <Flame size={32} />
            </div>
            <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>
              5. Daily XP & Streaks
            </h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 'var(--line-height-normal)' }}>
              Level up your creator tier, unlock nature-inspired badges in sage and moss, and earn extra generation tokens every day.
            </p>
          </Card>
        </div>
      </section>

      {/* ========================================================================
          TRANSPARENT SOCIAL PROOF (Clearly Marked Placeholders)
          ======================================================================== */}
      <section className="container">
        <Card variant="sunken" style={{ textAlign: 'center', padding: 'var(--space-10) var(--space-6)' }}>
          <Badge variant="primary" style={{ marginBottom: 'var(--space-3)' }}>
            Community Beta
          </Badge>
          <h3 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-2)' }}>
            Engineered for Creators & Multilingual Audiences
          </h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '640px', margin: '0 auto var(--space-6) auto' }}>
            Built with deep support for Indian multilingual creators (English, Hindi, Gujarati). Fast rendering on mobile browsers with zero heavyweight runtime overhead.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-8)', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'bold', color: 'var(--brand-primary)' }}>
                720p
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Faststart Vertical MP4
              </div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'bold', color: 'var(--brand-primary)' }}>
                100%
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Zero-Card Free Tier
              </div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'bold', color: 'var(--brand-primary)' }}>
                3+
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Languages Supported
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* ========================================================================
          FREQUENTLY ASKED QUESTIONS (ACCESSIBLE ACCORDION)
          ======================================================================== */}
      <section className="container-narrow">
        <h2 style={{ textAlign: 'center', fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-6)' }}>
          Frequently Asked Questions
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <Card key={faq.q} style={{ padding: 'var(--space-4) var(--space-6)' }}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 'var(--text-base)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--text-primary)',
                  }}
                  aria-expanded={isOpen}
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    size={18}
                    style={{
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform var(--transition-fast)',
                    }}
                  />
                </button>
                {isOpen && (
                  <p
                    style={{
                      marginTop: 'var(--space-3)',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--text-secondary)',
                      lineHeight: 'var(--line-height-relaxed)',
                    }}
                  >
                    {faq.a}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
