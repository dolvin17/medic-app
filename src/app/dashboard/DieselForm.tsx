"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { DieselExpense } from "@/types/diesel";

export default function DieselManager() {
  // 1. ESTADOS UNIFICADOS
  const [expenses, setExpenses] = useState<DieselExpense[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    coste: "",
    km: "",
    gasolinera: "",
  });

  // 2. FUNCIÓN DE CARGA (FETCH)
  // Usamos useCallback para poder reutilizarla tras guardar
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

  // Carga inicial
  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // 3. FUNCIÓN DE GUARDADO
  const handleSave = async () => {
    if (!formData.coste || !formData.km) {
      alert("Por favor, completa el coste y los kilómetros.");
      return;
    }

    setIsSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Sesión no encontrada");
      // Inserción protegida por RLS
      const { error } = await supabase.from("gastos_gasolina").insert({
        user_id: user.id,
        coste: parseFloat(formData.coste),
        km_duracion: parseFloat(formData.km),
        gasolinera: formData.gasolinera,
        fecha: new Date().toISOString().split("T")[0],
      });

      if (error) throw error;

      // RECARGA INSTANTÁNEA: Limpiamos y refrescamos la lista
      setFormData({ coste: "", km: "", gasolinera: "" });
      await fetchExpenses();
    } catch (error: any) {
      alert("Error al guardar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <div className="flex flex-col gap-8 w-full">
      {/* SECCIÓN A: FORMULARIO */}
      <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-white/[0.08] space-y-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-widest">
            Diesel
          </h2>
          {isSaving && (
            <span className="text-[10px] text-purple-400 animate-pulse uppercase">
              Guardando...
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] text-gray-500 ml-1 uppercase">
              Coste Total
            </label>
            <input
              type="number"
              placeholder="0.00 €"
              value={formData.coste}
              onChange={(e) =>
                setFormData({ ...formData, coste: e.target.value })
              }
              className="w-full bg-white/[0.02] border border-white/[0.1] rounded-lg p-3 text-sm text-white outline-none focus:border-purple-500/30 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-gray-500 ml-1 uppercase">
              KM del Tanque
            </label>
            <input
              type="number"
              placeholder="Ej. 650"
              value={formData.km}
              onChange={(e) => setFormData({ ...formData, km: e.target.value })}
              className="w-full bg-white/[0.02] border border-white/[0.1] rounded-lg p-3 text-sm text-white outline-none focus:border-purple-500/30 transition-all"
            />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-[10px] text-gray-500 ml-1 uppercase">
              Estación de Servicio
            </label>
            <input
              type="text"
              placeholder="Nombre de la gasolinera"
              value={formData.gasolinera}
              onChange={(e) =>
                setFormData({ ...formData, gasolinera: e.target.value })
              }
              className="w-full bg-white/[0.02] border border-white/[0.1] rounded-lg p-3 text-sm text-white outline-none focus:border-purple-500/30 transition-all"
            />
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-3 bg-purple-300 text-black font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50 active:scale-[0.98]"
        >
          {isSaving ? "Procesando..." : "Guardar Registro"}
        </button>
      </div>
      {/* SECCIÓN B: TABLA DE HISTORIAL */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-[0.2em]">
            Historial de Consumo
          </h2>
          {isFetching && (
            <div className="w-3 h-3 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          )}
        </div>
        {expenses.length === 0 && !isFetching ? (
          <div className="p-12 rounded-2xl border border-dashed border-white/[0.08] text-center bg-white/[0.01]">
            <p className="text-xs text-gray-600 italic">
              No hay registros de combustible disponibles.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0a0a] shadow-2xl">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left border-separate border-spacing-0">
                <thead>
                  <tr className="bg-white/[0.02]">
                    <th className="px-4 py-3 font-medium text-gray-500 border-b border-white/[0.08] uppercase tracking-wider text-[10px]">
                      Código
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-500 border-b border-white/[0.08] uppercase tracking-wider text-[10px]">
                      Coste
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-500 border-b border-white/[0.08] uppercase tracking-wider text-[10px]">
                      Fecha
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-500 border-b border-white/[0.08] uppercase tracking-wider text-[10px]">
                      Eficiencia (KM)
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-500 border-b border-white/[0.08] uppercase tracking-wider text-[10px]">
                      Estación
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {expenses.map((item) => (
                    <tr
                      key={item.id}
                      className="group hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-4 text-[10px] font-mono text-purple-400/70 italic">
                        {item.codigo || "DIESEL"}
                      </td>
                      <td className="px-4 py-4 font-semibold text-white tracking-tight">
                        {new Intl.NumberFormat("es-ES", {
                          style: "currency",
                          currency: "EUR",
                        }).format(item.coste)}
                      </td>
                      <td className="px-4 py-4 text-gray-500 tabular-nums text-xs">
                        {new Date(item.fecha).toLocaleDateString("es-ES")}
                      </td>
                      {/* 💡 ALINEACIÓN CORREGIDA: Centrado bajo el encabezado */}
                      <td className="px-4 py-4 text-center">
                        <span className="text-gray-400 font-mono text-xs">
                          {item.km_duracion}
                        </span>
                        <span className="ml-1 text-[9px] text-gray-600 font-sans italic lowercase">
                          km
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-500 italic font-light">
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
