Slice 4: Tracking Expenses

Database
Artists should be able to track expenses so that these can be subtracted from artist profit after compensation values have been applied. To do this we will need to create a new expenses table. Each artist will have multiple rows. We will need to link expenses to users via user_id as a foreign key from the auth table. Other columns:

expense_id (unique identifier - is this needed?)
item
category
price
date_purchased (to help when calculating actual take home for time ranges)
receipt (optional image upload? is this possible with supabase? I'm thinking for receipts, so users can export data for taxes)

We need to consider if we need to add any functions for transactional updates to prevent partial writes. We will need a migration file to update the db schema.

API/backend
We will need new routes for

- getting expenses
- adding an expense
- updating an expense
- deleting an expense

Frontend
We need a new view for expenses, accessible via the bottom nav and mobile and the left side nav on desktop.
We should use the same card structure as the sessions and client pages. For each expense we need to see:

- the item(s)
- item category
- price
- date purchased
- if a receipt is attached or not (if possible using supabase)

For each expense we also need to be able to:

- edit all fields
- delete expense

We need to be able to filter expenses by category. The categories will be:

ink
cartridges
needles
machines
other equipment (chairs)
travel
miscellaneous (paper towels, cling film, second skin, cleaning supplies)

I suggest using filter "pills" above the cards to do this. Users should be able to apply one, multiple or all filters. Users should be able to clear all selected filters

We need to be able to add a new expense via a circle pinned to the bottom right of the screen with a plus icon (like on the clients view). Clicking this should open an add expense modal following the styling of other modals. It should take input for

- item name ()
- category (dropdown select)
- price
- date purchased
- receipt upload (optional - we need to know if we can do this on supabase. If we can we need to figure out how we will take file uploads - is there a library we can use? or is there already exsiting api signatures for next/react?)

The form should take validation which ensures the form cannot be saved without all required fields.

While we're implementing this add functionality, we may as well add the same pinned circle to the sessions page to add a session, which ensures consistency across views.

We will need unit tests for any programmatic logic.
We will need new e2e tests for this feature covering key user journeys and edge cases

- user can log an expense
- user can view an expense
- user can modify an expense
- user can delete an expense
- user cannot log an invalid expense (multiple branches from this one)
- logged out users cannot log an expense
- logged out users cannot view expenses
