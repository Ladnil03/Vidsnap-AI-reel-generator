'use client';

import React, { useRef } from 'react';
import styles from './ui.module.css';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
  ariaLabel?: string;
  style?: React.CSSProperties;
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  className = '',
  ariaLabel = 'Navigation Tabs',
  style,
}: TabsProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;
    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else {
      return;
    }

    e.preventDefault();
    tabRefs.current[nextIndex]?.focus();
    if (!tabs[nextIndex].disabled) {
      onChange(tabs[nextIndex].id);
    }
  };

  return (
    <div className={`${styles.tabList} ${className}`} role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab, idx) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[idx] = el;
            }}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
          >
            {tab.icon && <span style={{ marginRight: '6px' }}>{tab.icon}</span>}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export interface TabPanelProps {
  id: string;
  activeTab: string;
  children: React.ReactNode;
  className?: string;
}

export function TabPanel({ id, activeTab, children, className = '' }: TabPanelProps) {
  if (id !== activeTab) return null;

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${id}`}
      aria-labelledby={`tab-${id}`}
      tabIndex={0}
      className={`${styles.tabPanel} ${className}`}
    >
      {children}
    </div>
  );
}
