"use client";

import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import Navigation from "@/components/navigation/Navigation";
import { PerfilData } from "@/types/auth";
import { UserStats } from "@/types/userStats";
import { VisitaLogData } from "@/types/visitLogData";
import { getUserStats, recordVisit } from "@/lib/visits";
import TargetProgress from "./TargetProgress";

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
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("month");

  // --- 💡 NUEVOS ESTADOS DE PAGINACIÓN ---
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

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

  // --- 💡 RESET PAGINACIÓN AL FILTRAR ---
  useEffect(() => {
    setCurrentPage(1);
  }, [filterPeriod, selectedDate]);

  const handleRecordVisit = async () => {
    if (!perfil?.id) return;
    if (!cpInput || cpInput.length === 0) {
      alert("Introduce un Código Postal.");
      return;
    }

    const result = await recordVisit(perfil.id, cpInput);

    if (result) {
      setCpInput("");
      loadData();
    } else {
      alert(`ERROR: El CP ${cpInput} no existe o hubo un error de conexión.`);
    }
  };

  const filteredLogs = useMemo<VisitaLogData[]>(() => {
    const logs = stats?.detailed_logs || [];
    if (filterPeriod === "all" || logs.length === 0) return logs;

    const now = new Date();
    let startDate: Date;

    switch (filterPeriod) {
      case "day":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    if (filterPeriod === "day") {
      return logs.filter((log) => {
        const logDate = new Date(log.created_at).toISOString().split("T")[0];
        return logDate === selectedDate;
      });
    }

    const startTime = startDate.getTime();
    return logs.filter(
      (log) => new Date(log.created_at).getTime() >= startTime
    );
  }, [stats, filterPeriod, selectedDate]);

  // --- 💡 OPTIMIZACIÓN Y SEGMENTACIÓN DE PÁGINAS ---
  const paginatedLogs = useMemo(() => {
    const lastIndex = currentPage * recordsPerPage;
    const firstIndex = lastIndex - recordsPerPage;
    return filteredLogs.slice(firstIndex, lastIndex);
  }, [filteredLogs, currentPage]);

  const totalPages = Math.ceil(filteredLogs.length / recordsPerPage);

  const getButtonClass = (period: FilterPeriod) => {
    const base =
      "px-4 py-2 mr-2 rounded-md text-sm font-medium transition-all duration-200 ease-in-out border";
    return period === filterPeriod
      ? `${base} bg-purple-300 text-black border-white hover:bg-gray-200`
      : `${base} bg-transparent text-gray-400 border-white/[0.1] hover:border-white/[0.3] hover:text-white`;
  };

  const formatLogDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const saludos = [
    "Buenos días, el sol hoy salió tarde porque tú brillabas más,",
    "Buenos días, mi lugar seguro",
    "Hoy también amanecí contigo en mi corazón",
    "Buenos días, gracias por existir",
    "Amanecí agradeciendo que existas. Buenos días",
    "Que tu mañana sea ligera. Buenos días, amor",
    "Buenos días, mi persona favorita",
    "Buenos días, mi solcito",
    "Buenos días, gracias por existir",
  ];
  const diaDelMes = new Date().getDate();
  const saludoDelDia = saludos[(diaDelMes - 1) % saludos.length];

  if (isLoading)
    return (
      <div className="p-5 text-white bg-gray-900 min-h-screen animate-pulse">
        Cargando datos financieros...
      </div>
    );

  return (
    <>
      <Navigation />
      <div className="p-3 text-white bg-gray-900 min-h-screen">
        <div className="mb-3">
          <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mt-1">
            {new Date().toLocaleDateString("es-ES", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <h1 className="text-base italic py-4 text-white tracking-tight">
            {saludoDelDia}{" "}
            <span className="text-purple-400">{perfil?.nombre}</span> 🫀
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <TargetProgress stats={stats} />
        </div>

        {/* SECCIÓN DE REGISTRO */}
        <div className="pt-4 border-t border-white/[0.08]">
          <h2 className="text-[10px] font-bold text-gray-500 mb-4 uppercase tracking-widest">
            Registrar nueva visita ✍🏽
          </h2>
          <div className="flex sm:flex-row items-stretch gap-3">
            <input
              type="text"
              placeholder="Introduce CP"
              value={cpInput}
              onChange={(e) => setCpInput(e.target.value)}
              className="flex-grow px-4 py-2.5 bg-[#0a0a0a] border border-white/[0.1] rounded-lg text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-purple-500/40"
            />
            <button
              onClick={handleRecordVisit}
              className="px-6 border-white border-1 bg-purple-300 text-black text-[10px] font-bold uppercase rounded-lg hover:bg-white transition-all whitespace-nowrap"
            >
              Registrar
            </button>
          </div>
        </div>

        {/* TABLA 2: RESUMEN MENSUAL BRUTO */}
        <div className="mt-5 pt-4 border-t border-gray-700">
          <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
            💰 Ingresos Brutos
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left border-separate border-spacing-0 border border-white/[0.08] rounded-xl overflow-hidden bg-[#0a0a0a]">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="px-4 py-3 font-medium text-[10px] text-gray-500 uppercase">
                    Periodo
                  </th>
                  <th className="px-4 py-3 font-medium text-[10px] text-gray-500 uppercase">
                    Total Generado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08]">
                <tr className="group hover:bg-white/[0.04] transition-colors">
                  <td className="px-4 py-4 text-gray-300 capitalize font-medium">
                    {new Date().toLocaleDateString("es-ES", {
                      month: "long",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-4 text-green-400 font-bold font-mono">
                    {euroFormatter.format(stats?.money_month || 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* TABLA 1: DETALLE DE VISITAS CON FILTROS Y PAGINACIÓN */}
        <div className="mt-12 pt-4 border-t border-white/[0.08]">
          <h2 className="text-[10px] font-bold text-gray-500 mb-6 uppercase tracking-widest">
            Historial de visitas ({" "}
            <span className="text-purple-300">
              {filterPeriod.toUpperCase()}
            </span>{" "}
            )
          </h2>

          <div className="mb-6 flex flex-wrap gap-1">
            {["month", "week", "day"].map((p) => (
              <button
                key={p}
                onClick={() => setFilterPeriod(p as FilterPeriod)}
                className={getButtonClass(p as FilterPeriod)}
              >
                {p === "month"
                  ? "Mensual"
                  : p === "week"
                  ? "Semanal"
                  : "Diario"}
              </button>
            ))}
            {filterPeriod === "day" && (
              <div className="flex items-center gap-2 animate-in fade-in transition-all">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-white/[0.03] border border-white/[0.1] rounded-md px-2 py-1.5 text-xs text-white outline-none [color-scheme:dark]"
                />
              </div>
            )}
          </div>

          {paginatedLogs.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-white/[0.1] text-center">
              <p className="text-xs text-gray-600 italic">
                No hay visitas en este periodo.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0a]">
                <table className="min-w-full text-xs text-left border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-white/[0.02] text-[9px] uppercase text-gray-500 tracking-widest">
                      <th className="px-4 py-3 border-b border-white/[0.08]">
                        CP
                      </th>
                      <th className="px-4 py-3 border-b border-white/[0.08]">
                        Municipio
                      </th>
                      <th className="px-4 py-3 border-b border-white/[0.08]">
                        Fecha
                      </th>
                      <th className="px-4 py-3 border-b border-white/[0.08]">
                        Coste
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.08]">
                    {paginatedLogs.map((log, index) => (
                      <tr key={index} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-4 text-purple-400 font-mono">
                          {log.cp.codigo_postal}
                        </td>
                        <td className="px-4 py-4 text-gray-300">
                          {log.cp.nombre_barrio}
                        </td>
                        <td className="px-4 py-4 text-gray-500 italic">
                          {formatLogDate(log.created_at)}
                        </td>
                        <td className="px-4 py-4 text-green-400 font-bold">
                          {euroFormatter.format(parseFloat(log.monto_generado))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 💡 CONTROLES DE PAGINACIÓN */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center px-1 mt-4">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                    Página {currentPage} de {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                      className="p-2 border border-white/[0.1] rounded-lg disabled:opacity-20 hover:bg-white/5 transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      className="p-2 border border-white/[0.1] rounded-lg disabled:opacity-20 hover:bg-white/5 transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}