import { NavLink, useNavigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";

const links = [
  { to: "/quartos", label: "Quartos", roles: ["ADMIN", "GOVERNANTA", "RECEPCAO"] },
  { to: "/tarefas", label: "Tarefas", roles: ["ADMIN", "GOVERNANTA", "RECEPCAO"] },
  { to: "/equipe", label: "Equipe", roles: ["ADMIN", "GOVERNANTA", "RECEPCAO"] },
  { to: "/minhas-tarefas", label: "Minhas tarefas", roles: ["CAMAREIRA"] },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <a href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Ir para o conteúdo
      </a>
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="text-lg font-semibold">Titão Plaza</span>
          <nav aria-label="Principal" className="flex flex-wrap gap-1">
            {links.filter((l) => user && l.roles.includes(user.role)).map((l) => (
              <NavLink key={l.to} to={l.to}
                className={({ isActive }) =>
                  `rounded px-3 py-2 text-base ${isActive ? "bg-white font-semibold text-ink" : "hover:bg-white/15"}`}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-base">{user?.name}</span>
            <button className="min-h-[44px] rounded border border-white px-3 hover:bg-white/15"
              onClick={() => { logout(); navigate("/login"); }}>
              Sair
            </button>
          </div>
        </div>
      </header>
      <main id="conteudo" tabIndex={-1} className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
