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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const euroFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

type FilterPeriod = "month" | "week" | "day" | "all";

export default function DashboardPage() {
  const router = useRouter();
  const [perfil, setPerfil] = useState<PerfilData | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cpInput, setCpInput] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [fraseH3, setFraseH3] = useState("");
  
  const frases = useMemo(() => [
    "Que el tráfico sea leve hoy en tus visitas. Conduce con cuidado",
    "Eres una profesional increíble y mi persona favorita. Te quiero",
    "Que hoy tus rutas sean tranquilas y tus pacientes agradecidos",
    "Eres una mujer increíble con una visión muy clara. Fuerza hoy",
    "¡A por la jornada! Nadie cuida los detalles como tú lo haces",
    "Gracias por tu esfuerzo diario. Feliz día",
    "Eres excelente en lo que haces y mi orgullo diario. Disfruta del día",
    "Buenos días. Tu dedicación es la clave de tu éxito futuro.",
    "Que hoy encuentres fluidez en la carretera y en la chambita",
  ], []);

  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("month");
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  const loadData = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: perfilData } = await supabase.from("usuarios").select("*").eq("id", user.id).single();
    if (perfilData) {
      setPerfil(perfilData as PerfilData);
      const userStats = await getUserStats(user.id);
      setStats(userStats);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
    setFraseH3(frases[Math.floor(Math.random() * frases.length)]);
  }, [router, frases]);

  const filteredLogs = useMemo<VisitaLogData[]>(() => {
    const logs = stats?.detailed_logs || [];
    if (filterPeriod === "all" || logs.length === 0) return logs;
    return logs.filter((log) => {
      const logDate = new Date(log.created_at);
      const logDateISO = logDate.toISOString().split("T")[0];
      if (filterPeriod === "day") return logDateISO === selectedDate;
      if (filterPeriod === "week") {
        const targetDate = new Date(selectedDate);
        const diffDays = (targetDate.getTime() - logDate.getTime()) / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays < 7;
      }
      if (filterPeriod === "month") {
        const [year, month] = selectedMonth.split("-");
        return logDate.getFullYear() === parseInt(year) && (logDate.getMonth() + 1) === parseInt(month);
      }
      return true;
    });
  }, [stats, filterPeriod, selectedDate, selectedMonth]);

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(`Reporte de Visitas - ${perfil?.nombre}`, 14, 15);
    const tableData = filteredLogs.map(log => [
      new Date(log.created_at).toLocaleDateString("es-ES"),
      log.cp.codigo_postal,
      log.cp.nombre_barrio,
      `${(log.cp as any).distancia_km || 0} km`,
      euroFormatter.format(Number((log.cp as any).tarifa || 0)),
      euroFormatter.format(Number(log.monto_generado))
    ]);
    autoTable(doc, {
      head: [['Fecha', 'CP', 'Municipio', 'Distancia', 'Tarifa', 'Total']],
      body: tableData,
      startY: 20,
      headStyles: { fillColor: [168, 85, 247] }
    });
    doc.save(`Visitas_Alix_${selectedMonth}.pdf`);
  };

  const paginatedLogs = useMemo(() => {
    const lastIndex = currentPage * recordsPerPage;
    return filteredLogs.slice(lastIndex - recordsPerPage, lastIndex);
  }, [filteredLogs, currentPage]);

  const totalPages = Math.ceil(filteredLogs.length / recordsPerPage);

  const getButtonClass = (period: FilterPeriod) => {
    const base = "px-4 py-2 mr-2 rounded-md text-sm font-medium transition-all duration-200 border";
    return period === filterPeriod
      ? `${base} bg-purple-300 text-black border-white`
      : `${base} bg-transparent text-gray-400 border-white/[0.1]`;
  };

  if (isLoading) return <div className="p-5 text-white bg-gray-900 min-h-screen">Cargando...</div>;

  return (
    <>
      <Navigation />
      <div className="p-3 text-white bg-gray-900 min-h-screen">
        <div className="mb-3">
          <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mt-1">
            {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="text-base italic py-4 text-white tracking-tight">
            {fraseH3} <span className="text-purple-400">{perfil?.nombre}</span> 🫀
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <TargetProgress stats={stats} />
        </div>

        <div className="pt-4 border-t border-white/[0.08]">
          <h2 className="text-[10px] font-bold text-gray-500 mb-4 uppercase tracking-widest">Nueva visita ✍🏽</h2>
          <div className="flex gap-3">
            <input
              type="text" placeholder="CP" value={cpInput}
              onChange={(e) => setCpInput(e.target.value)}
              className="flex-grow px-4 py-2.5 bg-[#0a0a0a] border border-white/[0.1] rounded-lg text-sm text-white outline-none"
            />
            <button onClick={loadData} className="px-6 bg-purple-300 text-black text-[10px] font-bold uppercase rounded-lg">Registrar</button>
          </div>
        </div>

        <div className="mt-12 pt-4 border-t border-white/[0.08]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Visitas ( <span className="text-purple-300">{filterPeriod.toUpperCase()}</span> )
            </h2>
            <div className="flex gap-2">
              <div className="bg-white/[0.03] p-1.5 rounded-xl border border-white/[0.08]">
                {filterPeriod === "month" ? (
                  <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent text-[11px] font-bold text-white outline-none [color-scheme:dark]" />
                ) : (
                  <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-[11px] font-bold text-white outline-none [color-scheme:dark]" />
                )}
              </div>
              <button onClick={exportToPDF} className="p-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold uppercase">PDF ⬇️</button>
            </div>
          </div>

          <div className="mb-6 flex gap-1">
            {["month", "week", "day"].map((p) => (
              <button key={p} onClick={() => setFilterPeriod(p as FilterPeriod)} className={getButtonClass(p as FilterPeriod)}>
                {p === "month" ? "Mes" : p === "week" ? "Semana" : "Día"}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0a]">
            <table className="min-w-full text-xs text-left">
              <thead>
                <tr className="bg-white/[0.02] text-[9px] uppercase text-gray-500 tracking-widest">
                  <th className="px-4 py-3 border-b border-white/[0.08]">Fecha</th>
                  <th className="px-4 py-3 border-b border-white/[0.08]">Barrio / CP</th>
                  <th className="px-4 py-3 border-b border-white/[0.08] text-right">Monto / KM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08]">
                {paginatedLogs.map((log, index) => (
                  <tr key={index} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-4 text-gray-500 font-mono align-top">
                      {new Date(log.created_at).toLocaleDateString("es-ES", { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-white font-medium">{log.cp.nombre_barrio}</p>
                      <p className="text-[10px] text-purple-400 font-mono">{log.cp.codigo_postal}</p>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p className="text-green-400 font-bold">{euroFormatter.format(Number(log.monto_generado))}</p>
                      <p className="text-[10px] text-gray-500 font-mono">{(log.cp as any).distancia_km || 0} km</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}