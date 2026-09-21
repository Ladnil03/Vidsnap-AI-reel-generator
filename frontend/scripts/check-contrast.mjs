#!/usr/bin/env node

/**
 * VidSnap.AI WCAG 2.2 Contrast Checker
 * Calculates relative luminance and contrast ratios for Forest & Paper design tokens.
 * Fails if any normal body/content pair is below 4.5:1.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function hexToRgb(hex) {
  let cleaned = hex.replace('#', '').trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map((c) => c + c).join('');
  }
  const num = parseInt(cleaned, 16);
  return [
    (num >> 16) & 255,
    (num >> 8) & 255,
    num & 255,
  ];
}

function channelLuminance(c) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function getLuminance(hex) {
  const [r, g, b] = hexToRgb(hex);
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

function getContrastRatio(hex1, hex2) {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const bright = Math.max(lum1, lum2);
  const dark = Math.min(lum1, lum2);
  return (bright + 0.05) / (dark + 0.05);
}

const tokensPath = path.resolve(__dirname, '../../docs/design-tokens.json');
if (!fs.existsSync(tokensPath)) {
  console.error(`Error: Could not find ${tokensPath}`);
  process.exit(1);
}

const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));

const pairsToTest = [
  // Light Theme ("Paper")
  { theme: 'light', name: 'Primary Text on Paper Surface', text: tokens.themes.light.text.primary, bg: tokens.themes.light.surface.paper, min: 4.5 },
  { theme: 'light', name: 'Primary Text on Base Canvas', text: tokens.themes.light.text.primary, bg: tokens.themes.light.surface.base, min: 4.5 },
  { theme: 'light', name: 'Secondary Text on Paper Surface', text: tokens.themes.light.text.secondary, bg: tokens.themes.light.surface.paper, min: 4.5 },
  { theme: 'light', name: 'Muted Text on Paper Surface', text: tokens.themes.light.text.muted, bg: tokens.themes.light.surface.paper, min: 4.5 },
  { theme: 'light', name: 'Primary CTA Text on Forest Button', text: tokens.themes.light.brand.primaryText, bg: tokens.themes.light.brand.primary, min: 4.5 },
  { theme: 'light', name: 'Secondary Button Text on Sage Tint', text: tokens.themes.light.brand.secondaryText, bg: tokens.themes.light.brand.secondary, min: 4.5 },
  { theme: 'light', name: 'Danger Text on Paper Surface', text: tokens.themes.light.feedback.danger, bg: tokens.themes.light.surface.paper, min: 4.5 },
  { theme: 'light', name: 'Warning Text on Paper Surface', text: tokens.themes.light.feedback.warning, bg: tokens.themes.light.surface.paper, min: 4.5 },
  { theme: 'light', name: 'Success Text on Paper Surface', text: tokens.themes.light.feedback.success, bg: tokens.themes.light.surface.paper, min: 4.5 },

  // Dark Theme ("Forest")
  { theme: 'dark', name: 'Primary Text on Forest Paper Surface', text: tokens.themes.dark.text.primary, bg: tokens.themes.dark.surface.paper, min: 4.5 },
  { theme: 'dark', name: 'Primary Text on Forest Raised Surface', text: tokens.themes.dark.text.primary, bg: tokens.themes.dark.surface.raised, min: 4.5 },
  { theme: 'dark', name: 'Primary Text on Forest Base Canvas', text: tokens.themes.dark.text.primary, bg: tokens.themes.dark.surface.base, min: 4.5 },
  { theme: 'dark', name: 'Secondary Text on Forest Paper Surface', text: tokens.themes.dark.text.secondary, bg: tokens.themes.dark.surface.paper, min: 4.5 },
  { theme: 'dark', name: 'Muted Text on Forest Paper Surface', text: tokens.themes.dark.text.muted, bg: tokens.themes.dark.surface.paper, min: 4.5 },
  { theme: 'dark', name: 'Primary CTA Text on Forest Button', text: tokens.themes.dark.brand.primaryText, bg: tokens.themes.dark.brand.primary, min: 4.5 },
  { theme: 'dark', name: 'Danger Text on Forest Paper Surface', text: tokens.themes.dark.feedback.danger, bg: tokens.themes.dark.surface.paper, min: 4.5 },
  { theme: 'dark', name: 'Warning Text on Forest Paper Surface', text: tokens.themes.dark.feedback.warning, bg: tokens.themes.dark.surface.paper, min: 4.5 },
  { theme: 'dark', name: 'Success Text on Forest Paper Surface', text: tokens.themes.dark.feedback.success, bg: tokens.themes.dark.surface.paper, min: 4.5 },
];

let failed = false;
console.log('--- Checking WCAG 2.2 Contrast Compliance ---');

for (const pair of pairsToTest) {
  const ratio = getContrastRatio(pair.text, pair.bg);
  const passed = ratio >= pair.min;
  const status = passed ? 'PASS' : 'FAIL';
  console.log(`[${status}] [${pair.theme.toUpperCase()}] ${pair.name}: ${ratio.toFixed(2)}:1 (required >= ${pair.min}:1) [text: ${pair.text}, bg: ${pair.bg}]`);
  if (!passed) {
    failed = true;
  }
}

if (failed) {
  console.error('\nContrast check failed: One or more token pairs do not meet WCAG AA requirements.');
  process.exit(1);
} else {
  console.log('\nAll token pairs meet or exceed WCAG AA requirements!');
}
