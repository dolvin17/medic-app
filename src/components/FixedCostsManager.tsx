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

interface FixedExpense {
  id: string;
  nombre: string;
  monto: number;
  created_at?: string;
}

export default function FixedExpensesTable() {
  const [expenses, setExpenses] = useState<FixedExpense[]>([]);
  // El ingreso comienza como undefined para mostrar el placeholder
  const [incomeLastMonth, setIncomeLastMonth] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });

  const fetchExpenses = useCallback(async () => {
    const { data } = await supabase
      .from("gastos_fijos")
      .select("*")
      .eq("activo", true)
      .order("created_at", { ascending: true });
    if (data) setExpenses(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Cálculo de Gastos Totales
  const totalFixed = useMemo(
    () => expenses.reduce((acc, exp) => acc + Number(exp.monto), 0),
    [expenses]
  );

  // Cálculo del Balance (Ingreso - Gastos)
  const balance = useMemo(() => {
    const ingreso = incomeLastMonth === "" ? 0 : incomeLastMonth;
    return ingreso - totalFixed;
  }, [incomeLastMonth, totalFixed]);

  // Histórico para el gráfico (Desfase de un mes para visualizar el flujo)
  const monthlyHistoryData = useMemo(() => {
    const groups: Record<string, number> = {};
    expenses.forEach((exp) => {
      const d = exp.created_at ? new Date(exp.created_at) : new Date();
      const calculationMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const label = calculationMonth.toLocaleDateString("es-ES", {
        month: "short",
      });
      groups[label] = (groups[label] || 0) + Number(exp.monto);
    });
    return Object.keys(groups).map((key) => ({
      name: key,
      value: groups[key],
    }));
  }, [expenses]);

  const handleInputChange = (id: string, value: string) => {
    const valorNum = parseFloat(value) || 0;
    setExpenses((prev) =>
      prev.map((exp) => (exp.id === id ? { ...exp, monto: valorNum } : exp))
    );
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const updates = expenses.map((exp) =>
        supabase
          .from("gastos_fijos")
          .update({ monto: exp.monto })
          .eq("id", exp.id)
      );
      await Promise.all(updates);
      setMessage("✅ Actualizado");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("❌ Error");
    } finally {
      setIsSaving(false);
    }
  };

  const addNewRow = async () => {
    const nombre = prompt("¿Nombre del nuevo gasto?");
    if (!nombre) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase
      .from("gastos_fijos")
      .insert({ user_id: user?.id, nombre, monto: 0 });
    fetchExpenses();
  };
  const deleteExpense = async (id: string) => {
    if (!confirm("¿Eliminar este gasto?")) return;

    const { error } = await supabase.from("gastos_fijos").delete().eq("id", id);

    if (!error) {
      setExpenses((prev) => prev.filter((exp) => exp.id !== id));
      setMessage("🗑️ Eliminado");
      setTimeout(() => setMessage(""), 3000);
    } else {
      setMessage("❌ Error al eliminar");
    }
  };
  const archiveExpense = async (id: string) => {
    // Preguntamos para evitar errores
    if (
      !confirm("¿Ocultar este gasto de la lista? No se borrará del historial.")
    )
      return;

    const { error } = await supabase
      .from("gastos_fijos")
      .update({ activo: false })
      .eq("id", id);

    if (!error) {
      // Lo quitamos del estado local para que desaparezca visualmente
      setExpenses((prev) => prev.filter((exp) => exp.id !== id));
      setMessage("📦 Gasto oculto");
      setTimeout(() => setMessage(""), 3000);
    } else {
      setMessage("❌ Error al ocultar");
    }
  };
  if (loading)
    return (
      <div className="text-gray-500 text-[10px] p-10 text-center uppercase tracking-widest">
        Cargando...
      </div>
    );

  return (
    <div className="space-y-6 pt-12 border-t border-white/[0.05]">
      {/* Estilos para eliminar flechas de los inputs de tipo número */}
      <style jsx global>{`
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl text-white font-bold tracking-tight">
            Gestión de Presupuesto
          </h2>
          <p className="text-[10px] text-purple-400 uppercase tracking-[0.2em]">
            Base de cálculo: Mes Anterior
          </p>
        </div>
        <div className="bg-white/[0.03] p-2 rounded-xl border border-white/[0.08]">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent text-[10px] font-bold text-white outline-none [color-scheme:dark] uppercase"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* INGRESO (Entrada manual) */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] shadow-lg">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase mb-2">
            Ingreso Cobrado (Día 1)
          </h3>
          <div className="flex items-center">
            <input
              type="number"
              value={incomeLastMonth}
              onChange={(e) =>
                setIncomeLastMonth(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              placeholder="0.00"
              className="text-2xl font-mono font-bold text-green-400 bg-transparent outline-none w-full placeholder:text-gray-700"
            />
            <span className="text-green-400 font-bold ml-1">€</span>
          </div>
          <p className="text-[9px] text-gray-500 mt-1">
            Dinero disponible recibido
          </p>
        </div>

        {/* GASTOS TOTALES */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] shadow-lg">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase mb-2">
            Gastos a descontar
          </h3>
          <div className="text-2xl font-mono font-bold text-red-400">
            -{totalFixed}€
          </div>
          <p className="text-[9px] text-gray-500 mt-1">
            Suma de la tabla inferior
          </p>
        </div>

        {/* BALANCE FINAL */}
        <div className="p-6 rounded-2xl bg-purple-500/10 border border-purple-500/20 shadow-lg">
          <h3 className="text-[10px] font-bold text-purple-400 uppercase mb-2">
            Dinero Restante
          </h3>
          <div className="text-3xl font-mono font-bold text-white">
            {balance}€
          </div>
          <p className="text-[9px] text-purple-300 mt-1">
            Lo que queda para el mes
          </p>
        </div>
      </div>

      {/* GRÁFICO */}
      <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-white/[0.08] h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyHistoryData}>
            <XAxis
              dataKey="name"
              stroke="#4b5563"
              fontSize={9}
              axisLine={false}
              tickLine={false}
            />
            <Bar dataKey="value" fill="#333" radius={[4, 4, 0, 0]} barSize={30}>
              <LabelList
                dataKey="value"
                position="top"
                fill="#a855f7"
                fontSize={10}
                formatter={(v: any) => `${v}€`}
              />
              {monthlyHistoryData.map((_, i) => (
                <Cell
                  key={i}
                  fill={
                    i === monthlyHistoryData.length - 1 ? "#a855f7" : "#333"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* TABLA CHECKLIST */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a] overflow-hidden">
        <div className="p-4 border-b border-white/[0.08] bg-white/[0.01] flex justify-between items-center">
          <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            Conceptos de Gasto
          </h2>
          {message && (
            <span className="text-[10px] text-purple-400 font-bold">
              {message}
            </span>
          )}
        </div>
        <table className="min-w-full text-xs text-left">
          <tbody className="divide-y divide-white/[0.05]">
            {expenses.map((exp) => (
              <tr key={exp.id} className="hover:bg-white/[0.01]">
                <td className="px-6 py-4 text-white/90 font-medium">
                  {exp.nombre}
                </td>
                <td className="px-6 py-2 text-right">
                  <div className="inline-flex items-center bg-white/[0.03] border border-white/[0.1] rounded-lg px-3 py-2">
                    <input
                      type="number"
                      value={exp.monto || ""}
                      onChange={(e) =>
                        handleInputChange(exp.id, e.target.value)
                      }
                      placeholder="0"
                      className="w-20 bg-transparent text-right text-purple-300 font-mono outline-none"
                    />
                    <span className="ml-1 text-purple-300/50">€</span>
                  </div>
                  <button
                    onClick={() => archiveExpense(exp.id)}
                    className="text-gray-600 hover:text-red-400 p-2 transition-colors"
                    title="Ocultar gasto"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-4 bg-white/[0.01] flex gap-3 border-t border-white/[0.08]">
          <button
            onClick={addNewRow}
            className="flex-1 py-3 border border-white/[0.1] text-gray-500 text-[9px] font-bold uppercase rounded-xl hover:bg-white/[0.05] transition-colors"
          >
            + Añadir Fijo
          </button>
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="flex-[2] py-3 bg-white text-black text-[9px] font-bold uppercase rounded-xl hover:bg-gray-200 transition-transform active:scale-95 disabled:opacity-50"
          >
            {isSaving ? "Guardando..." : "Actualizar Gastos"}
          </button>
        </div>
      </div>
    </div>
  );
}
