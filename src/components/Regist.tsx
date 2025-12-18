'use client';

import { useState } from 'react';
import Navigation from './navigation/Navigation';
import { supabase } from '@/lib/supabaseClient'; 
import { recordVisit } from '@/lib/visits';

export default function Regist() {
  const [cpInput, setCpInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleRecordVisit = async () => {
    if (!cpInput.trim()) {
      setMessage('⚠️ Introduce un Código Postal.');
      return;
    }

    setLoading(true);
    setMessage('Registrando...');

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setMessage('❌ Error: Sesión no encontrada.');
        return; 
      }

      const result = await recordVisit(user.id, cpInput.trim());

      if (result) {
        setMessage(`✅ Registrado: CP ${cpInput}`);
        setCpInput('');
      } else {
        setMessage(`❌ El código "${cpInput}" no existe.`);
      }

    } catch (error) {
      console.error("Error:", error);
      setMessage('❌ Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navigation />
      {/* Fondo negro puro estilo Next.js */}
      <main className="min-h-[calc(100vh-64px)] bg-[#0a0a0a] text-white p-6 selection:bg-purple-500/30">
        <div className="max-w-xl mx-auto flex flex-col gap-12 pt-16">
          
          {/* TÍTULO Y DESCRIPCIÓN */}
          <header className="space-y-2">
            <h1 className="text-base font-semibold tracking-tight text-white">
              Registrar visita
            </h1>
            <p className="text-sm text-gray-500">
              Introduce el código postal para calcular la tarifa automáticamente.
            </p>
          </header>

          {/* FORMULARIO DE REGISTRO */}
          <section className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                className="flex-grow px-4 py-3 bg-white/[0.02] border border-white/[0.1] rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all focus:border-white/[0.3] focus:ring-1 focus:ring-white/[0.3]"
                placeholder="Ej. 28034"
                value={cpInput}
                onChange={(e) => setCpInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRecordVisit()}
                disabled={loading}
              />
              <button 
                onClick={handleRecordVisit}
                disabled={loading || !cpInput.trim()}
                className="px-8 py-3 bg-purple-300 text-black text-sm font-medium rounded-xl hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {loading ? 'Procesando...' : 'Registrar'}
              </button>
            </div>

            {/* FEEDBACK DE ESTADO (TOAST-LIKE) */}
            {message && (
              <div className={`mt-2 p-4 rounded-xl border text-xs font-medium transition-all animate-in fade-in slide-in-from-top-2 ${
                message.startsWith('❌') || message.startsWith('⚠️')
                  ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                  : 'bg-green-500/10 border-green-500/20 text-green-400'
              }`}>
                {message}
              </div>
            )}
          </section>

          {/* GUÍA DE USO RÁPIDO */}
          <footer className="pt-8 border-t border-white/[0.08] grid grid-cols-1 gap-4">
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.01] border border-white/[0.05]">
              <span className="text-xl">💡</span>
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-300 italic">Tip de eficiencia</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Para registrar pluses o servicios especiales, introduce el código corto definido (ej. Para plus nocturno introduce NOCHE).
                </p>
              </div>
            </div>
          </footer>

        </div>
      </main>
    </>
  );
}