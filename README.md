# Network Traffic Dashboard — Frontend

A React dashboard for the [Network Traffic Monitoring & Anomaly Dashboard](https://github.com/ty-dwyer/network_traffic) backend — visualizes ingested packet data, shows live alerts as they happen, and lets users upload `.pcap` files for analysis directly from the browser.

## Features

- **Live dashboard** — protocol breakdown and per-device traffic charts, updating in real time as new packets are ingested
- **Live alert feed** — new anomaly alerts (new devices, unusual ports) appear instantly via WebSocket, with a notification bell showing a live breakdown by alert type
- **File upload** — upload a `.pcap` file directly from the browser to be parsed and analyzed by the backend
- **Authentication** — login-gated access; JWT persisted across page refreshes

## Tech Stack

- React 19 + Vite
- React Router
- Recharts (charts)
- @stomp/stompjs + sockjs-client (WebSocket/STOMP)

## Architecture

```
App.jsx
 ├─ holds auth token (localStorage), packets, and alerts state
 ├─ fetches /packets once authenticated
 ├─ subscribes to /topic/packets and /topic/alerts over WebSocket
 │
 ├─ (not authenticated) → Login.jsx
 │
 └─ (authenticated) → Layout.jsx
                        ├─ navbar: title, AlertBell, logout
                        └─ Outlet →
                              ├─ Dashboard.jsx  (charts, stats, file upload)
                              └─ Alerts.jsx     (full alert history table)
```

State (packets, alerts, auth token) lives in `App.jsx` and is passed down to pages/components as props — there is no separate state management library, given the app's current size.

## Setup

### Prerequisites
- Node.js
- The backend running at `http://localhost:8080` (see the [backend repo](../network_traffic))

### Install and run
```bash
npm install
npm run dev
```
Opens at `http://localhost:5173`.

### Login
Register a user against the backend first (see backend README), then log in with those credentials on the dashboard's login page.

## Notable Design Decisions

- **JWT stored in `localStorage`** — chosen for convenience during development so login persists across refreshes; a stricter security posture would keep the token in memory only, at the cost of losing the session on every page reload.
- **No global state library (Redux/Zustand/etc.)** — the app's state is small enough that lifting state to `App.jsx` and passing it down via props is sufficient; would reconsider if the app grew significantly.
- **Two WebSocket subscriptions (`/topic/packets`, `/topic/alerts`)** — packets are appended in arrival order (matches the historical fetch order), while alerts are prepended (newest-first), matching how each is naturally consumed.

## Known Limitations

- No route protection beyond the top-level login gate — all authenticated routes are currently equally accessible once logged in.
- The dashboard currently only reconnects to the WebSocket on token change; a lost connection (e.g. backend restart) is not automatically retried.
