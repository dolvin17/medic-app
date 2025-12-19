"use client";

import { useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AuthForm() {
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleAuth = async () => {
    setLoading(true);
    setMessage("");
    let authError = null;

    if (isLogin) {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      authError = loginError;
    } else {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: nombre },
        },
      });
      authError = signUpError;
    }

    if (authError) {
      setMessage(`⚠️ ${authError.message}`);
    } else {
      router.push('/dashboard');
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) {
      setMessage(`❌ ${error.message}`);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      {/* CARD PRINCIPAL */}
      <div className="w-full max-w-sm p-8 rounded-2xl bg-[#0a0a0a] border border-white/[0.08] shadow-2xl space-y-8">
        
        {/* LOGO Y TÍTULO */}
        <header className="flex flex-col items-center space-y-4">
           <div className="p-3 rounded-2xl bg-white/[0.03] overflow-hidden border border-white/[0.08] shadow-inner">
						<Image 
						  src="/caduceo.svg" 
						  height="48" 
						  width="48" 
						  alt="Logo Medicina"
						  className="drop-shadow-[0_0_12px_rgba(168,85,247,0.4)] scale-175  animate-in fade-in duration-1000"
						/>
					  </div>
          <div className="text-center space-y-1">
            <h2 className="text-xl font-semibold tracking-tight text-white">
              {isLogin ? "" : "Crear una cuenta"}
            </h2>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">
              Medic App System
            </p>
          </div>
        </header>

        {/* FEEDBACK DE ERROR */}
        {message && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-400 text-center animate-in fade-in zoom-in-95">
            {message}
          </div>
        )}

        {/* FORMULARIO */}
        <div className="space-y-3">
          {!isLogin && (
            <input
              className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.1] rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-purple-500/40 transition-all"
              type="text"
              placeholder="Nombre completo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          )}
          <input
            className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.1] rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-purple-500/40 transition-all"
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.1] rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-purple-500/40 transition-all"
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          
          <button 
            onClick={handleAuth} 
            disabled={loading}
            className="w-full py-3 mt-4 bg-white text-black text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Procesando..." : isLogin ? "Entrar" : "Registrarse"}
          </button>
        </div>

        {/* DIVIDER */}
        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-white/[0.05]"></div>
          <span className="flex-shrink mx-4 text-[10px] text-gray-600 uppercase font-bold tracking-tighter">O continuar con</span>
          <div className="flex-grow border-t border-white/[0.05]"></div>
        </div>

        {/* GOOGLE LOGIN */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 bg-white/[0.03] border border-white/[0.1] rounded-xl text-xs font-medium text-white hover:bg-white/[0.06] transition-all"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google
        </button>

        {/* TOGGLE MODO */}
        <p className="text-center text-[11px] text-gray-500">
          {isLogin ? "¿No tienes cuenta?" : "¿Ya eres miembro?"}{" "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-purple-400 hover:text-purple-300 font-semibold transition-colors underline-offset-4 hover:underline"
          >
            {isLogin ? "Crea una ahora" : "Inicia sesión aquí"}
          </button>
        </p>
      </div>
    </div>
  );
}