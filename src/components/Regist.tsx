'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image'; // 💡 Importante para el logo
import Navigation from './navigation/Navigation';
import { supabase } from '@/lib/supabaseClient'; 
import { recordVisit } from '@/lib/visits';
import DieselForm from '@/app/dashboard/DieselForm'; // 💡 Usamos el unificado

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
      <main className="min-h-[calc(100vh-64px)] bg-[#0a0a0a] text-white p-6 selection:bg-purple-500/30 font-sans">
        <div className="max-w-xl mx-auto flex flex-col gap-10 pt-8 pb-20">
          
          {/* 💡 CABECERA CON LOGO CADUCEO */}
          <header className="flex flex-col items-center gap-4 mb-4">
            <div className="p-3 rounded-2xl bg-white/[0.03] overflow-hidden border border-white/[0.08] shadow-inner">
              <Image 
                src="/caduceo.svg" 
                height="48" 
                width="48" 
                alt="Logo Medicina"
                className="drop-shadow-[0_0_12px_rgba(168,85,247,0.4)] scale-175  animate-in fade-in duration-1000"
              />
            </div>
            <div className="text-center">
              <h1 className="text-xs tracking-tight text-white">HECHO CON MUCHO AMOR Y CAFEÍNA</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-medium">Panel de Registro</p>
            </div>
          </header>

          {/* SECCIÓN GASOLINA (Usando el componente Manager unificado) */}
          <section className="animate-in slide-in-from-bottom-4 duration-500">
            <DieselForm />
          </section>

          {/* DIVIDER ESTILIZADO */}
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/[0.08]"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest text-gray-600 bg-[#0a0a0a] px-4 font-bold">Servicios</div>
          </div>

          {/* SECCIÓN REGISTRO VISITA */}
          <section className="space-y-6 animate-in slide-in-from-bottom-6 duration-700">
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-white/90 ml-1 italic">Registrar visita médica</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  className="flex-grow px-4 py-4 bg-white/[0.02] border border-white/[0.1] rounded-2xl text-sm text-white outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20 transition-all placeholder:text-gray-700"
                  placeholder="Introduce el código postal..."
                  value={cpInput}
                  onChange={(e) => setCpInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRecordVisit()}
                  disabled={loading}
                />
                <button 
                  onClick={handleRecordVisit}
                  disabled={loading || !cpInput.trim()}
                  className="px-10 py-4 bg-purple-300 text-black text-xs font-bold uppercase tracking-widest rounded-2xl hover:bg-white hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-30 shadow-lg shadow-purple-500/10"
                >
                  {loading ? '...' : 'Registrar'}
                </button>
              </div>
            </div>

            {/* FEEDBACK DE ESTADO */}
            {message && (
              <div className={`p-4 rounded-2xl border text-[11px] font-bold text-center animate-in zoom-in-95 duration-300 ${
                message.includes('✅') 
                  ? 'bg-green-500/5 border-green-500/20 text-green-400' 
                  : 'bg-red-500/5 border-red-500/20 text-red-400'
              }`}>
                {message}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}