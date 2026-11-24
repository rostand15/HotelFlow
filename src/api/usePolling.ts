import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./client";

// Busca um endpoint e atualiza sozinho a cada N segundos (tempo real simples).
// Mais tarde dá para trocar por WebSocket/SSE sem mexer nas telas.
export function usePolling<T>(path: string, seconds = 10) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const alive = useRef(true);

  const load = useCallback(async () => {
    try {
      const result = await api<T>(path);
      if (alive.current) { setData(result); setError(""); }
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    }
  }, [path]);

  useEffect(() => {
    alive.current = true;
    load();
    const id = setInterval(load, seconds * 1000);
    return () => { alive.current = false; clearInterval(id); };
  }, [load, seconds]);

  return { data, error, reload: load };
}
