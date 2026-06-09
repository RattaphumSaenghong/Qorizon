# ⚠️ ARCHIVED — historical reference only

This is the original **Supabase BaaS** schema (raw SQL: tables, RLS policies,
triggers, the `fork_trip` function, seed). It is **no longer used**.

The backend was migrated to a self-owned **NestJS API** (`api/`) with **Prisma**
owning the schema. All of the logic that used to live in this SQL now lives in
TypeScript services:

| Old (this folder) | New home |
|---|---|
| `migrations/*_schema.sql` | `api/prisma/schema.prisma` (+ Prisma migrations) |
| `migrations/*_rls.sql` (RLS) | `api/src/authz/policy.service.ts` + guards |
| `migrations/*_functions_triggers.sql` (counters, fork) | service-layer Prisma transactions in `api/src/modules/*` |
| `seed.sql` | `api/prisma/seed.ts` |

See `BACKEND_ARCHITECTURE.md` and `PROGRESS.md` at the repo root for the full story.
Kept only for reference / git history. Safe to delete once you're confident.
