# Testing Strategy — The Hive

This document defines the testing strategy, tools, conventions, and critical test paths for The Hive.

---

## Testing Pyramid

```mermaid
graph TB
    E2E["E2E Tests (Playwright)
    ~10 tests — Critical user flows"]
    INT["Integration Tests (Supertest + pg)
    ~40 tests — API routes + database"]
    UNIT["Unit Tests (Vitest)
    ~80 tests — Controllers, services, utils, components"]

    style E2E fill:#ff6b6b,color:#fff
    style INT fill:#ffd93d,color:#333
    style UNIT fill:#6bcb77,color:#fff
```

| Layer | Tool | Count (Target) | Speed | What it Tests |
|-------|------|----------------|-------|--------------|
| **Unit** | Vitest | ~80 | Fast (ms) | Pure functions, controllers, React components |
| **Integration** | Vitest + Supertest | ~40 | Medium (s) | Full HTTP → DB round trips |
| **E2E** | Playwright | ~10 | Slow (10s+) | Complete user flows in real browser |

---

## Tools & Libraries

### Backend

| Tool | Purpose |
|------|---------|
| [Vitest](https://vitest.dev/) | Test runner & assertion library |
| [Supertest](https://github.com/visionmedia/supertest) | HTTP integration testing for Express |
| [pg](https://node-postgres.com/) | Real PostgreSQL test database |
| [dotenv](https://github.com/motdotla/dotenv) | Load test environment variables |

### Frontend

| Tool | Purpose |
|------|---------|
| [Vitest](https://vitest.dev/) | Test runner & assertion library |
| [React Testing Library](https://testing-library.com/react) | Component rendering & interaction |
| [MSW (Mock Service Worker)](https://mswjs.io/) | API mocking at the network level |
| [jsdom](https://github.com/jsdom/jsdom) | DOM environment for Vitest |

### E2E

| Tool | Purpose |
|------|---------|
| [Playwright](https://playwright.dev/) | Cross-browser E2E testing |

---

## Running Tests

### Backend Tests

```bash
cd server

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npx vitest run src/controllers/expenseController.test.js

# Run tests in watch mode (development)
npx vitest watch

# Run only integration tests
npx vitest run --dir src/routes
```

### Frontend Tests

```bash
cd client

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific file
npx vitest run src/components/ExpenseCard.test.jsx

# Watch mode
npx vitest watch
```

### E2E Tests

```bash
# From project root
npm run test:e2e

# Run with browser visible (headed mode)
npx playwright test --headed

# Run specific test file
npx playwright test tests/upload-flow.spec.js

# Open Playwright report
npx playwright show-report
```

---

## Test Database Setup

Integration tests use a **separate test database** — never the development database.

### Configuration

```env
# server/.env.test
DATABASE_URL=postgresql://user:password@localhost:5432/the_hive_test
JWT_SECRET=test-secret-minimum-64-characters-long-for-testing-purposes-only
NODE_ENV=test
```

### Setup & Teardown

```javascript
// server/src/test/setup.js
import { pool } from '../db/connection.js';
import { runMigrations } from '../db/migrate.js';

beforeAll(async () => {
  await runMigrations();         // Apply all migrations to test DB
});

beforeEach(async () => {
  // Truncate all tables between tests (order matters for FK constraints)
  await pool.query(`
    TRUNCATE expense_tags, receipts, expenses, 
             workspace_members, workspaces, users 
    CASCADE
  `);
});

afterAll(async () => {
  await pool.end();              // Close DB connections
});
```

---

## Test File Organization

```
server/
├── src/
│   ├── controllers/
│   │   ├── expenseController.js
│   │   └── expenseController.test.js      ← Unit test (co-located)
│   ├── services/
│   │   ├── ocrService.js
│   │   └── ocrService.test.js             ← Unit test
│   ├── routes/
│   │   ├── expenseRoutes.js
│   │   └── expenseRoutes.test.js          ← Integration test
│   ├── utils/
│   │   ├── validators.js
│   │   └── validators.test.js             ← Unit test
│   └── test/
│       ├── setup.js                        ← Global test setup
│       └── helpers.js                      ← Test utilities & factories
│
client/
├── src/
│   ├── components/
│   │   ├── ExpenseCard.jsx
│   │   └── ExpenseCard.test.jsx           ← Component test
│   ├── hooks/
│   │   ├── useAuth.js
│   │   └── useAuth.test.js                ← Hook test
│   └── test/
│       ├── setup.js                        ← Global test setup
│       └── mocks/                          ← MSW handlers
│           └── handlers.js
│
tests/                                      ← E2E tests (project root)
├── upload-flow.spec.js
├── approval-flow.spec.js
├── summary-flow.spec.js
└── auth-flow.spec.js
```

---

## Test Helpers & Factories

```javascript
// server/src/test/helpers.js

/**
 * Create a test user and return user + auth token
 */
export async function createTestUser(overrides = {}) {
  const user = {
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    password: 'TestPass123!',
    ...overrides,
  };
  
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send(user);
  
  return {
    user: res.body.data.user,
    token: res.body.data.access_token,
    password: user.password,
  };
}

/**
 * Create a test workspace with the given owner
 */
export async function createTestWorkspace(token, overrides = {}) {
  const res = await request(app)
    .post('/api/v1/workspaces')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Test Workspace', ...overrides });
  
  return res.body.data;
}

/**
 * Create a test expense in draft status
 */
export async function createTestExpense(token, workspaceId, overrides = {}) {
  const res = await request(app)
    .post('/api/v1/expenses')
    .set('Authorization', `Bearer ${token}`)
    .send({
      workspace_id: workspaceId,
      amount: 50.00,
      currency: 'USD',
      merchant: 'Test Store',
      date: '2026-05-01',
      ...overrides,
    });
  
  return res.body.data;
}
```

---

## Critical Test Paths

These tests are **mandatory** — the app cannot ship without them.

### 1. Authentication

| Test | Type | Priority |
|------|------|----------|
| Signup with valid data creates user + returns token | Integration | 🔴 Critical |
| Signup with duplicate email returns 409 | Integration | 🔴 Critical |
| Login with valid credentials returns token | Integration | 🔴 Critical |
| Login with wrong password returns 401 | Integration | 🔴 Critical |
| Access protected endpoint without token returns 401 | Integration | 🔴 Critical |
| Access protected endpoint with expired token returns 401 | Integration | 🔴 Critical |
| Refresh token returns new access token | Integration | 🔴 Critical |
| Logout invalidates refresh token | Integration | 🟡 High |
| Password reset flow (request → reset) | Integration | 🟡 High |
| Rate limiting blocks after 5 failed logins | Integration | 🟡 High |

### 2. Workspace Isolation

| Test | Type | Priority |
|------|------|----------|
| User can only see workspaces they're a member of | Integration | 🔴 Critical |
| Non-member cannot access workspace expenses | Integration | 🔴 Critical |
| Non-member cannot access expense by ID (even with valid UUID) | Integration | 🔴 Critical |
| Removed member cannot access workspace | Integration | 🔴 Critical |
| Client cannot create expenses | Integration | 🔴 Critical |
| Freelancer cannot approve/reject expenses | Integration | 🔴 Critical |

### 3. Expense Status Transitions

| Test | Type | Priority |
|------|------|----------|
| draft → submitted (valid) | Unit + Integration | 🔴 Critical |
| submitted → approved (by client) | Unit + Integration | 🔴 Critical |
| submitted → rejected (requires note) | Unit + Integration | 🔴 Critical |
| rejected → submitted (after edit) | Unit + Integration | 🔴 Critical |
| approved → paid | Unit + Integration | 🟡 High |
| draft → approved (invalid, blocked) | Unit | 🔴 Critical |
| approved → rejected (invalid, blocked) | Unit | 🔴 Critical |
| rejected → approved (invalid, blocked) | Unit | 🔴 Critical |
| Rejection without note returns 400 | Integration | 🔴 Critical |

### 4. File Upload & OCR

| Test | Type | Priority |
|------|------|----------|
| Upload valid JPEG returns receipt URL | Integration | 🔴 Critical |
| Upload file > 10MB returns 413 | Integration | 🟡 High |
| Upload .exe file returns 415 | Integration | 🟡 High |
| Duplicate file hash shows warning | Integration | 🟡 High |
| OCR extracts amount from receipt image | Unit | 🟡 High |
| OCR returns null fields when extraction fails | Unit | 🟡 High |
| OCR results are editable (PATCH expense) | Integration | 🟡 High |

### 5. Summary Generation

| Test | Type | Priority |
|------|------|----------|
| Summary returns correct totals for date range | Integration | 🔴 Critical |
| Summary groups by status correctly | Integration | 🟡 High |
| Summary excludes expenses outside date range | Integration | 🟡 High |
| Summary handles multiple currencies | Integration | 🟡 High |

---

## E2E Test Scenarios

### Upload Flow (Critical Path)

```javascript
// tests/upload-flow.spec.js
test('freelancer can upload receipt and submit expense', async ({ page }) => {
  // 1. Login as freelancer
  // 2. Navigate to workspace
  // 3. Click "New Expense"
  // 4. Upload a receipt image
  // 5. Verify OCR populates fields
  // 6. Edit any field
  // 7. Add a tag
  // 8. Click "Submit"
  // 9. Verify status shows "Submitted"
});
```

### Approval Flow (Critical Path)

```javascript
// tests/approval-flow.spec.js
test('client can approve submitted expense', async ({ page }) => {
  // 1. Login as client
  // 2. Navigate to shared workspace
  // 3. Click on a submitted expense
  // 4. Review receipt preview
  // 5. Click "Approve"
  // 6. Verify status shows "Approved"
});

test('client can reject with note', async ({ page }) => {
  // 1. Login as client  
  // 2. Navigate to submitted expense
  // 3. Click "Reject"
  // 4. Enter rejection note
  // 5. Confirm rejection
  // 6. Verify status shows "Rejected" with note visible
});
```

### Summary Flow (Critical Path)

```javascript
// tests/summary-flow.spec.js
test('user can generate reimbursement summary', async ({ page }) => {
  // 1. Login
  // 2. Navigate to workspace
  // 3. Click "Summary"
  // 4. Select date range
  // 5. Verify totals are shown
  // 6. Verify expense table is populated
  // 7. Copy summary to clipboard
});
```

---

## Coverage Requirements

| Area | Target | Enforcement |
|------|--------|-------------|
| Backend controllers | ≥ 85% | CI fails below threshold |
| Backend services | ≥ 80% | CI fails below threshold |
| Backend utils | ≥ 90% | CI fails below threshold |
| Backend overall | ≥ 80% | CI fails below threshold |
| Frontend components | ≥ 70% | Warning in CI |
| Frontend hooks | ≥ 80% | CI fails below threshold |
| Frontend overall | ≥ 70% | Warning in CI |

### Vitest Coverage Config

```javascript
// vitest.config.js
export default {
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.{js,jsx}',
        'src/db/migrations/',
        'src/db/seeds/',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
};
```

---

## Mocking Guidelines

### Backend — What to Mock

| Dependency | Mock? | Why |
|-----------|-------|-----|
| Database (pg) | ❌ No — use test DB | Integration tests need real SQL |
| Cloudinary | ✅ Yes | External service, costs money, slow |
| Tesseract.js | ✅ Yes in unit tests | Slow; use real in integration tests selectively |
| bcrypt | ❌ No | Fast enough, important to test real hashing |
| jsonwebtoken | ❌ No | Important to test real token generation/validation |

### Frontend — What to Mock

| Dependency | Mock? | Tool |
|-----------|-------|------|
| API calls | ✅ Yes | MSW (Mock Service Worker) |
| React Router | ✅ Yes | `MemoryRouter` from react-router-dom |
| Browser APIs (clipboard, file) | ✅ Yes | Vitest mocks |
| Auth context | ✅ Yes | Custom test provider |

### MSW Example

```javascript
// client/src/test/mocks/handlers.js
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/v1/workspaces/:id/expenses', () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 'uuid-1',
          merchant: 'Office Depot',
          amount: '42.50',
          currency: 'USD',
          status: 'submitted',
          date: '2026-05-20',
          tags: [{ id: 'tag-1', name: 'Office Supplies' }],
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  }),
];
```

---

## CI Integration

Tests run automatically on every push and pull request:

```yaml
# .github/workflows/test.yml (conceptual)
steps:
  - Checkout code
  - Install dependencies
  - Start test PostgreSQL (service container)
  - Run migrations on test DB
  - Run backend unit tests + coverage
  - Run backend integration tests
  - Run frontend unit tests + coverage
  - Run E2E tests (Playwright)
  - Upload coverage reports
  - Fail if coverage below thresholds
```

**PR cannot merge if any test fails.**
