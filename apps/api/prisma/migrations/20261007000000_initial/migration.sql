CREATE TABLE "Expense" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "description" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Expense_amount_positive" CHECK ("amount" > 0),
    CONSTRAINT "Expense_quantity_positive" CHECK ("quantity" > 0),
    CONSTRAINT "Expense_name_nonblank" CHECK ("name" ~ '[^[:space:]]')
);

CREATE INDEX "Expense_date_createdAt_idx" ON "Expense"("date", "createdAt");
