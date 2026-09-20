'use client';

/**
 * VidSnap.AI Glassmorphic Navigation Bar
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Clapperboard, 
  Sparkles, 
  Film, 
  MessageSquare, 
  ShieldCheck, 
  User, 
  LogOut, 
  LogIn, 
  Menu, 
  X, 
  Coins, 
  Globe,
  Bell,
  Compass,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n, Locale } from '../context/I18nContext';
import NotificationsDrawer from './NotificationsDrawer';
import { api } from '@/lib/api';

export function Navbar() {
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  React.useEffect(() => {
    if (user) {
      api.notifications.list(true, 1).then((res) => setUnreadCount(res.unread_count)).catch(() => {});
    }
  }, [user]);

  const isActive = (path: string) => pathname === path;

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '68px',
      zIndex: 1000,
      background: 'rgba(7, 9, 14, 0.75)',
      backdropFilter: 'var(--glass-blur)',
      WebkitBackdropFilter: 'var(--glass-blur)',
      borderBottom: '1px solid var(--glass-border)',
      display: 'flex',
      alignItems: 'center',
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Brand Logo */}
        <Link href="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 800,
          fontSize: '1.25rem',
          letterSpacing: '-0.02em',
        }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--primary-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px var(--primary-glow)',
          }}>
            <Clapperboard size={20} color="#fff" />
          </div>
          <span style={{ fontFamily: 'var(--font-family-heading)' }}>
            VidSnap<span style={{ color: 'var(--primary-light)' }}>.AI</span>
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }} className="desktop-nav">
          <Link
            href="/"
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.9rem',
              fontWeight: 500,
              color: isActive('/') ? 'var(--primary-light)' : 'var(--text-secondary)',
              background: isActive('/') ? 'var(--glass-bg-hover)' : 'transparent',
              transition: 'all var(--transition-fast)',
            }}
          >
            {t('navHome')}
          </Link>

          <Link
            href="/feed"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.9rem',
              fontWeight: 500,
              color: isActive('/feed') ? 'var(--primary-light)' : 'var(--text-secondary)',
              background: isActive('/feed') ? 'var(--glass-bg-hover)' : 'transparent',
              transition: 'all var(--transition-fast)',
            }}
          >
            <Compass size={16} />
            <span>Feed</span>
          </Link>

          <Link
            href="/explore"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.9rem',
              fontWeight: 500,
              color: isActive('/explore') ? 'var(--primary-light)' : 'var(--text-secondary)',
              background: isActive('/explore') ? 'var(--glass-bg-hover)' : 'transparent',
              transition: 'all var(--transition-fast)',
            }}
          >
            <Sparkles size={16} />
            <span>Explore</span>
          </Link>

          <Link
            href="/communities"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.9rem',
              fontWeight: 500,
              color: isActive('/communities') ? 'var(--primary-light)' : 'var(--text-secondary)',
              background: isActive('/communities') ? 'var(--glass-bg-hover)' : 'transparent',
              transition: 'all var(--transition-fast)',
            }}
          >
            <Users size={16} />
            <span>Communities</span>
          </Link>

          {user && (
            <>
              <Link
                href="/create"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: isActive('/create') ? 'var(--primary-light)' : 'var(--text-secondary)',
                  background: isActive('/create') ? 'var(--glass-bg-hover)' : 'transparent',
                }}
              >
                <Sparkles size={16} color="var(--primary-light)" />
                {t('navCreate')}
              </Link>

              <Link
                href="/gallery"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: isActive('/gallery') ? 'var(--primary-light)' : 'var(--text-secondary)',
                  background: isActive('/gallery') ? 'var(--glass-bg-hover)' : 'transparent',
                }}
              >
                <Film size={16} />
                {t('navGallery')}
              </Link>
            </>
          )}

          <Link
            href="/feedback"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.9rem',
              fontWeight: 500,
              color: isActive('/feedback') ? 'var(--primary-light)' : 'var(--text-secondary)',
              background: isActive('/feedback') ? 'var(--glass-bg-hover)' : 'transparent',
            }}
          >
            <MessageSquare size={16} />
            {t('navFeedback')}
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#38bdf8',
                background: 'rgba(6, 182, 212, 0.1)',
                border: '1px solid rgba(6, 182, 212, 0.25)',
              }}
            >
              <ShieldCheck size={16} />
              {t('navAdmin')}
            </Link>
          )}
        </nav>

        {/* Right Section: Language, Token Counter, Auth state */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          {/* Language Switcher Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
              title="Select Language"
            >
              <Globe size={14} />
              <span>{locale.toUpperCase()}</span>
            </button>

            {langMenuOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)',
                display: 'flex',
                flexDirection: 'column',
                minWidth: '120px',
                overflow: 'hidden',
                zIndex: 200,
              }}>
                <button
                  onClick={() => { setLocale('en'); setLangMenuOpen(false); }}
                  style={{
                    padding: '8px 14px',
                    textAlign: 'left',
                    color: locale === 'en' ? 'var(--primary-light)' : 'var(--text-primary)',
                    fontSize: '0.85rem',
                    background: locale === 'en' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  }}
                >
                  English
                </button>
                <button
                  onClick={() => { setLocale('hi'); setLangMenuOpen(false); }}
                  style={{
                    padding: '8px 14px',
                    textAlign: 'left',
                    color: locale === 'hi' ? 'var(--primary-light)' : 'var(--text-primary)',
                    fontSize: '0.85rem',
                    background: locale === 'hi' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  }}
                >
                  हिन्दी (Hindi)
                </button>
                <button
                  onClick={() => { setLocale('es'); setLangMenuOpen(false); }}
                  style={{
                    padding: '8px 14px',
                    textAlign: 'left',
                    color: locale === 'es' ? 'var(--primary-light)' : 'var(--text-primary)',
                    fontSize: '0.85rem',
                    background: locale === 'es' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  }}
                >
                  Español
                </button>
              </div>
            )}
          </div>

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Token Badge */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: 'var(--primary-light)',
                fontWeight: 600,
                fontSize: '0.825rem',
              }}>
                <Coins size={14} />
                <span>{user.tokens_remaining} {t('tokensLeft')}</span>
              </div>

              {/* Notifications Bell */}
              <button
                onClick={() => setNotificationsOpen(true)}
                style={{
                  position: 'relative',
                  padding: '7px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  color: unreadCount > 0 ? 'var(--primary-light)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Notifications"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      background: '#f43f5e',
                      color: '#fff',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      minWidth: '16px',
                      height: '16px',
                      borderRadius: '999px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 3px',
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Profile Link */}
              <Link
                href="/profile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                }}
              >
                <User size={15} />
                <span className="hide-mobile">{user.name.split(' ')[0]}</span>
              </Link>

              {/* Logout */}
              <button
                onClick={logout}
                style={{
                  padding: '7px',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title={t('navLogout')}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link
                href="/login"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.825rem' }}
              >
                <LogIn size={14} />
                <span>{t('navLogin')}</span>
              </Link>
              <Link
                href="/register"
                className="btn btn-primary btn-sm hide-mobile"
                style={{ fontSize: '0.825rem' }}
              >
                <span>{t('navSignUp')}</span>
              </Link>
            </div>
          )}

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              padding: '6px',
              color: 'var(--text-primary)',
              display: 'none',
            }}
            className="mobile-hamburger"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div style={{
          position: 'absolute',
          top: '68px',
          left: 0,
          right: 0,
          background: 'var(--bg-surface-elevated)',
          borderBottom: '1px solid var(--glass-border)',
          padding: '16px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          zIndex: 999,
        }}>
          <Link href="/" onClick={() => setMobileMenuOpen(false)} style={{ padding: '8px 0', fontSize: '1rem' }}>
            {t('navHome')}
          </Link>
          <Link href="/feed" onClick={() => setMobileMenuOpen(false)} style={{ padding: '8px 0', fontSize: '1rem' }}>
            Feed
          </Link>
          <Link href="/explore" onClick={() => setMobileMenuOpen(false)} style={{ padding: '8px 0', fontSize: '1rem' }}>
            Explore
          </Link>
          <Link href="/communities" onClick={() => setMobileMenuOpen(false)} style={{ padding: '8px 0', fontSize: '1rem' }}>
            Communities
          </Link>
          {user && (
            <>
              <Link href="/create" onClick={() => setMobileMenuOpen(false)} style={{ padding: '8px 0', fontSize: '1rem' }}>
                {t('navCreate')}
              </Link>
              <Link href="/gallery" onClick={() => setMobileMenuOpen(false)} style={{ padding: '8px 0', fontSize: '1rem' }}>
                {t('navGallery')}
              </Link>
              <Link href="/profile" onClick={() => setMobileMenuOpen(false)} style={{ padding: '8px 0', fontSize: '1rem' }}>
                {t('navProfile')}
              </Link>
            </>
          )}
          <Link href="/feedback" onClick={() => setMobileMenuOpen(false)} style={{ padding: '8px 0', fontSize: '1rem' }}>
            {t('navFeedback')}
          </Link>
          {isAdmin && (
            <Link href="/admin" onClick={() => setMobileMenuOpen(false)} style={{ padding: '8px 0', fontSize: '1rem', color: '#38bdf8' }}>
              {t('navAdmin')}
            </Link>
          )}
        </div>
      )}

      {/* Slide-out Notifications Drawer */}
      <NotificationsDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onUnreadChange={setUnreadCount}
      />

      <style jsx global>{`
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-hamburger {
            display: flex !important;
          }
          .hide-mobile {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}
