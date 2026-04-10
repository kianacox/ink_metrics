# Slice 1: Authentication and Session Logging

## Feature Summary

Slice 1 covers authentication, session logging, and sessions list management.  
The remaining in-scope work is session edit/delete support and the related API and e2e coverage.

## Acceptance Criteria

### Authentication

- [x] A user can sign up using email.
- [ ] A new user can sign up using Facebook login.
- [x] An existing user can log in using email.
- [ ] An existing user can log in using Facebook login.
- [x] User passwords have strength restrictions.
- [x] A user can reset their password.
- [x] The password reset email matches brand styling.
- [x] A new user receives a styled verification email on sign up and is redirected to the dashboard.

### Session Logging

- [x] A user can add a new or existing client to a session.
- [x] A new client must have a unique name.
- [x] Users can choose between `Add new client` and selecting an existing client.
- [x] `Add new client` shows client name and optional contact information fields.
- [x] Submitting a new client creates a new client record.
- [x] `Choose client` shows a matching client dropdown after the first character is entered.
- [x] A user can track session length in hours and minutes, converted to storage format.
- [x] A user can track profit formatted with the account default currency code.
- [x] Form validation requires numeric duration and price plus a selected or new client.

### Sessions Page

- [x] A user can view all sessions on a dedicated sessions page.
- [x] Each session record displays client name, session length, and session profit.
- [x] Sessions are shown in chronological order by default (most recent first).
- [x] A user can search sessions by client name.
- [x] A user can see a single total session count that updates based on the selected date range.
- [ ] A user can edit the following fields for a session: price, duration, and session date/time.
- [ ] A user can delete a session.

## UX Requirements

### Mobile

- Edit and delete actions appear on each session card, aligned to the top-right.
- Buttons/icons match the existing application visual style.
- Selecting delete opens a confirmation modal explaining the action is irreversible.
- Delete modal includes `Confirm` and `Cancel` actions.
- Selecting `Cancel` closes the modal with no changes.
- Selecting `Confirm` removes the session record from the database.
- Selecting edit opens a modal based on the create-session modal:
  - Heading: `Edit Session`
  - Includes short supporting description
  - Client information section is not editable
  - Non-editable fields are visibly disabled/greyed out
  - Actions: `Confirm` and `Close`

### Desktop

- Edit and delete actions appear at the far right of the final table column for each session row.
- Selecting delete opens a confirmation modal explaining the action is irreversible.
- Delete modal includes `Confirm` and `Cancel` actions.
- Selecting `Cancel` closes the modal with no changes.
- Selecting `Confirm` removes the session record from the database.
- Selecting edit opens a modal based on the create-session modal:
  - Heading: `Edit Session`
  - Includes short supporting description
  - Client information section is not editable
  - Non-editable fields are visibly disabled/greyed out
  - Actions: `Confirm` and `Close`

## API Requirements

- Add update and delete session API routes.
- Update route must only allow editable fields (`price`, `duration`, `session date/time`).
- Update route must reject payloads that attempt to modify restricted fields (for example client ownership fields).
- Delete route must only remove sessions owned by the authenticated user.
- API validation must verify payload types and required values before writing to the database.

## Navigation

### Mobile and Tablet View

- [x] Logged-in users see a bottom icon menu on dashboard/app pages.
- [x] Bottom menu options:
  - Dashboard (analytics icon) -> `/dashboard`
  - Sessions (needle icon) -> `/dashboard/sessions`
  - Clients (person icon) -> placeholder (no route yet)
  - Logout (logout icon) -> signs user out
- [x] Top navigation options are removed for logged-in users on mobile.

### Desktop View

- [x] Logged-in users see a left-aligned sidebar navigation.
- [x] Sidebar options/icons/routes match mobile navigation.
- [x] Dashboard and Sessions are removed from top-right navigation actions.

## Test Plan (Playwright)

Only key user journeys are required for e2e due to fast iteration and CI/CD cadence.

### Sessions

- [ ] User can create a session.
- [ ] User can create a new client while creating a session.
- [ ] User can select an existing client while creating a session.
- [ ] User can view a session on the sessions page.
- [ ] User can edit a session (price, duration, date/time) from the sessions page.
- [ ] User can open delete modal and cancel without deleting the session.
- [ ] User can confirm delete and the session is removed from the sessions page and database-backed list.
