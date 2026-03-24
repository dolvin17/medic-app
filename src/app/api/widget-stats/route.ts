import { createClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const widgetToken = searchParams.get('key');

  // 1. Seguridad: Si no hay token o es incorrecto, fuera.
  if (widgetToken !== "170722") {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
  }

  // 2. Usamos SIEMPRE el AdminClient para el Widget (evita problemas de RLS)
  const supabase = await createAdminClient();

  const userId = "fee70b20-6419-4293-af9d-4f884e574cf2";

  // 3. Consulta limpia
  const { data: logs, error } = await supabase
    .from('visitas_log')
    .select('monto_generado, created_at')
    .eq('user_id', userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 4. Lógica de filtrado manual para evitar líos de zona horaria
  const ahora = new Date();
  const mesActual = ahora.getMonth();
  const anoActual = ahora.getFullYear();

  const logsEsteMes = logs?.filter(log => {
    const d = new Date(log.created_at);
    return d.getMonth() === mesActual && d.getFullYear() === anoActual;
  }) || [];

  const total = logsEsteMes.reduce((acc, log) => acc + Number(log.monto_generado), 0);

  return NextResponse.json({
    total: Math.round(total),
    mes: ahora.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase(),
    vibe: total > 0 ? "Lo estás haciendo increíble, Mor 🫀" : "¡A estrenar el mes! ☕️",
    actualizado: ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    // DEBUG FINAL: Si esto sale 0, es que no hay filas para ese UUID
    debug_total_filas_usuario: logs?.length || 0 
  });
}