# AUTHZ INVENTORY REPORT — Demo Users, `/auth/me`, and Portal Scopes

**Repo:** `kobatela_alpha` (FastAPI backend)  
**Scope:** Token issuance/parsing, `/auth/me`, scope normalization, route guards, demo bootstrap, and endpoint policy inventory.  
**Goal:** Diagnose possible backend causes of frontend “Portée insuffisante” (“insufficient scope”) or redirect issues.

---

## 0) Executive summary

**Finding:** The backend enforces authorization through **relational ABAC** (relationship-based checks) rather than business-role RBAC. Scopes on API keys are **technical gates only**; the actual allow/deny decisions are based on relationships like `escrow.sender_user_id == viewer_user_id`, `escrow.provider_user_id == viewer_user_id`, beneficiary ownership, and advisor assignments.  
**Resolution:** `/auth/login` and `/auth/me` return `AuthUser` with explicit `scopes` (derived from `scopes_for_user`) and optional `capabilities`, making the frontend contract explicit while keeping authorization tied to relational checks.

**Conclusion:** Backend auth now exposes **technical scopes + capabilities**, but **authorization remains relational**. Frontend scope-based routing must still respect relationship checks enforced in services.  
**Status:** **Current contract validated** (scopes returned in `/auth/login` + `/auth/me`, relational checks enforced in services).

---

## 1) Token types & parsing/validation

### Supported token types
| Token type | How it is used | Notes | Evidence |
| --- | --- | --- | --- |
| **API key** | Sent as `Authorization: Bearer <token>` or `X-API-Key: <token>` | Both headers accepted; `X-API-Key` takes precedence | `app/security/__init__.py` (`_extract_key`) |
| **Legacy dev key** | `DEV_API_KEY` in config, if enabled | Special-case fallback used only when `DEV_API_KEY_ALLOWED` | `app/security/__init__.py`, `app/utils/apikey.py` |
| **External proof token** | Sent as `Authorization: Bearer <token>` or `X-External-Token: <token>` to `/external/*` endpoints | Not a user API key; scoped to external proof flows | `app/security/external_tokens.py` |
| **Signed download token** | Path param for `/files/signed/{token}` | Resolves a signed URL for stored proof files | `app/routers/uploads.py` |

**Not present:** JWTs or OAuth flows are **not** used here.

### Parsing & validation flow
1. `_extract_key()` checks `X-API-Key` first, then `Authorization: Bearer ...` (no other schemes).  
2. `require_api_key()` validates:
   - **Legacy DEV key** when enabled.
   - **Hashed key** lookup via HMAC-SHA256 in `find_valid_key()`.  
3. Invalid/missing key → `401` with `NO_API_KEY` / `UNAUTHORIZED` error payloads.  
4. Valid key sets `last_used_at` + audit log.

---

## 2) Roles, normalization, and scope derivation

### Roles
| Enum | Values | Normalization | Evidence |
| --- | --- | --- | --- |
| `UserRole` | `user`, `admin`, `support`, `advisor` | Stored as lower-case string enum | `app/models/user.py` |

### Scopes
| Enum | Values | Normalization | Evidence |
| --- | --- | --- | --- |
| `ApiScope` | `support`, `admin`, `advisor`, `user`, `pricing_admin`, `risk_admin` | Enum defines uppercase canonical names + lower-case aliases | `app/models/api_key.py` |

### Effective scopes (definition)
**Effective scopes** are derived from the user’s global role via `scopes_for_user(user)`.  
A user’s effective scopes = `scopes_for_user(user)`.

Key characteristics:
- **Admin** → `admin`
- **Support** → `support`
- **Advisor** → `advisor`
- **All non-staff roles** (including `user`) → `user`

This mapping is used by `/auth/login`, admin user creation, and `AuthUser.scopes` for `/auth/me` responses.

### Capabilities (relationship hints, not scopes)
Users may also carry **capabilities** (stored as a list of strings in `user.capabilities`). These are **not roles**, and they are **not sufficient authorization**; access decisions remain relational and are enforced by RAL/service checks even when capabilities are present.

---

## 3) `/auth/login` analysis

- **Endpoint:** `POST /auth/login`
- **Input:** `AuthLoginRequest` (`email`, optional `scope`)
- **Behavior:**
  - Loads user by email; requires `user.is_active`.
  - Derives allowed scopes from `scopes_for_user(user)`.
  - If `payload.scope` is present and not allowed → `403 INSUFFICIENT_SCOPE`.
  - Issues/rotates API key for selected scope; creates keys for other available scopes for the same user.
- **Response:** `AuthLoginResponse` with `access_token`, `token`, `token_type=api_key`, and `user`.

**Important:** login tokens are **API keys**, not JWTs.

---

## 4) `/auth/me` analysis (scope and payload)

- **Endpoint:** `GET /auth/me`
- **Auth required:** `require_authenticated_user` (API key linked to a user)
- **Behavior:** returns the `User` linked to the API key; otherwise `403 USER_NOT_FOUND` or `404 USER_NOT_FOUND`.

**Current contract:** `AuthUser` includes `scopes` derived from `scopes_for_user(user)` and optional `capabilities`, keeping `/auth/me` and `/auth/login` consistent and explicit.

### Expected `/auth/me` schema (current)
```json
{
  "user": {
    "id": 123,
    "email": "admin.demo@kobatela.dev",
    "username": "admin-demo",
    "role": "admin",
    "payout_channel": "stripe_connect",
    "capabilities": null,
    "scopes": ["admin"]
  }
}
```

### Example payloads (demo users)
**Admin demo** (admin.demo@kobatela.dev):
```json
{
  "user": {
    "id": 1,
    "email": "admin.demo@kobatela.dev",
    "username": "admin-demo",
    "role": "admin",
    "payout_channel": "stripe_connect",
    "capabilities": null,
    "scopes": ["admin"]
  }
}
```

**Sender demo** (sender.demo@kobatela.dev):
```json
{
  "user": {
    "id": 2,
    "email": "sender.demo@kobatela.dev",
    "username": "sender-demo",
    "role": "user",
    "payout_channel": "stripe_connect",
    "capabilities": null,
    "scopes": ["user"]
  }
}
```

**Provider demo** (provider.demo@kobatela.dev):
```json
{
  "user": {
    "id": 3,
    "email": "provider.demo@kobatela.dev",
    "username": "provider-demo",
    "role": "user",
    "payout_channel": "stripe_connect",
    "capabilities": null,
    "scopes": ["user"]
  }
}
```

---

## 5) Demo bootstrap / seeding analysis

**Script:** `scripts/bootstrap_admin_and_sender.py`  
Creates/ensures:
- **Admin console key**: `name=admin-console`, scope `admin`, **no user** attached.
- **Admin demo user**: `admin.demo@kobatela.dev`, role `admin`, active.
- **Sender demo user**: `sender.demo@kobatela.dev`, role `user`, active.
- **Provider demo user**: `provider.demo@kobatela.dev`, role `user`, active.
- **Sender demo API key**: `name=sender-demo-apikey`, scope `user`.
- **Provider demo API key**: `name=provider-demo-apikey`, scope `user`.
- **Admin user API key**: `name=admin-ui-<user_id>`, scope `admin`.

Provider demo users are seeded by this script alongside sender/admin.

---

## 6) Endpoint policy inventory (auth + scopes)

**Auth mechanism:** API key (Bearer or X-API-Key) unless noted.  
**Failure codes for auth mismatches:**
- **401** `NO_API_KEY` or `UNAUTHORIZED` (missing/invalid key)
- **403** `INSUFFICIENT_SCOPE` or `USER_NOT_FOUND` (scope not allowed or key not linked to a user)
- **404** `USER_NOT_FOUND` for user-linked endpoints that cannot resolve a user

### `/auth` (app/routers/auth.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/auth/login` | `login` | None | N/A | 401 invalid credentials; 403 insufficient scope |
| GET | `/auth/me` | `auth_me` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403/404 for user missing |

### `/alerts` (app/routers/alerts.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| GET | `/alerts` | `list_alerts` | API key | admin/support | 401/403 |

### `/admin` (app/routers/admin_dashboard.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| GET | `/admin/dashboard` | `read_admin_dashboard` | API key | admin | 401/403 |

### `/admin` (app/routers/admin_advisors.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/admin/advisors` | `create_advisor` | API key | admin | 401/403/404 |
| GET | `/admin/advisors` | `list_advisors` | API key | admin | 401/403 |
| GET | `/admin/advisors/{advisor_id}` | `get_advisor` | API key | admin | 401/403/404 |
| PATCH | `/admin/advisors/{advisor_id}` | `admin_update_advisor` | API key | admin | 401/403/404 |
| GET | `/admin/advisors/{advisor_id}/senders` | `admin_list_advisor_senders` | API key | admin | 401/403/404 |
| POST | `/admin/advisors/{advisor_id}/assign-sender` | `admin_assign_sender_to_advisor` | API key | admin | 401/403/404 |

### `/admin` (app/routers/admin_merchant_suggestions.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| GET | `/admin/merchant-suggestions` | `list_suggestions` | API key | admin/support | 401/403 |
| POST | `/admin/merchant-suggestions/{suggestion_id}/approve` | `approve_suggestion` | API key | admin/support | 401/403/422 |
| POST | `/admin/merchant-suggestions/{suggestion_id}/reject` | `reject_suggestion` | API key | admin/support | 401/403/422 |
| POST | `/admin/merchant-suggestions/{suggestion_id}/promote` | `promote_suggestion` | API key | admin/support | 401/403 |

### `/admin` (app/routers/admin_pricing_reference.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/admin/pricing/reference/import-csv` | `import_price_reference` | API key | pricing_admin/risk_admin (admin bypass) | 401/403/400 |

### `/admin` (app/routers/admin_pricing_inflation.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/admin/pricing/inflation/upload-csv` | `upload_inflation_csv` | API key | pricing_admin/risk_admin (admin bypass) | 401/403/400 |
| GET | `/admin/pricing/inflation` | `list_inflation_adjustments` | API key | pricing_admin/risk_admin (admin bypass) | 401/403 |
| POST | `/admin/pricing/inflation` | `create_inflation_adjustment` | API key | pricing_admin/risk_admin (admin bypass) | 401/403/400 |
| PUT | `/admin/pricing/inflation/{adjustment_id}` | `update_inflation_adjustment` | API key | pricing_admin/risk_admin (admin bypass) | 401/403/400/404 |
| DELETE | `/admin/pricing/inflation/{adjustment_id}` | `delete_inflation_adjustment` | API key | pricing_admin/risk_admin (admin bypass) | 401/403/404 |

### `/admin` (app/routers/admin_senders.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| GET | `/admin/senders` | `list_admin_senders` | API key | admin | 401/403 |

### `/admin/settings` (app/routers/admin_settings.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| GET | `/admin/settings/ai-proof` | `get_ai_proof_setting` | API key | admin | 401/403 |
| POST | `/admin/settings/ai-proof` | `set_ai_proof_setting` | API key | admin | 401/403 |

### `/admin` (app/routers/admin_tools.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| GET | `/admin/proofs/review-queue` | `get_proof_review_queue` | API key | admin/support | 401/403 |
| GET | `/admin/fraud/score_comparison` | `fraud_score_comparison` | API key | admin/support | 401/403/404 |
| GET | `/admin/risk-snapshots` | `list_risk_snapshots` | API key | admin/support | 401/403 |
| GET | `/admin/advisors/overview` | `get_advisors_overview` | API key | admin/support | 401/403 |

### `/admin/escrows` (app/routers/admin_escrows.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| GET | `/admin/escrows/{escrow_id}/summary` | `read_admin_escrow_summary` | API key | admin/support | 401/403 |

### `/admin/users` (app/routers/admin_users.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/admin/users` | `admin_create_user` | API key | admin | 401/403/400 |
| GET | `/admin/users` | `list_admin_users` | API key | admin | 401/403 |
| GET | `/admin/users/{user_id}` | `get_admin_user` | API key | admin | 401/403/404 |
| GET | `/admin/users/{user_id}/api-keys` | `list_admin_user_api_keys` | API key | admin | 401/403/404 |
| POST | `/admin/users/{user_id}/api-keys` | `create_admin_user_api_key` | API key | admin | 401/403/400/404 |
| DELETE | `/admin/users/{user_id}/api-keys/{api_key_id}` | `revoke_admin_user_api_key` | API key | admin | 401/403/404 |
| GET | `/admin/users/{user_id}/profile` | `get_user_profile_admin` | API key | admin/support | 401/403/404 |

### `/apikeys` (app/routers/apikeys.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| GET | `/apikeys` | `deprecated_list_apikeys` | None | N/A | 410 (deprecated) |
| POST | `/apikeys` | `create_api_key` | API key | admin | 401/403 |
| GET | `/apikeys/{api_key_id}` | `get_apikey` | API key | admin | 401/403/404 |
| DELETE | `/apikeys/{api_key_id}` | `deprecated_delete_apikey` | None | N/A | 410 (deprecated) |

### `/advisors` (app/routers/advisors.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| GET | `/me/advisor` | `get_my_advisor` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403/503 |
| POST | `/proofs/{proof_id}/request_advisor_review` | `request_advisor_review` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403/404/409 |
| GET | `/advisor/me/profile` | `get_advisor_profile` | API key | advisor only (no admin bypass) | 401/403 |
| GET | `/advisor/me/proofs` | `list_assigned_proofs` | API key | advisor only (no admin bypass) | 401/403 |
| POST | `/advisor/proofs/{proof_id}/approve` | `advisor_approve_proof` | API key | advisor only (no admin bypass) | 401/403 (always 403) |
| POST | `/advisor/proofs/{proof_id}/reject` | `advisor_reject_proof` | API key | advisor only (no admin bypass) | 401/403 (always 403) |

### `/beneficiaries` (app/routers/beneficiaries.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/beneficiaries` | `create_beneficiary` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403 |
| GET | `/beneficiaries/{beneficiary_id}` | `read_beneficiary` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403/404 |

### `/debug/stripe` (app/routers/debug_stripe.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| GET | `/debug/stripe/account/{user_id}` | `debug_stripe_account` | API key | admin/support | 401/403 |

### `/escrows` (app/routers/escrow.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| GET | `/escrows` | `list_escrows` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403 |
| POST | `/escrows` | `create_escrow` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403 |
| POST | `/escrows/{escrow_id}/activate` | `activate` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403/404 |
| POST | `/escrows/{escrow_id}/deposit` | `deposit` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403 |
| POST | `/escrows/{escrow_id}/funding-session` | `create_funding_session` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403 |
| POST | `/escrows/{escrow_id}/mark-delivered` | `mark_delivered` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403 |
| POST | `/escrows/{escrow_id}/client-approve` | `client_approve` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403 |
| POST | `/escrows/{escrow_id}/client-reject` | `client_reject` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403 |
| POST | `/escrows/{escrow_id}/check-deadline` | `check_deadline` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403 |
| GET | `/escrows/{escrow_id}` | `read_escrow` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403/404 |
| GET | `/escrows/{escrow_id}/summary` | `get_sender_escrow_summary` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403/404 |
| POST | `/escrows/{escrow_id}/milestones` | `create_milestone_for_escrow` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403/404 |
| GET | `/escrows/{escrow_id}/milestones` | `list_milestones_for_escrow` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403/404 |
| GET | `/escrows/milestones/{milestone_id}` | `get_milestone` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403/404 |

### `/external` (app/routers/external_proofs.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/external/proofs/tokens` | `issue_external_proof_token` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403 |
| POST | `/external/tokens/beneficiary` | `issue_external_beneficiary_token` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403 |
| POST | `/external/files/proofs` | `upload_external_proof_file` | External token | token via Authorization/X-External-Token | 401/403/422 |
| POST | `/external/proofs/submit` | `submit_external_proof` | External token | token via Authorization/X-External-Token | 401/403/422 |
| GET | `/external/escrows/{escrow_id}` | `get_external_escrow_summary` | External token | token via Authorization/X-External-Token | 401/403/404 |

### `/health` (app/routers/health.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| GET | `/health` | `healthcheck` | None | N/A | 200/503 (DB) |

### `/kct_public` (app/routers/kct_public.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/kct_public/projects` | `create_project` | API key + GOV/ONG user | public-tag guard only | 401/403 |
| POST | `/kct_public/projects/{project_id}/managers` | `add_project_manager` | API key + GOV/ONG user | public-tag guard only | 401/403 |
| POST | `/kct_public/projects/{project_id}/mandates` | `attach_project_mandate` | API key + GOV/ONG user | public-tag guard only | 401/403 |
| GET | `/kct_public/projects/{project_id}` | `get_project_view` | API key + GOV/ONG user | public-tag guard only | 401/403/404 |
| GET | `/kct_public/projects` | `list_projects` | API key + GOV/ONG user | public-tag guard only | 401/403 |

### `/mandates` (app/routers/mandates.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/mandates` | `create_mandate` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403 |
| GET | `/mandates` | `list_mandates` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403 |
| GET | `/mandates/{mandate_id}` | `get_mandate` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403/404 |
| POST | `/mandates/cleanup` | `cleanup_expired_mandates` | API key | admin/support | 401/403 |

### `/merchant-suggestions` (app/routers/merchant_suggestions.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/merchant-suggestions` | `create_suggestion` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403 |
| GET | `/merchant-suggestions` | `list_suggestions` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403 |
| GET | `/merchant-suggestions/{suggestion_id}` | `get_suggestion` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403/404 |

### `/payments` + `/admin/payments` (app/routers/payments.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/payments/execute/{payment_id}` | `execute_payment` | API key | admin/support | 401/403/404 |
| GET | `/payments/{payment_id}` | `read_payment` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403/404 |
| GET | `/admin/payments` | `list_admin_payments` | API key | admin/support | 401/403 |

### `/proofs` (app/routers/proofs.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/proofs` | `submit_proof` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403 |
| GET | `/proofs` | `list_proofs` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403 (review_queue requires admin/support) |
| GET | `/proofs/{proof_id}` | `get_proof` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403/404 |
| POST | `/proofs/{proof_id}/decision` | `decide_proof` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403/404 (advisor blocked; sender must match escrow sender or validator rules) |

### `/psp` (app/routers/psp.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/psp/webhook` | `psp_webhook` | None | N/A | 400/500 on signature or processing errors |
| POST | `/psp/stripe/webhook` | `stripe_webhook` | None | N/A | 400/500 on signature or processing errors |

### `/sender` (app/routers/sender_dashboard.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| GET | `/sender/dashboard` | `get_sender_dashboard` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403/404 |

### `/spend` (app/routers/spend.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/spend/categories` | `create_category` | API key | admin/support | 401/403 |
| POST | `/spend/merchants` | `create_merchant` | API key | admin/support | 401/403 |
| POST | `/spend/allow` | `allow_usage` | API key | admin/support | 401/403 |
| POST | `/spend/purchases` | `create_purchase` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403 |
| POST | `/spend/allowed` | `add_allowed_payee` | API key | admin/support | 401/403 |
| POST | `/spend` | `spend` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403 |

### `/transactions` (app/routers/transactions.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/allowlist` | `add_to_allowlist` | API key | admin | 401/403 |
| POST | `/certified` | `add_certification` | API key | admin | 401/403 |
| POST | `/transactions` | `post_transaction` | API key | admin | 401/403 |
| GET | `/transactions` | `list_transactions` | API key | admin | 401/403 |
| GET | `/transactions/{transaction_id}` | `get_transaction` | API key | admin | 401/403/404 |

### `/uploads` (app/routers/uploads.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/files/proofs` | `upload_proof_file` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403/422 |
| GET | `/files/signed/{token}` | `download_signed_proof` | Signed token | token in path | 403/404/410 |

### `/user_profiles` (app/routers/user_profiles.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| GET | `/me/profile` | `get_my_profile` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403/404 |
| PATCH | `/me/profile` | `patch_my_profile` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403/404 |

### `/users` (app/routers/users.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/users` | `create_user` | API key | admin/support | 401/403 |
| POST | `/users/{user_id}/psp/stripe/account-link` | `create_stripe_account_link_for_user` | API key | admin | 401/403 |
| POST | `/users/{user_id}/stripe/sync` | `sync_user_stripe_account` | API key | admin/support | 401/403 |

### `/admin/risk` (app/routers/admin_risk.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| GET | `/admin/risk/fe3-mode` | `read_fe3_mode_state` | API key | admin/support | 401/403 |
| PUT | `/admin/risk/fe3-mode` | `update_fe3_mode` | API key | admin | 401/403/400 |

### `/admin/spend` (app/routers/admin_spend.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| GET | `/admin/spend/allowed` | `list_allowed_spend_targets` | API key | admin/support | 401/403 |

### `/merchants/registry` (app/routers/merchant_registry.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| GET | `/merchants/registry` | `list_registry` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403 |
| GET | `/merchants/registry/{registry_id}` | `get_registry` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403/404 |

### `/merchants/observed` (app/routers/merchant_observed.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| GET | `/merchants/observed` | `list_observed` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403 |
| GET | `/merchants/observed/{observed_id}` | `get_observed` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403/404 |

### `/pricing/reference` (app/routers/pricing_reference.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| GET | `/pricing/reference` | `list_price_references` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403 |
| GET | `/pricing/reference/{reference_id}` | `read_price_reference` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403/404 |

### `/pricing/inflation` (app/routers/pricing_inflation_public.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| GET | `/pricing/inflation` | `list_public_inflation_factors` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403 |

### `/provider` (app/routers/provider_inbox.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| GET | `/provider/inbox/escrows` | `list_provider_inbox` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403 |

### `/sender/escrows` (app/routers/sender_escrow_milestones.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/sender/escrows/{escrow_id}/milestones` | `create_sender_milestone_for_escrow` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403/404 |
| GET | `/sender/escrows/{escrow_id}/milestones` | `list_sender_milestones_for_escrow` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403/404 |

**Note:** legacy fraud-config endpoints under `/sender/escrows/*/fraud-config` are deprecated/blocked; use proof request endpoints under `/escrows/{escrow_id}/proof-requests`.

### `/escrows/{escrow_id}/proof-requests` (app/routers/escrow.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/escrows/{escrow_id}/proof-requests` | `create_proof_request` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403/404/422 |
| GET | `/escrows/{escrow_id}/proof-requests` | `list_proof_requests` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403/404 |
| GET | `/escrows/{escrow_id}/proof-requests/{proof_request_id}` | `get_proof_request` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403/404 |
| PATCH | `/escrows/{escrow_id}/proof-requests/{proof_request_id}` | `update_proof_request` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403/404/422 |
| DELETE | `/escrows/{escrow_id}/proof-requests/{proof_request_id}` | `delete_proof_request` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403/404 |

### `/sender/payments` (app/routers/sender_payments.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/sender/payments/{payment_id}/execute` | `execute_sender_payment` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403/404 |

### `/sender/external-proof-tokens` (app/routers/external_proof_tokens.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/sender/external-proof-tokens` | `issue_external_proof_token` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403 |
| GET | `/sender/external-proof-tokens` | `list_external_proof_tokens` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403 |
| GET | `/sender/external-proof-tokens/{token_id}` | `get_external_proof_token` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403/404 |
| POST | `/sender/external-proof-tokens/{token_id}/revoke` | `revoke_external_proof_token` | API key (user-linked) | any scope (user/admin/support/advisor) | 401/403/404 |

---

## 7) Mismatch risks & audit notes

### Confirmed risk addressed
- **Scopes are technical gates, not authorization**: `/auth/login` and `/auth/me` expose `scopes`, but service-layer authorization is relational (escrow sender/provider relationships, beneficiary ownership, advisor assignment). UI routing must not treat scopes as sufficient for business authorization.

### Additional potential mismatch vectors (observed)
- **Admin scope bypass vs. relational checks**: `require_scope` allows `admin` to pass scope guards, but service-layer checks can still reject actions that require a participant relationship (e.g., escrow creation requires a non-ops user; escrow sender actions require `escrow.sender_user_id == viewer_user_id`).
- **Advisor scope isolation**: advisor endpoints use `require_advisor_scope` (no admin bypass), and advisors are read-only for proof decisions.
- **User scope breadth**: most client endpoints accept any user-linked API key, but access is still constrained by escrow/beneficiary relationships and RAL checks.

---

## 8) Automated verification added

A test module validates:
- Demo admin/user login and `/auth/me` response includes role + non-empty scopes.
- Admin users cannot initiate escrows (non-ops guard) and sender users cannot access admin-only endpoints (403).
- Missing token yields 401 on a protected endpoint.

**Location:** `tests/test_authz_scopes_contract.py`

---

## 9) Final conclusion

**Current contract:** `/auth/login` and `/auth/me` expose explicit scopes (derived from `scopes_for_user`) plus optional capabilities, while **authorization is enforced by relational ABAC checks** in services and the RAL.

**Result:** Backend auth remains scope-aware but relationship-driven, reducing ambiguity while preventing the frontend from mistaking scopes for business authorization.

---

## Change log

### Substitutions
- **BEFORE:** `UserRole` table referenced legacy sender/provider/both labels; scopes mapped to `sender/provider`.  
  **AFTER:** `UserRole` is `user/admin/support/advisor`, and `scopes_for_user` yields `user/admin/support/advisor` scopes only.  
  **Reason:** The codebase now derives scopes from staff roles and defaults non-staff to `user`.  
  **Backend source:** `app/models/user.py`, `app/security/roles.py`.
- **BEFORE:** `/auth/me` guarded by `require_scope({sender, provider, admin, advisor})`.  
  **AFTER:** `/auth/me` uses `require_authenticated_user` (user-linked API key) and returns `AuthUser.scopes` + optional `capabilities`.  
  **Reason:** `/auth/me` no longer uses scope gating; it relies on a linked user.  
  **Backend source:** `app/routers/auth.py`, `app/schemas/auth.py`.
- **BEFORE:** External proof token documented as a query parameter.  
  **AFTER:** External proof tokens are extracted from `Authorization: Bearer` or `X-External-Token`.  
  **Reason:** Token extraction uses header-based helpers.  
  **Backend source:** `app/security/external_tokens.py`.

### Additions
- Added inventory rows for `/payments/{payment_id}`, `/provider/inbox/escrows`, `/sender/escrows/*`, `/sender/payments/*`, `/sender/external-proof-tokens/*`, `/admin/risk/fe3-mode`, `/admin/spend/allowed`, `/pricing/reference`, `/pricing/inflation`, `/merchants/registry`, and `/merchants/observed`.
