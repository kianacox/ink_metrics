# Halfpoint Tidy Spec

## Purpose

This document captures mid-development cleanup work, UX fixes, and quality-of-life improvements needed before continuing roadmap delivery.

## Goals

- Improve consistency and resilience of UI state handling.
- Fix known mobile and modal UX bugs.
- Tighten validation to prevent invalid profile data.
- Improve local development and demo readiness.

## Work Items

### 1) Code Quality and Reuse

#### Requirements

- Create and adopt shared loading and error-state UI components instead of ad hoc implementations in feature components.
- Handle error states gracefully across:
  - Component-level failures.
  - Page-level `404` states.
  - API failure states.
- Replace raw HTML controls (for example, native `<button>`) with approved shared UI-library components where applicable.

#### Acceptance Criteria

- Loading and error states use shared components in all touched screens.
- `404` and API failure paths have intentional UX (clear message + recovery action where appropriate).
- No newly introduced raw HTML controls where an equivalent shared component exists.

### 2) Desktop Navigation Alignment

#### Requirement

- In desktop layout, align left navigation boundaries with the logo and UI mode picker so the shell content lines up consistently.

#### Acceptance Criteria

- Navigation column and top-shell elements align on the same horizontal content grid in desktop viewports.

### 3) Profile Setup Validation Bugs (Mobile)

#### Current Issues

- Step 2 allows proceeding without answering: "Do you pay chair rent?"
- Step 3 allows proceeding without selecting: `Fixed rate` or `Commissions`.

#### Requirements

- Block progression in the UI until required inputs are completed.
- Enforce matching server-side validation so invalid profile submissions are rejected by API routes.

#### Acceptance Criteria

- Mobile users cannot continue from step 2 or step 3 with missing required answers.
- API routes reject invalid payloads for these fields with explicit validation errors.

### 4) Modal Input Overflow (iPhone 16)

#### Current Issue

- Time/date inputs can stretch beyond modal bounds on iPhone 16.

#### Requirement

- Ensure time/date input controls remain fully contained within modal layout at mobile breakpoints.

#### Acceptance Criteria

- On iPhone 16 viewport sizing, modal input fields do not overflow horizontally.
- Modal content remains usable without layout breakage.

### 5) Bottom Navigation Icon

#### Requirement

- Replace or confirm the current needle icon with the best available `lucide-react` icon that fits tattoo context and visual consistency.

#### Acceptance Criteria

- Bottom-nav icon choice is intentional, supported by the current icon set, and visually consistent with existing navigation icons.

### 6) Local Seed Data for Testing and Demos

#### Requirement

- Provide local seed data with test account:
  - Email: `test@test.com`
  - Password: `Password123`
- Prepopulate realistic data for several months across:
  - Clients
  - Sessions
  - Expenses

#### Acceptance Criteria

- Local environment can be seeded reproducibly with the test account and representative historical data.
- Seeded dataset is suitable for QA flows and product demos.

## Notes

- This spec is implementation-focused and intended for agent-driven execution.
- Prefer small, verifiable PRs grouped by work item when possible.
