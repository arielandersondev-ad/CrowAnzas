"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { validateCreateUser, UserValidationError, type CreateUser, type User } from "@crowanzas/contracts";
import { getAdapter, errorMessage, type ExpenseAdapter } from "@/lib/expenses";
import { CURRENCY, dateLabel, today } from "@/lib/format";
import { useResource } from "@/lib/use-resource";
import AllRecords from "./all-records";
import DailyOverview from "./daily-overview";
import UserWorkspace from "./user-workspace";
import { Feedback, Loading, LoadError } from "./feedback";
import Icon from "./icon";

export default function Dashboard() {
  const [adapter, setAdapter] = useState<ExpenseAdapter | null>(null);
  const [bootError, setBootError] = useState("");
  const [bootRevision, setBootRevision] = useState(0);
  const [storage, setStorage] = useState<"local" | "memory" | "prisma" | null>(null);
  const [section, setSection] = useState<"users" | "history">("users");
  const [selected, setSelected] = useState<User | null>(null);
  const [currentDay, setCurrentDay] = useState("");
  const [revision, setRevision] = useState(0);
  const [dark, setDark] = useState(false);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [creating, setCreating] = useState(false);
  const submitting = useRef(false);
  const active = useRef(true);
  const mode = process.env.NEXT_PUBLIC_DATA_MODE || "mock";
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    let current = true;
    setBootError(""); setStorage(null); setAdapter(null);
    try {
      setCurrentDay(today());
      const data = getAdapter(); setAdapter(data);
      data.health().then(value => { if (current) setStorage(value); }).catch(() => { if (current) setStorage(null); });
    } catch (error) { setBootError(errorMessage(error)); }
    return () => { current = false; };
  }, [bootRevision]);
  const loadUsers = useCallback(() => adapter!.users(), [adapter]);
  const users = useResource(`users:${bootRevision}:${revision}`, loadUsers, adapter !== null);
  const changed = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    if (section === "users") document.getElementById(selected ? "workspace-user-title" : "users-title")?.focus();
  }, [selected, section]);
  function choose(user: User) {
    setSelected(user); setSection("users"); setCreateSuccess("");
  }
  function navigate(next: "users" | "history") {
    setSection(next); setSelected(null); setCreateSuccess("");
  }
  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !adapter) return;
    setNameError(""); setCreateError(""); setCreateSuccess("");
    let value: CreateUser;
    try { value = validateCreateUser({ name }); }
    catch (error) {
      setNameError(error instanceof UserValidationError ? error.errors.name || error.message : errorMessage(error));
      document.getElementById("user-name")?.focus(); return;
    }
    submitting.current = true; setCreating(true);
    try {
      const user = await adapter.createUser(value);
      if (!active.current) return;
      setName(""); setCreateSuccess(`El usuario “${user.name}” está listo. Selecciónalo para registrar sus gastos.`); changed();
    } catch (error) { if (active.current) setCreateError(errorMessage(error)); }
    finally { submitting.current = false; if (active.current) setCreating(false); }
  }
  function toggleTheme() {
    const next = !dark; setDark(next); document.documentElement.classList.toggle("dark", next);
  }
  const storageCopy = mode === "mock"
    ? "Usuarios y gastos se guardan solo en este navegador y se conservan al recargar."
    : storage === "memory" ? "Servidor de demostración: los datos temporales se borran al reiniciar el servicio."
    : storage === "prisma" ? "Tus registros se guardan de forma persistente en el servidor."
    : "Consultando el servidor para conocer cómo se guardan tus registros.";

  return <div className="app-shell profiles-app">
    <header className="site-header"><a className="brand" href="/" aria-label="Crowanzas, inicio"><span className="brand-mark"><Icon name="leaf" size={23}/></span><span>Crowanzas<span className="brand-dot">.</span></span></a><div className="header-right"><span className="header-caption">Cada persona, sus cuentas claras.</span><button className="icon-button" type="button" onClick={toggleTheme} aria-label={dark ? "Activar tema claro" : "Activar tema oscuro"}><Icon name={dark ? "sun" : "moon"}/></button></div></header>
    <main className="main-container">
      <div className="intro"><div><p className="eyebrow"><span className="tiny-line"/> UN POCO DE ORDEN, CADA DÍA</p><h1>{selected ? "Cada gasto cuenta." : section === "history" ? "Todas las cuentas claras." : "Tus gastos, a tu nombre."}</h1><p className="intro-copy">{selected ? "Registra y consulta los gastos del usuario que elegiste." : section === "history" ? "Consulta el historial completo y reconoce a quién pertenece cada gasto." : "Crea un usuario, elige su espacio y lleva sus gastos al día."}</p></div><div className="today-chip"><Icon name="calendar"/><span>{currentDay ? dateLabel(currentDay, true) : "Tu resumen diario"}</span></div></div>
      <div className={`mode-notice ${mode === "mock" ? "" : "api-notice"}`}><Icon name="info" size={18}/><p><strong>{mode === "mock" ? "Modo local" : storage === "memory" ? "Modo demostración" : "Datos en el servidor"}</strong><span>{storageCopy}</span></p><span className="mode-tag">{mode === "mock" ? "LOCAL" : storage === "memory" ? "TEMPORAL" : storage === "prisma" ? "PERSISTENTE" : "CONSULTANDO"}</span></div>
      <nav className="section-nav" aria-label="Secciones de Crowanzas"><button type="button" className={section === "users" ? "active" : ""} aria-current={section === "users" ? "page" : undefined} onClick={() => navigate("users")}><Icon name="leaf" size={18}/>Usuarios</button><button type="button" className={section === "history" ? "active" : ""} aria-current={section === "history" ? "page" : undefined} onClick={() => navigate("history")}><Icon name="list" size={18}/>Todos los registros</button></nav>
      {bootError ? <LoadError message={bootError} onRetry={() => setBootRevision(value => value + 1)}/> : !adapter ? <Loading label="Preparando tus espacios…"/> : <>
        {section === "users" && !selected && <div className="profiles-home">
          <section className="content-card users-section" aria-labelledby="users-title"><div className="users-section-heading"><div><p className="eyebrow">EMPIEZA POR AQUÍ</p><h2 id="users-title" tabIndex={-1}>Elige un usuario</h2><p className="section-copy">Cada nombre tiene su propio espacio de gastos.</p></div><span className="users-count">{users.data ? `${users.data.length} ${users.data.length === 1 ? "usuario" : "usuarios"}` : ""}</span></div>
            <form className="user-create-form" onSubmit={createUser} noValidate><div className="field"><label htmlFor="user-name">Nombre del nuevo usuario</label><input id="user-name" name="userName" value={name} required maxLength={120} disabled={creating} autoComplete="off" placeholder="Ej. Lucía" aria-invalid={Boolean(nameError)} aria-describedby={`user-name-hint${nameError ? " user-name-error" : ""}`} onChange={event => { setName(event.target.value); setNameError(""); setCreateError(""); setCreateSuccess(""); }}/><p className="field-hint" id="user-name-hint">Solo un nombre, hasta 120 caracteres.</p>{nameError && <p className="field-error" id="user-name-error">{nameError}</p>}</div><button className="primary-button" type="submit" disabled={creating}>{creating ? <><span className="spinner"/>Creando…</> : <><Icon name="plus" size={18}/>Crear usuario</>}</button></form>
            {createError && <Feedback message={createError}/>} {createSuccess && <Feedback success message={createSuccess}/>}
            {users.error ? <LoadError message={users.error} onRetry={changed}/> : users.loading ? <Loading label="Cargando usuarios…"/> : users.data?.length ? <ul className="user-card-list">{users.data.map(user => <li key={user.id}><button className="user-card" type="button" onClick={() => choose(user)} aria-label={`Abrir espacio de ${user.name}, usuario ${user.id.slice(0, 8)}`}><span className="user-avatar">{user.name.slice(0, 1).toLocaleUpperCase("es")}</span><span className="user-card-name"><strong>{user.name}</strong><small>Usuario #{user.id.slice(0, 8)}</small></span><Icon name="arrow" size={18}/></button></li>)}</ul> : <div className="users-empty"><span className="empty-icon"><Icon name="leaf" size={28}/></span><h3>Un espacio para cada persona</h3><p>Crea el primer usuario con su nombre. Después podrás registrar sus gastos y ver su resumen diario.</p></div>}
          </section>
          <DailyOverview adapter={adapter} revision={revision} onSelect={choose}/>
        </div>}
        {section === "users" && selected && <><UserWorkspace key={selected.id} user={selected} adapter={adapter} revision={revision} onChanged={changed} onBack={() => setSelected(null)}/><DailyOverview adapter={adapter} revision={revision} onSelect={choose}/></>}
        {section === "history" && <><AllRecords adapter={adapter} revision={revision}/><DailyOverview adapter={adapter} revision={revision} onSelect={choose}/></>}
      </>}
      <footer className="site-footer"><span>Crowanzas<span className="brand-dot">.</span><span className="footer-tagline">Cada persona, sus cuentas claras.</span></span><p>Importes en {CURRENCY}. Todos los usuarios y sus registros se pueden consultar desde esta aplicación.</p></footer>
    </main>
  </div>;
}
