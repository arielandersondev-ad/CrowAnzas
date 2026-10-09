-- Offline migration: preserve existing expenses and assign their owner only when needed.
-- The original migration is intentionally unchanged. Do not run this SQL during setup.
BEGIN;

CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "User_name_nonblank" CHECK ("name" ~ '[^[:space:]]')
);

ALTER TABLE "Expense" ADD COLUMN "userId" UUID;

-- Protect the backfill from concurrent inserts while ownership is being made required.
LOCK TABLE "Expense" IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "Expense") THEN
        INSERT INTO "User" ("id", "name", "createdAt", "updatedAt")
        VALUES (
            '00000000-0000-4000-8000-000000000001'::uuid,
            'Personal',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        );

        UPDATE "Expense"
        SET "userId" = '00000000-0000-4000-8000-000000000001'::uuid
        WHERE "userId" IS NULL;
    END IF;
END;
$$;

ALTER TABLE "Expense" ALTER COLUMN "userId" SET NOT NULL;

CREATE INDEX "Expense_userId_date_createdAt_idx" ON "Expense"("userId", "date", "createdAt");

ALTER TABLE "Expense"
ADD CONSTRAINT "Expense_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
