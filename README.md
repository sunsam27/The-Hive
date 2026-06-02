# The Hive — Shared Expense Workspace

A lightweight web application for freelancers and clients to manage expense reimbursements. Freelancers upload receipts, the app extracts data via OCR, clients approve or reject expenses, and both parties can generate reimbursement summaries.

> **Status:** MVP in development

---

## Tech Stack

| Layer          | Technology                          |
|----------------|-------------------------------------|
| Frontend       | React 18 + Vite                     |
| Backend        | Node.js + Express                   |
| Database       | PostgreSQL 15+                      |
| OCR            | Tesseract.js (local, free)          |
| File Storage   | Cloudinary (free tier)              |
| Authentication | JWT (access + refresh tokens)       |
| Deployment     | Vercel (frontend + serverless API)  |

---

## Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **PostgreSQL** ≥ 15.x (local or hosted — e.g., [Supabase](https://supabase.com), [Neon](https://neon.tech))
- **Cloudinary account** — [Sign up free](https://cloudinary.com/users/register_free)
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
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
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

This project uses **Tesseract.js**, which runs entirely in Node.js — no external API keys or services required.

- Tesseract.js is installed as an npm dependency in `/server`.
- On first run, it downloads language data (~15 MB for English) and caches it locally.
- Supported receipt formats: **JPG, PNG, PDF** (PDF is converted to image first).
- OCR results are always editable by the user — extraction is best-effort.

**No additional setup is needed.** The OCR engine initializes automatically when the first receipt is uploaded.

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
│   │   ├── utils/          # Utility functions
│   │   └── assets/         # Static assets (icons, images)
│   └── public/
├── server/                 # Node.js + Express backend
│   ├── src/
│   │   ├── routes/         # Express route handlers
│   │   ├── controllers/    # Business logic controllers
│   │   ├── middleware/      # Auth, validation, error handling
│   │   ├── models/         # Database query functions
│   │   ├── services/       # OCR, file upload, email services
│   │   ├── utils/          # Helpers, validators, constants
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
