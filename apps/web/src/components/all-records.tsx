"use client";

import { useCallback, useState } from "react";
import type { ExpenseAdapter } from "@/lib/expenses";
import { validDate } from "@/lib/format";
import { useResource } from "@/lib/use-resource";
import ExpenseList from "./expense-list";
import { Loading, LoadError } from "./feedback";
import Icon from "./icon";

export default function AllRecords({ adapter, revision }: { adapter: ExpenseAdapter; revision: number }) {
  const [date, setDate] = useState("");
  const [retry, setRetry] = useState(0);
  const load = useCallback(() => adapter.allExpenses(date || undefined), [adapter, date]);
  const valid = date === "" || validDate(date);
  const resource = useResource(`history:${date}:${revision}:${retry}`, load, valid);
  const error = valid ? resource.error : "Selecciona una fecha válida.";
  return <section className="content-card all-records" aria-labelledby="history-title">
    <div className="card-heading"><div className="card-icon"><Icon name="list" size={24}/></div><div><h2 id="history-title">Todos los registros</h2><p>El historial de todos los usuarios, con su propietario.</p></div></div>
    <div className="summary-toolbar history-toolbar"><div className="date-filter"><label htmlFor="history-date">Filtrar por fecha <span className="optional">opcional</span></label><input type="date" id="history-date" value={date} min="0001-01-01" max="9999-12-31" onChange={e => setDate(e.target.value)}/></div><button className="text-button" type="button" onClick={() => setDate("")}>Ver todo el historial<Icon name="arrow" size={16}/></button></div>
    <div className="list-heading"><h3>{date ? "Gastos de la fecha elegida" : "Historial completo"}</h3><span>{resource.data ? `${resource.data.length} ${resource.data.length === 1 ? "registro" : "registros"}` : ""}</span></div>
    {error ? <LoadError message={error} onRetry={() => setRetry(value => value + 1)}/> : resource.loading ? <Loading label="Consultando todos los registros…"/> : resource.data?.length ? <ExpenseList expenses={resource.data} showOwner/> : <div className="empty-state"><span className="empty-icon"><Icon name="wallet" size={30}/></span><h3>{date ? "Sin registros en esta fecha" : "Tu historial empieza aquí"}</h3><p>{date ? "Puedes consultar otra fecha o volver al historial completo." : "Selecciona un usuario y registra su primer gasto. Aparecerá aquí junto con su nombre."}</p></div>}
  </section>;
}
