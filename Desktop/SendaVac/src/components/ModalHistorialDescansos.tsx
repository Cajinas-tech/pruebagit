import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileDown,
  Printer,
  Receipt,
  Filter,
  Search,
  ShieldCheck,
  Palmtree,
  Coffee,
  CalendarDays,
  History,
  Info,
  DollarSign,
  TrendingDown,
  Briefcase
} from 'lucide-react';
import { 
  Empleado, 
  SolicitudVacaciones, 
  RegistroHistorialDescanso, 
  TipoDescansoHistorial, 
  EstadoDescansoHistorial,
  FiltrosHistorialDescanso,
  EmpresaInfo 
} from '../types';
import { 
  obtenerHistorialDescansosEmpleado, 
  calcularResumenHistorialDescansos, 
  filtrarHistorialDescansos, 
  exportarHistorialDescansosPDF, 
  formatearCordobas 
} from '../utils/calculosNica';
import { useData } from '../context/DataContext';

interface ModalHistorialDescansosProps {
  isOpen: boolean;
  onClose: () => void;
  empleado: Empleado | null;
  solicitudes?: SolicitudVacaciones[];
}

export const ModalHistorialDescansos: React.FC<ModalHistorialDescansosProps> = ({
  isOpen,
  onClose,
  empleado,
  solicitudes
}) => {
  const { solicitudes: solicitudesContext } = useData();

  const empresaInfo: EmpresaInfo = useMemo(() => {
    try {
      const saved = localStorage.getItem('sendavac_empresa');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {
      nombreComercial: 'SENDA SISTEMAS',
      ruc: 'J0310000012345',
      telefono: '+505 8505 9284',
      email: 'jairotten84@gmail.com',
      direccion: 'Managua, Nicaragua'
    };
  }, []);

  // Estados de Filtros
  const [tipoFiltro, setTipoFiltro] = useState<TipoDescansoHistorial | 'TODOS'>('TODOS');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoDescansoHistorial | 'TODOS'>('TODOS');
  const [anioFiltro, setAnioFiltro] = useState<number | 0>(0);
  const [busqueda, setBusqueda] = useState<string>('');
  const [vistaModo, setVistaModo] = useState<'timeline' | 'tabla'>('timeline');

  // Estado para impresión directa en POS-80 / Carta
  const [tipoImpresionActiva, setTipoImpresionActiva] = useState<'carta' | 'pos80' | null>(null);

  const ejecutarImpresion = (formato: 'carta' | 'pos80') => {
    setTipoImpresionActiva(formato);
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setTipoImpresionActiva(null);
      }, 1000);
    }, 150);
  };

  // 1. Obtener historial consolidado de todas las fuentes (definido incondicionalmente para respetar las reglas de Hooks de React)
  const historialCompleto = useMemo(() => {
    if (!empleado?.id) return [];
    return obtenerHistorialDescansosEmpleado(empleado.id, {
      solicitudes: solicitudes || solicitudesContext || []
    });
  }, [empleado?.id, solicitudes, solicitudesContext]);

  // 2. Resumen analítico
  const resumen = useMemo(() => {
    return calcularResumenHistorialDescansos(historialCompleto, empleado?.id || '');
  }, [historialCompleto, empleado?.id]);

  // 3. Años disponibles para filtro
  const aniosDisponibles = useMemo(() => {
    const setAnios = new Set<number>();
    const anioActual = new Date().getFullYear();
    setAnios.add(anioActual);
    setAnios.add(anioActual - 1);
    historialCompleto.forEach((item) => {
      if (item.fechaInicio) {
        const a = parseInt(item.fechaInicio.split('-')[0], 10);
        if (!isNaN(a)) setAnios.add(a);
      }
    });
    return Array.from(setAnios).sort((a, b) => b - a);
  }, [historialCompleto]);

  // 4. Filtrado dinámico
  const historialFiltrado = useMemo(() => {
    const filtros: FiltrosHistorialDescanso = {
      tipo: tipoFiltro,
      estado: estadoFiltro,
      anio: anioFiltro > 0 ? anioFiltro : undefined,
      busqueda: busqueda.trim()
    };
    return filtrarHistorialDescansos(historialCompleto, filtros);
  }, [historialCompleto, tipoFiltro, estadoFiltro, anioFiltro, busqueda]);

  // Manejar exportación a PDF
  const handleExportarPDF = () => {
    if (!empleado) return;
    exportarHistorialDescansosPDF(empleado, historialFiltrado, resumen, empresaInfo);
  };

  // Si no está abierto o no hay empleado seleccionado, retornar null después de haber llamado a todos los Hooks
  if (!isOpen || !empleado) return null;

  // Color e ícono por tipo de descanso
  const getBadgePorTipo = (tipo: TipoDescansoHistorial) => {
    switch (tipo) {
      case 'Vacaciones Gozadas':
        return {
          bg: 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
          icon: <Palmtree className="w-3.5 h-3.5" />,
          label: 'Vacaciones Gozadas'
        };
      case 'Descanso Semanal':
        return {
          bg: 'bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
          icon: <Coffee className="w-3.5 h-3.5" />,
          label: 'Descanso Semanal (Art. 64)'
        };
      case 'A Cuenta de Vacaciones':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          icon: <TrendingDown className="w-3.5 h-3.5" />,
          label: 'A Cuenta de Vacaciones'
        };
      case 'Día Compensatorio':
      case 'Feriado Compensatorio':
        return {
          bg: 'bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
          icon: <CalendarDays className="w-3.5 h-3.5" />,
          label: tipo === 'Feriado Compensatorio' ? 'Feriado Compensatorio (Art. 67)' : 'Día Compensatorio'
        };
      case 'Vacaciones Pagadas':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          icon: <DollarSign className="w-3.5 h-3.5" />,
          label: 'Vacaciones Pagadas (Efectivo)'
        };
      default:
        return {
          bg: 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
          icon: <Clock className="w-3.5 h-3.5" />,
          label: tipo
        };
    }
  };

  const getBadgeEstado = (estado: EstadoDescansoHistorial) => {
    switch (estado) {
      case 'Disfrutado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> Disfrutado
          </span>
        );
      case 'Programado':
      case 'Aprobado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            <Clock className="w-3 h-3" /> {estado}
          </span>
        );
      case 'Pendiente':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
            <AlertCircle className="w-3 h-3" /> En Trámite
          </span>
        );
      case 'Cancelado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <XCircle className="w-3 h-3" /> Cancelado
          </span>
        );
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[130] flex items-center justify-center p-2 sm:p-4 bg-slate-900/30 backdrop-blur-[2px] animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-5xl bg-white dark:bg-[#0f172a] rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 text-left max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header Superior Responsivo */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0f172a] flex-shrink-0 gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-xs flex-shrink-0">
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base md:text-lg font-black text-slate-900 dark:text-white truncate">
                  Historial de Días Libres y Vacaciones Tomadas
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 flex-shrink-0">
                  Ley N° 185
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate hidden xs:block">
                Expediente cronológico de descansos, séptimos días, feriados y días tomados
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex-shrink-0"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ficha Resumen del Colaborador */}
        <div className="px-6 py-3.5 bg-gradient-to-r from-slate-50 to-blue-50/40 dark:from-slate-900/80 dark:to-blue-950/30 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-blue-500/20">
                {empleado.nombre.charAt(0)}
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  {empleado.nombre}
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 font-normal">
                    ({empleado.cargo} • {empleado.departamento || 'General'})
                  </span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ingreso: <strong className="text-slate-700 dark:text-slate-200">{empleado.fechaIngreso}</strong> • Salario: {formatearCordobas(empleado.salarioMensual || 0)} (Diario: {formatearCordobas((empleado.salarioMensual || 0) / 30)})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              <div className="text-right">
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">
                  Saldo Vacaciones Disponible
                </span>
                <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                  {empleado.saldoDisponible} días
                </span>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
              <div className="text-right">
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">
                  Total Días Tomados
                </span>
                <span className="text-lg font-black text-orange-600 dark:text-orange-400">
                  {resumen.totalDiasGeneral} días
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tarjetas de Métricas Rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 sm:px-6 bg-white dark:bg-[#0f172a] border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          {/* Vacaciones Gozadas */}
          <div className="bg-slate-50/80 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Palmtree className="w-3.5 h-3.5 text-blue-500" />
              <span>Vacaciones Gozadas</span>
            </span>
            <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {resumen.totalDiasVacacionesGozadas} <span className="text-xs font-normal text-slate-400">días</span>
            </p>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block">
              Art. 76 C.T. (15d/6 meses)
            </span>
          </div>

          {/* Días a Cuenta */}
          <div className="bg-slate-50/80 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-amber-500" />
              <span>A Cuenta Saldo</span>
            </span>
            <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {resumen.totalDiasACuentaVacaciones} <span className="text-xs font-normal text-slate-400">días</span>
            </p>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block">
              Deducidos del acumulado
            </span>
          </div>

          {/* Descansos Semanales */}
          <div className="bg-slate-50/80 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Coffee className="w-3.5 h-3.5 text-purple-500" />
              <span>Descansos Semanales</span>
            </span>
            <p className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
              {resumen.totalDescansosSemanales} <span className="text-xs font-normal text-slate-400">días</span>
            </p>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block">
              Art. 64 C.T. (Séptimo día)
            </span>
          </div>

          {/* Compensatorios / Feriados */}
          <div className="bg-slate-50/80 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5 text-teal-500" />
              <span>Compensatorios</span>
            </span>
            <p className="text-xl font-black text-teal-600 dark:text-teal-400 mt-1">
              {resumen.totalDiasCompensatorios} <span className="text-xs font-normal text-slate-400">días</span>
            </p>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block">
              Art. 67 C.T. (Feriados)
            </span>
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="px-6 py-3 bg-white dark:bg-[#0f172a] border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Buscador */}
            <div className="relative min-w-[180px] max-w-xs flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por motivo, fecha..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Filtro Tipo */}
            <select
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-none"
            >
              <option value="TODOS">Todos los tipos de descanso</option>
              <option value="Vacaciones Gozadas">Vacaciones Gozadas</option>
              <option value="Descanso Semanal">Descanso Semanal (Art. 64)</option>
              <option value="A Cuenta de Vacaciones">A Cuenta de Vacaciones</option>
              <option value="Día Compensatorio">Día Compensatorio</option>
              <option value="Feriado Compensatorio">Feriado Compensatorio (Art. 67)</option>
              <option value="Vacaciones Pagadas">Vacaciones Pagadas</option>
              <option value="Permiso Especial">Permiso Especial</option>
            </select>

            {/* Filtro Año */}
            <select
              value={anioFiltro}
              onChange={(e) => setAnioFiltro(parseInt(e.target.value, 10))}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-none"
            >
              <option value="0">Todos los años</option>
              {aniosDisponibles.map((a) => (
                <option key={a} value={a}>Año {a}</option>
              ))}
            </select>

            {/* Filtro Estado */}
            <select
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-none"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="Disfrutado">Disfrutado</option>
              <option value="Programado">Programado</option>
              <option value="Aprobado">Aprobado</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>

          {/* Toggle Vista Timeline / Tabla */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setVistaModo('timeline')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                vistaModo === 'timeline'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Línea de Tiempo
            </button>
            <button
              type="button"
              onClick={() => setVistaModo('tabla')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                vistaModo === 'tabla'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Tabla Detallada
            </button>
          </div>
        </div>

        {/* Contenido Central con Scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-950/30">
          {historialFiltrado.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-slate-400 flex items-center justify-center mb-3">
                <History className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No se encontraron descansos o vacaciones registradas
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                No hay coincidencias con los filtros aplicados o aún no se han registrado descansos para este colaborador.
              </p>
              {(tipoFiltro !== 'TODOS' || estadoFiltro !== 'TODOS' || anioFiltro > 0 || busqueda) && (
                <button
                  type="button"
                  onClick={() => {
                    setTipoFiltro('TODOS');
                    setEstadoFiltro('TODOS');
                    setAnioFiltro(0);
                    setBusqueda('');
                  }}
                  className="mt-3 text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : vistaModo === 'timeline' ? (
            /* Vista de Línea de Tiempo (Timeline) */
            <div className="space-y-4 relative before:absolute before:inset-0 before:left-5 sm:before:left-6 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {historialFiltrado.map((item, index) => {
                const badge = getBadgePorTipo(item.tipo);
                const fechaTexto = item.fechaInicio === item.fechaFin || !item.fechaFin 
                  ? item.fechaInicio 
                  : `${item.fechaInicio} al ${item.fechaFin}`;

                return (
                  <div key={item.id || index} className="relative flex items-start gap-3 sm:gap-4 pl-1 sm:pl-2">
                    {/* Punto del timeline */}
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-[#0f172a] border-2 border-blue-500 text-blue-600 flex items-center justify-center flex-shrink-0 z-10 shadow-xs mt-1">
                      {badge.icon}
                    </div>

                    {/* Tarjeta del Registro */}
                    <div className="flex-1 bg-white dark:bg-slate-900/80 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700/60 transition">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${badge.bg}`}>
                            {badge.icon}
                            <span>{badge.label}</span>
                          </span>

                          <span className="text-xs font-black text-slate-800 dark:text-white">
                            {fechaTexto}
                          </span>

                          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                            {item.dias} {item.dias === 1 ? 'día' : 'días'}
                          </span>
                        </div>

                        <div>
                          {getBadgeEstado(item.estado)}
                        </div>
                      </div>

                      {/* Motivo y Detalle Legal */}
                      <div className="mt-2.5 space-y-1">
                        {item.motivo && (
                          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                            <strong className="text-slate-900 dark:text-white">Motivo / Detalle:</strong> {item.motivo}
                          </p>
                        )}

                        {item.observacionLegal && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                            <span>{item.observacionLegal}</span>
                          </p>
                        )}

                        {item.montoMonetario !== undefined && item.montoMonetario > 0 && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 pt-1">
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Monto liquidado: {formatearCordobas(item.montoMonetario)}</span>
                          </p>
                        )}
                      </div>

                      {/* Footer de la tarjeta con auditoría */}
                      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center justify-between text-[10px] text-slate-400 gap-2">
                        <span>Origen: <strong className="text-slate-600 dark:text-slate-300">{item.origenModulo}</strong></span>
                        {item.autorizadoPor && (
                          <span>Autorizado por: <strong className="text-slate-600 dark:text-slate-300">{item.autorizadoPor}</strong></span>
                        )}
                        <span>
                          Deducción Saldo: {item.descuentaSaldoVacaciones ? (
                            <strong className="text-rose-600 dark:text-rose-400">Sí (-{item.dias}d)</strong>
                          ) : (
                            <strong className="text-emerald-600 dark:text-emerald-400">No (Remunerado)</strong>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Vista de Tabla Detallada */
            <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800 uppercase text-[10px] font-black tracking-wider">
                      <th className="py-3 px-4">Período / Fecha</th>
                      <th className="py-3 px-3 text-center">Días</th>
                      <th className="py-3 px-4">Tipo de Descanso</th>
                      <th className="py-3 px-3 text-center">Deducción Saldo</th>
                      <th className="py-3 px-3 text-center">Estado</th>
                      <th className="py-3 px-4">Motivo / Base Legal</th>
                      <th className="py-3 px-3">Autorizado Por</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {historialFiltrado.map((item, index) => {
                      const badge = getBadgePorTipo(item.tipo);
                      const fechaTexto = item.fechaInicio === item.fechaFin || !item.fechaFin 
                        ? item.fechaInicio 
                        : `${item.fechaInicio} al ${item.fechaFin}`;

                      return (
                        <tr key={item.id || index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {fechaTexto}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="font-black text-blue-600 dark:text-blue-400">
                              {item.dias}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                              {badge.icon}
                              <span>{badge.label}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {item.descuentaSaldoVacaciones ? (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                Descuenta (-{item.dias})
                              </span>
                            ) : (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                Remunerado (100%)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {getBadgeEstado(item.estado)}
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                              {item.motivo || 'Descanso legal'}
                            </p>
                            {item.observacionLegal && (
                              <p className="text-[10px] text-slate-400 truncate">
                                {item.observacionLegal}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                            {item.autorizadoPor || 'Administración'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer del Modal con Nota Legal y Botones de Impresión en una sola línea recta horizontal (Responsivo para PC, Tablets y Teléfonos) */}
        <div className="p-3 sm:px-6 bg-white dark:bg-[#0f172a] border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 sm:gap-3 flex-shrink-0">
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 min-w-0 truncate">
            <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span className="text-[11px] truncate">
              Descansos regidos por la <strong>Ley N° 185 (Código del Trabajo de Nicaragua)</strong>: Arts. 64, 67 y 76.
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap shrink-0 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => ejecutarImpresion('carta')}
              className="px-2.5 sm:px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] sm:text-xs font-bold shadow-md shadow-blue-600/20 transition flex items-center gap-1 sm:gap-1.5 cursor-pointer whitespace-nowrap flex-shrink-0"
              title="Imprimir Hoja Completa Tamaño Carta (A4)"
            >
              <Printer className="w-3.5 h-3.5 flex-shrink-0" />
              <span><span className="hidden sm:inline">Imprimir </span>Carta (A4)</span>
            </button>

            <button
              type="button"
              onClick={() => ejecutarImpresion('pos80')}
              className="px-2.5 sm:px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] sm:text-xs font-bold shadow-md shadow-emerald-600/20 transition flex items-center gap-1 sm:gap-1.5 cursor-pointer whitespace-nowrap flex-shrink-0"
              title="Imprimir Ticket Térmico POS-80 / POS-80C"
            >
              <Receipt className="w-3.5 h-3.5 flex-shrink-0" />
              <span><span className="hidden sm:inline">Imprimir </span>Ticket POS-80<span className="hidden md:inline"> / POS-80C</span></span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3 sm:px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] sm:text-xs font-bold transition cursor-pointer whitespace-nowrap flex-shrink-0"
            >
              Cerrar
            </button>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 1. PORTAL DE IMPRESIÓN DIRECTA: TICKET TÉRMICO POS-80 / POS-80C */}
      {/* ======================================================== */}
      {tipoImpresionActiva === 'pos80' && createPortal(
        <div id="historial-descansos-pos80-print" className="hidden print:block text-black bg-white">
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <div style={{ fontWeight: '900', fontSize: '15px', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              {empresaInfo.nombreComercial || 'SENDA SISTEMAS'}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '2px' }}>
              RUC: {empresaInfo.ruc || 'J0310000012345'}
            </div>
            {empresaInfo.telefono && (
              <div style={{ fontSize: '10px' }}>
                Tel: {empresaInfo.telefono}
              </div>
            )}
            <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />
            <div style={{ fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase' }}>
              HISTORIAL DE DESCANSOS Y VACACIONES
            </div>
            <div style={{ fontSize: '9px', fontStyle: 'italic', marginTop: '1px' }}>
              Ley N° 185 - Código del Trabajo Nicaragua
            </div>
            <div style={{ fontSize: '9px', marginTop: '2px' }}>
              Emisión: {new Date().toLocaleDateString('es-NI')} {new Date().toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />

          {/* Datos del Colaborador */}
          <div style={{ fontSize: '10px', lineHeight: '1.4' }}>
            <div><strong>COLABORADOR:</strong> {empleado.nombre}</div>
            <div><strong>CARGO:</strong> {empleado.cargo || 'N/D'}</div>
            <div><strong>DEPTO:</strong> {empleado.departamento || 'General'}</div>
            <div><strong>INGRESO:</strong> {empleado.fechaIngreso || 'N/D'}</div>
            <div><strong>SALARIO:</strong> {formatearCordobas(empleado.salarioMensual || 0)}</div>
            <div><strong>SALDO ACTUAL:</strong> {(empleado.saldoDisponible ?? 0).toFixed(2)} días</div>
          </div>

          <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />

          {/* Resumen Analítico */}
          <div style={{ fontSize: '10px', lineHeight: '1.3' }}>
            <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '3px' }}>RESUMEN DE REGISTROS:</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Total días registrados:</span>
              <strong>{resumen.totalDiasGeneral} días</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Vacaciones Gozadas:</span>
              <strong>{resumen.totalDiasVacacionesGozadas} d</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Séptimos Días (Art. 64):</span>
              <strong>{resumen.totalDescansosSemanales} d</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>A Cuenta Saldo:</span>
              <strong>{resumen.totalDiasACuentaVacaciones} d</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Compensatorios:</span>
              <strong>{resumen.totalDiasCompensatorios} d</strong>
            </div>
          </div>

          <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />

          {/* Detalle Cronológico de Eventos */}
          <div style={{ fontSize: '9.5px', lineHeight: '1.3' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              DETALLE DE EVENTOS ({historialFiltrado.length}):
            </div>
            {historialFiltrado.map((item, idx) => (
              <div key={item.id || idx} style={{ marginBottom: '6px', borderBottom: '1px dotted #ccc', paddingBottom: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                  <span>{item.fechaInicio}{item.fechaFin && item.fechaFin !== item.fechaInicio ? ` al ${item.fechaFin}` : ''}</span>
                  <span>{item.dias} {item.dias === 1 ? 'día' : 'días'}</span>
                </div>
                <div>
                  <strong>Tipo:</strong> {item.tipo}
                </div>
                <div>
                  <strong>Efecto:</strong> {item.descuentaSaldoVacaciones ? `Descuenta (-${item.dias})` : 'Remunerado 100%'}
                </div>
                {item.motivo && (
                  <div style={{ fontStyle: 'italic', color: '#333' }}>
                    Motivo: {item.motivo}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ borderBottom: '1px dashed #000', margin: '8px 0 16px 0' }} />

          {/* Firmas de Constancia */}
          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '10px' }}>
            <div style={{ borderTop: '1px solid #000', width: '80%', margin: '0 auto 4px auto' }} />
            <div><strong>{empleado.nombre}</strong></div>
            <div>Firma del Colaborador</div>

            <div style={{ borderTop: '1px solid #000', width: '80%', margin: '24px auto 4px auto' }} />
            <div><strong>RECURSOS HUMANOS / ADMIN</strong></div>
            <div>Firma y Sello Autorizado</div>
          </div>

          <div style={{ textAlign: 'center', fontSize: '8.5px', marginTop: '14px', color: '#555' }}>
            Comprobante oficial generado por SendaVac<br />
            *** FIN DEL TICKET ***
          </div>
        </div>,
        document.body
      )}

      {/* ======================================================== */}
      {/* 2. PORTAL DE IMPRESIÓN DIRECTA: HOJA TAMAÑO CARTA (A4)   */}
      {/* ======================================================== */}
      {tipoImpresionActiva === 'carta' && createPortal(
        <div id="historial-descansos-carta-print" className="hidden print:block text-black bg-white">
          {/* Cabecera Membretada Formal */}
          <div className="border-b-2 border-black pb-4 mb-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl font-black tracking-tight text-black uppercase">
                  {empresaInfo.nombreComercial || 'SENDA SISTEMAS'}
                </h1>
                <p className="text-xs text-slate-700 font-bold">
                  RUC: {empresaInfo.ruc || 'J0310000012345'} | Tel: {empresaInfo.telefono || '+505 8505 9284'}
                </p>
                <p className="text-xs text-slate-600">
                  {empresaInfo.direccion || 'Managua, Nicaragua'}
                </p>
              </div>
              <div className="text-right">
                <div className="inline-block border border-black px-3 py-1 font-bold text-xs uppercase bg-slate-50">
                  EXPEDIENTE OFICIAL DE DESCANSOS
                </div>
                <p className="text-[10px] text-slate-600 mt-1">
                  Fecha de emisión: {new Date().toLocaleDateString('es-NI')} {new Date().toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-[10px] font-semibold text-slate-700">
                  Ley N° 185 (Código del Trabajo de Nicaragua)
                </p>
              </div>
            </div>
          </div>

          {/* Ficha del Colaborador y Estado de Saldos */}
          <div className="border border-slate-300 rounded-lg p-3 mb-4 bg-slate-50/50">
            <h2 className="text-xs font-black uppercase text-slate-800 border-b border-slate-300 pb-1 mb-2">
              Datos Generales del Colaborador
            </h2>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-slate-500 font-semibold block text-[10px]">COLABORADOR:</span>
                <span className="font-bold text-slate-900">{empleado.nombre}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[10px]">CARGO:</span>
                <span className="font-medium text-slate-800">{empleado.cargo || 'N/D'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[10px]">DEPARTAMENTO:</span>
                <span className="font-medium text-slate-800">{empleado.departamento || 'General'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[10px]">FECHA INGRESO:</span>
                <span className="font-medium text-slate-800">{empleado.fechaIngreso || 'N/D'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[10px]">SALARIO MENSUAL:</span>
                <span className="font-bold text-slate-900">{formatearCordobas(empleado.salarioMensual || 0)}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[10px]">SALDO ACTUAL VACACIONES:</span>
                <span className="font-black text-blue-700">{(empleado.saldoDisponible ?? 0).toFixed(2)} días</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[10px]">TOTAL DÍAS HISTÓRICOS:</span>
                <span className="font-bold text-slate-900">{resumen.totalDiasGeneral} días</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[10px]">DESCUENTAN VACACIONES:</span>
                <span className="font-bold text-rose-700">-{resumen.totalDiasACuentaVacaciones} días</span>
              </div>
            </div>
          </div>

          {/* Resumen por Tipo de Descanso */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="border border-slate-300 p-2 text-center rounded">
              <div className="text-[10px] font-bold text-slate-600 uppercase">Vacaciones Gozadas</div>
              <div className="text-base font-black text-slate-900">{resumen.totalDiasVacacionesGozadas} días</div>
            </div>
            <div className="border border-slate-300 p-2 text-center rounded">
              <div className="text-[10px] font-bold text-slate-600 uppercase">Séptimos Días (Art. 64)</div>
              <div className="text-base font-black text-slate-900">{resumen.totalDescansosSemanales} días</div>
            </div>
            <div className="border border-slate-300 p-2 text-center rounded">
              <div className="text-[10px] font-bold text-slate-600 uppercase">A Cuenta Saldo</div>
              <div className="text-base font-black text-amber-700">{resumen.totalDiasACuentaVacaciones} días</div>
            </div>
            <div className="border border-slate-300 p-2 text-center rounded">
              <div className="text-[10px] font-bold text-slate-600 uppercase">Compensatorios</div>
              <div className="text-base font-black text-teal-700">{resumen.totalDiasCompensatorios} días</div>
            </div>
          </div>

          {/* Tabla Cronológica Detallada */}
          <h3 className="text-xs font-black uppercase text-slate-900 mb-2">
            Expediente Cronológico de Descansos ({historialFiltrado.length} registros)
          </h3>
          <table className="w-full text-[10.5px] border-collapse border border-slate-400 mb-4">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-400">
                <th className="border border-slate-300 px-2 py-1 text-left">Fecha / Período</th>
                <th className="border border-slate-300 px-2 py-1 text-left">Tipo de Descanso</th>
                <th className="border border-slate-300 px-2 py-1 text-center">Días</th>
                <th className="border border-slate-300 px-2 py-1 text-center">Afectación Saldo</th>
                <th className="border border-slate-300 px-2 py-1 text-center">Estado</th>
                <th className="border border-slate-300 px-2 py-1 text-left">Motivo / Fundamento Legal</th>
                <th className="border border-slate-300 px-2 py-1 text-left">Autorizado Por</th>
              </tr>
            </thead>
            <tbody>
              {historialFiltrado.map((item, index) => (
                <tr key={item.id || index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="border border-slate-300 px-2 py-1 font-semibold whitespace-nowrap">
                    {item.fechaInicio}
                    {item.fechaFin && item.fechaFin !== item.fechaInicio ? ` al ${item.fechaFin}` : ''}
                  </td>
                  <td className="border border-slate-300 px-2 py-1 font-medium">
                    {item.tipo}
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-center font-bold">
                    {item.dias}
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-center">
                    {item.descuentaSaldoVacaciones ? (
                      <span className="font-bold text-rose-700">Descuenta (-{item.dias})</span>
                    ) : (
                      <span className="font-bold text-emerald-700">Remunerado (100%)</span>
                    )}
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-center capitalize">
                    {item.estado.toLowerCase()}
                  </td>
                  <td className="border border-slate-300 px-2 py-1">
                    <div>{item.motivo || 'Descanso programado'}</div>
                    {item.observacionLegal && (
                      <div className="text-[9px] text-slate-500 italic">{item.observacionLegal}</div>
                    )}
                  </td>
                  <td className="border border-slate-300 px-2 py-1 whitespace-nowrap">
                    {item.autorizadoPor || 'Administración'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Certificación Legal y Firmas */}
          <div className="border border-slate-300 p-2.5 rounded text-[10px] text-slate-600 mb-6 bg-slate-50">
            <p className="font-semibold text-slate-800 mb-1">DECLARACIÓN DE CONFORMIDAD LABORAL:</p>
            <p>
              El presente expediente refleja fielmente los días de descanso semanal obligatorio (Art. 64), descansos compensatorios y feriados nacionales (Art. 66 y 67), así como los períodos de vacaciones gozados y remunerados (Art. 76) amparados por la Ley N° 185 (Código del Trabajo de la República de Nicaragua). Ambas partes dejan constancia de su conformidad.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-12 pt-6 mt-4">
            <div className="text-center">
              <div className="border-t border-black w-48 mx-auto mb-1" />
              <p className="font-bold text-xs uppercase">{empleado.nombre}</p>
              <p className="text-[10px] text-slate-600">Firma del Colaborador</p>
            </div>
            <div className="text-center">
              <div className="border-t border-black w-48 mx-auto mb-1" />
              <p className="font-bold text-xs uppercase">RECURSOS HUMANOS / ADMINISTRACIÓN</p>
              <p className="text-[10px] text-slate-600">Firma y Sello Oficial</p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
