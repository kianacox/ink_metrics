Marketing Consent
As part of the marketing of this product, we will start advertising with an MVP, allowing users free access to the product until 1st May 2026. At this point, plan limits will be applied via integration with stripe. I want to let users know about this prior via email, and so will need to implement a marketing consent field in the profile setup flow. I also want to keep users up to date with planned features.

This consent will need to be tracked via a user profile in the profiles table. We need marketing_consent(bool). This will be used later on in development to decide which emails to send marketing info to via resend.

The marketing checkbox should be at the bottom of the form on desktop, and on the last profile setup card on mobile.
Users should be able to unsubscribe from marketing at any time via their profile page.
