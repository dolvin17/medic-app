// src/components/navigation/Navigation.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FaUserDoctor } from "react-icons/fa6";
import { ImMenu } from "react-icons/im";
import { supabase } from "@/lib/supabaseClient";

// Definiciones de tipos para el usuario y el menú
interface UserProfile {
  nombre: string;
  email: string;
}

interface NavItem {
  name: string;
  href: string;
}

// Enlaces del menú (para usuarios logueados)
const loggedInNavItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Historial de Visitas", href: "/historial" },
  { name: "Gestión de Gastos", href: "/gastos" },
];

export default function Navigation() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Función para obtener el perfil y nombre del usuario
  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Consultar la tabla 'usuarios' para obtener el nombre
        const { data, error } = await supabase
          .from("usuarios")
          .select("nombre, email") // Pedimos el nombre y email
          .eq("id", user.id)
          .single();

        if (data) {
          setUserProfile(data as UserProfile);
        } else if (error) {
          console.error("Error al cargar el perfil en navbar:", error.message);
          // Si el perfil falla, al menos sabemos que el usuario existe
          setUserProfile({ nombre: "Usuario", email: user.email! });
        }
      }
      setIsLoading(false);
    }
    loadProfile();
  }, []);

  // Función de cierre de sesión
  const handleLogout = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signOut();
    setIsMenuOpen(false);
    setUserProfile(null);
    setIsLoading(false);

    // Opcional: Redirigir a la página de inicio o login
    // window.location.href = '/login';
  };

  const displayName = userProfile?.nombre || "Visitante";
  const isLogged = !!userProfile;

  return (
<div className="relative z-50">
  {/* BARRA SUPERIOR (HEADER) */}
  <div className="flex py-3 items-center justify-between gap-2 border-b border-white/[0.08] bg-[#0a0a0a]/80 backdrop-blur-md px-6">
    {/* Nombre del Usuario / Icono */}
    <div className="flex gap-3 items-center">
      <div className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center">
        <FaUserDoctor className="text-sm text-gray-400" />
      </div>
      <p className="text-sm font-medium tracking-tight text-white">
        {isLoading ? (
          <span className="text-gray-500 animate-pulse">Cargando...</span>
        ) : (
          `Dra. ${displayName}`
        )}
      </p>
    </div>

    {/* Botón de Menú de Hamburguesa */}
    <button 
      onClick={() => setIsMenuOpen(!isMenuOpen)}
      className="p-2 rounded-md hover:bg-white/[0.05] transition-colors outline-none"
    >
      <ImMenu className="text-xl text-gray-400 hover:text-white transition-colors" />
    </button>
  </div>

  {/* MENÚ DESPLEGABLE (HAMBURGER MENU) */}
  {isMenuOpen && (
    <div className="absolute right-4 mt-2 w-56 bg-[#0a0a0a] rounded-xl shadow-2xl z-[60] border border-white/[0.08] overflow-hidden backdrop-blur-xl">
      <div className="flex flex-col p-1">
        {/* BOTÓN DE INICIO */}
        <Link href="/" legacyBehavior>
          <a
            className="flex items-center px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-all"
            onClick={() => setIsMenuOpen(false)}
          >
            <span className="mr-2">🏠</span> Inicio
          </a>
        </Link>

        <div className="h-[1px] bg-white/[0.08] my-1" />

        {/* 1. Enlaces para Usuarios Logueados */}
        {isLogged ? (
          <>
            {loggedInNavItems.map((item) => (
              <Link key={item.name} href={item.href} legacyBehavior>
                <a
                  className="block px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-all"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </a>
              </Link>
            ))}

            {/* Botón de Cerrar Sesión */}
            <div className="mt-1 pt-1 border-t border-white/[0.08]">
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-sm text-red-500/80 hover:text-red-500 hover:bg-red-500/[0.05] rounded-lg transition-all"
                disabled={isLoading}
              >
                Cerrar Sesión
              </button>
            </div>
          </>
        ) : (
          /* 2. Enlace para Usuarios NO Logueados */
          <Link href="/login" legacyBehavior>
            <a
              className="block px-3 py-2 text-sm font-medium text-white hover:bg-white/[0.05] rounded-lg transition-all"
              onClick={() => setIsMenuOpen(false)}
            >
              Iniciar Sesión
            </a>
          </Link>
        )}
      </div>
    </div>
  )}
</div>
  );
}
