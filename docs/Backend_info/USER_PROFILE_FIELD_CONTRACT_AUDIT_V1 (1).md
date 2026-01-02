# USER_PROFILE_FIELD_CONTRACT_AUDIT_V1

Date: 2025-02-22

## Scope & evidence rules
- This audit is a **code-backed contract** for user/profile fields needed by the UI and validators.
- Evidence format: `【F:path†Lx-Ly】`.

## Mandatory pre-read inventory (actual files found)
**Found and used**
- `docs/API_GUIDE.md`【F:docs/API_GUIDE.md†L1-L120】
- `docs/FRONTEND_API_GUIDE.md`【F:docs/FRONTEND_API_GUIDE.md†L1-L120】
- `docs/audits/BACKEND_MANDATE_MILESTONE_IDENTITY_AUDIT_V4.md`【F:docs/audits/BACKEND_MANDATE_MILESTONE_IDENTITY_AUDIT_V4.md†L1-L112】
- `REPO_CHANGE_CONTRACT.md`【F:REPO_CHANGE_CONTRACT.md†L1-L104】
- `HORIZON/document.md`【F:HORIZON/document.md†L1-L86】
- `HORIZON/ARCHITECTURE_TARGET.md`【F:HORIZON/ARCHITECTURE_TARGET.md†L1-L22】
- `docs/GLOBAL_ARCHITECTURE_AUDIT_V3.md`【F:docs/GLOBAL_ARCHITECTURE_AUDIT_V3.md†L1-L120】

**Missing / not present**
- `docs/Backend_info/**` (directory not found in repo)

## PII classification rubric
- **NONE**: operational identifiers with no personal data (IDs, timestamps, status flags).
- **LOW**: business identifiers or non-sensitive metadata.
- **MEDIUM**: contact information or partial identity data (email, phone, city).
- **HIGH**: government ID, bank account, full address, or data that enables financial fraud.

## Role glossary (for redaction tables)
- **sender/provider/admin/support/advisor**: on-platform roles from `UserRole` enum, including composite `both`.【F:app/models/user.py†L12-L42】
- **external beneficiary token**: external-token holders (no API key) using `/external/*` endpoints.【F:app/routers/external_proofs.py†L50-L205】
- **merchant**: spend/merchant registry entities, not a user role.

---

# Entity 1: User (core account entity)
**Role coverage:** sender, provider, both, admin, support, advisor (via `UserRole`).【F:app/models/user.py†L12-L42】

## Field Contract Table — `users`
| Field | Type (DB) | Type (API schema) | Required on Create | Optional on Update | Default | Constraints (min/max/regex/enum) | Example | PII Class | Redaction Rules | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| username | String(100), unique, not null | `str` (`UserCreate.username`) | **Yes** (/users) | N/A (no update endpoint) | — | NOT ENFORCED (code) | `"alice"` | LOW | Visible to: sender/provider/admin/support/advisor (via user read endpoints) | `/admin/users` auto-generates username; not provided in AdminUserCreate.【F:app/models/user.py†L28-L31】【F:app/schemas/user.py†L7-L12】【F:app/routers/admin_users.py†L63-L114】 |
| email | String(255), unique, not null | `EmailStr` (`UserCreate.email`) | **Yes** (/users, /admin/users) | N/A | — | EmailStr validation | `"alice@example.com"` | MEDIUM | Visible to: sender/provider/admin/support/advisor | AdminUserCreate requires email; UserCreate requires email.【F:app/models/user.py†L28-L31】【F:app/schemas/user.py†L7-L12】【F:app/routers/admin_users.py†L44-L81】 |
| is_active | Boolean, not null | `bool` (`UserCreate.is_active`) | No (optional) | N/A | `True` | — | `true` | NONE | Visible to: sender/provider/admin/support/advisor | In AdminUserCreate flow, server sets `True` and does not accept client input.【F:app/models/user.py†L30-L31】【F:app/schemas/user.py†L7-L12】【F:app/routers/admin_users.py†L73-L83】 |
| public_tag | String(10), not null, indexed | **NOT EXPOSED** | N/A | N/A | `"private"` | — | `"private"` | LOW | Not exposed in API responses | Not included in UserCreate/UserRead schemas.【F:app/models/user.py†L31-L32】【F:app/schemas/user.py†L7-L26】 |
| role | Enum(UserRole) | `UserRole` (`UserCreate.role`) | No (optional) | N/A | `sender` | Enum: sender/provider/both/admin/support/advisor | `"sender"` | LOW | Visible to: sender/provider/admin/support/advisor | AdminUserCreate enforces role subset (sender/admin/both/advisor).【F:app/models/user.py†L12-L42】【F:app/schemas/user.py†L7-L12】【F:app/routers/admin_users.py†L44-L54】 |
| payout_channel | Enum(PayoutChannel) | `PayoutChannel` (`UserCreate.payout_channel`) | No (optional) | N/A | `stripe_connect` | Enum (see PayoutChannel) | `"stripe_connect"` | LOW | Visible to: sender/provider/admin/support/advisor | Default set in model and schema.【F:app/models/user.py†L43-L48】【F:app/schemas/user.py†L7-L12】 |
| scopes | **N/A (computed)** | `list[ApiScope]` (`AuthUser.scopes`) | N/A | N/A | Derived from role | Enum: sender/provider/support/admin/advisor (sorted) | `["sender","provider"]` | NONE | Visible to: sender/provider/admin/advisor via `/auth/me` | Computed field returned by `/auth/me` and `/auth/login`, derived from `scopes_for_user_role`.【F:app/schemas/auth.py†L15-L37】【F:app/security/roles.py†L83-L98】 |
| stripe_account_id | String, nullable | `str | None` (`UserRead.stripe_account_id`) | N/A | N/A | `null` | — | `"acct_123"` | MEDIUM | Visible to: sender/provider/admin/support/advisor | Not set by create payload; updated via Stripe sync/onboarding flows.【F:app/models/user.py†L49-L51】【F:app/schemas/user.py†L15-L26】【F:app/routers/users.py†L48-L79】 |
| stripe_payout_enabled | Boolean, not null | `bool` (`UserRead.stripe_payout_enabled`) | N/A | N/A | `false` (server_default) | — | `false` | LOW | Visible to: sender/provider/admin/support/advisor | Server-managed; not in create payload.【F:app/models/user.py†L50-L51】【F:app/schemas/user.py†L15-L26】 |
| stripe_payout_status | String, nullable | `str | None` (`UserRead.stripe_payout_status`) | N/A | N/A | `null` | — | `"pending_onboarding"` | LOW | Visible to: sender/provider/admin/support/advisor | Server-managed via Stripe sync.【F:app/models/user.py†L51-L51】【F:app/schemas/user.py†L15-L26】 |

### Recommendations (constraints not enforced in code)
- `username`: enforce `min_length` (e.g., 3), allowed characters, and trim whitespace.
- `public_tag`: if intended for UI use, expose as enum with allowed values.
- `stripe_account_id`: enforce length/format if returned to UI.

### Create Payload Shape (User)
**Create via `/users` (admin/support)**
```json
{
  "username": "alice",
  "email": "alice@example.com",
  "is_active": true,
  "role": "sender",
  "payout_channel": "stripe_connect"
}
```
`UserCreate` schema.【F:app/schemas/user.py†L7-L12】【F:app/routers/users.py†L32-L45】

**Minimal valid example**
```json
{
  "username": "alice",
  "email": "alice@example.com"
}
```

**Invalid example (missing email)**
```json
{
  "username": "alice"
}
```
Expected: 422 validation error (FastAPI/Pydantic) because `email` is required.【F:app/schemas/user.py†L7-L12】

**Create via `/admin/users` (admin)**
```json
{
  "email": "advisor@example.com",
  "role": "advisor",
  "issue_api_key": true
}
```
AdminUserCreate schema; username is server-generated and advisor profiles are auto-created for `advisor` role.【F:app/routers/admin_users.py†L44-L114】

### Edit Payload Shape (User)
- **No direct update endpoint for User fields** (besides Stripe sync endpoints that only affect payout fields).【F:app/routers/users.py†L48-L79】

### Endpoint Surface (User)
| Method | Path | Auth | Roles | Notes | Evidence |
| --- | --- | --- | --- | --- | --- |
| POST | `/users` | API key | admin, support | Create user via `UserCreate`. | 【F:app/routers/users.py†L32-L45】【F:app/schemas/user.py†L7-L12】 |
| POST | `/admin/users` | API key | admin | Create user via `AdminUserCreate` (auto username). | 【F:app/routers/admin_users.py†L34-L114】 |
| GET | `/auth/me` | API key | sender, provider, admin, advisor | Returns `AuthMeResponse.user` (id, email, username, role, payout_channel, scopes). Support scope is **not** allowed. | 【F:app/routers/auth.py†L163-L184】【F:app/schemas/auth.py†L15-L37】 |
| POST | `/users/{user_id}/psp/stripe/account-link` | API key | admin | Server-managed Stripe onboarding. | 【F:app/routers/users.py†L48-L65】 |
| POST | `/users/{user_id}/stripe/sync` | API key | admin, support | Server-managed Stripe sync. | 【F:app/routers/users.py†L68-L79】 |

### `/auth/me` session payload (AuthMeResponse)
- **Allowed scopes:** sender, provider, admin, advisor (support scope rejected).【F:app/routers/auth.py†L163-L184】
- **Response shape:** `{ "user": { "id", "email", "username", "role", "payout_channel", "scopes" } }` where `scopes` is computed from the user role and sorted for stability.【F:app/schemas/auth.py†L15-L37】【F:app/security/roles.py†L83-L98】
- **Omitted fields:** `/auth/me` does **not** return Stripe payout fields, profile fields, or public_tag; only the core `AuthUser` payload above is present.【F:app/schemas/auth.py†L15-L37】

### Frontend implications (User)
- Creation is **admin/support-only**; UI should only collect `username` + `email` (and optional role/payout channel) for `/users` or only `email` + `role` for `/admin/users` (username auto-generated).【F:app/schemas/user.py†L7-L12】【F:app/routers/admin_users.py†L44-L114】
- No user update form exists; profile editing happens via `UserProfile`.
- Session/UI routing should rely on `/auth/me` fields (id, email, username, role, payout_channel, scopes); advisor tokens are supported even though support scope is disallowed on this endpoint.【F:app/routers/auth.py†L163-L184】【F:app/schemas/auth.py†L15-L37】

---

# Entity 2: UserProfile (identity extension)
**Role coverage:** sender, provider, both, admin, support. Advisors do not have a separate profile here.

## Field Contract Table — `user_profiles`
| Field | Type (DB) | Type (API schema) | Required on Create | Optional on Update | Default | Constraints (min/max/regex/enum) | Example | PII Class | Redaction Rules | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| user_id | FK users.id, not null | **NOT EXPOSED** | N/A | N/A | — | — | `123` | NONE | Not exposed | Profile auto-created for user; user_id never accepted from client.【F:app/models/user_profile.py†L17-L18】【F:app/services/user_profiles.py†L17-L22】 |
| first_name | String(100), nullable | `str | None` | N/A | Optional | `null` | NOT ENFORCED (code) | `"Alice"` | MEDIUM | Visible to sender/provider/admin/support; advisor/external/merchant: N/A | No required fields; optional in update schema.【F:app/models/user_profile.py†L19-L20】【F:app/schemas/user_profile.py†L12-L27】 |
| last_name | String(100), nullable | `str | None` | N/A | Optional | `null` | NOT ENFORCED (code) | `"Smith"` | MEDIUM | Visible to sender/provider/admin/support; advisor/external/merchant: N/A | —【F:app/models/user_profile.py†L20-L21】【F:app/schemas/user_profile.py†L12-L27】 |
| email | String(255), nullable | `EmailStr | None` | N/A | Optional | `null` | EmailStr validation | `"alice@example.com"` | MEDIUM | Visible to sender/provider/admin/support; advisor/external/merchant: N/A | If updated, also updates `User.email`.【F:app/models/user_profile.py†L21-L22】【F:app/schemas/user_profile.py†L12-L27】【F:app/services/user_profiles.py†L31-L40】 |
| phone | String(50), nullable | `str | None` | N/A | Optional | `null` | NOT ENFORCED (code) | `"+15551234567"` | MEDIUM | Visible to sender/provider/admin/support; advisor/external/merchant: N/A | —【F:app/models/user_profile.py†L22-L23】【F:app/schemas/user_profile.py†L12-L27】 |
| address_line1 | String(255), nullable | `str | None` | N/A | Optional | `null` | NOT ENFORCED (code) | `"123 Main St"` | HIGH | Visible to sender/provider/admin/support; advisor/external/merchant: N/A | —【F:app/models/user_profile.py†L23-L24】【F:app/schemas/user_profile.py†L12-L27】 |
| address_line2 | String(255), nullable | `str | None` | N/A | Optional | `null` | NOT ENFORCED (code) | `"Apt 2"` | HIGH | Visible to sender/provider/admin/support; advisor/external/merchant: N/A | —【F:app/models/user_profile.py†L24-L25】【F:app/schemas/user_profile.py†L12-L27】 |
| city | String(100), nullable | `str | None` | N/A | Optional | `null` | NOT ENFORCED (code) | `"Brussels"` | MEDIUM | Visible to sender/provider/admin/support; advisor/external/merchant: N/A | —【F:app/models/user_profile.py†L25-L26】【F:app/schemas/user_profile.py†L12-L27】 |
| postal_code | String(20), nullable | `str | None` | N/A | Optional | `null` | NOT ENFORCED (code) | `"1000"` | MEDIUM | Visible to sender/provider/admin/support; advisor/external/merchant: N/A | —【F:app/models/user_profile.py†L26-L27】【F:app/schemas/user_profile.py†L12-L27】 |
| country_code | String(2), nullable | `str | None` | N/A | Optional | `null` | min/max length = 2 | `"BE"` | MEDIUM | Visible to sender/provider/admin/support; advisor/external/merchant: N/A | Field constraints via Pydantic only.【F:app/models/user_profile.py†L27-L28】【F:app/schemas/user_profile.py†L12-L27】 |
| bank_account | String(128), nullable | `str | None` | N/A | Optional | `null` | NOT ENFORCED (code) | `"BE68539007547034"` | HIGH | **Masked** for admin/support when viewer != target; visible to owner via `/me/profile`. | Masking uses `mask_bank_account` in read serializer.【F:app/models/user_profile.py†L29-L30】【F:app/schemas/user_profile.py†L30-L43】【F:app/services/user_profiles.py†L64-L83】 |
| national_id_type | Enum(NationalIdType), nullable | `NationalIdType | None` | N/A | Optional | `null` | Enum: ID_CARD, PASSPORT | `"PASSPORT"` | HIGH | Visible to sender/provider/admin/support; advisor/external/merchant: N/A | Enum defined in beneficiary model and reused here.【F:app/models/user_profile.py†L30-L39】【F:app/models/beneficiary.py†L16-L20】【F:app/schemas/user_profile.py†L12-L27】 |
| national_id_number | String(128), nullable | `str | None` | N/A | Optional | `null` | NOT ENFORCED (code) | `"A1234567"` | HIGH | **Masked** for admin/support when viewer != target; visible to owner via `/me/profile`. | Masked via `mask_national_id`.【F:app/models/user_profile.py†L40-L40】【F:app/schemas/user_profile.py†L30-L43】【F:app/services/user_profiles.py†L64-L83】 |
| spoken_languages | JSON, nullable | `list[str] | None` | N/A | Optional | `null` | list normalization (string -> list) | `["en","fr"]` | LOW | Visible to sender/provider/admin/support; advisor/external/merchant: N/A | Validator normalizes to list of strings.【F:app/models/user_profile.py†L42-L42】【F:app/schemas/user_profile.py†L46-L58】 |
| residence_region | String(100), nullable | `str | None` | N/A | Optional | `null` | NOT ENFORCED (code) | `"Brussels"` | MEDIUM | Visible to sender/provider/admin/support; advisor/external/merchant: N/A | —【F:app/models/user_profile.py†L43-L44】【F:app/schemas/user_profile.py†L12-L27】 |
| habitual_send_region | String(100), nullable | `str | None` | N/A | Optional | `null` | NOT ENFORCED (code) | `"West Africa"` | MEDIUM | Visible to sender/provider/admin/support; advisor/external/merchant: N/A | —【F:app/models/user_profile.py†L44-L44】【F:app/schemas/user_profile.py†L12-L27】 |
| masked | N/A | `bool` (read-only) | N/A | N/A | `false` | — | `false` | NONE | Indicates masking applied | Computed in read serializer; not stored.【F:app/schemas/user_profile.py†L30-L43】 |

### Recommendations (constraints not enforced in code)
- `first_name`/`last_name`: enforce non-blank + max length in schema (align with DB length).
- `phone`: add format/length validation (E.164 recommended).
- `bank_account`/`national_id_number`: add format/length validation; consider masking on write logs.
- `country_code`: normalize to uppercase ISO-3166-1 alpha-2.

### Create Payload Shape (UserProfile)
- **No explicit create payload.** Profile is auto-created when `GET /me/profile`, `PATCH /me/profile`, or admin profile read is invoked if none exists.【F:app/services/user_profiles.py†L17-L22】【F:app/routers/user_profiles.py†L35-L61】

### Edit Payload Shape (UserProfile)
**PATCH `/me/profile`**
```json
{
  "first_name": "Alice",
  "last_name": "Smith",
  "email": "alice@example.com",
  "phone": "+15551234567",
  "address_line1": "123 Main St",
  "country_code": "BE",
  "bank_account": "BE68539007547034",
  "national_id_type": "PASSPORT",
  "national_id_number": "A1234567",
  "spoken_languages": ["en", "fr"],
  "residence_region": "Brussels",
  "habitual_send_region": "West Africa"
}
```
`UserProfileUpdate` schema accepts all fields as optional.【F:app/schemas/user_profile.py†L12-L58】【F:app/routers/user_profiles.py†L49-L61】

**Minimal valid example**
```json
{}
```

**Invalid example (spoken_languages wrong type)**
```json
{
  "spoken_languages": {"lang": "en"}
}
```
Expected: 422 validation error with message `spoken_languages must be a list of strings`.【F:app/schemas/user_profile.py†L46-L58】

### Endpoint Surface (UserProfile)
| Method | Path | Auth | Roles | Notes | Evidence |
| --- | --- | --- | --- | --- | --- |
| GET | `/me/profile` | API key | sender, provider, admin, support | Returns unmasked profile for current user. | 【F:app/routers/user_profiles.py†L35-L46】【F:app/services/user_profiles.py†L26-L28】 |
| PATCH | `/me/profile` | API key | sender, provider, admin, support | Updates current user profile. | 【F:app/routers/user_profiles.py†L49-L61】【F:app/services/user_profiles.py†L31-L61】 |
| GET | `/admin/users/{user_id}/profile` | API key | admin, support | Masking applied when viewer != target user. | 【F:app/routers/admin_users.py†L243-L262】【F:app/services/user_profiles.py†L64-L83】 |

### Frontend implications (UserProfile)
- Sender/provider onboarding should collect identity/contact/banking fields **progressively**, since none are required by schema and profile auto-creates on first access.【F:app/models/user_profile.py†L11-L44】【F:app/schemas/user_profile.py†L12-L58】【F:app/services/user_profiles.py†L17-L22】
- Admin/support viewing another user sees masked bank account and national ID only; other fields are visible.【F:app/schemas/user_profile.py†L30-L43】【F:app/services/user_profiles.py†L64-L83】

---

# Entity 3: Sender/Provider role-specific profile
**No dedicated table/schema.** Sender/provider roles are expressed via `User.role` and identity fields in `UserProfile` (all optional).【F:app/models/user.py†L12-L42】【F:app/models/user_profile.py†L11-L44】

**Frontend implication:** do **not** ask for additional role-specific profile fields beyond User + UserProfile unless new schemas are introduced.

---

# Entity 4: AdvisorProfile
**Role coverage:** advisor (linked to a `User` with role `advisor`).

## Field Contract Table — `advisor_profiles`
| Field | Type (DB) | Type (API schema) | Required on Create | Optional on Update | Default | Constraints (min/max/regex/enum) | Example | PII Class | Redaction Rules | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| user_id | FK users.id, unique, not null | `int` (`AdvisorProfileCreate.user_id`) | **Yes** | N/A | — | — | `123` | NONE | Visible to admin/support/advisor | Creation endpoint is admin-only. |【F:app/models/advisor.py†L19-L20】【F:app/schemas/advisor.py†L8-L20】【F:app/routers/admin_advisors.py†L28-L47】 |
| advisor_id | String(32), unique, nullable | `str | None` (read) | N/A | N/A | Server-generated `ADV-{id}` | NOT ENFORCED (code) | `"ADV-000123"` | LOW | Visible to admin/support/advisor | Generated in service after create if missing.【F:app/models/advisor.py†L20-L21】【F:app/schemas/advisor.py†L23-L45】【F:app/services/advisors.py†L92-L117】 |
| first_name | String(100), not null | `str | None` (create), `str` (read) | No (optional; defaulted) | Optional | Defaults to user.username when missing | NOT ENFORCED (code) | `"Jane"` | MEDIUM | Visible to admin/support/advisor | Schema allows null, service fills default. |【F:app/models/advisor.py†L21-L22】【F:app/schemas/advisor.py†L8-L45】【F:app/services/advisors.py†L95-L103】 |
| last_name | String(100), not null | `str | None` (create), `str` (read) | No (optional; defaulted) | Optional | Defaults to user.username when missing | NOT ENFORCED (code) | `"Doe"` | MEDIUM | Visible to admin/support/advisor | Schema allows null, service fills default. |【F:app/models/advisor.py†L22-L23】【F:app/schemas/advisor.py†L8-L45】【F:app/services/advisors.py†L95-L103】 |
| email | String(255), not null | `str | None` (create), `str` (read) | No (optional; defaulted) | Optional | Defaults to user.email when missing | NOT ENFORCED (code) | `"advisor@example.com"` | MEDIUM | Visible to admin/support/advisor | Schema allows null, service fills default. |【F:app/models/advisor.py†L23-L24】【F:app/schemas/advisor.py†L8-L45】【F:app/services/advisors.py†L95-L103】 |
| phone | String(50), nullable | `str | None` | No | Optional | `null` | NOT ENFORCED (code) | `"+15550001"` | MEDIUM | Visible to admin/support/advisor | —【F:app/models/advisor.py†L24-L25】【F:app/schemas/advisor.py†L8-L45】 |
| country | String(50), nullable | `str | None` | No | Optional | `null` | NOT ENFORCED (code) | `"US"` | LOW | Visible to admin/support/advisor | —【F:app/models/advisor.py†L25-L26】【F:app/schemas/advisor.py†L8-L45】 |
| language | String(10), nullable | `str | None` | No | Optional | `null` | NOT ENFORCED (code) | `"en"` | LOW | Visible to admin/support/advisor | —【F:app/models/advisor.py†L26-L27】【F:app/schemas/advisor.py†L8-L45】 |
| profile_photo | String(512), nullable | `str | None` | No | Optional | `null` | NOT ENFORCED (code) | `"https://cdn/..."` | LOW | Visible to admin/support/advisor | —【F:app/models/advisor.py†L27-L28】【F:app/schemas/advisor.py†L8-L45】 |
| short_description | Text, nullable | `str | None` | No | Optional | `null` | NOT ENFORCED (code) | `"NGO advisor"` | LOW | Visible to admin/support/advisor | —【F:app/models/advisor.py†L28-L29】【F:app/schemas/advisor.py†L8-L45】 |
| advisor_grade | String(50), nullable | `str | None` | No | Optional | `null` | NOT ENFORCED (code) | `"Senior"` | LOW | Visible to admin/support/advisor | —【F:app/models/advisor.py†L29-L30】【F:app/schemas/advisor.py†L8-L45】 |
| advisor_review | Numeric(3,2), nullable | `float | None` (read/update) | N/A | Optional | `null` | NOT ENFORCED (code) | `4.5` | LOW | Visible to admin/support/advisor | Update only via admin patch. |【F:app/models/advisor.py†L30-L30】【F:app/schemas/advisor.py†L23-L82】【F:app/routers/admin_advisors.py†L78-L119】 |
| sender_managed | int, not null | `int` (read) | N/A | N/A | `0` | — | `0` | NONE | Visible to admin/support/advisor | Server-managed. |【F:app/models/advisor.py†L31-L33】【F:app/schemas/advisor.py†L23-L45】 |
| total_number_of_case_managed | int, not null | `int` (read) | N/A | N/A | `0` | — | `0` | NONE | Visible to admin/support/advisor | Server-managed. |【F:app/models/advisor.py†L32-L33】【F:app/schemas/advisor.py†L23-L45】 |
| subscribe_date | DateTime, not null | `datetime` (read) | N/A | N/A | `utcnow()` | — | `"2024-01-01T00:00:00Z"` | NONE | Visible to admin/support/advisor | Server-managed. |【F:app/models/advisor.py†L33-L33】【F:app/schemas/advisor.py†L23-L45】 |
| is_active | Boolean, not null | `bool | None` (create/update) | No (default true) | Optional | `true` | — | `true` | NONE | Visible to admin/support/advisor | Admin patch can toggle; blocked forces inactive. |【F:app/models/advisor.py†L34-L35】【F:app/schemas/advisor.py†L8-L82】【F:app/routers/admin_advisors.py†L108-L115】 |
| blocked | Boolean, not null | `bool | None` (create/update) | No (default false) | Optional | `false` | — | `false` | NONE | Visible to admin/support/advisor | Admin patch updates. |【F:app/models/advisor.py†L35-L35】【F:app/schemas/advisor.py†L8-L82】【F:app/routers/admin_advisors.py†L108-L115】 |

### Recommendations (constraints not enforced in code)
- `first_name`/`last_name`/`email`: require non-null in schema to mirror DB constraints (or explicitly document auto-defaulting).
- `email`: switch to `EmailStr` type to enforce format.
- `phone`: add length/format validation.

### Create Payload Shape (AdvisorProfile)
**POST `/admin/advisors`**
```json
{
  "user_id": 123,
  "first_name": "Jane",
  "last_name": "Doe",
  "email": "advisor@example.com",
  "country": "US",
  "language": "en",
  "is_active": true,
  "blocked": false
}
```
`AdvisorProfileCreate` schema; missing name/email are defaulted from the user record by the service.【F:app/schemas/advisor.py†L8-L20】【F:app/services/advisors.py†L92-L111】

**Minimal valid example**
```json
{
  "user_id": 123
}
```
Service defaults first_name/last_name/email from user when omitted.【F:app/services/advisors.py†L92-L111】

**Invalid example (user_id missing)**
```json
{
  "first_name": "Jane"
}
```
Expected: 422 validation error (`user_id` required).【F:app/schemas/advisor.py†L8-L20】

### Edit Payload Shape (AdvisorProfile)
**PATCH `/admin/advisors/{advisor_id}`**
```json
{
  "phone": "+15550001",
  "advisor_review": 4.5,
  "blocked": true
}
```
`AdvisorProfileUpdate` schema; all fields optional.【F:app/schemas/advisor.py†L69-L82】【F:app/routers/admin_advisors.py†L78-L119】

### Endpoint Surface (AdvisorProfile)
| Method | Path | Auth | Roles | Notes | Evidence |
| --- | --- | --- | --- | --- | --- |
| POST | `/admin/advisors` | API key | admin | Create advisor profile. | 【F:app/routers/admin_advisors.py†L28-L47】 |
| PATCH | `/admin/advisors/{advisor_id}` | API key | admin | Update advisor profile. | 【F:app/routers/admin_advisors.py†L78-L119】 |
| GET | `/admin/advisors` | API key | admin | List advisors. | 【F:app/routers/admin_advisors.py†L50-L62】 |
| GET | `/admin/advisors/{advisor_id}` | API key | admin | Read advisor profile. | 【F:app/routers/admin_advisors.py†L65-L75】 |
| GET | `/advisor/me/profile` | API key | advisor | Advisor self-profile. | 【F:app/routers/advisors.py†L216-L228】 |
| GET | `/me/advisor` | API key | sender | Fetch assigned advisor for sender. | 【F:app/routers/advisors.py†L147-L164】 |

### Frontend implications (AdvisorProfile)
- Admin UI must provide **user_id** and may optionally provide profile details; otherwise defaults are derived from the user record. Advisors do not self-edit profiles in current API surface.【F:app/services/advisors.py†L92-L111】【F:app/routers/admin_advisors.py†L28-L119】

---

# Entity 5: Support/Admin profile
**No dedicated table/schema.** Admin/support users are represented by `User` and optional `UserProfile` only.【F:app/models/user.py†L23-L52】【F:app/models/user_profile.py†L11-L44】

---

# Entity 6: BeneficiaryProfile (off-platform)
**Role coverage:** external beneficiary (off-platform), accessed via sender-created profile; admin/support can view full data.

## Field Contract Table — `beneficiary_profiles`
| Field | Type (DB) | Type (API schema) | Required on Create | Optional on Update | Default | Constraints (min/max/regex/enum) | Example | PII Class | Redaction Rules | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| user_id | FK users.id, nullable | `UUID | int | None` (`BeneficiaryCreate.user_id`) | No | N/A | `null` | NOT ENFORCED (code) | `123` | NONE | Visible to admin/support; sender/provider/advisor see `user_id` in public view | Optional linkage to platform user; server enforces owner mismatch check. |【F:app/models/beneficiary.py†L32-L33】【F:app/schemas/beneficiary.py†L12-L43】 |
| owner_user_id | FK users.id, not null | **NOT EXPOSED** | N/A | N/A | — | — | `10` | NONE | Exposed in public view (`owner_user_id`) | Set from authenticated sender. |【F:app/models/beneficiary.py†L32-L34】【F:app/schemas/beneficiary.py†L96-L105】 |
| first_name | String(100), not null | `str` | **Yes** | N/A | — | non-blank validator | `"Maria"` | MEDIUM | Visible to all roles (public view) | Required by schema and DB. |【F:app/models/beneficiary.py†L35-L36】【F:app/schemas/beneficiary.py†L12-L57】 |
| last_name | String(100), not null | `str` | **Yes** | N/A | — | non-blank validator | `"Lopez"` | MEDIUM | Visible to all roles (public view) | Required by schema and DB. |【F:app/models/beneficiary.py†L36-L37】【F:app/schemas/beneficiary.py†L12-L57】 |
| full_name | String(255), nullable | `str | None` | No | N/A | `null` | NOT ENFORCED (code) | `"Maria Lopez"` | MEDIUM | Visible to all roles (public view) | Service auto-fills from first/last when missing. |【F:app/models/beneficiary.py†L37-L37】【F:app/schemas/beneficiary.py†L12-L43】 |
| email | String(255), not null | `EmailStr` | **Yes** | N/A | — | non-blank validator | `"maria@example.com"` | MEDIUM | Visible to admin/support only | Redacted in public view. |【F:app/models/beneficiary.py†L38-L39】【F:app/schemas/beneficiary.py†L12-L57】【F:app/services/beneficiaries.py†L323-L335】 |
| phone | String(50), not null | `str` | **Yes** | N/A | — | non-blank validator | `"+250788000000"` | MEDIUM | Visible to admin/support only | Redacted in public view. |【F:app/models/beneficiary.py†L39-L40】【F:app/schemas/beneficiary.py†L12-L57】【F:app/services/beneficiaries.py†L323-L335】 |
| address_line1 | String(255), not null | `str` | **Yes** | N/A | — | non-blank validator | `"12 Avenue"` | HIGH | Visible to admin/support only | Redacted in public view. |【F:app/models/beneficiary.py†L40-L41】【F:app/schemas/beneficiary.py†L12-L57】【F:app/services/beneficiaries.py†L323-L335】 |
| address_line2 | String(255), nullable | `str | None` | No | N/A | `null` | — | `"Unit 3"` | HIGH | Visible to admin/support only | Redacted in public view. |【F:app/models/beneficiary.py†L41-L42】【F:app/schemas/beneficiary.py†L12-L43】【F:app/services/beneficiaries.py†L323-L335】 |
| city | String(100), not null | `str` | **Yes** | N/A | — | non-blank validator | `"Kigali"` | MEDIUM | Visible to admin/support only | Redacted in public view. |【F:app/models/beneficiary.py†L42-L43】【F:app/schemas/beneficiary.py†L12-L57】【F:app/services/beneficiaries.py†L323-L335】 |
| postal_code | String(20), nullable | `str | None` | No | N/A | `null` | — | `"00000"` | MEDIUM | Visible to admin/support only | Redacted in public view. |【F:app/models/beneficiary.py†L43-L44】【F:app/schemas/beneficiary.py†L12-L43】【F:app/services/beneficiaries.py†L323-L335】 |
| country_code | String(2), not null | `str` | **Yes** | N/A | — | min/max length = 2 | `"RW"` | MEDIUM | Visible to admin/support only | Redacted in public view. |【F:app/models/beneficiary.py†L44-L44】【F:app/schemas/beneficiary.py†L12-L57】【F:app/services/beneficiaries.py†L323-L335】 |
| iban | String(34), nullable | `str | None` | No (optional) | N/A | `null` | — | `"BE68539007547034"` | HIGH | Visible to admin/support only | Redacted in public view. |【F:app/models/beneficiary.py†L46-L47】【F:app/schemas/beneficiary.py†L12-L43】【F:app/services/beneficiaries.py†L323-L335】 |
| bank_account | String(128), not null | `str | None` (schema) | **Yes** (must be provided or derived) | N/A | — | must exist via validator | `"BE68539007547034"` | HIGH | Visible to admin/support only | Validator requires bank_account OR iban OR bank_account_number. |【F:app/models/beneficiary.py†L47-L48】【F:app/schemas/beneficiary.py†L12-L79】 |
| bank_account_number | String(64), nullable | `str | None` | No | N/A | `null` | — | `"123456"` | HIGH | Visible to admin/support only | Redacted in public view. |【F:app/models/beneficiary.py†L48-L49】【F:app/schemas/beneficiary.py†L12-L43】【F:app/services/beneficiaries.py†L323-L335】 |
| bank_routing_number | String(64), nullable | `str | None` | No | N/A | `null` | — | `"110000"` | HIGH | Visible to admin/support only | Redacted in public view. |【F:app/models/beneficiary.py†L49-L50】【F:app/schemas/beneficiary.py†L12-L43】【F:app/services/beneficiaries.py†L323-L335】 |
| mobile_money_number | String(64), nullable | `str | None` | No | N/A | `null` | — | `"+250788000000"` | HIGH | Visible to admin/support only | Redacted in public view. |【F:app/models/beneficiary.py†L50-L51】【F:app/schemas/beneficiary.py†L12-L43】【F:app/services/beneficiaries.py†L323-L335】 |
| mobile_money_provider | String(100), nullable | `str | None` | No | N/A | `null` | — | `"MTN"` | LOW | Visible to admin/support only | Redacted in public view. |【F:app/models/beneficiary.py†L51-L52】【F:app/schemas/beneficiary.py†L12-L43】【F:app/services/beneficiaries.py†L323-L335】 |
| payout_channel | String(50), nullable | `str | None` | No | N/A | `null` | NOT ENFORCED (code) | `"mobile_money"` | LOW | Visible to admin/support only | Redacted in public view. |【F:app/models/beneficiary.py†L52-L52】【F:app/schemas/beneficiary.py†L12-L43】【F:app/services/beneficiaries.py†L323-L335】 |
| national_id_type | Enum(NationalIdType), not null | `NationalIdType` | **Yes** | N/A | — | Enum: ID_CARD, PASSPORT | `"ID_CARD"` | HIGH | Visible to admin/support only | Redacted in public view. |【F:app/models/beneficiary.py†L54-L63】【F:app/schemas/beneficiary.py†L12-L43】【F:app/services/beneficiaries.py†L323-L335】 |
| national_id_number | String(128), not null | `str` | **Yes** | N/A | — | non-blank validator | `"A1234567"` | HIGH | Visible to admin/support only | Redacted in public view. |【F:app/models/beneficiary.py†L64-L64】【F:app/schemas/beneficiary.py†L12-L57】【F:app/services/beneficiaries.py†L323-L335】 |
| metadata | JSON, nullable | `dict | None` (`metadata_`) | No | N/A | `null` | NOT ENFORCED (code) | `{}` | MEDIUM | Visible to admin/support only | Redacted in public view; risk_features stripped unless admin/support. |【F:app/models/beneficiary.py†L66-L66】【F:app/schemas/beneficiary.py†L35-L39】【F:app/services/beneficiaries.py†L323-L335】 |
| notes | String(2048), nullable | `str | None` | No | N/A | `null` | NOT ENFORCED (code) | `"VIP"` | MEDIUM | Visible to admin/support only | Redacted in public view. |【F:app/models/beneficiary.py†L67-L68】【F:app/schemas/beneficiary.py†L40-L43】【F:app/services/beneficiaries.py†L323-L335】 |
| is_active | Boolean, not null | `bool | None` (read) | N/A | N/A | `true` | — | `true` | NONE | Visible to admin/support only | Not exposed in public read. |【F:app/models/beneficiary.py†L68-L68】【F:app/schemas/beneficiary.py†L96-L128】 |
| masked | N/A | `bool` (read-only) | N/A | N/A | `true` (public) | — | `true` | NONE | Indicates redaction applied | Public vs admin read differ. |【F:app/schemas/beneficiary.py†L96-L171】【F:app/services/beneficiaries.py†L323-L335】 |

### Recommendations (constraints not enforced in code)
- `phone`: add format/length validation beyond non-blank (E.164).
- `email`: already EmailStr; consider lowercasing in schema for consistency (service does normalization).
- `bank_account`/`iban`/`bank_account_number`: add format validation (IBAN length/pattern).
- `country_code`: normalize to uppercase ISO-3166-1 alpha-2.

### Create Payload Shape (BeneficiaryProfile)
**POST `/beneficiaries`**
```json
{
  "first_name": "Maria",
  "last_name": "Lopez",
  "email": "maria@example.com",
  "phone": "+250788000000",
  "address_line1": "12 Avenue",
  "city": "Kigali",
  "country_code": "RW",
  "bank_account": "RW123456789",
  "national_id_type": "ID_CARD",
  "national_id_number": "A1234567"
}
```
`BeneficiaryCreate` schema with required non-blank validators and bank account requirement.【F:app/schemas/beneficiary.py†L12-L79】【F:app/routers/beneficiaries.py†L23-L38】

**Minimal valid example**
```json
{
  "first_name": "Maria",
  "last_name": "Lopez",
  "email": "maria@example.com",
  "phone": "+250788000000",
  "address_line1": "12 Avenue",
  "city": "Kigali",
  "country_code": "RW",
  "iban": "RW123456789",
  "national_id_type": "ID_CARD",
  "national_id_number": "A1234567"
}
```
(IBAN can satisfy bank account requirement.)【F:app/schemas/beneficiary.py†L12-L79】

**Invalid example (missing bank account/iban/account_number)**
```json
{
  "first_name": "Maria",
  "last_name": "Lopez",
  "email": "maria@example.com",
  "phone": "+250788000000",
  "address_line1": "12 Avenue",
  "city": "Kigali",
  "country_code": "RW",
  "national_id_type": "ID_CARD",
  "national_id_number": "A1234567"
}
```
Expected: 422 validation error, message `bank_account is required (IBAN or local account number).`【F:app/schemas/beneficiary.py†L69-L78】

### Edit Payload Shape (BeneficiaryProfile)
- **No update endpoint** for beneficiary profiles in current API surface.【F:app/routers/beneficiaries.py†L23-L54】

### Endpoint Surface (BeneficiaryProfile)
| Method | Path | Auth | Roles | Notes | Evidence |
| --- | --- | --- | --- | --- | --- |
| POST | `/beneficiaries` | API key | sender | Create off-platform beneficiary profile. | 【F:app/routers/beneficiaries.py†L23-L38】 |
| GET | `/beneficiaries/{beneficiary_id}` | API key | sender, provider, admin, support, advisor | Role-based redaction (admin/support full). | 【F:app/routers/beneficiaries.py†L41-L54】【F:app/services/beneficiaries.py†L323-L361】 |

### Frontend implications (BeneficiaryProfile)
- Sender UI must collect **all required identity, contact, and payout fields** in one step (no patch endpoint).【F:app/schemas/beneficiary.py†L12-L79】【F:app/routers/beneficiaries.py†L23-L38】
- Admin/support can view full details; sender/provider/advisor views are redacted to name-only fields. Do not surface bank/ID data for non-admin roles.【F:app/schemas/beneficiary.py†L160-L171】【F:app/services/beneficiaries.py†L323-L335】

---

# Entity 7: External beneficiary token (ExternalProofToken)
**Purpose:** token-based access for external beneficiaries to upload/submit proofs.

## Field Contract Table — `external_proof_tokens`
| Field | Type (DB) | Type (API schema) | Required on Create | Optional on Update | Default | Constraints (min/max/regex/enum) | Example | PII Class | Redaction Rules | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| token_hash | String(128), unique, not null | **NOT EXPOSED** | Server-only | N/A | — | — | `"sha256..."` | HIGH | Not exposed | Raw token returned once; DB stores hash only. |【F:app/models/external_proof_token.py†L29-L35】【F:app/routers/external_proofs.py†L50-L78】 |
| token_prefix | String(32), nullable | **NOT EXPOSED** | Server-only | N/A | `null` | — | `"tok_"` | LOW | Not exposed | Token management metadata. |【F:app/models/external_proof_token.py†L35-L36】 |
| escrow_id | FK escrow_agreements.id, not null | `int` (`ExternalProofTokenRequest.escrow_id`) | **Yes** | N/A | — | — | `1024` | NONE | Visible to issuer (sender/admin/support) in response | Required by request schema. |【F:app/models/external_proof_token.py†L36-L37】【F:app/schemas/external_proofs.py†L13-L20】 |
| milestone_idx | Integer, not null | `int` (`ExternalProofTokenRequest.milestone_idx`) | **Yes** | N/A | — | ge=1 | `1` | NONE | Visible to issuer in response | Required by request schema. |【F:app/models/external_proof_token.py†L37-L37】【F:app/schemas/external_proofs.py†L13-L20】 |
| issued_to_email | String(255), nullable | `str | None` | No | N/A | `null` | NOT ENFORCED (code) | `"ben@example.com"` | MEDIUM | Visible to issuer only (not returned) | Provided at issue time. |【F:app/models/external_proof_token.py†L38-L38】【F:app/schemas/external_proofs.py†L13-L20】 |
| beneficiary_profile_id | FK beneficiary_profiles.id, nullable | `int | None` (`ExternalProofTokenRequest.beneficiary_profile_id`) | Optional (required for `/external/tokens/beneficiary`) | N/A | `null` | gt=0 for ExternalBeneficiaryTokenRequest | `55` | NONE | Visible to issuer only (not returned) | Beneficiary-scoped token request enforces `gt=0`. |【F:app/models/external_proof_token.py†L39-L41】【F:app/schemas/external_proofs.py†L13-L32】 |
| issued_by_user_id | FK users.id, nullable | **NOT EXPOSED** | Server-only | N/A | `null` | — | `10` | NONE | Not exposed | Derived from API key. |【F:app/models/external_proof_token.py†L42-L42】【F:app/routers/external_proofs.py†L50-L109】 |
| purpose | Enum(ExternalProofTokenPurpose), not null | **NOT EXPOSED** | Server-only | N/A | `PROOF_UPLOAD` | Enum: PROOF_UPLOAD | `"PROOF_UPLOAD"` | LOW | Not exposed | Default enforced by model. |【F:app/models/external_proof_token.py†L20-L47】 |
| expires_at | DateTime, not null | `datetime` (`ExternalProofTokenResponse.expires_at`) | Server-derived | N/A | — | — | `"2024-01-01T00:00:00Z"` | NONE | Visible to issuer in response | TTL can be set via `expires_in_minutes` (server-bounded). |【F:app/models/external_proof_token.py†L48-L48】【F:app/schemas/external_proofs.py†L13-L28】 |
| used_at | DateTime, nullable | **NOT EXPOSED** | N/A | N/A | `null` | — | `"2024-01-01T00:00:00Z"` | NONE | Not exposed | Server-managed when token consumed. |【F:app/models/external_proof_token.py†L49-L50】 |
| used_file_id | String(1024), nullable | **NOT EXPOSED** | N/A | N/A | `null` | — | `"proofs/..."` | LOW | Not exposed | Set after external upload. |【F:app/models/external_proof_token.py†L50-L50】【F:app/routers/external_proofs.py†L138-L191】 |
| used_proof_id | FK proofs.id, nullable | **NOT EXPOSED** | N/A | N/A | `null` | — | `9001` | NONE | Not exposed | Set after proof submission. |【F:app/models/external_proof_token.py†L51-L51】 |
| metadata | JSON, nullable | **NOT EXPOSED** | N/A | N/A | `null` | — | `{}` | LOW | Not exposed | Server-managed metadata. |【F:app/models/external_proof_token.py†L52-L52】 |

### Recommendations (constraints not enforced in code)
- `issued_to_email`: enforce email format if provided.
- `expires_in_minutes`: enforce explicit bounds in schema once defined (docstring says server-bounded).【F:app/schemas/external_proofs.py†L13-L20】

### Create Payload Shape (ExternalProofToken)
**POST `/external/proofs/tokens`**
```json
{
  "escrow_id": 1024,
  "milestone_idx": 1,
  "issued_to_email": "ben@example.com",
  "expires_in_minutes": 60,
  "beneficiary_profile_id": 55
}
```
`ExternalProofTokenRequest` schema.【F:app/schemas/external_proofs.py†L13-L20】【F:app/routers/external_proofs.py†L50-L78】

**Minimal valid example**
```json
{
  "escrow_id": 1024,
  "milestone_idx": 1
}
```

**Invalid example (milestone_idx < 1)**
```json
{
  "escrow_id": 1024,
  "milestone_idx": 0
}
```
Expected: 422 validation error (`ge=1`).【F:app/schemas/external_proofs.py†L13-L16】

### Edit Payload Shape (ExternalProofToken)
- **No update endpoint.** Tokens are server-managed/consumed by external upload/submit endpoints.【F:app/routers/external_proofs.py†L138-L205】

### Endpoint Surface (ExternalProofToken)
| Method | Path | Auth | Roles | Notes | Evidence |
| --- | --- | --- | --- | --- | --- |
| POST | `/external/proofs/tokens` | API key | sender, admin, support | Issue external token. | 【F:app/routers/external_proofs.py†L50-L78】 |
| POST | `/external/tokens/beneficiary` | API key | sender, admin, support | Issue beneficiary-scoped token. | 【F:app/routers/external_proofs.py†L81-L109】 |
| POST | `/external/files/proofs` | Token | external beneficiary token | Upload proof file. | 【F:app/routers/external_proofs.py†L138-L191】 |
| POST | `/external/proofs/submit` | Token | external beneficiary token | Submit proof metadata. | 【F:app/routers/external_proofs.py†L194-L205】 |

### Frontend implications (External beneficiary token)
- External beneficiaries should **never see internal profile data**; they only receive a token and upload/submit proof data.
- UI for external beneficiaries must collect proof fields only (type, storage_key, storage_url, sha256).【F:app/schemas/external_proofs.py†L58-L85】

---

# Entity 8: Merchant (Spend subsystem)
**Role coverage:** merchant entity (not a user). Managed by admin/support.

## Field Contract Table — `merchants`
| Field | Type (DB) | Type (API schema) | Required on Create | Optional on Update | Default | Constraints (min/max/regex/enum) | Example | PII Class | Redaction Rules | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| name | String(255), unique, not null | `str` (`MerchantCreate.name`) | **Yes** | N/A | — | min_length=1, max_length=255 | `"Acme Stores"` | LOW | Visible to admin/support | —【F:app/models/spend.py†L30-L31】【F:app/schemas/spend.py†L27-L31】 |
| category_id | FK spend_categories.id, nullable | `int | None` | No | N/A | `null` | NOT ENFORCED (code) | `5` | NONE | Visible to admin/support | —【F:app/models/spend.py†L31-L32】【F:app/schemas/spend.py†L27-L31】 |
| is_certified | Boolean, not null | `bool` | No (default false) | N/A | `false` | — | `false` | NONE | Visible to admin/support | —【F:app/models/spend.py†L32-L32】【F:app/schemas/spend.py†L27-L31】 |
| id | Integer, PK | `int` (read) | N/A | N/A | — | — | `12` | NONE | Visible to admin/support | Read-only. |【F:app/schemas/spend.py†L33-L41】 |
| created_at | DateTime (Base) | `datetime` (read) | N/A | N/A | — | — | `"2024-01-01T00:00:00Z"` | NONE | Visible to admin/support | Read-only. |【F:app/schemas/spend.py†L33-L41】 |
| updated_at | DateTime (Base) | `datetime` (read) | N/A | N/A | — | — | `"2024-01-02T00:00:00Z"` | NONE | Visible to admin/support | Read-only. |【F:app/schemas/spend.py†L33-L41】 |

### Recommendations (constraints not enforced in code)
- `category_id`: validate that the referenced spend category exists before create.
- `is_certified`: consider restricting to admin-only toggling on creation if needed.

### Create Payload Shape (Merchant)
**POST `/spend/merchants`**
```json
{
  "name": "Acme Stores",
  "category_id": 5,
  "is_certified": false
}
```
`MerchantCreate` schema.【F:app/schemas/spend.py†L27-L31】【F:app/routers/spend.py†L45-L56】

**Minimal valid example**
```json
{
  "name": "Acme Stores"
}
```

**Invalid example (name empty)**
```json
{
  "name": ""
}
```
Expected: 422 validation error (`min_length=1`).【F:app/schemas/spend.py†L27-L31】

### Edit Payload Shape (Merchant)
- **No update endpoint** for spend merchants in current API surface.【F:app/routers/spend.py†L45-L56】

### Endpoint Surface (Merchant)
| Method | Path | Auth | Roles | Notes | Evidence |
| --- | --- | --- | --- | --- | --- |
| POST | `/spend/merchants` | API key | admin, support | Create spend merchant. | 【F:app/routers/spend.py†L45-L56】 |

### Frontend implications (Merchant)
- Admin/support UI can create merchants using minimal fields; no edit/delete endpoints exist yet.

---

# Entity 9: MerchantRegistry (certified registry)
**Role coverage:** merchant registry entity (not a user). Exposed indirectly via merchant suggestion promotion.

## Field Contract Table — `merchant_registry`
| Field | Type (DB) | Type (API schema) | Required on Create | Optional on Update | Default | Constraints (min/max/regex/enum) | Example | PII Class | Redaction Rules | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| id | UUID (PK) | **NOT EXPOSED** | Server-generated | N/A | `uuid4()` | — | `"uuid"` | NONE | Not exposed | Registry IDs surface via `promotion_registry_id` in merchant suggestions. |【F:app/models/merchants.py†L45-L47】【F:app/schemas/merchant_suggestions.py†L31-L38】 |
| created_at | DateTime | **NOT EXPOSED** | Server-generated | N/A | `utcnow()` | — | `"2024-01-01T00:00:00Z"` | NONE | Not exposed | —【F:app/models/merchants.py†L48-L52】 |
| updated_at | DateTime | **NOT EXPOSED** | Server-generated | N/A | `utcnow()` | — | `"2024-01-02T00:00:00Z"` | NONE | Not exposed | —【F:app/models/merchants.py†L51-L53】 |
| name | String(255), not null | `str | None` (`MerchantRegistryPromotionPayload.name`) | **Yes** when creating new registry | Optional | — | NOT ENFORCED (code) | `"Acme Stores"` | LOW | Not exposed in read | Provided via promotion payload. |【F:app/models/merchants.py†L54-L55】【F:app/schemas/merchant_suggestions.py†L70-L80】 |
| country_code | String(2), nullable | `str | None` | No | Optional | `null` | NOT ENFORCED (code) | `"BE"` | LOW | Not exposed in read | —【F:app/models/merchants.py†L55-L56】【F:app/schemas/merchant_suggestions.py†L70-L80】 |
| region | String(128), nullable | **NOT EXPOSED** | N/A | N/A | `null` | — | `"Brussels"` | LOW | Not exposed | Not in any schema. |【F:app/models/merchants.py†L56-L56】 |
| city | String(255), nullable | **NOT EXPOSED** | N/A | N/A | `null` | — | `"Brussels"` | LOW | Not exposed | Not in any schema. |【F:app/models/merchants.py†L57-L57】 |
| address_line | String(255), nullable | `str | None` | No | Optional | `null` | NOT ENFORCED (code) | `"123 Street"` | LOW | Not exposed in read | —【F:app/models/merchants.py†L58-L58】【F:app/schemas/merchant_suggestions.py†L70-L80】 |
| tax_id | String(128), nullable | `str | None` | No | Optional | `null` | NOT ENFORCED (code) | `"VAT123"` | LOW | Not exposed in read | —【F:app/models/merchants.py†L59-L59】【F:app/schemas/merchant_suggestions.py†L70-L80】 |
| phone_number | String(64), nullable | `str | None` | No | Optional | `null` | NOT ENFORCED (code) | `"+1555000"` | LOW | Not exposed in read | —【F:app/models/merchants.py†L60-L60】【F:app/schemas/merchant_suggestions.py†L70-L80】 |
| email | String(255), nullable | `str | None` | No | Optional | `null` | NOT ENFORCED (code) | `"merchant@example.com"` | MEDIUM | Not exposed in read | —【F:app/models/merchants.py†L61-L61】【F:app/schemas/merchant_suggestions.py†L70-L80】 |
| iban | String(34), nullable | `str | None` | No | Optional | `null` | NOT ENFORCED (code) | `"BE68539007547034"` | HIGH | Not exposed in read | Only available in promotion payload. |【F:app/models/merchants.py†L62-L62】【F:app/schemas/merchant_suggestions.py†L70-L80】 |
| stripe_account_id | String(255), nullable | **NOT EXPOSED** | N/A | N/A | `null` | — | `"acct_123"` | LOW | Not exposed | Server-managed. |【F:app/models/merchants.py†L63-L63】 |
| is_certified | Boolean | **NOT EXPOSED** | Server-managed | N/A | `true` | — | `true` | NONE | Not exposed | —【F:app/models/merchants.py†L64-L64】 |
| status | Enum(MerchantStatus) | **NOT EXPOSED** | Server-managed | N/A | `ACTIVE` | Enum: ACTIVE/SUSPENDED/BLACKLISTED | `"ACTIVE"` | LOW | Not exposed | —【F:app/models/merchants.py†L65-L67】 |
| stats_* / pricing_* | Numeric/DateTime | **NOT EXPOSED** | Server-managed | N/A | — | — | — | NONE | Not exposed | Computed analytics fields. |【F:app/models/merchants.py†L68-L78】 |

### Recommendations (constraints not enforced in code)
- `name`: enforce non-blank and length in promotion payload.
- `country_code`: enforce ISO-3166-1 alpha-2 when provided.
- `iban`: add format validation when provided.

### Create Payload Shape (MerchantRegistry)
**Promotion flow only:** `POST /admin/merchant-suggestions/{suggestion_id}/promote`
```json
{
  "create_new_registry": true,
  "registry_payload": {
    "name": "Acme Stores",
    "country_code": "BE",
    "tax_id": "VAT123",
    "iban": "BE68539007547034"
  }
}
```
`MerchantSuggestionPromote` + `MerchantRegistryPromotionPayload` schemas; no direct registry CRUD endpoint. 【F:app/schemas/merchant_suggestions.py†L70-L102】【F:app/routers/admin_merchant_suggestions.py†L90-L102】

**Invalid example (missing link_existing_registry_id when create_new_registry=false)**
```json
{
  "create_new_registry": false
}
```
Expected: 422 validation error (`link_existing_registry_id is required`).【F:app/schemas/merchant_suggestions.py†L84-L102】

### Edit Payload Shape (MerchantRegistry)
- **No direct update endpoint** for registry fields; only promotion payload provides overrides during creation.【F:app/routers/admin_merchant_suggestions.py†L90-L102】

### Endpoint Surface (MerchantRegistry)
| Method | Path | Auth | Roles | Notes | Evidence |
| --- | --- | --- | --- | --- | --- |
| POST | `/admin/merchant-suggestions/{suggestion_id}/promote` | API key | admin, support | Create or link registry entry. | 【F:app/routers/admin_merchant_suggestions.py†L90-L102】【F:app/schemas/merchant_suggestions.py†L84-L102】 |

### Frontend implications (MerchantRegistry)
- Admin/support UIs can only influence registry fields via **promotion payload**; there is no direct registry CRUD API.

---

# Entity 10: MerchantObserved (observed merchants)
**Role coverage:** analytics entity; not exposed via API.

## Field Contract Table — `merchant_observed`
| Field | Type (DB) | Type (API schema) | Required on Create | Optional on Update | Default | Constraints (min/max/regex/enum) | Example | PII Class | Redaction Rules | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| id | UUID (PK) | **NOT EXPOSED** | Server-generated | N/A | `uuid4()` | — | `"uuid"` | NONE | Not exposed | No API surface. |【F:app/models/merchants.py†L90-L92】 |
| created_at | DateTime | **NOT EXPOSED** | Server-generated | N/A | `utcnow()` | — | `"2024-01-01T00:00:00Z"` | NONE | Not exposed | —【F:app/models/merchants.py†L93-L98】 |
| updated_at | DateTime | **NOT EXPOSED** | Server-generated | N/A | `utcnow()` | — | `"2024-01-02T00:00:00Z"` | NONE | Not exposed | —【F:app/models/merchants.py†L96-L98】 |
| canonical_name | String(255), not null | **NOT EXPOSED** | Server-managed | N/A | — | — | `"ACME"` | LOW | Not exposed | Derived from proofs. |【F:app/models/merchants.py†L99-L100】 |
| raw_name | String(255), not null | **NOT EXPOSED** | Server-managed | N/A | — | — | `"Acme Store"` | LOW | Not exposed | Derived from proofs. |【F:app/models/merchants.py†L100-L100】 |
| country_code | String(2), nullable | **NOT EXPOSED** | Server-managed | N/A | `null` | — | `"BE"` | LOW | Not exposed | —【F:app/models/merchants.py†L101-L101】 |
| region/city/address_line | String, nullable | **NOT EXPOSED** | Server-managed | N/A | `null` | — | — | LOW | Not exposed | —【F:app/models/merchants.py†L102-L104】 |
| tax_id | String(128), nullable | **NOT EXPOSED** | Server-managed | N/A | `null` | — | — | LOW | Not exposed | —【F:app/models/merchants.py†L105-L105】 |
| account_number | String(64), nullable | **NOT EXPOSED** | Server-managed | N/A | `null` | — | — | HIGH | Not exposed | —【F:app/models/merchants.py†L106-L106】 |
| linked_registry_id | FK merchant_registry.id, nullable | **NOT EXPOSED** | Server-managed | N/A | `null` | — | — | NONE | Not exposed | —【F:app/models/merchants.py†L107-L109】 |
| stats_* / pricing_* | Numeric/DateTime | **NOT EXPOSED** | Server-managed | N/A | — | — | — | NONE | Not exposed | Computed analytics fields. |【F:app/models/merchants.py†L110-L120】 |

### Recommendations (constraints not enforced in code)
- Ensure normalization rules for `canonical_name`/`raw_name` are documented where populated.

### Create Payload Shape (MerchantObserved)
- **No create/update payloads**; populated internally by risk/pricing pipelines.

### Endpoint Surface (MerchantObserved)
- **No API endpoints** in current routers.

---

# KYC / Identity Objects
## NationalIdType enum
- Enum values: `ID_CARD`, `PASSPORT`. Used by both `UserProfile` and `BeneficiaryProfile`.【F:app/models/beneficiary.py†L16-L20】【F:app/models/user_profile.py†L30-L39】

---

# Known Gaps / Ambiguities (blunt)
1. **UserProfile has no required fields and no explicit create schema.** All identity fields are nullable in the DB and optional in the update schema; profiles auto-create on read/patch, which means required identity is not enforced at API level.【F:app/models/user_profile.py†L11-L44】【F:app/schemas/user_profile.py†L12-L58】【F:app/services/user_profiles.py†L17-L22】
2. **AdvisorProfileCreate allows null first/last/email despite DB NOT NULL.** The service fills defaults from the linked user, but this behavior is implicit and not documented in schema constraints.【F:app/models/advisor.py†L21-L24】【F:app/schemas/advisor.py†L8-L20】【F:app/services/advisors.py†L92-L103】
3. **User.public_tag is stored but never exposed in schemas.** This field is in DB but absent from UserCreate/UserRead, so UI cannot read or set it.【F:app/models/user.py†L31-L32】【F:app/schemas/user.py†L7-L26】
4. **MerchantRegistry and MerchantObserved have no dedicated read schemas or CRUD endpoints.** Only promotion payloads for MerchantRegistry exist, so registry fields cannot be queried/edited directly by UI.【F:app/models/merchants.py†L34-L120】【F:app/schemas/merchant_suggestions.py†L70-L102】【F:app/routers/admin_merchant_suggestions.py†L90-L102】
5. **Support/admin user creation does not allow setting username or profile details directly.** `/admin/users` only accepts email/role/issue_api_key and auto-generates username and advisor profile when role=advisor.【F:app/routers/admin_users.py†L44-L114】

---

# Frontend implications summary (per role)
- **Sender/Provider (on-platform)**: UI should collect `User` (created by admin/support) and optionally prompt for `UserProfile` identity data later; no required profile fields enforced yet.【F:app/models/user_profile.py†L11-L44】【F:app/schemas/user_profile.py†L12-L58】
- **Advisor**: profile creation is admin-only; advisor self-profile is read-only. Collect optional fields in admin flow only.【F:app/routers/admin_advisors.py†L28-L119】【F:app/routers/advisors.py†L216-L228】
- **Support/Admin**: no dedicated profile; use User + UserProfile. Admin views of user profiles mask bank/national ID when viewer != target.【F:app/services/user_profiles.py†L64-L83】
- **Merchant (spend)**: create via `/spend/merchants` with minimal fields; no edit UI yet.【F:app/routers/spend.py†L45-L56】
- **Merchant Registry**: only controllable via suggestion promotion payload; no direct registry editing UI.【F:app/routers/admin_merchant_suggestions.py†L90-L102】
- **External beneficiary (token-based)**: UI should only handle proof upload/submission; profile fields are managed by senders and redacted in public views.【F:app/routers/external_proofs.py†L138-L205】【F:app/schemas/beneficiary.py†L160-L171】

## Sync evidence (per change)
1) Add explicit `scopes` field to the User contract (AuthUser)
- BEFORE: User field table had no computed scopes row.
- AFTER: Added `scopes` row documenting `list[ApiScope]`, derived from role and exposed by `/auth/me` and `/auth/login`.
- Reason: `/auth/me` now returns the computed scopes list; it was undocumented in this audit.
- Backend source: `AuthUser.scopes` computed field and role-to-scope mapping.【F:app/schemas/auth.py†L15-L37】【F:app/security/roles.py†L83-L98】

2) Document `/auth/me` endpoint access and payload
- BEFORE: Endpoint surface omitted `/auth/me`; no session payload description; support scope implicitly allowed by omission.
- AFTER: Added `/auth/me` row with sender/provider/admin/advisor access, payload shape (id, email, username, role, payout_channel, scopes), and explicit support exclusion plus a dedicated session payload subsection.
- Reason: Align audit with current `GET /auth/me` schema and guards, including advisor access and support exclusion.
- Backend source: Auth router guard and AuthMeResponse schema.【F:app/routers/auth.py†L163-L184】【F:app/schemas/auth.py†L15-L37】

3) Frontend guidance updated for session data
- BEFORE: Frontend implications for User only covered creation/update constraints.
- AFTER: Added note instructing UI routing to rely on `/auth/me` fields (including scopes) and mentioning advisor token support.
- Reason: UI guidance must match actual session payload and allowed scopes.
- Backend source: Auth router and schemas.【F:app/routers/auth.py†L163-L184】【F:app/schemas/auth.py†L15-L37】

## Change log
- Substitutions
  - Endpoint surface now reflects `/auth/me` access (sender/provider/admin/advisor) and payload scope, clarifying support is excluded.
- Additions
  - Documented computed `scopes` field in `AuthUser` and described `/auth/me` session payload plus frontend usage of these fields.
- Deletions
  - None (no content removed).
