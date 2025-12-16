// src/components/Regist.tsx
'use client'; // ¡Es crucial para usar estados y eventos de clic!

import { useState } from 'react';
import Navigation from './navigation/Navigation';
import { supabase } from '@/lib/supabaseClient'; 
import { recordVisit } from '@/lib/visits'; // <-- Importamos la función de registro

export default function Regist() {
  const [cpInput, setCpInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 1. Manejador del Registro de Visita
  const handleRecordVisit = async () => {
    if (!cpInput.trim()) {
      setMessage('Por favor, introduce un Código Postal.');
      return;
    }

    setLoading(true);
    setMessage('Registrando visita...');

    try {
      // A. Obtener el ID del usuario logueado
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setMessage('Error: Debes iniciar sesión para registrar una visita.');
        return; 
      }

      // B. Llamar a la función de lógica de negocio (recordVisit en visits.ts)
      const result = await recordVisit(user.id, cpInput.trim());

      if (result) {
        setMessage(`✅ Visita registrada con éxito en CP ${cpInput}.`);
        setCpInput(''); // Limpiar el input
      } else {
        // Esto captura errores como CP no encontrado, RLS, o tarifa no definida
        setMessage(`❌ ERROR: El CP ${cpInput} no existe o no se pudo registrar.`);
      }

    } catch (error) {
      console.error("Error inesperado:", error);
      setMessage('❌ Error inesperado durante el registro.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <>
      <Navigation />
      <main className="flex flex-col gap-16 p-6">
        <section aria-description="register-cp">
          <div className="flex items-center gap-3">
            <h1>Registra la visita</h1>
            <input
              className="rounded-xl border-1 p-2 border-purple-800"
              placeholder="28034"
              value={cpInput}
              onChange={(e) => setCpInput(e.target.value)} // Capturar el valor
              disabled={loading}
            />
          </div>
        </section>
        
        {/* Mensaje de estado o error */}
        {message && (
          <p className={`text-center font-bold ${message.startsWith('❌') ? 'text-red-500' : 'text-green-500'}`}>
            {message}
          </p>
        )}

        {/* Botón de Registro */}
        <button 
          onClick={handleRecordVisit}
          disabled={loading || !cpInput.trim()}
          className="mx-auto cursor-pointer rounded-xl p-2 bg-purple-900 w-1/3 transition duration-150 ease-in-out 
                     hover:bg-purple-950 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Cargando...' : 'Registrar visita'}
        </button>
      </main>
    </>
  );
}