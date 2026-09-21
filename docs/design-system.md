# VidSnap.AI "Forest & Paper" Design System

The VidSnap.AI frontend design system is built on a calm, nature-inspired, paper-like aesthetic designed for high contrast, accessibility (WCAG 2.2 AA), responsive mobile-first performance, and portable cross-platform tokens.

---

## 1. Brand Palette & Contrast Rules

| Color | Token | Hex | Role | Contrast on Paper (#F7F4EB) | Contrast on Dark Forest (#0E2012) |
|---|---|---|---|---|---|
| **Cream** | `--color-cream` | `#E5D9B6` / `#F7F4EB` | Paper Canvas / Dark theme text | Surface Canvas | 15.47:1 (AAA) |
| **Sage** | `--color-sage` | `#A4BE7B` | Accent, Highlights, Focus glow, Progress | Accent Fill | 10.75:1 (AAA) |
| **Moss** | `--color-moss` | `#5F8D4E` | Mid fills, Charts, Icons, Toggles | Mid Accent | 4.85:1 (AA) |
| **Forest** | `--color-forest` | `#285430` / `#0E2012` | Primary Text, Primary Buttons, Dark Surfaces | 15.47:1 (AAA) | Surface Base |

### Contrast Rules:
- **Normal body text**: Always use Forest / Forest-900 on Paper/Cream, or Cream-50 on Forest/Forest-900.
- **Moss & Sage**: Used as fills, chips, badges with bold text, progress bars, and icon indicators. Never use small body text in Moss on Cream (fails at ~2.8:1).
- **Primary CTA**: Forest background (`#285430`) with Cream text (`#F7F4EB`) -> 7.95:1 (AAA).
- **Secondary CTA**: Sage tint background with Forest-900 text (`#0E2012`) -> 13.20:1 (AAA).
- **Focus Ring**: 2px solid Forest (light) / Sage (dark) with 2px offset.

---

## 2. Themes

1. **Light ("Paper" - Default)**:
   - Canvas: Warm Cream-100 (`#EFE9D5`) / Cream-50 (`#F7F4EB`).
   - Cards: Cream-50 paper surfaces with subtle warm depth.
   - Text: Deep Forest-900 (`#0E2012`).
2. **Dark ("Forest")**:
   - Canvas: Forest-950 (`#08140B`) / Forest-900 (`#0E2012`).
   - Cards: Forest-800 (`#152E1A`) with sage hairline borders.
   - Text: Cream-50 (`#F7F4EB`).
3. **Always-Dark Video Surfaces**:
   - Reel feed player and Watch Together rooms maintain immersive dark surfaces (`--player-bg: #08140B`) in both themes for video color fidelity and contrast.

---

## 3. UI Primitives (`@/components/ui`)

All primitives are written in React 19 / Next.js 16 with pure CSS modules (`ui.module.css`) referencing CSS variables only:

1. `Button`: Variants (`primary`, `secondary`, `ghost`, `danger`), sizes (`sm`, `md`, `lg`), `loading` state with spinner.
2. `IconButton`: Accessible icon button with required `aria-label` and 44px min touch target.
3. `Spinner`: Animated loading ring in small, medium, large.
4. `FormField`: Accessible wrapper binding `label`, `id`, `hint`, and `error` messages with `aria-invalid` and `role="alert"`.
5. `Input`: Accessible text/number input with validation states.
6. `Textarea`: Accessible multiline input with vertical resize.
7. `Select`: Accessible dropdown select.
8. `Checkbox`: Custom styled accessible checkbox with keyboard support.
9. `Switch`: Accessible toggle switch (`role="switch"`).
10. `Radio`: Accessible radio button option.
11. `Card`: Container with `default`, `raised`, `sunken`, and `interactive` hover lift.
12. `Badge` (Chip): Status pill (`default`, `primary`, `sage`, `moss`, `success`, `warning`, `danger`).
13. `Avatar`: User avatar with image fallback initials, size variants, and XP gamification level ring.
14. `Tabs` & `TabPanel`: Keyboard-navigable accessible tabs (arrow keys, `role="tablist"`, `aria-selected`).
15. `Modal` & `Sheet`: Accessible dialog with focus trap, ESC dismiss, and body scroll lock.
16. `Toast`: Accessible alert notification with `aria-live="polite"`.
17. `Tooltip`: Hover/focus popup hint with `role="tooltip"`.
18. `Skeleton`: Animated shimmer skeleton in palette tints.
19. `EmptyState`: Inline SVG illustration in palette with title, description, and action button.
20. `ProgressBar` & `ProgressRing`: Progress indicators for quota and gamification streaks.
21. `Divider`: Horizontal or vertical separator with optional text label.
22. `PageHeader`: Title, description, back button, and action slot header.
23. `VisuallyHidden`: Screen-reader only announcement element.

---

## 4. Interactive Styleguide

A live reference showing every component in both themes is available during development at `/styleguide`.
