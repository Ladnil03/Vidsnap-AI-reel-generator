#!/usr/bin/env node

/**
 * VidSnap.AI Hardcoded Color Linter
 * Ensures no raw hex, rgb(), rgba(), hsl(), or hsla() colors appear
 * outside src/styles/tokens.css and authorized SVG logo definitions.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

const EXEMPT_FILES = [
  'styles/tokens.css',
  'components/Logo.tsx',
  'components/ui/EmptyState.tsx', // May contain inline SVG illustrations in palette
];

const COLOR_REGEX = /(#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d+[^)]*\)|hsla?\(\s*\d+[^)]*\))/g;

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath, fileList);
    } else if (/\.(tsx|ts|jsx|js|css)$/.test(file)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allFiles = walkDir(srcDir);
const violations = [];

for (const filePath of allFiles) {
  const relativePath = path.relative(srcDir, filePath).replace(/\\/g, '/');
  if (EXEMPT_FILES.some((exempt) => relativePath.endsWith(exempt))) {
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Skip comments or disable flags
    if (line.includes('color-lint-disable')) return;

    let match;
    while ((match = COLOR_REGEX.exec(line)) !== null) {
      violations.push({
        file: relativePath,
        line: index + 1,
        match: match[0],
        snippet: line.trim(),
      });
    }
  });
}

console.log('--- Hardcoded Color Audit ---');
if (violations.length === 0) {
  console.log('All files pass! Zero hardcoded colors outside tokens.css.');
  process.exit(0);
} else {
  console.log(`Found ${violations.length} hardcoded color instances across ${new Set(violations.map((v) => v.file)).size} files:`);
  violations.slice(0, 30).forEach((v) => {
    console.log(`  ${v.file}:${v.line} -> ${v.match}`);
  });
  if (violations.length > 30) {
    console.log(`  ... and ${violations.length - 30} more violations.`);
  }

  const isSoft = process.argv.includes('--warn');
  if (isSoft) {
    console.warn('\nRunning with --warn: Exiting with code 0 for intermediate slices.');
    process.exit(0);
  } else {
    process.exit(1);
  }
}
