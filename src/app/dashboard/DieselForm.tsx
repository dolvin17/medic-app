"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { DieselExpense } from "@/types/diesel";

export default function DieselManager() {
  const [expenses, setExpenses] = useState<DieselExpense[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    coste: "",
    km: "",
    gasolinera: "",
  });

  // 1. CARGA DE DATOS
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

  // 2. CÁLCULO DEL TOTAL (Memorizado para evitar re-cálculos innecesarios)
  const totalDiesel = useMemo(() => {
    return expenses.reduce((acc, item) => acc + Number(item.coste), 0);
  }, [expenses]);

  // 3. GUARDADO DE REGISTRO
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
      alert("Error al guardar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-700">
      
      {/* SECCIÓN A: FORMULARIO */}
      <div className="p-2 rounded-2xl bg-[#0a0a0a] border border-white/[0.08] space-y-6 shadow-xl relative overflow-hidden">
        {/* Sutil resplandor de fondo para identificar la sección */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/5 blur-3xl rounded-full pointer-events-none" />
        
        <div className="flex items-center justify-between relative z-10">
          <h2 className="text-[10px] font-bold text-purple-400 uppercase tracking-[0.2em]">
            Repostaje Diesel
          </h2>
          {isSaving && (
            <span className="text-[10px] text-purple-400 animate-pulse uppercase font-bold">
              Guardando...
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
          <div className="space-y-1.5">
            <label className="text-[10px] text-gray-500 ml-1 uppercase font-bold tracking-tighter">Coste Total</label>
            <input
              type="number"
              placeholder="0.00 €"
              value={formData.coste}
              onChange={(e) => setFormData({ ...formData, coste: e.target.value })}
              className="w-full bg-white/[0.02] border border-white/[0.1] rounded-xl p-3 text-sm text-white outline-none focus:border-purple-500/30 transition-all placeholder:text-gray-700"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-gray-500 ml-1 uppercase font-bold tracking-tighter">KM del Tanque</label>
            <input
              type="number"
              placeholder="Ej. 650"
              value={formData.km}
              onChange={(e) => setFormData({ ...formData, km: e.target.value })}
              className="w-full bg-white/[0.02] border border-white/[0.1] rounded-xl p-3 text-sm text-white outline-none focus:border-purple-500/30 transition-all placeholder:text-gray-700"
            />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-[10px] text-gray-500 ml-1 uppercase font-bold tracking-tighter">Estación de Servicio</label>
            <input
              type="text"
              placeholder="Nombre de la gasolinera"
              value={formData.gasolinera}
              onChange={(e) => setFormData({ ...formData, gasolinera: e.target.value })}
              className="w-full bg-white/[0.02] border border-white/[0.1] rounded-xl p-3 text-sm text-white outline-none focus:border-purple-500/30 transition-all placeholder:text-gray-700"
            />
          </div>
        </div>
        
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-4 bg-white text-black font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-white/5"
        >
          {isSaving ? "Procesando..." : "Guardar Registro"}
        </button>
      </div>

      {/* 💡 SECCIÓN: TARJETA DE TOTAL ACUMULADO DIESEL */}
      <div className="p-5 rounded-2xl bg-red-500/5 border border-red-500/10 flex justify-between items-center shadow-lg transition-all hover:bg-red-500/10">
        <div className="space-y-1">
          <h3 className="text-[10px] font-bold text-red-400/80 uppercase tracking-widest">
            Total Diesel
          </h3>
          <p className="text-[9px] text-gray-600 italic uppercase tracking-tighter">Acumulado de repostajes</p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-mono font-bold text-red-400 tracking-tighter">
            -{new Intl.NumberFormat("es-ES", {
              style: "currency",
              currency: "EUR",
            }).format(totalDiesel)}
          </span>
        </div>
      </div>

      {/* SECCIÓN B: TABLA DE HISTORIAL */}
      <div className="space-y-4">
        <div className="flex items-center justify-between ">
          <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
            Historial de Consumo
          </h2>
          {isFetching && (
            <div className="w-3 h-3 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          )}
        </div>

        {expenses.length === 0 && !isFetching ? (
          <div className="p-12 rounded-3xl border border-dashed border-white/[0.08] text-center bg-white/[0.01]">
            <p className="text-[10px] uppercase tracking-widest text-gray-600 font-bold">Sin registros</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0a0a] shadow-2xl">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left border-separate border-spacing-0">
                <thead>
                  <tr className="bg-white/[0.02]">
                    <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-widest text-[9px] border-b border-white/[0.08]">ID</th>
                    <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-widest text-[9px] border-b border-white/[0.08]">Coste</th>
                    <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-widest text-[9px] border-b border-white/[0.08]">Fecha</th>
                    <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-widest text-[9px] border-b border-white/[0.08] text-center">Eficiencia</th>
                    <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-widest text-[9px] border-b border-white/[0.08]">Lugar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {expenses.map((item) => (
                    <tr key={item.id} className="group hover:bg-white/[0.01] transition-colors">
                      <td className="px-2 py-4 text-[9px] font-mono text-purple-400/50 uppercase tracking-tighter">
                        Diesel
                      </td>
                      <td className="px-6 py-4 font-bold text-white tracking-tight">
                        {new Intl.NumberFormat("es-ES", {
                          style: "currency",
                          currency: "EUR",
                        }).format(item.coste)}
                      </td>
                      <td className="px-2 py-4 text-gray-500 tabular-nums">
                        {new Date(item.fecha).toLocaleDateString("es-ES")}
                      </td>
                      <td className="px-2 py-4 text-center">
                        <span className="text-gray-400 font-mono font-bold">
                          {item.km_duracion}
                        </span>
                        <span className="ml-1 text-[9px] text-gray-600 uppercase font-bold tracking-tighter">km</span>
                      </td>
                      <td className="px-2 py-4 text-gray-500 italic font-light">
                        {item.gasolinera || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}