# API Reference — The Hive

Complete REST API documentation for The Hive Shared Expense Workspace.

**Base URL:** `/api/v1`  
**Content-Type:** `application/json` (unless uploading files)  
**Authentication:** Bearer token in `Authorization` header

---

## Table of Contents

- [Authentication](#authentication)
- [Workspaces](#workspaces)
- [Expenses](#expenses)
- [Receipts](#receipts)
- [Tags](#tags)
- [Summary](#summary)
- [Error Handling](#error-handling)

---

## Response Format

All responses follow a consistent structure:

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": [
      { "field": "amount", "message": "Amount must be a positive number" }
    ]
  }
}
```

---

## Pagination

List endpoints support pagination via query parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number (1-indexed) |
| `limit` | integer | 20 | Items per page (max 100) |

---

## Authentication

### POST `/auth/register`

Create a new user account.

**Auth required:** No

**Request body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "SecureP@ss123"
}
```

**Validation:**
| Field | Rules |
|-------|-------|
| `name` | Required, 1–255 characters |
| `email` | Required, valid email format, unique |
| `password` | Required, min 8 characters, at least 1 uppercase, 1 lowercase, 1 number |

**Success response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "created_at": "2026-05-26T12:00:00Z"
    },
    "access_token": "eyJhbGciOi...",
    "expires_in": 900
  }
}
```

> Refresh token is set as an HTTP-only cookie (`hive_refresh_token`).

**Error responses:**
| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Invalid input |
| 409 | `EMAIL_EXISTS` | Email already registered |

---

### POST `/auth/login`

Authenticate an existing user.

**Auth required:** No

**Request body:**
```json
{
  "email": "jane@example.com",
  "password": "SecureP@ss123"
}
```

**Success response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "Jane Doe",
      "email": "jane@example.com"
    },
    "access_token": "eyJhbGciOi...",
    "expires_in": 900
  }
}
```

**Error responses:**
| Status | Code | Condition |
|--------|------|-----------|
| 401 | `INVALID_CREDENTIALS` | Wrong email or password |
| 429 | `RATE_LIMITED` | Too many login attempts |

---

### POST `/auth/refresh`

Refresh the access token using the refresh token cookie.

**Auth required:** No (uses refresh token cookie)

**Success response (200):**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOi...",
    "expires_in": 900
  }
}
```

**Error responses:**
| Status | Code | Condition |
|--------|------|-----------|
| 401 | `INVALID_REFRESH_TOKEN` | Expired or invalid refresh token |

---

### POST `/auth/logout`

Invalidate the current refresh token.

**Auth required:** Yes

**Success response (200):**
```json
{
  "success": true,
  "data": { "message": "Logged out successfully" }
}
```

---

### POST `/auth/forgot-password`

Send a password reset email.

**Auth required:** No

**Request body:**
```json
{
  "email": "jane@example.com"
}
```

**Success response (200):**
```json
{
  "success": true,
  "data": { "message": "If an account exists with this email, a reset link has been sent." }
}
```

> Always returns 200 regardless of whether the email exists (prevents enumeration).

---

### POST `/auth/reset-password`

Reset password using a token from the reset email.

**Auth required:** No

**Request body:**
```json
{
  "token": "reset-token-from-email",
  "password": "NewSecureP@ss456"
}
```

**Error responses:**
| Status | Code | Condition |
|--------|------|-----------|
| 400 | `INVALID_RESET_TOKEN` | Token expired or invalid |
| 400 | `VALIDATION_ERROR` | Password doesn't meet requirements |

---

## Workspaces

### POST `/workspaces`

Create a new workspace. The creator is automatically added as a `freelancer` member.

**Auth required:** Yes

**Request body:**
```json
{
  "name": "Acme Corp Project"
}
```

**Validation:**
| Field | Rules |
|-------|-------|
| `name` | Required, 1–100 characters |

**Success response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Acme Corp Project",
    "owner_id": "uuid",
    "created_at": "2026-05-26T12:00:00Z",
    "role": "freelancer"
  }
}
```

---

### GET `/workspaces`

List all workspaces the authenticated user is a member of.

**Auth required:** Yes

**Success response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Acme Corp Project",
      "role": "freelancer",
      "member_count": 3,
      "expense_count": 12,
      "created_at": "2026-05-26T12:00:00Z"
    }
  ]
}
```

---

### GET `/workspaces/:id`

Get workspace details including member list.

**Auth required:** Yes  
**Authorization:** Must be a member of the workspace

**Success response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Acme Corp Project",
    "owner_id": "uuid",
    "created_at": "2026-05-26T12:00:00Z",
    "members": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "role": "freelancer",
        "invited_at": "2026-05-26T12:00:00Z"
      }
    ]
  }
}
```

---

### POST `/workspaces/:id/invite`

Invite a user to the workspace by email.

**Auth required:** Yes  
**Authorization:** Must be the workspace owner

**Request body:**
```json
{
  "email": "client@example.com",
  "role": "client"
}
```

**Validation:**
| Field | Rules |
|-------|-------|
| `email` | Required, valid email format |
| `role` | Required, one of: `freelancer`, `client` |

**Success response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "workspace_id": "uuid",
    "user_id": "uuid",
    "role": "client",
    "invited_at": "2026-05-26T12:00:00Z"
  }
}
```

**Error responses:**
| Status | Code | Condition |
|--------|------|-----------|
| 403 | `FORBIDDEN` | Not the workspace owner |
| 404 | `USER_NOT_FOUND` | Email not registered |
| 409 | `ALREADY_MEMBER` | User is already a member |

---

### DELETE `/workspaces/:id/members/:userId`

Remove a member from the workspace.

**Auth required:** Yes  
**Authorization:** Must be the workspace owner. Cannot remove self.

**Success response (200):**
```json
{
  "success": true,
  "data": { "message": "Member removed successfully" }
}
```

---

## Expenses

### POST `/expenses`

Create a new expense in draft status.

**Auth required:** Yes  
**Authorization:** Must be a `freelancer` member of the workspace

**Request body:**
```json
{
  "workspace_id": "uuid",
  "amount": 42.50,
  "currency": "USD",
  "merchant": "Office Depot",
  "date": "2026-05-20",
  "notes": "Printer paper and ink cartridges"
}
```

**Validation:**
| Field | Rules |
|-------|-------|
| `workspace_id` | Required, valid UUID, user must be a freelancer member |
| `amount` | Required, positive number, max 2 decimal places |
| `currency` | Required, ISO 4217 three-letter code (uppercase) |
| `merchant` | Required, 1–255 characters |
| `date` | Required, valid date format (YYYY-MM-DD) |
| `notes` | Optional, text |

**Success response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "workspace_id": "uuid",
    "created_by_user_id": "uuid",
    "amount": "42.50",
    "currency": "USD",
    "merchant": "Office Depot",
    "date": "2026-05-20",
    "notes": "Printer paper and ink cartridges",
    "status": "draft",
    "tags": [],
    "receipts": [],
    "created_at": "2026-05-26T12:00:00Z"
  }
}
```

---

### PATCH `/expenses/:id`

Update an expense. Only allowed when status is `draft` or `rejected`.

**Auth required:** Yes  
**Authorization:** Must be the expense creator

**Request body:** (All fields optional)
```json
{
  "amount": 45.00,
  "currency": "USD",
  "merchant": "Office Depot - Updated",
  "date": "2026-05-21",
  "notes": "Updated notes"
}
```

**Error responses:**
| Status | Code | Condition |
|--------|------|-----------|
| 403 | `FORBIDDEN` | Not the expense creator |
| 409 | `INVALID_STATUS` | Expense is not in `draft` or `rejected` status |

---

### GET `/expenses/:id`

Get full expense details including receipts, tags, and approval history.

**Auth required:** Yes  
**Authorization:** Must be a member of the expense's workspace

**Success response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "workspace_id": "uuid",
    "created_by_user_id": "uuid",
    "creator_name": "Jane Doe",
    "amount": "42.50",
    "currency": "USD",
    "merchant": "Office Depot",
    "date": "2026-05-20",
    "notes": "Printer paper and ink cartridges",
    "status": "submitted",
    "submitted_at": "2026-05-26T13:00:00Z",
    "approved_at": null,
    "rejected_at": null,
    "rejection_note": null,
    "tags": [
      { "id": "uuid", "name": "Office Supplies" }
    ],
    "receipts": [
      {
        "id": "uuid",
        "file_url": "https://res.cloudinary.com/...",
        "original_filename": "receipt.jpg",
        "ocr_raw_text": "Office Depot\n$42.50\n05/20/2026",
        "uploaded_at": "2026-05-26T12:30:00Z"
      }
    ],
    "created_at": "2026-05-26T12:00:00Z",
    "updated_at": "2026-05-26T13:00:00Z"
  }
}
```

---

### GET `/workspaces/:id/expenses`

List expenses in a workspace with filtering and pagination.

**Auth required:** Yes  
**Authorization:** Must be a member of the workspace

**Query parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status (comma-separated for multiple) |
| `date_from` | date | Filter expenses on or after this date |
| `date_to` | date | Filter expenses on or before this date |
| `tag` | string | Filter by tag name |
| `created_by` | uuid | Filter by creator user ID |
| `page` | integer | Page number (default 1) |
| `limit` | integer | Items per page (default 20, max 100) |
| `sort_by` | string | Sort field: `date`, `amount`, `created_at`, `status` (default: `created_at`) |
| `sort_order` | string | `asc` or `desc` (default: `desc`) |

**Example:** `GET /workspaces/{id}/expenses?status=submitted,approved&date_from=2026-05-01&sort_by=amount&sort_order=desc`

---

### POST `/expenses/:id/submit`

Submit a draft expense for approval. Sets status to `submitted`.

**Auth required:** Yes  
**Authorization:** Must be the expense creator  
**Precondition:** Status must be `draft` or `rejected`

**Request body:** None

**Validation before submit:**
- `amount`, `currency`, `merchant`, `date` must all be filled
- `date` cannot be in the future
- At least one receipt must be attached

**Success response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "submitted",
    "submitted_at": "2026-05-26T14:00:00Z"
  }
}
```

---

### POST `/expenses/:id/approve`

Approve a submitted expense. Sets status to `approved`.

**Auth required:** Yes  
**Authorization:** Must be a `client` member of the expense's workspace  
**Precondition:** Status must be `submitted`

**Request body:** (Optional)
```json
{
  "note": "Looks good, approved."
}
```

**Success response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "approved",
    "approved_at": "2026-05-26T15:00:00Z"
  }
}
```

---

### POST `/expenses/:id/reject`

Reject a submitted expense. Sets status to `rejected`.

**Auth required:** Yes  
**Authorization:** Must be a `client` member of the expense's workspace  
**Precondition:** Status must be `submitted`

**Request body:**
```json
{
  "note": "Receipt is blurry, please re-upload a clearer image."
}
```

**Validation:**
| Field | Rules |
|-------|-------|
| `note` | **Required**, min 1 character |

**Success response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "rejected",
    "rejected_at": "2026-05-26T15:00:00Z",
    "rejection_note": "Receipt is blurry, please re-upload a clearer image."
  }
}
```

---

### POST `/expenses/:id/mark-paid`

Mark an approved expense as paid. Sets status to `paid`.

**Auth required:** Yes  
**Authorization:** Must be the expense creator  
**Precondition:** Status must be `approved`

**Request body:** None

---

## Receipts

### POST `/expenses/:id/receipts`

Upload one or more receipt files to an expense.

**Auth required:** Yes  
**Authorization:** Must be the expense creator  
**Precondition:** Expense status must be `draft` or `rejected`  
**Content-Type:** `multipart/form-data`

**Request body:**
| Field | Type | Rules |
|-------|------|-------|
| `files` | File[] | Required, max 5 files per request |

**Per-file validation:**
- Max size: **10 MB**
- Accepted types: `image/jpeg`, `image/png`, `application/pdf`
- Duplicate detection via SHA-256 file hash (warns if duplicate in same expense)

**Success response (201):**
```json
{
  "success": true,
  "data": {
    "receipts": [
      {
        "id": "uuid",
        "file_url": "https://res.cloudinary.com/...",
        "original_filename": "receipt.jpg",
        "ocr_raw_text": "Office Depot\nStore #1234\n05/20/2026\nTotal: $42.50",
        "ocr_extracted": {
          "merchant": "Office Depot",
          "amount": 42.50,
          "date": "2026-05-20",
          "currency": "USD",
          "confidence": 0.85
        },
        "uploaded_at": "2026-05-26T12:30:00Z"
      }
    ]
  }
}
```

> OCR runs asynchronously after upload. The `ocr_extracted` field contains parsed suggestions.

---

### DELETE `/expenses/:id/receipts/:receiptId`

Remove a receipt from an expense.

**Auth required:** Yes  
**Authorization:** Must be the expense creator  
**Precondition:** Expense status must be `draft` or `rejected`

**Success response (200):**
```json
{
  "success": true,
  "data": { "message": "Receipt deleted successfully" }
}
```

---

## Tags

### POST `/expenses/:id/tags`

Add a tag to an expense.

**Auth required:** Yes  
**Authorization:** Must be the expense creator

**Request body:**
```json
{
  "name": "Travel"
}
```

**Validation:**
| Field | Rules |
|-------|-------|
| `name` | Required, 1–50 characters, trimmed |

**Error responses:**
| Status | Code | Condition |
|--------|------|-----------|
| 409 | `TAG_EXISTS` | Tag already exists on this expense |

---

### DELETE `/expenses/:id/tags/:tagId`

Remove a tag from an expense.

**Auth required:** Yes  
**Authorization:** Must be the expense creator

---

### GET `/tags/suggestions`

Get list of predefined and previously used tag names for autocomplete.

**Auth required:** Yes

**Success response (200):**
```json
{
  "success": true,
  "data": {
    "predefined": ["Travel", "Ads", "Software", "Office Supplies"],
    "recent": ["Meals", "Transportation", "Equipment"]
  }
}
```

---

## Summary

### GET `/workspaces/:id/summary`

Generate a reimbursement summary for a date range.

**Auth required:** Yes  
**Authorization:** Must be a member of the workspace

**Query parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `date_from` | date | Yes | Start date (inclusive) |
| `date_to` | date | Yes | End date (inclusive) |

**Success response (200):**
```json
{
  "success": true,
  "data": {
    "workspace_id": "uuid",
    "workspace_name": "Acme Corp Project",
    "date_from": "2026-05-01",
    "date_to": "2026-05-31",
    "total_amount": "1250.00",
    "currency_breakdown": {
      "USD": "1050.00",
      "EUR": "200.00"
    },
    "status_breakdown": {
      "draft": { "count": 2, "total": "150.00" },
      "submitted": { "count": 3, "total": "300.00" },
      "approved": { "count": 5, "total": "600.00" },
      "rejected": { "count": 1, "total": "50.00" },
      "paid": { "count": 2, "total": "150.00" }
    },
    "expenses": [
      {
        "id": "uuid",
        "merchant": "Office Depot",
        "amount": "42.50",
        "currency": "USD",
        "date": "2026-05-20",
        "status": "approved",
        "tags": ["Office Supplies"],
        "creator_name": "Jane Doe"
      }
    ],
    "generated_at": "2026-05-26T16:00:00Z"
  }
}
```

---

## Error Handling

### Standard Error Codes

| HTTP Status | Error Code | Description |
|------------|------------|-------------|
| 400 | `VALIDATION_ERROR` | Request body or params failed validation |
| 400 | `INVALID_STATUS` | Invalid status transition |
| 400 | `INVALID_RESET_TOKEN` | Password reset token expired or invalid |
| 401 | `UNAUTHORIZED` | Missing or invalid authentication |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password |
| 401 | `INVALID_REFRESH_TOKEN` | Refresh token expired or invalid |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `EMAIL_EXISTS` | Email already registered |
| 409 | `ALREADY_MEMBER` | User already a workspace member |
| 409 | `TAG_EXISTS` | Tag already on this expense |
| 409 | `DUPLICATE_RECEIPT` | Same file already uploaded to this expense |
| 413 | `FILE_TOO_LARGE` | File exceeds 10 MB limit |
| 415 | `UNSUPPORTED_FILE_TYPE` | File type not JPG, PNG, or PDF |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

### Rate Limits

| Endpoint Pattern | Limit |
|-----------------|-------|
| `POST /auth/login` | 5 requests per minute per IP |
| `POST /auth/register` | 3 requests per minute per IP |
| `POST /auth/forgot-password` | 3 requests per 15 minutes per IP |
| All other endpoints | 100 requests per minute per user |
