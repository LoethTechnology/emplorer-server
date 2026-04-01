# Contribution Guide

## Overview

Thank you for contributing to Emplorer.

This project is an open-source backend for a company reviews platform where users can review companies, and those reviews can also be reviewed and commented on. Contributions should strengthen that purpose by improving clarity, reliability, moderation support, and developer experience.

## Before you start

Before opening a pull request:

- check existing issues and pull requests for overlap
- open an issue first for large changes, new modules, or schema changes
- keep changes focused on a single problem where practical
- make sure your work aligns with the project's scope

## Development setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file with a valid database connection:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
```

3. Start the development server:

```bash
npm run start:dev
```

## Contribution areas

Useful contributions include:

- bug fixes
- test coverage improvements
- API and validation improvements
- Prisma schema and database workflow improvements
- moderation and review discussion features
- documentation and onboarding improvements

## Coding expectations

Please keep contributions consistent with the existing codebase:

- use NestJS patterns already present in the project
- keep Prisma schema changes deliberate and easy to review
- avoid unrelated refactors in the same pull request
- prefer small, readable changes over broad rewrites
- update documentation when behavior or setup changes

## Testing

Run the relevant checks before submitting:

```bash
npm run test
npm run test:e2e
```

If your change affects formatting or lint-sensitive files, also run:

```bash
npm run lint
```

If a test cannot reasonably be added, explain why in the pull request.

## Pull request guidance

A good pull request should:

- describe the problem being solved
- explain the approach taken
- note schema, API, or environment changes
- include tests or explain the testing performed
- stay narrowly scoped enough for review

## Commit guidance

Readable commit history helps maintain the project. Prefer commit messages that describe the change clearly and directly.

Examples:

- `add review comment vote validation`
- `fix prisma service initialization`
- `document local database setup`

## Community expectations

By participating in this project, you agree to follow the guidelines in [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).