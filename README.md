# Kobatela_alpha_frontend

Frontend for the Kobatela Conditional Transfer (KCT) MVP
Built with Next.js, TypeScript, React Query, TailwindCSS, Axios

This repository contains the frontend application for the Kobatela MVP.
It includes sender and admin portals, authentication flows, conditional transfer management, proof submission, and real-time status updates.

🚀 Features
🔐 Authentication

Token-based login

Global authentication state

Role-based access (sender/admin)

Protected layouts

Automatic redirects

Logout with cache clearing

📡 API Client (Axios)

Centralized API client

Configurable base URL

Error extraction helpers

React Query integration

🎛 Application Structure

App Router structure (src/app/...)

Sender dashboard and escrow management

Admin dashboard, escrow review, and proof validation

Dynamic routes for escrow details

Reusable components (layout, header, forms)

💬 UX Enhancements

Global loading states

Global error states

Tailwind UI

Clean error messaging (extractErrorMessage)


## API Base URL

The frontend reads the backend URL from the environment variable:

```
NEXT_PUBLIC_API_BASE_URL=<URL>
```

Examples:

Local development:
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Production:
```
NEXT_PUBLIC_API_BASE_URL=https://app.kobatela.com
```

## Demo mode

You can run the app with static mock data instead of the real backend by enabling demo mode.

Normal mode:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_DEMO_MODE=false
```

Demo mode:

```
NEXT_PUBLIC_DEMO_MODE=true
# API base URL can be left as default or set, but it won't be used
```

When demo mode is on:

- No real API calls are made for the main flows.
- Sample data lives in `src/lib/demoData.ts`.
- You can switch between demo sender and demo admin views from the header.

## Testing the local connection (Frontend ↔ Backend)

Follow these steps to run the frontend against a locally running FastAPI backend.

### 1. Prerequisites

- FastAPI backend started on `http://127.0.0.1:8000`.
- Backend bootstrapped with test users and API keys by running:
  ```bash
  python -m scripts.bootstrap_admin_and_sender
  ```
  This script creates:
  - Test sender user: `sender+concierge@kobatela.dev` (API key shown once in terminal).
  - Test admin user: `admin+console@kobatela.dev` (API key shown once in terminal).

### 2. Frontend configuration

Create a `.env.local` file at the project root with:

```
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
NEXT_PUBLIC_DEMO_MODE=false
```

### 3. Launch the frontend

```
npm install
npm run dev
```

### 4. Log in as a sender

1. Open `http://localhost:3000/login`.
2. Enter the sender email address: `sender+concierge@kobatela.dev`or 'sender.demo@kobatela.dev' .
3. The backend returns a token (API key) that is automatically stored in `localStorage`.
4. You will be redirected to `/sender/dashboard`.

### 5. Log in as admin

1. Open `http://localhost:3000/login`.
2. Enter the admin email address: `admin+console@kobatela.dev` or 'admin.demo@kobatela.dev'.
3. You will be redirected to `/admin/dashboard` where you can access the back-office tools.

### 6. Resolving connection errors (Current debug)

- `401` on `/auth/me` → the local token is invalid: reconnect.
- Email rejected → verify the backend was bootstrapped properly.
- Backend not accessible → confirm `NEXT_PUBLIC_API_BASE_URL` is correct.
- Redirection loop → clear `localStorage` then reload.
