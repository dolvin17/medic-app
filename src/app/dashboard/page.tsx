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
  new Date().toISOString().split('T')[0] // Formato YYYY-MM-DD para el input
);

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

	if (filterPeriod === "day") {
    return logs.filter((log) => {
      const logDate = new Date(log.created_at).toISOString().split('T')[0];
      return logDate === selectedDate;
    });
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
      "px-4 py-2 mr-2 rounded-md text-sm font-medium transition-all duration-200 ease-in-out border";

    return period === filterPeriod
      ? `${base} bg-purple-300 text-black border-white hover:bg-gray-200` // Activo (Contraste alto)
      : `${base} bg-transparent text-gray-400 border-white/[0.1] hover:border-white/[0.3] hover:text-white`; // Inactivo (Sutil)
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
  return (
    <>
      <Navigation />
      <div className="p-3 text-white bg-gray-900 min-h-screen">
        <div className="mb-3">
          <p className="text-sm text-gray-500 mt-1">
            {new Date().toLocaleDateString("es-ES", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <h1 className="text-base italic py-4 text-white tracking-tight">
            {saludoDelDia}{" "}
            <span className="text-purple-400">{perfil.nombre}</span> 🫀
          </h1>
        </div>
		<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
  <TargetProgress stats={stats} />
  {/* Aquí podrías poner otra tarjeta con el saludo o resumen */}
</div>
        {/* SECCIÓN DE REGISTRO */}
        <div className="pt-4 border-t border-white/[0.08]">
          <h2 className="text-sm font-medium text-gray-400 mb-4 tracking-tight">
            Registrar nueva visita {"  "} ✍🏽
          </h2>
          <div className="flex sm:flex-row items-stretch gap-3">
            <input
              type="text"
              placeholder="Introduce CP (ej. 28221)"
              value={cpInput}
              onChange={(e) => setCpInput(e.target.value)}
              className="flex-grow px-4 py-2.5 bg-[#0a0a0a] border border-white/[0.1] rounded-lg text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-white/[0.3] focus:ring-1 focus:ring-white/[0.3]"
            />
            <button
              onClick={handleRecordVisit}
              className="px-6 border-white border-1 bg-purple-300 text-black text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors duration-200 whitespace-nowrap"
            >
              Registrar
            </button>
          </div>
        </div>
		

        {/* TABLA 2: RESUMEN MENSUAL */}
        <div className="mt-5 pt-4 border-t border-gray-700">
          <h2 className="text-base text-gray-400  mb-4">💰 Total</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left border-separate border-spacing-0 border border-white/[0.08] rounded-xl overflow-hidden bg-[#0a0a0a]">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="px-4 py-3 font-medium text-gray-400 border-b border-white/[0.08]">
                    Periodo
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-400 border-b border-white/[0.08]">
                    Total Generado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08]">
                <tr className="group hover:bg-white/[0.04] transition-colors">
                  <td className="px-4 py-4 text-gray-300">
                    <span className="capitalize">
                      {new Date().toLocaleDateString("es-ES", {
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </td>
                  <td className="px-4 py-4  text-green-400 tracking-tight">
                    {euroFormatter.format(stats?.money_month || 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        {/* TABLA 1: DETALLE DE VISITAS CON FILTROS */}
        <div className="mt-8 pt-4 border-t border-white/[0.08]">
          <h2 className="text-sm font-medium text-gray-400 mb-6 tracking-tight">
            Historial de visitas (
            <span className="text-purple-200 text-xs">
              {filterPeriod.toUpperCase()}
            </span>
            )
          </h2>

          {/* BOTONES DE FILTRO */}
          <div className="mb-6 flex flex-wrap gap-1">
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
			{filterPeriod === 'day' && (
    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 transition-all">
      <span className="text-[10px] text-gray-500 uppercase font-medium">Ver día:</span>
      <input 
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        className="bg-white/[0.03] border border-white/[0.1] rounded-md px-2 py-1.5 text-xs text-white outline-none focus:border-purple-500/50 transition-all [color-scheme:dark]"
      />
    </div>
  )}
          </div>
		  

          {filteredLogs.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-white/[0.1] text-center">
              <p className="text-sm text-gray-500">
                No hay visitas registradas para el periodo seleccionado (
                {filterPeriod.toLowerCase()}).
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0a]">
              <table className="min-w-full text-sm text-left border-separate border-spacing-0">
                <thead>
                  <tr className="bg-white/[0.02]">
                    <th className="px-4 py-3 font-medium text-gray-400 border-b border-white/[0.08] w-1/6">
                      CP
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-400 border-b border-white/[0.08] w-2/5">
                      Barrio / Municipio
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-400 border-b border-white/[0.08] w-1/4">
                      Fecha y Hora
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-400 border-b border-white/[0.08] w-1/6">
                      Coste
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.08]">
                  {filteredLogs.map((log, index) => (
                    <tr
                      key={index}
                      className="group hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-4 text-purple-400 group-hover:text-white transition-colors">
                        {log.cp.codigo_postal}
                      </td>
                      <td className="pl-4 py-4 text-gray-300">
                        {log.cp.nombre_barrio}
                      </td>
                      <td className=" py-4 text-gray-500 text-xs tabular-nums">
                        {formatLogDate(log.created_at)}
                      </td>
                      <td className="px-4 py-4  text-green-400 tracking-tight">
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
