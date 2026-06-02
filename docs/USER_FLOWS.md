# User Flows — The Hive

This document maps every critical user journey with flow diagrams, screen references, and API endpoint mappings.

---

## Flow 1: Authentication

### 1.1 Sign Up

```mermaid
flowchart TD
    A["Visit app URL"] --> B["Sign Up page"]
    B --> C["Enter name, email, password"]
    C --> D{"Validation passes?"}
    D -->|No| E["Show field errors"]
    E --> C
    D -->|Yes| F["POST /auth/register"]
    F --> G{"Email unique?"}
    G -->|No| H["Show 'email already registered'"]
    H --> C
    G -->|Yes| I["Store tokens, redirect to Dashboard"]
```

| Step | Screen | API Endpoint |
|------|--------|-------------|
| Enter credentials | Sign Up page | — |
| Submit form | Sign Up page | `POST /auth/register` |
| Success | → Dashboard | — |

---

### 1.2 Login

```mermaid
flowchart TD
    A["Visit app URL"] --> B["Login page"]
    B --> C["Enter email + password"]
    C --> D["POST /auth/login"]
    D --> E{"Credentials valid?"}
    E -->|No| F["Show 'Invalid credentials'"]
    F --> C
    E -->|Yes| G["Store access token in memory"]
    G --> H["Set refresh token cookie"]
    H --> I["Redirect to Dashboard"]
```

---

### 1.3 Password Reset

```mermaid
flowchart TD
    A["Login page"] --> B["Click 'Forgot Password'"]
    B --> C["Forgot Password page"]
    C --> D["Enter email"]
    D --> E["POST /auth/forgot-password"]
    E --> F["Show 'Check your email' message"]
    F --> G["User clicks link in email"]
    G --> H["Reset Password page"]
    H --> I["Enter new password"]
    I --> J["POST /auth/reset-password"]
    J --> K{"Token valid?"}
    K -->|No| L["Show 'Token expired' error"]
    L --> C
    K -->|Yes| M["Show 'Password reset successful'"]
    M --> N["Redirect to Login page"]
```

---

## Flow 2: Workspace Management

### 2.1 Create Workspace

```mermaid
flowchart TD
    A["Dashboard"] --> B["Click 'New Workspace'"]
    B --> C["Enter workspace name"]
    C --> D["POST /workspaces"]
    D --> E["Workspace created"]
    E --> F["Creator auto-added as Freelancer"]
    F --> G["Redirect to Workspace View"]
```

| Step | Screen | API |
|------|--------|-----|
| Click new workspace | Dashboard | — |
| Enter name | Modal / inline form | `POST /workspaces` |
| View workspace | Workspace View | `GET /workspaces/:id` |

---

### 2.2 Invite Member

```mermaid
flowchart TD
    A["Workspace View"] --> B["Click 'Invite Member'"]
    B --> C["Enter email + select role"]
    C --> D["POST /workspaces/:id/invite"]
    D --> E{"User exists?"}
    E -->|No| F["Show 'User not found' error"]
    F --> C
    E -->|Yes| G{"Already a member?"}
    G -->|Yes| H["Show 'Already a member' error"]
    H --> C
    G -->|No| I["Member added to workspace"]
    I --> J["Member list refreshed"]
```

---

### 2.3 Remove Member

```mermaid
flowchart TD
    A["Workspace View → Member List"] --> B["Click 'Remove' on member"]
    B --> C["Confirm removal dialog"]
    C --> D{"Confirmed?"}
    D -->|No| E["Cancel"]
    D -->|Yes| F["DELETE /workspaces/:id/members/:userId"]
    F --> G["Member removed instantly"]
    G --> H["Their access revoked"]
    H --> I["Existing expenses remain (read-only for others)"]
```

---

## Flow 3: Expense Upload (Critical Path)

This is the primary user journey and must be completable in ≤ 60 seconds.

```mermaid
flowchart TD
    A["Dashboard or Workspace View"] --> B["Click 'New Expense'"]
    B --> C["Upload Modal opens"]
    C --> D["Drag & drop or select receipt file(s)"]
    D --> E["POST /expenses (create draft)"]
    E --> F["POST /expenses/:id/receipts (upload file)"]
    F --> G{"Upload successful?"}
    G -->|No| H["Show retry button (form data preserved)"]
    H --> D
    G -->|Yes| I["OCR processes receipt"]
    I --> J{"OCR extracted data?"}
    J -->|Full| K["Auto-fill amount, merchant, date, currency"]
    J -->|Partial| L["Auto-fill what's found, highlight missing fields"]
    J -->|Failed| M["All fields empty, prompt manual entry"]
    K --> N["User reviews and edits fields"]
    L --> N
    M --> N
    N --> O["Add tags (optional)"]
    O --> P["POST /expenses/:id/tags"]
    P --> Q["Click 'Submit'"]
    Q --> R{"All required fields filled?"}
    R -->|No| S["Highlight missing fields"]
    S --> N
    R -->|Yes| T["POST /expenses/:id/submit"]
    T --> U["Status → Submitted"]
    U --> V["Success confirmation shown"]
    V --> W["Redirect to Workspace View"]
```

### Screen: Upload Modal

```
┌─────────────────────────────────────────────┐
│  New Expense                           [×]  │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │     📁 Drop receipt here            │    │
│  │     or click to browse              │    │
│  │     JPG, PNG, PDF (max 10 MB)       │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [receipt-preview.jpg]  ← OCR processing... │
│                                             │
│  Amount:    [$] [42.50    ]  Currency: [USD] │
│  Merchant:  [Office Depot              ]    │
│  Date:      [2026-05-20               ]    │
│  Notes:     [Printer supplies          ]    │
│                                             │
│  Tags:  [Office Supplies] [+Add tag]        │
│                                             │
│  [Cancel]                    [Save Draft]   │
│                              [Submit →]     │
└─────────────────────────────────────────────┘
```

### Timing Targets

| Step | Target | Measured By |
|------|--------|------------|
| File upload | ≤ 5 seconds | Time from file select to preview shown |
| OCR processing | ≤ 10 seconds | Time from upload complete to fields populated |
| Total flow (new user) | ≤ 60 seconds | Time from clicking "New Expense" to "Submitted" |

---

## Flow 4: Approval (Critical Path)

### 4.1 Client Approves Expense

```mermaid
flowchart TD
    A["Client logs in"] --> B["Dashboard shows pending approvals"]
    B --> C["Click on workspace"]
    C --> D["Workspace View: filter by 'Submitted'"]
    D --> E["Click on expense"]
    E --> F["Expense Detail Page"]
    F --> G["Review receipt preview"]
    G --> H["Review amount, merchant, date, tags"]
    H --> I{"Decision?"}
    I -->|Approve| J["Click 'Approve'"]
    J --> K["POST /expenses/:id/approve"]
    K --> L["Status → Approved"]
    L --> M["Success notification"]
    I -->|Reject| N["Click 'Reject'"]
    N --> O["Rejection note modal"]
    O --> P["Enter reason (required)"]
    P --> Q["POST /expenses/:id/reject"]
    Q --> R["Status → Rejected"]
    R --> S["Freelancer sees rejection + note"]
```

### Screen: Expense Detail (Client View)

```
┌─────────────────────────────────────────────┐
│  ← Back to Workspace    Expense #EXP-0042  │
├──────────────────┬──────────────────────────┤
│                  │                          │
│  [Receipt Image  │  Merchant: Office Depot  │
│   Preview with   │  Amount:   $42.50 USD    │
│   zoom support]  │  Date:     May 20, 2026  │
│                  │  Status:   ● Submitted   │
│                  │  Tags:     Office Supplies│
│                  │                          │
│                  │  Submitted by: Jane Doe  │
│                  │  on May 26, 2026 at 2pm  │
│                  │                          │
│                  │  Notes:                  │
│                  │  "Printer paper and ink"  │
│                  │                          │
├──────────────────┴──────────────────────────┤
│                                             │
│  [❌ Reject]                   [✅ Approve] │
│                                             │
└─────────────────────────────────────────────┘
```

---

### 4.2 Freelancer Resubmits Rejected Expense

```mermaid
flowchart TD
    A["Freelancer sees 'Rejected' expense"] --> B["Rejection note is visible"]
    B --> C["Click 'Edit'"]
    C --> D["Modify fields based on feedback"]
    D --> E["PATCH /expenses/:id"]
    E --> F["Optionally upload new receipt"]
    F --> G["Click 'Resubmit'"]
    G --> H["POST /expenses/:id/submit"]
    H --> I["Status → Submitted (again)"]
    I --> J["Client sees resubmitted expense"]
```

---

## Flow 5: Summary Generation (Critical Path)

```mermaid
flowchart TD
    A["Workspace View"] --> B["Click 'Summary' tab"]
    B --> C["Summary View"]
    C --> D["Select date range (from/to)"]
    D --> E["GET /workspaces/:id/summary?date_from=...&date_to=..."]
    E --> F["Display total amount"]
    F --> G["Display status breakdown"]
    G --> H["Display expense table"]
    H --> I{"Export?"}
    I -->|Copy| J["Copy summary as plain text"]
    I -->|Share| K["Copy summary as table"]
    I -->|No| L["Done"]
```

### Screen: Summary View

```
┌─────────────────────────────────────────────┐
│  Reimbursement Summary                      │
│  Workspace: Acme Corp Project               │
├─────────────────────────────────────────────┤
│                                             │
│  Date Range: [May 1, 2026] → [May 31, 2026]│
│                                             │
│  ┌──────────────────────────────────┐       │
│  │  Total: $1,250.00                │       │
│  │  ┌────────┬───────┬──────────┐   │       │
│  │  │Approved│  $600 │ 5 items  │   │       │
│  │  │Pending │  $300 │ 3 items  │   │       │
│  │  │Draft   │  $150 │ 2 items  │   │       │
│  │  │Rejected│   $50 │ 1 item   │   │       │
│  │  │Paid    │  $150 │ 2 items  │   │       │
│  │  └────────┴───────┴──────────┘   │       │
│  └──────────────────────────────────┘       │
│                                             │
│  ┌──────┬──────────┬───────┬────────┬────┐  │
│  │ Date │ Merchant │Amount │ Status │Tags│  │
│  ├──────┼──────────┼───────┼────────┼────┤  │
│  │05/20 │Office D. │$42.50 │Approved│ OS │  │
│  │05/18 │AWS       │$99.00 │Approved│ SW │  │
│  │05/15 │Uber      │$25.00 │Pending │ TR │  │
│  └──────┴──────────┴───────┴────────┴────┘  │
│                                             │
│  [📋 Copy as Text]    [📊 Copy as Table]    │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Flow 6: Dashboard Overview

```mermaid
flowchart TD
    A["User logs in"] --> B["Dashboard"]
    B --> C["Show metrics cards"]
    C --> D["Total Submitted: X"]
    C --> E["Total Approved: Y"]
    C --> F["Total Pending: Z"]
    C --> G["Total Reimbursed: $N"]
    B --> H["Show recent expenses list"]
    H --> I["Click expense → Expense Detail"]
    B --> J["Show workspace list"]
    J --> K["Click workspace → Workspace View"]
```

---

## Flow → Screen → API Mapping

| Flow | Screen(s) | API Endpoints |
|------|-----------|--------------|
| Sign Up | Sign Up page | `POST /auth/register` |
| Login | Login page | `POST /auth/login` |
| Password Reset | Forgot Password, Reset Password | `POST /auth/forgot-password`, `POST /auth/reset-password` |
| Dashboard | Dashboard | `GET /workspaces`, aggregate stats |
| Create Workspace | Dashboard (modal) | `POST /workspaces` |
| Invite Member | Workspace View (modal) | `POST /workspaces/:id/invite` |
| Upload Expense | Upload Modal | `POST /expenses`, `POST /expenses/:id/receipts`, `POST /expenses/:id/tags`, `POST /expenses/:id/submit` |
| Edit Expense | Upload Modal / Expense Detail | `PATCH /expenses/:id` |
| Approve Expense | Expense Detail | `POST /expenses/:id/approve` |
| Reject Expense | Expense Detail | `POST /expenses/:id/reject` |
| Resubmit Expense | Expense Detail | `PATCH /expenses/:id`, `POST /expenses/:id/submit` |
| Generate Summary | Summary View | `GET /workspaces/:id/summary` |
| View Expenses | Workspace View | `GET /workspaces/:id/expenses` |
| View Expense Detail | Expense Detail | `GET /expenses/:id` |
