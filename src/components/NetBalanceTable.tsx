"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  BarChart,
  Bar,
  XAxis,
  ResponsiveContainer,
  Cell,
  Tooltip,
  LabelList,
} from "recharts";

interface NetBalanceProps {
  income: number;
}

const euroFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

export default function NetBalanceTable({ income }: NetBalanceProps) {
  const [totals, setTotals] = useState({ diesel: 0, variables: 0, fijos: 0 });
  const [loading, setLoading] = useState(true);
  const [monthlyIncome, setMonthlyIncome] = useState<{ name: string; value: number }[]>([]);

  const fetchAllTotals = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Diesel
    const { data: dieselData } = await supabase.from("gastos_gasolina").select("coste").eq("user_id", user.id);
    const totalD = dieselData?.reduce((acc, curr) => acc + Number(curr.coste), 0) || 0;

    // 2. Variables
    const { data: variablesData } = await supabase.from("gastos_variables").select("monto").eq("user_id", user.id);
    const totalV = variablesData?.reduce((acc, curr) => acc + Number(curr.monto), 0) || 0;

    // 3. Fijos
    const { data: fijosData } = await supabase.from("gastos_fijos").select("monto").eq("user_id", user.id);
    const totalF = fijosData?.reduce((acc, curr) => acc + Number(curr.monto), 0) || 0;

    // 4. Historial de Ingresos para el Gráfico (Aseguramos diciembre)
    const { data: visitsData } = await supabase
      .from("visitas_log")
      .select("monto_generado, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (visitsData) {
      const groups: Record<string, number> = {};
      visitsData.forEach((log) => {
        const d = new Date(log.created_at);
        const label = d.toLocaleDateString("es-ES", { month: "short" });
        groups[label] = (groups[label] || 0) + Number(log.monto_generado);
      });
      setMonthlyIncome(Object.keys(groups).map(key => ({ name: key, value: groups[key] })));
    }

    setTotals({ diesel: totalD, variables: totalV, fijos: totalF });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAllTotals();
  }, [fetchAllTotals]);

  const irpf = useMemo(() => income * 0.15, [income]);
  const totalGastos = useMemo(() => totals.diesel + totals.variables + totals.fijos, [totals]);
  const netoReal = useMemo(() => income - irpf - totalGastos, [income, irpf, totalGastos]);

  if (loading) return (
    <div className="mt-10 h-64 bg-white/[0.02] animate-pulse rounded-3xl border border-white/[0.08] flex items-center justify-center">
      <span className="text-[10px] text-gray-500 uppercase tracking-[0.3em]">Calculando Balance...</span>
    </div>
  );

  return (
    <div className="mt-10 p-4 space-y-6 animate-in slide-in-from-bottom-4 duration-700 pb-10">
      <div className="px-1">
        <h2 className="text-[10px] font-bold text-purple-400 uppercase tracking-[0.3em] mb-1">Balance de Rentabilidad</h2>
        <p className="text-base font-semibold text-white uppercase">Sueldo Neto</p>
      </div>

      {/* GRÁFICO DE BARRAS HORIZONTAL CON TOTALES */}
      <div className="p-6 rounded-3xl bg-[#0a0a0a] border border-white/[0.08] h-52 shadow-2xl overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyIncome} margin={{ top: 25, bottom: 0 }}>
            <XAxis dataKey="name" stroke="#4b5563" fontSize={10} tickLine={false} axisLine={false} dy={5} />
            <Tooltip
              cursor={{ fill: "transparent" }}
              contentStyle={{ backgroundColor: "#0a0a0a", border: "1px solid #333", fontSize: "10px" }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={35}>
              <LabelList 
                dataKey="value" 
                position="top" 
                fill="#a855f7" 
                fontSize={10} 
                fontWeight="bold"
                formatter={(val: any) => `${Number(val).toFixed(0)}€`} 
                offset={10} 
              />
              {monthlyIncome.map((entry, i) => (
                <Cell key={i} fill={entry.name.toLowerCase().includes('ene') ? "#a855f7" : "#333"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-3xl border border-white/[0.08] bg-[#0a0a0a] overflow-hidden shadow-2xl">
        <table className="min-w-full text-sm">
          <tbody className="divide-y divide-white/[0.05]">
            <tr className="bg-white/[0.01]">
              <td className="px-6 py-5 text-gray-400 font-medium">Ingresos Brutos Acumulados</td>
              <td className="px-6 py-5 text-right font-mono text-green-400 font-bold">
                +{euroFormatter.format(income)}
              </td>
            </tr>
            <tr>
              <td className="px-6 py-5 text-gray-400">Retención IRPF (15%)</td>
              <td className="px-6 py-5 text-right font-mono text-orange-400/80">
                -{euroFormatter.format(irpf)}
              </td>
            </tr>
            <tr>
              <td className="px-6 py-5 text-gray-400 flex flex-col">
                <span>Gastos Operativos</span>
                <span className="text-[9px] text-gray-600 uppercase tracking-tighter">Diesel + Fijos + Variables</span>
              </td>
              <td className="px-6 py-5 text-right font-mono text-red-400/80">
                -{euroFormatter.format(totalGastos)}
              </td>
            </tr>
            <tr className="bg-purple-500/[0.05] border-t-2 border-purple-500/20">
              <td className="px-6 py-8">
                <p className="text-white font-bold text-base uppercase tracking-widest">Neto Real Final</p>
                <p className="text-[10px] text-gray-500 italic">Dinero disponible en bolsillo</p>
              </td>
              <td className="px-6 py-8 text-right">
                <span className="text-3xl font-mono font-bold text-white tracking-tighter drop-shadow-xl">
                  {euroFormatter.format(netoReal)}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}