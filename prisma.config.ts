import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // Migration URL: use DIRECT_URL (non-pooled) for Neon/PgBouncer compatibility.
  // Falls back to DATABASE_URL when DIRECT_URL is not set (local dev).
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
