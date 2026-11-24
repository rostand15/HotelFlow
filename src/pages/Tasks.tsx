import { useState } from "react";
import { api } from "../api/client";
import { usePolling } from "../api/usePolling";
import { useAuth } from "../auth/AuthContext";
import { Housekeeper, Task, taskStatusLabel, taskTypeLabel } from "../types";

export default function Tasks() {
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "GOVERNANTA";
  const tasks = usePolling<Task[]>("/tasks", 10);
  const maids = usePolling<Housekeeper[]>("/housekeepers", 10);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function run(fn: () => Promise<unknown>, ok?: (r: any) => string) {
    setError(""); setMessage("");
    try {
      const r = await fn();
      if (ok) setMessage(ok(r));
      await Promise.all([tasks.reload(), maids.reload()]);
    } catch (e) { setError((e as Error).message); }
  }

  const all = tasks.data ?? [];
  const open = all.filter((t) => t.status === "PENDENTE" || t.status === "EM_ANDAMENTO");
  const done = all.filter((t) => t.status === "CONCLUIDA");
  const working = (maids.data ?? []).filter((m) => m.shiftStatus === "ESCALADA" || m.shiftStatus === "PRESENTE");
  const unassigned = open.filter((t) => !t.housekeeperId).length;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Tarefas de hoje</h1>
      <p className="mb-4 muted">{open.length} em aberto · {done.length} concluídas{unassigned > 0 ? ` · ${unassigned} sem responsável` : ""}</p>

      {canManage && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button className="btn btn-primary"
            onClick={() => run(() => api("/tasks/auto-assign", { method: "POST" }), (r) => `${r.assigned} tarefa(s) distribuída(s).`)}>
            Distribuir automaticamente
          </button>
          <button className="btn btn-ghost"
            onClick={() => run(() => api("/tasks/generate-daily", { method: "POST" }), (r) => `${r.created} arrumação(ões) criada(s).`)}>
            Criar arrumações do dia
          </button>
        </div>
      )}

      <div role="status">{message && <p className="mb-3 rounded bg-emerald-50 p-3 text-emerald-900">{message}</p>}</div>
      {(error || tasks.error) && <p role="alert" className="mb-3 text-red-800">{error || tasks.error}</p>}

      {open.length === 0 && <p className="card muted">Nenhuma tarefa em aberto. Faça um check-out ou crie as arrumações do dia.</p>}

      <ul className="mb-6 space-y-3">
        {open.map((t) => (
          <li key={t.id} className="card flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="mr-auto">
              <div className="text-xl font-bold">Quarto {t.room.number}</div>
              <div className="muted">{t.room.floor}º andar · {taskTypeLabel[t.type]} · {taskStatusLabel[t.status]}</div>
            </div>
            {!t.housekeeperId && canManage ? (
              <select className="input !w-56" aria-label={`Escolher responsável pelo quarto ${t.room.number}`} defaultValue=""
                onChange={(e) => e.target.value && run(() => api(`/tasks/${t.id}/assign`, { method: "PATCH", body: { housekeeperId: e.target.value } }))}>
                <option value="">Escolher responsável</option>
                {working.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            ) : (
              <span className="font-medium">{t.housekeeper?.user.name ?? "Sem responsável"}</span>
            )}
            {canManage && (
              <button className="btn btn-ghost" aria-label={`Cancelar tarefa do quarto ${t.room.number}`}
                onClick={() => run(() => api(`/tasks/${t.id}/cancel`, { method: "POST" }))}>
                Cancelar
              </button>
            )}
          </li>
        ))}
      </ul>

      <div className="space-y-3">
        <details className="fold">
          <summary>Concluídas ({done.length})</summary>
          <div>
            {done.length === 0 ? <p className="muted">Nenhuma ainda.</p> : (
              <ul className="space-y-1">
                {done.map((t) => <li key={t.id}>Quarto {t.room.number} — {t.housekeeper?.user.name}</li>)}
              </ul>
            )}
          </div>
        </details>

        <details className="fold">
          <summary>Equipe de hoje ({working.length})</summary>
          <div>
            <ul className="space-y-1">
              {working.map((m) => <li key={m.id}>{m.name} — {m.tasksDone} de {m.tasksTotal} feitas</li>)}
            </ul>
          </div>
        </details>
      </div>
    </div>
  );
}
