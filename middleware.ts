// middleware.ts
import { NextResponse, type NextRequest } from 'next/server'

// Importa el cliente de Supabase para SSR/Middleware
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs' 

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  // 1. Crea el cliente con la Request y Response
  const supabase = createMiddlewareClient({ req, res })

  // 2. tengo la sesión del usuario
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const protectedRoutes = ['/dashboard']

  // 3. Lógica de protección
  if (protectedRoutes.includes(req.nextUrl.pathname) && !session) {
    // Si la ruta es protegida y no hay sesión, redirige a login
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return res
}
// 4. Define qué rutas deben pasar por este middleware
export const config = {
  matcher: ['/', '/dashboard', '/login'], // Incluye las rutas relevantes
}