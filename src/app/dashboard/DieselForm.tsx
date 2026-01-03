"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { DieselExpense } from "@/types/diesel";
import { FaTrashCan } from "react-icons/fa6";

export default function DieselManager() {
  const [expenses, setExpenses] = useState<DieselExpense[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    coste: "",
    km: "",
    gasolinera: "",
  });

  // 1. CONTROL DE MES (Reseteo automático al iniciar nuevo mes)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const fetchExpenses = useCallback(async () => {
    setIsFetching(true);
    const { data, error } = await supabase
      .from("gastos_gasolina")
      .select("*")
      .order("fecha", { ascending: false });

    if (!error && data) {
      setExpenses(data);
    }
    setIsFetching(false);
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // 2. FILTRADO POR PERIODO
  const filteredExpenses = useMemo(() => {
    return expenses.filter(item => {
      const itemDate = new Date(item.fecha);
      const monthKey = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`;
      return monthKey === selectedMonth;
    });
  }, [expenses, selectedMonth]);

  // 3. TOTAL MENSUAL
  const totalDiesel = useMemo(() => {
    return filteredExpenses.reduce((acc, item) => acc + Number(item.coste), 0);
  }, [filteredExpenses]);

  const handleSave = async () => {
    if (!formData.coste || !formData.km) {
      alert("Por favor, completa el coste y los kilómetros.");
      return;
    }
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesión no encontrada");

      const { error } = await supabase.from("gastos_gasolina").insert({
        user_id: user.id,
        coste: parseFloat(formData.coste),
        km_duracion: parseFloat(formData.km),
        gasolinera: formData.gasolinera,
        fecha: new Date().toISOString().split("T")[0],
      });

      if (error) throw error;
      setFormData({ coste: "", km: "", gasolinera: "" });
      await fetchExpenses();
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Borrar este registro?")) return;
    try {
      const { error } = await supabase.from("gastos_gasolina").delete().eq("id", id);
      if (error) throw error;
      setExpenses((prev) => prev.filter((item) => item.id !== id));
    } catch (error: any) {
      alert("Error: " + error.message);
    }
  };

  return (
    <div className="flex flex-col gap-6 py-8 w-full animate-in fade-in duration-700">
      
      {/* FORMULARIO */}
      <div className="p-4 rounded-3xl bg-[#0a0a0a] border border-white/[0.08] space-y-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-bold text-purple-400 uppercase tracking-[0.2em]">Nuevo Repostaje</h2>
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white/[0.05] border border-white/[0.1] rounded-lg px-2 py-1 text-[10px] font-bold text-white outline-none [color-scheme:dark]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[9px] text-gray-500 uppercase font-bold tracking-widest ml-1">Coste (€)</label>
            <input
              type="number"
              placeholder="0.00"
              value={formData.coste}
              onChange={(e) => setFormData({ ...formData, coste: e.target.value })}
              className="w-full bg-white/[0.02] border border-white/[0.1] rounded-2xl p-3 text-sm text-white outline-none focus:border-purple-500/30 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] text-gray-500 uppercase font-bold tracking-widest ml-1">KM Tanque</label>
            <input
              type="number"
              placeholder="650"
              value={formData.km}
              onChange={(e) => setFormData({ ...formData, km: e.target.value })}
              className="w-full bg-white/[0.02] border border-white/[0.1] rounded-2xl p-3 text-sm text-white outline-none focus:border-purple-500/30 transition-all"
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <label className="text-[9px] text-gray-500 uppercase font-bold tracking-widest ml-1">Estación (Lugar)</label>
            <input
              type="text"
              placeholder="Ej: Repsol, Madrid"
              value={formData.gasolinera}
              onChange={(e) => setFormData({ ...formData, gasolinera: e.target.value })}
              className="w-full bg-white/[0.02] border border-white/[0.1] rounded-2xl p-3 text-sm text-white outline-none focus:border-purple-500/30 transition-all"
            />
          </div>
        </div>
        
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-4 bg-white text-black font-bold text-[10px] uppercase tracking-widest rounded-2xl hover:bg-gray-200 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {isSaving ? "Guardando..." : "Registrar Diesel"}
        </button>
      </div>

      {/* TOTAL MENSUAL */}
      <div className="p-5 rounded-3xl bg-red-500/5 border border-red-500/10 flex justify-between items-center shadow-lg transition-all hover:bg-red-500/10">
        <div className="space-y-1">
          <h3 className="text-[10px] font-bold text-red-400/80 uppercase tracking-widest">Total Diesel</h3>
          <p className="text-[9px] text-gray-600 italic uppercase">{selectedMonth}</p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-mono font-bold text-red-400 tracking-tighter">
            -{new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(totalDiesel)}
          </span>
        </div>
      </div>

      {/* TABLA DE HISTORIAL - FULL COLUMNS & RESPONSIVE */}
      <div className="space-y-4 pb-10">
        <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-1">Historial del Periodo</h2>
        {filteredExpenses.length === 0 ? (
          <div className="p-10 rounded-3xl border border-dashed border-white/[0.08] text-center bg-white/[0.01]">
            <p className="text-[10px] uppercase text-gray-600 font-bold tracking-widest">Sin registros este mes</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0a0a0a] shadow-2xl">
            <div className="overflow-x-auto scrollbar-hide">
              <table className="min-w-full text-xs text-left border-separate border-spacing-0">
                <thead>
                  <tr className="bg-white/[0.02] text-[9px] uppercase text-gray-500 font-bold tracking-widest">
                    <th className="px-6 py-4 border-b border-white/[0.08]">Coste / Fecha</th>
                    <th className="px-4 py-4 border-b border-white/[0.08] text-center">KM / Efic.</th>
                    <th className="px-4 py-4 border-b border-white/[0.08]">Lugar</th>
                    <th className="px-6 py-4 border-b border-white/[0.08] text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {filteredExpenses.map((item) => {
                    const efficiency = item.km_duracion > 0 ? (item.coste / item.km_duracion).toFixed(2) : "0.00";
                    return (
                      <tr key={item.id} className="hover:bg-white/[0.01] transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-bold text-white text-sm">
                               {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(item.coste)}
                            </span>
                            <span className="text-[10px] text-gray-500">{new Date(item.fecha).toLocaleDateString("es-ES")}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-mono text-gray-400 font-bold">{item.km_duracion} <span className="text-[9px]">km</span></span>
                            <span className="text-[10px] text-purple-400/80 font-bold italic">{efficiency} €/km</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                            <span className="text-gray-500 text-[11px] italic font-light truncate block max-w-[80px]">
                                {item.gasolinera || "—"}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleDelete(item.id)} 
                            className="p-2 text-gray-700 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all active:scale-90"
                          >
                            <FaTrashCan size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}