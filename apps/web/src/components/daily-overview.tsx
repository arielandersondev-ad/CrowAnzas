"use client";

import { useCallback, useState } from "react";
import type { User } from "@crowanzas/contracts";
import type { ExpenseAdapter } from "@/lib/expenses";
import { dateLabel, money, today, validDate } from "@/lib/format";
import { useResource } from "@/lib/use-resource";
import { Loading, LoadError } from "./feedback";
import Icon from "./icon";

export default function DailyOverview({ adapter, revision, onSelect }: { adapter: ExpenseAdapter; revision: number; onSelect: (user: User) => void }) {
  const [day, setDay] = useState(today);
  const [retry, setRetry] = useState(0);
  const load = useCallback(() => adapter.dailySummary(day), [adapter, day]);
  const resource = useResource(`daily:${day}:${revision}:${retry}`, load, validDate(day));
  const error = !validDate(day) ? "Selecciona una fecha válida." : resource.error;
  return <section className="content-card daily-overview" aria-labelledby="daily-title">
    <div className="overview-header"><div><p className="eyebrow">TODOS LOS USUARIOS</p><h2 id="daily-title">El día, en un vistazo</h2><p className="section-copy">Un resumen personal y un total compartido.</p></div><div className="date-filter"><label htmlFor="global-summary-date">Fecha del resumen</label><input type="date" id="global-summary-date" aria-invalid={!validDate(day)} min="0001-01-01" max="9999-12-31" value={day} onChange={e => setDay(e.target.value)}/></div></div>
    {error ? <LoadError message={error} onRetry={() => setRetry(value => value + 1)}/> : resource.loading ? <Loading label="Preparando el resumen diario…"/> : resource.data && <>
      <div className="overview-total"><div><span>Total general del día</span><time dateTime={day}>{dateLabel(day, true)}</time></div><strong aria-live="polite">{money(resource.data.total)}</strong><span className="overview-count">{resource.data.count} {resource.data.count === 1 ? "gasto" : "gastos"}</span></div>
      {resource.data.users.length ? <ul className="daily-user-list">{resource.data.users.map(entry => <li key={entry.user.id}><button type="button" className="daily-user-row" onClick={() => onSelect(entry.user)} aria-label={`Ver gastos de ${entry.user.name}, usuario ${entry.user.id.slice(0, 8)}`}><span className="user-avatar small-avatar">{entry.user.name.slice(0, 1).toLocaleUpperCase("es")}</span><span className="daily-user-name"><strong>{entry.user.name}</strong><small>#{entry.user.id.slice(0, 8)} · {entry.count} {entry.count === 1 ? "gasto" : "gastos"}</small></span><span className="daily-user-total">{money(entry.total)}</span><Icon name="arrow" size={16}/></button></li>)}</ul> : <p className="overview-empty">Crea un usuario para comenzar. Su total aparecerá aquí incluso si todavía no tiene gastos.</p>}
    </>}
  </section>;
}
