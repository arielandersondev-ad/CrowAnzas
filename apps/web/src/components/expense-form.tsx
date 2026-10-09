"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Expense, User } from "@crowanzas/contracts";
import { errorMessage, type ExpenseAdapter } from "@/lib/expenses";
import { CURRENCY, today } from "@/lib/format";
import { validateForm, type FieldErrors, type FormFields } from "@/lib/validation";
import { Feedback } from "./feedback";
import Icon from "./icon";

const emptyFields = (): FormFields => ({ name: "", amount: "", quantity: "1", date: today(), description: "" });

export default function ExpenseForm({ user, adapter, onSaved, onPending }: {
  user: User; adapter: ExpenseAdapter; onSaved: (expense: Expense) => void; onPending: (pending: boolean) => void;
}) {
  const [fields, setFields] = useState<FormFields>(emptyFields);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saveError, setSaveError] = useState("");
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  function change(field: keyof FormFields, value: string) {
    setFields(old => ({ ...old, [field]: value }));
    setErrors(old => ({ ...old, [field]: undefined })); setSaveError("");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const checked = validateForm(fields);
    setErrors(checked.errors); setSaveError("");
    if (!checked.value) { document.getElementById(Object.keys(checked.errors)[0])?.focus(); return; }
    submitting.current = true; setPending(true); onPending(true);
    try {
      const expense = await adapter.create(user.id, checked.value);
      onSaved(expense);
      if (active.current) setFields(emptyFields());
    } catch (error) { if (active.current) setSaveError(errorMessage(error)); }
    finally {
      submitting.current = false;
      if (active.current) { setPending(false); onPending(false); }
    }
  }
  const fieldProps = (field: keyof FormFields) => ({
    id: field, name: field, value: fields[field], disabled: pending, required: field !== "description",
    "aria-invalid": Boolean(errors[field]), "aria-describedby": `${field}-hint${errors[field] ? ` ${field}-error` : ""}`,
  });
  const error = (field: keyof FormFields) => errors[field] && <p id={`${field}-error`} className="field-error">{errors[field]}</p>;
  return <>
    <div className="card-heading"><div className="card-icon"><Icon name="plus" size={24}/></div><div><h2>Registrar un gasto</h2><p>Este registro pertenece a <strong>{user.name}</strong>.</p></div></div>
    <form onSubmit={submit} noValidate>
      <div className="field"><label htmlFor="name">Nombre del gasto <span className="required-dot" aria-hidden="true">*</span></label><input {...fieldProps("name")} placeholder="Ej. Compra del mercado" maxLength={120} autoComplete="off" onChange={e => change("name", e.target.value)}/><p className="field-hint" id="name-hint">Algo breve que te ayude a recordarlo.</p>{error("name")}</div>
      <div className="field-row"><div className="field"><label htmlFor="amount">Valor del gasto <span className="required-dot" aria-hidden="true">*</span></label><div className="money-input"><span>{CURRENCY}</span><input {...fieldProps("amount")} type="text" inputMode="decimal" placeholder="0,00" maxLength={13} onChange={e => change("amount", e.target.value)}/></div><p className="field-hint" id="amount-hint">Importe total, con hasta 2 decimales.</p>{error("amount")}</div><div className="field"><label htmlFor="quantity">Cantidad <span className="required-dot" aria-hidden="true">*</span></label><input {...fieldProps("quantity")} type="number" inputMode="numeric" min="1" max="1000000" step="1" onChange={e => change("quantity", e.target.value)}/><p className="field-hint" id="quantity-hint">Número de unidades o artículos.</p>{error("quantity")}</div></div>
      <div className="field"><label htmlFor="date">Fecha del gasto <span className="required-dot" aria-hidden="true">*</span></label><input {...fieldProps("date")} type="date" min="0001-01-01" max="9999-12-31" onChange={e => change("date", e.target.value)}/><p className="field-hint" id="date-hint">Puedes registrar gastos de cualquier día.</p>{error("date")}</div>
      <div className="field"><label htmlFor="description">Descripción <span className="optional">opcional</span></label><textarea {...fieldProps("description")} placeholder="Un detalle, una nota, algo para recordar…" rows={3} maxLength={1000} onChange={e => change("description", e.target.value)}/><p className="field-hint" id="description-hint">Hasta 1.000 caracteres.</p>{error("description")}</div>
      {saveError && <Feedback message={saveError}/>}
      <div className="form-footer"><span><Icon name="info" size={16}/>La cantidad no multiplica el valor.</span><button className="primary-button" type="submit" disabled={pending || !fields.date}>{pending ? <><span className="spinner"/>Guardando…</> : <>Guardar gasto<Icon name="arrow" size={18}/></>}</button></div>
    </form>
  </>;
}
