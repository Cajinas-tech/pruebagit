import React, { useState, useEffect } from 'react';
import { Calendar, Palmtree, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Empleado } from '../types';
import { useData } from '../context/DataContext';
import { calcularDiasEntreFechas } from '../utils/calculosNica';

interface PropsFormulario {
  empleado: Empleado;
  onSolicitudEnviada?: () => void;
}

export const FormularioSolicitud: React.FC<PropsFormulario> = ({
  empleado,
  onSolicitudEnviada
}) => {
  const { crearSolicitud } = useData();
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [motivo, setMotivo] = useState('');
  const [diasSolicitados, setDiasSolicitados] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  // Calcular días automáticamente entre fecha de salida y regreso
  useEffect(() => {
    if (fechaInicio && fechaFin) {
      const dias = calcularDiasEntreFechas(fechaInicio, fechaFin);
      setDiasSolicitados(dias);
    } else {
      setDiasSolicitados(0);
    }
  }, [fechaInicio, fechaFin]);

  const enviarSolicitud = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);

    if (diasSolicitados <= 0) {
      setMensaje({
        tipo: 'error',
        texto: 'La fecha de fin debe ser posterior o igual a la fecha de inicio.'
      });
      return;
    }

    if (diasSolicitados > empleado.saldoDisponible) {
      setMensaje({
        tipo: 'error',
        texto: `No puedes solicitar ${diasSolicitados} días. Tu saldo disponible actual es de ${empleado.saldoDisponible} días.`
      });
      return;
    }

    setCargando(true);
    try {
      await crearSolicitud({
        empleadoId: empleado.id,
        nombreEmpleado: empleado.nombre,
        cargoEmpleado: empleado.cargo,
        fechaInicio,
        fechaFin,
        diasSolicitados,
        motivo: motivo.trim() || 'Vacaciones de ley'
      });

      setMensaje({
        tipo: 'exito',
        texto: '¡Tu solicitud de vacaciones fue enviada con éxito al administrador de la tienda!'
      });

      setFechaInicio('');
      setFechaFin('');
      setMotivo('');
      setDiasSolicitados(0);

      if (onSolicitudEnviada) {
        setTimeout(onSolicitudEnviada, 1500);
      }
    } catch (err: any) {
      setMensaje({
        tipo: 'error',
        texto: 'Error al enviar la solicitud: ' + (err.message || err)
      });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900/90 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 w-full max-w-xl mx-auto backdrop-blur-md">
      <div className="flex items-center space-x-3 text-[#1d63ff] dark:text-blue-400 mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center">
          <Palmtree className="w-5 h-5 text-[#1d63ff] dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-base font-black text-slate-800 dark:text-white">
            Nueva Solicitud de Vacaciones
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Saldo disponible: <strong className="text-blue-600 dark:text-blue-400 font-bold">{empleado.saldoDisponible} días</strong>
          </p>
        </div>
      </div>

      {mensaje && (
        <div
          className={`p-3.5 rounded-xl text-xs font-bold mb-4 border flex items-center gap-2 ${
            mensaje.tipo === 'exito'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
          }`}
        >
          {mensaje.tipo === 'exito' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
          )}
          <span>{mensaje.texto}</span>
        </div>
      )}

      <form onSubmit={enviarSolicitud} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Fecha de Inicio */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Fecha de Salida
            </label>
            <input
              type="date"
              required
              disabled={cargando}
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="block w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100 dark:disabled:bg-slate-800/50 transition"
            />
          </div>

          {/* Fecha de Fin */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Último Día de Vacaciones
            </label>
            <input
              type="date"
              required
              disabled={cargando}
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="block w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100 dark:disabled:bg-slate-800/50 transition"
            />
          </div>
        </div>

        {/* Motivo Opcional */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
            Motivo o Comentarios (Opcional)
          </label>
          <input
            type="text"
            placeholder="Ej. Vacaciones familiares de verano, descanso de 6 meses..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="block w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
          />
        </div>

        {/* Resumen de días interactivo */}
        {diasSolicitados > 0 && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900/60 flex justify-between items-center text-xs">
            <div>
              <span className="text-blue-900 dark:text-blue-200 font-bold block">Días calendario a tomar:</span>
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                Saldo restante proyectado: {(empleado.saldoDisponible - diasSolicitados).toFixed(1)} días
              </span>
            </div>
            <span className="font-black text-sm text-blue-900 dark:text-blue-200 bg-blue-200 dark:bg-blue-900/60 px-3.5 py-1.5 rounded-xl border border-blue-300 dark:border-blue-800">
              {diasSolicitados} días
            </span>
          </div>
        )}

        <button
          type="submit"
          disabled={cargando || diasSolicitados === 0 || diasSolicitados > empleado.saldoDisponible}
          className="w-full bg-[#1d63ff] hover:bg-blue-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer active:scale-95"
        >
          <Send className="w-4 h-4" />
          <span>{cargando ? 'Registrando en el sistema...' : 'Enviar Solicitud a la Tienda'}</span>
        </button>
      </form>
    </div>
  );
};
