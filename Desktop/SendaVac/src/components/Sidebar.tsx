import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  CalendarCheck,
  Calculator,
  UserPlus,
  BookOpen,
  FileSpreadsheet,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Palmtree,
  X,
  Receipt,
  Coffee,
  CalendarRange
} from 'lucide-react';
import { SendaLogo } from './SendaLogo';
import { ConfirmModal } from './ConfirmModal';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

export type TabId = 
  | 'dashboard' 
  | 'personal' 
  | 'solicitudes' 
  | 'planilla'
  | 'descanso'
  | 'dias_libres'
  | 'feriados'
  | 'calendario'
  | 'calculadora' 
  | 'nuevo_empleado' 
  | 'ley_nica' 
  | 'reportes' 
  | 'ajustes';

interface SidebarProps {
  tabActiva: TabId;
  onCambiarTab: (tab: TabId) => void;
  colapsada: boolean;
  onToggleColapsada: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  tabActiva,
  onCambiarTab,
  colapsada,
  onToggleColapsada,
  isOpenMobile,
  onCloseMobile
}) => {
  const { usuarioActual, cerrarSesion } = useAuth();
  const { notificacionesPendientes, solicitudes } = useData();

  const [mostrarModalCerrarSesion, setMostrarModalCerrarSesion] = useState<boolean>(false);

  const esAdmin = usuarioActual?.rol === 'administrador';
  const pendientesColaborador = solicitudes.filter(
    s => s.empleadoId === usuarioActual?.id && s.estado === 'Pendiente'
  ).length;
  // En móviles el drawer siempre se muestra completo para excelente usabilidad táctil
  const estaColapsada = colapsada && !isOpenMobile;

  // Referencias y estado para la barra azul de desplazamiento arriba/abajo idéntica a SENDA
  const scrollRef = useRef<HTMLDivElement>(null);
  const [thumbTop, setThumbTop] = useState<number>(0);
  const [thumbHeight, setThumbHeight] = useState<number>(30); // porcentaje
  const isDraggingRef = useRef<boolean>(false);
  const startYRef = useRef<number>(0);
  const startScrollTopRef = useRef<number>(0);

  const actualizarScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const maxScroll = scrollHeight - clientHeight;

    if (maxScroll <= 0) {
      setThumbHeight(35);
      setThumbTop(0);
      return;
    }

    const visibleRatio = clientHeight / scrollHeight;
    const computedThumbH = Math.max(15, Math.min(65, visibleRatio * 100));
    setThumbHeight(computedThumbH);

    const progress = Math.min(1, Math.max(0, scrollTop / maxScroll));
    const computedTop = progress * (100 - computedThumbH);
    setThumbTop(computedTop);
  }, []);

  useEffect(() => {
    actualizarScroll();
    window.addEventListener('resize', actualizarScroll);
    return () => window.removeEventListener('resize', actualizarScroll);
  }, [actualizarScroll, estaColapsada]);

  const handleScrollUp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ top: -140, behavior: 'smooth' });
      setTimeout(actualizarScroll, 100);
    }
  };

  const handleScrollDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ top: 140, behavior: 'smooth' });
      setTimeout(actualizarScroll, 100);
    }
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const trackH = rect.height;
    const clickPercentage = Math.max(0, Math.min(1, clickY / trackH));
    const maxScroll = scrollRef.current.scrollHeight - scrollRef.current.clientHeight;
    if (maxScroll > 0) {
      scrollRef.current.scrollTo({ top: clickPercentage * maxScroll, behavior: 'smooth' });
      setTimeout(actualizarScroll, 50);
    }
  };

  const handleThumbMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    if (scrollRef.current) {
      startScrollTopRef.current = scrollRef.current.scrollTop;
    }

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current || !scrollRef.current) return;
      const deltaY = moveEvent.clientY - startYRef.current;
      const { scrollHeight, clientHeight } = scrollRef.current;
      const maxScroll = scrollHeight - clientHeight;
      const trackHeight = clientHeight - 40;
      const scrollRatio = maxScroll / (trackHeight || 1);
      scrollRef.current.scrollTop = startScrollTopRef.current + deltaY * scrollRatio;
      actualizarScroll();
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const manejarSeleccion = (tab: TabId) => {
    onCambiarTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Overlay Móvil */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Contenedor del Sidebar */}
      <aside
        className={`fixed md:sticky top-0 h-screen bg-white dark:bg-[#070b14] border-r border-slate-200 dark:border-slate-800/80 z-50 flex flex-col justify-between transition-all duration-300 ease-in-out select-none ${
          isOpenMobile 
            ? 'w-72 max-w-[85vw] translate-x-0 shadow-2xl' 
            : colapsada 
              ? 'w-20 -translate-x-full md:translate-x-0' 
              : 'w-64 -translate-x-full md:translate-x-0'
        }`}
      >
        {/* Cabecera del Sidebar con Logo */}
        <div className={`border-b border-slate-100 dark:border-slate-800/80 shrink-0 flex items-center justify-between ${estaColapsada ? 'p-3 justify-center' : 'p-4'}`}>
          {!estaColapsada ? (
            <SendaLogo size="md" showBadge={true} layout="vertical" />
          ) : (
            <SendaLogo size="sm" showBadge={false} layout="vertical" />
          )}

          {/* Botón Cerrar en Móviles/Tablets */}
          {isOpenMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="md:hidden p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Menú de Navegación con Barra Azul que desplaza arriba y abajo */}
        <div
          className="relative flex-1 min-h-0 flex flex-col group/nav overflow-hidden"
          onWheel={(e) => {
            if (scrollRef.current) {
              scrollRef.current.scrollTop += e.deltaY;
              actualizarScroll();
            }
          }}
        >
          {/* Contenedor con Scroll */}
          <div
            ref={scrollRef}
            onScroll={actualizarScroll}
            className={`flex-1 overflow-y-auto py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
              estaColapsada ? 'px-2' : 'px-3 pr-3.5'
            }`}
          >
            {/* Contenido con altura suficiente para permitir desplazamiento en cualquier pantalla */}
            <div className="space-y-6 min-h-[calc(100%+160px)] pb-8">
              {esAdmin ? (
                <>
                  {/* GRUPO 1: OPERACIONES */}
                  <div>
                    {!estaColapsada && (
                      <p className="px-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                        Operaciones
                      </p>
                    )}

                    <div className="space-y-1">
                      {/* Panel Central */}
                      <button
                        onClick={() => manejarSeleccion('dashboard')}
                        title="Panel Central"
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                          tabActiva === 'dashboard'
                            ? 'bg-[#1d63ff] text-white shadow-md shadow-blue-500/20'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
                        {!estaColapsada && <span>Panel Central</span>}
                      </button>

                      {/* Registro del Personal */}
                      <button
                        onClick={() => manejarSeleccion('personal')}
                        title="Registro del Personal"
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                          tabActiva === 'personal'
                            ? 'bg-[#1d63ff] text-white shadow-md shadow-blue-500/20'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Users className="w-4 h-4 flex-shrink-0" />
                        {!estaColapsada && <span>Registro del Personal</span>}
                      </button>

                      {/* Solicitudes de Vacaciones */}
                      <button
                        onClick={() => manejarSeleccion('solicitudes')}
                        title="Solicitudes de Vacaciones"
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                          tabActiva === 'solicitudes'
                            ? 'bg-[#1d63ff] text-white shadow-md shadow-blue-500/20'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <CalendarDays className="w-4 h-4 flex-shrink-0" />
                          {!estaColapsada && <span>Solicitudes</span>}
                        </div>
                        {notificacionesPendientes > 0 && !estaColapsada && (
                          <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                            {notificacionesPendientes}
                          </span>
                        )}
                      </button>

                      {/* Planilla y Colillas de Pago (Cortes 15 y 30) */}
                      <button
                        onClick={() => manejarSeleccion('planilla')}
                        title="Planilla (Colilla de Pago)"
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                          tabActiva === 'planilla'
                            ? 'bg-[#1d63ff] text-white shadow-md shadow-blue-500/20'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Receipt className="w-4 h-4 flex-shrink-0 text-cyan-400" />
                        {!estaColapsada && <span>Colilla de Pago</span>}
                      </button>

                      {/* Calculadora Liquidación C$ (Ley Nica) */}
                      <button
                        onClick={() => manejarSeleccion('calculadora')}
                        title="Calculadora Liquidación"
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                          tabActiva === 'calculadora'
                            ? 'bg-[#1d63ff] text-white shadow-md shadow-blue-500/20'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Calculator className="w-4 h-4 flex-shrink-0 text-emerald-500" />
                        {!estaColapsada && <span>Liquidación (C$)</span>}
                      </button>

                      {/* Gestión del Personal (Descansos, Vacaciones Pagadas y Horas Extras) */}
                      <button
                        onClick={() => manejarSeleccion('descanso')}
                        title="Gestión del Personal"
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                          tabActiva === 'descanso'
                            ? 'bg-[#1d63ff] text-white shadow-md shadow-blue-500/20'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <CalendarCheck className="w-4 h-4 flex-shrink-0 text-amber-500" />
                        {!estaColapsada && <span>Gestión del Personal</span>}
                      </button>

                      {/* Días Libres Semanales (Art. 64 C.T.) */}
                      <button
                        onClick={() => manejarSeleccion('dias_libres')}
                        title="Día Libre Semanal"
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                          tabActiva === 'dias_libres'
                            ? 'bg-[#1d63ff] text-white shadow-md shadow-blue-500/20'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Coffee className="w-4 h-4 flex-shrink-0 text-amber-500" />
                        {!estaColapsada && <span>Día Libre Semanal</span>}
                      </button>

                      {/* Días Feriados y Compensación (Art. 66 y 67 C.T.) */}
                      <button
                        onClick={() => manejarSeleccion('feriados')}
                        title="Días Feriados (Art. 66-67)"
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                          tabActiva === 'feriados'
                            ? 'bg-[#1d63ff] text-white shadow-md shadow-blue-500/20'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Palmtree className="w-4 h-4 flex-shrink-0 text-amber-400" />
                        {!estaColapsada && <span>Días Feriados (Art. 66-67)</span>}
                      </button>

                      {/* Calendario Laboral (Días Libres, Vacaciones y Feriados por Empleado) */}
                      <button
                        onClick={() => manejarSeleccion('calendario')}
                        title="Calendario Laboral (Descansos, Vacaciones y Feriados)"
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                          tabActiva === 'calendario'
                            ? 'bg-[#1d63ff] text-white shadow-md shadow-blue-500/20'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <CalendarRange className="w-4 h-4 flex-shrink-0 text-indigo-400" />
                        {!estaColapsada && <span>Calendario Laboral</span>}
                      </button>
                    </div>
                  </div>

                  {/* GRUPO 2: RECURSOS Y REPORTES */}
                  <div>
                    {!estaColapsada && (
                      <p className="px-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                        Recursos y Reportes
                      </p>
                    )}

                    <div className="space-y-1">
                      {/* Reporte de Vacaciones */}
                      <button
                        onClick={() => manejarSeleccion('reportes')}
                        title="Reporte de Saldos"
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                          tabActiva === 'reportes'
                            ? 'bg-[#1d63ff] text-white shadow-md shadow-blue-500/20'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <FileSpreadsheet className="w-4 h-4 flex-shrink-0 text-sky-400" />
                        {!estaColapsada && <span>Reporte de Saldos</span>}
                      </button>
                    </div>
                  </div>

                  {/* GRUPO 3: ADMINISTRACIÓN */}
                  <div>
                    {!estaColapsada && (
                      <p className="px-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                        Administración
                      </p>
                    )}

                    <div className="space-y-1">
                      <button
                        onClick={() => manejarSeleccion('ajustes')}
                        title="Ajuste del Sistema"
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                          tabActiva === 'ajustes'
                            ? 'bg-[#1d63ff] text-white shadow-md shadow-blue-500/20'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Settings className="w-4 h-4 flex-shrink-0" />
                        {!estaColapsada && <span>Ajuste del Sistema</span>}
                      </button>

                      {/* Salir del Sistema */}
                      <button
                        type="button"
                        onClick={() => setMostrarModalCerrarSesion(true)}
                        title="Salir del Sistema"
                        className={`w-full flex items-center ${estaColapsada ? 'justify-center p-2.5' : 'gap-3 px-3.5 py-2.5'} rounded-xl font-bold transition-all text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer mt-2 border-t border-slate-100 dark:border-slate-800/80 pt-3`}
                      >
                        <LogOut className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
                        {!estaColapsada && <span>Salir del Sistema</span>}
                      </button>

                      {/* Contraer / Expandir Barra */}
                      <button
                        type="button"
                        onClick={onToggleColapsada}
                        className={`hidden md:flex w-full items-center ${estaColapsada ? 'justify-center p-2.5' : 'gap-3 px-3.5 py-2.5'} rounded-xl text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer mt-1`}
                        title={colapsada ? 'Expandir barra' : 'Contraer barra'}
                      >
                        {colapsada ? (
                          <ChevronRight className="w-4 h-4 shrink-0 text-slate-400" />
                        ) : (
                          <>
                            <ChevronLeft className="w-4 h-4 shrink-0 text-slate-400" />
                            <span>CONTRAER BARRA</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* VISTA COLABORADORES: VENDEDORES, CAJEROS */}
                  <div>
                    {!estaColapsada && (
                      <p className="px-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                        Mi Portal de Vacaciones
                      </p>
                    )}

                    <div className="space-y-1">
                      {/* Mis Vacaciones */}
                      <button
                        onClick={() => manejarSeleccion('dashboard')}
                        title="Mis Vacaciones y Saldo"
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                          tabActiva === 'dashboard' || tabActiva === 'personal'
                            ? 'bg-[#1d63ff] text-white shadow-md shadow-blue-500/20'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Palmtree className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                        {!estaColapsada && <span>Mis Vacaciones</span>}
                      </button>

                      {/* Solicitar Vacaciones */}
                      <button
                        onClick={() => manejarSeleccion('solicitudes')}
                        title="Solicitar Vacaciones"
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                          tabActiva === 'solicitudes'
                            ? 'bg-[#1d63ff] text-white shadow-md shadow-blue-500/20'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <CalendarDays className="w-4 h-4 flex-shrink-0 text-blue-400" />
                          {!estaColapsada && <span>Solicitar Vacaciones</span>}
                        </div>
                        {pendientesColaborador > 0 && !estaColapsada && (
                          <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                            {pendientesColaborador} pend.
                          </span>
                        )}
                      </button>

                      {/* Consulta Art. 76 Ley Laboral */}
                      <button
                        onClick={() => manejarSeleccion('ley_nica')}
                        title="Art. 76 Ley Laboral"
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                          tabActiva === 'ley_nica'
                            ? 'bg-[#1d63ff] text-white shadow-md shadow-blue-500/20'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <BookOpen className="w-4 h-4 flex-shrink-0 text-amber-500" />
                        {!estaColapsada && <span>Art. 76 Ley Laboral</span>}
                      </button>

                      {/* Mi Colilla de Pago (Cortes 15 y 30) */}
                      <button
                        onClick={() => manejarSeleccion('planilla')}
                        title="Mi Colilla de Pago"
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                          tabActiva === 'planilla'
                            ? 'bg-[#1d63ff] text-white shadow-md shadow-blue-500/20'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Receipt className="w-4 h-4 flex-shrink-0 text-cyan-400" />
                        {!estaColapsada && <span>Mi Colilla de Pago</span>}
                      </button>

                      {/* Mis Días Feriados */}
                      <button
                        onClick={() => manejarSeleccion('feriados')}
                        title="Días Feriados"
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                          tabActiva === 'feriados'
                            ? 'bg-[#1d63ff] text-white shadow-md shadow-blue-500/20'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Palmtree className="w-4 h-4 flex-shrink-0 text-amber-400" />
                        {!estaColapsada && <span>Días Feriados</span>}
                      </button>

                      {/* Mi Calendario Laboral */}
                      <button
                        onClick={() => manejarSeleccion('calendario')}
                        title="Mi Calendario Laboral"
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                          tabActiva === 'calendario'
                            ? 'bg-[#1d63ff] text-white shadow-md shadow-blue-500/20'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <CalendarRange className="w-4 h-4 flex-shrink-0 text-indigo-400" />
                        {!estaColapsada && <span>Mi Calendario Laboral</span>}
                      </button>
                    </div>
                  </div>

                  {/* SESIÓN Y CONTRAER BARRA */}
                  <div className="pt-2">
                    <div className="space-y-1">
                      {/* Salir del Sistema */}
                      <button
                        type="button"
                        onClick={() => setMostrarModalCerrarSesion(true)}
                        title="Salir del Sistema"
                        className={`w-full flex items-center ${estaColapsada ? 'justify-center p-2.5' : 'gap-3 px-3.5 py-2.5'} rounded-xl font-bold transition-all text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer border-t border-slate-100 dark:border-slate-800/80 pt-3`}
                      >
                        <LogOut className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
                        {!estaColapsada && <span>Salir del Sistema</span>}
                      </button>

                      {/* Contraer / Expandir Barra */}
                      <button
                        type="button"
                        onClick={onToggleColapsada}
                        className={`hidden md:flex w-full items-center ${estaColapsada ? 'justify-center p-2.5' : 'gap-3 px-3.5 py-2.5'} rounded-xl text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer mt-1`}
                        title={colapsada ? 'Expandir barra' : 'Contraer barra'}
                      >
                        {colapsada ? (
                          <ChevronRight className="w-4 h-4 shrink-0 text-slate-400" />
                        ) : (
                          <>
                            <ChevronLeft className="w-4 h-4 shrink-0 text-slate-400" />
                            <span>CONTRAER BARRA</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Barra Azul Visual Fija en el borde derecho que se desplaza arriba y abajo idéntica a SENDA */}
          {!estaColapsada && (
            <div 
              onWheel={(e) => {
                if (scrollRef.current) {
                  scrollRef.current.scrollTop += e.deltaY;
                  actualizarScroll();
                }
              }}
              className="absolute right-0.5 top-1 bottom-1 w-2 flex flex-col items-center select-none pointer-events-auto z-20"
            >
              {/* Flecha Arriba */}
              <button
                type="button"
                onClick={handleScrollUp}
                className="w-2.5 h-2.5 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:text-blue-800 cursor-pointer text-[8px] leading-none mb-0.5 select-none"
                title="Subir menú"
              >
                ▲
              </button>

              {/* Riel de Fondo */}
              <div
                onClick={handleTrackClick}
                className="relative flex-1 w-1.5 bg-blue-100/60 dark:bg-slate-800/80 rounded-full cursor-pointer overflow-hidden my-0.5"
              >
                {/* Barra / Thumb Azul que se mueve en tiempo real de arriba a abajo */}
                <div
                  onMouseDown={handleThumbMouseDown}
                  className="absolute left-0 right-0 bg-blue-600 dark:bg-blue-500 rounded-full shadow-sm hover:bg-blue-700 active:bg-blue-800 transition-[top] duration-75 cursor-grab active:cursor-grabbing"
                  style={{
                    top: `${thumbTop}%`,
                    height: `${thumbHeight}%`,
                    minHeight: '24px'
                  }}
                />
              </div>

              {/* Flecha Abajo */}
              <button
                type="button"
                onClick={handleScrollDown}
                className="w-2.5 h-2.5 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:text-blue-800 cursor-pointer text-[8px] leading-none mt-0.5 select-none"
                title="Bajar menú"
              >
                ▼
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Modal de Confirmación de Cerrar Sesión idéntico a SendaFact */}
      <ConfirmModal
        isOpen={mostrarModalCerrarSesion}
        onClose={() => setMostrarModalCerrarSesion(false)}
        onConfirm={cerrarSesion}
        title="¿Cerrar Sesión?"
        message="¿Está seguro de que desea salir del sistema? Tendrá que volver a ingresar sus credenciales para acceder."
        confirmText="Sí, Salir"
        cancelText="Cancelar"
        type="logout"
        iconShape="circle"
      />
    </>
  );
};
