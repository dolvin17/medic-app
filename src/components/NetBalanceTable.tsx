"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
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
  const [loading, setLoading] = useState(true);
  const [monthlyIncome, setMonthlyIncome] = useState<
    { name: string; value: number }[]
  >([]);

  const fetchAllTotals = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: visitsData } = await supabase
      .from("visitas_log")
      .select("monto_generado, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (visitsData) {
      const groups: Record<string, number> = {};
      visitsData.forEach((log) => {
        const d = new Date(log.created_at);
        const label = d
          .toLocaleDateString("es-ES", { month: "short" })
          .toUpperCase();
        groups[label] = (groups[label] || 0) + Number(log.monto_generado);
      });

      // Aplicamos la lógica de IRPF dinámica por cada mes
      const formattedData = Object.keys(groups).map((key) => {
        const brutoMensual = groups[key];
        const tasaIRPF = brutoMensual > 3000 ? 0.15 : 0.07;
        const irpfPagado = brutoMensual * tasaIRPF;
        const netoMensual = brutoMensual - irpfPagado;

        return {
          name: key,
          bruto: Math.round(brutoMensual), // <--- Añadimos esto
          value: Math.round(netoMensual),
          irpf: Math.round(irpfPagado),
        };
      });

      setMonthlyIncome(formattedData);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAllTotals();
  }, [fetchAllTotals]);

  // Lógica para la tabla resumen inferior (basada en el prop income)
  const currentTaxRate = useMemo(() => (income > 3000 ? 0.15 : 0.07), [income]);
  const irpf = useMemo(() => income * currentTaxRate, [income, currentTaxRate]);
  const netoReal = useMemo(() => income - irpf, [income, irpf]);

  if (loading)
    return (
      <div className="mt-10 h-64 bg-white/[0.02] animate-pulse rounded-3xl border border-white/[0.08] flex items-center justify-center">
        <span className="text-[10px] text-gray-500 uppercase tracking-[0.3em]">
          Calculando Balance...
        </span>
      </div>
    );

  return (
    <div className="mt-10 p-4 space-y-6 animate-in slide-in-from-bottom-4 duration-700 pb-10">
      <div className="px-1">
        <h2 className="text-[10px] font-bold text-purple-400 uppercase tracking-[0.3em] mb-1">
          Balance de Rentabilidad
        </h2>
        <p className="text-base font-semibold text-white uppercase">
          Sueldo Neto (Post-Impuestos)
        </p>
      </div>

      <div className="p-6 rounded-3xl bg-[#0a0a0a] border border-white/[0.08] h-60 shadow-2xl overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyIncome} margin={{ top: 30, bottom: 0 }}>
            <defs>
              <linearGradient id="prideGradientNet" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="#FF0000" />
                <stop offset="20%" stopColor="#FF8E00" />
                <stop offset="40%" stopColor="#FFFF00" />
                <stop offset="60%" stopColor="#008E00" />
                <stop offset="80%" stopColor="#00C0C0" />
                <stop offset="100%" stopColor="#8E008E" />
              </linearGradient>
            </defs>

            <YAxis
              hide
              domain={[0, (dataMax: number) => Math.round(dataMax * 1.2)]}
            />
            <XAxis
              dataKey="name"
              stroke="#4b5563"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              dy={5}
            />
            <Tooltip
              cursor={{ fill: "white", opacity: 0.05 }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-[#0a0a0a] border border-white/10 p-3 rounded-xl shadow-2xl min-w-[120px]">
                      <p className="text-[10px] text-gray-500 uppercase mb-2 font-black tracking-widest border-b border-white/5 pb-1">
                        {data.name}
                      </p>
                      <div className="space-y-1 font-mono">
                        <div className="flex justify-between gap-4">
                          <span className="text-[9px] text-gray-400 uppercase">
                            Bruto:
                          </span>
                          <span className="text-xs text-white">
                            +{data.bruto}€
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-[9px] text-gray-400 uppercase">
                            IRPF:
                          </span>
                          <span className="text-xs text-orange-500">
                            -{data.irpf}€
                          </span>
                        </div>
                        <div className="border-t border-white/10 mt-1 pt-1 flex justify-between gap-4">
                          <span className="text-[9px] text-purple-400 font-bold uppercase">
                            Neto:
                          </span>
                          <span className="text-xs text-green-400 font-bold">
                            {data.value}€
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="value"
              fill="url(#prideGradientNet)"
              radius={[4, 4, 0, 0]}
              barSize={35}
            >
              <LabelList
                dataKey="value"
                position="top"
                fill="#ffffff"
                fontSize={10}
                fontWeight="bold"
                formatter={(val: any) => `${val}€`}
                offset={10}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-3xl border border-white/[0.08] bg-[#0a0a0a] overflow-hidden shadow-2xl">
        <table className="min-w-full text-sm">
          <tbody className="divide-y divide-white/[0.05]">
            <tr className="bg-white/[0.01]">
              <td className="px-6 py-5 text-gray-400 font-medium">
                Ingresos Brutos
              </td>
              <td className="px-6 py-5 text-right font-mono text-green-400 font-bold">
                +{euroFormatter.format(income)}
              </td>
            </tr>
            <tr>
              <td className="px-6 py-5 text-gray-400 text-xs">
                Retención IRPF aplicada ({currentTaxRate * 100}%)
              </td>
              <td className="px-6 py-5 text-right font-mono text-orange-400/80">
                -{euroFormatter.format(irpf)}
              </td>
            </tr>
            <tr className="bg-purple-500/[0.05] border-t-2 border-purple-500/20">
              <td className="px-6 py-8">
                <p className="text-white font-bold text-base uppercase tracking-widest">
                  Neto Real Final
                </p>
                <p className="text-[10px] text-gray-500 italic">
                  Limpio tras impuestos
                </p>
              </td>
              <td className="px-6 py-8 text-right">
                <span className="text-3xl font-mono font-bold text-white tracking-tighter">
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
