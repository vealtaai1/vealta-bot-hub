# PM Hub

Next.js app with a PostgreSQL database managed by Prisma.

## Setup

```bash
npm install
```

### Environment variables

Prisma uses two connection strings:

- `DATABASE_URL` — the **runtime** connection string (can be pooled / PgBouncer)
- `DIRECT_URL` — a **direct/non-pooled** connection string used by Prisma **migrations** (`directUrl`)

If you are not using a pooler, you can set `DIRECT_URL` equal to `DATABASE_URL`.

Example:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require"
```

## Local development

Run migrations and generate the client:

```bash
npx prisma migrate dev
npx prisma generate
```

Start the dev server:

```bash
npm run dev
```

Open <http://localhost:3000>.

## Deployment notes

- Ensure both `DATABASE_URL` and `DIRECT_URL` are configured in your deploy environment.
  - `DATABASE_URL` may point at your pooler.
  - `DIRECT_URL` should be a direct DB connection (no pooler) so `prisma migrate deploy` can run reliably.

Apply migrations during deploy (or in a release step):

```bash
npx prisma migrate deploy
```
