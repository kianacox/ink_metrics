Slice 4: Tracking Expenses

Database
Artists should be able to track expenses so that these can be subtracted from artist profit after compensation values have been applied. To do this we will need to create a new expenses table. Each artist will have multiple rows. We will need to link expenses to users via user_id. Other columns:
item
category
price
date_purchased (to help when calculating actual take home for time ranges)
receipt (optional image upload? is this possible with supabase? I'm thinking for receipts, so users can export data for taxes)

API/backend
We will need new routes for

- adding an expense
- updating an expense
- deleting an expense

Frontend
We need a new view for expenses, accessible via the bottom nav and mobile and the left side nav on desktop.
I am not sure how to structure the expense view. For each expense we need to see:

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
