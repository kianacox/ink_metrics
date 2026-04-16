Feature Spec: Terms & Conditions Implementation & Login UX Fix
Overview
This specification covers the mandatory implementation of a Terms and Conditions (T&C) agreement during the sign-up flow to ensure legal compliance. Additionally, it addresses a UI flickering bug in the login state to improve overall user experience.

Technical Requirements

1. Sign-Up Form Enhancement (@sign-up-form)
   Component: Add a checkbox labeled "I accept inkMetric's Terms and Conditions" to the sign-up form.

Validation:

The "Sign Up" button must be disabled until the checkbox is ticked.

The T&C link must lead to the /terms-and-conditions route.

State Management: Implement logic to ensure the checkbox state is tracked locally; there is no need to store this value in the database as account creation serves as explicit acceptance.

2. API Security & Validation
   Payload: The API request for sign-up must be updated to include tsancs: true.

Server-Side Logic:

The API must reject any sign-up attempt that does not include the tsancs: true flag.

Ensure the backend validates this field before proceeding with user creation, even though the value is dropped upon receipt by the database.

3. Login UX Bug Fix
   Issue: The login button currently shows a loading state briefly, then reverts to the "Login" state before the redirect completes.

Fix: The button must remain in the "logging in" state continuously until the user is successfully logged in and redirected to the dashboard.

Implementation Guidelines & Repo Patterns
Frontend Tech: Utilize the existing Next.js framework for UI updates.

Backend Tech: Implement validation within Next.js API routes.

Performance: Maintain the "senior-engineered" standard with instant-feel UI transitions.

Verification & Quality Control
The agent must ensure the following before pushing changes:

Code Consistency: Follow existing repository patterns for form handling and API validation.

End-to-End Testing:

Run the full Playwright E2E suite locally to ensure no regressions.

Add a new test case to verify that the sign-up button is disabled without the T&C check and that the API rejects invalid payloads.

Manual Verification: Confirm the login button loading state no longer flickers between states.

Definition of Done
[ ] Sign-up form includes a functional T&C checkbox and link.

[ ] Sign-up button is conditionally disabled based on T&C acceptance.

[ ] API validates the tsancs flag and rejects non-compliant requests.

[ ] Login button UX is smoothed out with a persistent loading state.

[ ] All Playwright tests pass locally.
