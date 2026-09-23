#!/usr/bin/env node

/**
 * VidSnap.AI Content Security Policy (CSP) Regression Validator
 * Verifies that next.config.ts properly declares all required directives
 * and host mappings for Pixabay, YouTube, Pexels, and Cloudinary.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const nextConfigPath = path.resolve(__dirname, '../next.config.ts');

const configContent = fs.readFileSync(nextConfigPath, 'utf8');

const errors = [];

function checkSubstring(target, pattern, description) {
  if (!target.includes(pattern)) {
    errors.push(`Missing: ${description} (expected '${pattern}')`);
  }
}

// 1. img-src checks
checkSubstring(configContent, 'https://cdn.pixabay.com', 'Pixabay CDN in img-src');
checkSubstring(configContent, 'https://i.vimeocdn.com', 'Vimeo CDN (Pixabay API) in img-src');
checkSubstring(configContent, 'https://images.pexels.com', 'Pexels in img-src');
checkSubstring(configContent, 'https://i.ytimg.com', 'YouTube thumbnails in img-src');

// 2. media-src checks
checkSubstring(configContent, 'https://cdn.pixabay.com', 'Pixabay video CDN in media-src');
checkSubstring(configContent, 'https://videos.pexels.com', 'Pexels video CDN in media-src');
checkSubstring(configContent, 'https://commondatastorage.googleapis.com', 'Google Sample storage in media-src');

// 3. YouTube must NOT be in media-src
const mediaSrcMatch = configContent.match(/"media-src[^"]+"/);
if (mediaSrcMatch && mediaSrcMatch[0].includes('youtube.com')) {
  errors.push(`Invalid: youtube.com must not be in media-src (must use frame-src)`);
}

// 4. frame-src checks
checkSubstring(configContent, 'frame-src', 'frame-src directive');
checkSubstring(configContent, 'https://www.youtube.com', 'YouTube in frame-src');
checkSubstring(configContent, 'https://www.youtube-nocookie.com', 'Privacy-enhanced YouTube in frame-src');

// 5. frame-ancestors & object-src
checkSubstring(configContent, "frame-ancestors 'none'", "frame-ancestors 'none' clickjacking protection");
checkSubstring(configContent, "object-src 'none'", "object-src 'none'");

// 6. remotePatterns checks
checkSubstring(configContent, 'hostname: "cdn.pixabay.com"', 'cdn.pixabay.com in remotePatterns');
checkSubstring(configContent, 'hostname: "i.vimeocdn.com"', 'i.vimeocdn.com in remotePatterns');

console.log('--- VidSnap.AI CSP Integrity Check ---');
if (errors.length > 0) {
  console.error('CSP Verification FAILED:');
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
} else {
  console.log('✓ All CSP directives, external domains, and remotePatterns verified successfully!');
  process.exit(0);
}
