# PANDU Design System (`DESIGN.md`)

**Product:** PANDU (Panduan Dukungan Inklusif: AI-assisted digital/print flashcard and adaptive exercise platform for SLB and inclusive classrooms)

**Audience:** SLB teachers (including senior teachers), students with sensory disabilities across multi-grade classrooms, and parents assisting at home

**Visual Direction:** Clean, modern, spacious edtech workspace inspired by Wayground (light-first canvas, soft rounded cards, clear hierarchy, calm teacher studio, distraction-free student stage)

**Target Stack:** Next.js (App Router), TypeScript, Tailwind CSS, `lucide-react`

## 1. Design Principles and Anti-Patterns

1. **Clarity over decoration:** Show one primary goal per screen. Keep teacher workflows linear (create, review, approve, share) and keep student screens focused on one flashcard or one exercise prompt at a time.

2. **Generous whitespace:** Separate content groups with spacing (`24px` to `32px`) and `1px` borders instead of dense grids or stacked boxes.

3. **Predictable interaction:** Maintain consistent button placement, `48px` minimum touch targets on student and classroom controls, and immediate visual state changes without timers or sudden animations.

4. **Accessible contrast on every screen:** Meet WCAG AA minimum contrast (`4.5:1` for body text, `3:1` for large text and controls) so text stays crisp on student Android phones, teacher laptops, and bright classroom Smart TVs.

5. **Multi-grade differentiation without clutter:** Present difficulty settings (2, 3, or 4 choices; text hint on/off) as simple segmented controls instead of nested configuration menus.

### Avoid (Anti-Patterns)

* Purple-blue neon gradients, glowing cards, and glassmorphism overlays

* Sparkle, magic wand, or rocket icons used as filler decoration for AI actions

* Heavy drop shadows where a `1px` hairline border separates cards cleanly

* Countdown timers, flashing badges, or bouncy animations that trigger cognitive stress

* Marketing buzzwords, adverbs, and em dashes in UI copy

## 2. Color Tokens

Light-first theme using a single restrained primary accent family (Deep Teal) and neutral Slate surfaces.

| Token | CSS Variable | Hex | Role and Usage Rules |
| ----- | ----- | ----- | ----- |
| `bg-canvas` | `--bg-canvas` | `#F8FAFC` | Default page background for Teacher Studio and Student Stage |
| `bg-surface` | `--bg-surface` | `#FFFFFF` | Primary cards, flashcards, modals, and form containers |
| `bg-surface-subtle` | `--bg-surface-subtle` | `#F1F5F9` | Secondary panels, table headers, segmented control tracks, inactive pills |
| `bg-elevated` | `--bg-elevated` | `#FFFFFF` | Floating dropdowns, popovers, QR modal, and toast surfaces |
| `border-subtle` | `--border-subtle` | `#E2E8F0` | Default `1px` card, sidebar, and table row borders |
| `border-strong` | `--border-strong` | `#CBD5E1` | Form input borders, secondary button outlines, hover borders |
| `border-focus` | `--border-focus` | `#0F766E` | Keyboard `focus-visible` ring (`2px solid #0F766E`, `2px` offset) |
| `text-primary` | `--text-primary` | `#0F172A` | Headings, flashcard vocabulary, body text (16.9:1 on `#FFFFFF`) |
| `text-secondary` | `--text-secondary` | `#475569` | Descriptions, metadata, table sub-labels (7.6:1 on `#FFFFFF`) |
| `text-muted` | `--text-muted` | `#64748B` | Placeholders, timestamps, disabled labels (4.7:1 on `#FFFFFF`) |
| `text-inverse` | `--text-inverse` | `#FFFFFF` | Text and icons on primary accent or solid status buttons |
| `accent-primary` | `--accent-primary` | `#0F766E` | Primary CTA buttons, active tabs, selected exercise option border (5.4:1 on `#FFFFFF`) |
| `accent-hover` | `--accent-hover` | `#115E59` | Hover state for primary buttons and active links |
| `accent-subtle` | `--accent-subtle` | `#F0FDFA` | Selected card tint, active sidebar item background, focus highlight |
| `status-success` | `--status-success` | `#15803D` | Correct answer border/text, `Published` badge text (5.1:1 on `#FFFFFF`) |
| `status-success-bg` | `--status-success-bg` | `#DCFCE7` | Correct answer card fill, `Published` badge background |
| `status-warning` | `--status-warning` | `#B45309` | `Draft` badge text, pending approval notice (5.0:1 on `#FFFFFF`) |
| `status-warning-bg` | `--status-warning-bg` | `#FEF3C7` | `Draft` badge background, review reminder banner |
| `status-error` | `--status-error` | `#B91C1C` | Destructive buttons, validation errors, retry indicator (6.5:1 on `#FFFFFF`) |
| `status-error-bg` | `--status-error-bg` | `#FEE2E2` | Inline error banner and destructive hover tint |

### Tailwind CSS Variable Mapping (`globals.css`)

```css
:root {
  --bg-canvas: #F8FAFC;
  --bg-surface: #FFFFFF;
  --bg-surface-subtle: #F1F5F9;
  --border-subtle: #E2E8F0;
  --border-strong: #CBD5E1;
  --text-primary: #0F172A;
  --text-secondary: #475569;
  --text-muted: #64748B;
  --accent-primary: #0F766E;
  --accent-hover: #115E59;
  --accent-subtle: #F0FDFA;
}
```

## 3. Typography

* **UI Sans-Serif:** `Plus Jakarta Sans`, fallback `system-ui, -apple-system, sans-serif`

* **Monospace:** `JetBrains Mono`, fallback `ui-monospace, monospace` (used for share codes, numeric scores, and timestamps)

* **Numeric alignment:** Apply `font-variant-numeric: tabular-nums` to all exercise scores, student recap tables, card counters (`3 / 8`), and dates.

* **Line length:** Cap instructional prose and flashcard descriptions at `60ch` to `72ch`. Keep student flashcard prompts within 7 to 10 words.

| Role | Size (`rem` / `px`) | Weight | Line Height | Letter Spacing | Usage |
| ----- | ----- | ----- | ----- | ----- | ----- |
| `TV Display` | `3.5rem` / `56px` | `700` | `1.15` | `-0.02em` | Smart TV Presentation mode flashcard word |
| `Display` | `2.25rem` / `36px` | `700` | `1.2` | `-0.02em` | Student flashcard main word, completion title |
| `H1` | `1.75rem` / `28px` | `700` | `1.25` | `-0.015em` | Page titles in Teacher Studio |
| `H2` | `1.25rem` / `20px` | `600` | `1.35` | `-0.01em` | Section headers, modal titles, card set titles |
| `H3` | `1rem` / `16px` | `600` | `1.4` | `0em` | Card subheaders, panel labels |
| `Body` | `1rem` / `16px` | `400` | `1.5` | `0em` | Standard copy, form inputs, flashcard instructions |
| `Body Small` | `0.875rem` / `14px` | `400` | `1.45` | `0em` | Table cells, secondary descriptions, helper text |
| `Caption` | `0.75rem` / `12px` | `500` | `1.35` | `0.01em` | Status badges, metadata labels, step indicators |
| `Mono` | `0.875rem` / `14px` | `500` | `1.4` | `0.02em` | Access links, scores (`8/10`), timestamps |

## 4. Layout, Spacing, and Elevation

* **Base spacing grid:** `4px` increments (`4, 8, 12, 16, 24, 32, 48, 64, 96px`).

* **Breakpoints:** `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`.

* **Container max-widths:**

  * Teacher Studio dashboard and editor: `1200px` (`px-6` on desktop, `px-4` on mobile), optional collapsible left sidebar (`240px`).

  * Student Learning and Exercise stage: `720px` centered single-column stage (`px-4` mobile, `px-8` tablet).

  * Smart TV Presentation mode: `100vw` full-bleed stage with `48px` outer safe margin and large centered card (`max-w-5xl`).

  * Print PDF export (`@media print`): A4 portrait (`210mm x 297mm`), `12mm` page margin, 2x2 or 2x3 dashed-cut card grid with `break-inside: avoid`.

* **Card internal padding:** `16px` compact cards, `24px` standard studio and student cards, `32px` Smart TV stage cards.

* **Border radii:**

  * Inputs, buttons, small badges: `8px` (`rounded-lg`)

  * Material cards, flashcards, exercise option cards: `12px` (`rounded-xl`)

  * Modals, QR dialogs, Smart TV stage card: `16px` (`rounded-2xl`)

  * Status pills and audio play triggers: `9999px` (`rounded-full`)

* **Elevation:**

  * Static cards on `#F8FAFC`: `0` shadow, `1px solid #E2E8F0`.

  * Hoverable interactive cards: `1px solid #CBD5E1` with `0 2px 6px rgba(15, 23, 42, 0.05)`.

  * Floating layers (modals, dropdowns, toasts): `1px solid #E2E8F0` with `0 10px 24px rgba(15, 23, 42, 0.08)`.

## 5. Motion and Interaction (Smoothness Rules)

* **Default easing:** `cubic-bezier(0.2, 0, 0, 1)` for entrances, card selection, and state transitions.

* **Exit easing:** `cubic-bezier(0.4, 0, 1, 1)` for closing modals and dismissing toasts.

* **Durations:**

  * `120ms` for hover colors, border shifts, and focus rings

  * `160ms` for button press (`scale(0.98)`), toggle switches, and exercise option selection

  * `220ms` to `260ms` for modals, slide-over panels, and flashcard navigation

* **Composited properties only:** Animate only `transform` and `opacity`. Do not animate `width`, `height`, `top`, or `left`.

* **Reduced motion:** Honor `@media (prefers-reduced-motion: reduce)` by replacing slide or scale transitions with a `100ms` opacity fade or instant swap.

## 6. Core Components and User-Friendly States

Every interactive element must define `default`, `hover`, `focus-visible`, `active`, `disabled`, and `loading` states.

### Buttons

* **Heights:** `40px` (`h-10`) standard studio actions, `48px` (`h-12`) primary teacher actions and all student/Smart TV buttons, `36px` (`h-9`) compact table actions.

* **Variants:**

  * **Primary:** Background `#0F766E`, text `#FFFFFF`, hover `#115E59`, active `scale(0.98)`, disabled opacity `0.5` with `cursor-not-allowed`, loading shows a `16px` inline spinner and locks clicks.

  * **Secondary:** Background `#FFFFFF`, `1px solid #CBD5E1`, text `#0F172A`, hover `#F1F5F9`.

  * **Ghost:** Transparent background, text `#475569`, hover `#F1F5F9` with text `#0F172A`.

  * **Destructive:** Background `#B91C1C`, text `#FFFFFF`, hover `#991B1B`.

* **Focus state:** `2px solid #0F766E` ring with `2px` offset on keyboard navigation.

### Form Inputs and Validation

* **Height:** `44px` (`h-11`), radius `8px`, `1px solid #CBD5E1`, background `#FFFFFF`, padding `0 12px`.

* **Labels:** Placed above the input (`14px`, weight `600`, `#0F172A`), `6px` gap below label.

* **States:** Focus sets `border-color: #0F766E` and a `3px` subtle ring (`rgba(15, 118, 110, 0.15)`). Error sets `border-color: #B91C1C`, displays an inline error sentence (`13px`, `#B91C1C`) below the input, and binds `aria-invalid="true"`. Disabled uses `#F1F5F9` fill and `#64748B` text.

### Flashcards and Exercise Option Cards (`Tap-to-Match`)

* **Structure:** Fixed `4:3` image/pictogram container (`bg-[#F8FAFC]`, `rounded-lg`, `object-contain`), bold vocabulary label below, optional short instruction, and a dedicated `48px` round Audio button (`Volume2` icon).

* **Student Selection States:**

  * `default`: `#FFFFFF`, `1px solid #E2E8F0`

  * `hover`: `#F8FAFC`, `1px solid #CBD5E1`

  * `selected`: `#F0FDFA`, `2px solid #0F766E`

  * `correct`: `#DCFCE7`, `2px solid #15803D` with `CheckCircle2` icon

  * `incorrect`: `#FEE2E2`, `2px solid #B91C1C` with calm retry prompt (no harsh buzzer)

### Navigation, Tables, Modals, and Feedback

* **Teacher Navigation:** Top bar (`64px` height, `#FFFFFF`, `1px` bottom border `#E2E8F0`) with **PANDU** wordmark, primary `Buat Materi` button, and teacher account menu.

* **Student Recap Table:** Full-width `#FFFFFF` container with `1px solid #E2E8F0`, `#F1F5F9` header row (`12px` uppercase `#475569`), `52px` row height, `tabular-nums` on scores and timestamps.

* **QR Share Modal:** `440px` max width, `16px` radius, centered `220×220px` crisp QR code on pure `#FFFFFF` with `16px` quiet zone, one-click `Salin Tautan` button, and close (`X`) control with `Escape` key support.

* **Toast Notifications:** Bottom-right (`24px` inset), auto-dismiss after `4000ms` (persist on error until dismissed), max one visible toast at a time.

* **Skeleton Loaders:** Solid `#E2E8F0` rounded blocks with subtle opacity pulse (`1.5s`) matching exact card dimensions during AI generation and data fetch.

* **Empty States:** Centered container (`max-w-sm`) with a single `lucide-react` icon (`32px`, `#64748B`), one-sentence explanation, and one primary CTA button (`Buat Materi Pertama`).

## 7. Microcopy Rules (Stop-Slop UI Copy)

Write all interface labels in clear, direct Bahasa Indonesia.

* **Use Verb + Noun labels:** Write `Buat Materi`, `Unggah Foto`, `Rekam Suara`, `Setujui & Terbitkan`, `Cetak PDF`, `Bagikan QR`, `Mulai Latihan`. Avoid vague labels like `Kirim`, `Lanjut`, or `Proses`.

* **Keep helper text to one direct sentence:** Example: `Pilih foto buku atau ketik topik untuk menyusun draf kartu.` Cut filler phrases, adverbs, and em dashes.

* **Write actionable error messages:** State what failed and what to do next. Example: `Gagal menyimpan rekaman suara. Periksa izin mikrofon lalu rekam ulang.`

* **Use warm, concise student feedback:** Example: `Bagus! Jawaban benar.` or `Coba pilih kartu lain.` Avoid exclamation spam or robotic praise.