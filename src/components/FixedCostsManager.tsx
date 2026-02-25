"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  BarChart,
  Bar,
  YAxis,
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: expensesData } = await supabase
      .from("gastos_fijos")
      .select("*")
      .eq("activo", true)
      .order("created_at", { ascending: true });
    if (expensesData) setExpenses(expensesData);

    if (user) {
      const { data: userData, error } = await supabase
        .from("usuarios")
        .select("ingreso_mensual")
        .eq("id", user.id)
        .maybeSingle();
      if (userData) {
        setIncomeLastMonth(userData.ingreso_mensual || 0);
      }
    }
    setLoading(false);
  }, []);

  const handleIncomeSave = async (value: string) => {
    const valorNum = parseFloat(value) || 0;
    setIncomeLastMonth(valorNum);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase
        .from("usuarios")
        .update({ ingreso_mensual: valorNum })
        .eq("id", user.id);
    }
  };
  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const saveIncome = async () => {
    setIsSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { error } = await supabase
        .from("usuarios")
        .update({ ingreso_mensual: Number(incomeLastMonth) || 0 })
        .eq("id", user.id);

      if (!error) {
        setMessage("✅ Ingreso guardado");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("❌ Error");
      }
    }
    setIsSaving(false);
  };
  // 1. Filtramos los gastos para que aparezcan solo si se crearon en o antes del mes seleccionado
  const filteredByMonth = useMemo(() => {
    return expenses.filter((exp) => {
      if (!exp.created_at) return true;
      const dateGasto = new Date(exp.created_at);
      const [yearSel, monthSel] = selectedMonth.split("-").map(Number);
      const dateLimite = new Date(yearSel, monthSel, 0); // Último día del mes seleccionado
      return dateGasto <= dateLimite;
    });
  }, [expenses, selectedMonth]);

  // 2. El total ahora suma solo los gastos filtrados para ese mes
  const totalFixed = useMemo(
    () => filteredByMonth.reduce((acc, exp) => acc + Number(exp.monto), 0),
    [filteredByMonth]
  );

  // Cálculo del Balance (Ingreso - Gastos)
  const balance = useMemo(() => {
    const ingreso = incomeLastMonth === "" ? 0 : incomeLastMonth;
    return ingreso - totalFixed;
  }, [incomeLastMonth, totalFixed]);

  const monthlyHistoryData = useMemo(() => {
    const months = [
      "ENE",
      "FEB",
      "MAR",
      "ABR",
      "MAY",
      "JUN",
      "JUL",
      "AGO",
      "SEP",
      "OCT",
      "NOV",
      "DIC",
    ];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Generamos los últimos 6 meses
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      last6Months.push({
        monthLabel: months[d.getMonth()],
        timestamp: d.getTime(),
        month: d.getMonth(),
        year: d.getFullYear(),
      });
    }

    return last6Months.map((m) => {
      const totalForMonth = expenses.reduce((acc, exp) => {
        // Si no hay fecha, lo sumamos por defecto
        if (!exp.created_at) return acc + Number(exp.monto);

        const dateGasto = new Date(exp.created_at);
        // Solo comparamos Año y Mes para que sea exacto
        const isPastOrCurrent =
          dateGasto.getFullYear() < m.year ||
          (dateGasto.getFullYear() === m.year &&
            dateGasto.getMonth() <= m.month);

        return isPastOrCurrent ? acc + Number(exp.monto) : acc;
      }, 0);

      return {
        name: m.monthLabel,
        value: totalForMonth,
      };
    });
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
          <h2 className="text-xl text-white tracking-tight">
            GESTIÓN DE PRESUPUESTO
          </h2>
          <p className="text-[10px] text-purple-400 uppercase tracking-[0.2em]">
            Base de cálculo: Introduce Manualmente tu Salario
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
            Ingreso Cobrado (Día 5)
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
          <button
            onClick={saveIncome}
            disabled={isSaving}
            className="mt-4 w-full py-2 bg-green-500/10 border border-green-500/20 text-green-400 text-[9px] font-bold uppercase rounded-lg hover:bg-green-500/20 transition-colors disabled:opacity-50"
          >
            {isSaving ? "Guardando..." : "Actualizar Ingreso Mensual"}
          </button>
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
            Suma de todos tus gastos
          </p>
        </div>

        {/* BALANCE FINAL */}
        <div className="p-6 rounded-2xl bg-green-400/10 border border-purple-500/20 shadow-lg">
          <h3 className="text-[10px] font-bold text-green-400 uppercase mb-2">
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
  <BarChart
    data={monthlyHistoryData}
    margin={{ top: 30, right: 0, left: 0, bottom: 0 }}
  >
    {/* DEFINICIÓN DEL GRADIENTE DIAGONAL ARCOÍRIS */}
    <defs>
      <linearGradient id="prideGradient" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stopColor="#FF0000" />    {/* Rojo */}
        <stop offset="20%" stopColor="#FF8E00" />   {/* Naranja */}
        <stop offset="40%" stopColor="#FFFF00" />   {/* Amarillo */}
        <stop offset="60%" stopColor="#008E00" />   {/* Verde */}
        <stop offset="80%" stopColor="#00C0C0" />   {/* Turquesa/Azul */}
        <stop offset="100%" stopColor="#8E008E" />  {/* Violeta */}
      </linearGradient>
    </defs>

    <YAxis
      hide
      domain={[0, (dataMax: number) => Math.round(dataMax * 1.15)]}
    />

    <XAxis
      dataKey="name"
      stroke="#4b5563"
      fontSize={9}
      axisLine={false}
      tickLine={false}
    />

    {/* Aplicamos el gradiente usando url(#prideGradient) */}
    <Bar 
      dataKey="value" 
      fill="url(#prideGradient)" 
      radius={[4, 4, 0, 0]} 
      barSize={30}
    >
      <LabelList
        dataKey="value"
        position="top"
        fill="#ffffff" 
        fontSize={10}
        formatter={(v: any) => `${v}€`}
        offset={10}
      />
      
      {/* IMPORTANTE: Eliminamos el mapeo de Cells con colores fijos (#333, #a855f7) 
          para que el gradiente se aplique a todas las barras por igual.
      */}
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
            {filteredByMonth.map((exp) => (
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
