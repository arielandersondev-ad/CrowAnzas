import { ExpenseValidationError, validateCreateExpense, type CreateExpense } from "@crowanzas/contracts";
import { validDate } from "./format";

export type FormFields = { name: string; amount: string; quantity: string; date: string; description: string };
export type FieldErrors = Partial<Record<keyof FormFields, string>>;

export function validateForm(fields: FormFields): { errors: FieldErrors; value?: CreateExpense } {
  const errors: FieldErrors = {};
  const name = fields.name.trim();
  const amount = fields.amount.trim().replace(",", ".");
  const description = fields.description.trim();
  const quantity = Number(fields.quantity);
  if (!/^\d+$/.test(fields.quantity)) {
    errors.quantity = "Ingresa una cantidad entera entre 1 y 1.000.000.";
  }
  if (!validDate(fields.date)) errors.date = "Selecciona una fecha válida.";
  try {
    const value = validateCreateExpense({ name, amount, quantity, date: fields.date, ...(description ? { description } : {}) });
    return Object.keys(errors).length ? { errors } : { errors, value };
  } catch (error) {
    if (error instanceof ExpenseValidationError) return { errors: { ...error.errors, ...errors } };
    throw error;
  }
}
