import { cleaningLabel, Room, CleaningStatus } from "../types";

const style: Record<CleaningStatus, string> = {
  SUJO: "bg-red-50 border-red-600 text-red-900",
  EM_LIMPEZA: "bg-amber-50 border-amber-600 text-amber-900",
  LIMPO: "bg-emerald-50 border-emerald-700 text-emerald-900",
  INSPECIONADO: "bg-teal-100 border-teal-800 text-teal-900",
  MANUTENCAO: "bg-slate-200 border-slate-600 border-dashed text-slate-900",
};
// Símbolos ajudam quem não distingue cores. O texto do status sempre aparece também.
const glyph: Record<CleaningStatus, string> = { SUJO: "✕", EM_LIMPEZA: "…", LIMPO: "✓", INSPECIONADO: "✓✓", MANUTENCAO: "!" };

export default function RoomCard({ room, onClick }: { room: Room; onClick: () => void }) {
  const occupied = room.occupancy === "OCUPADO";
  return (
    <button onClick={onClick}
      aria-label={`Quarto ${room.number}, ${cleaningLabel[room.cleaning]}, ${occupied ? "ocupado" : "livre"}`}
      className={`flex min-h-[96px] flex-col items-start rounded-lg border-2 p-3 text-left hover:shadow ${style[room.cleaning]}`}>
      <span className="text-2xl font-bold">{room.number}</span>
      <span className="mt-1 text-base font-semibold"><span aria-hidden="true">{glyph[room.cleaning]} </span>{cleaningLabel[room.cleaning]}</span>
      {occupied && <span className="mt-1 rounded bg-white/80 px-2 text-sm font-medium">Ocupado</span>}
    </button>
  );
}
