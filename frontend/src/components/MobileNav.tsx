'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Sparkles, Tv, User } from 'lucide-react';
import styles from './MobileNav.module.css';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useI18n();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className={styles.bottomNav} aria-label="Mobile Navigation">
      <Link
        href="/feed"
        className={`${styles.navItem} ${isActive('/feed') || isActive('/') ? styles.navItemActive : ''}`}
        aria-current={isActive('/feed') || isActive('/') ? 'page' : undefined}
      >
        <Home size={20} />
        <span>{t('navHome') || 'Home'}</span>
      </Link>

      <Link
        href="/explore"
        className={`${styles.navItem} ${isActive('/explore') ? styles.navItemActive : ''}`}
        aria-current={isActive('/explore') ? 'page' : undefined}
      >
        <Compass size={20} />
        <span>Explore</span>
      </Link>

      {/* Center Highlighted Studio Action */}
      <Link
        href="/create"
        className={styles.centerAction}
        aria-label={t('navCreate') || 'Create Reel'}
      >
        <div className={styles.centerIconWrap}>
          <Sparkles size={22} />
        </div>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--brand-primary)', fontWeight: 600 }}>
          {t('navCreate') || 'Create'}
        </span>
      </Link>

      <Link
        href="/rooms"
        className={`${styles.navItem} ${isActive('/rooms') ? styles.navItemActive : ''}`}
        aria-current={isActive('/rooms') ? 'page' : undefined}
      >
        <Tv size={20} />
        <span>Rooms</span>
      </Link>

      <Link
        href={user ? '/profile' : '/login'}
        className={`${styles.navItem} ${isActive('/profile') || isActive('/login') ? styles.navItemActive : ''}`}
        aria-current={isActive('/profile') || isActive('/login') ? 'page' : undefined}
      >
        <User size={20} />
        <span>{user ? t('navProfile') || 'Profile' : t('navLogin') || 'Login'}</span>
      </Link>
    </nav>
  );
}
