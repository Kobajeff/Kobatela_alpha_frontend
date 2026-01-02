# AUTHZ INVENTORY REPORT — Demo Users, `/auth/me`, and Portal Scopes

**Repo:** `kobatela_alpha` (FastAPI backend)  
**Scope:** Token issuance/parsing, `/auth/me`, scope normalization, route guards, demo bootstrap, and endpoint policy inventory.  
**Goal:** Diagnose possible backend causes of frontend “Portée insuffisante” (“insufficient scope”) or redirect issues.

---

## 0) Executive summary

**Finding:** A concrete contract mismatch existed: `/auth/me` returned only `user` fields without any explicit scope list, even though scope-based UI routing is implied elsewhere. This made it easy for the frontend to mis-infer available scopes, leading to “insufficient scope” UI behavior.  
**Resolution:** Added an explicit `user.scopes` list in `AuthUser` (same payload used by `/auth/login` and `/auth/me`), derived from the authoritative role-to-scope mapping used by the backend. This is additive and keeps existing fields intact.

**Conclusion:** Backend **was missing explicit scope visibility in `/auth/me`**. With the new `user.scopes` field, the contract is now consistent and testable.  
**Status:** **Backend defect found & patched** (minimal additive fix + tests).

---

## 1) Token types & parsing/validation

### Supported token types
| Token type | How it is used | Notes | Evidence |
| --- | --- | --- | --- |
| **API key** | Sent as `Authorization: Bearer <token>` or `X-API-Key: <token>` | Both headers accepted; `X-API-Key` takes precedence | `app/security/__init__.py` (`_extract_key`) |
| **Legacy dev key** | `DEV_API_KEY` in config, if enabled | Special-case fallback used only when `DEV_API_KEY_ALLOWED` | `app/security/__init__.py`, `app/utils/apikey.py` |
| **External proof token** | `token=<...>` query param for `/external/*` endpoints | Not a user API key; scoped to external proof flows | `app/routers/external_proofs.py` |

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
| `UserRole` | `sender`, `provider`, `both`, `admin`, `support`, `advisor` | Stored as lower-case string enum | `app/models/user.py` |

### Scopes
| Enum | Values | Normalization | Evidence |
| --- | --- | --- | --- |
| `ApiScope` | `sender`, `provider`, `support`, `admin`, `advisor`, `pricing_admin`, `risk_admin` | Enum defines uppercase canonical names + lower-case aliases | `app/models/api_key.py` |

### Effective scopes (definition)
**Effective scopes** are derived from the user’s global role using the backend’s role-to-scope mapping.  
A user’s effective scopes = `scopes_for_user_role(user.role)`.

Key characteristics:
- **Admin** → `admin`
- **Support** → `support`
- **Advisor** → `advisor`
- **Client roles** (`sender`, `provider`, `both`) → `sender` (plus `provider` if role is provider/both)

This matches the issuance logic used by `/auth/login` and admin key creation.

---

## 3) `/auth/login` analysis

- **Endpoint:** `POST /auth/login`
- **Input:** `AuthLoginRequest` (`email`, optional `scope`)
- **Behavior:**
  - Loads user by email; requires `user.is_active`.
  - Derives allowed scopes from role.
  - If `payload.scope` is present and not allowed → `403 INSUFFICIENT_SCOPE`.
  - Issues/rotates API key for selected scope; creates keys for other scopes for the same user.
- **Response:** `AuthLoginResponse` with `access_token`, `token`, `token_type=api_key`, and `user`.

**Important:** login tokens are **API keys**, not JWTs.

---

## 4) `/auth/me` analysis (scope and payload)

- **Endpoint:** `GET /auth/me`
- **Auth required:** `require_scope({sender, provider, admin, advisor})`
- **Behavior:** returns the `User` linked to the API key; otherwise `404 USER_NOT_FOUND`.

**Defect fixed:** `AuthUser` now includes `scopes`, exposing the same effective scopes derived from role. This makes `/auth/me` and `/auth/login` consistent and avoids ambiguity for frontend role/scope routing.

### Expected `/auth/me` schema (current)
```json
{
  "user": {
    "id": 123,
    "email": "admin.demo@kobatela.dev",
    "username": "admin-demo",
    "role": "admin",
    "payout_channel": "stripe_connect",
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
    "role": "sender",
    "payout_channel": "stripe_connect",
    "scopes": ["sender"]
  }
}
```

**Provider demo**: no dedicated provider demo user is seeded by default (see bootstrap section below).

---

## 5) Demo bootstrap / seeding analysis

**Script:** `scripts/bootstrap_admin_and_sender.py`  
Creates/ensures:
- **Admin console key**: `name=admin-console`, scope `admin`, **no user** attached.
- **Admin demo user**: `admin.demo@kobatela.dev`, role `admin`, active.
- **Sender demo user**: `sender.demo@kobatela.dev`, role `sender`, active.
- **Sender demo API key**: `name=sender-demo-apikey`, scope `sender`.
- **Admin user API key**: `name=admin-ui-<user_id>`, scope `admin`.

No provider demo user is seeded by this script.

---

## 6) Endpoint policy inventory (auth + scopes)

**Auth mechanism:** API key (Bearer or X-API-Key) unless noted.  
**Failure codes for auth mismatches:**
- **401** `NO_API_KEY` or `UNAUTHORIZED` (missing/invalid key)
- **403** `INSUFFICIENT_SCOPE` (scope not allowed)
- **404** `USER_NOT_FOUND` for user-linked endpoints that cannot resolve a user

### `/auth` (app/routers/auth.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/auth/login` | `login` | None | N/A | 401 invalid credentials; 403 insufficient scope |
| GET | `/auth/me` | `auth_me` | API key | sender/provider/admin/advisor | 401/403/404 for user missing |

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
| POST | `/admin/pricing/reference/import-csv` | `import_price_reference` | API key | pricing_admin/risk_admin | 401/403/400 |

### `/admin` (app/routers/admin_pricing_inflation.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/admin/pricing/inflation/upload-csv` | `upload_inflation_csv` | API key | pricing_admin/risk_admin | 401/403/400 |
| GET | `/admin/pricing/inflation` | `list_inflation_adjustments` | API key | pricing_admin/risk_admin | 401/403 |
| POST | `/admin/pricing/inflation` | `create_inflation_adjustment` | API key | pricing_admin/risk_admin | 401/403/400 |
| PUT | `/admin/pricing/inflation/{adjustment_id}` | `update_inflation_adjustment` | API key | pricing_admin/risk_admin | 401/403/400/404 |
| DELETE | `/admin/pricing/inflation/{adjustment_id}` | `delete_inflation_adjustment` | API key | pricing_admin/risk_admin | 401/403/404 |

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
| GET | `/me/advisor` | `get_my_advisor` | API key | sender | 401/403/503 |
| POST | `/proofs/{proof_id}/request_advisor_review` | `request_advisor_review` | API key | sender | 401/403/404/409 |
| GET | `/advisor/me/profile` | `get_advisor_profile` | API key | advisor (advisor-only) | 401/403 |
| GET | `/advisor/me/proofs` | `list_assigned_proofs` | API key | advisor (advisor-only) | 401/403 |
| POST | `/advisor/proofs/{proof_id}/approve` | `advisor_approve_proof` | API key | advisor (advisor-only) | 401/403 (always 403) |
| POST | `/advisor/proofs/{proof_id}/reject` | `advisor_reject_proof` | API key | advisor (advisor-only) | 401/403 (always 403) |

### `/beneficiaries` (app/routers/beneficiaries.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/beneficiaries` | `create_beneficiary` | API key | sender | 401/403 |
| GET | `/beneficiaries/{beneficiary_id}` | `read_beneficiary` | API key | sender/provider/support/admin/advisor | 401/403/404 |

### `/debug/stripe` (app/routers/debug_stripe.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| GET | `/debug/stripe/account/{user_id}` | `debug_stripe_account` | API key | admin/support | 401/403 |

### `/escrows` (app/routers/escrow.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| GET | `/escrows` | `list_escrows` | API key | sender/provider/support | 401/403 |
| POST | `/escrows` | `create_escrow` | API key | sender (admin bypass at auth, but role-gated in service) | 401/403 |
| POST | `/escrows/{escrow_id}/deposit` | `deposit` | API key | sender | 401/403 |
| POST | `/escrows/{escrow_id}/funding-session` | `create_funding_session` | API key | sender/admin | 401/403 |
| POST | `/escrows/{escrow_id}/mark-delivered` | `mark_delivered` | API key | sender | 401/403 |
| POST | `/escrows/{escrow_id}/client-approve` | `client_approve` | API key | sender | 401/403 |
| POST | `/escrows/{escrow_id}/client-reject` | `client_reject` | API key | sender | 401/403 |
| POST | `/escrows/{escrow_id}/check-deadline` | `check_deadline` | API key | sender | 401/403 |
| GET | `/escrows/{escrow_id}` | `get_escrow` | API key | sender/provider/support/admin | 401/403/404 |
| GET | `/escrows/{escrow_id}/summary` | `get_escrow_summary` | API key | sender/provider | 401/403/404 |
| POST | `/escrows/{escrow_id}/milestones` | `create_milestone` | API key | admin/support/sender | 401/403/404 |
| GET | `/escrows/{escrow_id}/milestones` | `list_milestones` | API key | sender/provider/admin/support | 401/403/404 |
| GET | `/escrows/milestones/{milestone_id}` | `get_milestone` | API key | sender/provider/admin | 401/403/404 |

### `/external` (app/routers/external_proofs.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/external/proofs/tokens` | `issue_external_proof_token` | API key | sender/support/admin | 401/403 |
| POST | `/external/tokens/beneficiary` | `issue_external_beneficiary_token` | API key | sender/support/admin | 401/403 |
| POST | `/external/files/proofs` | `upload_external_proof_file` | External token | token only | 401/403/422 |
| POST | `/external/proofs/submit` | `submit_external_proof` | External token | token only | 401/403/422 |
| GET | `/external/escrows/{escrow_id}` | `get_external_escrow_summary` | External token | token only | 401/403/404 |

### `/health` (app/routers/health.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| GET | `/health` | `healthcheck` | None | N/A | 200/503 (DB) |

### `/kct_public` (app/routers/kct_public.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/kct_public/projects` | `create_project` | API key + GOV/ONG user | sender/admin + public-tag guard | 401/403 |
| POST | `/kct_public/projects/{project_id}/managers` | `add_project_manager` | API key + GOV/ONG user | sender/admin + public-tag guard | 401/403 |
| POST | `/kct_public/projects/{project_id}/mandates` | `attach_project_mandate` | API key + GOV/ONG user | sender/admin + public-tag guard | 401/403 |
| GET | `/kct_public/projects/{project_id}` | `get_project_view` | API key + GOV/ONG user | sender/admin + public-tag guard | 401/403/404 |
| GET | `/kct_public/projects` | `list_projects` | API key + GOV/ONG user | sender/admin + public-tag guard | 401/403 |

### `/mandates` (app/routers/mandates.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/mandates` | `create_mandate` | API key | sender | 401/403 |
| GET | `/mandates` | `list_mandates` | API key | sender/provider/support/admin | 401/403 |
| GET | `/mandates/{mandate_id}` | `get_mandate` | API key | sender/provider/support/admin | 401/403/404 |
| POST | `/mandates/cleanup` | `cleanup_expired_mandates` | API key | sender | 401/403 |

### `/merchant-suggestions` (app/routers/merchant_suggestions.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/merchant-suggestions` | `create_suggestion` | API key | sender | 401/403 |
| GET | `/merchant-suggestions` | `list_suggestions` | API key | sender | 401/403 |
| GET | `/merchant-suggestions/{suggestion_id}` | `get_suggestion` | API key | sender | 401/403/404 |

### `/payments` + `/admin/payments` (app/routers/payments.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/payments/execute/{payment_id}` | `execute_payment` | API key | admin/support | 401/403/404 |
| GET | `/admin/payments` | `list_admin_payments` | API key | admin/support | 401/403 |

### `/proofs` (app/routers/proofs.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/proofs` | `submit_proof` | API key | sender/provider/support/admin | 401/403 |
| GET | `/proofs` | `list_proofs` | API key | sender/provider/support/admin/advisor | 401/403 |
| GET | `/proofs/{proof_id}` | `get_proof` | API key | sender/provider/support/admin/advisor | 401/403/404 |
| POST | `/proofs/{proof_id}/decision` | `decide_proof` | API key | sender/support/admin | 401/403/404 |

### `/psp` (app/routers/psp.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/psp/webhook` | `psp_webhook` | None | N/A | 400/500 on signature or processing errors |
| POST | `/psp/stripe/webhook` | `stripe_webhook` | None | N/A | 400/500 on signature or processing errors |

### `/sender` (app/routers/sender_dashboard.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| GET | `/sender/dashboard` | `get_sender_dashboard` | API key | sender | 401/403/404 |

### `/spend` (app/routers/spend.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/spend/categories` | `create_category` | API key | admin/support | 401/403 |
| POST | `/spend/merchants` | `create_merchant` | API key | admin/support | 401/403 |
| POST | `/spend/allow` | `allow_usage` | API key | admin/support | 401/403 |
| POST | `/spend/purchases` | `create_purchase` | API key | sender/admin | 401/403 |
| POST | `/spend/allowed` | `add_allowed_payee` | API key | admin/support | 401/403 |
| POST | `/spend` | `spend` | API key | sender/admin | 401/403 |

### `/transactions` (app/routers/transactions.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/allowlist` | `add_to_allowlist` | API key | admin | 401/403 |
| POST | `/certified` | `add_certification` | API key | admin | 401/403 |
| POST | `/transactions` | `post_transaction` | API key | admin | 401/403 |
| GET | `/transactions/{transaction_id}` | `get_transaction` | API key | admin | 401/403/404 |

### `/uploads` (app/routers/uploads.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/files/proofs` | `upload_proof_file` | API key | sender/provider/support/admin | 401/403/422 |
| GET | `/files/signed/{token}` | `download_signed_proof` | Signed token | token only | 403/404/410 |

### `/user_profiles` (app/routers/user_profiles.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| GET | `/me/profile` | `get_my_profile` | API key | sender/provider/admin/support | 401/403/404 |
| PATCH | `/me/profile` | `patch_my_profile` | API key | sender/provider/admin/support | 401/403/404 |

### `/users` (app/routers/users.py)
| Method | Path | Handler | Auth | Scopes | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| POST | `/users` | `create_user` | API key | admin/support | 401/403 |
| POST | `/users/{user_id}/psp/stripe/account-link` | `create_stripe_account_link_for_user` | API key | admin | 401/403 |
| POST | `/users/{user_id}/stripe/sync` | `sync_user_stripe_account` | API key | admin/support | 401/403 |

---

## 7) Mismatch risks & audit notes

### Confirmed risk addressed
- **Missing scopes in `/auth/me`**: Previously, `/auth/me` returned only `user` with role and payout_channel, but no explicit scope list. This made client-side scope logic ambiguous and could surface as “insufficient scope” in the UI.  
  ✅ Fixed by exposing `user.scopes` derived from the authoritative role-to-scope mapping.

### Additional potential mismatch vectors (observed)
- **Admin scope bypass vs. contextual role checks**: `require_scope` allows `admin` to bypass, but service-layer checks can still reject non-sender roles (e.g., escrow creation). This is correct but can appear as “insufficient scope” if the UI assumes admin implies sender.
- **Advisor scope**: `/auth/me` accepts advisor scope (in addition to sender/provider/admin), while advisor actions still use dedicated `/advisor/*` endpoints.

---

## 8) Automated verification added

A new test module validates:
- Demo admin/sender login and `/auth/me` response includes role + non-empty scopes.
- Admin cannot access sender-only endpoint and sender cannot access admin-only endpoint (403).
- Missing token yields 401 on a protected endpoint.

**Location:** `tests/test_authz_scopes_contract.py`

---

## 9) Final conclusion

**Backend defect found:** lack of explicit scope information in `/auth/me` (and `/auth/login` user payload), which is now fixed with an additive `user.scopes` field derived from the same role-to-scope mapping used for issuance and enforcement.

**Result:** Backend auth/scopes are now inspectable and test-covered, reducing the chance of “Portée insuffisante” UI failures caused by ambiguous scope data.

---

## Change log

### Substitutions
- **BEFORE:** `/auth/me` auth required `require_scope({sender, provider, admin})` (scopes row listed `sender/provider/admin`).  
  **AFTER:** `/auth/me` auth required `require_scope({sender, provider, admin, advisor})` (scopes row lists `sender/provider/admin/advisor`).  
  **Reason:** FastAPI route now permits advisor scope in `require_scope`.  
  **Backend source:** `app/routers/auth.py` (`require_scope({ApiScope.sender, ApiScope.provider, ApiScope.admin, ApiScope.advisor})`).
- **BEFORE:** Additional mismatch note said `/auth/me` only accepts sender/provider/admin.  
  **AFTER:** Note reflects advisor is accepted and advisor actions remain on `/advisor/*`.  
  **Reason:** Align with current guard behavior.  
  **Backend source:** `app/routers/auth.py` (`require_scope` set includes advisor).

### Additions
- Added admin escrow summary endpoint row for `/admin/escrows/{escrow_id}/summary` (scopes admin/support).  
  **Reason:** Endpoint exists with admin/support guard and was missing from inventory.  
  **Backend source:** `app/routers/admin_escrows.py` (`require_scope({ApiScope.admin, ApiScope.support})`).
