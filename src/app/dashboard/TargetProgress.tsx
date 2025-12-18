'use client';

import { useMemo } from 'react';
import { UserStats } from '@/types/userStats';

interface TargetProgressProps {
  stats: UserStats | null;
}

export default function TargetProgress({ stats }: TargetProgressProps) {
  const currentMoney = stats?.money_month || 0;
  const totalVisits = stats?.total_visits || 0;

  // 1. Definimos los escalones de objetivos
  const targets = [3000, 4000, 4500];
  
  // 2. Determinamos el objetivo actual basado en cuánto dinero llevamos
  const currentTarget = useMemo(() => {
    return targets.find(t => currentMoney < t) || targets[targets.length - 1];
  }, [currentMoney]);

  // 3. Calculamos la estimación de visitas restantes
  const estimation = useMemo(() => {
    if (currentMoney >= currentTarget) return 0;
    
    // Calculamos el promedio real (Tarifa media por visita)
    const averageRate = totalVisits > 0 ? currentMoney / totalVisits : 20; // 25€ de fallback
    const remainingMoney = currentTarget - currentMoney;
    
    return Math.ceil(remainingMoney / averageRate);
  }, [currentMoney, currentTarget, totalVisits]);

  // 4. Porcentaje de progreso para la barra visual
  const progressPercentage = Math.min((currentMoney / currentTarget) * 100, 100);

  return (
    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-4">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">
            Objetivo de Facturación
          </p>
          <h3 className="text-xl font-semibold text-white tracking-tighter">
            {currentTarget}€
          </h3>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">
            Faltan aprox.
          </p>
          <p className="text-xl font-mono text-purple-400">
            {estimation} <span className="text-xs font-sans text-gray-400">pacientes en Madrid</span>
          </p>
        </div>
      </div>
      {/* Barra de Progreso Estilo Vercel */}
      <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
        <div 
className="h-full bg-gradient-to-r from-purple-500 to-white transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(168,85,247,0.4)]"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      <div className="flex justify-between text-[10px] font-medium uppercase tracking-tighter">
        <span className="text-gray-500">{currentMoney.toFixed(2)}€ logrados</span>
        <span className={`${currentMoney >= currentTarget ? 'text-green-400' : 'text-gray-600'}`}>
          {currentMoney >= currentTarget ? '¡Objetivo Alcanzado!' : `${progressPercentage.toFixed(1)}%`}
        </span>
      </div>
    </div>
  );
}