# Nexora - Project Context for AI Agents

Welcome, AI Agent! If you are reading this, you are working on the Nexora platform. This document contains the critical context, architecture, and business logic of the application so you can quickly understand what is going on.

## 1. Project Overview
**Nexora** is a Device Financing and Management platform. It allows admins to register customers, finance mobile devices (like iPhones and Androids), track their payments, and automatically restrict (lock) or wipe devices based on payment compliance using a Mobile Device Management (MDM) system.

**Tech Stack:**
- **Framework:** Next.js (App Router, React 18+)
- **Database / Auth:** Supabase (PostgreSQL)
- **Styling:** Tailwind CSS, Framer Motion, Lucide React icons
- **MDM Integration:** ManageEngine MDM Cloud
- **Payments:** Paystack

## 2. Core Integrations & Workflows

### Mobile Device Management (ManageEngine)
The platform integrates directly with the ManageEngine MDM REST API.
- **API Wrapper:** `src/lib/manageengine.ts`
- **Actions:** `src/app/actions/devices.ts`
- **Supported Commands:** 
  - `remote_alarm` (Buzz Device)
  - `enable_lost_mode` (Secure/Lock Device)
  - `disable_lost_mode` (Unlock Device)
  - `corporate_wipe` (Unenroll and wipe device data)
  - `PauseKiosk` / `ResumeKiosk` (Android only - Kiosk mode profile required)
- **Important Note for iOS:** Apple devices do NOT support "Pause Kiosk" remote commands. For locking out customers on iPhones, we heavily rely on **Lost Mode** (`enable_lost_mode`) which works natively and flawlessly on iOS.

### Payments & Financials (Paystack)
- **Financial Calculation:** `src/lib/utils/calculator.ts` handles the math for down payments, interest rates, and payment cycles (Daily, Weekly, Monthly).
- **Payment Processing:** When a payment is made, it hits the Paystack webhook (`src/app/api/paystack/webhook/route.ts`), which inserts a record into the `payments` table.
- **Database Trigger:** We have a Supabase trigger `payments_update_device_balance` that automatically deducts the payment amount from the device's `remaining_balance`.
- **Automated MDM Actions (`src/app/actions/payments.ts`):** 
  - If a device was locked (e.g., in Lost Mode) due to overdue payments, making a successful payment will automatically trigger ManageEngine to **RemoveLostMode**.
  - If the `remaining_balance` hits `$0` (or less), the system automatically triggers a **CorporateWipe** to unenroll the device from the MDM, releasing the customer from management.

## 3. Database Schema Overview
Our Supabase PostgreSQL database includes:
1. `customers`: Stores customer identity, contact details, and location.
2. `devices`: Stores the financed device details, IMEI, MDM references (`mdm_device_id`), `total_contract_value`, and `remaining_balance`.
3. `payments`: Log of all payments made (amount, date, recorded_by).
4. `system_settings`: Key-value store for global configurations (e.g., default interest rates, down payment percentages, MDM lock commands).

## 4. UI Architecture
- **Admin Dashboard (`src/app/dashboard/admin/`):** The main interface.
  - **Customers:** View customers and their financed devices.
  - **Payments:** Payment history and cycle views.
  - **Device Management:** A rich table showing device lock statuses. We use `DeviceActionModal.tsx` for quick actions and a dedicated MDM page (`src/components/mdm/DeviceDetailsView.tsx`) for deep-dive tracking, auditing, and issuing MDM commands.
  - **Settings:** Allows admins to configure financial formulas and MDM automation settings without changing code.

## 5. Development Rules & Gotchas
- **Server Components:** Remember this is Next.js App Router. Use `"use client"` only when necessary for hooks/interactivity.
- **Async Params:** In Next.js 14/15, page/layout `params` and `searchParams` should be treated as Promises.
- **MDM Actions:** Never send `pause_kiosk` (lowercase) to ManageEngine; it requires exact strings like `PauseKiosk`, but even then, it is only applicable for Androids with active profiles. For iOS locks, always default to Lost Mode.
- **Supabase:** RLS (Row Level Security) is handled in the DB. Ensure Server Actions use the correct Supabase service role or authenticated client.
