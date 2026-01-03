import { supabase } from "@/lib/supabaseClient";
import { UserStats } from "@/types/userStats"; 
import { VisitaLogData } from "@/types/visitLogData"; 

// ============== 1. REGISTRAR VISITA POR CÓDIGO POSTAL =============

export async function recordVisit(userId: string, codigoPostal: string) {
    // 💡 Añadimos tarifa en el select para que el log guarde el monto correcto
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
        .select(`
            *,
            cp:cp_id (codigo_postal, nombre_barrio, distancia_km, tarifa)
        `) // 💡 Select detallado para devolver el objeto completo tras insertar
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
            cp:cp_id (
                codigo_postal, 
                nombre_barrio, 
                distancia_km, 
                tarifa
            )
        `) // 💡 CRÍTICO: Añadido distancia_km y tarifa para el Dashboard y PDF
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

    // Casteamos los datos para que TypeScript reconozca las nuevas propiedades
    const logs = data as unknown as VisitaLogData[]; 

    let total_visits = 0;
    let total_money = 0;
    let money_today = 0; 
    let money_week = 0;
    let money_month = 0;
    
    const now = new Date();
    
    // --- 💡 LÓGICA DE PERIODOS ---
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()); 

    const currentDay = now.getDay(); 
    const diffToMonday = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1); 
    startOfMonth.setHours(0, 0, 0, 0);
    
    const cpMap: Record<string, { codigo_postal: string, nombre_barrio: string, visits_per_cp: number }> = {};
    const detailedLogsArray: VisitaLogData[] = [];
    
    logs.forEach((log) => { 
        const monto = parseFloat(log.monto_generado as string);
        const logDate = new Date(log.created_at);
        const cpKey = log.cp.codigo_postal; 

        total_visits++;
        total_money += monto;

        if (logDate >= startOfToday) money_today += monto; 
        if (logDate >= startOfWeek) money_week += monto; 
        if (logDate >= startOfMonth) money_month += monto; 

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
        total_money: Number(total_money.toFixed(2)),
        money_today: Number(money_today.toFixed(2)),
        money_week: Number(money_week.toFixed(2)),
        money_month: Number(money_month.toFixed(2)),
        visits_by_cp: Object.values(cpMap),
        detailed_logs: detailedLogsArray.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ), 
    } as UserStats;
}