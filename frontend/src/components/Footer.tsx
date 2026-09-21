'use client';

import React from 'react';
import Link from 'next/link';
import { Heart, Shield, Cpu } from 'lucide-react';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer
      style={{
        backgroundColor: 'var(--surface-sunken)',
        borderTop: '1px solid var(--border-subtle)',
        paddingTop: 'var(--space-12)',
        paddingBottom: 'calc(var(--space-8) + env(safe-area-inset-bottom, 0px))',
        marginTop: 'auto',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 'var(--space-8)',
            marginBottom: 'var(--space-8)',
          }}
        >
          {/* Brand Column */}
          <div>
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <Logo size="md" />
            </div>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: 'var(--text-sm)',
                lineHeight: 'var(--line-height-normal)',
                marginBottom: 'var(--space-4)',
              }}
            >
              Calm, nature-inspired social entertainment platform. Turn photos and stories into high-impact 720p vertical reels.
            </p>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-1)',
                padding: 'var(--space-1) var(--space-3)',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--accent-soft)',
                border: '1px solid var(--border-subtle)',
                fontSize: 'var(--text-xs)',
                color: 'var(--accent-soft-text)',
                fontWeight: 500,
              }}
            >
              <Cpu size={14} />
              <span>Card-Free Architecture: ₹0 / month</span>
            </div>
          </div>

          {/* Studio & Discover */}
          <div>
            <h4
              style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-bold)',
                marginBottom: 'var(--space-4)',
                color: 'var(--text-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Studio & Discover
            </h4>
            <ul
              style={{
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
                fontSize: 'var(--text-sm)',
              }}
            >
              <li>
                <Link href="/create" style={{ color: 'var(--text-secondary)' }}>
                  AI Reel Studio
                </Link>
              </li>
              <li>
                <Link href="/feed" style={{ color: 'var(--text-secondary)' }}>
                  Personalized Feed
                </Link>
              </li>
              <li>
                <Link href="/explore" style={{ color: 'var(--text-secondary)' }}>
                  Explore Trends
                </Link>
              </li>
              <li>
                <Link href="/rooms" style={{ color: 'var(--text-secondary)' }}>
                  Watch Together Rooms
                </Link>
              </li>
              <li>
                <Link href="/styleguide" style={{ color: 'var(--text-secondary)' }}>
                  Design System Styleguide
                </Link>
              </li>
            </ul>
          </div>

          {/* Social & Engagement */}
          <div>
            <h4
              style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-bold)',
                marginBottom: 'var(--space-4)',
                color: 'var(--text-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Community & Creator
            </h4>
            <ul
              style={{
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
                fontSize: 'var(--text-sm)',
              }}
            >
              <li>
                <Link href="/communities" style={{ color: 'var(--text-secondary)' }}>
                  Creator Communities
                </Link>
              </li>
              <li>
                <Link href="/gamification" style={{ color: 'var(--text-secondary)' }}>
                  Daily XP & Streaks
                </Link>
              </li>
              <li>
                <Link href="/creator" style={{ color: 'var(--text-secondary)' }}>
                  Creator Portal
                </Link>
              </li>
              <li>
                <Link href="/business" style={{ color: 'var(--text-secondary)' }}>
                  Business Campaigns
                </Link>
              </li>
              <li>
                <Link href="/feedback" style={{ color: 'var(--text-secondary)' }}>
                  User Feedback
                </Link>
              </li>
            </ul>
          </div>

          {/* Architecture & Trust */}
          <div>
            <h4
              style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-bold)',
                marginBottom: 'var(--space-4)',
                color: 'var(--text-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Infrastructure & Trust
            </h4>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: 'var(--text-xs)',
                lineHeight: 'var(--line-height-normal)',
                marginBottom: 'var(--space-3)',
              }}
            >
              FastAPI, Redis media worker, FFmpeg 720p engine, Microsoft Edge-TTS, and MongoDB Atlas.
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                fontSize: 'var(--text-xs)',
                color: 'var(--text-muted)',
              }}
            >
              <Shield size={14} style={{ color: 'var(--brand-primary)' }} />
              <span>100% legal public attribution policy</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: 'var(--space-6)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-muted)',
          }}
        >
          <div>
            © {new Date().getFullYear()} VidSnap.AI. Open-source & Free-tier Social Video Architecture.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
            <span>Crafted with</span>
            <Heart size={13} style={{ color: 'var(--danger)', fill: 'var(--danger)' }} />
            <span>for viral creators</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
