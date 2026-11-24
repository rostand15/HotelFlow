import { useState } from "react";
import { api } from "../api/client";
import { usePolling } from "../api/usePolling";
import { Task, taskTypeLabel } from "../types";

export default function MyTasks() {
  const { data, error, reload } = usePolling<Task[]>("/tasks/mine", 8);
  const [actionError, setActionError] = useState("");

  async function act(id: string, action: "start" | "finish") {
    setActionError("");
    try { await api(`/tasks/${id}/${action}`, { method: "POST" }); await reload(); }
    catch (e) { setActionError((e as Error).message); }
  }

  const open = (data ?? []).filter((t) => t.status === "PENDENTE" || t.status === "EM_ANDAMENTO");
  const done = (data ?? []).filter((t) => t.status === "CONCLUIDA").length;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold text-ink">Minhas tarefas</h1>
      <p className="mb-4 muted">{open.length} para fazer · {done} concluída(s)</p>
      {(error || actionError) && <p role="alert" className="mb-3 text-red-800">{actionError || error}</p>}
      {data && open.length === 0 && <p className="card muted">Nada para fazer agora. Novos quartos aparecem aqui.</p>}

      <ul className="space-y-3">
        {open.map((t) => {
          const running = t.status === "EM_ANDAMENTO";
          return (
            <li key={t.id} className={`card ${running ? "border-2 border-amber-600" : ""}`}>
              <div className="text-2xl font-bold">Quarto {t.room.number}</div>
              <p className="mb-3 muted">
                {t.room.floor}º andar · {taskTypeLabel[t.type]}{t.room.occupancy === "OCUPADO" ? " · hóspede no quarto" : ""}
                {running ? " · em andamento" : ""}
              </p>
              {running
                ? <button className="btn w-full !min-h-[52px] bg-emerald-800 text-white hover:bg-emerald-900" onClick={() => act(t.id, "finish")}>Concluir limpeza</button>
                : <button className="btn btn-primary w-full !min-h-[52px]" onClick={() => act(t.id, "start")}>Iniciar limpeza</button>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
