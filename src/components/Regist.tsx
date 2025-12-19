'use client';

import { useState, useEffect } from 'react';
import Navigation from './navigation/Navigation';
import { supabase } from '@/lib/supabaseClient'; 
import { recordVisit } from '@/lib/visits';
import DieselForm from '@/app/dashboard/DieselForm';
import { DieselExpense } from '@/types/diesel';

export default function Regist() {
  const [cpInput, setCpInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // 💡 SOLUCIÓN: Estado para almacenar los datos reales de la tabla
  const [dieselLogs, setDieselLogs] = useState<DieselExpense[]>([]);

  // Función para cargar los gastos desde Supabase
  const fetchDiesel = async () => {
    const { data, error } = await supabase
      .from('gastos_gasolina') // O el nombre de tu tabla
      .select('*')
      .order('fecha', { ascending: false });
    
    if (!error && data) setDieselLogs(data);
  };

  useEffect(() => {
    fetchDiesel();
  }, []);

  const handleRecordVisit = async () => {
    if (!cpInput.trim()) {
      setMessage('⚠️ Introduce un Código Postal.');
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const result = await recordVisit(user.id, cpInput.trim());
      if (result) {
        setMessage(`✅ Registrado: CP ${cpInput}`);
        setCpInput('');
      }
    } catch (error) {
      setMessage('❌ Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navigation />
      <main className="min-h-[calc(100vh-64px)] bg-[#0a0a0a] text-white p-6 selection:bg-purple-500/30">
        <div className="max-w-xl mx-auto flex flex-col gap-12 pt-16">
          
          {/* SECCIÓN GASOLINA (Ahora dentro del contenedor) */}
          <div className="space-y-6">
          <DieselForm />
          </div>

          <div className="h-[1px] bg-white/[0.08] w-full" />

          {/* SECCIÓN REGISTRO VISITA */}
          <header className="space-y-2">
            <h1 className="text-base font-semibold tracking-tight text-white italic">
              Registrar visita
            </h1>
          </header>

          <section className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                className="flex-grow px-4 py-3 bg-white/[0.02] border border-white/[0.1] rounded-xl text-sm text-white outline-none focus:border-white/[0.3]"
                placeholder="Ej. 28034"
                value={cpInput}
                onChange={(e) => setCpInput(e.target.value)}
                disabled={loading}
              />
              <button 
                onClick={handleRecordVisit}
                className="px-8 py-3 bg-purple-300 text-black text-sm font-medium rounded-xl hover:bg-gray-200"
              >
                {loading ? '...' : 'Registrar'}
              </button>
            </div>
            {message && (
              <div className="p-4 rounded-xl border text-xs bg-white/[0.02] border-white/[0.1]">
                {message}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}