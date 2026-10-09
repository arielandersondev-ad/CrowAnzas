"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { Expense, User } from "@crowanzas/contracts";
import type { ExpenseAdapter } from "@/lib/expenses";
import { dateLabel, money, today, validDate } from "@/lib/format";
import { useResource } from "@/lib/use-resource";
import ExpenseForm from "./expense-form";
import ExpenseList from "./expense-list";
import { Feedback, Loading, LoadError } from "./feedback";
import Icon from "./icon";

export default function UserWorkspace({ user, adapter, revision, onBack, onChanged }: {
  user: User; adapter: ExpenseAdapter; revision: number; onBack: () => void; onChanged: () => void;
}) {
  const [tab, setTab] = useState<"register" | "summary">("register");
  const [day, setDay] = useState(today);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState("");
  const [retry, setRetry] = useState(0);
  const active = useRef(true);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const load = useCallback(() => adapter.summary(user.id, day), [adapter, user.id, day]);
  const resource = useResource(`user:${user.id}:${day}:${revision}:${retry}`, load, validDate(day));
  const error = !validDate(day) ? "Selecciona una fecha válida." : resource.error;
  const summary = resource.data;
  function tabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - index;
    setTab(next === 0 ? "register" : "summary"); tabs.current[next]?.focus();
  }
  function saved(expense: Expense) {
    onChanged();
    if (!active.current) return;
    setDay(expense.date); setTab("summary");
    setSuccess(`“${expense.name}” se guardó para ${user.name} el ${dateLabel(expense.date, true)}.`);
    tabs.current[1]?.focus();
  }
  return <section className="user-workspace" aria-labelledby="workspace-user-title">
    <div className="selected-user-heading"><div className="selected-identity"><span className="user-avatar">{user.name.slice(0, 1).toLocaleUpperCase("es")}</span><div><p className="eyebrow">ESPACIO PERSONAL</p><h2 id="workspace-user-title" tabIndex={-1}>{user.name}</h2><span className="user-reference">Usuario #{user.id.slice(0, 8)}</span></div></div><button className="secondary-button" type="button" onClick={onBack} disabled={pending}><Icon name="arrow" size={16} style={{ transform: "rotate(180deg)" }}/>Cambiar usuario</button></div>
    <div className="workspace-nav"><div className="tabs" role="tablist" aria-label={`Gastos de ${user.name}`}>
      <button ref={el => { tabs.current[0] = el; }} id="register-tab" role="tab" aria-selected={tab === "register"} aria-controls="register-panel" tabIndex={tab === "register" ? 0 : -1} className={tab === "register" ? "active" : ""} onClick={() => setTab("register")} onKeyDown={e => tabKey(e, 0)}><Icon name="plus" size={18}/>Registrar gasto</button>
      <button ref={el => { tabs.current[1] = el; }} id="summary-tab" role="tab" aria-selected={tab === "summary"} aria-controls="summary-panel" tabIndex={tab === "summary" ? 0 : -1} className={tab === "summary" ? "active" : ""} onClick={() => setTab("summary")} onKeyDown={e => tabKey(e, 1)}><Icon name="list" size={18}/>Resumen del día</button>
    </div></div>
    {success && <Feedback success message={success}/>}
    <div className="dashboard-grid user-grid">
      <section className="content-card form-card" id="register-panel" role="tabpanel" aria-labelledby="register-tab" hidden={tab !== "register"}>
        <ExpenseForm user={user} adapter={adapter} onSaved={saved} onPending={setPending}/>
      </section>
      <section className="content-card summary-card" id="summary-panel" role="tabpanel" aria-labelledby="summary-tab" hidden={tab !== "summary"}>
        <div className="card-heading"><div className="card-icon"><Icon name="list" size={24}/></div><div><h2>Resumen de {user.name}</h2><p>Los gastos de este usuario para el día elegido.</p></div></div>
        <div className="summary-toolbar"><div className="date-filter"><label htmlFor="summary-date">Consultar fecha</label><input type="date" id="summary-date" value={day} aria-invalid={!validDate(day)} min="0001-01-01" max="9999-12-31" onChange={e => { setDay(e.target.value); setSuccess(""); }}/></div><button className="text-button" type="button" onClick={() => { setDay(today()); setSuccess(""); }}>Volver a hoy<Icon name="arrow" size={16}/></button></div>
        {error ? <LoadError message={error} onRetry={() => setRetry(value => value + 1)}/> : resource.loading ? <Loading label="Consultando los gastos de este usuario…"/> : summary?.expenses.length ? <ExpenseList expenses={summary.expenses}/> : <div className="empty-state"><span className="empty-icon"><Icon name="wallet" size={30}/></span><h3>Sin gastos para este día</h3><p>{user.name} no tiene registros para el {dateLabel(day, true)}.</p><button className="secondary-button" type="button" onClick={() => { setTab("register"); tabs.current[0]?.focus(); }}><Icon name="plus" size={16}/>Registrar un gasto</button></div>}
        {summary && !error && <div className="list-total"><span>Total del día<small>{dateLabel(day, true)}</small></span><strong>{money(summary.total)}</strong></div>}
      </section>
      <aside className="side-column" aria-label={`Total diario de ${user.name}`}><div className="total-card"><div className="total-top"><span className="eyebrow">TOTAL PERSONAL</span><span className="total-icon"><Icon name="wallet" size={23}/></span></div><p className="total-label">{user.name}</p><strong className="total-value" aria-live="polite">{summary && !error ? money(summary.total) : "—"}</strong><p className="total-date">{dateLabel(day, true)}</p><div className="total-bottom"><span>Gastos del día</span><strong>{summary && !error ? summary.count : "—"}</strong></div></div><p className="side-note">Cada registro tiene un único propietario.</p></aside>
    </div>
  </section>;
}
