import { VisitaLogData } from './visitLogData';

export interface UserStats {
    total_visits: number;
    total_money: number;
    money_today: number;
    money_week: number;
    money_month: number;
    visits_by_cp: {
        codigo_postal: string;
        nombre_barrio: string;
        visits_per_cp: number;
    }[];
    
    // 💡 PROPIEDAD AÑADIDA PARA PERMITIR EL HISTORIAL DETALLADO EN EL DASHBOARD
    detailed_logs: VisitaLogData[]; 
}