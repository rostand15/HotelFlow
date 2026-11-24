import { FormEvent, useState } from "react";
import { api } from "../api/client";
import { usePolling } from "../api/usePolling";
import { useAuth } from "../auth/AuthContext";
import { CityEvent, ForecastDay, Housekeeper, ShiftStatus, shiftLabel } from "../types";

const fmt = (iso: string) =>
  new Date(iso.slice(0, 10) + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });

const todayISO = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
};

const impactLabel = (n: number) => (n <= 2 ? "Baixo" : n <= 3 ? "Médio" : "Alto");

export default function Staffing() {
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "GOVERNANTA";
  const forecast = usePolling<{ days: ForecastDay[] }>("/forecast?days=14", 60);
  const events = usePolling<CityEvent[]>("/events", 60);
  const [shiftDate, setShiftDate] = useState(todayISO());
  const maids = usePolling<Housekeeper[]>(`/housekeepers?date=${shiftDate}`, 30);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", startDate: todayISO(), endDate: todayISO(), impact: 3 });

  const days = forecast.data?.days ?? [];
  const shown = showAll ? days : days.slice(0, 7);
  const short = days.slice(0, 7).filter((d) => d.gap < 0);

  async function setShift(housekeeperId: string, status: ShiftStatus) {
    setError("");
    try {
      await api("/shifts", { method: "PUT", body: { housekeeperId, date: shiftDate, status } });
      await Promise.all([maids.reload(), forecast.reload()]);
    } catch (e) { setError((e as Error).message); }
  }

  async function addEvent(e: FormEvent) {
    e.preventDefault(); setError("");
    try {
      await api("/events", { method: "POST", body: { ...form, source: "manual" } });
      setForm({ ...form, name: "" });
      await Promise.all([events.reload(), forecast.reload()]);
    } catch (err) { setError((err as Error).message); }
  }

  async function removeEvent(id: string) {
    try { await api(`/events/${id}`, { method: "DELETE" }); await Promise.all([events.reload(), forecast.reload()]); }
    catch (e) { setError((e as Error).message); }
  }

  return (
    <div>
      <h1 className="mb-3 text-2xl font-semibold text-ink">Equipe e demanda</h1>
      {(error || forecast.error) && <p role="alert" className="mb-3 text-red-800">{error || forecast.error}</p>}

      {forecast.data && (
        short.length > 0 ? (
          <p role="status" className="mb-4 rounded border border-red-600 bg-red-50 p-3 font-semibold text-red-900">
            <span aria-hidden="true">⚠ </span>Faltam pessoas em {short.length} dia(s) da próxima semana: {short.map((d) => fmt(d.date)).join(", ")}.
          </p>
        ) : (
          <p role="status" className="mb-4 rounded border border-emerald-700 bg-emerald-50 p-3 font-semibold text-emerald-900">
            <span aria-hidden="true">✓ </span>Equipe suficiente para os próximos 7 dias.
          </p>
        )
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-300 bg-white">
        <table className="w-full min-w-[32rem] text-base">
          <caption className="sr-only">Previsão de ocupação e equipe por dia</caption>
          <thead className="bg-slate-100 text-left">
            <tr>
              <th scope="col" className="p-3">Dia</th>
              <th scope="col" className="p-3">Ocupação</th>
              <th scope="col" className="p-3">Equipe</th>
              <th scope="col" className="p-3">Situação</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((d) => (
              <tr key={d.date} className="border-t border-slate-200 align-top">
                <th scope="row" className="p-3 text-left font-semibold">
                  {fmt(d.date)}
                  {d.events.length > 0 && <div className="text-sm font-normal text-slate-700">{d.events.map((e) => e.name).join(", ")}</div>}
                </th>
                <td className="p-3">{Math.round(d.expectedOccupancy * 100)}%</td>
                <td className="p-3">{d.housekeepersScheduled} de {d.housekeepersNeeded}</td>
                <td className="p-3 font-semibold">
                  {d.gap < 0
                    ? <span className="text-red-800"><span aria-hidden="true">⚠ </span>Faltam {-d.gap}</span>
                    : d.gap === 0
                      ? <span className="text-emerald-800"><span aria-hidden="true">✓ </span>Equipe certa</span>
                      : <span className="text-slate-800">Sobra {d.gap}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-sm muted">Equipe: pessoas escaladas de pessoas necessárias.</p>
      {days.length > 7 && (
        <button className="btn btn-ghost mt-2" onClick={() => setShowAll(!showAll)}>
          {showAll ? "Mostrar só 7 dias" : "Mostrar 14 dias"}
        </button>
      )}

      <div className="mt-8 space-y-3">
        <details className="fold">
          <summary>Escala do dia</summary>
          <div>
            <label className="mb-3 block">
              <span className="mb-1 block font-medium">Dia</span>
              <input type="date" className="input !w-auto" value={shiftDate} onChange={(e) => setShiftDate(e.target.value)} />
            </label>
            <ul className="space-y-2">
              {maids.data?.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3">
                  <span className="font-medium">{m.name}</span>
                  {canManage ? (
                    <select className="input !w-40" aria-label={`Situação de ${m.name} no dia`} value={m.shiftStatus ?? ""}
                      onChange={(e) => e.target.value && setShift(m.id, e.target.value as ShiftStatus)}>
                      <option value="">Sem escala</option>
                      {(Object.keys(shiftLabel) as ShiftStatus[]).map((s) => <option key={s} value={s}>{shiftLabel[s]}</option>)}
                    </select>
                  ) : <span>{m.shiftStatus ? shiftLabel[m.shiftStatus] : "Sem escala"}</span>}
                </li>
              ))}
            </ul>
          </div>
        </details>

        <details className="fold">
          <summary>Eventos da cidade ({events.data?.length ?? 0})</summary>
          <div>
            <ul className="mb-4 space-y-2">
              {events.data?.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3">
                  <span><strong>{e.name}</strong><br />
                    <span className="muted">{fmt(e.startDate)} a {fmt(e.endDate)} · movimento {impactLabel(e.impact).toLowerCase()}</span>
                  </span>
                  <button className="btn btn-ghost" aria-label={`Remover ${e.name}`} onClick={() => removeEvent(e.id)}>Remover</button>
                </li>
              ))}
              {events.data?.length === 0 && <li className="muted">Nenhum evento cadastrado.</li>}
            </ul>

            <form onSubmit={addEvent} className="grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className="mb-1 block font-medium">Nome do evento</span>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
              <label><span className="mb-1 block font-medium">Início</span>
                <input type="date" className="input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required /></label>
              <label><span className="mb-1 block font-medium">Fim</span>
                <input type="date" className="input" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required /></label>
              <label><span className="mb-1 block font-medium">Movimento esperado</span>
                <select className="input" value={form.impact} onChange={(e) => setForm({ ...form, impact: Number(e.target.value) })}>
                  <option value={1}>Baixo</option><option value={3}>Médio</option><option value={5}>Alto</option>
                </select></label>
              <button className="btn btn-primary self-end">Adicionar evento</button>
            </form>
          </div>
        </details>
      </div>
    </div>
  );
}
