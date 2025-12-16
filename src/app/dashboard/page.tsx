// src/app/dashboard/page.tsx
"use client";

import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import Navigation from "@/components/navigation/Navigation";

// USANDO TUS TIPOS EXISTENTES
import { PerfilData } from "@/types/auth";
import { UserStats } from "@/types/userStats";
import { VisitaLogData } from "@/types/visitLogData";
import { getUserStats, recordVisit } from "@/lib/visits";

// Formateador de moneda Euro
const euroFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

// Definición de Periodos de Filtro
type FilterPeriod = "month" | "week" | "day" | "all";

export default function DashboardPage() {
  const router = useRouter();
  const [perfil, setPerfil] = useState<PerfilData | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cpInput, setCpInput] = useState("");

  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("month");

  // Carga de Perfil y Estadísticas
  const loadData = async () => {
    setIsLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: perfilData, error: profileError } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) {
      setError("Error al cargar el perfil.");
    } else {
      setPerfil(perfilData as PerfilData);
      const userStats = await getUserStats(user.id);
      setStats(userStats);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Registro de Visita
  const handleRecordVisit = async () => {
    if (!perfil?.id) return;
    if (!cpInput || cpInput.length === 0) {
      alert("Introduce un Código Postal.");
      return;
    }

    const result = await recordVisit(perfil.id, cpInput);

    if (result) {
      alert(`Visita registrada en CP ${cpInput}.`);
      setCpInput("");
      loadData(); // Recargar datos
    } else {
      alert(`ERROR: El CP ${cpInput} no existe o hubo un error de conexión.`);
    }
  };

  // LÓGICA DE FILTRADO (Corregida con getTime() para comparación numérica)
  const filteredLogs = useMemo<VisitaLogData[]>(() => {
    const logs = stats?.detailed_logs || [];
    if (filterPeriod === "all" || logs.length === 0) return logs;

    const now = new Date();
    let startDate: Date;

    switch (filterPeriod) {
      case "day":
        // Inicio de hoy (medianoche)
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        // Hace 7 días
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
      default:
        // Inicio de este mes (Día 1)
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const startTime = startDate.getTime();

    // Filtra: la fecha del log (en milisegundos) debe ser >= a la fecha de inicio (en milisegundos)
    return logs.filter(
      (log) => new Date(log.created_at).getTime() >= startTime
    );
  }, [stats, filterPeriod]);

  if (isLoading) {
    return <div className="p-5">Cargando datos...</div>;
  }
  if (error) {
    return (
      <div className="p-5 text-red-500">
        <h1>Error: {error}</h1>
        <button onClick={handleLogout}>Cerrar Sesión</button>
      </div>
    );
  }
  if (!perfil) {
    return (
      <div className="p-5">
        <h1>Error de Perfil</h1>
        <p>Datos no encontrados.</p>
        <button onClick={handleLogout}>Cerrar Sesión</button>
      </div>
    );
  }

  // Clases de Tailwind para los botones de filtro
  const getButtonClass = (period: FilterPeriod) => {
    const base =
      "px-4 py-2 mr-3 rounded-lg border-2 transition duration-200 ease-in-out font-semibold";
    return period === filterPeriod
      ? `${base} bg-purple-600 text-white border-purple-700 hover:bg-purple-700` // Activo
      : `${base} bg-gray-600 text-white border-gray-700 hover:bg-gray-700`; // Inactivo
  };

  // Función de formateo de fecha
  const formatLogDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <Navigation />
      <div className="p-6 text-white bg-gray-900 min-h-screen">
        <h1 className="text-3xl font-bold mb-4">
          Bienvenido, {perfil.nombre} 👋
        </h1>
        <button
          onClick={handleLogout}
          className="mt-2 bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
        >
          Cerrar Sesión
        </button>

        {/* SECCIÓN DE REGISTRO */}
        <div className="mt-8 pt-5 border-t border-gray-700">
          <h2 className="text-2xl font-semibold mb-4">
            Registrar Nueva Visita
          </h2>
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Introduce Código Postal (ej: 28001)"
              value={cpInput}
              onChange={(e) => setCpInput(e.target.value)}
              className="p-3 bg-gray-800 border border-purple-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 flex-grow"
            />
            <button
              onClick={handleRecordVisit}
              className="py-3 px-6 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg transition duration-200 whitespace-nowrap"
            >
              REGISTRAR
            </button>
          </div>
        </div>

        {/* TABLA 2: RESUMEN MENSUAL */}
        <div className="mt-10 pt-5 border-t border-gray-700">
          <h2 className="text-xl font-semibold mb-4">
            💰 Total Generado en el Mes Actual
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border border-gray-700">
              <thead>
                <tr className="bg-gray-700">
                  <th className="border border-gray-600 p-3 text-left">
                    Periodo
                  </th>
                  <th className="border border-gray-600 p-3 text-left">
                    Total Generado
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-gray-800 hover:bg-gray-700">
                  <td className="border border-gray-600 p-3">
                    Mes en Curso (
                    {new Date().toLocaleDateString("es-ES", {
                      month: "long",
                      year: "numeric",
                    })}
                    )
                  </td>
                  <td className="border border-gray-600 p-3 font-bold text-green-400">
                    {euroFormatter.format(stats?.money_month || 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* TABLA 1: DETALLE DE VISITAS CON FILTROS */}
        <div className="mt-10 pt-5 border-t border-gray-700">
          <h2 className="text-xl font-semibold mb-4">
            Historial Detallado de Visitas ({filterPeriod.toUpperCase()})
          </h2>

          {/* BOTONES DE FILTRO */}
          <div className="mb-4 flex flex-wrap">
            <button
              onClick={() => setFilterPeriod("month")}
              className={getButtonClass("month")}
            >
              Mensual
            </button>
            <button
              onClick={() => setFilterPeriod("week")}
              className={getButtonClass("week")}
            >
              Semanal
            </button>
            <button
              onClick={() => setFilterPeriod("day")}
              className={getButtonClass("day")}
            >
              Diario
            </button>
          </div>

          {filteredLogs.length === 0 ? (
            <p className="text-yellow-500">
              No hay visitas registradas para el periodo seleccionado (
              {filterPeriod.toUpperCase()}).
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto border border-gray-700">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="border border-gray-600 p-3 text-left w-1/6">
                      CP
                    </th>
                    <th className="border border-gray-600 p-3 text-left w-2/5">
                      Barrio / Municipio
                    </th>
                    <th className="border border-gray-600 p-3 text-left w-1/4">
                      Fecha y Hora
                    </th>
                    <th className="border border-gray-600 p-3 text-left w-1/6">
                      Coste (€)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log, index) => (
                    <tr key={index} className="bg-gray-800 hover:bg-gray-700">
                      <td className="border border-gray-600 p-3 text-purple-400">
                        {log.cp.codigo_postal}
                      </td>
                      <td className="border border-gray-600 p-3">
                        {log.cp.nombre_barrio}
                      </td>
                      <td className="border border-gray-600 p-3">
                        {formatLogDate(log.created_at)}
                      </td>
                      <td className="border border-gray-600 p-3 font-bold text-green-500">
                        {euroFormatter.format(parseFloat(log.monto_generado))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
