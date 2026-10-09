import { todayInTimezone, isValidDate, moneyToCents, centsToMoney } from "@crowanzas/contracts";

export const TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE || "America/La_Paz";
export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || "Bs";

export function today(now = new Date()): string {
  return todayInTimezone(TIMEZONE, now);
}

export function validDate(date: string): boolean {
  return isValidDate(date);
}

export function dateLabel(date: string, short = false): string {
  if (!validDate(date)) return "Selecciona una fecha";
  const [year, month, day] = date.split("-").map(Number);
  const calendar = new Date(0);
  calendar.setFullYear(year, month - 1, day);
  calendar.setHours(12, 0, 0, 0);
  return new Intl.DateTimeFormat("es-BO", short
    ? { day: "numeric", month: "short", year: "numeric" }
    : { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(calendar);
}

export function money(amount: string): string {
  const [integer, decimals = "00"] = amount.split(".");
  return `${CURRENCY} ${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${decimals.padEnd(2, "0")}`;
}

export function cents(amount: string): bigint {
  return moneyToCents(amount);
}

export function decimal(value: bigint): string {
  return centsToMoney(value);
}
