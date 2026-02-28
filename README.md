# T-Shirt Store API

NestJS + GraphQL + Prisma e-commerce API.

## Tech Stack

- **Runtime**: Node.js + TypeScript (ESM)
- **Framework**: NestJS 11
- **API**: GraphQL (Apollo Server v5) · REST docs via Swagger
- **ORM**: Prisma v7 + PostgreSQL 17
- **Queue**: BullMQ + Redis 7
- **Auth**: JWT (access + refresh tokens)
- **Payments**: Stripe
- **Email**: SendGrid
- **Storage**: AWS S3

---
## Testing Coverage

<img width="1236" height="903" alt="Captura de pantalla 2026-02-27 231232" src="https://github.com/user-attachments/assets/a0ecd9b9-7f88-4e85-9a4d-9cacca25823d" />

## Prerequisites

- Node.js >= 20
- Docker + Docker Compose
- npm

---

## 1. Clone & Install

```bash
git clone <repo-url>
cd tshirt-store-nerdery-fc
npm install
```

---

## 2. Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | Port the server listens on (default `3000`) |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens |
| `JWT_ACCESS_EXPIRES_IN` | Access token TTL (e.g. `60s`) |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL (e.g. `7d`) |
| `SENDGRID_API_KEY` | SendGrid API key for transactional emails |
| `SENDGRID_FROM_EMAIL` | Verified sender email address |
| `PASSWORD_RESET_TTL` | Password reset token TTL (e.g. `15m`) |
| `AWS_S3_BUCKET_NAME` | S3 bucket name for image uploads |
| `AWS_REGIONS` | AWS region of the bucket (e.g. `us-east-1`) |
| `AWS_ACCESS_KEY_ID` | AWS IAM access key |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_...`) |
| `REDIS_HOST` | Redis host (default `localhost`) |
| `REDIS_PORT` | Redis port (default `6379`) |

For local development the `DATABASE_URL` matching the Docker Compose config is:

```
DATABASE_URL="postgresql://postgres:nerdery_2026@localhost:5432/tshirt_store_nerderydb"
```

---

## 3. Start Infrastructure (Docker)

Starts PostgreSQL 17 and Redis 7:

```bash
docker compose up -d
```

---

## 4. Database Setup

```bash
# Generate the Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed initial data
npm run prisma:seed
```

---

## 5. Run the Server

```bash
# Development (watch mode)
npm run start:dev

# Production
npm run build
npm run start:prod
```

---

## 6. Stripe Webhook (local)

To receive Stripe events locally, forward them using the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/webhook
```

Copy the printed `whsec_...` value into `STRIPE_WEBHOOK_SECRET` in your `.env`.

---

## API Access

| Interface | URL |
|---|---|
| GraphQL Playground | `http://localhost:3000/graphql` |
| Swagger (REST docs) | `http://localhost:3000/api/docs` |
