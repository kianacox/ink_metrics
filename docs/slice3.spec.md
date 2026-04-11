# Slice 3 Spec: Client Tracking

## 1) Purpose

Define requirements for a dedicated clients experience: listing, filtering, searching, creating, editing, and deleting clients, with performance-conscious aggregation and test coverage.

## 2) Goals

- Add a dedicated clients page.
- Preserve mobile-first UX consistency with sessions page patterns.
- Support scalable client list retrieval with pagination and efficient aggregations.
- Provide complete CRUD flows for client records.

## 3) Scope

### 3.1 In Scope

- Clients page with responsive layouts:
  - mobile: cards
  - desktop: table
- Client list query with pagination.
- Time-range filtering: `30 days`, `90 days`, `year to date`, `all time`.
- Client search by name.
- Sort/filter controls for session count and total client value (descending).
- Create client modal (name required, contact optional).
- Edit client details (name, contact).
- Delete client with confirmation modal.
- Display aggregate counts and value totals for selected time range.
- API routes for list/create/update/delete clients.
- Unit and e2e tests for key journeys.

### 3.2 Out of Scope

- Any booking workflow changes.
- Non-client analytics beyond required client/session aggregates.

## 4) UX Requirements

### 4.1 Clients page layout

- Must mirror sessions page visual language where possible.
- Encourage reusable UI component extraction from sessions experience.

### 4.2 Mobile card content

Each client card must show:

- client name
- contact info (if available)
- total sessions since creation
- total value since creation
- session count in selected time range
- total value in selected time range

### 4.3 Desktop table content

- Show the same core data as mobile cards in tabular format.
- Include action controls for edit/delete.

### 4.4 Create client action

- Floating circular action button pinned bottom-right with a plus icon.
- Clicking opens create-client modal.
- Modal inputs:
  - client name (required)
  - contact information (optional)
- Validation:
  - name must be present
  - name must be unique per user

### 4.5 Delete client action

- Deletion must require a confirmation modal.
- Confirmation should clearly communicate irreversibility.

## 5) Filtering, Search, and Sorting Contract

### 5.1 Date range filter

Available ranges:

- `30 days`
- `90 days`
- `year to date`
- `all time`

Inclusion rule for clients list:

- Include clients where either:
  - the client was created in the selected range, or
  - the client has at least one session in the selected range.

### 5.2 Search

- Support client name search (case-insensitive match).

### 5.3 Sort/filter behavior

- Allow ordering by:
  - number of sessions (descending)
  - total client value (descending)
- Show number of clients returned for the selected range/filter set.

## 6) API Requirements

Required endpoints:

- list clients (paginated + searchable + range aware)
- create client
- update client
- delete client

Validation expectations:

- enforce authenticated user ownership on all reads/writes
- validate name uniqueness for create (and update if name changes)
- validate payload types and required fields

## 7) Data and Query Requirements

- Existing model already supports creating clients via session creation; standalone client creation must align with same uniqueness/ownership rules.
- Client list query must compute:
  - lifetime session count/value
  - range-bounded session count/value
- Query logic will involve joins/aggregations across clients and sessions.
- Query implementation must be efficient enough for paginated list usage.

Potential schema extension:

- If needed for performance, add fields/materialized data to support session count and total value rollups.

## 8) Performance Requirements

- Clients list endpoint must be paginated.
- Consider caching where useful for repeated list views.
- Design aggregate queries to avoid unbounded scans for common filter usage.

## 9) Testing Requirements

### 9.1 Unit tests

- cover query parameter parsing and validation
- cover range filtering and inclusion rules
- cover uniqueness validation logic
- cover sort behavior

### 9.2 E2E tests

Cover core journeys:

- list clients in mobile and desktop layouts
- search by name
- create client via floating action button
- edit client details
- delete client with confirmation
- range filter behavior and aggregate rendering
