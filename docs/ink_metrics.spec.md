# Problem Statement: The Financial "Blind Spot" of the Professional Artist

## The Context

The global tattoo industry is transitioning from a marginalized craft into a $2.4 billion professional service sector. Today’s artists are no longer just "creatives"; they are micro-enterprises managing high-value transactions, complex supply chains, and multi-session projects.

Despite this professionalization, artists are trapped between two ineffective extremes for managing their business health:

1. **Overengineered existing solutions** — Major competitors (Vagaro, Square, DaySmart) prioritize scheduling and booking, forcing artists to migrate their entire booking workflow to access basic financial reports. These systems often feel "bloated," "rigid," and "over-engineered" for solo artists who prefer to manage their own client acquisition via Instagram or DMs.

2. **"Spreadsheet & notebook" culture** — To avoid high fees and rigid workflows, many artists rely on physical notebooks or manual Google Sheets. These systems are highly friction-heavy; data is often forgotten or entered incorrectly because it is "cumbersome on a mobile device" during a busy session.

This lack of dedicated, non-invasive financial tools results in:

- **Fiscal anxiety** — Artists lack "real-time visibility" into their net profit after studio splits and supply costs, leading to poor cash flow management during seasonal "winter dips."

- **Growth stagnation** — Without metrics like Lifetime Value (LTV) or Customer Retention Rates, artists cannot identify their highest-value clients or optimize their marketing spend.

- **Regulatory risk** — In the UK, the upcoming "Making Tax Digital" (MTD) mandate will legally require digital record-keeping for those earning over £50k by 2026—leaving thousands of notebook-reliant artists at risk of non-compliance.

There is a critical need for a platform-agnostic financial health application that provides deep business insights without interfering with the artist’s existing booking or creative workflow.

## Elevator Pitch

Tattoo artists are currently forced to choose between expensive, all-in-one management software that interferes with their booking workflow, or manual spreadsheets that provide zero business insight and are prone to error. With new digital tax regulations (MTD) approaching in the UK and a $2.4B market professionalizing rapidly, artists need a friction-free way to track their financial heartbeat—net profit, supply costs, and client lifetime value—without changing how they work.

# The Solution: A "Financial Heartbeat" for the Modern Tattoo Artist

## The Concept

We are building the first platform-agnostic business intelligence dashboard designed exclusively for tattoo artists. Unlike traditional studio management software that forces a change in how you book clients, our application focuses entirely on the "back-of-house"—transforming raw session data into a clear narrative of financial health.

### Low-friction logging

The solution replaces the "messy notebook" with a mobile-first entry system designed to take less than 30 seconds after a session. Artists simply log the client, session length, revenue, and source. This ensures data is captured "in the moment," eliminating the common problem of forgotten entries or manual spreadsheet errors.

### Automated business intelligence

The application moves beyond basic bookkeeping to provide Third-Order Insights that typical apps ignore:

- **True net profit** — Automatically deducts supply costs and shop/chair rent to show what you actually take home.

- **Client Lifetime Value (LTV)** — Identifies your "VIP" clients, allowing you to prioritize the high-value relationships that drive sustainable growth.

- **Efficiency metrics** — Tracks "Average Profit per Session" and "Time Spent Tattooing" to highlight if your hourly rate is being eroded by supply inflation or preparation time.

- **Seasonal forecasting** — Provides month-to-month comparisons to help artists build cash reserves for the industry's predictable "winter dips."

### Compliance & future-proofing

For UK-based artists, the application acts as a bridge to "Making Tax Digital" (MTD). By maintaining digital records of every transaction, artists are automatically prepared for the 2026 HMRC mandate, turning a regulatory burden into a business advantage.

## Why it wins

- **Non-invasive** — Keep using Instagram DMs, Google Calendar, or physical planners. We don’t touch your booking flow; we only track your success.

- **Senior-engineered performance** — Built on a Next.js and Supabase stack, the app offers "instant-feel" UI and real-time dashboard updates, ensuring the technical experience matches the professional caliber of the artist's work.

- **Tax-ready exports** — One-click reporting that can be sent directly to an accountant, saving hours of "spreadsheet archaeology" at the end of the financial year.

# Development

## Tech stack

| Layer    | Technology         |
| -------- | ------------------ |
| Frontend | Next.js            |
| Backend  | Next.js API routes |
| Database | Supabase           |
| Auth     | Supabase Auth      |
| Testing  | Playwright         |
| Payments | Stripe             |

Development follows **vertical slices** so value ships as quickly as possible.

## Slices

1. **Slice 1** — Auth & Sessions
2. **Slice 2** - Profile Page
3. **Slice 3** — Tracking Clients
4. **Slice 4** — Tracking Expenses
5. **Slice 5** — Analytics dashboard
6. **Slice 6** — Monthly reports (exportable summaries) and ability to export data as csv files
7. **Slice 7** — Plan limits
8. **Slice 8** - Landing page and marketing
