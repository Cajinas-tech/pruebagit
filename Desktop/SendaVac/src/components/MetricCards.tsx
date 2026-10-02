import React from 'react';
import { 
  Users, 
  CalendarCheck, 
  AlertCircle, 
  Wallet,
  TrendingUp,
  Clock
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { formatearCordobas } from '../utils/calculosNica';

export const MetricCards: React.FC = () => {
  const { empleados, solicitudes } = useData();

  // Estadísticas calculadas
  const totalEmpleados = empleados.length;
  
  const totalDiasAcumulados = empleados.reduce((acc, curr) => acc + (curr.diasAcumulados || 0), 0);
  const totalDiasDisponibles = empleados.reduce((acc, curr) => acc + (curr.saldoDisponible || 0), 0);
  
  const solicitudesPendientes = solicitudes.filter(s => s.estado === 'Pendiente').length;

  // Provisión total monetaria estimada: suma de (salarioMensual / 30) * saldoDisponible
  const provisionMonetariaTotal = empleados.reduce((acc, curr) => {
    const salarioDiario = (curr.salarioMensual || 12000) / 30;
    return acc + (salarioDiario * (curr.saldoDisponible || 0));
  }, 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
      {/* Tarjeta 1: Personal Activo */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between hover:shadow-md transition">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Registro del Personal
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white">
              {totalEmpleados}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">activos</span>
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> 100% bajo Ley Nica
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/50 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
          <Users className="w-6 h-6 stroke-[2.2]" />
        </div>
      </div>

      {/* Tarjeta 2: Días Acumulados */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between hover:shadow-md transition">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Días Totales Acumulados
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white">
              {totalDiasAcumulados.toFixed(1)}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">días</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
            Disponibles: <strong className="text-blue-600 dark:text-blue-400">{totalDiasDisponibles.toFixed(1)}</strong>
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
          <CalendarCheck className="w-6 h-6 stroke-[2.2]" />
        </div>
      </div>

      {/* Tarjeta 3: Solicitudes Pendientes */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between hover:shadow-md transition">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Solicitudes Pendientes
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white">
              {solicitudesPendientes}
            </span>
            <span className="text-xs font-bold text-rose-500 dark:text-rose-400 font-extrabold">
              {solicitudesPendientes === 1 ? 'por revisar' : 'por revisar'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Respuesta requerida
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-rose-800/50 flex items-center justify-center text-rose-500 dark:text-rose-400 flex-shrink-0">
          <AlertCircle className="w-6 h-6 stroke-[2.2]" />
        </div>
      </div>

      {/* Tarjeta 4: Provisión Vacacional en Córdobas (C$) */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between hover:shadow-md transition">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Provisión Salarial (C$)
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl md:text-2xl font-black text-slate-800 dark:text-white truncate">
              {formatearCordobas(provisionMonetariaTotal)}
            </span>
          </div>
          <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold mt-1">
            Salario diario base 30 días
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/30 border border-purple-100 dark:border-purple-800/50 flex items-center justify-center text-purple-600 dark:text-purple-400 flex-shrink-0">
          <Wallet className="w-6 h-6 stroke-[2.2]" />
        </div>
      </div>
    </div>
  );
};
