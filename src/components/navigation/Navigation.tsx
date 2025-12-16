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
    <div className="relative">
      {/* BARRA SUPERIOR (HEADER) */}
      <div className="flex py-4 items-center justify-between gap-2 border-b border-white px-4">
        {/* Nombre del Usuario / Icono */}
        <div className="flex gap-4 items-center">
          <FaUserDoctor className="text-2xl" />
          <p className="font-bold">
            {isLoading ? "Cargando..." : `Dr. ${displayName}`}
          </p>
        </div>

        {/* Botón de Menú de Hamburguesa */}
        <ImMenu
          className="text-2xl cursor-pointer"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        />
      </div>

      {/* MENÚ DESPLEGABLE (HAMBURGER MENU) */}
      {isMenuOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-gray-800 rounded-md shadow-lg z-10 border border-gray-700">
          <div className="py-1">

            {/* AÑADIDO: BOTÓN DE INICIO */}
            <Link href="/" legacyBehavior>
                <a
                    className="block px-4 py-2 text-sm text-white font-bold hover:bg-purple-700 border-b border-gray-700"
                    onClick={() => setIsMenuOpen(false)}
                >
                    🏠 Inicio
                </a>
            </Link>
            
            {/* 1. Enlaces para Usuarios Logueados */}
            {isLogged ? (
              <>
                {loggedInNavItems.map((item) => (
                  <Link key={item.name} href={item.href} legacyBehavior>
                    <a
                      className="block px-4 py-2 text-sm text-white hover:bg-purple-700"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.name}
                    </a>
                  </Link>
                ))}

                {/* Botón de Cerrar Sesión */}
                <div className="border-t border-gray-700 mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-purple-700"
                    disabled={isLoading}
                  >
                    Cerrar Sesión
                  </button>
                </div>
              </>
            ) : (
              // 2. Enlace para Usuarios NO Logueados
              <Link href="/login" legacyBehavior>
                <a
                  className="block px-4 py-2 text-sm text-white hover:bg-purple-700"
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