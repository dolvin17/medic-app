import { supabase } from "@/lib/supabaseClient";
import { UserStats } from "@/types/userStats"; 
import { VisitaLogData } from "@/types/visitLogData"; 

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

// ============== 2. CÁLCULO DE ESTADÍSTICAS (CORREGIDO) =============

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
        return { 
            total_visits: 0, 
            total_money: 0, 
            money_today: 0, 
            money_week: 0, 
            money_month: 0, 
            visits_by_cp: [], 
            detailed_logs: [] 
        };
    }

    const logs = data as unknown as VisitaLogData[]; 

    let total_visits = 0;
    let total_money = 0;
    let money_today = 0; 
    let money_week = 0;
    let money_month = 0;
    
    const now = new Date();
    
    // --- 💡 LÓGICA DE FILTRADO CALENDARIO (FIX) ---
    
    // Inicio de Hoy (00:00:00)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()); 

    // Inicio de la Semana (Lunes actual a las 00:00:00)
    // Calculamos el lunes de la semana actual
    const currentDay = now.getDay(); // 0 (Dom) a 6 (Sab)
    const diffToMonday = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    // Inicio del Mes (Día 1 del mes actual a las 00:00:00)
    // Esto garantiza que el contador se resetee el día 1 de cada mes.
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1); 
    startOfMonth.setHours(0, 0, 0, 0);
    
    const cpMap: Record<string, { codigo_postal: string, nombre_barrio: string, visits_per_cp: number }> = {};
    const detailedLogsArray: VisitaLogData[] = [];
    
    logs.forEach((log) => { 
        const monto = parseFloat(log.monto_generado as string);
        const logDate = new Date(log.created_at);
        const cpKey = log.cp.codigo_postal; 

        // Totales históricos
        total_visits++;
        total_money += monto;

        // --- 🎯 FILTRADO POR PERIODOS REALES ---
        // Hoy
        if (logDate >= startOfToday) { 
            money_today += monto; 
        }
        
        // Esta Semana (Lunes a Domingo)
        if (logDate >= startOfWeek) { 
            money_week += monto; 
        }
        
        // Este Mes (Día 1 al 31)
        // Como hoy es 3 de enero, solo entrarán los logs de enero.
        if (logDate >= startOfMonth) { 
            money_month += monto; 
        }

        // Acumulación por CP
        if (!cpMap[cpKey]) {
            cpMap[cpKey] = {
                codigo_postal: log.cp.codigo_postal,
                nombre_barrio: log.cp.nombre_barrio,
                visits_per_cp: 0,
            };
        }
        cpMap[cpKey].visits_per_cp++;
        
        detailedLogsArray.push(log);
    });
    
    return {
        total_visits,
        total_money: parseFloat(total_money.toFixed(2)),
        money_today: parseFloat(money_today.toFixed(2)),
        money_week: parseFloat(money_week.toFixed(2)),
        money_month: parseFloat(money_month.toFixed(2)),
        visits_by_cp: Object.values(cpMap),
        detailed_logs: detailedLogsArray.reverse(), 
    } as UserStats;
}