# Slice 1: Auth, design tokens, and session logger

Table Updates
Clients:

- has now been renamed to "clients"
- id is now client_id

New Table: profiles
schema:
user_id: uuid (primary key, foreign key → auth.users.id)
default_currency: text

Sessions

- has now been renamed to "sessions"
- new column currency
- price is now saved in minor form to enable mutliple currencies.

These changes mean:

- we need to update all references to 'id' in the Clients table to 'client_id'
- we need to update all table references to reflect the new all lowercase names
- We now need to handle currency. The values set into the currency columns should always be the currency code, e,g 'GBP'. For now, all new users can just have the default currency set as GBP in the database upon creation. Additionally, all sessions created should for now have the currency set as GBP in the database. Nothing needs to be surfaced to the frontend for now.
