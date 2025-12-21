"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaUserDoctor, FaArrowRightFromBracket } from "react-icons/fa6";
import { HiOutlineSquares2X2, HiOutlineClock, HiOutlineBanknotes, HiChevronDown, HiOutlineHome } from "react-icons/hi2";
import { supabase } from "@/lib/supabaseClient";

interface UserProfile {
  nombre: string;
  email: string;
}

// --- 💡 CONFIGURACIÓN DE RUTAS ACTUALIZADA ---
const navItems = [
  { name: "Inicio", href: "/", icon: <HiOutlineHome /> },
  { name: "Dashboard", href: "/dashboard", icon: <HiOutlineSquares2X2 /> },
  { name: "Gastos", href: "/gastos", icon: <HiOutlineBanknotes /> },
];

export default function Navigation() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("usuarios")
          .select("nombre, email")
          .eq("id", user.id)
          .single();
        if (data) setUserProfile(data as UserProfile);
      }
      setIsLoading(false);
    }
    loadProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <nav className="sticky top-0 z-[100] w-full border-b border-white/[0.05] bg-[#0a0a0a]/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        
        {/* Lado Izquierdo: Branding */}
        <Link href="/" className="group flex items-center gap-3 transition-opacity hover:opacity-80">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-800/20 border border-purple-500/30 shadow-lg shadow-purple-500/10">
            <FaUserDoctor className="text-purple-400 text-lg" />
          </div>
          <div className="hidden flex-col sm:flex">
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500">Medical Visit</span>
            <span className="text-sm font-semibold text-white">
              {isLoading ? "..." : `Dra. ${userProfile?.nombre?.split(' ')[0] || 'User'}`}
            </span>
          </div>
        </Link>

        {/* Centro: Links (Escritorio) - 💡 Ahora incluye Inicio */}
        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                  isActive 
                  ? "bg-white/[0.08] text-white shadow-inner border border-white/10" 
                  : "text-gray-400 hover:text-white hover:bg-white/[0.03]"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Lado Derecho: Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="group flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] p-1.5 pr-3 transition-all hover:bg-white/[0.05] hover:border-white/20 active:scale-95"
          >
            <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-gray-700 to-gray-500 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white uppercase font-mono">
              {userProfile?.nombre?.charAt(0) || "U"}
            </div>
            <HiChevronDown className={`text-gray-500 transition-transform duration-300 ${isMenuOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Menú Desplegable */}
          {isMenuOpen && (
            <div className="absolute right-0 mt-3 w-64 origin-top-right rounded-2xl border border-white/[0.08] bg-[#0d0d0d] p-2 shadow-2xl ring-1 ring-black ring-opacity-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="px-3 py-3 mb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Conectada como</p>
                <p className="text-xs font-medium text-white truncate">{userProfile?.email}</p>
              </div>
              
              <div className="h-[1px] bg-white/[0.05] mx-2 mb-2" />

              <div className="space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-400 transition-colors hover:bg-white/[0.05] hover:text-white"
                  >
                    <span className="text-xl opacity-70">{item.icon}</span>
                    {item.name}
                  </Link>
                ))}

                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-400 transition-colors hover:bg-red-500/[0.08] hover:text-red-300 font-medium"
                >
                  <FaArrowRightFromBracket className="text-lg opacity-70" />
                  Cerrar Sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}