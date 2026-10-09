/** Canonical transport types. Amounts are decimal strings; dates are calendar days. */
export interface User {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUser {
  name: string;
}

export interface Expense {
  id: string;
  userId: string;
  name: string;
  amount: string;
  quantity: number;
  date: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseWithUser extends Expense {
  user: User;
}

/** Owner comes from /api/users/:userId/expenses, never from this request body. */
export interface CreateExpense {
  name: string;
  amount: string;
  quantity: number;
  date?: string;
  description?: string;
}

export interface DailySummary {
  userId: string;
  date: string;
  total: string;
  count: number;
  expenses: Expense[];
}

export interface UsersDailySummary {
  date: string;
  total: string;
  count: number;
  users: Array<{ user: User; total: string; count: number }>;
}

export interface HealthResponse {
  status: "ok";
  storage: "memory" | "prisma";
}

export const DEFAULT_TIMEZONE = "America/La_Paz";
export const MAX_AMOUNT = "9999999999.99";
export const MAX_QUANTITY = 1_000_000;
export const MAX_NAME_LENGTH = 120;
export const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_AMOUNT_CENTS = 999_999_999_999n;

/** Syntactic precision check. Positive/range validation is applied to expense input. */
export function moneyToCents(amount: string): bigint {
  if (typeof amount !== "string" || !/^\d{1,10}(?:\.\d{1,2})?$/.test(amount)) {
    throw new RangeError("El valor debe ser un decimal con un máximo de dos decimales.");
  }
  const [whole = "0", fraction = ""] = amount.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

export function centsToMoney(cents: bigint): string {
  const sign = cents < 0n ? "-" : "";
  const absolute = cents < 0n ? -cents : cents;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
}

export function normalizeAmount(amount: string): string {
  const cents = moneyToCents(amount);
  if (cents <= 0n || cents > MAX_AMOUNT_CENTS) {
    throw new RangeError(`El valor debe ser mayor a cero y no superar ${MAX_AMOUNT}.`);
  }
  return centsToMoney(cents);
}

/** Cost is already the registered expense total: never multiply it by quantity. */
export function sumAmounts(amounts: Iterable<string>): string {
  let cents = 0n;
  for (const amount of amounts) cents += moneyToCents(amount);
  return centsToMoney(cents);
}

export function isValidDate(date: unknown): date is string {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= (days[month - 1] ?? 0);
}

/** Uses calendar parts in the configured timezone; never slice a UTC ISO timestamp. */
export function todayInTimezone(timeZone = DEFAULT_TIMEZONE, now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export type ExpenseField = keyof CreateExpense;
export type ExpenseValidationErrors = Partial<Record<ExpenseField, string>>;

export class ExpenseValidationError extends Error {
  constructor(public readonly errors: ExpenseValidationErrors) {
    super(Object.values(errors).join(" "));
    this.name = "ExpenseValidationError";
  }
}

export type UserField = keyof CreateUser;
export type UserValidationErrors = Partial<Record<UserField, string>>;

export class UserValidationError extends Error {
  constructor(public readonly errors: UserValidationErrors) {
    super(Object.values(errors).join(" "));
    this.name = "UserValidationError";
  }
}

/** Name-only profile input, following the same field-error convention as expenses. */
export function validateCreateUser(input: unknown): CreateUser {
  const body = input && typeof input === "object" && !Array.isArray(input)
    ? input as Record<string, unknown> : {};
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > MAX_NAME_LENGTH) {
    throw new UserValidationError({ name: "Escribe un nombre de hasta 120 caracteres." });
  }
  return { name };
}

/** Validates unknown transport input and returns a trimmed, normalized payload. */
export function validateCreateExpense(input: unknown): CreateExpense {
  const body = input && typeof input === "object" && !Array.isArray(input)
    ? input as Record<string, unknown> : {};
  const errors: ExpenseValidationErrors = {};
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > MAX_NAME_LENGTH) errors.name = "Escribe un nombre de hasta 120 caracteres.";
  let amount = "";
  try { amount = normalizeAmount(body.amount as string); }
  catch (error) { errors.amount = (error as Error).message; }
  if (typeof body.quantity !== "number" || !Number.isInteger(body.quantity) || body.quantity < 1 || body.quantity > MAX_QUANTITY) {
    errors.quantity = `La cantidad debe ser un entero entre 1 y ${MAX_QUANTITY}.`;
  }
  if (body.date !== undefined && !isValidDate(body.date)) errors.date = "Selecciona una fecha válida (AAAA-MM-DD).";
  if (body.description !== undefined && (typeof body.description !== "string" || body.description.length > MAX_DESCRIPTION_LENGTH)) {
    errors.description = "La descripción debe tener hasta 1000 caracteres.";
  }
  if (Object.keys(errors).length) throw new ExpenseValidationError(errors);
  return {
    name, amount, quantity: body.quantity as number,
    ...(body.date !== undefined ? { date: body.date as string } : {}),
    ...(body.description !== undefined ? { description: (body.description as string).trim() } : {}),
  };
}
