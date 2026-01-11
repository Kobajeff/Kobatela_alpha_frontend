# Merchant Registry Endpoints

This document reflects the current Merchant Registry endpoints and schemas in the backend.

## Endpoints

### POST /merchants/registry
- **Purpose:** Create a merchant registry entry.
- **Auth:** API key scope `admin` or `support`.
- **Request schema:** `MerchantRegistryCreate`
  - **Required fields:**
    - `name` (string, 2–255)
    - `country_code` (string, ISO-3166-1 alpha-2 uppercase)
    - `description` (string, 20–2000)
    - `iban` (string, 15–34, A–Z0–9)
    - `category` (string, max 128)
    - `vat_number` (string, max 128; accepts alias `tax_id`)
    - `contact.phone` (string, 4–64)
    - `address.line1` (string, 2–255)
    - `address.city` (string, 2–255)
  - **Optional fields:**
    - `website_url` (http/https URL, max 512)
    - `contact.email` (email)
    - `address.line2` (string, max 255)
    - `metadata_json` (object)
- **Response schema:** `MerchantRegistryRead`

### GET /merchants/registry
- **Purpose:** List merchant registry entries.
- **Auth:** Authenticated user API key.
- **Request schema:** none (query params `country_code`, `q`, pagination).
- **Response schema:** `PaginatedResponse[MerchantRegistryListItemRead]`

### GET /merchants/registry/{registry_id}
- **Purpose:** Read a merchant registry entry.
- **Auth:** Authenticated user API key.
- **Request schema:** none.
- **Response schema:** `MerchantRegistryRead`
