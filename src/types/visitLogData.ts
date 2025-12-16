export interface VisitaLogData {
    monto_generado: string; // Supabase devuelve numeric como string
    created_at: string;
    cp: { // La propiedad 'cp' es el objeto anidado del join a codigos_postales
        codigo_postal: string;
        nombre_barrio: string;
    };
}