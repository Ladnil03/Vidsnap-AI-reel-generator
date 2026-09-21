'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Compass,
  Film,
  Users,
  Tv,
  Sparkles,
  Bot,
  Bell,
  Coins,
  Flame,
  Globe,
  Sun,
  Moon,
  LogOut,
  LogIn,
  User,
  ShieldCheck,
  Briefcase,
  Trophy,
  Menu,
  X,
  Search,
} from 'lucide-react';
import styles from './Navbar.module.css';
import { Logo } from './Logo';
import { Button, IconButton, Badge, Avatar } from './ui';
import { useAuth } from '../context/AuthContext';
import { useI18n, Locale } from '../context/I18nContext';
import { useTheme } from '../context/ThemeContext';
import NotificationsDrawer from './NotificationsDrawer';
import { api } from '@/lib/api';

export function Navbar() {
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const { theme, toggleTheme } = useTheme();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const profileRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      api.notifications
        .list(true, 1)
        .then((res) => setUnreadCount(res.unread_count))
        .catch(() => {});
    }
  }, [user]);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);
  }, [pathname]);

  const isActive = (path: string) => pathname === path;

  const NAV_ITEMS = [
    { href: '/feed', label: 'Feed', icon: <Film size={18} /> },
    { href: '/explore', label: 'Explore', icon: <Compass size={18} /> },
    { href: '/create', label: t('navCreate') || 'Create', icon: <Sparkles size={18} /> },
    { href: '/rooms', label: 'Watch Together', icon: <Tv size={18} /> },
    { href: '/communities', label: 'Communities', icon: <Users size={18} /> },
    { href: '/companion', label: 'AI Companion', icon: <Bot size={18} /> },
  ];

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        {/* Brand Logo */}
        <Logo size="md" />

        {/* Desktop Primary Nav */}
        <nav className={`${styles.navLinks} ${styles.desktopOnly}`} aria-label="Main Navigation">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${active ? styles.navLinkActive : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Section: Tokens, Streak, Theme, Lang, Notifications, Auth */}
        <div className={styles.rightGroup}>
          {/* User Credits / Streak */}
          {user && (
            <div className={`${styles.chipGroup} ${styles.desktopOnly}`}>
              <Link href="/create" title="Creation Tokens Remaining">
                <Badge variant="sage" icon={<Coins size={14} />}>
                  {user.tokens_remaining ?? 0}
                </Badge>
              </Link>
              <Link href="/gamification" title="Daily Streak & XP">
                <Badge variant="moss" icon={<Flame size={14} />}>
                  Streak
                </Badge>
              </Link>
            </div>
          )}

          {/* Theme Toggle */}
          <IconButton
            icon={theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            onClick={toggleTheme}
            size="sm"
          />

          {/* Language Switcher */}
          <div ref={langRef} style={{ position: 'relative' }}>
            <IconButton
              icon={<Globe size={18} />}
              aria-label="Change language"
              onClick={() => setLangMenuOpen((prev) => !prev)}
              size="sm"
            />
            {langMenuOpen && (
              <div className={styles.menuDropdown} role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className={styles.dropdownItem}
                  onClick={() => {
                    setLocale('en');
                    setLangMenuOpen(false);
                  }}
                >
                  English {locale === 'en' && '✓'}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={styles.dropdownItem}
                  onClick={() => {
                    setLocale('hi');
                    setLangMenuOpen(false);
                  }}
                >
                  हिन्दी (Hindi) {locale === 'hi' && '✓'}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={styles.dropdownItem}
                  onClick={() => {
                    setLocale('es');
                    setLangMenuOpen(false);
                  }}
                >
                  Español (Spanish) {locale === 'es' && '✓'}
                </button>
              </div>
            )}
          </div>

          {/* Notifications Trigger */}
          {user && (
            <div style={{ position: 'relative' }}>
              <IconButton
                icon={<Bell size={18} />}
                aria-label="View notifications"
                onClick={() => setNotificationsOpen(true)}
                size="sm"
              />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    width: '8px',
                    height: '8px',
                    borderRadius: 'var(--radius-pill)',
                    backgroundColor: 'var(--danger)',
                    pointerEvents: 'none',
                  }}
                />
              )}
            </div>
          )}

          {/* User Profile or Login */}
          {user ? (
            <div ref={profileRef} style={{ position: 'relative' }}>
              <button
                type="button"
                aria-label="Open profile menu"
                aria-expanded={profileMenuOpen}
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              >
                <Avatar
                  fallback={user.name || user.email || 'U'}
                  size="sm"
                />
              </button>

              {profileMenuOpen && (
                <div className={styles.menuDropdown} role="menu">
                  <div style={{ padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--text-sm)' }}>
                      {user.name || 'Creator'}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {user.email}
                    </div>
                  </div>

                  <Link href="/profile" className={styles.dropdownItem} role="menuitem">
                    <User size={16} />
                    <span>My Profile</span>
                  </Link>
                  <Link href="/gallery" className={styles.dropdownItem} role="menuitem">
                    <Film size={16} />
                    <span>My Creations</span>
                  </Link>
                  <Link href="/gamification" className={styles.dropdownItem} role="menuitem">
                    <Trophy size={16} />
                    <span>XP & Badges</span>
                  </Link>
                  <Link href="/creator" className={styles.dropdownItem} role="menuitem">
                    <Sparkles size={16} />
                    <span>Creator Dashboard</span>
                  </Link>
                  <Link href="/business" className={styles.dropdownItem} role="menuitem">
                    <Briefcase size={16} />
                    <span>Business Portal</span>
                  </Link>
                  {isAdmin && (
                    <Link href="/admin" className={styles.dropdownItem} role="menuitem">
                      <ShieldCheck size={16} />
                      <span>Admin Console</span>
                    </Link>
                  )}
                  <button
                    type="button"
                    className={styles.dropdownItem}
                    role="menuitem"
                    style={{ color: 'var(--danger)' }}
                    onClick={() => {
                      logout();
                      setProfileMenuOpen(false);
                    }}
                  >
                    <LogOut size={16} />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className={`${styles.chipGroup} ${styles.desktopOnly}`}>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  {t('navLogin') || 'Login'}
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="primary" size="sm">
                  {t('navSignUp') || 'Sign Up'}
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <IconButton
            icon={mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            aria-label="Toggle navigation menu"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className={styles.mobileMenuBtn}
            size="sm"
          />
        </div>
      </div>

      {/* Mobile Dropdown Panel */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            top: '70px',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'var(--surface-paper)',
            padding: 'var(--space-6)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
            zIndex: varZSticky(),
            overflowY: 'auto',
          }}
        >
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${isActive(item.href) ? styles.navLinkActive : ''}`}
                style={{ fontSize: 'var(--text-base)', padding: 'var(--space-3)' }}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-4)' }}>
            {!user ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <Link href="/login">
                  <Button variant="secondary" style={{ width: '100%' }}>Login</Button>
                </Link>
                <Link href="/register">
                  <Button variant="primary" style={{ width: '100%' }}>Sign Up</Button>
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <Link href="/profile" className={styles.dropdownItem}>
                  <User size={18} />
                  <span>My Profile</span>
                </Link>
                <Link href="/creator" className={styles.dropdownItem}>
                  <Sparkles size={18} />
                  <span>Creator Dashboard</span>
                </Link>
                <Link href="/business" className={styles.dropdownItem}>
                  <Briefcase size={18} />
                  <span>Business Portal</span>
                </Link>
                {isAdmin && (
                  <Link href="/admin" className={styles.dropdownItem}>
                    <ShieldCheck size={18} />
                    <span>Admin Console</span>
                  </Link>
                )}
                <Button variant="danger" onClick={logout} style={{ marginTop: 'var(--space-2)' }}>
                  Log Out
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notifications Drawer */}
      <NotificationsDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </header>
  );
}

function varZSticky() {
  return 100;
}
