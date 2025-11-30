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
