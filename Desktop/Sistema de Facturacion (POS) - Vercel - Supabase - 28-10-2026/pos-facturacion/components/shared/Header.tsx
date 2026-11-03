"use client";

import React, { useState, useEffect } from "react";
import {
  Wallet,
  Clock,
  DollarSign,
  Store,
  RefreshCw,
  Bell,
  AlertTriangle,
  Sun,
  Moon,
} from "lucide-react";
import { formatoCordobas } from "@/lib/currency";
import { ModuloId, SesionCaja, ConfiguracionNegocio } from "@/lib/types";
import { useTheme } from "@/lib/theme";

interface HeaderProps {
  titulo: string;
  subtitulo?: string;
  config: ConfiguracionNegocio;
  sesionCaja: SesionCaja | null;
  onIrAModulo: (modulo: ModuloId) => void;
  alertasStockCount: number;
}

export default function Header({
  titulo,
  subtitulo,
  config,
  sesionCaja,
  onIrAModulo,
  alertasStockCount,
}: HeaderProps) {
  const [horaActual, setHoraActual] = useState<string>("");
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const actualizar = () => {
      const ahora = new Date();
      setHoraActual(
        ahora.toLocaleTimeString("es-NI", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    actualizar();
    const interval = setInterval(actualizar, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3.5 flex items-center justify-between shadow-sm flex-shrink-0 transition-colors duration-200">
      {/* Title & Subtitle */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
          {titulo}
        </h2>
        {subtitulo && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {subtitulo}
          </p>
        )}
      </div>

      {/* Widgets & Live Status Bar */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Toggle Píldora: Modo Claro / Modo Oscuro */}
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === "dark" ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
          aria-label="Alternar modo claro y oscuro"
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all duration-200 shadow-sm cursor-pointer select-none bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/80 dark:border-slate-700 dark:text-slate-200"
        >
          {/* Indicador tipo píldora dual */}
          <div className="relative flex items-center bg-slate-200/90 dark:bg-slate-950 border border-slate-300/80 dark:border-slate-700 rounded-full p-0.5 transition-colors">
            <div
              className={`flex items-center justify-center w-5 h-5 rounded-full transition-all duration-300 ${
                theme === "light"
                  ? "bg-amber-400 text-amber-950 shadow-sm scale-105"
                  : "text-slate-400 dark:text-slate-500 scale-90"
              }`}
            >
              <Sun className="w-3 h-3" />
            </div>
            <div
              className={`flex items-center justify-center w-5 h-5 rounded-full transition-all duration-300 ${
                theme === "dark"
                  ? "bg-blue-600 text-white shadow-sm scale-105"
                  : "text-slate-400 scale-90"
              }`}
            >
              <Moon className="w-3 h-3" />
            </div>
          </div>
          <span className="text-[11px] font-semibold tracking-tight hidden sm:inline">
            {theme === "dark" ? "Oscuro" : "Claro"}
          </span>
        </button>

        {/* Tasa Oficial BCN (Nicaragua) */}
        <div className="hidden md:flex items-center gap-2 bg-blue-50 dark:bg-slate-800/90 border border-blue-200 dark:border-blue-900/60 text-blue-900 dark:text-blue-300 px-3 py-1.5 rounded-xl text-xs font-medium shadow-sm">
          <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-[11px]">
            $
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 leading-none">
              Tasa BCN (USD)
            </div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
              1 USD = C$ {Number(config.tasa_cambio_oficial).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Estado de Caja */}
        <button
          onClick={() => onIrAModulo("caja")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition shadow-sm ${
            sesionCaja?.estado === "abierta"
              ? "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
              : "bg-red-50 border-red-300 text-red-800 hover:bg-red-100 dark:bg-red-950/40 dark:border-red-800/60 dark:text-red-300 dark:hover:bg-red-900/50"
          }`}
          title="Ver módulo de Control de Caja"
        >
          <div
            className={`w-2 h-2 rounded-full ${
              sesionCaja?.estado === "abierta"
                ? "bg-emerald-500 animate-pulse"
                : "bg-red-500"
            }`}
          />
          <Wallet className="w-3.5 h-3.5" />
          <span>
            {sesionCaja?.estado === "abierta"
              ? `Caja Abierta (${formatoCordobas(sesionCaja.monto_apertura)})`
              : "Caja Cerrada (Abrir Turno)"}
          </span>
        </button>

        {/* Alerta de Stock Bajo */}
        {alertasStockCount > 0 && (
          <button
            onClick={() => onIrAModulo("inventario")}
            className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-300 dark:hover:bg-amber-900/50 px-3 py-1.5 rounded-xl text-xs font-medium transition shadow-sm"
            title="Ver productos con stock crítico"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>{alertasStockCount} bajo stock</span>
          </button>
        )}

        {/* Reloj en vivo */}
        <div className="hidden lg:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-xl text-xs font-mono font-medium">
          <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>{horaActual}</span>
        </div>
      </div>
    </header>
  );
}
