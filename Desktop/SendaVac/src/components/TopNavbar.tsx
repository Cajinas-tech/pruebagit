import React from 'react';
import { 
  Bell, 
  Sun, 
  Moon, 
  CircleDot, 
  Menu,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

interface TopNavbarProps {
  tituloSeccion: string;
  onToggleSidebar?: () => void;
  onOpenAlertas?: () => void;
  onToggleTema?: () => void;
  esModoOscuro?: boolean;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  tituloSeccion,
  onToggleSidebar,
  onOpenAlertas,
  onToggleTema,
  esModoOscuro = false
}) => {
  const { usuarioActual } = useAuth();
  const { notificacionesPendientes, solicitudes } = useData();

  const esAdmin = usuarioActual?.rol === 'administrador';
  const pendientesColaborador = solicitudes.filter(
    s => s.empleadoId === usuarioActual?.id && s.estado === 'Pendiente'
  ).length;

  const totalAlertas = esAdmin ? notificacionesPendientes : pendientesColaborador;

  // Iniciales del usuario
  const iniciales = usuarioActual?.nombre
    ? usuarioActual.nombre
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'US';

  return (
    <header className="h-16 md:h-20 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-3 sm:px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 transition-colors">
      {/* Sección Izquierda: Botón Móvil y Título */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0 cursor-pointer"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        <div className="min-w-0">
          <h1 className="text-sm sm:text-base md:text-lg font-black text-slate-800 dark:text-white tracking-wide uppercase truncate max-w-[130px] sm:max-w-[260px] md:max-w-none">
            {tituloSeccion}
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-400 hidden lg:block truncate">
            {esAdmin
              ? 'Control de Personal y Vacaciones • Ley Laboral de Nicaragua (Art. 76)'
              : 'Portal de Colaborador • Consulta y Solicitud de Vacaciones (Art. 76)'}
          </p>
        </div>
      </div>

      {/* Sección Derecha: Botones de estado exactos */}
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
        {/* 1. Botón Alertas */}
        <button
          onClick={onOpenAlertas}
          className="relative flex items-center gap-1.5 sm:gap-2 bg-[#171c26] dark:bg-slate-800 hover:bg-slate-900 dark:hover:bg-slate-700 text-white text-xs font-bold px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full transition shadow-sm border border-transparent dark:border-slate-700 cursor-pointer active:scale-95"
          title={esAdmin ? 'Ver solicitudes pendientes de la tienda' : 'Mis solicitudes pendientes de aprobación'}
        >
          <Bell className="w-3.5 h-3.5 text-slate-300" />
          <span className="hidden sm:inline">Alertas</span>
          <span className={`text-white text-[10px] sm:text-[11px] font-black w-4.5 h-4.5 sm:w-5 sm:h-5 flex items-center justify-center rounded-full leading-none ${
            totalAlertas > 0 ? (esAdmin ? 'bg-[#ef4444]' : 'bg-amber-500') : 'bg-slate-600'
          }`}>
            {totalAlertas}
          </span>
        </button>

        {/* 2. Botón MODO CLARO / OSCURO */}
        <button
          onClick={onToggleTema}
          className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full border border-slate-200 dark:border-slate-700 transition shadow-xs cursor-pointer active:scale-95"
          title={esModoOscuro ? 'Modo Oscuro activo (Clic para cambiar a modo claro)' : 'Modo Claro activo (Clic para cambiar a modo oscuro)'}
        >
          {esModoOscuro ? (
            <>
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden md:inline font-bold">MODO OSCURO</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden md:inline font-bold">MODO CLARO</span>
            </>
          )}
        </button>

        {/* 3. Indicador de Estado */}
        <div className={`hidden sm:flex items-center gap-1.5 ${
          esAdmin 
            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/60' 
            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/60'
        } border px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-black tracking-wider`}>
          <CircleDot className={`w-3.5 h-3.5 ${esAdmin ? 'text-rose-500 animate-pulse' : 'text-emerald-500 animate-pulse'}`} />
          <span className="uppercase text-[10px] sm:text-[11px]">
            {esAdmin ? 'TIENDA ACTIVA' : 'COLABORADOR ACTIVO'}
          </span>
        </div>

        {/* 4. Bloque Usuario */}
        <div className="flex items-center gap-2 sm:gap-2.5 pl-1.5 sm:pl-2 border-l border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-extrabold flex items-center justify-center text-xs sm:text-sm shadow-xs border border-blue-200 dark:border-blue-700">
            {iniciales}
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-extrabold text-slate-800 dark:text-white leading-tight">
              {usuarioActual?.nombre.split(' ')[0] || 'Usuario'}
            </span>
            <span className="text-[10px] font-black text-[#1d63ff] dark:text-blue-400 tracking-wider uppercase leading-none">
              {usuarioActual?.cargo ? usuarioActual.cargo.split('/')[0].trim() : (usuarioActual?.rol?.toUpperCase() || 'COLABORADOR')}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
