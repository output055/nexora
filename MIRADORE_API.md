# Miradore API v2 — Complete Reference

> **Spec source**: `https://online.miradore.com/swagger/v2/swagger.json`
> Verified: 2026-06-30 via live Swagger UI at `https://online.miradore.com/swagger/index.html`
>
> **Base URL**: `https://online.miradore.com/{siteName}/api/v2`
> — Replace `{siteName}` with your Miradore tenant slug (env: `MIRADORE_SITE_NAME`)

---

## Authentication

Every request requires **two headers**:

| Header | Value | Source |
|---|---|---|
| `X-API-Key` | Your API key | `MIRADORE_API_KEY` env var |
| `X-Instance-Name` | Your site/tenant slug | `MIRADORE_SITE_NAME` env var |

> ⚠️ **The API is NOT available on the Free Miradore plan.** Business or Premium+ required.

Generate your API key in the Miradore console:
**System → Infrastructure diagram → API keys**

---

## Endpoint Groups

### 📱 Device

Core MDM operations. These are the most relevant endpoints for Nexora.

#### Device CRUD

| Method | Path | Description | Nexora use? |
|---|---|---|---|
| `GET` | `/api/v2/Device` | List all devices (OData $filter supported) | ✅ Fetch unassigned iOS devices |
| `GET` | `/api/v2/Device/{id}` | Get a single device by Miradore integer ID | ✅ Verify device before onboard |
| `POST` | `/api/v2/Device` | Create a new "Other" type device (non-MDM) | 🔲 Possible future use |
| `PATCH` | `/api/v2/Device/{id}` | Partial update — only provided fields changed | ✅ Set `friendlyName` after registration |
| `DELETE` | `/api/v2/Device/{id}` | Retire a device (soft-delete from MDM) | 🔲 End of contract device offboarding |
| `POST` | `/api/v2/Device/{id}/Activate` | Re-activate a retired device | 🔲 Re-enrolment after return |

#### Device Security / MDM Commands

| Method | Path | Description | Nexora use? |
|---|---|---|---|
| `POST` | `/api/v2/Device/{id}/Lock` | Lock device (Android) | ✅ Overdue payment lock |
| `POST` | `/api/v2/Device/{id}/LostMode` | Enable Lost Mode (iOS — supervised only) | ✅ Overdue payment lock (iOS) |
| `DELETE` | `/api/v2/Device/{id}/LostMode` | Disable Lost Mode / unlock (iOS only) | ✅ Payment cleared — unlock (iOS) |
| `POST` | `/api/v2/Device/{id}/Wipe` | Factory wipe the device | 🔲 Contract termination / theft |
| `POST` | `/api/v2/Device/{id}/Reboot` | Reboot the device remotely | 🔲 Troubleshooting |

> ⚠️ **No remote unlock for Android**. The `POST /Lock` locks Android.
> There is **no `/Unlock` endpoint**. Android devices unlock when the user enters their passcode on-device.

#### Device Category & Model

| Method | Path | Description | Nexora use? |
|---|---|---|---|
| `PUT` | `/api/v2/Device/{id}/Category` | Assign device to a category | 🔲 Organise by shop/agent |
| `DELETE` | `/api/v2/Device/{id}/Category` | Remove category from device | 🔲 |
| `PUT` | `/api/v2/Device/{id}/Model` | Update device model and manufacturer | 🔲 Correct misclassified hardware |

#### Device Location & Attributes

| Method | Path | Description | Nexora use? |
|---|---|---|---|
| `GET` | `/api/v2/Device/{id}/Location` | Get device location history | ✅ Track defaulted device location |
| `GET` | `/api/v2/Device/{id}/CustomAttribute` | List custom attribute values on device | 🔲 |
| `PUT` | `/api/v2/Device/{id}/CustomAttribute/{attributeId}` | Set a custom attribute value on device | 🔲 Tag Nexora customer ID on device |

#### Device App Management

| Method | Path | Description | Nexora use? |
|---|---|---|---|
| `POST` | `/api/v2/Device/{id}/Application` | Deploy an application to a device | 🔲 |
| `GET` | `/api/v2/Device/SuspendedDevices` | List devices currently suspended | 🔲 Audit view |

---

### 👤 User

Manage Miradore user records (Miradore's own user directory — not Nexora staff).

| Method | Path | Description | Nexora use? |
|---|---|---|---|
| `GET` | `/api/v2/User` | Get user by email (query param) | 🔲 Verify device owner |
| `POST` | `/api/v2/User` | Create a new Miradore user | 🔲 Auto-create user on customer registration |
| `PUT` | `/api/v2/User` | Update user by email | 🔲 |
| `DELETE` | `/api/v2/User` | Delete user by email | 🔲 |
| `GET` | `/api/v2/User/{userId}` | Get user by ID | 🔲 |
| `PUT` | `/api/v2/User/{userId}` | Update user by ID | 🔲 |
| `DELETE` | `/api/v2/User/{userId}` | Delete user by ID | 🔲 |
| `POST` | `/api/v2/User/Batch` | Bulk create/update/delete users | 🔲 Batch onboarding |

---

### 🏷️ UserTag

Tags are labels applied to users for grouping and filtering.

| Method | Path | Description | Nexora use? |
|---|---|---|---|
| `GET` | `/api/v2/User/{userId}/Tag` | Get tags for a user | 🔲 |
| `POST` | `/api/v2/User/{userId}/Tag` | Assign tags to a user | 🔲 Tag by payment status |
| `DELETE` | `/api/v2/User/{userId}/Tag/{tagName}` | Remove a tag from a user | 🔲 |
| `GET` | `/api/v2/User/Tag` | Get tags by email (query param) | 🔲 |
| `POST` | `/api/v2/User/Tag` | Assign tags by email | 🔲 |
| `DELETE` | `/api/v2/User/Tag/{tagName}` | Remove tag by email | 🔲 |

---

### 🔑 DeviceIdentifier

Pre-register device serial numbers/IMEIs and assign them to users before enrollment.

| Method | Path | Description | Nexora use? |
|---|---|---|---|
| `GET` | `/api/v2/User/{userId}/DeviceIdentifier` | Get device identifiers for a user | 🔲 |
| `POST` | `/api/v2/User/{userId}/DeviceIdentifier` | Assign serial/IMEI/UDID identifiers to user | ✅ Pre-register Android IMEI before enrollment |
| `DELETE` | `/api/v2/User/{userId}/DeviceIdentifier/{identifier}` | Remove identifier from user | 🔲 |
| `GET` | `/api/v2/User/DeviceIdentifier` | Same as above by email | 🔲 |
| `POST` | `/api/v2/User/DeviceIdentifier` | Same as above by email | ✅ |
| `DELETE` | `/api/v2/User/DeviceIdentifier/{identifier}` | Same as above by email | 🔲 |

---

### 🗂️ CustomAttribute

Define custom metadata fields on devices or users.

| Method | Path | Description | Nexora use? |
|---|---|---|---|
| `GET` | `/api/v2/CustomAttribute` | List all custom attributes | 🔲 |
| `POST` | `/api/v2/CustomAttribute` | Create a new custom attribute | 🔲 e.g. "NexoraCustomerId" |
| `GET` | `/api/v2/CustomAttribute/{attributeId}` | Get a custom attribute | 🔲 |
| `PUT` | `/api/v2/CustomAttribute/{attributeId}` | Update a custom attribute | 🔲 |
| `DELETE` | `/api/v2/CustomAttribute/{attributeId}` | Delete a custom attribute | 🔲 |

---

### 🍎 DEP (Apple Device Enrollment Program)

| Method | Path | Description | Nexora use? |
|---|---|---|---|
| `POST` | `/api/v2/DEP/UpdateDEPDevices` | Force-sync DEP devices from Apple (rate-limited: once/min per site) | 🔲 Refresh Apple Business Manager inventory |

---

### 📦 Application

| Method | Path | Description | Nexora use? |
|---|---|---|---|
| `GET` | `/api/v2/Application/{id}` | Get application details by ID | 🔲 |

---

## Current Nexora Implementation Status

| Function | File | Endpoint Used | Status |
|---|---|---|---|
| List unassigned iOS devices | `src/lib/miradore.ts` | `GET /Device` | ✅ Built |
| Set device friendly name after onboard | `src/lib/miradore.ts` | `PATCH /Device/{id}` | ✅ Built |
| Lock Android device (overdue) | `src/lib/miradore.ts` | `POST /Device/{id}/Lock` | ✅ Built |
| Enable iOS Lost Mode (overdue) | `src/lib/miradore.ts` | `POST /Device/{id}/LostMode` | ✅ Built |
| Disable iOS Lost Mode (payment cleared) | `src/lib/miradore.ts` | `DELETE /Device/{id}/LostMode` | ✅ Built |
| Track device location | *(not built)* | `GET /Device/{id}/Location` | 🔲 Future |
| Pre-register Android IMEI at onboard | *(not built)* | `POST /User/{id}/DeviceIdentifier` | 🔲 Future — closes Android validation gap |
| Wipe device on contract breach | *(not built)* | `POST /Device/{id}/Wipe` | 🔲 Future |
| Retire device at contract end | *(not built)* | `DELETE /Device/{id}` | 🔲 Future |
| Tag devices by payment status | *(not built)* | `POST /User/{id}/Tag` | 🔲 Future |
| Auto-create Miradore user on customer registration | *(not built)* | `POST /User` | 🔲 Future — enables user-device linkage |

---

## Key Field Names (Device Schema — v2 camelCase)

The v2 API uses **camelCase** field names. The v1 API uses PascalCase — don't mix them up.

| Field | Type | Description |
|---|---|---|
| `id` | integer | Miradore internal device ID (use this for all API calls with `{id}`) |
| `identifier` | string | Serial number / IMEI / UDID (what you type when onboarding) |
| `manufacturer` | string | e.g. `"Apple"`, `"Samsung"` |
| `model` | string | Device model name |
| `friendlyName` | string | User-editable display name (we write Nexora customer name here) |
| `userEmailAddress` | string | Email of assigned Miradore user (empty string = unassigned) |
| `enrollmentStatus` | string | `Enrolled`, `Retired`, `Pending`, etc. |
| `platform` | string | `iOS`, `Android`, `Windows`, `macOS` |
| `osVersion` | string | Operating system version string |

---

## Useful OData Query Examples

Miradore v2 list endpoints support OData: `$filter`, `$select`, `$top`, `$skip`, `$orderby`.

```http
# Get only iOS devices
GET /api/v2/Device?$filter=platform eq 'iOS'

# Get unassigned devices only
GET /api/v2/Device?$filter=userEmailAddress eq ''

# Get unassigned iOS devices (efficient — avoids client-side filtering)
GET /api/v2/Device?$filter=platform eq 'iOS' and userEmailAddress eq ''

# Only return specific fields (reduces payload size)
GET /api/v2/Device?$select=id,identifier,model,manufacturer,userEmailAddress

# Paginate results
GET /api/v2/Device?$top=50&$skip=0

# Sort by enrollment date descending
GET /api/v2/Device?$orderby=enrollmentDate desc
```

> **Optimisation opportunity**: `fetchUnassignedAppleDevices()` currently fetches ALL devices
> and filters client-side. Using `$filter=platform eq 'iOS' and userEmailAddress eq ''`
> would be significantly more efficient for large device fleets.

---

## Notes & Gotchas

1. **iOS Lost Mode requires supervised devices** — if your iPhones aren't supervised via Apple Business Manager, Lost Mode won't activate even if the API call succeeds (the command will silently do nothing on the device).

2. **Device `id` is an integer** — visible in the Miradore web console URL. It is **NOT** the serial number. The serial/IMEI is in the `identifier` field.

3. **No `/Unlock` endpoint exists** — iOS is unlocked via `DELETE /LostMode`. Android has no remote unlock via the API.

4. **`PATCH /Device/{id}` is partial** — only the fields you send are updated. Safe to send just `{ "friendlyName": "..." }`.

5. **`X-Instance-Name` header is required on every request** — missing it returns a `400 Bad Request` even with a valid API key.

6. **Rate limits**: `POST /DEP/UpdateDEPDevices` is capped at once per minute per site. Hitting it faster will return `429 Too Many Requests`.

7. **Android Lock has no request body** — sending a body to `POST /Device/{id}/Lock` is ignored. The lock message is not customisable for Android via the API.

8. **iOS LostMode body fields** (camelCase, per v2 schema):
   ```json
   {
     "message": "Payment overdue. Call 0553682228.",
     "phoneNumber": "0553682228",
     "footnote": "Contact your retailer to unlock.",
     "enableLocationTracking": false
   }
   ```
