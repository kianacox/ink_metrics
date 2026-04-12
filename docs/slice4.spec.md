# Slice 4 Spec: Expense Tracking

## 1) Purpose

Give artists a dedicated expense workflow so supply and business costs can be tracked and later subtracted from profit in analytics/reporting slices.

## 2) Goals

- Add a dedicated expenses experience that matches sessions/clients UX patterns.
- Support expense CRUD with strict per-user ownership.
- Support optional receipt attachments using Supabase Storage.
- Support category filtering (single, multi-select, clear all).
- Keep data tax/export friendly with stable date and money contracts.

## 3) Scope

### 3.1 In Scope

- New `expenses` data model and migration.
- New expenses page accessible from:
  - mobile bottom nav
  - desktop left sidebar nav
- Expenses list view:
  - mobile cards
  - desktop table
- Create expense modal opened from pinned floating action button.
- Edit and delete expense actions.
- Category filter pills with multi-select and clear-all support.
- Optional receipt upload.
- Unit tests for parsing/validation/filter logic.
- e2e coverage for key journeys and auth guards.
- Add a matching pinned floating action button to sessions view for consistency.

### 3.2 Out of Scope

- Expense analytics rollups and profit deduction logic in dashboards.
- OCR/automatic receipt data extraction.
- Multi-currency conversions.

## 4) Decisions and Data Contracts

### 4.1 Expense table (required)

Create `public.expenses` with:

- `expense_id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `item text not null`
- `category text not null`
- `amount_minor bigint not null`
- `currency_code text not null`
- `date_purchased date not null`
- `receipt_path text null`
- `receipt_mime_type text null`
- `receipt_size_bytes integer null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### 4.2 Category contract

Allowed category values:

- `ink`
- `cartridges`
- `needles`
- `machines`
- `other_equipment`
- `travel`
- `miscellaneous`

Use a DB check constraint to enforce allowed values.

### 4.3 Money contract

- Persist expense amounts as integer minor units in `amount_minor` (for example, 12.34 GBP -> 1234).
- Use `currency_code` snapshot at write time to avoid ambiguity if profile currency changes later.

### 4.4 Receipt contract

- Receipt upload is supported via Supabase Storage.
- Use a private bucket (for example: `expense-receipts`).
- Store only metadata + `receipt_path` in Postgres.
- Do not use public URLs for receipts; use signed URLs when needed.

### 4.5 Storage path contract

Use deterministic path format:

- `{user_id}/{expense_id}/{timestamp}-{sanitized_file_name}`

This ensures easy ownership policy enforcement and cleanup.

### 4.6 Indexes

Add:

- index on `(user_id, date_purchased desc)`
- index on `(user_id, category, date_purchased desc)`

## 5) Security and Authorization

### 5.1 RLS

Enable RLS on `public.expenses` and add policies:

- `select` own rows only
- `insert` own rows only
- `update` own rows only
- `delete` own rows only

Policy rule pattern: `auth.uid() = user_id`

### 5.2 Storage policies

For receipt bucket:

- authenticated users can only read/write objects under their own prefix (`auth.uid()` rooted path).
- no cross-user file access.

## 6) API Requirements

Add routes:

- `GET /api/expenses`
- `POST /api/expenses`
- `PATCH /api/expenses/[expenseId]`
- `DELETE /api/expenses/[expenseId]`

### 6.1 Read/list behavior

`GET /api/expenses` supports:

- pagination
- category filtering (0..n selected categories)
- default sort by `date_purchased desc`, then `expense_id desc`

### 6.2 Create behavior

`POST /api/expenses` accepts:

- `item`
- `category`
- `amountMinor`
- `datePurchased`
- optional receipt metadata/path fields

Reject invalid payloads with clear 400 errors.

### 6.3 Update behavior

`PATCH /api/expenses/[expenseId]` allows updates for:

- `item`
- `category`
- `amountMinor`
- `datePurchased`
- receipt fields

Must reject unknown/uneditable fields.

### 6.4 Delete behavior

`DELETE /api/expenses/[expenseId]`:

- deletes owned expense row only
- returns success with deleted flag
- if receipt exists, remove storage object best-effort

### 6.5 Auth guard behavior

All expense API routes require authenticated users. Unauthenticated requests return 401.

## 7) Receipt Upload Flow

Use a resilient two-step flow:

1. Create expense row first (without receipt path).
2. Upload receipt to storage using the resolved `expense_id`.
3. Patch expense with `receipt_path` and file metadata.

If upload fails, keep expense row and surface a non-blocking error allowing user retry.

Note: DB transactions cannot atomically include Supabase Storage object writes, so this explicit flow is required.

## 8) Frontend Requirements

### 8.1 Navigation

- Add Expenses nav entry in mobile bottom nav and desktop sidebar.
- Route: `/dashboard/expenses`.

### 8.2 Expenses page layout

- Reuse sessions/clients visual patterns.
- Mobile: cards.
- Desktop: table.

Each expense row/card shows:

- item
- category
- formatted amount
- date purchased
- receipt attached status

Each row/card supports:

- edit action
- delete action

### 8.3 Filtering UX

- Category filter pills displayed above list.
- Users can select one, many, or all categories.
- Include `Clear all` action.

### 8.4 Create expense UX

- Floating circular plus button pinned bottom-right.
- Opens create-expense modal.
- Modal fields:
  - item name (required)
  - category (required select)
  - amount (required)
  - date purchased (required)
  - receipt upload (optional)
- Save disabled or blocked until required validation passes.

### 8.5 Sessions view consistency

Add a matching floating circular plus button to sessions page for UI consistency.

## 9) Validation Rules

### 9.1 Required fields

- `item` required and trimmed non-empty
- `category` required and in allowed set
- `amountMinor` required integer and `>= 0`
- `datePurchased` required valid date

### 9.2 Receipt validation

- Receipt is optional.
- If provided, enforce allowed mime types and max size limit.
- Persist mime and size metadata for export/audit needs.

## 10) Testing Requirements

### 10.1 Unit tests

Cover:

- expense create/update payload parsing
- required field validation and error messages
- category filter parsing (single, multi, clear all)
- amount conversion to minor units

### 10.2 E2E tests

Cover:

- user can log an expense
- user can view expenses
- user can modify an expense
- user can delete an expense
- user cannot log invalid expense payloads (multiple invalid branches)
- user can filter by one category
- user can filter by multiple categories
- user can clear all category filters
- logged out users cannot log expenses
- logged out users cannot view expenses

## 11) Implementation Notes

- Add migration for `expenses` schema + constraints + indexes + RLS + grants.
- Follow existing API pattern used by sessions/clients for auth guard and payload parsing.
- Prefer deterministic error messages so UI and tests remain stable.
