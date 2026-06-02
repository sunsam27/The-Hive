# Environment Setup — The Hive

This document provides a detailed breakdown of all environment variables used in The Hive, their purpose, and how to obtain them.

---

## Overview

The Hive uses environment variables to manage configuration across different environments (Development, Testing, Production). 

- **Backend (`/server`)**: Uses `.env` for local development and `.env.test` for running tests.
- **Frontend (`/client`)**: Uses `.env` or `.env.local` for local development.

> [!CAUTION]
> Never commit `.env` files to version control. They are ignored by `.gitignore`.

---

## Backend Environment Variables (`/server/.env`)

### 1. Application Configuration

| Variable | Requirement | Default | Description |
|----------|-------------|---------|-------------|
| `PORT` | Optional | `3001` | The port the Express server will listen on. |
| `NODE_ENV` | Required | `development`| Set to `development`, `test`, or `production`. |
| `FRONTEND_URL` | Required | `http://localhost:5173` | The URL of the frontend app (used for CORS and email links). |

### 2. Database (PostgreSQL)

| Variable | Requirement | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Required | `postgresql://user:password@localhost:5432/the_hive` |
| `DATABASE_URL_TEST` | Required (only for tests) | `postgresql://user:password@localhost:5432/the_hive_test` |

> In production (Vercel), ensure you append `?sslmode=require` if using Neon or Supabase.

### 3. Authentication (JWT)

| Variable | Requirement | Description |
|----------|-------------|-------------|
| `JWT_SECRET` | Required | A long, random string used to sign access tokens. |
| `JWT_REFRESH_SECRET` | Required | A long, random string used to sign refresh tokens. |
| `JWT_EXPIRES_IN` | Optional | e.g., `15m`. Default is `15m`. |
| `JWT_REFRESH_EXPIRES_IN`| Optional | e.g., `7d`. Default is `7d`. |

### 4. File Storage (Cloudinary)

Obtain these from your [Cloudinary Dashboard](https://console.cloudinary.com/).

| Variable | Requirement | Description |
|----------|-------------|-------------|
| `CLOUDINARY_CLOUD_NAME` | Required | Your unique Cloudinary cloud identifier. |
| `CLOUDINARY_API_KEY` | Required | Your API Key. |
| `CLOUDINARY_API_SECRET`| Required | Your API Secret. |

### 5. Email Service (Post-MVP or for Password Reset)

If implementing actual emails for password resets (otherwise logged to console in dev).

| Variable | Requirement | Description |
|----------|-------------|-------------|
| `SMTP_HOST` | Optional | e.g., `smtp.mailtrap.io` |
| `SMTP_PORT` | Optional | e.g., `2525` |
| `SMTP_USER` | Optional | Your SMTP username. |
| `SMTP_PASS` | Optional | Your SMTP password. |

---

## Frontend Environment Variables (`/client/.env`)

Vite requires frontend variables to be prefixed with `VITE_`.

| Variable | Requirement | Default | Description |
|----------|-------------|---------|-------------|
| `VITE_API_URL` | Required | `http://localhost:3001/api/v1` | The base URL of the backend API. |

---

## Setup Instructions

### 1. Backend

1. Navigate to the server directory: `cd server`
2. Copy the example file: `cp .env.example .env`
3. Generate secure secrets for JWT:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
4. Fill in your `DATABASE_URL` and Cloudinary credentials.

### 2. Frontend

1. Navigate to the client directory: `cd client`
2. Create/edit `.env`:
   ```env
   VITE_API_URL=http://localhost:3001/api/v1
   ```

---

## Vercel (Production) Setup

When deploying to Vercel, you must add these variables in the **Vercel Dashboard** under **Project Settings > Environment Variables**.

**Checklist:**
- [ ] `DATABASE_URL` (with `?sslmode=require`)
- [ ] `JWT_SECRET` (different from dev)
- [ ] `JWT_REFRESH_SECRET` (different from dev)
- [ ] `CLOUDINARY_CLOUD_NAME`
- [ ] `CLOUDINARY_API_KEY`
- [ ] `CLOUDINARY_API_SECRET`
- [ ] `FRONTEND_URL` (e.g., `https://the-hive.vercel.app`)
- [ ] `NODE_ENV=production`
