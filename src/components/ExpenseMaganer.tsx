"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { VariableExpense } from "@/types/vairableExpense";
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
  const [expenses, setExpenses] = useState<VariableExpense[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // 1. SELECTOR DE MES DINÁMICO
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

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
    return expenses.filter((exp) => {
      const d = new Date(exp.fecha);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return key === selectedMonth;
    });
  }, [expenses, selectedMonth]);

  const totalVariables = useMemo(() => {
    return filteredExpenses.reduce((acc, exp) => acc + Number(exp.monto), 0);
  }, [filteredExpenses]);

  // 2. GRÁFICO DE HISTORIAL MENSUAL
  const monthlyHistoryData = useMemo(() => {
    const groups: Record<string, number> = {};
    
    expenses.forEach(exp => {
      const d = new Date(exp.fecha);
      const label = d.toLocaleDateString("es-ES", { month: "short" });
      groups[label] = (groups[label] || 0) + Number(exp.monto);
    });

    return Object.keys(groups).map(key => ({
      name: key,
      value: groups[key]
    })).reverse(); 
  }, [expenses]);

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
          <p className="text-base uppercase text-white">Visualización de Gastos</p>
          <h2 className="text-[10px] font-bold text-purple-400 uppercase tracking-[0.3em]">
            Variables
          </h2>
        </div>
        
        <div className="flex items-center gap-2 bg-white/[0.03] p-2 rounded-xl border border-white/[0.08]">
          <span className="text-[9px] text-gray-500 uppercase font-bold px-1">Ver Mes:</span>
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
            {/* 💡 Añadimos margen superior para las etiquetas */}
            <BarChart data={monthlyHistoryData} margin={{ top: 20 }}>
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
              <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={25}>
                {/* 💡 ETIQUETA HORIZONTAL CON TIPADO CORREGIDO */}
                <LabelList 
                  dataKey="value" 
                  position="top" 
                  fill="#a855f7" 
                  fontSize={10} 
                  formatter={(value: any) => `${Number(value).toFixed(0)}€`}
                  offset={10}
                />
                {monthlyHistoryData.map((_, i) => (
                  <Cell key={i} fill={i === monthlyHistoryData.length - 1 ? "#a855f7" : "#333"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/10 flex flex-col justify-center items-center text-center shadow-lg">
          <h3 className="text-[10px] font-bold text-red-400/80 uppercase tracking-widest mb-1">
            Total {selectedMonth}
          </h3>
          <span className="text-3xl font-mono font-bold text-red-400">
            -{totalVariables.toFixed(2)}€
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
    </div>
  );
}