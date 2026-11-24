// API FALSA para demonstração: guarda tudo em memória (some ao recarregar a página).
// Reproduz as mesmas regras do backend para as telas se comportarem igual.
import { ApiError } from "./errors";
import type {
  CityEvent, CleaningStatus, ForecastDay, Housekeeper, Role, Room, ShiftStatus, Task, TaskStatus, TaskType, User,
} from "../types";

type Occ = "LIVRE" | "OCUPADO";
interface MRoom { id: string; number: string; floor: number; type: string; occupancy: Occ; cleaning: CleaningStatus; statusUpdatedAt: string }
interface MTask { id: string; roomId: string; type: TaskType; status: TaskStatus; priority: number; estimatedMin: number; housekeeperId: string | null }

// ---------- datas ----------
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const parse = (s: string) => new Date(s + "T00:00:00");
const dayNum = (d: Date) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
const today = new Date();
const todayISO = iso(today);

// ---------- usuários ----------
const USERS: (User & { hk?: string })[] = [
  { id: "u-admin", name: "Admin Teste", email: "admin@teste.com", role: "ADMIN" },
  { id: "u-gov", name: "Gestor Teste", email: "gestor@teste.com", role: "GOVERNANTA" },
  { id: "u-rec", name: "Recepção Teste", email: "recepcao@teste.com", role: "RECEPCAO" },
  { id: "u-c1", name: "Colaborador Teste 1", email: "colaborador1@teste.com", role: "CAMAREIRA", hk: "h1" },
  { id: "u-c2", name: "Colaborador Teste 2", email: "colaborador2@teste.com", role: "CAMAREIRA", hk: "h2" },
  { id: "u-c3", name: "Colaborador Teste 3", email: "colaborador3@teste.com", role: "CAMAREIRA", hk: "h3" },
  { id: "u-c4", name: "Colaborador Teste 4", email: "colaborador4@teste.com", role: "CAMAREIRA", hk: "h4" },
  { id: "u-c5", name: "Colaborador Teste 5", email: "colaborador5@teste.com", role: "CAMAREIRA", hk: "h5" },
];
const MAIDS = USERS.filter((u) => u.hk).map((u) => ({ id: u.hk!, name: u.name, maxRooms: 14 }));
const publicUser = ({ hk: _hk, ...u }: User & { hk?: string }): User => u;

// ---------- quartos ----------
const pattern: [Occ, CleaningStatus][] = [
  ["OCUPADO", "LIMPO"], ["LIVRE", "SUJO"], ["OCUPADO", "LIMPO"], ["LIVRE", "EM_LIMPEZA"], ["LIVRE", "INSPECIONADO"],
  ["OCUPADO", "LIMPO"], ["LIVRE", "LIMPO"], ["OCUPADO", "LIMPO"], ["LIVRE", "SUJO"], ["OCUPADO", "LIMPO"],
];
const rooms: MRoom[] = [];
for (let floor = 1; floor <= 4; floor++) {
  for (let n = 1; n <= 10; n++) {
    let [occupancy, cleaning] = pattern[(n - 1 + (floor - 1) * 3) % 10];
    const number = `${floor}${pad(n)}`;
    if (number === "205" || number === "410") { occupancy = "LIVRE"; cleaning = "MANUTENCAO"; }
    rooms.push({
      id: `r${number}`, number, floor, type: n > 8 ? "Suíte" : "Standard", occupancy, cleaning,
      statusUpdatedAt: new Date(Date.now() - (n * 7 + floor * 3) * 60000).toISOString(),
    });
  }
}

// ---------- tarefas iniciais ----------
let seq = 1;
const tasks: MTask[] = [];
const mk = (roomId: string, type: TaskType, status: TaskStatus, hk: string | null, est: number) =>
  tasks.push({ id: `t${seq++}`, roomId, type, status, priority: type === "CHECKOUT" ? 2 : 0, estimatedMin: est, housekeeperId: hk });

rooms.filter((r) => r.cleaning === "EM_LIMPEZA").forEach((r, i) => mk(r.id, "CHECKOUT", "EM_ANDAMENTO", `h${(i % 4) + 1}`, 35));
const pendOwners = ["h1", "h1", "h2", "h2", "h3", null, null];
rooms.filter((r) => r.cleaning === "SUJO").forEach((r, i) => mk(r.id, "CHECKOUT", "PENDENTE", pendOwners[i] ?? null, 35));
rooms.filter((r) => r.cleaning === "INSPECIONADO").forEach((r, i) => mk(r.id, "CHECKOUT", "CONCLUIDA", ["h1", "h1", "h2", "h3"][i % 4], 35));
rooms.filter((r) => r.occupancy === "LIVRE" && r.cleaning === "LIMPO").slice(0, 2).forEach((r, i) => mk(r.id, "CHECKOUT", "CONCLUIDA", i ? "h4" : "h2", 35));
rooms.filter((r) => r.occupancy === "OCUPADO" && r.cleaning === "LIMPO").slice(0, 3).forEach((r, i) => mk(r.id, "ESTADIA", "PENDENTE", ["h3", "h4", "h2"][i], 15));

// ---------- eventos e escala ----------
let events: CityEvent[] = [
  { id: "e1", name: "Evento Teste 1", startDate: iso(addDays(today, 3)), endDate: iso(addDays(today, 5)), impact: 3 },
  { id: "e2", name: "Evento Teste 2", startDate: iso(addDays(today, 9)), endDate: iso(addDays(today, 10)), impact: 4 },
];
const shiftOverrides: Record<string, ShiftStatus> = {};

function shiftFor(dateISO: string, i: number): ShiftStatus {
  const ov = shiftOverrides[`${dateISO}:${i}`];
  if (ov) return ov;
  const off = dayNum(parse(dateISO)) - dayNum(today);
  const folgas = new Set<number>([(((4 + off) % 5) + 5) % 5]);
  if (off >= 3 && off <= 5) { folgas.add(0); folgas.add(2); } // dias de evento: menos gente escalada
  if (folgas.has(i)) return "FOLGA";
  return off === 0 && i < 2 ? "PRESENTE" : "ESCALADA";
}

// ---------- regras ----------
const transitions: Record<CleaningStatus, CleaningStatus[]> = {
  SUJO: ["EM_LIMPEZA", "MANUTENCAO"],
  EM_LIMPEZA: ["LIMPO", "SUJO", "MANUTENCAO"],
  LIMPO: ["INSPECIONADO", "SUJO", "MANUTENCAO"],
  INSPECIONADO: ["SUJO", "MANUTENCAO"],
  MANUTENCAO: ["SUJO"],
};
const isActive = (t: MTask) => t.status === "PENDENTE" || t.status === "EM_ANDAMENTO";
const maidName = (id: string | null) => MAIDS.find((m) => m.id === id)?.name ?? null;
const roomOf = (id: string) => rooms.find((r) => r.id === id)!;

function setCleaning(room: MRoom, to: CleaningStatus) {
  if (room.cleaning === to) return;
  if (!transitions[room.cleaning].includes(to)) throw new ApiError(400, `Não é possível ir de ${room.cleaning} para ${to}`);
  if (to === "MANUTENCAO") tasks.filter((t) => t.roomId === room.id && isActive(t)).forEach((t) => (t.status = "CANCELADA"));
  room.cleaning = to;
  room.statusUpdatedAt = new Date().toISOString();
}

function toRoom(r: MRoom): Room {
  const a = tasks.find((t) => t.roomId === r.id && isActive(t));
  return {
    id: r.id, number: r.number, floor: r.floor, type: r.type, occupancy: r.occupancy, cleaning: r.cleaning,
    statusUpdatedAt: r.statusUpdatedAt, allowedNext: transitions[r.cleaning],
    activeTask: a ? { id: a.id, type: a.type, status: a.status, housekeeperName: maidName(a.housekeeperId) } : null,
  };
}

function toTask(t: MTask): Task {
  const r = roomOf(t.roomId);
  const name = maidName(t.housekeeperId);
  return {
    id: t.id, type: t.type, status: t.status, priority: t.priority, estimatedMin: t.estimatedMin,
    housekeeperId: t.housekeeperId, room: { number: r.number, floor: r.floor, occupancy: r.occupancy },
    housekeeper: name ? { user: { name } } : null,
  };
}

const statusOrder: TaskStatus[] = ["EM_ANDAMENTO", "PENDENTE", "CONCLUIDA", "CANCELADA"];
const sortTasks = (list: MTask[]) =>
  [...list].sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status) || b.priority - a.priority);

function canWork(hkId: string, excludeTaskId?: string) {
  const idx = MAIDS.findIndex((m) => m.id === hkId);
  const s = shiftFor(todayISO, idx);
  if (s === "FOLGA" || s === "FALTA") throw new ApiError(400, "Camareira não está escalada neste dia");
  const load = tasks.filter((t) => t.housekeeperId === hkId && t.status !== "CANCELADA" && t.id !== excludeTaskId).length;
  if (load >= MAIDS[idx].maxRooms) throw new ApiError(400, "Camareira atingiu o limite de quartos do turno");
}

function forecast(days: number) {
  const rate = [0.7, 0.55, 0.55, 0.6, 0.7, 0.9, 0.92]; // dom..sáb
  const out: ForecastDay[] = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(today, i);
    const dateISO = iso(d);
    const evs = events.filter((e) => e.startDate <= dateISO && e.endDate >= dateISO);
    const uplift = Math.min(0.3, evs.reduce((s, e) => s + e.impact * 0.04, 0));
    const roomsSold = Math.round(Math.min(1, rate[d.getDay()] + uplift) * rooms.length);
    const checkouts = Math.round(roomsSold * 0.42);
    const minutes = checkouts * 35 + (roomsSold - checkouts) * 15;
    const needed = Math.ceil(minutes / (480 * 0.8));
    const scheduled = MAIDS.filter((_, k) => ["ESCALADA", "PRESENTE"].includes(shiftFor(dateISO, k))).length;
    out.push({
      date: dateISO, expectedOccupancy: roomsSold / rooms.length, roomsSold, reservedRooms: 0,
      expectedCheckouts: checkouts, workloadMinutes: minutes, housekeepersNeeded: needed,
      housekeepersScheduled: scheduled, gap: scheduled - needed,
      events: evs.map((e) => ({ id: e.id, name: e.name, impact: e.impact })),
    });
  }
  return out;
}

// ---------- roteador ----------
const copy = <T,>(x: unknown) => JSON.parse(JSON.stringify(x ?? null)) as T;

export async function mockApi<T>(path: string, method: string, body: any, token: string | null): Promise<T> {
  await new Promise((r) => setTimeout(r, 120));
  const [pathname, qs = ""] = path.split("?");
  const query = new URLSearchParams(qs);
  const is = (m: string, re: RegExp) => (method === m ? pathname.match(re) : null);

  if (is("POST", /^\/auth\/login$/)) {
    const u = USERS.find((x) => x.email === body?.email?.trim().toLowerCase());
    if (!u || body?.password !== "123456") throw new ApiError(401, "E-mail ou senha incorretos");
    return copy<T>({ token: `mock:${u.id}`, user: publicUser(u) });
  }

  const me = USERS.find((u) => token === `mock:${u.id}`);
  if (!me) throw new ApiError(401, "Faça login para continuar");
  const need = (...roles: Role[]) => { if (!roles.includes(me.role)) throw new ApiError(403, "Você não tem permissão para esta ação"); };
  const manager: Role[] = ["ADMIN", "GOVERNANTA", "RECEPCAO"];
  const boss: Role[] = ["ADMIN", "GOVERNANTA"];
  let m: RegExpMatchArray | null;

  if (is("GET", /^\/auth\/me$/)) return copy<T>(publicUser(me));

  // quartos
  if (is("GET", /^\/rooms$/)) return copy<T>(rooms.map(toRoom));
  if ((m = is("POST", /^\/rooms\/([^/]+)\/checkin$/))) {
    need(...manager);
    const r = roomOf(m[1]);
    if (r.occupancy === "OCUPADO") throw new ApiError(400, "Quarto já está ocupado");
    if (r.cleaning !== "LIMPO" && r.cleaning !== "INSPECIONADO") throw new ApiError(400, "Quarto ainda não está pronto para receber hóspede");
    r.occupancy = "OCUPADO"; r.statusUpdatedAt = new Date().toISOString();
    return copy<T>(r);
  }
  if ((m = is("POST", /^\/rooms\/([^/]+)\/checkout$/))) {
    need(...manager);
    const r = roomOf(m[1]);
    if (r.occupancy !== "OCUPADO") throw new ApiError(400, "Quarto não está ocupado");
    r.occupancy = "LIVRE";
    tasks.filter((t) => t.roomId === r.id && t.type === "ESTADIA" && t.status === "PENDENTE").forEach((t) => (t.status = "CANCELADA"));
    setCleaning(r, "SUJO");
    if (!tasks.some((t) => t.roomId === r.id && isActive(t))) mk(r.id, "CHECKOUT", "PENDENTE", null, 35);
    return copy<T>(r);
  }
  if ((m = is("PATCH", /^\/rooms\/([^/]+)\/cleaning$/))) {
    need(...manager);
    const r = roomOf(m[1]);
    setCleaning(r, body.status);
    return copy<T>(r);
  }

  // tarefas
  if (is("GET", /^\/tasks$/)) { need(...manager); return copy<T>(sortTasks(tasks).map(toTask)); }
  if (is("GET", /^\/tasks\/mine$/)) {
    need("CAMAREIRA");
    return copy<T>(sortTasks(tasks.filter((t) => t.housekeeperId === me.hk)).map(toTask));
  }
  if (is("POST", /^\/tasks\/generate-daily$/)) {
    need(...boss);
    const free = rooms.filter((r) => r.occupancy === "OCUPADO" && !tasks.some((t) => t.roomId === r.id && isActive(t)));
    free.forEach((r) => mk(r.id, "ESTADIA", "PENDENTE", null, 15));
    return copy<T>({ created: free.length });
  }
  if (is("POST", /^\/tasks\/auto-assign$/)) {
    need(...boss);
    const avail = MAIDS.map((mm, i) => ({ mm, i })).filter(({ i }) => ["ESCALADA", "PRESENTE"].includes(shiftFor(todayISO, i)));
    if (!avail.length) throw new ApiError(400, "Nenhuma camareira escalada para esta data");
    const loads = avail.map(({ mm }) => {
      const own = tasks.filter((t) => t.housekeeperId === mm.id && t.status !== "CANCELADA");
      return { id: mm.id, max: mm.maxRooms, count: own.length, minutes: own.reduce((s, t) => s + t.estimatedMin, 0), floors: new Set(own.map((t) => roomOf(t.roomId).floor)) };
    });
    let assigned = 0, unassigned = 0;
    for (const t of tasks.filter((x) => x.status === "PENDENTE" && !x.housekeeperId).sort((a, b) => b.priority - a.priority)) {
      const floor = roomOf(t.roomId).floor;
      const open = loads.filter((l) => l.count < l.max);
      if (!open.length) { unassigned++; continue; }
      const same = open.filter((l) => l.floors.has(floor));
      const pool = same.length ? same : open;
      const c = pool.reduce((a, b) => (b.minutes < a.minutes ? b : a));
      c.count++; c.minutes += t.estimatedMin; c.floors.add(floor);
      t.housekeeperId = c.id; assigned++;
    }
    return copy<T>({ assigned, unassigned });
  }
  if ((m = is("PATCH", /^\/tasks\/([^/]+)\/assign$/))) {
    need(...boss);
    const t = tasks.find((x) => x.id === m![1])!;
    if (t.status !== "PENDENTE") throw new ApiError(400, "Só é possível atribuir tarefa pendente");
    canWork(body.housekeeperId, t.id);
    t.housekeeperId = body.housekeeperId;
    return copy<T>(t);
  }
  if ((m = is("POST", /^\/tasks\/([^/]+)\/start$/))) {
    need("CAMAREIRA");
    const t = tasks.find((x) => x.id === m![1])!;
    if (t.housekeeperId !== me.hk) throw new ApiError(403, "Esta tarefa é de outra camareira");
    if (t.status !== "PENDENTE") throw new ApiError(400, "Tarefa não está pendente");
    if (tasks.some((x) => x.housekeeperId === me.hk && x.status === "EM_ANDAMENTO")) {
      throw new ApiError(400, "Conclua o quarto em andamento antes de iniciar outro");
    }
    const r = roomOf(t.roomId);
    if (r.cleaning === "SUJO") setCleaning(r, "EM_LIMPEZA");
    t.status = "EM_ANDAMENTO";
    return copy<T>(t);
  }
  if ((m = is("POST", /^\/tasks\/([^/]+)\/finish$/))) {
    need("CAMAREIRA");
    const t = tasks.find((x) => x.id === m![1])!;
    if (t.housekeeperId !== me.hk) throw new ApiError(403, "Esta tarefa é de outra camareira");
    if (t.status !== "EM_ANDAMENTO") throw new ApiError(400, "Tarefa ainda não foi iniciada");
    const r = roomOf(t.roomId);
    if (r.cleaning === "EM_LIMPEZA") setCleaning(r, "LIMPO");
    t.status = "CONCLUIDA";
    return copy<T>(t);
  }
  if ((m = is("POST", /^\/tasks\/([^/]+)\/cancel$/))) {
    need(...boss);
    const t = tasks.find((x) => x.id === m![1])!;
    if (!isActive(t)) throw new ApiError(400, "Tarefa já finalizada");
    t.status = "CANCELADA";
    return copy<T>(t);
  }

  // equipe
  if (is("GET", /^\/housekeepers$/)) {
    need(...manager);
    const date = query.get("date") ?? todayISO;
    return copy<T>(MAIDS.map((mm, i): Housekeeper => {
      const own = date === todayISO ? tasks.filter((t) => t.housekeeperId === mm.id && t.status !== "CANCELADA") : [];
      return {
        id: mm.id, name: mm.name, maxRoomsPerShift: mm.maxRooms, shiftStatus: shiftFor(date, i),
        tasksTotal: own.length, tasksDone: own.filter((t) => t.status === "CONCLUIDA").length,
        minutesPlanned: own.reduce((s, t) => s + t.estimatedMin, 0),
      };
    }));
  }
  if (is("PUT", /^\/shifts$/)) {
    need(...boss);
    const i = MAIDS.findIndex((x) => x.id === body.housekeeperId);
    shiftOverrides[`${body.date}:${i}`] = body.status;
    return copy<T>({ ok: true });
  }

  // previsão e eventos
  if (is("GET", /^\/forecast$/)) {
    need(...manager);
    return copy<T>({ config: {}, days: forecast(Number(query.get("days") ?? 14)) });
  }
  if (is("GET", /^\/events$/)) {
    need(...manager);
    return copy<T>(events.filter((e) => e.endDate >= todayISO).sort((a, b) => a.startDate.localeCompare(b.startDate)));
  }
  if (is("POST", /^\/events$/)) {
    need(...manager);
    if (body.endDate < body.startDate) throw new ApiError(400, "A data final deve ser depois da inicial");
    const ev: CityEvent = { id: `e${Date.now()}`, name: body.name, startDate: body.startDate, endDate: body.endDate, impact: body.impact };
    events = [...events, ev];
    return copy<T>(ev);
  }
  if ((m = is("DELETE", /^\/events\/([^/]+)$/))) {
    need(...manager);
    events = events.filter((e) => e.id !== m![1]);
    return undefined as T;
  }

  throw new ApiError(404, "Rota não encontrada");
}
