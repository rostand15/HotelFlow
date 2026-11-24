import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Rooms from "./pages/Rooms";
import Tasks from "./pages/Tasks";
import MyTasks from "./pages/MyTasks";
import Staffing from "./pages/Staffing";
import type { Role } from "./types";

function Protected({ roles, children }: { roles?: Role[]; children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-6 text-slate-500">Carregando…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

function Home() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "CAMAREIRA" ? "/minhas-tarefas" : "/quartos"} replace />;
}

const managers: Role[] = ["ADMIN", "GOVERNANTA", "RECEPCAO"];

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/quartos" element={<Protected roles={managers}><Rooms /></Protected>} />
      <Route path="/tarefas" element={<Protected roles={managers}><Tasks /></Protected>} />
      <Route path="/equipe" element={<Protected roles={managers}><Staffing /></Protected>} />
      <Route path="/minhas-tarefas" element={<Protected roles={["CAMAREIRA"]}><MyTasks /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
