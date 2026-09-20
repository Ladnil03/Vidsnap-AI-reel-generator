'use client';

/**
 * VidSnap.AI Mobile Bottom Navigation Bar
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Sparkles, Film, User, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useI18n();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="mobile-bottom-nav">
      <Link href="/" className={`bottom-nav-item ${isActive('/') ? 'active' : ''}`}>
        <Home size={20} />
        <span>{t('navHome')}</span>
      </Link>

      {user ? (
        <>
          <Link href="/gallery" className={`bottom-nav-item ${isActive('/gallery') ? 'active' : ''}`}>
            <Film size={20} />
            <span>{t('navGallery')}</span>
          </Link>

          {/* Centered highlighted Studio button */}
          <Link href="/create" className="bottom-nav-center-action" title={t('navCreate')}>
            <div className="center-icon-wrap">
              <Sparkles size={22} color="#ffffff" />
            </div>
            <span>{t('navCreate')}</span>
          </Link>

          <Link href="/feedback" className={`bottom-nav-item ${isActive('/feedback') ? 'active' : ''}`}>
            <MessageSquare size={20} />
            <span>{t('navFeedback')}</span>
          </Link>

          <Link href="/profile" className={`bottom-nav-item ${isActive('/profile') ? 'active' : ''}`}>
            <User size={20} />
            <span>{t('navProfile')}</span>
          </Link>
        </>
      ) : (
        <>
          <Link href="/feedback" className={`bottom-nav-item ${isActive('/feedback') ? 'active' : ''}`}>
            <MessageSquare size={20} />
            <span>{t('navFeedback')}</span>
          </Link>
          <Link href="/login" className={`bottom-nav-item ${isActive('/login') ? 'active' : ''}`}>
            <User size={20} />
            <span>{t('navLogin')}</span>
          </Link>
        </>
      )}

      <style jsx>{`
        .mobile-bottom-nav {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 64px;
          background: rgba(14, 19, 31, 0.92);
          backdrop-filter: var(--glass-blur);
          -webkit-backdrop-filter: var(--glass-blur);
          border-top: 1px solid var(--glass-border);
          z-index: 1000;
          align-items: center;
          justify-content: space-around;
          padding: 0 12px;
        }

        .bottom-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          font-size: 0.72rem;
          color: var(--text-muted);
          transition: color var(--transition-fast);
        }

        .bottom-nav-item.active {
          color: var(--primary-light);
        }

        .bottom-nav-center-action {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          margin-top: -18px;
          font-size: 0.72rem;
          color: var(--primary-light);
          font-weight: 600;
        }

        .center-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-full);
          background: var(--primary-gradient);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px var(--primary-glow);
          animation: pulseGlow 3s infinite;
        }

        @media (max-width: 768px) {
          .mobile-bottom-nav {
            display: flex;
          }
        }
      `}</style>
    </nav>
  );
}
