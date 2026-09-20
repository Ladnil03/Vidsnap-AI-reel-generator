'use client';

/**
 * VidSnap.AI Landing Page
 * Rich dark aesthetic, glassmorphic interactive reel preview, and feature showcase.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  Film, 
  Cpu, 
  Volume2, 
  Layers, 
  ShieldCheck, 
  Play, 
  Pause, 
  CheckCircle2, 
  ChevronDown, 
  ArrowRight,
  Coins
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';

export default function HomePage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [isPlaying, setIsPlaying] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Is VidSnap.AI really ₹0 / month free?',
      a: 'Yes! VidSnap.AI is engineered using 100% card-free cloud infrastructure: Microsoft Edge-TTS neural voices, MongoDB Atlas M0, Cloudinary Media Cloud (25GB free tier, no credit card required), and local/free Redis.',
    },
    {
      q: 'What video quality and format does the engine produce?',
      a: 'The FFmpeg media worker outputs standard 720p (720x1280) H.264 MP4 vertical video with -movflags +faststart, perfectly optimized for Instagram Reels, YouTube Shorts, and TikTok with zero start buffering.',
    },
    {
      q: 'How many images can I include per reel?',
      a: 'You can upload between 1 and 5 images per reel. You can adjust the per-slide duration from 1 to 10 seconds, paired with a custom voiceover of up to 900 characters.',
    },
    {
      q: 'What happens to my generation tokens?',
      a: 'Every new account gets 5 complimentary creation tokens. Generating 1 reel consumes exactly 1 token through an atomic credit ledger with automated refund if any worker failure occurs.',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '80px', paddingBottom: '40px' }}>
      {/* ========================================================================
          HERO SECTION
          ======================================================================== */}
      <section className="container" style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 0.8fr',
        gap: '48px',
        alignItems: 'center',
        paddingTop: '20px',
      }}>
        <div>
          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--primary-gradient-subtle)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            color: 'var(--primary-light)',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '20px',
          }}>
            <Sparkles size={15} />
            <span>{t('heroBadge')}</span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(2.4rem, 4.8vw, 3.8rem)',
            lineHeight: 1.15,
            marginBottom: '20px',
          }}>
            Turn Photos & Stories into <span className="gradient-text">Viral Vertical Reels</span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: '1.125rem',
            color: 'var(--text-secondary)',
            lineHeight: '1.7',
            marginBottom: '32px',
            maxWidth: '560px',
          }}>
            {t('heroSubtitle')}
          </p>

          {/* CTA Group */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
            <Link
              href={user ? '/create' : '/register'}
              className="btn btn-primary btn-lg"
              style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
            >
              <Sparkles size={18} />
              <span>{user ? t('ctaCreateNow') : 'Get 5 Free Tokens'}</span>
              <ArrowRight size={18} />
            </Link>

            <Link
              href={user ? '/gallery' : '/login'}
              className="btn btn-secondary btn-lg"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Film size={18} />
              <span>{user ? t('ctaExploreGallery') : 'Sign In to Studio'}</span>
            </Link>
          </div>

          {/* Value Props Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} color="var(--accent-emerald)" />
              <span>Free 5 Tokens on Signup</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} color="var(--accent-emerald)" />
              <span>Edge-TTS Multi-accent Voices</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} color="var(--accent-emerald)" />
              <span>720p Faststart MP4</span>
            </div>
          </div>
        </div>

        {/* Interactive Reel Mockup / Preview Card */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="reel-aspect-container" style={{ position: 'relative' }}>
            {/* Background Simulated Reel Video Art */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 40%, #0f172a 100%)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '24px 20px',
            }}>
              {/* Top overlay */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(8px)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                  <span>720p LIVE PREVIEW</span>
                </div>

                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                  }}
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>
              </div>

              {/* Center Animated Visual Graphic */}
              <div style={{
                margin: 'auto 0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
              }}>
                <div style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '24px',
                  background: 'var(--primary-gradient)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 30px var(--primary-glow)',
                  animation: isPlaying ? 'floatAnim 3s ease-in-out infinite' : 'none',
                }}>
                  <Sparkles size={44} color="#fff" />
                </div>

                {/* Animated Sound Wave bars */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  height: '32px',
                }}>
                  {[0.4, 0.8, 0.3, 0.9, 0.6, 1.0, 0.5, 0.7].map((delay, i) => (
                    <div
                      key={i}
                      style={{
                        width: '4px',
                        background: 'var(--primary-light)',
                        borderRadius: '2px',
                        animation: isPlaying ? `wave 1.2s ease-in-out infinite ${delay}s` : 'none',
                        height: isPlaying ? '14px' : '6px',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Bottom Captions & Info */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(10px)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <Volume2 size={14} color="var(--accent-cyan)" />
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                    Natural Voiceover • en-US-AriaNeural
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 500, lineHeight: '1.4' }}>
                  &ldquo;Unlock unlimited creative potential with AI-driven visual storytelling.&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================
          FEATURE SHOWCASE (4 Glass Cards)
          ======================================================================== */}
      <section className="container">
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '2.2rem', marginBottom: '12px' }}>
            Built for <span className="gradient-text">Zero-Cost Viral Impact</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '640px', margin: '0 auto' }}>
            Every component is carefully optimized to run within free tiers while matching paid SaaS performance.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '24px',
        }}>
          {/* Card 1 */}
          <div className="glass-card glass-card-interactive">
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '18px',
              color: 'var(--primary-light)',
            }}>
              <Volume2 size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '10px' }}>Multi-Accent Neural Voices</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
              Free high-fidelity Microsoft Edge-TTS voices across US, Indian English, UK, and Hindi accents. Ultra-clear narration with zero API charges.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass-card glass-card-interactive">
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(6, 182, 212, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '18px',
              color: 'var(--accent-cyan)',
            }}>
              <Layers size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '10px' }}>Blurred 9:16 Framing</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
              FFmpeg dual-layer pipeline: creates aesthetic 9:16 vertical blurred background matching your original image aspect ratio seamlessly.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass-card glass-card-interactive">
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '18px',
              color: 'var(--accent-emerald)',
            }}>
              <Coins size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '10px' }}>Atomic Credit Ledger</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
              MongoDB atomic decrements prevent token double-spending. If any job encounters an issue, credits are automatically refunded to your balance.
            </p>
          </div>

          {/* Card 4 */}
          <div className="glass-card glass-card-interactive">
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(217, 70, 239, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '18px',
              color: 'var(--accent-pink)',
            }}>
              <Cpu size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '10px' }}>Asynchronous Worker</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
              Redis ARQ queue decouples rendering from HTTP requests. Multi-stage progress tracking (TTS → Rendering → Upload) with live status updates.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================
          FAQ ACCORDION
          ======================================================================== */}
      <section className="container-narrow">
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '10px' }}>Frequently Asked Questions</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Clear answers about our free-tier architecture and media rendering.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="glass-card"
                style={{ padding: '20px 24px', cursor: 'pointer' }}
                onClick={() => setOpenFaq(isOpen ? null : idx)}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontWeight: 600,
                  fontSize: '1.05rem',
                }}>
                  <span>{faq.q}</span>
                  <ChevronDown
                    size={20}
                    style={{
                      transform: isOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform var(--transition-fast)',
                      color: 'var(--primary-light)',
                    }}
                  />
                </div>
                {isOpen && (
                  <p style={{
                    marginTop: '14px',
                    color: 'var(--text-secondary)',
                    fontSize: '0.925rem',
                    lineHeight: '1.6',
                    animation: 'fadeInUp 0.2s ease-out',
                  }}>
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================
          BOTTOM CTA BANNER
          ======================================================================== */}
      <section className="container">
        <div style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(217, 70, 239, 0.12) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: 'var(--radius-2xl)',
          padding: '48px 32px',
          textAlign: 'center',
          backdropFilter: 'var(--glass-blur)',
        }}>
          <h2 style={{ fontSize: '2.4rem', marginBottom: '16px' }}>
            Ready to Generate Your Next Viral Reel?
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '540px', margin: '0 auto 28px auto', fontSize: '1.05rem' }}>
            Get started in 30 seconds. No credit card required. Free tier forever.
          </p>
          <Link
            href={user ? '/create' : '/register'}
            className="btn btn-primary btn-lg"
            style={{ display: 'inline-flex', gap: '10px', alignItems: 'center' }}
          >
            <Sparkles size={20} />
            <span>{user ? 'Open Reel Studio' : 'Create Free Account (5 Tokens)'}</span>
            <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      <style jsx>{`
        @media (max-width: 900px) {
          section.container {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
