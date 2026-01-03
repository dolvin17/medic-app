'use client';

import { useMemo } from 'react';
import { UserStats } from '@/types/userStats';

interface TargetProgressProps {
  stats: UserStats | null;
}

export default function TargetProgress({ stats }: TargetProgressProps) {
  // 1. Usamos el dinero acumulado SOLO del mes actual
  const currentMoney = stats?.money_month || 0;
  
  // 💡 CLAVE: Obtenemos el número de visitas solo del mes actual para que el promedio sea real
  const visitsThisMonth = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return stats?.detailed_logs?.filter(log => {
      const logDate = new Date(log.created_at);
      return logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear;
    }).length || 0;
  }, [stats]);

  // 2. Definimos los escalones de objetivos
  const targets = [1000, 2000, 3000, 4000, 4500];
  
  // 3. Determinamos el objetivo actual basado en cuánto dinero llevamos este mes
  const currentTarget = useMemo(() => {
    return targets.find(t => currentMoney < t) || targets[targets.length - 1];
  }, [currentMoney]);

  // 4. Calculamos la estimación de visitas restantes con la tarifa media de ESTE MES
  const estimation = useMemo(() => {
    if (currentMoney >= currentTarget) return 0;
    
    // Si no hay visitas este mes aún, usamos una tarifa estimada de 55€ (tu promedio habitual)
    const averageRate = (visitsThisMonth > 0) ? (currentMoney / visitsThisMonth) : 55;
    const remainingMoney = currentTarget - currentMoney;
    
    return Math.ceil(remainingMoney / averageRate);
  }, [currentMoney, currentTarget, visitsThisMonth]);

  // 5. Porcentaje de progreso para la barra visual
  const progressPercentage = Math.min((currentMoney / currentTarget) * 100, 100);

  return (
    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-4 shadow-2xl">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
            Objetivo Mensual
          </p>
          <h3 className="text-2xl font-semibold text-white tracking-tighter">
            {currentTarget}€
          </h3>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-purple-400/80 uppercase tracking-widest">
            Faltan aprox.
          </p>
          <p className="text-2xl font-mono font-bold text-purple-400">
            {estimation} <span className="text-xs font-sans text-gray-500 font-normal">visitas</span>
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

      <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest">
        <div className="flex items-center gap-2">
           <span className="text-white">{currentMoney.toFixed(2)}€</span>
           <span className="text-gray-600">logrados</span>
        </div>
        <span className={`${currentMoney >= currentTarget ? 'text-green-400' : 'text-gray-500'}`}>
          {currentMoney >= currentTarget ? '¡Objetivo alcanzado!' : `${progressPercentage.toFixed(1)}% del total`}
        </span>
      </div>
    </div>
  );
}