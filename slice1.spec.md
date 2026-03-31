# Slice 1: Authentication & Session Logging

## Requirements

### Authentication

- [x] a user can sign up using email
- [ ] a new user can sign up using their facebook login
- [x] an existing user can log in using their email
- [ ] an existing user can log in using their facebook login
- [x] user passwords have strength restrictions
- [x] a user can reset their password
- [x] the password reset email should match brand styling
- [x] a new user should receive a styled verification email upon sign up. This verification email should redirect to the dashboard.

### Session Logging

- [x] a user can add a new or existing client to a session
- [x] a new client must have a unique name
- [x] users have the option to 'add new client' or choose a client
- [x] add new client shows client name input and client contact info input (still optional)
- [x] on form submission, a new client record will be created using these details
- [x] choose client shows input that will display a dropdown list of client names matching the input AFTER the first character has been entered
- [x] a user can track session length in hours and minutes. This will be converted to a an appropriate format to be stored in the database.
- [x] a user can track profit, which will be formatted using the account's default currency code
- [x] appropriate validation should be used on the form. Duration and price must be numbers and a client must be selected or added.

### Sessions Page

- [ ] a user can view all sessions on a dedicated sessions page
- [ ] each session record should display the client name, session length and session profit
- [ ] the sessions should be displayed in chronological order by default, with the most recent session appearing first
- [ ] a user should be able to sort sessions by session length and session profit, asc-desc and vice-versa
- [ ] a user should be able to sort sessions by date, most recent to oldest, and vice versa
- [ ] a user should be able to search for sessions by client name
