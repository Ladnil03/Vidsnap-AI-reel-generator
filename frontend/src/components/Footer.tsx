'use client';

/**
 * VidSnap.AI Modern Footer Component
 */

import React from 'react';
import Link from 'next/link';
import { Clapperboard, Heart, Shield, Cpu } from 'lucide-react';

export function Footer() {
  return (
    <footer style={{
      background: 'rgba(7, 9, 14, 0.95)',
      borderTop: '1px solid var(--glass-border)',
      padding: '48px 0 32px 0',
      marginTop: 'auto',
    }}>
      <div className="container">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '36px',
          marginBottom: '40px',
        }}>
          {/* Brand Col */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--primary-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Clapperboard size={18} color="#fff" />
              </div>
              <span style={{ fontWeight: 800, fontSize: '1.2rem', fontFamily: 'var(--font-family-heading)' }}>
                VidSnap<span style={{ color: 'var(--primary-light)' }}>.AI</span>
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.6', marginBottom: '16px' }}>
              Next-generation AI social entertainment platform. Transform photos and creative stories into high-impact 720p vertical reels.
            </p>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              fontSize: '0.75rem',
              color: '#34d399',
            }}>
              <Cpu size={12} />
              <span>Target Infra Cost: ₹0 / month</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '16px', color: 'var(--text-primary)' }}>
              Studio & Tools
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem' }}>
              <li><Link href="/create" style={{ color: 'var(--text-secondary)' }}>AI Reel Studio</Link></li>
              <li><Link href="/gallery" style={{ color: 'var(--text-secondary)' }}>User Gallery</Link></li>
              <li><Link href="/feedback" style={{ color: 'var(--text-secondary)' }}>Share Feedback</Link></li>
              <li><a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)' }}>OpenAPI Docs ↗</a></li>
            </ul>
          </div>

          {/* Compliance & Free Tier Tech */}
          <div>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '16px', color: 'var(--text-primary)' }}>
              Architecture & Compliance
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', lineHeight: '1.6', marginBottom: '12px' }}>
              Built with Python FastAPI, ARQ Redis media worker, FFmpeg 720p video engine, Microsoft Edge-TTS, and MongoDB Atlas M0.
            </p>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
            }}>
              <Shield size={14} color="var(--primary-light)" />
              <span>100% legal public-source attribution policy</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{
          borderTop: '1px solid var(--glass-border)',
          paddingTop: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
        }}>
          <div>
            © {new Date().getFullYear()} VidSnap.AI. Open-source & Free-tier Social Video Architecture.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Crafted with</span>
            <Heart size={13} color="var(--accent-rose)" fill="var(--accent-rose)" />
            <span>for viral creators</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
