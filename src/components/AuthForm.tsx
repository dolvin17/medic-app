"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true); //Alternamos entre login y registro
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleAuth = async () => {
    setLoading(true);
    setMessage("");
    let error = null;

    if (isLogin) {
      //inicio sesion
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      error = loginError;
    } else {
      //registro
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: nombre,
          },
        },
      });
      error = signUpError;
    }
    if (error) {
      setMessage("print error.");
    } else {
      setMessage("Éxito, revisa tu correo o inicia sesion");
    }
    setLoading(false);
  };
  const handleGoogleLogin = async () => {
    setMessage("Redirigiendo a Google.. ");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) {
      setMessage(`Error con Google:`);
    }
  };
  return (
    <div>
      <h2>{isLogin ? "Iniciar Sesion" : "Registrarse"}</h2>
      {message && <p>{message}</p>}
      {!isLogin && (
        <input
          type="text"
          placeholder="Nombre Completo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />
      )}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <button onClick={handleAuth} disabled={loading}>
        {loading ? "Cargando..." : isLogin ? "Entrar" : "Crear Cuenta"}
      </button>

      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        style={{ backgroundColor: "#DB4437" }}
      >
        {loading ? "Cargando..." : "Entrar con Google"}
      </button>

      <p
        onClick={() => setIsLogin(!isLogin)}
        style={{ cursor: "pointer", marginTop: "15px" }}
      >
        {isLogin
          ? "¿No tienes cuenta? Regístrate aquí"
          : "¿Ya tienes cuenta? Inicia Sesión"}
      </p>
    </div>
  );
}
