"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { FixedExpense } from "@/types/fixedExpense";
import { FaTrashCan } from "react-icons/fa6";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";

export default function ExpenseManager() {
  const [expenses, setExpenses] = useState<FixedExpense[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // 1. SELECTOR DE MES DINÁMICO
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });

  const [formData, setFormData] = useState({
    descripcion: "",
    monto: "",
    categoria: "Otros",
  });

  const fetchExpenses = useCallback(async () => {
    setIsFetching(true);
    const { data, error } = await supabase
      .from("gastos_fijos")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setExpenses(data);
    setIsFetching(false);
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // FILTRO POR MES
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (!exp.created_at) return true;
      
      const dateGasto = new Date(exp.created_at);
      const [yearSel, monthSel] = selectedMonth.split("-").map(Number);
      
      // El gasto aparece si se creó en el mes seleccionado O en cualquier mes anterior
      const dateLimite = new Date(yearSel, monthSel - 1, 1);
      const dateCreacion = new Date(dateGasto.getFullYear(), dateGasto.getMonth(), 1);

      return dateCreacion <= dateLimite;
    });
  }, [expenses, selectedMonth]);
  const totalMensual = useMemo(() => {
    return filteredExpenses.reduce((acc, exp) => acc + Number(exp.monto), 0);
  }, [filteredExpenses]);

 const chartData = useMemo(() => {
    return filteredExpenses.map((exp) => ({
      name: exp.nombre,
      value: Number(exp.monto),
    }));
  }, [filteredExpenses]);


  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar gasto?")) return;
    const { error } = await supabase
      .from("gastos_variables")
      .delete()
      .eq("id", id);
    if (!error) setExpenses(expenses.filter((e) => e.id !== id));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* CABECERA Y FILTROS */}
      <div className="flex justify-between items-end">
        <div>
          <p className="text-base uppercase text-white">
            Visualización de Gastos
          </p>
          <h2 className="text-[10px] font-bold text-purple-400 uppercase tracking-[0.3em]">
            Variables
          </h2>
        </div>

        <div className="flex items-center gap-2 bg-white/[0.03] p-2 rounded-xl border border-white/[0.08]">
          <span className="text-[9px] text-gray-500 uppercase font-bold px-1">
            Ver Mes:
          </span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent text-[10px] font-bold text-white outline-none [color-scheme:dark] uppercase cursor-pointer"
          />
        </div>
      </div>

      {/* GRÁFICO Y TOTAL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 p-6 rounded-2xl bg-[#0a0a0a] border border-white/[0.08] h-48 shadow-2xl">
          <ResponsiveContainer width="100%" height="100%">
            {/* CAMBIAMOS monthlyHistoryData por chartData */}
            <BarChart data={chartData} margin={{ top: 20 }}>
              <XAxis
                dataKey="name" // Ahora mostrará el "nombre" del gasto (Alquiler, Luz...)
                stroke="#4b5563"
                fontSize={9}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: "transparent" }}
                contentStyle={{
                  backgroundColor: "#0a0a0a",
                  border: "1px solid #333",
                  fontSize: "10px",
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={25}>
                <LabelList
                  dataKey="value"
                  position="top"
                  fill="#a855f7"
                  fontSize={10}
                  formatter={(value: any) => `${Number(value).toFixed(0)}€`}
                  offset={10}
                />
                {/* Usamos chartData para pintar las celdas */}
                {chartData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={i % 2 === 0 ? "#a855f7" : "#7c3aed"} // Alterna colores para que se vea mejor
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/10 flex flex-col justify-center items-center text-center shadow-lg">
          <h3 className="text-[10px] font-bold text-red-400/80 uppercase tracking-widest mb-1">
            Total Gastos ({selectedMonth})
          </h3>
          <span className="text-3xl font-mono font-bold text-red-400">
            -{totalMensual.toFixed(2)}€
          </span>
          <p className="text-[9px] text-gray-500 mt-2 uppercase tracking-tighter">
            Suma de gastos del mes seleccionado
          </p>
        </div>
      </div>

      {/* BOTÓN PARA MOSTRAR/OCULTAR HISTORIAL */}
      <div className="flex justify-center py-4">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="px-6 py-2 bg-white/[0.03] border border-white/[0.08] text-[10px] text-gray-400 font-bold uppercase tracking-widest rounded-full hover:bg-white/[0.08] hover:text-white transition-all"
        >
          {showHistory ? "↑ Ocultar Historial" : "↓ Ver Historial de Gastos"}
        </button>
      </div>

      {/* TABLA CONDICIONAL */}
      {showHistory && (
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0a0a] animate-in fade-in slide-in-from-top-4 duration-500">
          <table className="min-w-full text-left text-[11px]">
            <thead className="bg-white/[0.02] text-gray-500 uppercase text-[9px] tracking-widest">
              <tr>
                <th className="px-6 py-4">Concepto</th>
                <th className="px-6 py-4">Monto</th>
                <th className="px-6 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="group hover:bg-white/[0.01]">
                  <td className="px-6 py-4">
                    <p className="text-white font-medium">{exp.nombre}</p>
                    <p className="text-[9px] text-gray-600">
                      Gasto Fijo •{" "}
                      {exp.created_at
                        ? new Date(exp.created_at).toLocaleDateString()
                        : "Sin fecha"}
                    </p>
                  </td>
                  <td className="px-6 py-4 font-mono text-red-400">
                    -{exp.monto} €
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(exp.id)}
                      className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <FaTrashCan size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
