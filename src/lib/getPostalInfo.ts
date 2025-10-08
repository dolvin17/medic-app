import { supabase } from "./supabaseClient";

export async function getPostalInfo(cp: string) {
  const { data, error, } = await supabase
    .from('codigos_postales')
    .select('*')
    .eq('codigo_postal', cp)

	console.log(cp)

  if (error) {
	console.error('Error al consultar', error.message)
	return null
  }
  return data
}
