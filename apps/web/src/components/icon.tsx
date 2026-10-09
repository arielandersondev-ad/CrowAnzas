import type { CSSProperties } from "react";

export type IconName = "leaf" | "plus" | "list" | "arrow" | "check" | "calendar" | "wallet" | "sun" | "moon" | "info";
const paths: Record<IconName, React.ReactNode> = {
  leaf: <><path d="M20 4c-9-1-16 3-16 9a7 7 0 0 0 7 7c6 0 10-7 9-16Z"/><path d="m4 20 11-11M9 15v-4m0 4h4"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  list: <><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></>,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2"/></>,
  wallet: <><path d="M20 8V6a2 2 0 0 0-2-2H6a3 3 0 0 0 0 6h14v10H6a3 3 0 0 1-3-3V7"/><path d="M20 12h-5v5h5M17 14.5h.01"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/></>,
  moon: <path d="M21 13a9 9 0 0 1-10-10 9 9 0 1 0 10 10Z"/>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
};
export default function Icon({ name, size = 20, style }: { name: IconName; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{paths[name]}</svg>;
}
