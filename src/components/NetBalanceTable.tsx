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
        const netoMensual = brutoMensual * (1 - tasaIRPF);
        const irpfPagado = brutoMensual * tasaIRPF; // <--- Calculamos el descuento

        return {
          name: key,
          value: Math.round(netoMensual),
          irpf: Math.round(irpfPagado), // <--- Lo pasamos al gráfico
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
                  return (
                    <div className="bg-[#0a0a0a] border border-white/10 p-3 rounded-xl shadow-xl">
                      <p className="text-[10px] text-gray-400 uppercase mb-1 font-bold">
                        {payload[0].payload.name}
                      </p>
                      <p className="text-xs text-green-400 font-mono">
                        Neto: {payload[0].value}€
                      </p>
                      <p className="text-[10px] text-orange-400 font-mono mt-1">
                        IRPF: -{payload[0].payload.irpf}€
                      </p>
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
