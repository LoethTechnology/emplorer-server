# Emplorer

Emplorer is an open-source backend for a company reviews platform where users can review companies, and those reviews can also be reviewed and commented on. The goal is to make company feedback more transparent, more conversational, and easier to evaluate from multiple perspectives.

## Purpose

Most company review platforms flatten discussion into a single opinion stream. Emplorer is designed to support a more accountable model:

- users can publish reviews about companies
- reviews can be critiqued or reviewed by other users
- discussions can continue through comments and replies
- feedback can be moderated and structured instead of disappearing into isolated posts

This repository contains the server-side application that powers that workflow.

## What this backend includes

- company records with moderation status
- company reviews with publishing states
- review critiques for second-layer feedback
- threaded review comments and comment voting
- authentication module support
- PostgreSQL data access through Prisma

## Tech stack

- NestJS for the application framework
- Prisma ORM for schema and database access
- PostgreSQL as the primary database
- Jest for unit and end-to-end testing

## Project setup

### Prerequisites

- Node.js
- npm
- PostgreSQL database
- a `DATABASE_URL` environment variable

### Install dependencies

```bash
npm install
```

### Configure environment

Create a `.env` file and set your database connection string:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
```

## Compile and run the project

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run start:prod
```

## Run tests

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```

## Project structure

```text
src/
  modules/
    auth/        authentication endpoints and services
    reviews/     review-related endpoints and services
  shared/
    modules/
      prisma/    Prisma integration for database access
prisma/
  schema.prisma  application data model
```

## Community

- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Contribution Guide](./CONTRIBUTING.md)

## License

This project is licensed under the Apache License 2.0. See [LICENSE](/Users/macbookpro15/Desktop/projects/loeth/emplorer-server/LICENSE) for the full text.
