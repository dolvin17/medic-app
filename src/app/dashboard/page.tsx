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
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Line,
  LineChart,
} from "recharts";

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
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [fraseH3, setFraseH3] = useState("");

  const frases = useMemo(
    () => [
      "Que el café esté rico y tus pacientes sean normales",
      "Eres la doc con el corazón más grande. Orgullosa de ti",
      "Tu dedicación salva vidas y tu sonrisa me salva a mí. Te amo",
      "Que tu jornada sea tan fluida como un buen café",
      "Nadie lleva ese uniforme con tanta elegancia y poder como tú",
      "Eres el diagnóstico de felicidad que mi vida necesitaba siempre",
      "Fuerza hoy, eres capaz de superar cualquier reto",
      "Que hoy los pedritos que veas por la calle te alegren el camino",
      "Tu café de la mañana es el motor de una mujer que todo lo puede",
      "A por el día, doc. Tu esfuerzo vale oro para este mundo",
      "Eres mi orgullo, mi compañera y la mujer más brillante que conozco",
      "Que hoy no falte el café caliente ni la paz en tus consultas",
      "Eres la prueba de que se puede ser brillante, fuerte y sensible",
      "Tus pacientes tienen suerte de tenerte, y yo de tener tu amor",
      "Que tu ruta sea segura y tu impacto en la salud sea inmenso hoy",
      "Eres una profesional imparable, nunca dudes de tu gran talento",
      "Buenos días, mi vida. Que hoy salves el día como solo tú sabes",
      "Eres medicina para mi alma. Que tengas una jornada espectacular",
      "Incluso en los días más largos, recuerda que eres una crack",
      "Que el aroma del café te dé la energía para cuidar de todos hoy",
      "Eres la mujer que admiro y la doc que el mundo necesita",
      "Eres el pilar de muchos pacientes y la luz de todos mis días",
      "Tu esfuerzo diario construye un futuro brillante. Sigue adelante",
      "Eres inteligente, valiente y la mujer de mis sueños. A por todo",
      "Que hoy cada café te dé el superpoder de seguir cuidando vidas",
      "Eres mi refugio favorito y la médico más talentosa del planeta",
    ],
    []
  );

  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("month");
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
    const { data: perfilData } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", user.id)
      .single();
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

  // 💡 FUNCIÓN CORREGIDA PARA REGISTRAR
  const handleRecordVisit = async () => {
    if (!perfil?.id) return;
    if (!cpInput || cpInput.length === 0) {
      alert("Introduce un Código Postal.");
      return;
    }

    const result = await recordVisit(perfil.id, cpInput);

    if (result) {
      setCpInput(""); // Limpia el input
      loadData(); // Recarga las estadísticas para ver el nuevo ingreso
    } else {
      alert(`ERROR: El CP ${cpInput} no existe o hubo un error de conexión.`);
    }
  };

  const filteredLogs = useMemo<VisitaLogData[]>(() => {
    const logs = stats?.detailed_logs || [];
    if (filterPeriod === "all" || logs.length === 0) return logs;
    return logs.filter((log) => {
      const logDate = new Date(log.created_at);
      const logDateISO = logDate.toISOString().split("T")[0];
      if (filterPeriod === "day") return logDateISO === selectedDate;
      if (filterPeriod === "week") {
        const targetDate = new Date(selectedDate);
        const diffDays =
          (targetDate.getTime() - logDate.getTime()) / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays < 7;
      }
      if (filterPeriod === "month") {
        const [year, month] = selectedMonth.split("-");
        return (
          logDate.getFullYear() === parseInt(year) &&
          logDate.getMonth() + 1 === parseInt(month)
        );
      }
      return true;
    });
  }, [stats, filterPeriod, selectedDate, selectedMonth]);
  const chartData = useMemo(() => {
    // Creamos un mapa de todos los días del mes seleccionado
    const [year, month] = selectedMonth.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    const dataMap: Record<number, number> = {};
    for (let i = 1; i <= daysInMonth; i++) dataMap[i] = 0;

    // Llenamos con las visitas reales
    filteredLogs.forEach((log) => {
      const day = new Date(log.created_at).getDate();
      dataMap[day] = (dataMap[day] || 0) + 1;
    });

    return Object.keys(dataMap).map((day) => ({
      day: day,
      visitas: dataMap[Number(day)],
    }));
  }, [filteredLogs, selectedMonth]);
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(`Reporte de Visitas - ${perfil?.nombre}`, 14, 15);
    const tableData = filteredLogs.map((log) => [
      new Date(log.created_at).toLocaleDateString("es-ES"),
      log.cp.codigo_postal,
      log.cp.nombre_barrio,
      `${(log.cp as any).distancia_km || 0} km`,
      euroFormatter.format(Number((log.cp as any).tarifa || 0)),
      euroFormatter.format(Number(log.monto_generado)),
    ]);
    autoTable(doc, {
      head: [["Fecha", "CP", "Municipio", "Distancia", "Tarifa", "Total"]],
      body: tableData,
      startY: 20,
      headStyles: { fillColor: [168, 85, 247] },
    });
    doc.save(`Visitas_Alix_${selectedMonth}.pdf`);
  };
  const comparativaMensual = useMemo(() => {
    const logs = stats?.detailed_logs || [];
    if (logs.length === 0) return null;

    const ahora = new Date();
    const diaActual = ahora.getDate();
    const mesActual = ahora.getMonth();
    const anoActual = ahora.getFullYear();

    // 1. Calcular total acumulado hasta HOY en el mes actual
    const totalMesActual = logs
      .filter((log) => {
        const d = new Date(log.created_at);
        return (
          d.getMonth() === mesActual &&
          d.getFullYear() === anoActual &&
          d.getDate() <= diaActual
        );
      })
      .reduce((acc, log) => acc + Number(log.monto_generado), 0);

    // 2. Calcular total acumulado hasta el MISMO DÍA del mes anterior
    const fechaMesPasado = new Date(anoActual, mesActual - 1, diaActual);
    const mesPasado = fechaMesPasado.getMonth();
    const anoPasado = fechaMesPasado.getFullYear();

    const totalMesPasado = logs
      .filter((log) => {
        const d = new Date(log.created_at);
        return (
          d.getMonth() === mesPasado &&
          d.getFullYear() === anoPasado &&
          d.getDate() <= diaActual
        );
      })
      .reduce((acc, log) => acc + Number(log.monto_generado), 0);

    // 3. Calcular porcentaje de crecimiento
    if (totalMesPasado === 0)
      return { porcentaje: 0, tendencia: "neutra", diferencia: 0 };

    const diferencia = totalMesActual - totalMesPasado;
    const porcentaje = (diferencia / totalMesPasado) * 100;
    const tendencia = diferencia >= 0 ? "sube" : "baja";
    const diaHoy = ahora.getDate();
    const nombreMesPasado = new Date(
      anoActual,
      mesActual - 1
    ).toLocaleDateString("es-ES", { month: "long" });

    const mensaje =
      tendencia === "sube"
        ? `A día ${diaHoy}, llevas ${diferencia}€ más que el mismo día de ${nombreMesPasado}. ¡Vas a un ritmo increíble! 🚀`
        : `A día ${diaHoy}, llevas ${diferencia}€ menos que el mismo día de ${nombreMesPasado}. ¡Aún queda mes para remontar! 💪🏽`;

    return {
      porcentaje: Math.abs(Math.round(porcentaje)),
      tendencia,
      diferencia: Math.round(diferencia),
      mensaje,
    };
  }, [stats]);
  const paginatedLogs = useMemo(() => {
    const lastIndex = currentPage * recordsPerPage;
    return filteredLogs.slice(lastIndex - recordsPerPage, lastIndex);
  }, [filteredLogs, currentPage]);

  const totalPages = Math.ceil(filteredLogs.length / recordsPerPage);

  const getButtonClass = (period: FilterPeriod) => {
    const base =
      "px-4 py-2 mr-2 rounded-md text-sm font-medium transition-all duration-200 border";
    return period === filterPeriod
      ? `${base} bg-purple-300 text-black border-white`
      : `${base} bg-transparent text-gray-400 border-white/[0.1]`;
  };

  if (isLoading)
    return (
      <div className="p-5 text-white bg-gray-900 min-h-screen">Cargando...</div>
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
            {fraseH3} <span className="text-purple-400">{perfil?.nombre}</span>{" "}
            🫀
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <TargetProgress stats={stats} />
        </div>

        <div className="pt-4 border-t border-white/[0.08]">
          <h2 className="text-[10px] font-bold text-gray-500 mb-4 uppercase tracking-widest">
            Nueva visita ✍🏽
          </h2>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="CP"
              value={cpInput}
              onChange={(e) => setCpInput(e.target.value)}
              className="flex-grow px-4 py-2.5 bg-[#0a0a0a] border border-white/[0.1] rounded-lg text-sm text-white outline-none"
            />
            {/* 💡 CAMBIO AQUÍ: Llamamos a handleRecordVisit */}
            <button
              onClick={handleRecordVisit}
              className="px-6 bg-purple-300 text-black text-[10px] font-bold uppercase rounded-lg"
            >
              Registrar
            </button>
          </div>
        </div>
        {/* Gráfico de Actividad Mensual */}
        {/* Gráfico de Actividad Mensual con Selector */}
        <div className="mt-8 p-6 rounded-2xl bg-[#0a0a0a] border border-white/[0.08] shadow-2xl overflow-hidden animate-in fade-in duration-700">
          <div className="flex justify-between items-start mb-6 px-1">
            <div>
              <h3 className="text-[10px] font-bold text-purple-400 uppercase tracking-[0.3em] mb-1">
                Actividad Diaria
              </h3>
              <p className="text-sm font-medium text-white uppercase tracking-tight">
                Frecuencia de visitas
              </p>
            </div>

            {/* Selector de Mes para el Gráfico */}
            <div className="bg-white/[0.03] p-1.5 rounded-xl border border-white/[0.08]">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-[11px] font-bold text-purple-300 outline-none [color-scheme:dark] uppercase cursor-pointer"
              />
            </div>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="day"
                  stroke="#4b5563"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  interval={2}
                />
                <YAxis
                  stroke="#4b5563"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0a0a0a",
                    border: "1px solid #333",
                    borderRadius: "10px",
                    fontSize: "10px",
                  }}
                  itemStyle={{ color: "#a855f7" }}
                  cursor={{
                    stroke: "#a855f7",
                    strokeWidth: 1,
                    strokeDasharray: "4 4",
                  }}
                  labelFormatter={(value) => `Día ${value}`}
                />
                <Line
                  type="monotone"
                  dataKey="visitas"
                  stroke="#a855f7"
                  strokeWidth={3}
                  dot={{ r: 0 }}
                  activeDot={{
                    r: 4,
                    fill: "#fff",
                    stroke: "#a855f7",
                    strokeWidth: 2,
                  }}
                  animationDuration={1500}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        {comparativaMensual && (
          <div className="mt-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] animate-in fade-in slide-in-from-left-4 duration-1000">
            <div className="flex items-center gap-3">
              {/* Icono de tendencia circular */}
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  comparativaMensual.tendencia === "sube"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                <span className="text-lg font-bold">
                  {comparativaMensual.tendencia === "sube" ? "↑" : "↓"}
                </span>
              </div>

              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                  Comparativa de Rendimiento
                </p>
                <p className="text-xs text-white/90 mt-0.5">
                  {comparativaMensual.mensaje}
                  <span
                    className={`ml-1 font-mono font-bold ${
                      comparativaMensual.tendencia === "sube"
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    ({comparativaMensual.porcentaje}%)
                  </span>
                </p>
              </div>
            </div>

            {/* Barra visual sutil de progreso comparativo */}
            <div className="mt-3 w-full h-1 bg-white/[0.05] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  comparativaMensual.tendencia === "sube"
                    ? "bg-green-500"
                    : "bg-red-500"
                }`}
                style={{
                  width: `${Math.min(comparativaMensual.porcentaje, 100)}%`,
                }}
              />
            </div>
            <div className="mt-2 px-1">
              <p className="text-[9px] text-gray-600 leading-relaxed italic">
                * Esta comparativa mide tu rendimiento acumulado desde el día 1
                hasta hoy, enfrentándolo al mismo periodo exacto del mes
                anterior. Es una "carrera en paralelo" para que veas si tu ritmo
                de visitas sube o baja.
              </p>
            </div>
          </div>
        )}
        <div className="mt-12 pt-4 border-t border-white/[0.08]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Visitas ({" "}
              <span className="text-purple-300">
                {filterPeriod.toUpperCase()}
              </span>{" "}
              )
            </h2>
            <div className="flex gap-2">
              <div className="bg-white/[0.03] p-1.5 rounded-xl border border-white/[0.08]">
                {filterPeriod === "month" ? (
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent text-[11px] font-bold text-white outline-none [color-scheme:dark]"
                  />
                ) : (
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent text-[11px] font-bold text-white outline-none [color-scheme:dark]"
                  />
                )}
              </div>
              <button
                onClick={exportToPDF}
                className="p-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold uppercase"
              >
                PDF ⬇️
              </button>
            </div>
          </div>

          <div className="mb-6 flex gap-1">
            {["month", "week", "day"].map((p) => (
              <button
                key={p}
                onClick={() => setFilterPeriod(p as FilterPeriod)}
                className={getButtonClass(p as FilterPeriod)}
              >
                {p === "month" ? "Mes" : p === "week" ? "Semana" : "Día"}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0a]">
            <table className="min-w-full text-xs text-left">
              <thead>
                <tr className="bg-white/[0.02] text-[9px] uppercase text-gray-500 tracking-widest">
                  <th className="px-4 py-3 border-b border-white/[0.08]">
                    Fecha
                  </th>
                  <th className="px-4 py-3 border-b border-white/[0.08]">
                    Barrio / CP
                  </th>
                  <th className="px-4 py-3 border-b border-white/[0.08] text-right">
                    Monto / KM
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08]">
                {paginatedLogs.map((log, index) => (
                  <tr key={index} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-4 text-gray-500 font-mono align-top">
                      {new Date(log.created_at).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-white font-medium">
                        {log.cp.nombre_barrio}
                      </p>
                      <p className="text-[10px] text-purple-400 font-mono">
                        {log.cp.codigo_postal}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p className="text-green-400 font-bold">
                        {euroFormatter.format(Number(log.monto_generado))}
                      </p>
                      <p className="text-[10px] text-gray-500 font-mono">
                        {(log.cp as any).distancia_km || 0} km
                      </p>
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
