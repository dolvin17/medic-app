"use client";

import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login"); // Redirige a login después de cerrar sesión
  };

  // TODO: lógica para mostrar el nombre del usuario de la tabla 'usuarios'
  // usando el ID de la sesión actual (supabase.auth.getSession())

  return (
    <div style={{ padding: "20px" }}>
      <h1>Bienvenida al Dashboard</h1>
      <p>Has iniciado sesión correctamente.</p>
      <button
        onClick={handleLogout}
      >
        Cerrar Sesión
      </button>
    </div>
  );
}
