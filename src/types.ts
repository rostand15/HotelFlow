export type Role = "ADMIN" | "GOVERNANTA" | "RECEPCAO" | "CAMAREIRA";
export type CleaningStatus = "SUJO" | "EM_LIMPEZA" | "LIMPO" | "INSPECIONADO" | "MANUTENCAO";
export type TaskType = "CHECKOUT" | "ESTADIA" | "REFORCO" | "INSPECAO";
export type TaskStatus = "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA";
export type ShiftStatus = "ESCALADA" | "PRESENTE" | "FALTA" | "FOLGA";

export interface User { id: string; name: string; email: string; role: Role }

export interface Room {
  id: string; number: string; floor: number; type: string;
  occupancy: "LIVRE" | "OCUPADO";
  cleaning: CleaningStatus;
  statusUpdatedAt: string;
  allowedNext: CleaningStatus[];
  activeTask: { id: string; type: TaskType; status: TaskStatus; housekeeperName: string | null } | null;
}

export interface Task {
  id: string; type: TaskType; status: TaskStatus; priority: number; estimatedMin: number;
  housekeeperId: string | null;
  room: { number: string; floor: number; occupancy: "LIVRE" | "OCUPADO" };
  housekeeper: { user: { name: string } } | null;
}

export interface Housekeeper {
  id: string; name: string; maxRoomsPerShift: number; shiftStatus: ShiftStatus | null;
  tasksTotal: number; tasksDone: number; minutesPlanned: number;
}

export interface ForecastDay {
  date: string; expectedOccupancy: number; roomsSold: number; reservedRooms: number;
  expectedCheckouts: number; workloadMinutes: number;
  housekeepersNeeded: number; housekeepersScheduled: number; gap: number;
  events: { id: string; name: string; impact: number }[];
}

export interface CityEvent { id: string; name: string; startDate: string; endDate: string; impact: number }

export const cleaningLabel: Record<CleaningStatus, string> = {
  SUJO: "Sujo", EM_LIMPEZA: "Em limpeza", LIMPO: "Limpo", INSPECIONADO: "Inspecionado", MANUTENCAO: "Manutenção",
};
export const taskTypeLabel: Record<TaskType, string> = {
  CHECKOUT: "Saída", ESTADIA: "Arrumação", REFORCO: "Reforço", INSPECAO: "Inspeção",
};
export const taskStatusLabel: Record<TaskStatus, string> = {
  PENDENTE: "Pendente", EM_ANDAMENTO: "Em andamento", CONCLUIDA: "Concluída", CANCELADA: "Cancelada",
};
export const shiftLabel: Record<ShiftStatus, string> = {
  ESCALADA: "Escalada", PRESENTE: "Presente", FALTA: "Faltou", FOLGA: "Folga",
};
