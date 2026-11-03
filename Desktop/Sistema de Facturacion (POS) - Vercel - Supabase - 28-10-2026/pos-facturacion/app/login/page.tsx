"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("jairotten84@gmail.com");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [verificandoSesion, setVerificandoSesion] = useState(true);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  useEffect(() => {
    async function comprobarSesion() {
      if (!isSupabaseConfigured || !supabase) {
        setVerificandoSesion(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace("/pos");
      } else {
        setVerificandoSesion(false);
      }
    }
    comprobarSesion();
  }, [router]);

  const manejarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);

    if (!email.trim() || !password.trim()) {
      setMensaje({ tipo: "error", texto: "Por favor ingresa tu correo y contraseña." });
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      router.push("/pos");
      return;
    }

    setCargando(true);
    try {
      // 1. Intentar iniciar sesión directamente
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (!error && data.session) {
        router.push("/pos");
        return;
      }

      // 2. Si el usuario aún no estaba dado de alta en Supabase Auth o faltaba auto-confirmar su correo,
      // lo activamos automáticamente en el servidor y volvemos a iniciar sesión sin errores.
      const syncRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const syncJson = await syncRes.json();

      if (!syncRes.ok) {
        setMensaje({
          tipo: "error",
          texto: syncJson.error || error?.message || "No se pudo iniciar sesión.",
        });
        return;
      }

      // 3. Reintentar login tras la activación automática
      const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (retryError) {
        setMensaje({
          tipo: "error",
          texto: "La contraseña ingresada no coincide con la registrada para este correo.",
        });
        return;
      }

      if (retryData.session) {
        router.push("/pos");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error de autenticación";
      setMensaje({ tipo: "error", texto: msg });
    } finally {
      setCargando(false);
    }
  };

  if (verificandoSesion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-slate-300">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 transition-colors">
        {/* Cabecera */}
        <div className="bg-blue-600 p-6 text-white text-center">
          <div className="text-4xl mb-2">🛒</div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Sistema POS & Facturación
          </h1>
          <p className="text-blue-100 text-xs mt-1">
            Acceso al Panel de Control y Punto de Venta
          </p>
        </div>

        {/* Formulario Único de Inicio de Sesión */}
        <form onSubmit={manejarSubmit} className="p-6 space-y-4">
          {mensaje && (
            <div
              className={`p-3 rounded-lg text-xs font-medium leading-relaxed ${
                mensaje.tipo === "ok"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                  : "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800/60"
              }`}
            >
              {mensaje.texto}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase text-gray-600 dark:text-slate-400 mb-1">
              Correo Electrónico (Cuenta Vercel / Supabase)
            </label>
            <input
              type="email"
              required
              placeholder="jairotten84@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-600 dark:text-slate-400 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              required
              placeholder="Ingresa tu contraseña..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-blue-500/20 text-sm cursor-pointer"
          >
            {cargando ? "Entrando al Sistema..." : "Iniciar Sesión en Dashboard POS"}
          </button>

          <p className="text-[11px] text-gray-400 dark:text-slate-500 text-center pt-1 leading-normal">
            Ingresa directamente con tu correo <strong>jairotten84@gmail.com</strong> y tu contraseña de la base de datos / Supabase.
          </p>
        </form>
      </div>
    </div>
  );
}
