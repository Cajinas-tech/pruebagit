import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarDays,
  Coffee,
  Plus,
  Users,
  CheckCircle2,
  Clock,
  Printer,
  FileDown,
  Send,
  Trash2,
  X,
  Search,
  Filter,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Eye,
  CalendarCheck,
  Sparkles,
  Palmtree
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { ConfirmModal } from './ConfirmModal';
import { Empleado } from '../types';
import { formatearCordobas } from '../utils/calculosNica';

export type TipoDiaLibre = 
  | 'Descanso Semanal (Art. 64 C.T.)'
  | 'A Cuenta de Vacaciones'
  | 'Compensatorio'
  | 'Permiso Especial';

export interface DiaLibreSemanal {
  id: string;
  empleadoId: string;
  nombreEmpleado: string;
  cargoEmpleado: string;
  departamento: string;
  fecha: string; // YYYY-MM-DD
  diaSemana: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';
  tipo: TipoDiaLibre;
  estado: 'Programado' | 'Disfrutado' | 'Cancelado';
  motivo?: string;
  fechaRegistro: string;
  autorizadoPor?: string;
}

const DIAS_SEMANA_ORDEN = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo'
] as const;

// Helper para obtener el día de la semana en español dado un string YYYY-MM-DD
export const obtenerDiaSemanaNica = (fechaStr: string): 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo' => {
  if (!fechaStr) return 'Lunes';
  const partes = fechaStr.split('-');
  const fecha = new Date(parseInt(partes[0], 10), parseInt(partes[1], 10) - 1, parseInt(partes[2], 10));
  const diaNum = fecha.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  switch (diaNum) {
    case 1: return 'Lunes';
    case 2: return 'Martes';
    case 3: return 'Miércoles';
    case 4: return 'Jueves';
    case 5: return 'Viernes';
    case 6: return 'Sábado';
    case 0: return 'Domingo';
    default: return 'Lunes';
  }
};

// Helper para calcular las fechas de la semana dado un desfase de semanas (0 = semana actual)
const obtenerFechasSemana = (offsetSemanas: number = 0) => {
  const hoy = new Date();
  const diaSemanaHoy = hoy.getDay(); // 0 domingo, 1 lunes...
  // Calcular el lunes de esta semana
  const diffLunes = diaSemanaHoy === 0 ? -6 : 1 - diaSemanaHoy;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + diffLunes + (offsetSemanas * 7));

  const dias: { diaSemana: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo'; fechaStr: string; fechaObj: Date; display: string }[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    const fechaStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const display = `${d.getDate()}/${d.getMonth() + 1}`;
    dias.push({
      diaSemana: DIAS_SEMANA_ORDEN[i],
      fechaStr,
      fechaObj: d,
      display
    });
  }

  return {
    lunesStr: dias[0].fechaStr,
    domingoStr: dias[6].fechaStr,
    lunesDisplay: dias[0].display,
    domingoDisplay: dias[6].display,
    dias
  };
};

// Datos semilla de días libres semanales
const DIAS_LIBRES_INICIALES: DiaLibreSemanal[] = [
  {
    id: 'dl-1',
    empleadoId: 'emp-2',
    nombreEmpleado: 'María López Gutiérrez',
    cargoEmpleado: 'Cajera Principal',
    departamento: 'Caja y Ventas',
    fecha: '2026-10-07',
    diaSemana: 'Miércoles',
    tipo: 'Descanso Semanal (Art. 64 C.T.)',
    estado: 'Programado',
    motivo: 'Día libre de descanso semanal continuo de ley (turno de caja)',
    fechaRegistro: '2026-10-01',
    autorizadoPor: 'Gerencia General'
  },
  {
    id: 'dl-2',
    empleadoId: 'emp-3',
    nombreEmpleado: 'Carlos Mendoza Jarquín',
    cargoEmpleado: 'Vendedor de Piso',
    departamento: 'Ventas (POS)',
    fecha: '2026-10-08',
    diaSemana: 'Jueves',
    tipo: 'Descanso Semanal (Art. 64 C.T.)',
    estado: 'Programado',
    motivo: 'Turno de descanso semanal rotativo de piso de ventas',
    fechaRegistro: '2026-10-01',
    autorizadoPor: 'Gerencia General'
  },
  {
    id: 'dl-3',
    empleadoId: 'emp-4',
    nombreEmpleado: 'Andrea Morales Sequeira',
    cargoEmpleado: 'Encargada de Inventario y Bodega',
    departamento: 'Inventario',
    fecha: '2026-10-05',
    diaSemana: 'Lunes',
    tipo: 'Descanso Semanal (Art. 64 C.T.)',
    estado: 'Programado',
    motivo: 'Descanso semanal de bodega',
    fechaRegistro: '2026-10-01',
    autorizadoPor: 'Gerencia General'
  },
  {
    id: 'dl-4',
    empleadoId: 'emp-5',
    nombreEmpleado: 'Roberto José Gómez Ruiz',
    cargoEmpleado: 'Asistente de Ventas y Créditos',
    departamento: 'Créditos y Cuentas',
    fecha: '2026-10-06',
    diaSemana: 'Martes',
    tipo: 'A Cuenta de Vacaciones',
    estado: 'Programado',
    motivo: 'Día libre solicitado para diligencia personal (a cuenta de vacaciones sin afectar salario)',
    fechaRegistro: '2026-10-01',
    autorizadoPor: 'Gerencia General'
  },
  {
    id: 'dl-5',
    empleadoId: 'emp-admin-1',
    nombreEmpleado: 'Jairo Cajina',
    cargoEmpleado: 'Gerente General / Administrador',
    departamento: 'Administración',
    fecha: '2026-10-04',
    diaSemana: 'Domingo',
    tipo: 'Descanso Semanal (Art. 64 C.T.)',
    estado: 'Programado',
    motivo: 'Descanso dominical administrativo de tienda',
    fechaRegistro: '2026-10-01',
    autorizadoPor: 'Gerencia General'
  }
];

interface PropsModuloDiasLibres {
  empleadoPreseleccionadoId?: string;
  onCerrarModal?: () => void;
}

export const ModuloDiasLibres: React.FC<PropsModuloDiasLibres> = ({
  empleadoPreseleccionadoId,
  onCerrarModal
}) => {
  const { empleados, actualizarEmpleado } = useData();
  const { usuarioActual } = useAuth();
  const { success, warning, error } = useToast();

  const esAdmin = usuarioActual?.rol === 'administrador';

  // Desfase de semanas para el cuadrante semanal (0 = actual)
  const [offsetSemana, setOffsetSemana] = useState<number>(0);
  const semanaInfo = useMemo(() => obtenerFechasSemana(offsetSemana), [offsetSemana]);

  // Lista de Días Libres
  const [diasLibres, setDiasLibres] = useState<DiaLibreSemanal[]>(() => {
    const saved = localStorage.getItem('sendavac_dias_libres_semanales');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return DIAS_LIBRES_INICIALES;
  });

  useEffect(() => {
    localStorage.setItem('sendavac_dias_libres_semanales', JSON.stringify(diasLibres));
  }, [diasLibres]);

  // Modales y estados
  const [modalNuevo, setModalNuevo] = useState<boolean>(() => Boolean(empleadoPreseleccionadoId));
  const [papeletaVer, setPapeletaVer] = useState<DiaLibreSemanal | null>(null);
  const [eliminarItem, setEliminarItem] = useState<DiaLibreSemanal | null>(null);
  const [generandoPdf, setGenerandoPdf] = useState<boolean>(false);

  // Filtros de tabla
  const [busqueda, setBusqueda] = useState<string>('');
  const [filtroTipo, setFiltroTipo] = useState<string>('Todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('Todos');

  // Formulario de Nuevo Día Libre
  const [formEmpId, setFormEmpId] = useState<string>(() => {
    if (empleadoPreseleccionadoId) return empleadoPreseleccionadoId;
    if (usuarioActual && !esAdmin) return usuarioActual.id;
    return empleados[0]?.id || '';
  });

  // Fecha por defecto: mañana o hoy
  const hoyStr = new Date().toISOString().slice(0, 10);
  const [formFecha, setFormFecha] = useState<string>(hoyStr);
  const [formDiaSemana, setFormDiaSemana] = useState<'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo'>(() => obtenerDiaSemanaNica(hoyStr));
  const [formTipo, setFormTipo] = useState<TipoDiaLibre>('Descanso Semanal (Art. 64 C.T.)');
  const [formMotivo, setFormMotivo] = useState<string>('Día de descanso semanal obligatorio remunerado');

  // Actualizar día de la semana automáticamente al cambiar fecha
  const handleCambioFecha = (nuevaFecha: string) => {
    setFormFecha(nuevaFecha);
    setFormDiaSemana(obtenerDiaSemanaNica(nuevaFecha));
  };

  // Pre-llenar motivo sugerido al cambiar tipo
  const handleCambioTipo = (nuevoTipo: TipoDiaLibre) => {
    setFormTipo(nuevoTipo);
    if (nuevoTipo === 'Descanso Semanal (Art. 64 C.T.)') {
      setFormMotivo('Día de descanso semanal obligatorio de ley (Art. 64 C.T.)');
    } else if (nuevoTipo === 'A Cuenta de Vacaciones') {
      setFormMotivo('Día libre especial concedido a cuenta de vacaciones sin afectar salario');
    } else if (nuevoTipo === 'Compensatorio') {
      setFormMotivo('Día compensatorio por laborar en jornada de descanso o feriado');
    } else {
      setFormMotivo('Permiso personal autorizado por administración');
    }
  };

  // Abrir modal con día pre-seleccionado de la cuadrícula
  const handleAbrirParaDia = (fechaStr: string, dia: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo') => {
    setFormFecha(fechaStr);
    setFormDiaSemana(dia);
    setModalNuevo(true);
  };

  // Guardar Nuevo Día Libre
  const handleGuardarDiaLibre = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = empleados.find(e => e.id === formEmpId);
    if (!emp) {
      error('Error', 'Selecciona un colaborador válido');
      return;
    }

    if (!formFecha) {
      error('Error', 'Selecciona la fecha para el día libre');
      return;
    }

    // Verificar si ya tiene un día libre registrado en esa fecha
    const yaTiene = diasLibres.some(d => d.empleadoId === emp.id && d.fecha === formFecha && d.estado !== 'Cancelado');
    if (yaTiene) {
      warning('Aviso', `${emp.nombre} ya tiene un día libre programado para el ${formFecha}`);
      return;
    }

    const nuevo: DiaLibreSemanal = {
      id: `dl-${Date.now()}`,
      empleadoId: emp.id,
      nombreEmpleado: emp.nombre,
      cargoEmpleado: emp.cargo,
      departamento: emp.departamento || 'Tienda',
      fecha: formFecha,
      diaSemana: formDiaSemana,
      tipo: formTipo,
      estado: 'Programado',
      motivo: formMotivo,
      fechaRegistro: new Date().toISOString().slice(0, 10),
      autorizadoPor: usuarioActual?.nombre || 'Gerencia General'
    };

    // Si es a cuenta de vacaciones, deducir 1 día del saldo de vacaciones acumuladas
    if (formTipo === 'A Cuenta de Vacaciones') {
      try {
        const tomadosActuales = emp.diasTomados || 0;
        await actualizarEmpleado(emp.id, {
          diasTomados: Number((tomadosActuales + 1).toFixed(2))
        });
      } catch (err) {
        console.warn('No se pudo actualizar saldo en Firebase:', err);
      }
    }

    setDiasLibres(prev => [nuevo, ...prev]);
    setModalNuevo(false);
    setPapeletaVer(nuevo);
    success('Día Libre Generado', `Se programó el día libre para ${emp.nombre} el ${formDiaSemana} (${formFecha})`);
  };

  // Cambiar estado de día libre
  const handleCambiarEstado = (id: string, nuevoEstado: 'Programado' | 'Disfrutado' | 'Cancelado') => {
    setDiasLibres(prev => prev.map(d => d.id === id ? { ...d, estado: nuevoEstado } : d));
    success('Estado Actualizado', `El día libre ahora está marcado como "${nuevoEstado}"`);
  };

  // Eliminar día libre
  const handleConfirmarEliminar = async () => {
    if (!eliminarItem) return;

    // Si fue a cuenta de vacaciones y se cancela/elimina, reintegrar el día al saldo del colaborador
    if (eliminarItem.tipo === 'A Cuenta de Vacaciones') {
      const emp = empleados.find(e => e.id === eliminarItem.empleadoId);
      if (emp) {
        try {
          const tomados = Math.max(0, (emp.diasTomados || 0) - 1);
          await actualizarEmpleado(emp.id, {
            diasTomados: Number(tomados.toFixed(2))
          });
        } catch (e) {
          console.warn(e);
        }
      }
    }

    setDiasLibres(prev => prev.filter(d => d.id !== eliminarItem.id));
    setEliminarItem(null);
    success('Registro Eliminado', 'Se removió la programación del día libre');
  };

  // Días Libres filtrados para la tabla histórica
  const diasLibresFiltrados = useMemo(() => {
    return diasLibres.filter(item => {
      const matchBusqueda = item.nombreEmpleado.toLowerCase().includes(busqueda.toLowerCase()) ||
        item.cargoEmpleado.toLowerCase().includes(busqueda.toLowerCase()) ||
        item.fecha.includes(busqueda) ||
        item.diaSemana.toLowerCase().includes(busqueda.toLowerCase());

      const matchTipo = filtroTipo === 'Todos' || item.tipo === filtroTipo;
      const matchEstado = filtroEstado === 'Todos' || item.estado === filtroEstado;

      return matchBusqueda && matchTipo && matchEstado;
    });
  }, [diasLibres, busqueda, filtroTipo, filtroEstado]);

  // Generar Papeleta Oficial en PDF
  const handleDescargarPapeletaPDF = (item: DiaLibreSemanal) => {
    try {
      setGenerandoPdf(true);
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5'
      });

      const primaryColor = [147, 51, 234]; // Purple 600
      const darkColor = [15, 23, 42];
      const fechaHoy = new Date().toLocaleDateString('es-NI');

      // Franja superior
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 148, 14, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text('SENDA SISTEMAS • CONTROL DE ASISTENCIA Y TURNOS', 10, 9);

      // Título
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('BOLETA DE AUTORIZACIÓN DE DÍA LIBRE SEMANAL', 74, 22, { align: 'center' });

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Código del Trabajo de la República de Nicaragua • Art. 64 (Descanso Remunerado)', 74, 26, { align: 'center' });

      // Cuadro de Datos
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(10, 31, 128, 54, 2.5, 2.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text('DETALLE DE LA PROGRAMACIÓN DEL DÍA LIBRE', 14, 37);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);

      doc.text('Colaborador:', 14, 44);
      doc.setFont('helvetica', 'bold');
      doc.text(item.nombreEmpleado, 36, 44);

      doc.setFont('helvetica', 'normal');
      doc.text('Cargo / Área:', 14, 50);
      doc.setFont('helvetica', 'bold');
      doc.text(`${item.cargoEmpleado} (${item.departamento})`, 36, 50);

      doc.setFont('helvetica', 'normal');
      doc.text('Fecha Libre:', 14, 56);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(147, 51, 234);
      doc.text(`${item.diaSemana}, ${item.fecha}`, 36, 56);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('Tipo de Descanso:', 14, 62);
      doc.setFont('helvetica', 'bold');
      doc.text(item.tipo, 42, 62);

      doc.setFont('helvetica', 'normal');
      doc.text('Motivo:', 14, 68);
      doc.text(item.motivo || 'Descanso semanal programado', 36, 68);

      doc.text('Autorizado por:', 14, 74);
      doc.setFont('helvetica', 'bold');
      doc.text(item.autorizadoPor || 'Gerencia General', 38, 74);

      // Nota de Ley
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.2);
      doc.setTextColor(100, 116, 139);
      const nota = item.tipo === 'A Cuenta de Vacaciones'
        ? 'Aviso Laboral: Este día libre se otorgó a cuenta de vacaciones, descontando 1 día del saldo acumulado del colaborador y manteniendo su salario quincenal 100% íntegro de conformidad con la ley.'
        : 'Aviso Laboral: Conforme al Art. 64 del Código del Trabajo, el día de descanso semanal continuo es un derecho remunerado con goce de salario como un día de labor ordinaria.';
      doc.text(doc.splitTextToSize(nota, 128), 10, 92);

      // Firmas
      const firmasY = 120;
      doc.setDrawColor(148, 163, 184);
      doc.line(15, firmasY, 65, firmasY);
      doc.line(83, firmasY, 133, firmasY);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      doc.text('FIRMA DEL COLABORADOR', 40, firmasY + 4, { align: 'center' });
      doc.text('GERENCIA / ADMINISTRACIÓN', 108, firmasY + 4, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      doc.text('Notificado Conforme', 40, firmasY + 7.5, { align: 'center' });
      doc.text('SENDA SISTEMAS • Sello', 108, firmasY + 7.5, { align: 'center' });

      doc.save(`Boleta_Dia_Libre_${item.nombreEmpleado.replace(/\s+/g, '_')}_${item.fecha}.pdf`);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerandoPdf(false);
    }
  };

  // Enviar recordatorio por WhatsApp
  const handleEnviarWhatsApp = (item: DiaLibreSemanal) => {
    const emp = empleados.find(e => e.id === item.empleadoId);
    const tel = (emp?.telefono || '').replace(/[^\d]/g, '');
    const telefonoFinal = tel.startsWith('505') ? tel : `505${tel}`;

    const mensaje = 
      `*SENDA SISTEMAS • AVISO DE DÍA LIBRE SEMANAL*\n\n` +
      `Estimado(a) *${item.nombreEmpleado}*:\n` +
      `Le informamos que se ha programado y autorizado su día libre correspondiente:\n\n` +
      `📅 *Día:* ${item.diaSemana}, ${item.fecha}\n` +
      `🛡️ *Tipo:* ${item.tipo}\n` +
      `📝 *Motivo:* ${item.motivo || 'Descanso semanal'}\n` +
      (item.tipo === 'A Cuenta de Vacaciones' ? `🌴 *Nota:* Descontado de su saldo de vacaciones sin afectar su salario de la quincena.\n\n` : `\n`) +
      `¡Que disfrute de su merecido descanso!\n` +
      `_Administración de Tienda • SENDA SISTEMAS_`;

    const url = `https://api.whatsapp.com/send?phone=${telefonoFinal}&text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 animate-fadeIn text-left w-full">
      {/* 1. HEADER BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/60 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs backdrop-blur-md">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 p-0.5 shadow-lg shadow-purple-500/25 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Coffee className="w-6 h-6 sm:w-7 sm:h-7 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Gestor de Días Libres Semanales
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Programación semanal de turnos de descanso conforme al Art. 64 del Código del Trabajo de Nicaragua
            </p>
          </div>
        </div>

        {/* Botón de Acción Principal */}
        <div className="flex items-center gap-2.5 shrink-0">
          {esAdmin && (
            <button
              type="button"
              onClick={() => {
                const hoy = new Date().toISOString().slice(0, 10);
                handleCambioFecha(hoy);
                setModalNuevo(true);
              }}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-md shadow-purple-600/20 transition cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Generar Día Libre Semanal</span>
            </button>
          )}

          {onCerrarModal && (
            <button
              type="button"
              onClick={onCerrarModal}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. TARJETAS DE MÉTRICAS RÁPIDAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Días Libres</span>
            <p className="text-2xl font-black text-purple-600 mt-0.5">{diasLibres.length}</p>
            <span className="text-[10px] text-slate-400 font-semibold">Registros de tienda</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center font-bold">
            <CalendarCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Descanso de Ley (Art. 64)</span>
            <p className="text-2xl font-black text-blue-600 mt-0.5">
              {diasLibres.filter(d => d.tipo === 'Descanso Semanal (Art. 64 C.T.)').length}
            </p>
            <span className="text-[10px] text-blue-600 font-semibold">Descanso regular continuo</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">A Cuenta de Vacaciones</span>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">
              {diasLibres.filter(d => d.tipo === 'A Cuenta de Vacaciones').length}
            </p>
            <span className="text-[10px] text-emerald-600 font-semibold">Sin rebajo de salario</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
            <Palmtree className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Compensatorios / Permisos</span>
            <p className="text-2xl font-black text-amber-600 mt-0.5">
              {diasLibres.filter(d => d.tipo === 'Compensatorio' || d.tipo === 'Permiso Especial').length}
            </p>
            <span className="text-[10px] text-amber-600 font-semibold">Especiales autorizados</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. PLANIFICADOR SEMANAL EN CUADRÍCULA (LUNES A DOMINGO) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden space-y-4 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-purple-600" />
              <span>Cuadrante de Días Libres de la Semana</span>
            </h3>
            <p className="text-xs text-slate-400">
              Semana del {semanaInfo.lunesStr} al {semanaInfo.domingoStr} (Lunes a Domingo)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOffsetSemana(prev => prev - 1)}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
              title="Semana anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setOffsetSemana(0)}
              className="px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-bold hover:bg-purple-100 transition cursor-pointer"
            >
              {offsetSemana === 0 ? 'Esta Semana' : `Desfase: ${offsetSemana > 0 ? `+${offsetSemana}` : offsetSemana} sem.`}
            </button>
            <button
              type="button"
              onClick={() => setOffsetSemana(prev => prev + 1)}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
              title="Semana siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Las 7 Columnas de la Semana */}
        <div className="overflow-x-auto pb-2">
          <div className="grid grid-cols-7 gap-3 min-w-[780px] lg:min-w-0">
            {semanaInfo.dias.map(diaCol => {
              const libresEnEsteDia = diasLibres.filter(d => d.fecha === diaCol.fechaStr && d.estado !== 'Cancelado');
              const esHoy = diaCol.fechaStr === hoyStr;

              return (
                <div
                key={diaCol.diaSemana}
                className={`rounded-2xl p-3 border transition flex flex-col justify-between min-h-[170px] ${
                  esHoy
                    ? 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800 ring-2 ring-purple-500/20'
                    : 'bg-slate-50/60 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div>
                  {/* Cabecera del Día */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                    <div>
                      <span className={`text-xs font-black block ${esHoy ? 'text-purple-700 dark:text-purple-300' : 'text-slate-800 dark:text-slate-200'}`}>
                        {diaCol.diaSemana}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {diaCol.display}
                      </span>
                    </div>

                    {esAdmin && (
                      <button
                        type="button"
                        onClick={() => handleAbrirParaDia(diaCol.fechaStr, diaCol.diaSemana)}
                        className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-purple-600 flex items-center justify-center hover:bg-purple-600 hover:text-white transition cursor-pointer text-xs font-black"
                        title={`Generar día libre para el ${diaCol.diaSemana}`}
                      >
                        +
                      </button>
                    )}
                  </div>

                  {/* Lista de Colaboradores Librando en ese Día */}
                  <div className="space-y-2 mt-2">
                    {libresEnEsteDia.length > 0 ? (
                      libresEnEsteDia.map(item => (
                        <div
                          key={item.id}
                          className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[11px] text-slate-900 dark:text-white leading-tight">
                              {item.nombreEmpleado}
                            </span>
                          </div>

                          <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                            item.tipo === 'Descanso Semanal (Art. 64 C.T.)'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : item.tipo === 'A Cuenta de Vacaciones'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {item.tipo === 'Descanso Semanal (Art. 64 C.T.)' ? 'Descanso Semanal'
                              : item.tipo === 'A Cuenta de Vacaciones' ? 'A Cta. Vacaciones'
                              : 'Compensatorio'}
                          </span>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/60 text-[10px]">
                            <button
                              type="button"
                              onClick={() => setPapeletaVer(item)}
                              className="text-purple-600 dark:text-purple-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Boleta</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEnviarWhatsApp(item)}
                              className="text-emerald-600 hover:text-emerald-700 cursor-pointer"
                              title="Enviar por WhatsApp"
                            >
                              <Send className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-[10px] text-slate-400 italic">
                        🟢 Tienda con personal completo
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-[9px] text-slate-400 text-center pt-2">
                  {libresEnEsteDia.length} {libresEnEsteDia.length === 1 ? 'colaborador libra' : 'colaboradores libran'}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </div>

      {/* 4. TABLA GENERAL DE REGISTROS DE DÍAS LIBRES */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden space-y-4 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Historial y Registro de Días Libres
            </h3>
            <p className="text-xs text-slate-400">
              Seguimiento de descansos semanales de ley y días otorgados a cuenta de vacaciones
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Buscador */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar colaborador o día..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium w-48 sm:w-60 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>

            {/* Filtro Tipo */}
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
            >
              <option value="Todos">Todos los tipos</option>
              <option value="Descanso Semanal (Art. 64 C.T.)">Descanso Semanal</option>
              <option value="A Cuenta de Vacaciones">A Cuenta de Vacaciones</option>
              <option value="Compensatorio">Compensatorio</option>
              <option value="Permiso Especial">Permiso Especial</option>
            </select>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-black text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4">Colaborador</th>
                <th className="py-3 px-3">Fecha y Día</th>
                <th className="py-3 px-3">Tipo de Día Libre</th>
                <th className="py-3 px-3">Motivo / Condición</th>
                <th className="py-3 px-3 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {diasLibresFiltrados.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 dark:text-white">{item.nombreEmpleado}</div>
                    <div className="text-[10px] text-slate-400">{item.cargoEmpleado} ({item.departamento})</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-purple-600 dark:text-purple-400 block">{item.diaSemana}</span>
                    <span className="text-[10px] text-slate-500">{item.fecha}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.tipo === 'Descanso Semanal (Art. 64 C.T.)'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : item.tipo === 'A Cuenta de Vacaciones'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {item.tipo}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                    {item.motivo || 'Descanso semanal'}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <select
                      value={item.estado}
                      onChange={(e) => handleCambiarEstado(item.id, e.target.value as any)}
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full border cursor-pointer ${
                        item.estado === 'Programado'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : item.estado === 'Disfrutado'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      <option value="Programado">Programado</option>
                      <option value="Disfrutado">Disfrutado</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPapeletaVer(item)}
                        className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition cursor-pointer"
                        title="Ver Boleta"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDescargarPapeletaPDF(item)}
                        disabled={generandoPdf}
                        className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition cursor-pointer"
                        title="Descargar PDF"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEnviarWhatsApp(item)}
                        className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition cursor-pointer"
                        title="Enviar por WhatsApp"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>

                      {esAdmin && (
                        <button
                          type="button"
                          onClick={() => setEliminarItem(item)}
                          className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL FORMULARIO: GENERAR DÍA LIBRE SEMANAL */}
      {modalNuevo && createPortal(
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-black/5 dark:bg-black/20 backdrop-blur-[1px] animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalNuevo(false);
          }}
        >
          <div className="relative w-full max-w-md bg-white dark:bg-[#0f172a] rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5 text-purple-700 dark:text-purple-400">
                <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
                  <Coffee className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Generar Día Libre en la Semana
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Art. 64 C.T. • Programación de descanso para el colaborador
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalNuevo(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarDiaLibre} className="space-y-3.5 text-xs">
              {/* Colaborador */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Colaborador
                </label>
                <select
                  value={formEmpId}
                  onChange={(e) => setFormEmpId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  {empleados.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nombre} — {emp.cargo} ({emp.saldoDisponible} días vac. disp.)
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha y Día de la Semana */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Fecha del Día Libre
                  </label>
                  <input
                    type="date"
                    required
                    value={formFecha}
                    onChange={(e) => handleCambioFecha(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Día Detectado
                  </label>
                  <div className="w-full px-3 py-2 bg-purple-50 dark:bg-purple-950/80 border border-purple-200 dark:border-purple-800 rounded-xl font-black text-purple-700 dark:text-purple-300 text-sm">
                    {formDiaSemana}
                  </div>
                </div>
              </div>

              {/* Tipo de Día Libre */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Tipo de Día Libre
                </label>
                <select
                  value={formTipo}
                  onChange={(e) => handleCambioTipo(e.target.value as TipoDiaLibre)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="Descanso Semanal (Art. 64 C.T.)">Descanso Semanal Obligatorio (Art. 64 C.T.) - Remunerado</option>
                  <option value="A Cuenta de Vacaciones">A Cuenta de Vacaciones (Descuenta 1 día de saldo - Salario íntegro)</option>
                  <option value="Compensatorio">Día Libre Compensatorio (Por turno o feriado laborado)</option>
                  <option value="Permiso Especial">Permiso Especial / Motivo Personal</option>
                </select>
              </div>

              {/* Alerta explicativa si es A Cuenta de Vacaciones */}
              {formTipo === 'A Cuenta de Vacaciones' && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Garantía de Nómina y Salario Fijo</span>
                  </div>
                  <p>
                    Este día se descontará automáticamente del saldo de vacaciones acumuladas del colaborador (1 día). <strong>Su salario de la quincena se mantiene 100% íntegro</strong> y no sufre rebajo económico.
                  </p>
                </div>
              )}

              {/* Motivo */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Motivo / Observación
                </label>
                <textarea
                  rows={2}
                  value={formMotivo}
                  onChange={(e) => setFormMotivo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  placeholder="Justificación del día libre..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalNuevo(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 font-bold hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black shadow-md shadow-purple-600/20 transition cursor-pointer"
                >
                  Confirmar y Generar
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* 6. MODAL VER PAPELETA OFICIAL DE DÍA LIBRE */}
      {papeletaVer && createPortal(
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-black/5 dark:bg-black/20 backdrop-blur-[1px] animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPapeletaVer(null);
          }}
        >
          <div className="relative w-full max-w-md bg-white dark:bg-[#0f172a] rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-xs max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="font-black text-sm text-purple-600 uppercase tracking-wide">
                SENDA SISTEMAS • TIENDA
              </span>
              <button
                type="button"
                onClick={() => setPapeletaVer(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center space-y-1">
              <h4 className="font-black text-base text-slate-900 dark:text-white">
                BOLETA DE DIA LIBRE SEMANAL
              </h4>
              <p className="text-[11px] text-slate-400">
                Código del Trabajo de Nicaragua • Art. 64 C.T.
              </p>
            </div>

            <div className="bg-purple-50 dark:bg-purple-950/60 p-4 rounded-2xl border border-purple-200 dark:border-purple-800 text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-purple-600 block">Día Libre Autorizado</span>
              <p className="text-2xl font-black text-purple-700 dark:text-purple-300">
                {papeletaVer.diaSemana}
              </p>
              <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">
                {papeletaVer.fecha}
              </p>
            </div>

            <div className="space-y-1.5 bg-slate-50 dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Colaborador:</span>
                <strong className="text-slate-900 dark:text-white">{papeletaVer.nombreEmpleado}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cargo / Depto:</span>
                <span>{papeletaVer.cargoEmpleado} ({papeletaVer.departamento})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tipo:</span>
                <span className="font-bold text-purple-600">{papeletaVer.tipo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Motivo:</span>
                <span className="text-right max-w-xs">{papeletaVer.motivo}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleDescargarPapeletaPDF(papeletaVer)}
                className="py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <FileDown className="w-4 h-4" />
                <span>Descargar PDF</span>
              </button>
              <button
                type="button"
                onClick={() => handleEnviarWhatsApp(papeletaVer)}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Enviar WhatsApp</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL DE CONFIRMACIÓN PARA ELIMINAR */}
      {eliminarItem && (
        <ConfirmModal
          isOpen={true}
          title="Eliminar Día Libre Programado"
          itemName={`${eliminarItem.nombreEmpleado} (${eliminarItem.diaSemana})`}
          message={`¿Estás seguro de eliminar el día libre de ${eliminarItem.nombreEmpleado} para el ${eliminarItem.diaSemana} (${eliminarItem.fecha})? Si fue a cuenta de vacaciones, el día será reintegrado a su saldo.`}
          onConfirm={handleConfirmarEliminar}
          onClose={() => setEliminarItem(null)}
          type="danger"
          confirmText="Eliminar Programación"
          cancelText="Cancelar"
        />
      )}
    </div>
  );
};
