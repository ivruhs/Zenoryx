-- Zenoryx v2: pipeline stages, repo metadata, chunk line ranges, persisted chat.
-- Written with IF NOT EXISTS so it is safe on databases that were partially
-- synced with `prisma db push` (e.g. processedCount).

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "projects"
  ADD COLUMN IF NOT EXISTS "processedCount"  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "attempts"        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "chunkCount"      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "totalFiles"      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "stage"           TEXT,
  ADD COLUMN IF NOT EXISTS "commitSha"       TEXT,
  ADD COLUMN IF NOT EXISTS "defaultBranch"   TEXT,
  ADD COLUMN IF NOT EXISTS "description"     TEXT,
  ADD COLUMN IF NOT EXISTS "primaryLanguage" TEXT,
  ADD COLUMN IF NOT EXISTS "stars"           INTEGER,
  ADD COLUMN IF NOT EXISTS "startedAt"       TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "completedAt"     TIMESTAMP(3);

ALTER TABLE "code_chunks"
  ADD COLUMN IF NOT EXISTS "language"  TEXT,
  ADD COLUMN IF NOT EXISTS "symbol"    TEXT,
  ADD COLUMN IF NOT EXISTS "nodeType"  TEXT,
  ADD COLUMN IF NOT EXISTS "startLine" INTEGER,
  ADD COLUMN IF NOT EXISTS "endLine"   INTEGER;

ALTER TABLE "commits"
  ADD COLUMN IF NOT EXISTS "additions" INTEGER,
  ADD COLUMN IF NOT EXISTS "deletions" INTEGER;

CREATE TABLE IF NOT EXISTS "chat_messages" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sources" JSONB,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "chat_messages_projectId_createdAt_idx" ON "chat_messages"("projectId", "createdAt");
CREATE INDEX IF NOT EXISTS "projects_status_idx" ON "projects"("status");

DO $$ BEGIN
  ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Legacy rows: mark already-finished projects as done so the UI renders them correctly.
UPDATE "projects" SET "stage" = 'done' WHERE "status" = 'READY' AND "stage" IS NULL;
UPDATE "projects" p SET "chunkCount" = sub.c
  FROM (SELECT "projectId", COUNT(*)::int c FROM "code_chunks" GROUP BY 1) sub
  WHERE sub."projectId" = p."id" AND p."chunkCount" = 0;
