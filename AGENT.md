# The Hive — Agent Context

## Project
Shared Expense Workspace for freelancers/clients to manage expense reimbursements with OCR receipt scanning.

## Stack
- **Frontend:** React 19 + Vite, React Router 6, react-hook-form, Axios, Lucide icons
- **Backend:** Node.js + Express (not yet built)
- **Database:** PostgreSQL 15+ (not yet built)
- **OCR:** Tesseract.js (not yet integrated — simulated in frontend only)
- **File Storage:** Cloudinary (not yet integrated)
- **Auth:** JWT (mock only in frontend)
- **Deployment:** Vercel (planned)

## Project Structure
```
client/             # React frontend (Vite)
  src/
    components/
      layout/       # AppShell, Sidebar, AuthLayout
      ui/           # Button, Input, Modal
      upload/       # NewExpenseModal
    pages/
      auth/         # Login, Signup, ForgotPassword
      Dashboard.jsx
      WorkspaceView.jsx
      ExpenseDetail.jsx
      SummaryView.jsx
    context/        # AuthContext, ToastContext
    styles/         # global.css, tokens.css
    App.jsx         # Routes
    main.jsx        # Entry point
server/             # NOT YET BUILT
docs/               # Architecture, API, DB, Security specs
```

## Design Tokens
- Colors defined as CSS custom properties in `client/src/styles/tokens.css`
- Typography uses **Space Grotesk** font with weight/size/line-height tokens
- Light mode default; dark mode via `@media (prefers-color-scheme: dark)`

## Key Conventions
- Components use scoped `<style>` blocks (no CSS modules or styled-components)
- Pages use `AppShell` layout wrapper (logged-in) or `AuthLayout` (auth screens)
- Auth state managed via `AuthContext` with `useAuth()` hook
- Toast notifications via `ToastContext` with `showToast()` hook
- Forms use `react-hook-form` with `register`, `handleSubmit`, `errors`
- Icons from `lucide-react`

## Available Scripts
- `cd client && npm run dev` — Start Vite dev server (port 5173)
- `cd client && npm run build` — Production build
- `cd client && npm run lint` — Lint with ESLint

## State of Build
- Frontend: MVP complete with mock data and simulated OCR
- Backend: Not started — no server/, no Express, no DB, no migrations
- Tests: None written yet
- Git: Not initialized

## Commands to Know
- Before editing, check design tokens in `tokens.css` for color/font variables
- Use `--color-*` CSS custom properties instead of hardcoded values
- Server routes should match patterns in `docs/API.md` when building backend
