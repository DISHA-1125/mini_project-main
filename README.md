# FindIt — Real-Time Lost & Found Platform

A modern lost & found platform with **live location tracking**, **Socket.io real-time updates**, **three secure dashboards**, and **OTP/QR handover verification**.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS 4 (beacon/radar theme) |
| Database | Prisma + SQLite |
| Real-time | Socket.io |
| Maps | MapLibre GL + OpenStreetMap |
| Auth | JWT (httpOnly cookies) |

## Three Dashboards

1. **User/Finder** — Report lost/found items, live map, chat with matches, manage listings
2. **Admin/Authority** — Monitor all listings, verify claims, handle flagged items, analytics
3. **Security/Campus Guard** — Log handovers, verify collection via OTP & QR codes

## Setup

1. Copy environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Push database schema and seed demo data:
   ```bash
   npm run db:push
   npm run db:seed
   ```

4. Start the dev server (includes Socket.io):
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Demo Accounts

Password for all: `password123`

| Role | Email |
| --- | --- |
| User | user@findit.com |
| Admin | admin@findit.com |
| Security | security@findit.com |

## Project Structure

```
app/
  page.tsx                    # Landing page
  login/ register/            # Auth pages
  dashboard/user/             # Finder dashboard
  dashboard/admin/            # Admin dashboard
  dashboard/security/         # Security dashboard
  api/                        # REST API routes
components/
  map/live-map.tsx            # MapLibre live map
  items/report-item-modal.tsx
  layout/dashboard-shell.tsx
  ui/                         # shadcn-style components
hooks/use-realtime.ts         # Socket.io hooks
lib/
  auth.ts prisma.ts geo.ts    # Core utilities
  socket-server.ts            # Socket.io server
prisma/schema.prisma          # Database schema
server.ts                     # Custom Next.js + Socket.io server
```
