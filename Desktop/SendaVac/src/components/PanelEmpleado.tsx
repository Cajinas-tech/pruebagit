import React, { useState, useEffect } from 'react';
import { 
  Palmtree, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  DollarSign,
  ShieldCheck,
  Plus,
  History
} from 'lucide-react';
import { Empleado } from '../types';
import { useData } from '../context/DataContext';
import { FormularioSolicitud } from './FormularioSolicitud';
import { ModalHistorialDescansos } from './ModalHistorialDescansos';
import { formatearCordobas } from '../utils/calculosNica';

interface PanelEmpleadoProps {
  empleado: Empleado;
  initialOpenForm?: boolean;
}

export const PanelEmpleado: React.FC<PanelEmpleadoProps> = ({ empleado, initialOpenForm = false }) => {
  const { solicitudes } = useData();
  const [mostrarFormulario, setMostrarFormulario] = useState(initialOpenForm);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);

  useEffect(() => {
    if (initialOpenForm) {
      setMostrarFormulario(true);
    }
  }, [initialOpenForm]);

  // Filtrar solicitudes del empleado conectado
  const misSolicitudes = solicitudes.filter(s => s.empleadoId === empleado.id);

  // Proyección económica personal si se liquidaran
  const valorMonetarioEstimado = ((empleado.salarioMensual || 12000) / 30) * empleado.saldoDisponible;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Cabecera del Colaborador */}
      <div className="bg-white dark:bg-slate-900/60 rounded-3xl p-6 md:p-8 shadow-xs border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center sm:items-start gap-5 backdrop-blur-md">
        <div className="w-16 h-16 rounded-2xl bg-[#1d63ff] text-white flex items-center justify-center text-2xl font-black shadow-md shadow-blue-500/20 flex-shrink-0">
          {empleado.nombre.charAt(0)}
        </div>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white">
              ¡Hola, {empleado.nombre}!
            </h2>
            <span className="bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800/60">
              {empleado.cargo}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tienda Senda • Fecha de ingreso: <strong className="text-slate-700 dark:text-slate-200">{empleado.fechaIngreso}</strong> • Salario: {formatearCordobas(empleado.salarioMensual || 0)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMostrarHistorial(true)}
            className="bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-black px-3.5 py-2.5 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Ver historial completo de días libres y vacaciones tomadas"
          >
            <History className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Mi Historial de Descansos</span>
          </button>

          <button
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            className="bg-[#1d63ff] hover:bg-blue-700 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{mostrarFormulario ? 'Cerrar Formulario' : 'Solicitar Vacaciones'}</span>
          </button>
        </div>
      </div>

      {/* 3 Tarjetas de Métricas de Ley Nica */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Acumulados */}
        <div className="bg-white dark:bg-slate-900/60 p-5 rounded-2xl text-center border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Acumulados (Ley Nica)
          </p>
          <p className="text-3xl font-black text-blue-900 dark:text-blue-400 mt-1">
            {empleado.diasAcumulados}
          </p>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block mt-1">
            2.5 días por mes laborado
          </span>
        </div>

        {/* Tomados */}
        <div 
          onClick={() => setMostrarHistorial(true)}
          className="bg-white dark:bg-slate-900/60 p-5 rounded-2xl text-center border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-700 transition cursor-pointer group"
          title="Haz clic para ver el detalle de días libres y vacaciones tomadas"
        >
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1 group-hover:text-blue-600 transition">
            <span>Días Tomados</span>
            <History className="w-3 h-3" />
          </p>
          <p className="text-3xl font-black text-orange-600 dark:text-orange-400 mt-1">
            {empleado.diasTomados || 0}
          </p>
          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold block mt-1 underline">
            Ver desglose e historial →
          </span>
        </div>

        {/* Disponibles Hoy */}
        <div className="bg-[#eefbf4] dark:bg-emerald-950/30 p-5 rounded-2xl text-center border border-[#c3edd5] dark:border-emerald-800/60 shadow-xs">
          <p className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
            Disponibles Hoy
          </p>
          <p className="text-3xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
            {empleado.saldoDisponible}
          </p>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold block mt-1">
            Equivalente a: {formatearCordobas(valorMonetarioEstimado)}
          </span>
        </div>
      </div>

      {/* Alerta de Ley Nica */}
      <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-2xl p-4 flex items-start gap-3 text-xs text-blue-900 dark:text-blue-200">
        <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Artículo 76 (Código del Trabajo de Nicaragua):</strong>
          <p className="mt-0.5 text-blue-800 dark:text-blue-300 leading-relaxed">
            Tienes derecho por cada seis meses de trabajo continuo a quince (15) días de descanso remunerado. Tu saldo se actualiza de manera automática cada mes.
          </p>
        </div>
      </div>

      {/* Formulario de Solicitud (Si está abierto) */}
      {mostrarFormulario && (
        <div className="animate-fadeIn">
          <FormularioSolicitud
            empleado={empleado}
            onSolicitudEnviada={() => setMostrarFormulario(false)}
          />
        </div>
      )}

      {/* Historial de Solicitudes Personales */}
      <div className="bg-white dark:bg-slate-900/60 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Mis Solicitudes de Descanso</span>
          </h3>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-bold">
            {misSolicitudes.length} registro(s)
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
          {misSolicitudes.length === 0 ? (
            <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
              No tienes solicitudes de vacaciones enviadas aún.
            </div>
          ) : (
            misSolicitudes.map((sol) => (
              <div key={sol.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-800 dark:text-white text-sm">
                      {sol.diasSolicitados} días solicitados
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        sol.estado === 'Aprobado'
                          ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          : sol.estado === 'Rechazado'
                          ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                          : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse'
                      }`}
                    >
                      {sol.estado}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Del <strong className="text-slate-700 dark:text-slate-300">{sol.fechaInicio}</strong> al <strong className="text-slate-700 dark:text-slate-300">{sol.fechaFin}</strong> • Solicitado el: {sol.fechaSolicitud}
                  </p>
                  {sol.motivo && (
                    <p className="text-[11px] text-slate-400 italic mt-0.5">
                      Motivo: "{sol.motivo}"
                    </p>
                  )}
                </div>

                <div className="text-right text-xs">
                  {sol.estado === 'Aprobado' && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Días deducidos de tu saldo
                    </span>
                  )}
                  {sol.estado === 'Rechazado' && (
                    <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                      <XCircle className="w-4 h-4" /> Solicitud no aprobada
                    </span>
                  )}
                  {sol.estado === 'Pendiente' && (
                    <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> En revisión por la tienda
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Frontal: Historial Unificado de Vacaciones y Días Libres */}
      <ModalHistorialDescansos
        isOpen={mostrarHistorial}
        onClose={() => setMostrarHistorial(false)}
        empleado={empleado}
      />
    </div>
  );
};
