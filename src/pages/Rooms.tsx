import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";
import { usePolling } from "../api/usePolling";
import RoomCard from "../components/RoomCard";
import { CleaningStatus, cleaningLabel, Room, taskTypeLabel } from "../types";

type Group = "SUJO" | "EM_LIMPEZA" | "PRONTO" | "MANUTENCAO";
const groups: { key: Group; label: string; match: (c: CleaningStatus) => boolean }[] = [
  { key: "SUJO", label: "Sujos", match: (c) => c === "SUJO" },
  { key: "EM_LIMPEZA", label: "Em limpeza", match: (c) => c === "EM_LIMPEZA" },
  { key: "PRONTO", label: "Prontos", match: (c) => c === "LIMPO" || c === "INSPECIONADO" },
  { key: "MANUTENCAO", label: "Manutenção", match: (c) => c === "MANUTENCAO" },
];

// Texto de cada botão de mudança de status, em linguagem simples.
const actionLabel: Record<CleaningStatus, string> = {
  EM_LIMPEZA: "Iniciar limpeza",
  LIMPO: "Marcar como limpo",
  INSPECIONADO: "Marcar como inspecionado",
  SUJO: "Marcar como sujo",
  MANUTENCAO: "Enviar para manutenção",
};
const actionClass = (s: CleaningStatus) => (s === "MANUTENCAO" ? "btn btn-danger" : s === "SUJO" ? "btn btn-ghost" : "btn btn-primary");

export default function Rooms() {
  const { data: rooms, error, reload } = usePolling<Room[]>("/rooms", 10);
  const [filter, setFilter] = useState<Group | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);

  const current = rooms?.find((r) => r.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelectedId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  const counts = useMemo(() => {
    const c: Record<Group, number> = { SUJO: 0, EM_LIMPEZA: 0, PRONTO: 0, MANUTENCAO: 0 };
    rooms?.forEach((r) => groups.forEach((g) => g.match(r.cleaning) && c[g.key]++));
    return c;
  }, [rooms]);

  const floors = useMemo(() => {
    const active = groups.find((g) => g.key === filter);
    const map = new Map<number, Room[]>();
    rooms?.filter((r) => !active || active.match(r.cleaning)).forEach((r) => map.set(r.floor, [...(map.get(r.floor) ?? []), r]));
    return [...map.entries()];
  }, [rooms, filter]);

  async function act(path: string, body?: unknown, method = "POST") {
    setActionError("");
    try { await api(path, { method, body }); await reload(); }
    catch (e) { setActionError((e as Error).message); }
  }

  const ready = current && (current.cleaning === "LIMPO" || current.cleaning === "INSPECIONADO");

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-ink">Quartos</h1>
      {error && <p role="alert" className="mb-3 text-red-800">{error}</p>}

      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filtrar quartos por situação">
        <button aria-pressed={filter === null} className={`btn ${filter === null ? "btn-primary" : "btn-ghost"}`} onClick={() => setFilter(null)}>
          Todos ({rooms?.length ?? 0})
        </button>
        {groups.map((g) => (
          <button key={g.key} aria-pressed={filter === g.key} className={`btn ${filter === g.key ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setFilter(filter === g.key ? null : g.key)}>
            {g.label} ({counts[g.key]})
          </button>
        ))}
      </div>

      {!rooms && !error && <p className="muted">Carregando quartos…</p>}
      {rooms && floors.length === 0 && <p className="muted">Nenhum quarto nesta situação agora.</p>}

      {floors.map(([floor, list]) => (
        <section key={floor} className="mb-7" aria-labelledby={`andar-${floor}`}>
          <h2 id={`andar-${floor}`} className="mb-2 text-lg font-semibold text-slate-800">{floor}º andar</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {list.map((room) => (
              <RoomCard key={room.id} room={room} onClick={() => { setActionError(""); setSelectedId(room.id); }} />
            ))}
          </div>
        </section>
      ))}

      {current && (
        <div className="fixed inset-0 z-10 grid place-items-end bg-black/50 sm:place-items-center" onClick={() => setSelectedId(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="titulo-quarto"
            className="w-full max-w-md rounded-t-xl bg-white p-5 sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id="titulo-quarto" className="text-2xl font-semibold text-ink">Quarto {current.number}</h2>
                <p className="muted">{cleaningLabel[current.cleaning]} · {current.occupancy === "OCUPADO" ? "Ocupado" : "Livre"}</p>
              </div>
              <button ref={closeRef} className="btn btn-ghost" onClick={() => setSelectedId(null)}>Fechar</button>
            </div>

            {current.activeTask && (
              <p className="mb-4 rounded bg-slate-100 p-3">
                {taskTypeLabel[current.activeTask.type]}: {current.activeTask.housekeeperName ?? "ainda sem responsável"}
              </p>
            )}
            {actionError && <p role="alert" className="mb-3 text-red-800">{actionError}</p>}

            <div className="flex flex-col gap-2">
              {current.occupancy === "OCUPADO" && (
                <button className="btn btn-primary" onClick={() => act(`/rooms/${current.id}/checkout`)}>Fazer check-out</button>
              )}
              {current.occupancy === "LIVRE" && ready && (
                <button className="btn btn-primary" onClick={() => act(`/rooms/${current.id}/checkin`)}>Fazer check-in</button>
              )}
              {current.occupancy === "LIVRE" && !ready && (
                <p className="muted">Este quarto ainda não está pronto para receber hóspede.</p>
              )}
              {current.allowedNext.map((s) => (
                <button key={s} className={actionClass(s)} onClick={() => act(`/rooms/${current.id}/cleaning`, { status: s }, "PATCH")}>
                  {actionLabel[s]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
