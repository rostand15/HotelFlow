import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try { await login(email, password); navigate("/"); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ink px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h1 className="text-xl font-semibold text-ink">Titão Plaza Hotel</h1>
        <p className="mb-5 text-base text-slate-700">Entre para acessar a governança.</p>
        <label className="mb-1 block text-base font-medium" htmlFor="email">E-mail</label>
        <input id="email" className="input mb-3" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label className="mb-1 block text-base font-medium" htmlFor="pw">Senha</label>
        <input id="pw" className="input mb-4" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p role="alert" className="mb-3 text-base text-red-800">{error}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Entrando…" : "Entrar"}</button>
      </form>
    </div>
  );
}
