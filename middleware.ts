// middleware.ts

// 💡 AHORA IMPORTAMOS createServerClient desde @supabase/ssr
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // La función createServerClient de @supabase/ssr usa un objeto "cookies"
  // para leer y escribir las cookies.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options) => {
          req.cookies.set({ name, value, ...options });
          res.cookies.set({ name, value, ...options });
        },
        remove: (name, options) => {
          req.cookies.set({ name, value: '', ...options });
          res.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // 1. Obtener la sesión actual
  // Nota: Esto disparará una actualización de cookies si es necesario
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // 2. Definir las rutas que SÓLO requieren autenticación
  if (req.nextUrl.pathname.startsWith('/dashboard')) {
    if (!session) {
      // Si no hay sesión, redirigir al login
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  // 3. Definir las rutas que NO requieren autenticación (Login/Registro)
  if (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/registro') {
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return res;
}

// 4. Especificar qué rutas debe "interceptar" este middleware
export const config = {
  matcher: ['/dashboard/:path*', '/login', '/registro'],
};