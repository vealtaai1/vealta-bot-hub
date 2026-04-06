import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function makeClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  // Next.js can import route modules at build time (during "Collecting page data").
  // If DATABASE_URL isn't set in that environment, avoid constructing PrismaClient.
  // Instead, return a stub that throws only if/when you actually try to query.
  if (!connectionString) {
    return new Proxy(
      {},
      {
        get() {
          throw new Error(
            "PrismaClient is unavailable because DATABASE_URL is not set. " +
              "This is expected during build-time in some environments. " +
              "Set DATABASE_URL (and run migrations) to use database-backed routes."
          );
        },
      }
    ) as unknown as PrismaClient;
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

export const prisma: PrismaClient = global.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
