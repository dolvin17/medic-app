import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const widgetToken = searchParams.get('key');
  
  // 1. Inicializamos el cliente de servidor
  const supabase = await createClient();
  
  let userId: string | null = null;

  // 2. Intentamos identificar al usuario
  // Opción A: Por sesión de navegador (si lo abres tú en el PC)
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    userId = user.id;
  } 
  // Opción B: Por Token Secreto (para el iPhone de ella)
  // Reemplaza 'TU_FRASE_SECRETA' por algo como 'AlixWidget2026!'
  // Reemplaza 'EL_UUID_DE_ALIX' por su ID de la tabla usuarios de Supabase
  else if (widgetToken === "170722") {
    userId = "fee70b20-6419-4293-af9d-4f884e574cf2"; 
  }

  // Si no hay ninguna de las dos, bloqueamos el acceso
  if (!userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // 3. Consultamos los datos de sus visitas
  const { data: logs, error } = await supabase
    .from('visitas_log')
    .select('monto_generado, created_at')
    .eq('user_id', userId);

  if (error || !logs) {
    return NextResponse.json({ total: 0, error: 'Error al leer datos' });
  }

  // 4. Calculamos el total del mes actual
  /*const ahora = new Date();
  const mesActual = ahora.getMonth();
  const anoActual = ahora.getFullYear();

  const totalMesActual = logs
    .filter(log => {
      const d = new Date(log.created_at);
      return d.getMonth() === mesActual && d.getFullYear() === anoActual;
    })
    .reduce((acc, log) => acc + Number(log.monto_generado), 0);

  // 5. Respuesta final que leerá el iPhone
  return NextResponse.json({
    total: Math.round(totalMesActual),
    mes: ahora.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase(),
    vibe: "💪🏽 ¡A por ello, Mor",
    actualizado: ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  });
}*/
// ... después de obtener los logs
  const ahora = new Date();
  // Forzamos el mes y año actuales para evitar errores de zona horaria
  const mesActual = ahora.getMonth(); 
  const anoActual = ahora.getFullYear();

  const logsDelMes = logs.filter(log => {
    const fechaLog = new Date(log.created_at);
    return fechaLog.getMonth() === mesActual && 
           fechaLog.getFullYear() === anoActual;
  });

  const totalMesActual = logsDelMes.reduce((acc, log) => acc + Number(log.monto_generado), 0);

  // DEBUG: Vamos a ver qué está pasando realmente
  console.log(`Usuario: ${userId} | Logs totales: ${logs.length} | Logs mes: ${logsDelMes.length}`);

  return NextResponse.json({
    total: Math.round(totalMesActual),
    mes: ahora.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase(),
    vibe: totalMesActual > 0 ? "💪🏽 ¡A por ello, doc!" : "¡A estrenar el mes! ☕️",
    actualizado: ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    // Añadimos esto solo para probar:
    debug_count: logsDelMes.length 
  });
}
