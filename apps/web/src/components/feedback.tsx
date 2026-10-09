import Icon from "./icon";

export function Feedback({ message, success = false }: { message: string; success?: boolean }) {
  return <div className={`feedback ${success ? "success-feedback" : "error-feedback"}`} role={success ? "status" : "alert"}>
    <Icon name={success ? "check" : "info"}/><span>{message}</span>
  </div>;
}
export function Loading({ label = "Cargando tus registros…" }: { label?: string }) {
  return <div className="resource-loading" role="status"><span className="spinner"/><span>{label}</span></div>;
}
export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="load-error"><Feedback message={message}/><button className="secondary-button" type="button" onClick={onRetry}>Reintentar</button></div>;
}
