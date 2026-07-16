# Nexora API Keys & Environment Variables

This document outlines all the environment variables and API keys required for the Nexora application to function, along with their specific purposes.

## Supabase
These keys are used to connect to your Supabase project (Database and Authentication).

*   **`NEXT_PUBLIC_SUPABASE_URL`**
    *   **Function:** The base URL for your Supabase API. Used by both the frontend (browser) and the backend (Next.js server) to route requests to your specific Supabase project.
*   **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**
    *   **Function:** The anonymous (public) API key for Supabase. Safe to be exposed in the browser. It allows the frontend to query the database and authenticate users, relying on Supabase Row Level Security (RLS) policies to ensure users can only access their own data.
*   **`SUPABASE_SERVICE_ROLE_KEY`**
    *   **Function:** The administrative API key for Supabase. **Never expose this to the browser.** It bypasses all Row Level Security (RLS) policies. Used exclusively on the Next.js server side to perform administrative tasks, assign permissions, and fetch data without restriction.

## Miradore MDM
These credentials are used to connect to your Miradore Mobile Device Management platform.

*   **`MIRADORE_API_KEY`**
    *   **Function:** The authentication token used to communicate with the Miradore API. It is sent as a Bearer token in the `Authorization` header to fetch device identifiers, assign users, and trigger actions (like locking/unlocking devices).
*   **`MIRADORE_SITE_NAME`**
    *   **Function:** The specific tenant name of your Miradore instance (e.g., `<YOUR_SITE_NAME>`). It is used to construct the correct API endpoint URL for Miradore.

## Application Configuration
Miscellaneous configuration variables for the application behavior.

*   **`LOCK_CONTACT_PHONE`**
    *   **Function:** The phone number displayed on a device's screen when the device is locked via Miradore (e.g., due to an unpaid installment).
*   **`LOCK_FOOTNOTE_TEXT`**
    *   **Function:** The instructions shown on the locked device's screen alongside the phone number, instructing the customer on how to unlock their device.
