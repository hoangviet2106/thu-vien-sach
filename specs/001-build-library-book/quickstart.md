# Quickstart: University Library Book Management System

## Prerequisites

- Node.js 20.x
- npm 10+
- PostgreSQL 16
- OpenSSL (for RS256 key pair generation)

## 1. Install Dependencies

```bash
npm install
```

## 2. Configure Environment

Create `.env` with:

```env
NODE_ENV=development
PORT=3000
API_PREFIX=/api/v1
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/library_db
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----..."
JWT_ACCESS_TTL=15m
```

Generate RSA keys:

```bash
openssl genpkey -algorithm RSA -out jwt-private.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in jwt-private.pem -out jwt-public.pem
```

## 3. Database Setup

```bash
npx prisma migrate dev --name init
npx prisma generate
```

Optional seed:

```bash
npm run db:seed
```

## 4. Run In Development

```bash
npm run dev
```

Health check:

```bash
curl http://localhost:3000/api/v1/health
```

## 5. Run Tests

```bash
npm run test
npm run test:coverage
```

Expected quality gate:
- Service layer coverage >= 80% lines and >= 80% branches.

## 6. Sample API Flow

1. Login as librarian to get JWT.
2. Create book via `POST /api/v1/books`.
3. Login as student to get JWT.
4. Borrow book via `POST /api/v1/loans`.
5. Return book via `POST /api/v1/loans/{loanId}/return`.
6. Verify fee and status via `GET /api/v1/students/me/loans`.

## 7. Error Contract

All non-2xx errors must return:

```json
{
  "error_code": "SOME_STABLE_CODE",
  "message": "Human-readable explanation"
}
```
