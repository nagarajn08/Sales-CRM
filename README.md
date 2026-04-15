# SalesCRM — Full-Stack Sales Pipeline Management

A multi-tenant SaaS CRM built with **FastAPI** (Python) and **React 19** (TypeScript). Designed for sales teams to manage leads, follow-ups, and conversion pipelines with real-time notifications and social media campaign integrations.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Getting Started](#getting-started)
4. [Project Structure](#project-structure)
5. [Configuration](#configuration)
6. [User Roles & Permissions](#user-roles--permissions)
7. [Features](#features)
8. [API Reference](#api-reference)
9. [Data Models](#data-models)
10. [Lead Workflow](#lead-workflow)
11. [Webhook Integration](#webhook-integration)
12. [Notifications](#notifications)
13. [OTP Verification](#otp-verification)
14. [Multi-Tenancy](#multi-tenancy)
15. [Deployment](#deployment)

---

## Overview

SalesCRM is a full-stack, multi-tenant CRM platform that lets sales organisations:

- Track leads from creation through conversion
- Schedule and receive follow-up reminders (minutes before due)
- Import leads from CSV/Excel or receive them automatically via webhooks from Meta, LinkedIn, Google Ads, or any custom source
- Manage teams with role-based access control
- Monitor performance via a rich admin dashboard

Every organisation is fully isolated — users in Organisation A cannot see data from Organisation B.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI 0.115, Python 3.11+ |
| Database | SQLite (dev) / PostgreSQL (prod) |
| ORM | SQLAlchemy 2.0 |
| Auth | JWT (access token) + HTTP-only cookie (refresh token) |
| Scheduler | APScheduler (follow-up reminders, every 1 min) |
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS v3, custom CSS variables |
| HTTP Client | Axios with JWT interceptor |
| Routing | React Router v7 |

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Git

### 1 — Clone the repo

```bash
git clone <repo-url>
cd sales-crm
```

### 2 — Backend setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\Activate.ps1

# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env (copy the example and edit)
cp .env.example .env
```

Edit `backend/.env`:

```env
DATABASE_URL=sqlite:///./salescrm.db
SECRET_KEY=your-secret-key-here
FRONTEND_URL=http://localhost:5173
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7
ADMIN_EMAIL=admin@salescrm.com
ADMIN_PASSWORD=Admin@123
ADMIN_NAME=Administrator

# Optional — SMTP for email OTPs and lead emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=you@gmail.com
```

Start the backend:

```bash
uvicorn app.main:app --reload
```

API available at **http://localhost:8000**
Interactive docs at **http://localhost:8000/docs**

### 3 — Frontend setup

```bash
cd frontend
npm install
npm run dev
```

App available at **http://localhost:5173**

### 4 — Default super-admin login

| Field | Value |
|---|---|
| Email | `admin@salescrm.com` |
| Password | `Admin@123` |

> The super-admin account is created automatically on first startup. Change the password immediately after first login.

---

## Project Structure

```
sales-crm/
├── backend/
│   ├── app/
│   │   ├── main.py              # App entry point, startup, migrations, seed
│   │   ├── config.py            # Pydantic settings (reads .env)
│   │   ├── database.py          # SQLAlchemy engine + session
│   │   ├── dependencies.py      # Auth guards (get_current_user, require_admin…)
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── organization.py
│   │   │   ├── lead.py
│   │   │   ├── lead_activity.py
│   │   │   ├── notification.py
│   │   │   ├── email_template.py
│   │   │   ├── app_settings.py
│   │   │   └── otp.py
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── leads.py
│   │   │   ├── dashboard.py
│   │   │   ├── templates.py
│   │   │   ├── notifications.py
│   │   │   ├── settings.py
│   │   │   ├── webhook.py
│   │   │   └── superadmin.py
│   │   ├── schemas/
│   │   │   ├── auth.py
│   │   │   ├── user.py
│   │   │   ├── lead.py
│   │   │   ├── dashboard.py
│   │   │   └── template.py
│   │   └── services/
│   │       ├── auth_service.py          # JWT creation, bcrypt hashing
│   │       ├── notification_service.py  # Follow-up reminder logic
│   │       └── otp_service.py           # OTP generation, SMTP sending
│   ├── requirements.txt
│   ├── .env
│   └── Dockerfile
│
└── frontend/
    └── src/
        ├── api/
        │   ├── axiosInstance.ts  # Axios with auto token refresh interceptor
        │   └── index.ts          # All API functions
        ├── auth/
        │   ├── AuthContext.tsx   # Global auth state
        │   └── ProtectedRoute.tsx
        ├── components/
        │   ├── layout/           # AppLayout, Sidebar, Topbar, NotificationPanel
        │   ├── leads/            # StatusModal, CommentModal, LeadFormModal…
        │   └── ui/               # Button, Input, Modal, Badge, DateTimePicker…
        ├── lib/
        │   └── utils.ts          # cn(), fmtDate(), fmtDateTime() — IST helpers
        ├── pages/
        │   ├── DashboardPage.tsx
        │   ├── LeadsPage.tsx
        │   ├── LeadDetailPage.tsx
        │   ├── UsersPage.tsx
        │   ├── TemplatesPage.tsx
        │   ├── SettingsPage.tsx
        │   ├── SignupPage.tsx
        │   ├── LoginPage.tsx
        │   └── SuperAdminPage.tsx
        └── types/index.ts        # All TypeScript interfaces
```

---

## Configuration

All backend configuration is via environment variables in `backend/.env`.

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./salescrm.db` | Database connection string |
| `SECRET_KEY` | (random) | JWT signing secret — **change in production** |
| `FRONTEND_URL` | `http://localhost:5173` | CORS allowed origin |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token lifetime |
| `ADMIN_EMAIL` | `admin@salescrm.com` | Platform super-admin email |
| `ADMIN_PASSWORD` | `Admin@123` | Platform super-admin initial password |
| `ADMIN_NAME` | `Administrator` | Platform super-admin display name |
| `SMTP_HOST` | — | SMTP server hostname |
| `SMTP_PORT` | `587` | SMTP server port |
| `SMTP_USER` | — | SMTP login username |
| `SMTP_PASS` | — | SMTP login password |
| `SMTP_FROM` | `SMTP_USER` | From address for outgoing emails |

> If `SMTP_HOST` / `SMTP_USER` are not set the app runs in **dev mode** — OTP codes are returned directly in the API response and displayed on screen instead of being emailed.

---

## User Roles & Permissions

| Permission | User | Manager | Admin | SuperAdmin |
|---|:---:|:---:|:---:|:---:|
| View own leads | ✅ | ✅ | ✅ | — |
| View all org leads | — | ✅ | ✅ | — |
| Create / edit leads | ✅ | ✅ | ✅ | — |
| Delete leads | — | — | ✅ | — |
| Reassign leads | — | ✅ | ✅ | — |
| Manage users | — | — | ✅ | — |
| Edit org settings | — | — | ✅ | — |
| View all organisations | — | — | — | ✅ |
| Enable / disable orgs | — | — | — | ✅ |
| Platform-wide stats | — | — | — | ✅ |

---

## Features

### Dashboard

The admin dashboard provides a full operational view:

**Today's Pulse** (top row)
- New leads added today (+ this week sub-line)
- Leads converted today (+ this week sub-line)
- Follow-ups completed today (status update count)
- Total activities today (comments, calls, emails)

**Pipeline Health** (second row)
- Total leads / active count
- Follow-ups due today
- Overdue follow-ups
- Not-interested count today

**Charts & Breakdowns** (three cards side by side)
- Today's leads by source — mini bar chart per source
- Active pipeline status breakdown — bar chart per status
- All-time lead source mix — percentage share + count

**Follow-up Queue**
- Overdue + today's follow-ups, soonest first
- Red highlight for overdue, IST timestamps
- One-click navigation to the lead

**Team Performance** *(Admin / Manager only)*
- Per-member table with columns: Total, New, Call Back, Interested CB, Converted, Overdue

---

### Lead Management

#### Lead Fields

| Field | Type | Description |
|---|---|---|
| Web ID | Auto | Auto-generated (e.g. `WEB-0001`) |
| Name | Required | Lead's full name |
| Mobile | Optional | Primary contact number |
| WhatsApp | Optional | WhatsApp number if different |
| Email | Optional | Email address |
| Company | Optional | Company or organisation name |
| Notes | Optional | Free-text notes |
| Status | Enum | See workflow below |
| Priority | Enum | Hot / Warm / Cold |
| Source | Enum | Where the lead came from |
| Campaign Name | Auto | Social media campaign name (set by webhook) |
| Assigned To | FK | Team member responsible |
| Follow-up At | DateTime | Next scheduled follow-up (stored UTC, displayed IST) |
| Last Comment | Text | Most recent comment (denormalised for fast list loading) |

#### Lead Statuses

| Status | Colour | Follow-up Required |
|---|---|---|
| New | Blue | No |
| Call Back | Yellow | Yes |
| Interested - Call Back | Teal | Yes |
| Busy | Orange | Yes |
| Not Reachable | Grey | Yes |
| Not Interested | Red | No (terminal) |
| Converted | Green | No (terminal) |

#### Lead Sources

Manual, Import, Website, Reference, Cold Call, Facebook, Instagram, LinkedIn, Google Ads, Other.

#### Lead Actions

| Action | Who | Description |
|---|---|---|
| Update Status | All | Change status + optional follow-up date + comment |
| Add Comment | All | Attach a note; updates `last_comment` immediately |
| Reassign | Admin / Manager | Move to another team member |
| Send Email | All | Send email using a saved template |
| Edit | All | Update any lead field |
| Delete | Admin | Soft delete |
| Import | All | Bulk create from CSV / Excel |

#### Activity Timeline

Every action is logged and displayed newest-first:

| Type | Icon | Notes |
|---|---|---|
| Created | ✨ | Lead first added |
| Status Changed | 🔄 | Shows old → new status |
| Comment | 💬 | Comment text |
| Reassigned | 👤 | New assignee shown |
| Follow-up Set | 📅 | New follow-up datetime |
| Email Sent | ✉️ | Subject logged |
| Imported | 📤 | Via CSV/Excel import |

---

### Follow-up System

Follow-ups are required when status is set to **Call Back**, **Interested - Call Back**, **Busy**, or **Not Reachable**.

The scheduler runs every **1 minute**. A reminder notification is generated **15 minutes before** the follow-up time.

To change the lead time edit `REMIND_BEFORE_MINUTES` in `backend/app/services/notification_service.py`.

---

### Notifications

- Bell icon (🔔) in the top bar with unread badge
- Frontend polls every **30 seconds**
- **Bell sound** plays (Web Audio API, no external file) when new notifications arrive
- Blue left-border + dot on unread items
- Click navigates to the lead and marks it read

---

### Email Templates

- **Personal** — visible only to the creator
- **Global** — visible to everyone in the organisation (Admin only)
- Used via the **Send Email** action on any lead with an email address

---

### Bulk Import

Accepts `.csv` or `.xlsx` files. Recognised columns:

`name`, `email`, `mobile`, `whatsapp`, `company`, `notes`, `priority`, `source`

- Header row required; rows missing `name` are skipped
- Invalid enum values fall back to `warm` / `manual`
- Optionally pre-assign all imported leads to a specific team member

---

## API Reference

All endpoints require `Authorization: Bearer <access_token>` unless marked **Public**.

Base URL: `http://localhost:8000`  
Interactive docs: `http://localhost:8000/docs`

---

### Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Login, returns access token + sets refresh cookie |
| POST | `/api/auth/otp/request` | Public | Request OTP codes (step 1 of signup) |
| POST | `/api/auth/otp/verify` | Public | Verify OTPs, returns verification token (step 2) |
| POST | `/api/auth/signup/individual` | Public | Create individual account (step 3) |
| POST | `/api/auth/signup/corporate` | Public | Create corporate account (step 3) |
| POST | `/api/auth/refresh` | Cookie | Refresh access token |
| POST | `/api/auth/logout` | Any | Clear refresh cookie |
| GET | `/api/auth/me` | Bearer | Current user profile |

**Login request/response:**
```json
// POST /api/auth/login
{ "email": "user@example.com", "password": "Password1" }

// 200 OK
{ "access_token": "<jwt>", "token_type": "bearer" }
```

---

### Leads — `/api/leads`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/leads/` | Bearer | List leads (filterable) |
| POST | `/api/leads/` | Bearer | Create lead |
| GET | `/api/leads/{id}` | Bearer | Get lead detail |
| PUT | `/api/leads/{id}` | Bearer | Update lead fields |
| DELETE | `/api/leads/{id}` | Admin | Delete lead |
| POST | `/api/leads/{id}/status` | Bearer | Update status + schedule follow-up |
| POST | `/api/leads/{id}/comment` | Bearer | Add comment |
| POST | `/api/leads/{id}/reassign` | Admin/Mgr | Reassign to user |
| GET | `/api/leads/{id}/timeline` | Bearer | Activity timeline (newest first) |
| POST | `/api/leads/{id}/email` | Bearer | Send email to lead |
| POST | `/api/leads/import` | Bearer | Bulk CSV/Excel import |

**List query params:** `status`, `priority`, `assigned_to_id`, `search`, `overdue`, `skip`, `limit`

**Status update body:**
```json
{
  "status": "call_back",
  "next_followup_at": "2025-04-16T10:00:00",
  "comment": "Will call back tomorrow morning"
}
```

---

### Dashboard — `/api/dashboard`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dashboard/stats` | Full dashboard payload |

**Response includes:** `total_leads`, `active_leads`, `converted_today`, `converted_this_week`, `new_leads_today`, `new_leads_this_week`, `not_interested_today`, `followups_due_today`, `followups_overdue`, `followups_done_today`, `activities_today`, `conversion_rate`, `leads_by_source_today`, `leads_by_source_all`, `status_breakdown`, `user_stats`, `due_followups`

---

### Users — `/api/users`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/users/` | Admin | List users in org (SuperAdmin sees all) |
| POST | `/api/users/` | Admin | Create user |
| GET | `/api/users/{id}` | Admin | Get user |
| PUT | `/api/users/{id}` | Admin | Update user |
| DELETE | `/api/users/{id}` | Admin | Delete user |

---

### Templates — `/api/templates`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/templates/` | Bearer | List personal + global templates |
| POST | `/api/templates/` | Bearer | Create template |
| PUT | `/api/templates/{id}` | Owner/Admin | Update template |
| DELETE | `/api/templates/{id}` | Owner/Admin | Delete template |

---

### Notifications — `/api/notifications`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/notifications/` | Latest 50 notifications |
| GET | `/api/notifications/unread-count` | `{ "count": N }` |
| PUT | `/api/notifications/{id}/read` | Mark single as read |
| PUT | `/api/notifications/read-all` | Mark all as read |

---

### Settings — `/api/settings`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/settings/` | Bearer | All org settings as key-value map |
| PUT | `/api/settings/` | Admin | Update settings |
| GET | `/api/settings/webhook` | Bearer | Webhook token + URL |
| POST | `/api/settings/webhook/regenerate` | Admin | Regenerate webhook token |

---

### Webhooks — `/api/webhooks`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/webhooks/{token}` | Public | Meta verification challenge |
| POST | `/api/webhooks/{token}/leads` | Public | Receive lead from social campaign |

Auto-detected formats:

| Platform | Detection key | Source tag |
|---|---|---|
| Meta (Facebook/Instagram) | `entry[].changes[].value.field_data` | `facebook` / `instagram` |
| LinkedIn | `firstName` / `lastName` | `linkedin` |
| Google Ads | `user_column_data` | `google_ads` |
| Generic / Custom | Fallback | `other` |

**Generic JSON body:**
```json
{
  "name": "Priya Sharma",
  "mobile": "9988776655",
  "email": "priya@example.com",
  "campaign_name": "April Sale"
}
```

---

### Super Admin — `/api/superadmin`

Requires `is_superadmin = true`.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/superadmin/stats` | Platform-wide counts |
| GET | `/api/superadmin/orgs` | All organisations with summary stats |
| GET | `/api/superadmin/orgs/{id}` | Organisation detail + member list |
| PATCH | `/api/superadmin/orgs/{id}/toggle` | Enable / disable organisation |

---

## Data Models

### User

| Field | Type | Notes |
|---|---|---|
| `id` | int | PK |
| `organization_id` | int FK | Owning organisation |
| `email` | string | Unique |
| `name` | string | Display name |
| `mobile` | string | Optional |
| `hashed_password` | string | bcrypt, rounds=12 |
| `role` | enum | `admin` / `manager` / `user` |
| `is_owner` | bool | Organisation founder |
| `is_superadmin` | bool | Platform-level admin |
| `is_active` | bool | Account enabled |
| `last_login` | datetime | UTC |

### Lead

| Field | Type | Notes |
|---|---|---|
| `id` | int | PK |
| `organization_id` | int FK | Owning organisation |
| `web_id` | string | Auto `WEB-XXXX` |
| `name` | string | Required |
| `email / mobile / whatsapp` | string | Contact info |
| `company / notes` | string | Optional |
| `campaign_name` | string | Set by webhook |
| `status` | enum | 7 statuses |
| `priority` | enum | hot / warm / cold |
| `source` | enum | 10 sources |
| `assigned_to_id` | int FK | Assigned user |
| `created_by_id` | int FK | Creator |
| `next_followup_at` | datetime | UTC |
| `last_comment` | text | Denormalised — updated on every comment |
| `is_active` | bool | Soft delete |
| `created_at / updated_at` | datetime | UTC |

### Organisation

| Field | Type | Notes |
|---|---|---|
| `id` | int | PK |
| `name` | string | Org or person name |
| `type` | enum | `individual` / `corporate` |
| `webhook_token` | string | Unique, URL-safe 24-char |
| `is_active` | bool | Controlled by SuperAdmin |
| `created_at` | datetime | UTC |

---

## Lead Workflow

```
New Lead
   │
   ▼
[ NEW ]
   │
   ├──► [ BUSY ]  ──────────────────────┐
   │                                    │ schedule follow-up
   ├──► [ NOT REACHABLE ] ─────────────►│
   │                                    │
   ├──► [ CALL BACK ] ─────────────────►│
   │         │                          │
   │         └──► [ INTERESTED         │
   │               CALL BACK ] ────────►┘
   │                                    │
   │◄───────────────────────────────────┘
   │         (continue attempts)
   │
   ├──► [ CONVERTED ]       (terminal ✅)
   │
   └──► [ NOT INTERESTED ]  (terminal ❌)
```

Statuses that require a follow-up date: **Call Back**, **Interested - Call Back**, **Busy**, **Not Reachable**.

---

## Webhook Integration

Find your webhook token in **Settings → Webhook Integration**.

```
POST https://your-domain.com/api/webhooks/{webhook_token}/leads
```

### Meta (Facebook / Instagram Lead Ads)

1. Meta for Developers → Webhooks → Add callback URL
2. Set verify token to the value shown in Settings
3. Subscribe to `leadgen` field on your page

### LinkedIn Lead Gen Forms

Set the webhook URL under Campaign Manager → Lead Sync.

### Google Ads Lead Form Extensions

Set the webhook URL under Assets → Lead forms → Webhook delivery.

### Custom Source

```json
POST /api/webhooks/{token}/leads
Content-Type: application/json

{
  "name": "Lead Name",
  "email": "lead@example.com",
  "mobile": "9876543210",
  "company": "Company Ltd",
  "campaign_name": "My Campaign"
}
```

---

## Notifications

**Reminder lead time:** 15 minutes before follow-up (configurable via `REMIND_BEFORE_MINUTES`).

**Scheduler frequency:** Every 1 minute.

**Frontend polling:** Every 30 seconds.

**Bell sound:** Synthesised two-tone chord via Web Audio API — no external audio files. Plays automatically when unread count increases. Falls back silently if the browser blocks AudioContext before user interaction.

---

## OTP Verification

Signup flow:

```
Step 1  Fill form (name, email, mobile, password)
           │
           ▼
        POST /api/auth/otp/request
           │  → sends email OTP via SMTP
           │  → shows mobile OTP on screen (no SMS provider)
           │
Step 2  Enter both 6-digit codes
           │
           ▼
        POST /api/auth/otp/verify
           │  → returns verification_token (valid 30 min)
           │
Step 3  Signup completes automatically
           │
           ▼
        POST /api/auth/signup/individual  or  /corporate
           │  → validates verification_token
           └  → creates Organisation + User, logs in
```

OTP codes expire in **10 minutes**. Resend button available (60-second cooldown).

Dev mode (no SMTP): both OTPs shown in an amber on-screen banner.

**Password rules:** min 8 chars · at least 1 uppercase · at least 1 number.

---

## Multi-Tenancy

`organization_id` is present on `Lead`, `User`, `EmailTemplate`, and `AppSettings`. All queries are scoped to the current user's organisation at the router level.

| Data | Isolation |
|---|---|
| Leads | Org-scoped |
| Users | Org-scoped |
| Templates | Personal (creator) or Global (org-wide) |
| Settings | Org-scoped key-value |
| Webhook token | Unique per org |
| Notifications | User-scoped |

The **platform super-admin** bypasses all org filters via dedicated `/api/superadmin/*` endpoints.

---

## Deployment

### Docker Compose

```bash
docker-compose up --build
```

- Frontend (Nginx): port **80**
- Backend (Uvicorn): port **8000**

Update `.env` for PostgreSQL:
```env
DATABASE_URL=postgresql://salescrm:salescrm123@db:5432/salescrm
```

### Manual

```bash
# Backend
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

# Frontend
npm run build
# Serve dist/ via Nginx — proxy /api/* to localhost:8000
```

### Production Checklist

- [ ] Strong random `SECRET_KEY`
- [ ] PostgreSQL `DATABASE_URL`
- [ ] `FRONTEND_URL` set to production domain
- [ ] SMTP credentials configured
- [ ] `ADMIN_PASSWORD` changed from default
- [ ] HTTPS enabled

---

### Development Notes

**Database migrations** — No Alembic. New columns are added automatically via `ALTER TABLE` in `run_migrations()` on startup (`backend/app/main.py`).

**Timezones** — All datetimes stored as naive UTC. The frontend converts to **IST (Asia/Kolkata, UTC+5:30)** using `fmtDate()` / `fmtDateTime()` in `frontend/src/lib/utils.ts`.

**Theming** — Light / dark mode + four accent colours (Indigo, Green, Purple, Orange) via CSS custom properties. Persisted in `localStorage`.

---

*SalesCRM · FastAPI + React 19 · IST timezone · Multi-tenant · Webhook-ready*
