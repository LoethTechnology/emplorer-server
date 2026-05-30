# CLAUDE.md

This file provides project context and guidance for AI assistants working in this codebase.

## Project Overview

**Emplorer** is an open-source NestJS backend for a company reviews platform with a multi-layered feedback model:

- Users publish reviews about companies
- Reviews can be critiqued by other users (second-layer feedback)
- Threaded comments and comment voting for discussion
- Content moderation with structured feedback lifecycle
- Goal: make company feedback transparent, conversational, and multi-perspective

## Tech Stack

| Layer            | Technology                          |
| ---------------- | ----------------------------------- |
| Framework        | NestJS v11                          |
| Language         | TypeScript (ES2023)                 |
| ORM              | Prisma v7                           |
| Database         | PostgreSQL                          |
| Auth             | JWT + Passport.js + LinkedIn OAuth2 |
| Password hashing | Argon2                              |
| Email            | Resend                              |
| Image storage    | Cloudinary                          |
| Rate limiting    | NestJS Throttler                    |
| Security headers | Helmet                              |
| Validation       | class-validator + class-transformer |
| Testing          | Jest + Supertest                    |

## Key Commands

```bash
# Development
npm run start:dev       # Watch mode with hot reload
npm run start:debug     # Debug mode
npm run start:prod      # Production (requires build first)
npm run build           # Compile TypeScript to dist/

# Code Quality
npm run lint            # Fix ESLint issues
npm run lint:check      # Check without fixing (max-warnings=0)
npm run format          # Format with Prettier
npm run format:check    # Check formatting only
npm run typecheck       # TypeScript validation only

# Testing
npm run test            # Unit tests
npm run test:watch      # Watch mode
npm run test:cov        # Coverage report
npm run test:e2e        # End-to-end tests

# Database
npx prisma migrate dev  # Run migrations in development
npx prisma generate     # Regenerate Prisma client
npx prisma studio       # Open Prisma Studio GUI
```

## Project Structure

```
src/
├── modules/              # Feature modules (business logic)
│   ├── auth/             # Authentication: JWT, LinkedIn OAuth, password reset
│   ├── companies/        # Company records and management
│   ├── reviews/          # Company reviews (CRUD, status lifecycle)
│   ├── critiques/        # Second-layer feedback on reviews
│   ├── comments/         # Threaded comments on reviews
│   ├── locations/        # Company location management
│   ├── user/             # User profiles
│   ├── public/           # Unauthenticated public endpoints
│   └── company/          # Company utilities/helpers
├── shared/
│   ├── modules/
│   │   ├── prisma/       # Global PrismaService
│   │   ├── mail/         # MailService (Resend)
│   │   └── cloudinary/   # CloudinaryService
│   ├── types/            # Shared TypeScript types
│   ├── dtos/             # Base DTOs (pagination, base queries)
│   └── utils/            # Response formatters, pagination helpers
├── app.module.ts         # Root module
└── main.ts               # Entry point (Helmet, CORS, validation pipe)
prisma/
├── schema.prisma         # Database schema
└── migrations/           # Migration history
```

## Environment Variables

Copy `.env.example` to `.env` and populate:

```env
# Required
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
JWT_SECRET="replace-with-a-long-random-secret"
USER_DATA_ENCRYPTION_KEY="replace-with-a-separate-long-random-secret"
PASSWORD_RESET_OTP_TTL_MINUTES="10"
PASSWORD_RESET_OTP_MAX_ATTEMPTS="5"

# Optional (with defaults)
PORT="3000"
CORS_ORIGIN="*"
JWT_EXPIRES_IN="1d"

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=""
LINKEDIN_CLIENT_SECRET=""
LINKEDIN_CALLBACK_URL=""
```

> User first/last names are encrypted at rest using `USER_DATA_ENCRYPTION_KEY`.

## Database Schema — Core Models

| Model              | Purpose                                                                       |
| ------------------ | ----------------------------------------------------------------------------- |
| `user`             | Auth, profile, soft-delete (`deleted_at`)                                     |
| `oauth_account`    | OAuth provider linking (LinkedIn, extensible)                                 |
| `tokens`           | Refresh token storage                                                         |
| `auth_otp`         | OTPs for password reset, email verification                                   |
| `company`          | Company records with moderation status (`PENDING/APPROVED/REJECTED/ARCHIVED`) |
| `company_location` | Multi-location support per company                                            |
| `company_review`   | Reviews with status lifecycle (`DRAFT/PUBLISHED/HIDDEN/REMOVED`)              |
| `review_critique`  | Second-layer feedback on reviews                                              |
| `review_comment`   | Threaded comments (parent-child)                                              |
| `comment_vote`     | Comment helpfulness voting (`HELPFUL/NOT_HELPFUL`)                            |

**Key patterns:**

- CUID primary keys on all models
- Composite indexes for common query patterns (e.g., `company_id + status`)
- Cascade deletes for referential integrity
- Soft deletes on `user` model only

## Authentication

**JWT Strategy** — Bearer token from `Authorization` header; payload contains `sub` (user ID); expires per `JWT_EXPIRES_IN`.

**LinkedIn OAuth** — Scopes: `openid profile email`. Upserts `oauth_account` on each login; updates tokens if account already exists.

**Password Reset Flow:**

1. POST `/auth/forgot-password` with email → OTP generated, hashed with Argon2, emailed
2. POST `/auth/reset-password` with OTP → verifies hash, expiry, and attempt count → updates password

**Global guards/interceptors:**

- Global `ThrottlerGuard` (10 requests / 60 seconds)
- Global user context interceptor (injects current user into requests)

## Testing Conventions

- Unit test files: `*.spec.ts`, co-located with implementation in `src/`
- E2E test files: `*.e2e-spec.ts` in `test/`
- Use NestJS `@nestjs/testing` and Supertest for HTTP assertions
- Path aliases in tests: `@modules/*` → `src/modules/*`, `@shared/*` → `src/shared/*`

## Code Conventions

- **Strict TypeScript** — avoid `any` where possible (ESLint allows it but it's discouraged)
- **No floating promises** — always `await` or handle promise chains
- **DTOs** for all request validation using `class-validator` decorators
- **Shared DTOs** for pagination and common query params live in `src/shared/dtos/`
- **Response format** — use shared response formatter utilities from `src/shared/utils/`
- **Prettier** enforces formatting; run `npm run format` before committing
- **Husky + lint-staged** — linting and formatting run automatically on pre-commit
