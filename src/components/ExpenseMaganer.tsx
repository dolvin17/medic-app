"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { VariableExpense } from "@/types/vairableExpense";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function ExpenseManager() {
  const [expenses, setExpenses] = useState<VariableExpense[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const [formData, setFormData] = useState({
    descripcion: "",
    monto: "",
    categoria: "Otros",
  });

  const fetchExpenses = useCallback(async () => {
    setIsFetching(true);
    const { data, error } = await supabase
      .from("gastos_variables")
      .select("*")
      .order("fecha", { ascending: false });

    if (!error && data) setExpenses(data);
    setIsFetching(false);
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // FILTRO POR MES
  const filteredExpenses = useMemo(() => {
    return expenses.filter(
      (exp) => new Date(exp.fecha).getMonth() === selectedMonth
    );
  }, [expenses, selectedMonth]);

  const totalVariables = useMemo(() => {
    return filteredExpenses.reduce((acc, exp) => acc + Number(exp.monto), 0);
  }, [filteredExpenses]);

  // DATOS PARA EL GRÁFICO
  const chartData = useMemo(() => {
    const groups = filteredExpenses.reduce((acc: any, exp) => {
      acc[exp.categoria] = (acc[exp.categoria] || 0) + Number(exp.monto);
      return acc;
    }, {});
    return Object.keys(groups).map((key) => ({
      name: key,
      value: groups[key],
    }));
  }, [filteredExpenses]);

  const handleSave = async () => {
    if (!formData.descripcion || !formData.monto) return;
    setIsSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay sesión");
      await supabase.from("gastos_variables").insert({
        user_id: user.id,
        descripcion: formData.descripcion,
        monto: parseFloat(formData.monto),
        categoria: formData.categoria,
        fecha: new Date().toISOString().split("T")[0],
      });
      setFormData({ descripcion: "", monto: "", categoria: "Otros" });
      await fetchExpenses();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

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
          <h2 className="text-[10px] font-bold text-purple-400 uppercase tracking-[0.3em]">
            Variables
          </h2>
          <p className="text-base  text-white">Visualización de Gastos</p>
        </div>
        <div className="flex gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/[0.08]">
          {[9, 10, 11].map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMonth(m)}
              className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase transition-all ${
                selectedMonth === m
                  ? "bg-white text-black"
                  : "text-gray-500 hover:text-white"
              }`}
            >
              {new Intl.DateTimeFormat("es-ES", { month: "short" }).format(
                new Date(2025, m, 1)
              )}
            </button>
          ))}
        </div>
      </div>

      {/* GRÁFICO Y TOTAL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 p-6 rounded-2xl bg-[#0a0a0a] border border-white/[0.08] h-48 shadow-2xl">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis
                dataKey="name"
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
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={i % 2 === 0 ? "#a855f7" : "#6b21a8"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/10 flex flex-col justify-center items-center text-center shadow-lg">
          <h3 className="text-[10px] font-bold text-red-400/80 uppercase tracking-widest mb-1">
            Gasto del Mes
          </h3>
          <span className="text-3xl font-mono font-bold text-red-400">
            -{totalVariables}€
          </span>
        </div>
      </div>

      {/* FORMULARIO */}
      <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-white/[0.08] space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            className="px-4 py-2 bg-white/[0.02] border border-white/[0.1] rounded-lg text-sm text-white outline-none focus:border-purple-500/40"
            placeholder="Descripción"
            value={formData.descripcion}
            onChange={(e) =>
              setFormData({ ...formData, descripcion: e.target.value })
            }
          />
          <input
            className="px-4 py-2 bg-white/[0.02] border border-white/[0.1] rounded-lg text-sm text-white outline-none focus:border-purple-500/40"
            type="number"
            placeholder="Monto €"
            value={formData.monto}
            onChange={(e) =>
              setFormData({ ...formData, monto: e.target.value })
            }
          />
          <select
            className="px-4 py-2 bg-[#0a0a0a] border border-white/[0.1] rounded-lg text-sm text-gray-400"
            value={formData.categoria}
            onChange={(e) =>
              setFormData({ ...formData, categoria: e.target.value })
            }
          >
            <option value="Otros">Otros</option>
            <option value="Material">Material</option>
            <option value="Coche">Coche</option>
            <option value="Aparcamiento">Telpark</option>
          </select>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-3 bg-white text-black text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-gray-200 active:scale-95 disabled:opacity-50 transition-all"
        >
          {isSaving ? "Guardando..." : "Registrar Gasto Variable"}
        </button>
      </div>

      {/* TABLA */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0a0a]">
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
                  <p className="text-white font-medium">{exp.descripcion}</p>
                  <p className="text-[9px] text-gray-600">
                    {exp.categoria} • {new Date(exp.fecha).toLocaleDateString()}
                  </p>
                </td>
                <td className="px-6 py-4 font-mono text-red-400">
                  -{exp.monto} €
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleDelete(exp.id)}
                    className="text-red-500 p-2 hover:bg-red-500/10 rounded-lg"
                  >
                    <TrashIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}
