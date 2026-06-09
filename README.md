# The Hive — Shared Expense Workspace

A lightweight web application for freelancers and clients to manage expense reimbursements. Freelancers upload receipts, the app extracts data via OCR, clients approve or reject expenses, and both parties can generate reimbursement summaries.

> **Status:** MVP in development

---

## Tech Stack

| Layer          | Technology                          |
|----------------|-------------------------------------|
| Frontend       | React 19 + Vite                     |
| Backend        | Node.js + Express                   |
| Database       | PostgreSQL 15+                      |
| OCR            | OCR.space API                       |
| File Storage   | Local filesystem (`uploads/`)       |
| Authentication | JWT (bearer token, 7-day expiry)    |
| Deployment     | Vercel (frontend) + Node server     |

---

## Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **PostgreSQL** ≥ 15.x (local or hosted — e.g., [Supabase](https://supabase.com), [Neon](https://neon.tech))
- **Resend account** — [Sign up free](https://resend.com) (email notifications)
- **OCR.space API key** — [Get a free key](https://ocr.space/ocrapi)
- **Git**

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/the-hive.git
cd the-hive
```

### 2. Install Dependencies

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 3. Configure Environment Variables

```bash
# In /server, copy the example env file
cp .env.example .env
```

Edit `.env` with your values. See [ENV_SETUP.md](docs/ENV_SETUP.md) for a full reference.

**Minimum required variables:**

```env
DATABASE_URL=postgresql://user:password@localhost:5432/the_hive
JWT_SECRET=your-secure-random-string-min-64-chars
RESEND_API_KEY=re_xxxxxxxxxxxx
OCR_SPACE_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxx
```

### 4. Set Up the Database

```bash
cd server

# Run migrations
npm run db:migrate

# (Optional) Seed demo data
npm run db:seed
```

### 5. Start Development Servers

```bash
# Terminal 1 — Backend (port 3001)
cd server
npm run dev

# Terminal 2 — Frontend (port 5173)
cd client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## OCR Setup

Receipt scanning uses the **OCR.space API** (free tier: 500 requests/day).

1. Sign up at [ocr.space](https://ocr.space/ocrapi) and get a free API key.
2. Add it to `server/.env`:
   ```env
   OCR_SPACE_API_KEY=your-api-key-here
   ```
3. Supported formats: **JPEG, PNG, WebP, PDF**.
4. OCR results are always editable — extraction is best-effort.

---

## Project Structure

```
the-hive/
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route-level page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API client functions
│   │   ├── context/        # React context providers
│   │   ├── constants/      # Shared constants (currencies)
│   │   ├── styles/         # Global CSS + design tokens
│   │   └── assets/         # Static assets (icons, images)
│   └── public/
├── server/                 # Node.js + Express backend
│   ├── src/
│   │   ├── routes/         # Express route handlers
│   │   ├── controllers/    # Business logic controllers
│   │   ├── middleware/      # Auth, validation, error handling
│   │   ├── services/       # OCR, email services
│   │   ├── utils/          # Helpers, access control, audit log
│   │   ├── config/         # Knex database config
│   │   └── db/             # Migrations, seeds, connection
│   └── .env.example
├── docs/                   # Project documentation
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DATABASE.md
│   ├── SECURITY.md
│   ├── TESTING.md
│   ├── DEPLOYMENT.md
│   ├── USER_FLOWS.md
│   ├── EDGE_CASES.md
│   └── ENV_SETUP.md
├── CONTRIBUTING.md
├── CHANGELOG.md
└── README.md               # ← You are here
```

---

## Available Scripts

### Backend (`/server`)

| Script              | Description                              |
|---------------------|------------------------------------------|
| `npm run dev`       | Start dev server with hot reload         |
| `npm run build`     | Build for production                     |
| `npm start`         | Start production server                  |
| `npm test`          | Run unit + integration tests             |
| `npm run test:e2e`  | Run end-to-end tests                     |
| `npm run db:migrate`| Run pending database migrations          |
| `npm run db:rollback`| Rollback last migration                 |
| `npm run db:seed`   | Seed database with demo data             |
| `npm run lint`      | Lint source files                        |

### Frontend (`/client`)

| Script              | Description                              |
|---------------------|------------------------------------------|
| `npm run dev`       | Start Vite dev server                    |
| `npm run build`     | Build for production                     |
| `npm run preview`   | Preview production build locally         |
| `npm test`          | Run component tests                      |
| `npm run lint`      | Lint source files                        |

---

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, folder structure, integrations |
| [API.md](docs/API.md) | Full REST API endpoint reference |
| [DATABASE.md](docs/DATABASE.md) | Schema, ER diagram, migrations |
| [SECURITY.md](docs/SECURITY.md) | Security implementation guide |
| [TESTING.md](docs/TESTING.md) | Test strategy and coverage |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel deployment guide |
| [USER_FLOWS.md](docs/USER_FLOWS.md) | User journey diagrams |
| [EDGE_CASES.md](docs/EDGE_CASES.md) | Edge case handling reference |
| [ENV_SETUP.md](docs/ENV_SETUP.md) | Environment variable guide |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guidelines |
| [CHANGELOG.md](CHANGELOG.md) | Version history |

---

## License

This project is proprietary. All rights reserved.
