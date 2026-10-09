import type { DailySummary } from "@crowanzas/contracts";
import { validDate } from "./format";

export interface SummaryState { date: string; summary: DailySummary | null; loading: boolean; error: string }
export type SummaryAction =
  | { type: "select"; date: string }
  | { type: "loaded"; date: string; summary: DailySummary }
  | { type: "failed"; date: string; error: string };
export const initialSummaryState: SummaryState = { date: "", summary: null, loading: true, error: "" };

/** A selection always clears the previous result. Late requests cannot replace a newer day. */
export function reduceSummary(state: SummaryState, action: SummaryAction): SummaryState {
  if (action.type === "select") {
    const valid = validDate(action.date);
    return { date: action.date, summary: null, loading: valid, error: valid ? "" : "Selecciona una fecha válida." };
  }
  if (action.date !== state.date) return state;
  if (action.type === "loaded") return { ...state, summary: action.summary, loading: false, error: "" };
  return { ...state, summary: null, loading: false, error: action.error };
}
