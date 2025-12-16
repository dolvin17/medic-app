// src/lib/visits.ts

import { supabase } from "@/lib/supabaseClient";
import { UserStats } from "@/types/userStats"; 
import { VisitaLogData } from "@/types/visitLogData"; 

// Asumo que tu interfaz VisitaLogData está definida en src/types/visitLogData.ts
// interface VisitaLogData { monto_generado: string; created_at: string; cp: { codigo_postal: string; nombre_barrio: string; }; }


// ============== 1. REGISTRAR VISITA POR CÓDIGO POSTAL =============

export async function recordVisit(userId: string, codigoPostal: string) {
    
    const { data: cpData, error: cpError } = await supabase
        .from('codigos_postales')
        .select('id, tarifa')
        .eq('codigo_postal', codigoPostal)
        .single(); 

    if (cpError || !cpData) {
        console.error("Error al obtener CP o no encontrado:", cpError?.message);
        return null;
    }

    const cpId = cpData.id;
    const monto = cpData.tarifa;

    const { data, error } = await supabase
        .from('visitas_log')
        .insert({
            user_id: userId,
            cp_id: cpId, 
            monto_generado: monto,
        })
        .select()
        .single();

    if (error) {
        console.error("Error al registrar la visita:", error.message);
        return null;
    }
    
    return data;
}

// ============== 2. CÁLCULO DE ESTADÍSTICAS Y LOGS DETALLADOS =============

export async function getUserStats(userId: string): Promise<UserStats> {
    
    const { data, error } = await supabase
        .from('visitas_log')
        .select(`
            monto_generado,
            created_at,
            cp:cp_id (codigo_postal, nombre_barrio)
        `)
        .eq('user_id', userId); 

    if (error || !data) {
        // Devolver una estructura compatible con UserStats
        return { total_visits: 0, total_money: 0, money_today: 0, money_week: 0, money_month: 0, visits_by_cp: [], detailed_logs: [] };
    }

    const logs = data as unknown as VisitaLogData[]; 

    let total_visits = 0;
    let total_money = 0;
    let money_today = 0; 
    let money_week = 0;
    let money_month = 0;
    
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()); 
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); 
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); 
    
    const visitsMap: UserStats['visits_by_cp'] = []; 
    const detailedLogsArray: VisitaLogData[] = []; // Array para el historial detallado
    
    // Convertir visitsMap a Record para fácil acumulación
    const cpMap: Record<string, { codigo_postal: string, nombre_barrio: string, visits_per_cp: number }> = {};


    logs.forEach((log) => { 
        const monto = parseFloat(log.monto_generado as string);
        const logDate = new Date(log.created_at);
        const cpKey = log.cp.codigo_postal; 

        // Acumulación de Contadores
        total_visits++;
        total_money += monto;
        if (logDate >= startOfToday) { money_today += monto; }
        if (logDate > oneWeekAgo) { money_week += monto; }
        if (logDate > thirtyDaysAgo) { money_month += monto; }

        // Acumulación por CP
        if (!cpMap[cpKey]) {
            cpMap[cpKey] = {
                codigo_postal: log.cp.codigo_postal,
                nombre_barrio: log.cp.nombre_barrio,
                visits_per_cp: 0,
            };
        }
        cpMap[cpKey].visits_per_cp++;
        
        // Almacenamiento del Log Detallado (CLAVE para el filtrado del Dashboard)
        detailedLogsArray.push(log);
    });
    
    return {
        total_visits,
        total_money: parseFloat(total_money.toFixed(2)),
        money_today: parseFloat(money_today.toFixed(2)),
        money_week: parseFloat(money_week.toFixed(2)),
        money_month: parseFloat(money_month.toFixed(2)),
        visits_by_cp: Object.values(cpMap),
        
        // Devolvemos los logs detallados en orden inverso (más reciente primero)
        detailed_logs: detailedLogsArray.reverse(), 
    } as UserStats;
}