# Privacy, Terms, and Data Processing Inventory

Last updated: 2026-04-14  
Source: repository scan of `ink_metrics` (schemas, migrations, API routes, auth flows, docs)

This document is a product/legal input to help draft:

1. A UK GDPR-compliant Privacy Policy
2. Terms and Conditions with a Data Processing Agreement (DPA) clause

It is not legal advice.

## 1) What personal data the app collects

### A. Account and authentication data (about the artist user)

- Email address (sign-up, login, password reset, email update)
- Password credential (stored as hash by Supabase Auth)
- Auth identifiers and auth metadata (user ID, identity provider, confirmation/recovery tokens managed by Supabase)
- Session/auth cookie and token data used to keep users logged in

Where seen:

- `components/auth/sign-up-form.tsx`
- `components/auth/login-form.tsx`
- `components/auth/forgot-password-form.tsx`
- `components/dashboard/profile/hooks/use-update-email.ts`
- `app/api/account/route.ts`
- `lib/supabase/proxy.ts`
- `supabase/seed.sql` (auth schema examples)

### B. Profile and account-preference data (about the artist user)

- `display_name`
- `default_currency`
- `reporting_timezone`
- `week_starts_on`
- `is_profile_complete`
- `profile_completed_at`
- `display_advert_checkbox` (preference controlling whether ad-attribution checkbox is shown)

Where seen:

- `supabase/migrations/20260405141147_remote_schema.sql`
- `supabase/migrations/20260407153000_slice2_profile_setup.sql`
- `supabase/migrations/20260408120000_slice2_profile_editing_foundations.sql`
- `supabase/migrations/20260409170000_advertising_attribution_session_transaction.sql`
- `app/api/profile-setup/route.ts`
- `app/api/profile/route.ts`
- `app/api/preferences/route.ts`

### C. Financial/business setup data (about the artist user)

- Chair-rent and compensation configuration:
  - pay chair rent flag
  - rent type/frequency
  - fixed amounts
  - commission rates and caps
  - effective date ranges (version history)

Where seen:

- `supabase/migrations/20260408120000_slice2_profile_editing_foundations.sql`
- `supabase/migrations/20260409130000_slice2_spec_alignment_profile_and_compensation_rpcs.sql`
- `supabase/migrations/20260410113000_slice1_backdate_initial_compensation.sql`

### D. Session logging data (artist business records)

- Session ID, user ID, client ID
- Session revenue (`price` in minor units)
- Session duration
- Session date/time (`session_at`)
- Ad-attribution flag (`through_ads`)
- Compensation version link
- Timestamps

Where seen:

- `supabase/migrations/20260405141147_remote_schema.sql`
- `supabase/migrations/20260408120000_slice2_profile_editing_foundations.sql`
- `supabase/migrations/20260409170000_advertising_attribution_session_transaction.sql`
- `app/api/sessions/route.ts`
- `app/api/sessions/[sessionId]/route.ts`

### E. Client data stored by artist users (data stored on behalf of users)

- Client name
- Optional client contact info (free text)
- Client origin (`advertising` or `organic`, when enabled)
- Created timestamp
- Aggregated session/value outputs for reporting

Where seen:

- `supabase/migrations/20260405141147_remote_schema.sql`
- `supabase/migrations/20260409170000_advertising_attribution_session_transaction.sql`
- `supabase/migrations/20260411100000_slice3_clients_page_rpc.sql`
- `supabase/migrations/20260412100000_slice3_client_last_session_at.sql`
- `app/api/clients/route.ts`
- `app/api/clients/[clientId]/route.ts`

### F. Expense and receipt data (artist business records)

- Expense item name
- Expense category
- Amount and currency
- Purchase date
- Optional receipt metadata:
  - storage path
  - mime type
  - size
- Receipt file content in private Supabase Storage bucket (`expense-receipts`)

Where seen:

- `supabase/migrations/20260413100000_slice4_expenses_table.sql`
- `supabase/migrations/20260413110000_slice4_expense_receipts_storage.sql`
- `lib/expenses/upload-expense-receipt.ts`
- `app/api/expenses/route.ts`
- `app/api/expenses/[expenseId]/route.ts`

## 2) Data stored on behalf of users (customer content)

For DPA/processor framing, the primary "customer content" is:

- Client personal data entered by artist users:
  - client names
  - optional contact information
- Session records linked to clients (can become personal data where linked to an identifiable client)
- Expense and receipt records uploaded by users

This is distinct from account/admin data the app processes for its own account management (email, auth, security/session data), where the app operator is usually an independent controller.

## 3) Current security and access model (policy inputs)

- Supabase Auth for authentication
- RLS on core business tables (`profiles`, `clients`, `sessions`, `artist_compensation_versions`, `expenses`)
- Storage bucket policies enforce per-user prefix access in `expense-receipts`
- API routes require authenticated users for business-data endpoints
- Account deletion endpoint uses Supabase Admin delete user API

Key references:

- `lib/supabase/require-authenticated-api-user.ts`
- `lib/supabase/proxy.ts`
- `supabase/migrations/20260405141147_remote_schema.sql`
- `supabase/migrations/20260413100000_slice4_expenses_table.sql`
- `supabase/migrations/20260413110000_slice4_expense_receipts_storage.sql`
- `app/api/account/route.ts`

## 4) Retention and deletion behavior (current state)

### Implemented behavior

- User can delete account via `DELETE /api/account`
- Core domain tables reference `auth.users(id)` with `ON DELETE CASCADE`, so profile/client/session/expense rows are deleted when user is removed
- Users can delete individual sessions, clients (subject to FK constraints), and expenses

### Gaps to address before publishing legal docs

- No explicit retention schedule is defined in code/docs for each data category
- No implemented self-service export (slice 6 is planned)
- No documented process for UK GDPR rights handling SLAs
- Receipt object cleanup on account deletion is not explicitly guaranteed by current account deletion flow
- No formal records of processing activities (ROPA) or data flow map in repo yet

## 5) Third parties/subprocessors currently evidenced in repo

- **Supabase**: auth, database, storage, auth emails
- **Hosting provider**: Vercel
- **SMTP provider for auth emails**: Resend

Where seen:

- `README.md`
- `package.json`
- `supabase/config.toml`

Posthog will be added in future development for analytics.

## 6) UK GDPR privacy policy drafting inputs

Use this section as a checklist for the final policy.

### Required sections and app-specific content

1. **Controller identity and contacts**
   - inkMetrics, support@inkmetrics.com

2. **What data is collected**
   - Use sections 1A-1F from this document

3. **Purposes and lawful bases**
   - Account creation/login/security -> contract + legitimate interests
   - Service delivery (sessions/clients/expenses/profile) -> contract
   - Fraud/security monitoring -> legitimate interests
   - Compliance records -> legal obligation (where applicable)
   - Marketing emails -> consent (PECR + UK GDPR), with unsubscribe rights

4. **Sources of personal data**
   - Directly from user input
   - Automatically via auth/session infrastructure

5. **Recipients/subprocessors**
   - Supabase + resend api

6. **International transfers**
   - Must state server/data regions and transfer safeguards (UK IDTA/Addendum or adequacy), once confirmed

7. **Retention periods**
   - Define concrete timelines by category (not currently codified in product). All data will be kept until such a point as the user deletes their account, or requests that all data be removed. Users can also delete their own data.

8. **Data subject rights**
   - Access, rectification, erasure, restriction, portability, objection, complaint to ICO
   - Explain how users can exercise rights (contact route + identity verification steps)

9. **Security measures**
   - RLS, auth, access controls, least privilege, encrypted transport (and at rest via vendors)

10. **Children**
    - Define age policy if service is not intended for minors. (Service is intended for 18+)

11. **Cookies/online identifiers**
    - Auth/session cookies are used
    - No non-essential analytics/marketing cookies currently evidenced in app code - these will be added once posthog is implemented.

12. **Changes and contact**
    - Versioning and notice mechanism

## 7) Terms and Conditions + DPA clause drafting inputs

### A. Role split to define in terms

- **Platform operator as controller** for:
  - account/authentication and security data
  - support/compliance/billing (if and when introduced)
  - direct marketing data (where consented)

- **Platform operator as processor** for:
  - client/contact and business records entered by artist users on the platform

- **Artist user as controller** for their own client personal data entered into the app

### B. DPA clause minimum content (UK GDPR Article 28 style)

Include clauses covering:

- processing only on documented customer instructions
- confidentiality obligations for personnel
- appropriate technical and organisational measures
- subprocessors list + notice/objection mechanism
- assistance with data subject rights requests
- assistance with security incidents and breach notifications
- deletion/return of customer personal data at termination
- audit/inspection rights and evidence sharing
- international transfer safeguards
- allocation of responsibilities for lawfulness and transparency to end clients

### C. Platform-specific points to include

- Customer must have a lawful basis/notice for any client data they enter
- Customer is responsible for accuracy and legal basis for uploaded client contact details
- Service restrictions for prohibited/sensitive data categories unless explicitly supported
- Account deletion effects and any backup deletion timelines

## 8) Marketing email implementation requirements (before launch)

You noted marketing emails will be opt-in before finding users. For UK GDPR + PECR, implement:

1. **Explicit opt-in capture**
   - Unbundled checkbox, no pre-ticked box
   - Separate from Terms acceptance

2. **Consent evidence fields**
   - `marketing_opt_in` (boolean)
   - `marketing_opt_in_at` (timestamp)

3. **Withdrawal controls**
   - One-click unsubscribe link in every marketing email
   - Account settings toggle/API to withdraw consent
   - Suppression list behavior after unsubscribe

4. **Operational governance**
   - Differentiate transactional vs marketing emails
   - Keep consent logs for auditability
   - Honor withdrawal promptly across all campaigns/tools

No production marketing provider integration was found in current repository code.
