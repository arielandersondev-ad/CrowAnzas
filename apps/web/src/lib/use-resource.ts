"use client";

import { useEffect, useState } from "react";
import { errorMessage } from "./expenses";

interface Resource<T> { key: string; data: T | null; loading: boolean; error: string }

/** Scope both results and failures to their owner/date/revision. */
export function useResource<T>(key: string, load: () => Promise<T>, enabled = true) {
  const [state, setState] = useState<Resource<T>>({ key: "", data: null, loading: enabled, error: "" });
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setState({ key, data: null, loading: true, error: "" });
    load().then(data => {
      if (active) setState({ key, data, loading: false, error: "" });
    }).catch((error: unknown) => {
      if (active) setState({ key, data: null, loading: false, error: errorMessage(error) });
    });
    return () => { active = false; };
  }, [key, load, enabled]);
  if (!enabled) return { data: null, loading: false, error: "" };
  return state.key === key ? state : { data: null, loading: true, error: "" };
}
