# Landing Page Spec (Stitch AI)

This document is the source prompt/context for generating the main marketing landing page in Stitch AI for `ink_metrics`.

Use this spec to generate only the marketing page (not app product UI).

## 1) Product Context

`ink_metrics` is a platform-agnostic business health app for tattoo artists.

Core problem it solves:
- Tattoo artists currently choose between bloated all-in-one booking systems or manual spreadsheets/notebooks.
- Existing tools (for example Vagaro-style platforms) force artists to change their booking workflow just to get financial reporting.
- Many solo artists book through Instagram DMs, messages, and personal systems and do not want to migrate.

`ink_metrics` positioning:
- Back-of-house business intelligence for tattoo artists.
- Keep your current booking process.
- Log sessions quickly and get clear financial + client metrics.
- No bank connection required.

## 2) Audience

Primary audience:
- Solo tattoo artists and independent artists in shared studios.

Audience traits:
- Time-poor and mobile-first.
- Need simple tools with low data-entry friction.
- Want clarity on actual take-home pay, not just gross income.
- Need cleaner records for tax season.

Credibility signals to communicate:
- Designed specifically for tattoo artists (not a generic salon tool).
- Developed and tested with a tattoo artist with 13 years of industry experience.

## 3) Core Messaging Priorities

The page must communicate these points clearly and early:

1. **Keep your booking system**
   - Use your current workflow (Instagram DMs, messages, calendars, etc.).
   - `ink_metrics` does not replace your booking process.

2. **Know your real take-home pay**
   - Automatically account for chair rent, commissions, and expenses.
   - Show actual profit after costs.

3. **Built for solo tattoo artists**
   - Not overengineered studio software.
   - Fast, simple, and practical.

4. **Tax season confidence**
   - Track income and expenses in one place throughout the year.
   - Reduce manual spreadsheet cleanup and stress.

5. **No bank connection required**
   - Users can manually log sessions and expenses.
   - Emphasize control and low setup friction.

## 4) Key Metrics To Feature

The marketing page should surface these as hero/supporting metric callouts:

- Total take-home (after chair rent and expenses)
- Customer lifetime value (LTV)
- Highest value customer each month
- Returning customer rate
- Efficiency insights:
  - Average profit per session
  - Time spent tattooing

## 5) Information Architecture (Page Sections)

Recommended landing page structure:

1. **Hero**
   - Headline focused on financial clarity without changing booking workflow.
   - Short supporting copy.
   - Primary CTA and secondary CTA.

2. **Problem / Why Existing Tools Fail**
   - Brief contrast between bloated booking platforms and manual spreadsheets.
   - Position `ink_metrics` as the middle path.

3. **How It Works (3 steps)**
   - Log sessions quickly.
   - Automatic calculations (chair rent, commission, expenses).
   - See business health insights.

4. **Metrics & Insights Section**
   - Visual cards/charts showing the key metrics listed above.

5. **Built for Artists Like You**
   - Solo-artist-first messaging.
   - Include 13-year artist validation signal.

6. **Tax Season / Compliance Confidence**
   - Emphasize year-round organized records and reduced admin stress.

7. **Final CTA**
   - Reinforce no booking migration and no bank connection required.

## 6) Navigation Requirements

Top navigation must include:
- `Product` (active/highlighted state on this page)
- `Pricing`

## 7) Footer Requirements

Footer must include links to:
- `Privacy Policy`
- `Terms and Conditions`

## 8) Visual Style and Design System Tokens

Use the existing app color system exactly. Do not invent a new palette.

### Light mode tokens
- `background`: `#F9FDF7`
- `foreground`: `#12222B`
- `card`: `#F9FDF7`
- `primary`: `#40C70F`
- `primary-foreground`: `#FFFFFF`
- `secondary`: `#4A7A96`
- `muted`: `#C8FABD`
- `muted-foreground`: `#426376`
- `accent`: `#E0E7EB`
- `accent-foreground`: `#233E4D`
- `border`: `#CFE2CB`
- `destructive`: `#EF4343`

### Dark mode tokens
- `background`: `#0D161C`
- `foreground`: `#F2F9F1`
- `card`: `#131E25`
- `primary`: `#50D61F`
- `primary-foreground`: `#0C171D`
- `secondary`: `#406072`
- `muted`: `#223139`
- `muted-foreground`: `#A8C2A3`
- `accent`: `#2A3C46`
- `accent-foreground`: `#D0FBC6`
- `border`: `#263640`
- `destructive`: `#BA2C2C`

Design direction:
- Clean, modern, minimal.
- Professional but creative (suited to tattoo artists).
- High readability and clear hierarchy.
- Mobile-first layout behavior.

## 9) Copy and Tone Guidance

Tone:
- Direct, practical, confident.
- Avoid corporate buzzwords.
- Keep sentences concise and easy to scan.

Copy principles:
- Speak to solo artists as business owners.
- Emphasize outcomes over feature jargon.
- Make the value obvious in under 5 seconds in the hero.

Avoid:
- Promises about replacing booking workflows.
- Claims that require bank integrations.
- Generic salon/spa language.

## 10) Stitch Output Requirements

When generating in Stitch, request:
- A complete responsive marketing landing page design.
- Desktop + mobile variants.
- Sections matching the information architecture in this spec.
- Components that can map to existing Next.js/Tailwind implementation patterns.

## 11) Ready-to-Use Stitch Prompt

Design a responsive marketing landing page for `ink_metrics`, a business health app for solo tattoo artists. The page must communicate that artists can keep their existing booking system (Instagram DMs, messages, calendars) while getting clear financial insights. Position this against bloated booking platforms and messy spreadsheets.

Include sections in this order: Hero, Problem/Comparison, How It Works (3 steps), Metrics & Insights, Built for Artists Like You, Tax Season Confidence, Final CTA. Top nav must have `Product` (active) and `Pricing`. Footer must include `Privacy Policy` and `Terms and Conditions`.

Messaging must highlight: real take-home pay after chair rent/commissions/expenses, customer lifetime value, highest value customer each month, returning customer rate, average profit per session, and time spent tattooing. Also highlight that no bank connection is required. Include a credibility signal that the product was developed and tested with a tattoo artist with 13 years of industry experience.

Use this exact color system:
- Light mode: background `#F9FDF7`, foreground `#12222B`, card `#F9FDF7`, primary `#40C70F`, primary-foreground `#FFFFFF`, secondary `#4A7A96`, muted `#C8FABD`, muted-foreground `#426376`, accent `#E0E7EB`, accent-foreground `#233E4D`, border `#CFE2CB`, destructive `#EF4343`.
- Dark mode: background `#0D161C`, foreground `#F2F9F1`, card `#131E25`, primary `#50D61F`, primary-foreground `#0C171D`, secondary `#406072`, muted `#223139`, muted-foreground `#A8C2A3`, accent `#2A3C46`, accent-foreground `#D0FBC6`, border `#263640`, destructive `#BA2C2C`.

Tone: practical, clear, and artist-focused. Avoid generic salon copy and avoid any implication that users must change booking tools.
