# Design System Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current mint-green/slate palette with a dark-first, high-end tattoo aesthetic — near-black base, warm parchment light mode, warm gold accent, sharp corners, Barlow Condensed headlines, and a subtle CSS grain texture.

**Architecture:** All colour tokens live in CSS custom properties in `app/globals.css` and are consumed via Tailwind's semantic token aliases — changing the tokens cascades to every shadcn/ui component automatically. Three components bypass the token system with hardcoded `emerald-*` Tailwind classes; those are patched individually. A `--gold` token is added to both `globals.css` and `tailwind.config.ts` so gold can be referenced as `bg-gold/15`, `text-gold`, etc.

**Tech Stack:** Next.js App Router, Tailwind CSS v3 (shadcn/ui token convention), `next/font/google` (Barlow Condensed + Geist), CSS SVG filter for grain overlay.

---

## File Map

| File | Change |
|---|---|
| `app/globals.css` | Replace all HSL tokens; add heading font rule, grain overlay, gold-rule utility |
| `tailwind.config.ts` | Add `gold` colour token |
| `app/layout.tsx` | Add Barlow Condensed font; update `themeColor` meta |
| `components/dashboard/clients/clients-table.tsx` | Replace hardcoded emerald badge |
| `components/dashboard/clients/clients-cards.tsx` | Replace hardcoded emerald badge + edit button colours |
| `components/dashboard/expenses/expense-category-filter-pills.tsx` | Replace hardcoded emerald filter pill + sharp corners |

---

### Task 1: Replace CSS design tokens in `app/globals.css`

**Files:**
- Modify: `app/globals.css`

This replaces every HSL value in `:root` (light/parchment mode) and `.dark`. The `--radius` token is set to `0rem` — Tailwind's `rounded-lg/md/sm` all resolve through this variable, so `calc(0rem - 2px)` = `-2px` which browsers clamp to `0`. Every shadcn/ui component goes sharp automatically.

Token derivations:
- `#0A0A0A` → `0 0% 4%` (near-black base)
- `#F5F2EC` → `40 31% 94%` (warm parchment light bg)
- `#F5F4F0` → `48 20% 95%` (warm off-white dark fg)
- `#C9A84C` → `44 54% 54%` (warm gold)
- `#A63232` → `0 54% 42%` (desaturated red)

- [ ] **Step 1: Replace the full contents of `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 40 31% 94%;
    --foreground: 0 0% 4%;
    --card: 0 0% 99%;
    --card-foreground: 0 0% 4%;
    --popover: 0 0% 99%;
    --popover-foreground: 0 0% 4%;
    --primary: 0 0% 4%;
    --primary-foreground: 40 31% 94%;
    --secondary: 0 0% 88%;
    --secondary-foreground: 0 0% 4%;
    --muted: 40 15% 88%;
    --muted-foreground: 0 0% 40%;
    --accent: 40 15% 85%;
    --accent-foreground: 0 0% 4%;
    --destructive: 0 54% 42%;
    --destructive-foreground: 0 0% 98%;
    --border: 40 10% 80%;
    --input: 40 10% 80%;
    --ring: 44 54% 44%;
    --gold: 44 54% 54%;
    --chart-1: 44 54% 44%;
    --chart-2: 0 0% 35%;
    --chart-3: 44 40% 55%;
    --chart-4: 0 0% 55%;
    --chart-5: 0 0% 70%;
    --radius: 0rem;
  }
  .dark {
    --background: 0 0% 4%;
    --foreground: 48 20% 95%;
    --card: 0 0% 7%;
    --card-foreground: 48 20% 95%;
    --popover: 0 0% 7%;
    --popover-foreground: 48 20% 95%;
    --primary: 0 0% 95%;
    --primary-foreground: 0 0% 4%;
    --secondary: 0 0% 15%;
    --secondary-foreground: 48 10% 85%;
    --muted: 0 0% 12%;
    --muted-foreground: 0 0% 55%;
    --accent: 0 0% 14%;
    --accent-foreground: 48 20% 95%;
    --destructive: 0 54% 42%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 16%;
    --input: 0 0% 16%;
    --ring: 44 54% 54%;
    --gold: 44 54% 54%;
    --chart-1: 44 54% 54%;
    --chart-2: 0 0% 55%;
    --chart-3: 44 40% 40%;
    --chart-4: 0 0% 35%;
    --chart-5: 0 0% 25%;
    --radius: 0rem;
  }
}

@layer base {
  html {
    -webkit-text-size-adjust: 100%;
  }
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
  h1,
  h2,
  h3,
  h4 {
    font-family: var(--font-barlow-condensed), ui-sans-serif, system-ui, sans-serif;
    letter-spacing: 0.02em;
  }
}

/* Grain overlay — fixed pseudo-element adds tactile noise texture without affecting layout */
body::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  opacity: 0.04;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n' x='0' y='0'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 300px 300px;
}

@layer utilities {
  .gold-rule {
    border-bottom: 1px solid hsl(var(--gold) / 0.15);
  }
}
```

- [ ] **Step 2: Verify file saved correctly**

Run: `head -5 app/globals.css`
Expected: first line is `@tailwind base;`

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "style: replace design tokens — dark-first tattoo palette, 0px radius, grain overlay"
```

---

### Task 2: Add `gold` Tailwind colour token to `tailwind.config.ts`

**Files:**
- Modify: `tailwind.config.ts`

Adds `gold: "hsl(var(--gold))"` so components can use `bg-gold/15`, `text-gold`, `border-gold/40` etc. without raw HSL strings.

- [ ] **Step 1: Add the gold token to the colors extension**

In `tailwind.config.ts`, add `gold: "hsl(var(--gold))"` to the `theme.extend.colors` object. The final colors block should be:

```ts
colors: {
  background: "hsl(var(--background))",
  foreground: "hsl(var(--foreground))",
  card: {
    DEFAULT: "hsl(var(--card))",
    foreground: "hsl(var(--card-foreground))",
  },
  popover: {
    DEFAULT: "hsl(var(--popover))",
    foreground: "hsl(var(--popover-foreground))",
  },
  primary: {
    DEFAULT: "hsl(var(--primary))",
    foreground: "hsl(var(--primary-foreground))",
  },
  secondary: {
    DEFAULT: "hsl(var(--secondary))",
    foreground: "hsl(var(--secondary-foreground))",
  },
  muted: {
    DEFAULT: "hsl(var(--muted))",
    foreground: "hsl(var(--muted-foreground))",
  },
  accent: {
    DEFAULT: "hsl(var(--accent))",
    foreground: "hsl(var(--accent-foreground))",
  },
  destructive: {
    DEFAULT: "hsl(var(--destructive))",
    foreground: "hsl(var(--destructive-foreground))",
  },
  border: "hsl(var(--border))",
  input: "hsl(var(--input))",
  ring: "hsl(var(--ring))",
  gold: "hsl(var(--gold))",
  chart: {
    "1": "hsl(var(--chart-1))",
    "2": "hsl(var(--chart-2))",
    "3": "hsl(var(--chart-3))",
    "4": "hsl(var(--chart-4))",
    "5": "hsl(var(--chart-5))",
  },
},
```

- [ ] **Step 2: Commit**

```bash
git add tailwind.config.ts
git commit -m "style: add gold Tailwind colour token"
```

---

### Task 3: Add Barlow Condensed font + update `themeColor` in `app/layout.tsx`

**Files:**
- Modify: `app/layout.tsx`

Two changes:
1. Import `Barlow_Condensed` from `next/font/google` and expose it as CSS variable `--font-barlow-condensed` (already referenced in `globals.css` heading rule).
2. Update `themeColor` hex values to match new palette.

The `geistSans.className` stays on `<body>` for body text. `barlowCondensed.variable` exposes the CSS variable for headings without applying the font globally.

- [ ] **Step 1: Replace `app/layout.tsx` with the following**

```tsx
import type { Metadata, Viewport } from "next";
import { Geist, Barlow_Condensed } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "inkMetrics — financial heartbeat for tattoo artists",
  description:
    "Platform-agnostic business intelligence for tattoo artists: log sessions fast, see net profit and client value, without changing how you book.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f2ec" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} ${barlowCondensed.variable} antialiased`}>
        <Script
          id="cookieyes"
          src="https://cdn-cookieyes.com/client_data/f75366e9364ce6cc043a12075111322c/script.js"
          strategy="beforeInteractive"
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "style: add Barlow Condensed font, update themeColor to new palette"
```

---

### Task 4: Fix hardcoded emerald colours in client and expense components

**Files:**
- Modify: `components/dashboard/clients/clients-table.tsx` (line 57)
- Modify: `components/dashboard/clients/clients-cards.tsx` (lines 43, 60)
- Modify: `components/dashboard/expenses/expense-category-filter-pills.tsx` (lines 28–29)

These three files hardcode `emerald-*` Tailwind classes that won't respond to the token swap. Replace with gold-tinted or token-based equivalents. Also change `rounded-full` → `rounded-none` on badges and filter pills (UI affordance elements like the loading spinner and progress bars keep `rounded-full`).

- [ ] **Step 1: Fix "Returning client" badge in `clients-table.tsx`**

Find line 57. Replace:
```tsx
<span className="inline-flex items-center whitespace-nowrap rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
```
With:
```tsx
<span className="inline-flex items-center whitespace-nowrap rounded-none bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold">
```

- [ ] **Step 2: Fix "Returning client" badge in `clients-cards.tsx`**

Find line 43. Replace:
```tsx
<span className="mb-1.5 inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
```
With:
```tsx
<span className="mb-1.5 inline-flex items-center rounded-none bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold">
```

- [ ] **Step 3: Fix the Edit button in `clients-cards.tsx`**

Find line 60. The `<Button>` currently has a className override with hardcoded emerald colours. Remove the className override entirely so the base `outline` variant styles apply:

Replace:
```tsx
<Button
  type="button"
  size="sm"
  variant="outline"
  className="border-emerald-500/70 text-emerald-700 hover:border-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-800 dark:border-emerald-400/70 dark:text-emerald-300 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-200"
  onClick={() => onEditClient(client)}
  aria-label={`Edit client ${client.name}`}
>
```
With:
```tsx
<Button
  type="button"
  size="sm"
  variant="outline"
  onClick={() => onEditClient(client)}
  aria-label={`Edit client ${client.name}`}
>
```

- [ ] **Step 4: Fix inactive filter pill in `expense-category-filter-pills.tsx`**

Find lines 28–29. Replace the entire `className` expression:
```tsx
className={
  isActive
    ? "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-colors bg-primary text-primary-foreground"
    : "inline-flex items-center rounded-full border border-emerald-600/40 bg-transparent px-3 py-1 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-500/10 dark:border-emerald-400/40 dark:text-emerald-300"
}
```
With:
```tsx
className={
  isActive
    ? "inline-flex items-center rounded-none px-3 py-1 text-sm font-medium transition-colors bg-primary text-primary-foreground"
    : "inline-flex items-center rounded-none border border-border bg-transparent px-3 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
}
```

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/clients/clients-table.tsx \
        components/dashboard/clients/clients-cards.tsx \
        components/dashboard/expenses/expense-category-filter-pills.tsx
git commit -m "style: replace hardcoded emerald colours with gold/token equivalents"
```

---

### Task 5: Lint + visual smoke test

**Files:** none changed

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: no errors or warnings in any of the 6 modified files.

- [ ] **Step 2: Start the dev server**

Run: `npm run dev:local`
Expected: server starts without compile errors.

- [ ] **Step 3: Visual check — dark mode**

Open `http://localhost:3000` in a browser. Toggle to dark mode via the theme switcher. Verify:
- Background is near-black (`#0A0A0A`)
- Text is warm off-white
- Nav sidebar and mobile nav have dark card background
- Primary buttons are white-fill with black text
- Destructive buttons are desaturated red
- All borders are dark grey (not green)
- No mint/green anywhere
- Headings (e.g. page titles, card titles) render in Barlow Condensed (condensed, slightly wide-tracked)
- Grain texture is barely visible but present (hold the screen at an angle)

- [ ] **Step 4: Visual check — light mode**

Toggle to light mode. Verify:
- Background is warm parchment (`#F5F2EC`)
- Cards are near-white
- Primary buttons are dark-fill with parchment text
- Gold focus ring visible when tabbing through interactive elements
- No green anywhere

- [ ] **Step 5: Visual check — key pages**

Navigate to `/dashboard`, `/dashboard/clients`, `/dashboard/expenses`. Verify:
- Clients page: "Returning client" badges are gold-tinted, not green
- Expenses page: category filter pills are sharp-cornered, inactive pills use muted border/text
- All corner radii are sharp (no rounded cards, inputs, or buttons)
- Charts render with gold + grey palette

- [ ] **Step 6: Confirm no regressions**

Run: `npm run test`
Expected: all unit tests pass (token/style changes don't affect logic tests).
