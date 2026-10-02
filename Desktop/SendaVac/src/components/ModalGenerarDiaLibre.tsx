import React, { useState, useEffect } from 'react';
import {
  Coffee,
  X,
  ChevronDown
} from 'lucide-react';
import { Empleado } from '../types';
import { DiaLibreSemanal, TipoDiaLibre, obtenerDiaSemanaNica } from './ModuloDiasLibres';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';

interface ModalGenerarDiaLibreProps {
  isOpen: boolean;
  onClose: () => void;
  empleado: Empleado | null;
  onDiaLibreGenerado?: (diaLibre: DiaLibreSemanal) => void;
}

export const ModalGenerarDiaLibre: React.FC<ModalGenerarDiaLibreProps> = ({
  isOpen,
  onClose,
  empleado,
  onDiaLibreGenerado
}) => {
  const { empleados, actualizarEmpleado } = useData();
  const { usuarioActual } = useAuth();
  const { success, warning, error } = useToast();

  const [empSeleccionadoId, setEmpSeleccionadoId] = useState<string>('');
  const hoyStr = new Date().toISOString().slice(0, 10);
  const [fecha, setFecha] = useState<string>(hoyStr);
  const [diaSemana, setDiaSemana] = useState<'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo'>(() => obtenerDiaSemanaNica(hoyStr));
  const [tipo, setTipo] = useState<TipoDiaLibre>('Descanso Semanal (Art. 64 C.T.)');
  const [motivo, setMotivo] = useState<string>('Dia de descanso semanal obligatorio remunerado');
  const [guardando, setGuardando] = useState<boolean>(false);

  // Inicializar colaborador seleccionado
  useEffect(() => {
    if (empleado) {
      setEmpSeleccionadoId(empleado.id);
    } else if (empleados.length > 0) {
      setEmpSeleccionadoId(empleados[0].id);
    }
  }, [empleado, empleados, isOpen]);

  // Actualizar día al cambiar la fecha seleccionada
  const handleCambioFecha = (fStr: string) => {
    setFecha(fStr);
    const diaDetectado = obtenerDiaSemanaNica(fStr);
    setDiaSemana(diaDetectado);
  };

  // Actualizar motivo según el tipo seleccionado
  const handleCambioTipo = (t: TipoDiaLibre) => {
    setTipo(t);
    if (t === 'Descanso Semanal (Art. 64 C.T.)') {
      setMotivo('Dia de descanso semanal obligatorio remunerado');
    } else if (t === 'A Cuenta de Vacaciones') {
      setMotivo('Dia libre a cuenta del periodo vacacional anual (deduce 1 dia)');
    } else if (t === 'Compensatorio') {
      setMotivo('Dia libre compensatorio por laborar dia feriado o extraordinario');
    } else if (t === 'Permiso Especial') {
      setMotivo('Permiso especial concedido por mutuo acuerdo');
    }
  };

  if (!isOpen) return null;

  const empActual = empleados.find(e => e.id === empSeleccionadoId) || empleado;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empActual) {
      error('Error', 'Selecciona un colaborador válido');
      return;
    }

    if (!fecha) {
      warning('Fecha requerida', 'Por favor selecciona la fecha del día libre');
      return;
    }

    setGuardando(true);

    try {
      const nuevoRegistro: DiaLibreSemanal = {
        id: `dl-${Date.now()}`,
        empleadoId: empActual.id,
        nombreEmpleado: empActual.nombre,
        cargoEmpleado: empActual.cargo,
        departamento: empActual.departamento || 'Tienda',
        fecha,
        diaSemana,
        tipo,
        estado: 'Programado',
        motivo: motivo.trim() || 'Día libre programado',
        fechaRegistro: new Date().toISOString().slice(0, 10),
        autorizadoPor: usuarioActual?.nombre || 'Gerencia General'
      };

      // 1. Guardar en localStorage
      const saved = localStorage.getItem('sendavac_dias_libres_semanales');
      const lista: DiaLibreSemanal[] = saved ? JSON.parse(saved) : [];
      lista.unshift(nuevoRegistro);
      localStorage.setItem('sendavac_dias_libres_semanales', JSON.stringify(lista));

      // 2. Si es a cuenta de vacaciones, deducir 1 día
      if (tipo === 'A Cuenta de Vacaciones') {
        const tomadosActuales = empActual.diasTomados || 0;
        await actualizarEmpleado(empActual.id, {
          diasTomados: Number((tomadosActuales + 1).toFixed(2))
        });
      }

      success(
        '¡Día Libre Generado con Éxito!',
        `Se programó el día libre para ${empActual.nombre} el ${diaSemana} (${fecha})`
      );

      if (onDiaLibreGenerado) {
        onDiaLibreGenerado(nuevoRegistro);
      }

      onClose();
    } catch (err: any) {
      console.error('Error al guardar día libre:', err);
      error('Error al programar día libre', err?.message || 'No se pudo guardar la información');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      {/* Fondo totalmente diáfano y sin espacios oscuros */}
      <div 
        className="fixed inset-0 bg-black/5 dark:bg-black/20 backdrop-blur-[1px] transition-opacity duration-200"
        onClick={() => {
          if (!guardando) onClose();
        }}
      />

      {/* Contenedor Acoplado Directo (Diseño idéntico a la imagen proporcionada) */}
      <div 
        className="relative w-full max-w-[480px] text-left my-auto animate-scaleIn z-10 space-y-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner Superior Idéntico a la imagen de referencia */}
        {empActual && (
          <div className="flex items-center gap-3 px-1 py-0.5">
            <div className="w-10 h-10 rounded-2xl bg-[#fef3c7] dark:bg-amber-950/70 text-[#d97706] dark:text-amber-400 flex items-center justify-center flex-shrink-0 shadow-xs">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                Programar Día Libre para {empActual.nombre}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                Art. 64 C.T. - Descanso semanal continuo obligatorio o a cuenta de vacaciones
              </p>
            </div>
          </div>
        )}

        {/* Tarjeta Blanca Acoplada (Formulario) */}
        <div className="bg-white dark:bg-[#0f172a] rounded-[26px] shadow-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 text-left">
          {/* Cabecera del Card */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-[#f3e8ff] dark:bg-purple-950/80 text-[#9333ea] dark:text-purple-300 flex items-center justify-center flex-shrink-0">
                <Coffee className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Generar Día Libre en la Semana
                </h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-400 font-normal mt-0.5">
                  Art. 64 C.T. • Programación de descanso para el colaborador
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Formulario Acoplado */}
          <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
            {/* Campo: COLABORADOR */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                COLABORADOR
              </label>
              <div className="relative">
                <select
                  value={empSeleccionadoId}
                  onChange={(e) => setEmpSeleccionadoId(e.target.value)}
                  className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 sm:py-3 pr-10 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition cursor-pointer truncate shadow-xs"
                >
                  {empleados.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nombre} — {emp.cargo} ({emp.saldoDisponible} días vac. disp.)
                    </option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Fila: FECHA DEL DÍA LIBRE + DÍA DETECTADO */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  FECHA DEL DÍA LIBRE
                </label>
                <input
                  type="date"
                  required
                  value={fecha}
                  onChange={(e) => handleCambioFecha(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition cursor-pointer shadow-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  DÍA DETECTADO
                </label>
                <div className="w-full bg-[#faf5ff] dark:bg-purple-950/40 border border-[#e9d5ff] dark:border-purple-800/80 rounded-2xl px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-[#9333ea] dark:text-purple-300 flex items-center shadow-xs">
                  <span>{diaSemana}</span>
                </div>
              </div>
            </div>

            {/* Campo: TIPO DE DÍA LIBRE */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                TIPO DE DÍA LIBRE
              </label>
              <div className="relative">
                <select
                  value={tipo}
                  onChange={(e) => handleCambioTipo(e.target.value as TipoDiaLibre)}
                  className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 sm:py-3 pr-10 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition cursor-pointer truncate shadow-xs"
                >
                  <option value="Descanso Semanal (Art. 64 C.T.)">
                    Descanso Semanal Obligatorio (Art. 64 C.T.) - Remunerado
                  </option>
                  <option value="A Cuenta de Vacaciones">
                    A Cuenta de Vacaciones (Art. 76 C.T.) - Deduce 1 día
                  </option>
                  <option value="Compensatorio">
                    Compensatorio por Feriado o Turno Extra (Art. 67 C.T.)
                  </option>
                  <option value="Permiso Especial">
                    Permiso Especial Concedido
                  </option>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Campo: MOTIVO / OBSERVACIÓN */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                MOTIVO / OBSERVACIÓN
              </label>
              <textarea
                rows={2}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Dia de descanso semanal obligatorio remunerado"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition shadow-xs resize-none"
              />
            </div>

            {/* Botones de Acción */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                disabled={guardando}
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer text-xs sm:text-sm shadow-xs text-center"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={guardando}
                className="flex-1 py-3 px-4 rounded-2xl bg-[#9333ea] hover:bg-[#8527da] active:scale-[0.99] text-white font-bold transition shadow-lg shadow-purple-600/25 cursor-pointer text-xs sm:text-sm text-center"
              >
                {guardando ? 'Guardando...' : 'Confirmar y Generar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
