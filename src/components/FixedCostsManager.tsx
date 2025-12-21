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
} from "recharts";

interface FixedExpense {
  id: string;
  nombre: string;
  monto: number;
}

export default function FixedExpensesTable() {
  const [expenses, setExpenses] = useState<FixedExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const currentMonth = new Intl.DateTimeFormat("es-ES", {
    month: "long",
  }).format(new Date());

  const fetchExpenses = useCallback(async () => {
    const { data } = await supabase
      .from("gastos_fijos")
      .select("*")
      .order("created_at", { ascending: true });
    if (data) setExpenses(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const totalFixed = useMemo(
    () => expenses.reduce((acc, exp) => acc + Number(exp.monto), 0),
    [expenses]
  );

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
    const nombre = prompt("¿Nombre del nuevo gasto fijo?");
    if (!nombre) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase
      .from("gastos_fijos")
      .insert({ user_id: user?.id, nombre, monto: 0 });
    fetchExpenses();
  };

  if (loading)
    return (
      <div className="text-gray-500 text-[10px] animate-pulse p-10 uppercase tracking-widest text-center">
        Cargando Plantilla...
      </div>
    );

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pt-12 border-t border-white/[0.05]">
      {/* CABECERA */}
      <div className="flex justify-between items-end">
        <div>
        
          <p className="text-base uppercase  text-white">Visualización de Gastos</p>
		    <h2 className="text-[10px] font-bold text-purple-400 uppercase tracking-[0.3em]">
            Fijos
          </h2>
        </div>
        <span className="text-[10px] font-bold text-purple-400 tracking-widest bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20 capitalize">
          {currentMonth}
        </span>
      </div>

      {/* GRÁFICO Y TOTAL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 p-6 rounded-2xl bg-[#0a0a0a] border border-white/[0.08] h-48 shadow-2xl">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={expenses}>
              <XAxis
                dataKey="nombre"
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
              <Bar
                dataKey="monto"
                fill="#ffffff"
                radius={[4, 4, 0, 0]}
                barSize={25}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex flex-col justify-center items-center text-center shadow-lg">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
            Total Fijos
          </h3>
          <span className="text-3xl font-mono font-bold text-white">
            {totalFixed}€
          </span>
        </div>
      </div>

      {/* TABLA CHECKLIST */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a] overflow-hidden shadow-2xl">
        <style jsx>{`
          input::-webkit-outer-spin-button,
          input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          input[type="number"] {
            -moz-appearance: textfield;
          }
        `}</style>
        <div className="p-4 border-b border-white/[0.08] flex justify-between items-center bg-white/[0.01]">
          <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
            Checklist de Gastos
          </h2>
          {message && (
            <span className="text-[10px] font-medium text-purple-400">
              {message}
            </span>
          )}
        </div>
        <table className="min-w-full text-xs text-left">
          <tbody className="divide-y divide-white/[0.05]">
            {expenses.map((exp) => (
              <tr
                key={exp.id}
                className="hover:bg-white/[0.01] transition-colors"
              >
                <td className="px-6  text-white/90 font-medium ">
                  {exp.nombre}
                </td>
                <td className="px-6 py-2 text-right">
                  <input
                    type="number"
                    value={exp.monto || ""}
                    onChange={(e) => handleInputChange(exp.id, e.target.value)}
                    className="w-24 bg-white/[0.03] border border-white/[0.1] rounded-lg px-3 py-2 text-right text-purple-300 font-mono outline-none focus:border-purple-500/40 transition-all"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-4 bg-white/[0.01] flex flex-col sm:flex-row gap-3 border-t border-white/[0.08]">
          <button
            onClick={addNewRow}
            className="flex-1 py-3 border border-white/[0.1] text-gray-500 text-[9px] font-bold uppercase tracking-widest rounded-xl hover:bg-white/[0.05] transition-all"
          >
            + Añadir Concepto
          </button>
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="flex-[2] py-3 bg-white text-black text-[9px] font-bold uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? "Guardando..." : "Actualizar Valores Mensuales"}
          </button>
        </div>
      </div>
    </div>
  );
}
