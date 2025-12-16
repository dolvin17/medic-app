"use client";

import { useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
// Importamos 'useRouter' para manejar la redirección
import { useRouter } from "next/navigation"; 

export default function AuthForm() {
  const router = useRouter(); // Inicializamos el router

  const [isLogin, setIsLogin] = useState(true); // Alternamos entre login y registro
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleAuth = async () => {
    setLoading(true);
    setMessage("");
    let authError = null; // Usaremos una variable para capturar el error

    if (isLogin) {
      // INICIO SESIÓN
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      authError = loginError;
    } else {
      // REGISTRO (Ahora que la confirmación está OFF, el usuario queda autenticado)
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: nombre, // Pasa el nombre para el Trigger SQL
          },
        },
      });
      authError = signUpError;
    }

    if (authError) {
      // ⚠️ CORRECCIÓN: Mostrar el mensaje de error real de Supabase
      setMessage(`Error: ${authError.message}`);
    } else {
      // ✅ ÉXITO: Redirigir al Dashboard
      setMessage(isLogin ? "Inicio de sesión exitoso." : "Registro exitoso. Redirigiendo...");
      router.push('/dashboard'); 
    }
    
    setLoading(false);
  };
  
  const handleGoogleLogin = async () => {
    setLoading(true);
    setMessage("Redirigiendo a Google...");
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`, // URL de redirección final
      },
    });

    if (error) {
      // ⚠️ CORRECCIÓN: Mostrar el mensaje de error de Google OAuth
      setMessage(`Error con Google: ${error.message}`); 
      setLoading(false); // Detener loading si hay error antes de redirigir
    }
    // Si no hay error, el navegador se encargará de la redirección.
  };

  return (
    <div>
      <div className="flex flex-col justify-center">
        <Image className="place-items-center" src="/vercel.svg" height="32" width="32" alt="" />
        <h2 className="text-center text-xl py-8 font-bold">
          {isLogin ? "Iniciar Sesion" : "Registrarse"}
        </h2>
        {message && <p className="text-center text-sm">{message}</p>} {/* Mensaje centralizado y pequeño */}
        <div className="flex flex-col gap-4">
          {!isLogin && (
            <input
              className="rounded-xl border-1 p-2 border-purple-800"
              type="text"
              placeholder="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          )}
          <input
            className="rounded-xl border-1 p-2 border-purple-800"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="rounded-xl border-1 p-2 border-purple-800"
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="py-4" onClick={handleAuth} disabled={loading}>
          {loading ? "Cargando..." : isLogin ? "Iniciar" : "Crear Cuenta"}
        </button>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          {loading ? "Cargando..." : "Iniciar con Google"}
        </button>

        <p
          onClick={() => setIsLogin(!isLogin)}
          className="cursor-pointer py-8 text-center"
        >
          {isLogin
            ? "¿No tienes cuenta? Regístrate aquí"
            : "¿Ya tienes cuenta? Inicia Sesión"}
        </p>
      </div>
    </div>
  );
}