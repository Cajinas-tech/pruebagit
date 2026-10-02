import React from 'react';
import { 
  AlertTriangle, 
  CalendarClock, 
  ChevronRight, 
  Check, 
  X, 
  Palmtree,
  ShieldAlert
} from 'lucide-react';
import { useData } from '../context/DataContext';

interface AlertsWidgetProps {
  onVerTodasSolicitudes: () => void;
  onVerLeyNica: () => void;
}

export const AlertsWidget: React.FC<AlertsWidgetProps> = ({
  onVerTodasSolicitudes,
  onVerLeyNica
}) => {
  const { solicitudes, empleados, procesarSolicitud } = useData();

  const pendientes = solicitudes.filter(s => s.estado === 'Pendiente');

  // Empleados que tienen más de 15 días acumulados disponibles (deben descansar según Art. 76)
  const empleadosConDescansoPendiente = empleados.filter(e => (e.saldoDisponible || 0) >= 15);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Tarjeta Izquierda: Solicitudes Pendientes (Estilo captura productos con stock bajo) */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
        <div>
          {/* Cabecera */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                Solicitudes de Vacaciones Pendientes
              </h3>
            </div>
            <span className="bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-black px-3 py-0.5 rounded-full">
              {pendientes.length} alertas
            </span>
          </div>

          {/* Lista de Solicitudes pendientes con estilo de tarjetas grises */}
          <div className="space-y-3">
            {pendientes.length === 0 ? (
              <div className="p-6 text-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs font-medium">
                🎉 No hay solicitudes pendientes por resolver en la tienda.
              </div>
            ) : (
              pendientes.slice(0, 3).map((sol) => (
                <div
                  key={sol.id}
                  className="bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 p-4 rounded-xl flex items-center justify-between gap-3 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {sol.nombreEmpleado.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-tight">
                        {sol.nombreEmpleado}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Periodo: {sol.fechaInicio} al {sol.fechaFin}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="bg-amber-100/90 dark:bg-amber-900/50 text-amber-900 dark:text-amber-300 text-xs font-extrabold px-3 py-1 rounded-lg">
                      {sol.diasSolicitados} días
                    </span>
                    <button
                      onClick={() => procesarSolicitud(sol.id, 'Aprobado')}
                      className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
                      title="Aprobar de inmediato"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => procesarSolicitud(sol.id, 'Rechazado')}
                      className="p-1.5 bg-rose-100 dark:bg-rose-900/40 hover:bg-rose-200 dark:hover:bg-rose-800/60 text-rose-700 dark:text-rose-300 rounded-lg transition"
                      title="Rechazar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Botón inferior Ver Todas */}
        <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onVerTodasSolicitudes}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 transition"
          >
            <span>Ver todas las solicitudes ({pendientes.length})</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tarjeta Derecha: Descanso Obligatorio Art. 76 (Estilo productos próximos a vencer) */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
        <div>
          {/* Cabecera */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-rose-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                Descanso Programable (Art. 76 Cód. Trabajo)
              </h3>
            </div>
            <button
              onClick={onVerLeyNica}
              className="bg-[#171c26] dark:bg-slate-800 hover:bg-slate-900 dark:hover:bg-slate-700 text-white text-[11px] font-black px-3 py-1.5 rounded-full transition flex items-center gap-1 border border-transparent dark:border-slate-700"
            >
              <span>Ver Ley Art. 76</span>
            </button>
          </div>

          {/* Lista de Empleados con alto saldo */}
          <div className="space-y-3">
            {empleadosConDescansoPendiente.slice(0, 3).map((emp) => (
              <div
                key={emp.id}
                className="bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 p-4 rounded-xl flex items-center justify-between gap-3 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    <Palmtree className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-tight">
                      {emp.nombre}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {emp.cargo} • Ingreso: {emp.fechaIngreso}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-black px-2.5 py-1 rounded-lg">
                      {emp.saldoDisponible} días
                    </span>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1">
                      Saldo acumulado
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Nota legal al pie */}
        <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span>
            Art. 76: Quince (15) días de descanso remunerado por cada 6 meses continuos laborados.
          </span>
        </div>
      </div>
    </div>
  );
};
