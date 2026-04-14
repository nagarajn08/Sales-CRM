# Sales CRM

A full-stack Sales Lead Management System built for teams that need to track, follow up, and convert leads efficiently. Supports multi-user workflows with role-based access, activity timelines, email integration, and real-time notifications.

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [User Roles & Permissions](#user-roles--permissions)
5. [Getting Started](#getting-started)
6. [Environment Configuration](#environment-configuration)
7. [Running Locally](#running-locally)
8. [Running with Docker](#running-with-docker)
9. [Lead Management Workflow](#lead-management-workflow)
10. [API Reference](#api-reference)
11. [Database Schema](#database-schema)
12. [Frontend Pages](#frontend-pages)
13. [Theme & Appearance](#theme--appearance)
14. [Email Configuration](#email-configuration)
15. [Default Credentials](#default-credentials)

---

## Features

### Lead Management
- Add, edit, and delete leads with full contact details (name, mobile, WhatsApp, email, company)
- Auto-generated **Web ID** (e.g. `WEB-0001`) assigned on lead creation
- Lead **source tracking** — Manual, Import, Website, Reference, Cold Call, Other
- Lead **priority** — Hot, Warm, Cold
- Lead **status workflow** — New → Call Back / Busy / Not Reachable → Converted / Not Interested
- Follow-up scheduling with a **popup calendar** (date + time picker)
- Leads always sorted by **earliest follow-up first** (overdue at top)
- Overdue follow-up indicators with days-past count
- **Bulk import** via CSV or Excel file

### Activity Timeline
- Every action on a lead is logged — status changes, comments, reassignments, emails sent, imports
- Full timeline visible on the Lead Detail page

### Notifications
- Automatic follow-up reminders triggered every 5 minutes by a background scheduler
- Notification bell in the top bar with unread count badge
- Mark individual or all notifications as read

### Email
- Send emails directly to a lead from the Lead Detail page
- Choose from saved email templates or write custom subject/body
- SMTP configuration via the Settings page (supports Gmail, Outlook, any SMTP)

### Email Templates
- Create personal or global (admin-only) reusable email templates
- Templates are available when sending emails to leads

### User Management (Admin only)
- Create, edit, deactivate, and delete user accounts
- Assign roles: Admin, Manager, or User
- View last login time for each user

### Dashboard
- Key metrics: Total Leads, Active Leads, Converted Today, Overdue Follow-ups, New Today
- Due follow-ups list (clickable, goes to lead detail)
- Team performance table (Admin/Manager view) — per-user counts for each status

### Settings (Admin only)
- App name and support email configuration
- SMTP email server setup
- Follow-up reminder timing
- Accent color (Blue / Green / Purple / Orange) and Dark / Light mode

---

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| Python 3.11 | Runtime |
| FastAPI | REST API framework |
| SQLAlchemy 2.0 | ORM |
| SQLite (default) / PostgreSQL | Database |
| Pydantic v2 | Request/response validation |
| python-jose | JWT authentication (access + refresh tokens) |
| bcrypt | Password hashing |
| APScheduler | Background follow-up notification job (every 5 min) |
| pandas + openpyxl | CSV/Excel lead import |
| smtplib | Email sending |

### Frontend
| Technology | Purpose |
|---|---|
| React 19 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool |
| Tailwind CSS | Styling |
| React Router v7 | Client-side routing |
| Axios | HTTP client with token refresh interceptor |
| date-fns | Date formatting |
| lucide-react | Icons |

---

## Project Structure

```
sales-crm/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, startup, seed admin, scheduler
│   │   ├── config.py            # Settings loaded from .env
│   │   ├── database.py          # SQLAlchemy engine and session
│   │   ├── dependencies.py      # Auth guards (get_current_user, require_admin)
│   │   ├── models/
│   │   │   ├── user.py          # User model (id, email, name, role, is_active)
│   │   │   ├── lead.py          # Lead model (web_id, status, priority, source, followup)
│   │   │   ├── lead_activity.py # Activity timeline entries
│   │   │   ├── notification.py  # Follow-up notifications
│   │   │   ├── email_template.py# Email templates (personal + global)
│   │   │   └── app_settings.py  # Key-value settings store
│   │   ├── routers/
│   │   │   ├── auth.py          # POST /login, /refresh, /logout, GET /me
│   │   │   ├── users.py         # CRUD /api/users
│   │   │   ├── leads.py         # CRUD /api/leads + status, comment, reassign, email, import
│   │   │   ├── dashboard.py     # GET /api/dashboard/stats
│   │   │   ├── templates.py     # CRUD /api/templates
│   │   │   ├── notifications.py # GET, mark-read /api/notifications
│   │   │   └── settings.py      # GET/PUT /api/settings
│   │   ├── schemas/             # Pydantic request/response models
│   │   └── services/
│   │       ├── auth_service.py  # JWT creation, password hashing
│   │       └── notification_service.py  # Follow-up notification logic
│   ├── .env                     # Environment variables (not committed)
│   ├── .env.example             # Template for .env
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx             # App entry, theme init
│   │   ├── App.tsx              # Route definitions
│   │   ├── api/
│   │   │   ├── index.ts         # All API functions (authApi, leadsApi, etc.)
│   │   │   └── axiosInstance.ts # Axios with JWT refresh interceptor
│   │   ├── auth/
│   │   │   ├── AuthContext.tsx  # Auth state, login/logout
│   │   │   └── ProtectedRoute.tsx
│   │   ├── hooks/
│   │   │   └── useTheme.ts      # Theme color + dark mode (persisted to localStorage)
│   │   ├── types/index.ts       # TypeScript interfaces for all entities
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── LeadsPage.tsx
│   │   │   ├── LeadDetailPage.tsx
│   │   │   ├── UsersPage.tsx
│   │   │   ├── TemplatesPage.tsx
│   │   │   └── SettingsPage.tsx
│   │   ├── components/
│   │   │   ├── layout/          # AppLayout, Sidebar, Topbar, NotificationPanel
│   │   │   ├── leads/           # LeadFormModal, StatusModal, CommentModal,
│   │   │   │                    # ReassignModal, ImportModal, EmailModal
│   │   │   └── ui/              # Button, Input, Select, Textarea, Card,
│   │   │                        # Badge, Modal, DateTimePicker
│   │   └── lib/utils.ts         # cn() helper
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── nginx.conf               # Nginx config for Docker deployment
│   └── Dockerfile
│
├── docker-compose.yml           # PostgreSQL + Backend + Frontend
└── .gitignore
```

---

## User Roles & Permissions

| Action | User | Manager | Admin |
|---|:---:|:---:|:---:|
| View own leads | ✅ | ✅ | ✅ |
| View all leads | ❌ | ✅ | ✅ |
| Create leads | ✅ | ✅ | ✅ |
| Edit leads | ✅ | ✅ | ✅ |
| Update lead status | ✅ | ✅ | ✅ |
| Add comments | ✅ | ✅ | ✅ |
| Send emails to leads | ✅ | ✅ | ✅ |
| Import leads (CSV/Excel) | ✅ | ✅ | ✅ |
| Reassign leads | ❌ | ✅ | ✅ |
| Delete leads | ❌ | ❌ | ✅ |
| View team dashboard | ❌ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ✅ |
| Manage settings | ❌ | ❌ | ✅ |
| Create global templates | ❌ | ❌ | ✅ |

---

## Getting Started

### Prerequisites
- Python 3.10 or later
- Node.js 18 or later
- npm

### Clone the repository
```bash
git clone https://github.com/nagarajn08/Sales-CRM.git
cd Sales-CRM
```

---

## Environment Configuration

The backend reads settings from `backend/.env`. Copy the example and edit:

```bash
cp backend/.env.example backend/.env
```

**`backend/.env`**
```env
# Database
DATABASE_URL=sqlite:///./salescrm.db          # SQLite (default, no setup needed)
# DATABASE_URL=postgresql://salescrm:salescrm123@localhost:5432/salescrm  # PostgreSQL

# Security
SECRET_KEY=your-64-character-secret-key-here  # Generate: openssl rand -hex 32

# Frontend origin (for CORS)
FRONTEND_URL=http://localhost:5173

# Token expiry
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# Default admin account (created on first startup)
ADMIN_EMAIL=admin@salescrm.com
ADMIN_PASSWORD=Admin@123
ADMIN_NAME=Administrator
```

---

## Running Locally

### Step 1 — Backend

Open a terminal in the project root:

```powershell
cd backend
venv\Scripts\Activate.ps1        # Windows PowerShell
# source venv/bin/activate        # Mac / Linux

pip install -r requirements.txt
uvicorn app.main:app --reload
```

The backend starts at **http://localhost:8000**

> On first startup, all database tables are created automatically and the admin account is seeded.

### Step 2 — Frontend

Open a **second** terminal:

```powershell
cd frontend
npm install
npm run dev
```

The frontend starts at **http://localhost:5173**

---

## Running with Docker

A complete Docker Compose setup runs all three services (PostgreSQL, backend, frontend) with one command.

```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend (nginx) | http://localhost |
| Backend API | http://localhost:8000 |
| PostgreSQL | localhost:5432 |

To stop:
```bash
docker-compose down
```

Data is persisted in a Docker volume (`pgdata`) and survives restarts.

---

## Lead Management Workflow

```
New Lead Created
      │
      ▼
  [ NEW ] ──────────────────────────────────────────┐
      │                                              │
      ▼                                              │
 Called lead?                                        │
      │                                              │
   ┌──┴──────────────┐                              │
   │                 │                              │
   ▼                 ▼                              │
[BUSY]         [CALL BACK]                          │
[NOT REACHABLE]                                     │
   │                 │                              │
   │  (requires follow-up date)                     │
   └──────┬──────────┘                              │
          │                                         │
          ▼                                         │
    Follow-up done?                                 │
          │                                         │
     ┌────┴────┐                                    │
     │         │                                    │
     ▼         ▼                                    │
[CONVERTED] [NOT INTERESTED] ◄──────────────────────┘
(closed ✅)  (closed ❌)
```

**Rules:**
- Statuses `Call Back`, `Busy`, `Not Reachable` **require** a follow-up date/time
- Once marked `Converted` or `Not Interested`, the lead is closed — no further status changes or follow-ups
- Every status change, comment, reassignment, and email is logged in the Activity Timeline

---

## API Reference

All endpoints require `Authorization: Bearer <access_token>` unless noted.

### Authentication — `/api/auth`

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/login` | Login with email + password. Returns access token, sets refresh cookie | Public |
| POST | `/api/auth/refresh` | Get new access token using refresh cookie | Cookie |
| POST | `/api/auth/logout` | Clear refresh cookie | Public |
| GET | `/api/auth/me` | Get current user profile | Required |

**Login request:**
```json
{ "email": "admin@salescrm.com", "password": "Admin@123" }
```
**Login response:**
```json
{ "access_token": "eyJ...", "token_type": "bearer" }
```

---

### Leads — `/api/leads`

| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/api/leads/` | List leads (filterable) | All |
| POST | `/api/leads/` | Create lead | All |
| GET | `/api/leads/{id}` | Get lead detail | All |
| PUT | `/api/leads/{id}` | Update lead info | All |
| DELETE | `/api/leads/{id}` | Delete lead | Admin |
| POST | `/api/leads/{id}/status` | Update lead status + schedule follow-up | All |
| POST | `/api/leads/{id}/comment` | Add a comment | All |
| POST | `/api/leads/{id}/reassign` | Reassign to another user | Admin/Manager |
| GET | `/api/leads/{id}/timeline` | Get activity timeline | All |
| POST | `/api/leads/{id}/email` | Send email to lead | All |
| POST | `/api/leads/import` | Import leads from CSV/Excel | All |

**List leads query params:**
```
?status=new&priority=hot&assigned_to_id=2&search=john&overdue=true&skip=0&limit=50
```

**Create lead body:**
```json
{
  "name": "John Doe",
  "mobile": "+91 9876543210",
  "whatsapp": "+91 9876543210",
  "email": "john@example.com",
  "company": "Acme Corp",
  "notes": "Interested in product demo",
  "priority": "hot",
  "source": "website",
  "assigned_to_id": 2
}
```

**Update status body:**
```json
{
  "status": "call_back",
  "next_followup_at": "2026-04-15T10:00:00",
  "comment": "Call back tomorrow morning"
}
```

**Import leads:** `multipart/form-data` with `file` (CSV or XLSX).
Required column: `name`. Optional: `email`, `mobile`, `whatsapp`, `company`, `notes`.

---

### Dashboard — `/api/dashboard`

| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/api/dashboard/stats` | Get dashboard statistics | All |

**Response:**
```json
{
  "total_leads": 120,
  "active_leads": 85,
  "converted_today": 3,
  "overdue_followups": 7,
  "new_leads_today": 5,
  "user_stats": [...],
  "due_followups": [...]
}
```

---

### Users — `/api/users`

| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/api/users/` | List all users | Admin/Manager |
| POST | `/api/users/` | Create user | Admin |
| GET | `/api/users/{id}` | Get user | Admin/Manager |
| PUT | `/api/users/{id}` | Update user | Admin |
| DELETE | `/api/users/{id}` | Delete user | Admin |

**Create user body:**
```json
{
  "email": "sales@company.com",
  "name": "Jane Smith",
  "mobile": "+91 9876543210",
  "password": "SecurePass@123",
  "role": "user"
}
```
Roles: `user`, `manager`, `admin`

---

### Email Templates — `/api/templates`

| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/api/templates/` | List templates (own + global) | All |
| POST | `/api/templates/` | Create template | All |
| PUT | `/api/templates/{id}` | Update template | Owner/Admin |
| DELETE | `/api/templates/{id}` | Delete template | Owner/Admin |

**Create template body:**
```json
{
  "name": "Initial Outreach",
  "subject": "Regarding your enquiry",
  "body": "Dear {name},\n\nThank you for reaching out...",
  "is_global": false
}
```
> Only Admins can set `is_global: true` (visible to all users).

---

### Notifications — `/api/notifications`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/notifications/` | List latest 50 notifications |
| GET | `/api/notifications/unread-count` | Get unread count |
| PUT | `/api/notifications/{id}/read` | Mark one as read |
| PUT | `/api/notifications/read-all` | Mark all as read |

---

### Settings — `/api/settings`

| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/api/settings/` | Get all settings | Public |
| PUT | `/api/settings/` | Update settings | Admin |

**Update body:**
```json
{
  "settings": {
    "smtp_host": "smtp.gmail.com",
    "smtp_port": "587",
    "smtp_user": "you@gmail.com",
    "smtp_password": "app-password",
    "smtp_from": "SalesCRM <you@gmail.com>",
    "app_name": "My Sales CRM",
    "support_email": "support@company.com"
  }
}
```

---

## Database Schema

### `users`
| Column | Type | Description |
|---|---|---|
| id | Integer PK | |
| email | String (unique) | Login email |
| name | String | Display name |
| mobile | String | Phone number |
| hashed_password | String | bcrypt hash |
| role | Enum | `admin`, `manager`, `user` |
| is_active | Boolean | Account enabled |
| last_login | DateTime | |
| created_at | DateTime | |
| updated_at | DateTime | |

### `leads`
| Column | Type | Description |
|---|---|---|
| id | Integer PK | |
| web_id | String | Auto-assigned (e.g. `WEB-0001`) |
| name | String | Lead name |
| email | String | |
| mobile | String | |
| whatsapp | String | |
| company | String | |
| notes | Text | |
| status | Enum | `new`, `call_back`, `busy`, `not_reachable`, `not_interested`, `converted` |
| priority | Enum | `hot`, `warm`, `cold` |
| source | Enum | `manual`, `import`, `website`, `reference`, `cold_call`, `other` |
| assigned_to_id | FK → users | |
| created_by_id | FK → users | |
| next_followup_at | DateTime | Scheduled follow-up |
| is_active | Boolean | False when closed |
| created_at | DateTime | |
| updated_at | DateTime | |

### `lead_activities`
| Column | Type | Description |
|---|---|---|
| id | Integer PK | |
| lead_id | FK → leads | |
| user_id | FK → users | Who performed the action |
| activity_type | Enum | `created`, `status_changed`, `comment`, `reassigned`, `followup_set`, `email_sent`, `imported` |
| old_status | String | Previous status (for status changes) |
| new_status | String | New status |
| comment | Text | Comment text |
| followup_date | DateTime | Scheduled date |
| meta | String | JSON string for extra info |
| created_at | DateTime | |

### `notifications`
| Column | Type | Description |
|---|---|---|
| id | Integer PK | |
| user_id | FK → users | Who receives it |
| lead_id | FK → leads | Related lead |
| message | String | Notification text |
| is_read | Boolean | |
| due_at | DateTime | Follow-up due time |
| created_at | DateTime | |

### `email_templates`
| Column | Type | Description |
|---|---|---|
| id | Integer PK | |
| user_id | FK → users | NULL if global |
| name | String | Template name |
| subject | String | Email subject |
| body | Text | Email body |
| is_global | Boolean | Visible to all users |

### `app_settings`
| Column | Type | Description |
|---|---|---|
| id | Integer PK | |
| key | String (unique) | Setting key |
| value | String | Setting value |

---

## Frontend Pages

| Route | Page | Access |
|---|---|---|
| `/login` | Login | Public |
| `/dashboard` | Dashboard with stats and due follow-ups | All |
| `/leads` | Lead list with filters and search | All |
| `/leads/:id` | Lead detail, timeline, actions | All |
| `/users` | User management | Admin only |
| `/templates` | Email templates | All |
| `/settings` | App settings and SMTP config | Admin only |

---

## Theme & Appearance

Users can switch the app theme in **Settings → Appearance**:

- **Accent colors:** Blue, Green, Purple, Orange
- **Mode:** Light, Dark
- Theme preference is saved to `localStorage` and applied immediately — no page reload needed.

---

## Email Configuration

To enable email sending from Lead Detail pages, configure SMTP in **Settings**:

| Setting | Example |
|---|---|
| SMTP Host | `smtp.gmail.com` |
| SMTP Port | `587` |
| SMTP Username | `you@gmail.com` |
| SMTP Password | Gmail app password (not your login password) |
| From Email | `SalesCRM <you@gmail.com>` |

> For Gmail: Enable 2FA on your Google account → Generate an **App Password** → Use that as the SMTP password.

---

## Default Credentials

| Field | Value |
|---|---|
| Email | `admin@salescrm.com` |
| Password | `Admin@123` |

> Change the password after first login by editing the admin user in the Users page.

---

## License

MIT
