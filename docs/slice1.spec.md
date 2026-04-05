# Slice 1: Authentication and Session Logging

## Authentication

- [x] A user can sign up using email
- [ ] A new user can sign up using Facebook login
- [x] An existing user can log in using email
- [ ] An existing user can log in using Facebook login
- [x] User passwords have strength restrictions
- [x] A user can reset their password
- [x] The password reset email matches brand styling
- [x] A new user receives a styled verification email on sign up, and it redirects to the dashboard

## Session Logging

- [x] A user can add a new or existing client to a session
- [x] A new client must have a unique name
- [x] Users can choose between "Add new client" and selecting an existing client
- [x] "Add new client" shows client name and optional contact info inputs
- [x] Submitting a new client creates a new client record
- [x] "Choose client" shows a matching client dropdown after the first character is entered
- [x] A user can track session length in hours and minutes, converted to storage format
- [x] A user can track profit formatted with the account default currency code
- [x] Form validation requires numeric duration and price, plus a selected or new client

## Sessions Page

- [x] A user can view all sessions on a dedicated sessions page
- [x] Each session record displays client name, session length, and session profit
- [x] Sessions are shown in chronological order by default (most recent first)
- [ ] A user can sort sessions by session length and session profit (ascending and descending)
- [ ] A user can sort sessions by date (most recent to oldest and oldest to most recent)
- [x] A user can search sessions by client name
- [x] A user can see a single total session count that updates based on the selected date range

## Navigation

### Mobile and Tablet View

- [x] Logged-in users see a bottom icon menu on dashboard/app pages
- [x] Bottom menu options:
  - Dashboard (analytics icon) -> `/dashboard`
  - Sessions (needle icon) -> `/dashboard/sessions`
  - Clients (person icon) -> placeholder (no route yet)
  - Logout (logout icon) -> signs user out
- [x] Top navigation options are removed for logged-in users on mobile

### Desktop View

- [x] Logged-in users see a left-aligned sidebar navigation
- [x] Sidebar options/icons/routes match mobile navigation
- [x] Dashboard and Sessions are removed from top-right navigation actions
