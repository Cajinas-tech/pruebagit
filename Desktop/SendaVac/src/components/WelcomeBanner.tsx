import React from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const WelcomeBanner: React.FC = () => {
  const { usuarioActual } = useAuth();

  // Fecha actual en español formateada igual que en la captura (ej: "martes, 29 de septiembre de 2026")
  const fechaHoy = new Intl.DateTimeFormat('es-NI', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  const primerNombre = usuarioActual?.nombre ? usuarioActual.nombre.split(' ')[0] : 'Jairo';

  return (
    <div className="bg-[#eefbf4] dark:bg-emerald-950/20 border border-[#c3edd5] dark:border-emerald-800/60 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition-all">
      <div className="flex items-center gap-4">
        {/* Ícono de Check en squircle verde agua idéntico a la captura */}
        <div className="w-12 h-12 rounded-xl bg-[#d2f4e2] dark:bg-emerald-900/40 border border-[#a6e6c2] dark:border-emerald-700/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0 shadow-xs">
          <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
        </div>

        {/* Textos de bienvenida */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-white">
              ¡Bienvenido(a) {primerNombre}! Has ingresado al sistema SendaVac.
            </h2>
            <span className="inline-flex items-center gap-1 bg-[#d5f5e3] dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              EN LÍNEA
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed">
            Todos los servicios de control de personal, acumulación (Art. 76) y solicitudes de vacaciones están activos y listos.
          </p>
        </div>
      </div>

      {/* Fecha formato idéntico a la imagen en píldora blanca */}
      <div className="bg-white/90 dark:bg-slate-800/90 border border-emerald-200/80 dark:border-slate-700 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs flex items-center gap-2 whitespace-nowrap self-end lg:self-auto">
        <span className="text-emerald-600 dark:text-emerald-400">📅</span>
        <span>{fechaHoy}</span>
      </div>
    </div>
  );
};
