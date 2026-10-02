import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarDays,
  DollarSign,
  Coffee,
  Plus,
  Users,
  CheckCircle2,
  Clock,
  Printer,
  FileDown,
  Trash2,
  X,
  Search,
  Filter,
  ShieldCheck,
  CalendarCheck,
  Sparkles,
  Palmtree,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Eye,
  Check,
  Receipt,
  FileText
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { ConfirmModal } from './ConfirmModal';
import { Empleado, RegistroFeriadoTrabajado, ModalidadCompensacionFeriado } from '../types';
import { 
  formatearCordobas, 
  obtenerFeriadosNicaragua, 
  calcularRemuneracionFeriado,
  FeriadoNicaInfo
} from '../utils/calculosNica';
import { obtenerDiaSemanaNica, DiaLibreSemanal } from './ModuloDiasLibres';

// Registros semilla de feriados trabajados
const FERIADOS_TRABAJADOS_INICIALES: RegistroFeriadoTrabajado[] = [
  {
    id: 'fer-1',
    numeroComprobante: 'FER-2026-001',
    empleadoId: 'emp-2',
    nombreEmpleado: 'María López Gutiérrez',
    cargoEmpleado: 'Cajera Principal',
    departamento: 'Caja y Ventas',
    fechaFeriado: '2026-09-14',
    nombreFeriado: 'Batalla de San Jacinto (Feriado Nacional)',
    horasTrabajadas: 8,
    modalidad: 'PAGAR_MONETARIO',
    salarioMensual: 13500,
    salarioDiario: 450,
    tasaRecargo: 100,
    montoAPagar: 900,
    estadoPago: 'Pagado',
    metodoPago: 'Planilla Quincenal',
    fechaPago: '2026-09-15',
    observaciones: 'Cobertura de caja durante turno especial por apertura de tienda en fecha patria.',
    autorizadoPor: 'Gerencia General',
    fechaRegistro: '2026-09-14'
  },
  {
    id: 'fer-2',
    numeroComprobante: 'FER-2026-002',
    empleadoId: 'emp-3',
    nombreEmpleado: 'Carlos Mendoza Jarquín',
    cargoEmpleado: 'Vendedor de Piso',
    departamento: 'Ventas (POS)',
    fechaFeriado: '2026-09-15',
    nombreFeriado: 'Independencia de Centroamérica (Feriado Nacional)',
    horasTrabajadas: 8,
    modalidad: 'DIA_LIBRE_COMPENSATORIO',
    salarioMensual: 11000,
    salarioDiario: 366.67,
    tasaRecargo: 100,
    montoAPagar: 733.34,
    estadoPago: 'Pendiente',
    fechaCompensatoriaAsignada: '2026-10-09',
    diaSemanaCompensatorio: 'Viernes',
    estadoCompensacion: 'Programado',
    observaciones: 'Acordado día libre compensatorio para el viernes posterior a quincena.',
    autorizadoPor: 'Gerencia General',
    fechaRegistro: '2026-09-15'
  },
  {
    id: 'fer-3',
    numeroComprobante: 'FER-2026-003',
    empleadoId: 'emp-4',
    nombreEmpleado: 'Andrea Morales Sequeira',
    cargoEmpleado: 'Encargada de Inventario y Bodega',
    departamento: 'Inventario',
    fechaFeriado: '2026-05-30',
    nombreFeriado: 'Día de la Madre Nicaragüense (Ley N° 1118)',
    horasTrabajadas: 8,
    modalidad: 'DIA_LIBRE_COMPENSATORIO',
    salarioMensual: 15000,
    salarioDiario: 500,
    tasaRecargo: 100,
    montoAPagar: 1000,
    estadoPago: 'Pendiente',
    fechaCompensatoriaAsignada: '2026-06-03',
    diaSemanaCompensatorio: 'Miércoles',
    estadoCompensacion: 'Disfrutado',
    fechaDisfrutado: '2026-06-03',
    observaciones: 'Recepción urgente de mercadería importada en bodega.',
    autorizadoPor: 'Gerencia General',
    fechaRegistro: '2026-05-30'
  }
];

interface ModuloFeriadosProps {
  empleadoPreseleccionadoId?: string;
  onCerrarModal?: () => void;
}

export const ModuloFeriados: React.FC<ModuloFeriadosProps> = ({
  empleadoPreseleccionadoId,
  onCerrarModal
}) => {
  const { empleados } = useData();
  const { usuarioActual } = useAuth();
  const { success, warning, error } = useToast();

  const esAdmin = usuarioActual?.rol === 'administrador';
  const anioActual = new Date().getFullYear();

  // Estados principales
  const [anioFiltro, setAnioFiltro] = useState<number>(anioActual);
  const [tabSubSeccion, setTabSubSeccion] = useState<'registros' | 'catalogo' | 'resumen'>('registros');

  // Lista de feriados oficiales para el año seleccionado
  const feriadosDelAnio = useMemo(() => {
    return obtenerFeriadosNicaragua(anioFiltro);
  }, [anioFiltro]);

  // Lista de registros de feriados trabajados (Persistencia en localStorage)
  const [registrosFeriados, setRegistrosFeriados] = useState<RegistroFeriadoTrabajado[]>(() => {
    const guardado = localStorage.getItem('sendavac_feriados_trabajados');
    if (guardado) {
      try {
        return JSON.parse(guardado);
      } catch (e) {
        console.error('Error al cargar feriados trabajados', e);
      }
    }
    return FERIADOS_TRABAJADOS_INICIALES;
  });

  useEffect(() => {
    localStorage.setItem('sendavac_feriados_trabajados', JSON.stringify(registrosFeriados));
  }, [registrosFeriados]);

  // Modales
  const [modalNuevo, setModalNuevo] = useState<boolean>(() => Boolean(empleadoPreseleccionadoId));
  const [comprobanteVer, setComprobanteVer] = useState<RegistroFeriadoTrabajado | null>(null);
  const [formatoImpresion, setFormatoImpresion] = useState<'pos' | 'carta'>('pos');
  const [eliminarItem, setEliminarItem] = useState<RegistroFeriadoTrabajado | null>(null);
  const [generandoPdf, setGenerandoPdf] = useState<boolean>(false);

  // Filtros de búsqueda
  const [busqueda, setBusqueda] = useState<string>('');
  const [filtroModalidad, setFiltroModalidad] = useState<'Todos' | 'PAGAR_MONETARIO' | 'DIA_LIBRE_COMPENSATORIO'>('Todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('Todos');

  // Formulario de Registro
  const [formEmpId, setFormEmpId] = useState<string>(() => {
    if (empleadoPreseleccionadoId) return empleadoPreseleccionadoId;
    if (usuarioActual && !esAdmin) return usuarioActual.id;
    return empleados[0]?.id || '';
  });

  // Empleado seleccionado en el formulario
  const empleadoSeleccionado = useMemo(() => {
    return empleados.find(e => e.id === formEmpId) || empleados[0];
  }, [empleados, formEmpId]);

  // Valores del formulario
  const [formFeriadoSeleccionado, setFormFeriadoSeleccionado] = useState<string>('');
  const [formFechaFeriado, setFormFechaFeriado] = useState<string>('');
  const [formEsFeriadoPersonalizado, setFormEsFeriadoPersonalizado] = useState<boolean>(false);
  const [formNombrePersonalizado, setFormNombrePersonalizado] = useState<string>('');
  const [formHoras, setFormHoras] = useState<number>(8);
  const [formModalidad, setFormModalidad] = useState<ModalidadCompensacionFeriado>('PAGAR_MONETARIO');
  
  // Opciones si es PAGAR
  const [formMetodoPago, setFormMetodoPago] = useState<'Efectivo' | 'Transferencia Bancaria' | 'Planilla Quincenal'>('Planilla Quincenal');
  const [formEstadoPago, setFormEstadoPago] = useState<'Pendiente' | 'Pagado' | 'En Planilla'>('Pendiente');
  const [formFechaPago, setFormFechaPago] = useState<string>(new Date().toISOString().slice(0, 10));

  // Opciones si es DÍA LIBRE COMPENSATORIO
  const [formTipoAsignacionLibre, setFormTipoAsignacionLibre] = useState<'fecha' | 'dia_semana' | 'por_acordar'>('fecha');
  const [formFechaCompensatoria, setFormFechaCompensatoria] = useState<string>('');
  const [formDiaSemanaCompensatorio, setFormDiaSemanaCompensatorio] = useState<'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo'>('Lunes');
  const [formEstadoCompensacion, setFormEstadoCompensacion] = useState<'Por Asignar' | 'Programado' | 'Disfrutado'>('Programado');

  const [formObservaciones, setFormObservaciones] = useState<string>('');

  // Sincronizar fecha compensatoria con día de la semana
  const handleCambioFechaCompensatoria = (f: string) => {
    setFormFechaCompensatoria(f);
    if (f) {
      setFormDiaSemanaCompensatorio(obtenerDiaSemanaNica(f));
    }
  };

  // Cálculo en vivo de remuneración para el modal
  const calculoRemuneracion = useMemo(() => {
    if (!empleadoSeleccionado) {
      return { salarioDiario: 0, valorHoraOrdinaria: 0, valorHoraFeriado: 0, montoAPagar: 0 };
    }
    return calcularRemuneracionFeriado(empleadoSeleccionado.salarioMensual || 0, formHoras);
  }, [empleadoSeleccionado, formHoras]);

  // Inicializar selección de feriado por defecto
  useEffect(() => {
    if (feriadosDelAnio.length > 0 && !formFeriadoSeleccionado) {
      const proximo = feriadosDelAnio[0];
      const mesStr = String(proximo.mes).padStart(2, '0');
      const diaStr = String(proximo.dia).padStart(2, '0');
      const fecha = `${anioFiltro}-${mesStr}-${diaStr}`;
      setFormFeriadoSeleccionado(proximo.descripcion);
      setFormFechaFeriado(fecha);
    }
  }, [feriadosDelAnio, anioFiltro, formFeriadoSeleccionado]);

  // Manejar cambio de feriado en el select
  const handleSelectFeriado = (descripcion: string) => {
    if (descripcion === '__OTRO__') {
      setFormEsFeriadoPersonalizado(true);
      setFormFeriadoSeleccionado('__OTRO__');
      setFormFechaFeriado(new Date().toISOString().slice(0, 10));
      return;
    }
    setFormEsFeriadoPersonalizado(false);
    setFormFeriadoSeleccionado(descripcion);
    const encontrado = feriadosDelAnio.find(f => f.descripcion === descripcion);
    if (encontrado) {
      const mesStr = String(encontrado.mes).padStart(2, '0');
      const diaStr = String(encontrado.dia).padStart(2, '0');
      setFormFechaFeriado(`${anioFiltro}-${mesStr}-${diaStr}`);
    }
  };

  // Abrir modal con feriado preseleccionado desde el catálogo
  const abrirRegistroConFeriado = (feriado: FeriadoNicaInfo) => {
    const mesStr = String(feriado.mes).padStart(2, '0');
    const diaStr = String(feriado.dia).padStart(2, '0');
    setFormEsFeriadoPersonalizado(false);
    setFormFeriadoSeleccionado(feriado.descripcion);
    setFormFechaFeriado(`${anioFiltro}-${mesStr}-${diaStr}`);
    setModalNuevo(true);
  };

  // Registrar en el Cuadrante de Días Libres Semanales si la modalidad es Día Libre Compensatorio
  const sincronizarConDiasLibresSemanales = (registro: RegistroFeriadoTrabajado) => {
    if (registro.modalidad !== 'DIA_LIBRE_COMPENSATORIO' || !registro.fechaCompensatoriaAsignada) {
      return undefined;
    }
    try {
      const guardados = localStorage.getItem('sendavac_dias_libres_semanales');
      let listaDiasLibres: DiaLibreSemanal[] = guardados ? JSON.parse(guardados) : [];

      const diaLibreId = `dl-comp-${Date.now()}`;
      const nuevoDiaLibre: DiaLibreSemanal = {
        id: diaLibreId,
        empleadoId: registro.empleadoId,
        nombreEmpleado: registro.nombreEmpleado,
        cargoEmpleado: registro.cargoEmpleado,
        departamento: registro.departamento,
        fecha: registro.fechaCompensatoriaAsignada,
        diaSemana: registro.diaSemanaCompensatorio || obtenerDiaSemanaNica(registro.fechaCompensatoriaAsignada),
        tipo: 'Compensatorio',
        estado: registro.estadoCompensacion === 'Disfrutado' ? 'Disfrutado' : 'Programado',
        motivo: `Día Libre Compensatorio por Feriado Laborado (${registro.nombreFeriado} del ${registro.fechaFeriado})`,
        fechaRegistro: new Date().toISOString().slice(0, 10),
        autorizadoPor: 'Gerencia General'
      };

      listaDiasLibres.push(nuevoDiaLibre);
      localStorage.setItem('sendavac_dias_libres_semanales', JSON.stringify(listaDiasLibres));
      return diaLibreId;
    } catch (e) {
      console.error('Error al sincronizar con días libres', e);
      return undefined;
    }
  };

  // Guardar nuevo registro
  const handleGuardarRegistro = (e: React.FormEvent) => {
    e.preventDefault();

    if (!empleadoSeleccionado) {
      warning('Seleccione un colaborador.');
      return;
    }

    const nombreFinalFeriado = formEsFeriadoPersonalizado 
      ? (formNombrePersonalizado.trim() || 'Feriado Especial Decretado')
      : formFeriadoSeleccionado;

    if (!formFechaFeriado) {
      warning('Indique la fecha en que se laboró el feriado.');
      return;
    }

    const folioNum = `FER-${anioFiltro}-${String(registrosFeriados.length + 1).padStart(3, '0')}`;
    const id = `fer-${Date.now()}`;

    let fechaCompAsignada = undefined;
    let diaSemComp = undefined;
    let estadoComp: 'Por Asignar' | 'Programado' | 'Disfrutado' = 'Por Asignar';

    if (formModalidad === 'DIA_LIBRE_COMPENSATORIO') {
      if (formTipoAsignacionLibre === 'fecha') {
        fechaCompAsignada = formFechaCompensatoria || undefined;
        diaSemComp = formFechaCompensatoria ? obtenerDiaSemanaNica(formFechaCompensatoria) : undefined;
        estadoComp = formEstadoCompensacion;
      } else if (formTipoAsignacionLibre === 'dia_semana') {
        diaSemComp = formDiaSemanaCompensatorio;
        estadoComp = 'Programado';
      }
    }

    const nuevoRegistro: RegistroFeriadoTrabajado = {
      id,
      numeroComprobante: folioNum,
      empleadoId: empleadoSeleccionado.id,
      nombreEmpleado: empleadoSeleccionado.nombre,
      cargoEmpleado: empleadoSeleccionado.cargo,
      departamento: empleadoSeleccionado.departamento || 'General',
      fechaFeriado: formFechaFeriado,
      nombreFeriado: nombreFinalFeriado,
      horasTrabajadas: Number(formHoras) || 8,
      modalidad: formModalidad,
      salarioMensual: empleadoSeleccionado.salarioMensual || 0,
      salarioDiario: calculoRemuneracion.salarioDiario,
      tasaRecargo: 100,
      montoAPagar: calculoRemuneracion.montoAPagar,
      estadoPago: formModalidad === 'PAGAR_MONETARIO' ? formEstadoPago : 'Pendiente',
      metodoPago: formModalidad === 'PAGAR_MONETARIO' ? formMetodoPago : undefined,
      fechaPago: formModalidad === 'PAGAR_MONETARIO' && formEstadoPago === 'Pagado' ? formFechaPago : undefined,
      fechaCompensatoriaAsignada: fechaCompAsignada,
      diaSemanaCompensatorio: diaSemComp,
      estadoCompensacion: formModalidad === 'DIA_LIBRE_COMPENSATORIO' ? estadoComp : undefined,
      fechaDisfrutado: estadoComp === 'Disfrutado' ? (fechaCompAsignada || new Date().toISOString().slice(0, 10)) : undefined,
      observaciones: formObservaciones.trim() || undefined,
      autorizadoPor: usuarioActual?.nombre || 'Gerencia General',
      fechaRegistro: new Date().toISOString().slice(0, 10)
    };

    // Sincronizar con el calendario de días libres si aplica
    if (nuevoRegistro.modalidad === 'DIA_LIBRE_COMPENSATORIO' && nuevoRegistro.fechaCompensatoriaAsignada) {
      const syncId = sincronizarConDiasLibresSemanales(nuevoRegistro);
      if (syncId) nuevoRegistro.diaLibreId = syncId;
    }

    setRegistrosFeriados(prev => [nuevoRegistro, ...prev]);

    success(
      nuevoRegistro.modalidad === 'PAGAR_MONETARIO'
        ? `Feriado registrado con pago doble: C$ ${nuevoRegistro.montoAPagar.toFixed(2)}`
        : `Feriado registrado con Día Libre Compensatorio asignado (${nuevoRegistro.diaSemanaCompensatorio || 'En otra fecha'}).`
    );

    setModalNuevo(false);
    setFormObservaciones('');
    if (onCerrarModal) onCerrarModal();
  };

  // Cambiar estado rápido
  const handleAlternarEstado = (registro: RegistroFeriadoTrabajado) => {
    const actualizados = registrosFeriados.map(item => {
      if (item.id !== registro.id) return item;

      if (item.modalidad === 'PAGAR_MONETARIO') {
        const nuevoEstado = item.estadoPago === 'Pagado' ? 'Pendiente' : 'Pagado';
        return {
          ...item,
          estadoPago: nuevoEstado as 'Pendiente' | 'Pagado',
          fechaPago: nuevoEstado === 'Pagado' ? new Date().toISOString().slice(0, 10) : undefined
        };
      } else {
        const nuevoEstado = item.estadoCompensacion === 'Disfrutado' ? 'Programado' : 'Disfrutado';
        return {
          ...item,
          estadoCompensacion: nuevoEstado as 'Programado' | 'Disfrutado',
          fechaDisfrutado: nuevoEstado === 'Disfrutado' ? new Date().toISOString().slice(0, 10) : undefined
        };
      }
    });

    setRegistrosFeriados(actualizados);
    success('Estado actualizado correctamente.');
  };

  // Eliminar registro
  const handleConfirmarEliminar = () => {
    if (!eliminarItem) return;
    setRegistrosFeriados(prev => prev.filter(r => r.id !== eliminarItem.id));
    setEliminarItem(null);
    success('Registro de feriado eliminado.');
  };

  // Filtrado de registros
  const registrosFiltrados = useMemo(() => {
    return registrosFeriados.filter(item => {
      // Filtrar por rol de colaborador si no es admin
      if (!esAdmin && item.empleadoId !== usuarioActual?.id) {
        return false;
      }

      // Filtro por modalidad
      if (filtroModalidad !== 'Todos' && item.modalidad !== filtroModalidad) {
        return false;
      }

      // Filtro por estado
      if (filtroEstado !== 'Todos') {
        if (item.modalidad === 'PAGAR_MONETARIO' && item.estadoPago !== filtroEstado) {
          return false;
        }
        if (item.modalidad === 'DIA_LIBRE_COMPENSATORIO' && item.estadoCompensacion !== filtroEstado) {
          return false;
        }
      }

      // Filtro de búsqueda
      if (busqueda.trim()) {
        const query = busqueda.toLowerCase();
        const coincideNombre = item.nombreEmpleado.toLowerCase().includes(query);
        const coincideFeriado = item.nombreFeriado.toLowerCase().includes(query);
        const coincideCargo = item.cargoEmpleado.toLowerCase().includes(query);
        const coincideFolio = item.numeroComprobante.toLowerCase().includes(query);
        return coincideNombre || coincideFeriado || coincideCargo || coincideFolio;
      }

      return true;
    });
  }, [registrosFeriados, esAdmin, usuarioActual, filtroModalidad, filtroEstado, busqueda]);

  // Métricas agregadas
  const metricas = useMemo(() => {
    const listado = esAdmin ? registrosFeriados : registrosFeriados.filter(r => r.empleadoId === usuarioActual?.id);
    
    let totalMontoPagado = 0;
    let totalMontoPendiente = 0;
    let diasLibresPendientes = 0;
    let diasLibresDisfrutados = 0;

    listado.forEach(r => {
      if (r.modalidad === 'PAGAR_MONETARIO') {
        if (r.estadoPago === 'Pagado') {
          totalMontoPagado += r.montoAPagar;
        } else {
          totalMontoPendiente += r.montoAPagar;
        }
      } else {
        if (r.estadoCompensacion === 'Disfrutado') {
          diasLibresDisfrutados += 1;
        } else {
          diasLibresPendientes += 1;
        }
      }
    });

    return {
      totalRegistros: listado.length,
      totalMontoPagado,
      totalMontoPendiente,
      diasLibresPendientes,
      diasLibresDisfrutados
    };
  }, [registrosFeriados, esAdmin, usuarioActual]);

  // Generador de PDF en formato Carta / A4 Oficial
  const descargarPdfOficial = (item: RegistroFeriadoTrabajado) => {
    try {
      setGenerandoPdf(true);
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Encabezado Corporativo SENDA
      doc.setFillColor(15, 39, 94); // Azul marino elegante
      doc.rect(0, 0, 210, 32, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('SENDA', 14, 15);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('CONTROL LABORAL Y GESTIÓN DE FERIADOS NACIONALES', 14, 21);
      doc.text('República de Nicaragua — Ley N° 185 (Código del Trabajo)', 14, 26);

      // Cuadro de folio
      doc.setFillColor(29, 99, 255);
      doc.roundedRect(140, 7, 56, 18, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('COMPROBANTE OFICIAL', 143, 14);
      doc.setFontSize(11);
      doc.text(item.numeroComprobante, 143, 21);

      // Título del documento
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      const tituloDoc = item.modalidad === 'PAGAR_MONETARIO'
        ? 'CONSTANCIA DE REMUNERACIÓN POR TRABAJO EN DÍA FERIADO'
        : 'BOLETA DE ASIGNACIÓN DE DÍA LIBRE COMPENSATORIO POR FERIADO';
      doc.text(tituloDoc, 14, 42);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 116, 139);
      doc.text('Conforme a los Artículos 66 y 67 del Código del Trabajo de Nicaragua.', 14, 47);

      // Tabla de Datos del Colaborador
      autoTable(doc, {
        startY: 52,
        theme: 'grid',
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        body: [
          [
            { content: 'Colaborador:', styles: { fontStyle: 'bold', cellWidth: 35 } },
            { content: item.nombreEmpleado },
            { content: 'Cargo:', styles: { fontStyle: 'bold', cellWidth: 30 } },
            { content: item.cargoEmpleado }
          ],
          [
            { content: 'Departamento:', styles: { fontStyle: 'bold' } },
            { content: item.departamento },
            { content: 'Fecha Registro:', styles: { fontStyle: 'bold' } },
            { content: item.fechaRegistro }
          ],
          [
            { content: 'Feriado Laborado:', styles: { fontStyle: 'bold' } },
            { content: item.nombreFeriado, colSpan: 3, styles: { textColor: [29, 99, 255], fontStyle: 'bold' } }
          ],
          [
            { content: 'Fecha del Feriado:', styles: { fontStyle: 'bold' } },
            { content: item.fechaFeriado },
            { content: 'Horas Laboradas:', styles: { fontStyle: 'bold' } },
            { content: `${item.horasTrabajadas} horas (Jornada Ordinaria)` }
          ]
        ]
      });

      // Detalle de la Compensación
      const finalY1 = (doc as any).lastAutoTable?.finalY || 95;

      if (item.modalidad === 'PAGAR_MONETARIO') {
        autoTable(doc, {
          startY: finalY1 + 5,
          theme: 'striped',
          head: [['CONCEPTO SALARIAL DE LEY', 'BASE DE CÁLCULO', 'RECARGO LEGAL', 'MONTO EN C$']],
          headStyles: { fillColor: [15, 39, 94], textColor: [255, 255, 255], fontStyle: 'bold' },
          styles: { fontSize: 9, cellPadding: 3.5 },
          body: [
            ['Salario Mensual Ordinario', `C$ ${item.salarioMensual.toLocaleString('es-NI', { minimumFractionDigits: 2 })}`, 'Base 30 días', '—'],
            ['Salario Diario Ordinario', `C$ ${item.salarioDiario.toFixed(2)}`, 'Jornada 8 hrs', '—'],
            [
              'Trabajo en Día Feriado Nacional (Art. 67 C.T.)',
              `${item.horasTrabajadas} horas laboradas`,
              '100% de Recargo (Pago Doble)',
              `C$ ${item.montoAPagar.toLocaleString('es-NI', { minimumFractionDigits: 2 })}`
            ],
            [
              { content: 'TOTAL NETO A PAGAR:', colSpan: 3, styles: { fontStyle: 'bold', halign: 'right' } },
              { content: `C$ ${item.montoAPagar.toLocaleString('es-NI', { minimumFractionDigits: 2 })}`, styles: { fontStyle: 'bold', textColor: [16, 149, 106] } }
            ]
          ]
        });

        const finalY2 = (doc as any).lastAutoTable?.finalY || 140;

        // Estado del Pago
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, finalY2 + 5, 182, 18, 2, 2, 'F');
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(`Estado del Pago: ${item.estadoPago.toUpperCase()}`, 18, finalY2 + 12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Método de Pago: ${item.metodoPago || 'Planilla Quincenal'} | Fecha de Efectividad: ${item.fechaPago || 'Próximo corte de planilla'}`, 18, finalY2 + 18);

      } else {
        // Detalle de Día Libre Compensatorio
        autoTable(doc, {
          startY: finalY1 + 5,
          theme: 'striped',
          head: [['MODALIDAD DE COMPENSACIÓN', 'DÍA SEMANA ASIGNADO', 'FECHA PROGRAMADA', 'ESTADO']],
          headStyles: { fillColor: [217, 119, 6], textColor: [255, 255, 255], fontStyle: 'bold' },
          styles: { fontSize: 9, cellPadding: 3.5 },
          body: [
            [
              'Día de Descanso Libre Compensatorio (Art. 67 C.T.)',
              item.diaSemanaCompensatorio || 'A convenir',
              item.fechaCompensatoriaAsignada || 'Por programar en cuadrante',
              item.estadoCompensacion?.toUpperCase() || 'PROGRAMADO'
            ]
          ]
        });

        const finalY2 = (doc as any).lastAutoTable?.finalY || 140;

        doc.setFillColor(254, 243, 199);
        doc.roundedRect(14, finalY2 + 5, 182, 22, 2, 2, 'F');
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(146, 64, 14);
        doc.text('DECLARACIÓN DE DESCANSO REMUNERADO CON SALARIO ÍNTEGRO:', 18, finalY2 + 12);
        doc.setFont('helvetica', 'normal');
        doc.text('El colaborador gozará de descanso efectivo sin deducción salarial alguna en sustitución de las labores', 18, finalY2 + 17);
        doc.text(`prestadas durante el feriado oficial "${item.nombreFeriado}".`, 18, finalY2 + 22);
      }

      // Observaciones
      const finalY3 = ((doc as any).lastAutoTable?.finalY || 160) + 30;
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('Observaciones del Turno / Justificación:', 14, finalY3);
      doc.setFont('helvetica', 'normal');
      doc.text(item.observaciones || 'Turno y compensación acordados conforme a la normativa legal vigente.', 14, finalY3 + 5);

      // Firmas de Responsabilidad
      const yFirmas = 240;
      doc.setDrawColor(148, 163, 184);
      doc.line(24, yFirmas, 84, yFirmas);
      doc.line(126, yFirmas, 186, yFirmas);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text('FIRMA DEL COLABORADOR', 32, yFirmas + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(item.nombreEmpleado, 32, yFirmas + 9);
      doc.text(`Cédula: Identificación de Personal`, 32, yFirmas + 13);

      doc.setFont('helvetica', 'bold');
      doc.text('RECURSOS HUMANOS / GERENCIA', 130, yFirmas + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(item.autorizadoPor || 'Gerencia General SENDA', 130, yFirmas + 9);
      doc.text('Sello y Visto Bueno', 130, yFirmas + 13);

      doc.save(`${item.numeroComprobante}_Feriado_${item.nombreEmpleado.replace(/\s+/g, '_')}.pdf`);
      success('Comprobante oficial descargado con éxito.');
    } catch (e) {
      console.error(e);
      error('Ocurrió un error al generar el PDF.');
    } finally {
      setGenerandoPdf(false);
    }
  };

  // Impresión en formato Ticket Térmico POS 80mm
  const imprimirTicketPOS = (item: RegistroFeriadoTrabajado) => {
    const ventana = window.open('', '_blank', 'width=350,height=600');
    if (!ventana) return;

    ventana.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Comprobante ${item.numeroComprobante}</title>
          <style>
            @page { margin: 0; size: 80mm auto; }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 11px;
              line-height: 1.35;
              width: 72mm;
              margin: 4mm auto;
              color: #000;
              padding: 0;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .title { font-size: 14px; font-weight: bold; }
            .badge {
              border: 1px solid #000;
              padding: 2px 4px;
              display: inline-block;
              font-size: 10px;
              margin-top: 4px;
            }
            .firma-box {
              margin-top: 25px;
              text-align: center;
              border-top: 1px solid #000;
              padding-top: 4px;
            }
          </style>
        </head>
        <body>
          <div class="text-center">
            <div class="title">TIENDA SENDA</div>
            <div>GESTIÓN LABORAL Y NÓMINA</div>
            <div>NICARAGUA — LEY N° 185</div>
            <div class="divider"></div>
            <div class="bold">COMPROBANTE DE FERIADO</div>
            <div class="bold">${item.numeroComprobante}</div>
          </div>
          <div class="divider"></div>
          <div><span class="bold">COLABORADOR:</span> ${item.nombreEmpleado}</div>
          <div><span class="bold">CARGO:</span> ${item.cargoEmpleado}</div>
          <div><span class="bold">DEPTO:</span> ${item.departamento}</div>
          <div><span class="bold">FECHA REG:</span> ${item.fechaRegistro}</div>
          <div class="divider"></div>
          <div><span class="bold">FERIADO:</span> ${item.nombreFeriado}</div>
          <div><span class="bold">FECHA TRABAJADA:</span> ${item.fechaFeriado}</div>
          <div><span class="bold">HORAS:</span> ${item.horasTrabajadas} hrs</div>
          <div class="divider"></div>
          <div class="text-center bold">
            MODALIDAD ART. 67 C.T.
          </div>
          ${
            item.modalidad === 'PAGAR_MONETARIO'
              ? `
              <div class="divider"></div>
              <div>Salario Mensual: C$ ${item.salarioMensual.toFixed(2)}</div>
              <div>Salario Diario: C$ ${item.salarioDiario.toFixed(2)}</div>
              <div>Recargo Ley: 100% (Pago Doble)</div>
              <div class="divider"></div>
              <div class="bold text-right" style="font-size: 13px;">
                TOTAL A PAGAR: C$ ${item.montoAPagar.toFixed(2)}
              </div>
              <div class="divider"></div>
              <div>Estado: ${item.estadoPago}</div>
              <div>Método: ${item.metodoPago || 'Planilla'}</div>
              <div>Fecha Pago: ${item.fechaPago || 'Próximo corte'}</div>
            `
              : `
              <div class="divider"></div>
              <div class="bold">DÍA LIBRE COMPENSATORIO</div>
              <div>Día de la Semana: ${item.diaSemanaCompensatorio || 'Por acordar'}</div>
              <div>Fecha Asignada: ${item.fechaCompensatoriaAsignada || 'En cuadrante'}</div>
              <div>Estado: ${item.estadoCompensacion}</div>
              <div class="divider"></div>
              <div style="font-size: 10px;">Descanso remunerado con 100% de salario íntegro sin descuentos.</div>
            `
          }
          <div class="divider"></div>
          <div><span class="bold">AUTORIZADO POR:</span> ${item.autorizadoPor}</div>
          ${item.observaciones ? `<div><span class="bold">OBS:</span> ${item.observaciones}</div>` : ''}

          <div class="firma-box">
            Firma del Colaborador
            <br>
            <span style="font-size: 9px;">Conforme Art. 67 Código del Trabajo</span>
          </div>

          <div class="firma-box">
            Recursos Humanos / Administración
            <br>
            <span style="font-size: 9px;">Senda Retail Nicaragua</span>
          </div>

          <div style="margin-top: 15px; font-size: 9px; text-align: center;">
            Documento de control interno auditado
          </div>
        </body>
      </html>
    `);

    ventana.document.close();
    ventana.focus();
    setTimeout(() => {
      ventana.print();
    }, 350);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. ENCABEZADO CON BADGE Y BOTONES DE ACCIÓN */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-blue-900/10 via-indigo-900/10 to-amber-900/10 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-amber-950/40 p-4 sm:p-6 rounded-2xl border border-blue-200/60 dark:border-blue-800/40 backdrop-blur-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="bg-blue-600 text-white text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
              <Sparkles className="w-3 h-3" />
              Nicaragua Art. 66 y 67 C.T.
            </span>
            <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
              Pago Doble o Día Libre Compensatorio
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Palmtree className="w-6 h-6 text-amber-500 shrink-0" />
            Gestión de Días Feriados y Compensación
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            Control de labores en días feriados oficiales de Nicaragua. Registre si el colaborador labora el feriado para <strong className="text-slate-900 dark:text-white">pagárselo al 100% de recargo (doble)</strong> o <strong className="text-slate-900 dark:text-white">otorgarle un día libre compensatorio</strong> en otra fecha o día de la semana.
          </p>
        </div>

        {/* Acciones del encabezado */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* Selector de Año */}
          <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-1.5 shadow-xs">
            <CalendarDays className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <select
              value={anioFiltro}
              onChange={e => setAnioFiltro(Number(e.target.value))}
              aria-label="Seleccionar año para filtrar feriados"
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-white focus:outline-hidden cursor-pointer"
            >
              {[anioActual - 1, anioActual, anioActual + 1].map(a => (
                <option key={a} value={a} className="dark:bg-slate-900">{a}</option>
              ))}
            </select>
          </div>

          {esAdmin && (
            <button
              type="button"
              onClick={() => {
                setFormEsFeriadoPersonalizado(false);
                setModalNuevo(true);
              }}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Feriado Laborado</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. TARJETAS DE MÉTRICAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Feriados del Año */}
        <div className="bg-white dark:bg-[#0c1222] p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Feriados del Año
            </p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              {feriadosDelAnio.length}
            </p>
            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
              Descanso obligatorio
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Palmtree className="w-5 h-5" />
          </div>
        </div>

        {/* Feriados Trabajados */}
        <div className="bg-white dark:bg-[#0c1222] p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Feriados Trabajados
            </p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              {metricas.totalRegistros}
            </p>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
              Turnos registrados
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Total Pagado en C$ */}
        <div className="bg-white dark:bg-[#0c1222] p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total C$ Pagado (Doble)
            </p>
            <p className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              C$ {metricas.totalMontoPagado.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
              {metricas.totalMontoPendiente > 0 ? `+ C$ ${metricas.totalMontoPendiente.toFixed(2)} pend.` : '100% al día'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Días Libres Compensatorios */}
        <div className="bg-white dark:bg-[#0c1222] p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Días Compensatorios
            </p>
            <p className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {metricas.diasLibresPendientes} <span className="text-xs font-normal text-slate-400">pend.</span>
            </p>
            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
              {metricas.diasLibresDisfrutados} ya disfrutado(s)
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Coffee className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. TABS SUB-SECCIONES */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setTabSubSeccion('registros')}
          className={`pb-3 text-xs sm:text-sm font-extrabold flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
            tabSubSeccion === 'registros'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Feriados Trabajados y Compensación ({registrosFiltrados.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTabSubSeccion('catalogo')}
          className={`pb-3 text-xs sm:text-sm font-extrabold flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
            tabSubSeccion === 'catalogo'
              ? 'border-amber-600 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Calendario Oficial de Feriados ({anioFiltro})</span>
        </button>

        <button
          type="button"
          onClick={() => setTabSubSeccion('resumen')}
          className={`pb-3 text-xs sm:text-sm font-extrabold flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
            tabSubSeccion === 'resumen'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Normativa Legal Art. 66 y 67 C.T.</span>
        </button>
      </div>

      {/* 4. CONTENIDO DE PESTAÑAS */}

      {/* PESTAÑA A: REGISTROS DE FERIADOS TRABAJADOS */}
      {tabSubSeccion === 'registros' && (
        <div className="space-y-4">
          {/* Barra de Filtros y Búsqueda */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between bg-white dark:bg-[#0c1222] p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por colaborador, feriado, folio o cargo..."
                className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Filtro Modalidad */}
              <select
                value={filtroModalidad}
                onChange={e => setFiltroModalidad(e.target.value as any)}
                aria-label="Filtrar por modalidad de compensación"
                className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
              >
                <option value="Todos">Todas las modalidades</option>
                <option value="PAGAR_MONETARIO">Pagados en C$ (Doble)</option>
                <option value="DIA_LIBRE_COMPENSATORIO">Días Libres Compensatorios</option>
              </select>

              {/* Filtro Estado */}
              <select
                value={filtroEstado}
                onChange={e => setFiltroEstado(e.target.value)}
                aria-label="Filtrar por estado"
                className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
              >
                <option value="Todos">Todos los estados</option>
                <option value="Pagado">Pagados</option>
                <option value="Pendiente">Pendientes de Pago</option>
                <option value="Programado">Día Libre Programado</option>
                <option value="Disfrutado">Día Libre Disfrutado</option>
              </select>
            </div>
          </div>

          {/* Listado de Registros */}
          {registrosFiltrados.length === 0 ? (
            <div className="text-center py-14 bg-white dark:bg-[#0c1222] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-8">
              <Palmtree className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No se encontraron registros de feriados trabajados
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No hay registros con los filtros seleccionados. Puede registrar un colaborador que haya laborado en un día feriado usando el botón superior.
              </p>
              {esAdmin && (
                <button
                  type="button"
                  onClick={() => setModalNuevo(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Registrar Feriado Laborado
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#0c1222] rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="py-3 px-4">Folio / Fecha</th>
                      <th className="py-3 px-4">Colaborador</th>
                      <th className="py-3 px-4">Feriado Laborado</th>
                      <th className="py-3 px-4">Modalidad (Art. 67)</th>
                      <th className="py-3 px-4">Compensación / Pago</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {registrosFiltrados.map(item => {
                      const esPago = item.modalidad === 'PAGAR_MONETARIO';

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition">
                          {/* Folio y Fecha Registro */}
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 block">
                              {item.numeroComprobante}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Reg: {item.fechaRegistro}
                            </span>
                          </td>

                          {/* Colaborador */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {item.nombreEmpleado}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {item.cargoEmpleado} • {item.departamento}
                            </div>
                          </td>

                          {/* Feriado Laborado */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Palmtree className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span>{item.nombreFeriado}</span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Laborado: <strong className="text-slate-700 dark:text-slate-300">{item.fechaFeriado}</strong> ({item.horasTrabajadas}h)
                            </div>
                          </td>

                          {/* Modalidad */}
                          <td className="py-3 px-4">
                            {esPago ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-md text-[11px] border border-emerald-200 dark:border-emerald-800">
                                <DollarSign className="w-3 h-3" />
                                Pago Doble (100%)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 font-bold px-2 py-0.5 rounded-md text-[11px] border border-amber-200 dark:border-amber-800">
                                <Coffee className="w-3 h-3" />
                                Día Libre Compensatorio
                              </span>
                            )}
                          </td>

                          {/* Compensación / Pago */}
                          <td className="py-3 px-4">
                            {esPago ? (
                              <div>
                                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                                  C$ {item.montoAPagar.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                                </span>
                                <div className="text-[10px] text-slate-400">
                                  Diario C$ {item.salarioDiario.toFixed(2)} x 2
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  {item.diaSemanaCompensatorio || 'Por acordar'}
                                </span>
                                <div className="text-[11px] text-slate-500">
                                  {item.fechaCompensatoriaAsignada ? `Fecha: ${item.fechaCompensatoriaAsignada}` : 'En cuadrante de turnos'}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Estado */}
                          <td className="py-3 px-4">
                            {esPago ? (
                              item.estadoPago === 'Pagado' ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 font-bold px-2.5 py-0.5 rounded-full text-[11px]">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Pagado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 font-bold px-2.5 py-0.5 rounded-full text-[11px]">
                                  <Clock className="w-3 h-3" />
                                  Pendiente Pago
                                </span>
                              )
                            ) : (
                              item.estadoCompensacion === 'Disfrutado' ? (
                                <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200 font-bold px-2.5 py-0.5 rounded-full text-[11px]">
                                  <Check className="w-3 h-3" />
                                  Ya Disfrutado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200 font-bold px-2.5 py-0.5 rounded-full text-[11px]">
                                  <CalendarCheck className="w-3 h-3" />
                                  Programado
                                </span>
                              )
                            )}
                          </td>

                          {/* Acciones */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Ver / Imprimir Comprobante */}
                              <button
                                type="button"
                                onClick={() => setComprobanteVer(item)}
                                title="Ver comprobante e imprimir"
                                className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Imprimir Ticket Directo */}
                              <button
                                type="button"
                                onClick={() => imprimirTicketPOS(item)}
                                title="Imprimir ticket POS (80mm)"
                                className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              {/* Alternar estado (Marcar como pagado o disfrutado) */}
                              {esAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleAlternarEstado(item)}
                                  title={esPago ? 'Alternar Pagado / Pendiente' : 'Alternar Disfrutado / Programado'}
                                  className="p-1.5 text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition cursor-pointer"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                              )}

                              {/* Eliminar */}
                              {esAdmin && (
                                <button
                                  type="button"
                                  onClick={() => setEliminarItem(item)}
                                  title="Eliminar registro"
                                  className="p-1.5 text-rose-500 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
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
      )}

      {/* PESTAÑA B: CATÁLOGO DE FERIADOS OFICIALES */}
      {tabSubSeccion === 'catalogo' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#0c1222] p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-blue-600" />
                Calendario de Días Feriados Nacionales de Nicaragua ({anioFiltro})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Días de descanso obligatorio con goce de salario según el Artículo 66 del Código del Trabajo y Ley N° 1118.
              </p>
            </div>

            {esAdmin && (
              <button
                type="button"
                onClick={() => {
                  setFormEsFeriadoPersonalizado(true);
                  setFormNombrePersonalizado('');
                  setModalNuevo(true);
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                Registrar Feriado Especial / Decretado
              </button>
            )}
          </div>

          {/* Grilla de Feriados del Año */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {feriadosDelAnio.map((feriado, idx) => {
              const mesStr = String(feriado.mes).padStart(2, '0');
              const diaStr = String(feriado.dia).padStart(2, '0');
              const fechaStr = `${anioFiltro}-${mesStr}-${diaStr}`;
              const fechaObj = new Date(anioFiltro, feriado.mes - 1, feriado.dia);
              const diaSemana = obtenerDiaSemanaNica(fechaStr);

              // Conteo de colaboradores que laboraron este feriado
              const colaboradoresQueLaboraron = registrosFeriados.filter(
                r => r.fechaFeriado === fechaStr || r.nombreFeriado.includes(feriado.descripcion)
              );

              return (
                <div
                  key={`${feriado.mes}-${feriado.dia}-${idx}`}
                  className="bg-white dark:bg-[#0c1222] p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs flex flex-col justify-between hover:border-blue-300 dark:hover:border-blue-700 transition"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        feriado.aplicaNacional
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}>
                        {feriado.aplicaNacional ? 'Feriado Nacional' : 'Feriado Managua'}
                      </span>

                      <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
                        {diaSemana}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Palmtree className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>{feriado.descripcion}</span>
                    </h3>

                    <p className="text-lg font-black text-blue-600 dark:text-blue-400 mt-2">
                      {feriado.dia} de {
                        ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][feriado.mes - 1]
                      }
                    </p>

                    {/* Resumen de colaboradores que laboraron */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Colaboradores laborando:</span>
                      <span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        {colaboradoresQueLaboraron.length}
                      </span>
                    </div>
                  </div>

                  {esAdmin && (
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                      <button
                        type="button"
                        onClick={() => abrirRegistroConFeriado(feriado)}
                        className="w-full py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Registrar Quién Laboró</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PESTAÑA C: GUÍA LEGAL ART. 66 Y 67 */}
      {tabSubSeccion === 'resumen' && (
        <div className="bg-white dark:bg-[#0c1222] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-6">
          <div>
            <span className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
              Legislación Laboral de la República de Nicaragua
            </span>
            <h2 className="text-lg font-black text-slate-900 dark:text-white mt-2">
              Código del Trabajo de Nicaragua (Ley N° 185) — Artículos 66 y 67
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Normativa legal que rige el descanso en días feriados y el tratamiento del trabajo extraordinario y obligatorio.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Artículo 66 */}
            <div className="bg-slate-50 dark:bg-slate-900/70 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                Artículo 66 — Días de Descanso Obligatorio
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                «Son días de descanso obligatorio con goce de salario los feriados nacionales: 1 de Enero, Jueves y Viernes Santo, 1 de Mayo, 30 de Mayo (Día de la Madre - Ley 1118), 19 de Julio, 14 y 15 de Septiembre, 8 de Diciembre y 25 de Diciembre. En la ciudad de Managua, además, el 1 y 10 de Agosto».
              </p>
              <div className="bg-blue-100/50 dark:bg-blue-950/40 p-2.5 rounded-lg text-[11px] text-blue-800 dark:text-blue-300">
                <strong>Efecto en Nómina:</strong> No se realiza ningún descuento al colaborador por descansar en estos días; su salario mensual comercial permanece íntegro y protegido.
              </div>
            </div>

            {/* Artículo 67 */}
            <div className="bg-slate-50 dark:bg-slate-900/70 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
                <DollarSign className="w-4 h-4" />
                Artículo 67 — Remuneración o Compensación
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                «El trabajo en día de descanso obligatorio o feriado nacional se remunerará con el doble del salario ordinario que corresponda a la jornada ordinaria de trabajo, o se compensará con un día de descanso en la semana subsiguiente o en la fecha acordada entre las partes».
              </p>
              <div className="bg-amber-100/50 dark:bg-amber-950/40 p-2.5 rounded-lg text-[11px] text-amber-800 dark:text-amber-300">
                <strong>Opciones de la Empresa:</strong>
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  <li><strong>Opción 1:</strong> Pagar el salario diario con 100% de recargo (doble del valor de la jornada).</li>
                  <li><strong>Opción 2:</strong> Otorgar un día libre compensatorio en otra fecha o día de la semana fijado.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: REGISTRAR FERIADO LABORADO */}
      {modalNuevo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#0c1222] w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6 animate-scaleIn">
            {/* Cabecera del Modal */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                  Art. 66 y 67 Código del Trabajo
                </span>
                <h3 className="text-base sm:text-lg font-black mt-1 flex items-center gap-2">
                  <Palmtree className="w-5 h-5 text-amber-300" />
                  Registrar Colaborador que Labora Feriado
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalNuevo(false)}
                className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleGuardarRegistro} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* 1. Seleccionar Colaborador */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  1. Colaborador que Laboró el Feriado:
                </label>
                <select
                  value={formEmpId}
                  onChange={e => setFormEmpId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden"
                >
                  {empleados.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nombre} — {emp.cargo} ({emp.departamento || 'General'})
                    </option>
                  ))}
                </select>

                {empleadoSeleccionado && (
                  <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span>Salario Mensual: <strong>C$ {empleadoSeleccionado.salarioMensual?.toLocaleString('es-NI')}</strong></span>
                    <span>•</span>
                    <span>Salario Diario: <strong>C$ {((empleadoSeleccionado.salarioMensual || 0) / 30).toFixed(2)}</strong></span>
                  </div>
                )}
              </div>

              {/* 2. Seleccionar Feriado y Fecha */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    2. Feriado Oficial:
                  </label>
                  <select
                    value={formFeriadoSeleccionado}
                    onChange={e => handleSelectFeriado(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-hidden"
                  >
                    {feriadosDelAnio.map((f, i) => (
                      <option key={i} value={f.descripcion}>
                        {f.dia}/{f.mes} - {f.descripcion}
                      </option>
                    ))}
                    <option value="__OTRO__">+ Otro feriado especial / decreto</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Fecha del Feriado Laborado:
                  </label>
                  <input
                    type="date"
                    value={formFechaFeriado}
                    onChange={e => setFormFechaFeriado(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-hidden"
                  />
                </div>
              </div>

              {formEsFeriadoPersonalizado && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nombre del Feriado Especial / Asueto Decretado:
                  </label>
                  <input
                    type="text"
                    value={formNombrePersonalizado}
                    onChange={e => setFormNombrePersonalizado(e.target.value)}
                    placeholder="Ej. Asueto a cuenta de vacaciones MITRAB..."
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-hidden"
                  />
                </div>
              )}

              {/* 3. Horas trabajadas */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Horas Laboradas en el Feriado:
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="16"
                    value={formHoras}
                    onChange={e => setFormHoras(Number(e.target.value))}
                    className="w-24 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-hidden"
                  />
                  <span className="text-xs text-slate-500">
                    {formHoras === 8 ? 'Jornada completa ordinaria de 8 horas' : `Jornada proporcional (${formHoras} horas)`}
                  </span>
                </div>
              </div>

              {/* 4. SELECCIÓN DE MODALIDAD DE COMPENSACIÓN (Art. 67 C.T.) */}
              <div className="pt-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white mb-2">
                  3. Modalidad de Compensación (Art. 67 Código del Trabajo):
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Opción A: Pagárselo */}
                  <label
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                      formModalidad === 'PAGAR_MONETARIO'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4" />
                          OPCIÓN 1: PAGÁRSELO
                        </span>
                        <input
                          type="radio"
                          name="modalidad"
                          checked={formModalidad === 'PAGAR_MONETARIO'}
                          onChange={() => setFormModalidad('PAGAR_MONETARIO')}
                          className="accent-emerald-600"
                        />
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                        Remuneración con el <strong>doble del salario ordinario (100% de recargo legal)</strong>.
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-emerald-200 dark:border-emerald-800 text-xs">
                      <span className="text-slate-500">Total a pagar:</span>{' '}
                      <strong className="text-emerald-700 dark:text-emerald-300 text-sm">
                        C$ {calculoRemuneracion.montoAPagar.toFixed(2)}
                      </strong>
                    </div>
                  </label>

                  {/* Opción B: Dárselo libre */}
                  <label
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                      formModalidad === 'DIA_LIBRE_COMPENSATORIO'
                        ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                          <Coffee className="w-4 h-4" />
                          OPCIÓN 2: DÁRSELO LIBRE
                        </span>
                        <input
                          type="radio"
                          name="modalidad"
                          checked={formModalidad === 'DIA_LIBRE_COMPENSATORIO'}
                          onChange={() => setFormModalidad('DIA_LIBRE_COMPENSATORIO')}
                          className="accent-amber-600"
                        />
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                        Compensar con un <strong>día libre remunerado en otra fecha o día de la semana</strong>.
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-amber-200 dark:border-amber-800 text-xs">
                      <span className="text-slate-500">Beneficio:</span>{' '}
                      <strong className="text-amber-700 dark:text-amber-300 text-xs">
                        1 Día de Descanso Pleno
                      </strong>
                    </div>
                  </label>
                </div>
              </div>

              {/* Sub-formulario si la opción es PAGAR_MONETARIO */}
              {formModalidad === 'PAGAR_MONETARIO' && (
                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Método de Pago:
                      </label>
                      <select
                        value={formMetodoPago}
                        onChange={e => setFormMetodoPago(e.target.value as any)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs font-semibold"
                      >
                        <option value="Planilla Quincenal">En Planilla Quincenal</option>
                        <option value="Efectivo">Efectivo Inmediato</option>
                        <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Estado del Pago:
                      </label>
                      <select
                        value={formEstadoPago}
                        onChange={e => setFormEstadoPago(e.target.value as any)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs font-semibold"
                      >
                        <option value="Pendiente">Pendiente</option>
                        <option value="Pagado">Ya Pagado</option>
                        <option value="En Planilla">Incluido en Planilla</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Fecha Efectividad:
                      </label>
                      <input
                        type="date"
                        value={formFechaPago}
                        onChange={e => setFormFechaPago(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-formulario si la opción es DÍA LIBRE COMPENSATORIO */}
              {formModalidad === 'DIA_LIBRE_COMPENSATORIO' && (
                <div className="bg-amber-50/50 dark:bg-amber-950/20 p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/60 space-y-3">
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-800 dark:text-slate-200 flex-wrap">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="tipoAsignacionLibre"
                        checked={formTipoAsignacionLibre === 'fecha'}
                        onChange={() => setFormTipoAsignacionLibre('fecha')}
                        className="accent-amber-600"
                      />
                      <span>En una fecha específica</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="tipoAsignacionLibre"
                        checked={formTipoAsignacionLibre === 'dia_semana'}
                        onChange={() => setFormTipoAsignacionLibre('dia_semana')}
                        className="accent-amber-600"
                      />
                      <span>En un día fijo de la semana</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="tipoAsignacionLibre"
                        checked={formTipoAsignacionLibre === 'por_acordar'}
                        onChange={() => setFormTipoAsignacionLibre('por_acordar')}
                        className="accent-amber-600"
                      />
                      <span>Por acordar posteriormente</span>
                    </label>
                  </div>

                  {formTipoAsignacionLibre === 'fecha' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Fecha en que gozará del día libre:
                        </label>
                        <input
                          type="date"
                          value={formFechaCompensatoria}
                          onChange={e => handleCambioFechaCompensatoria(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Día de la Semana Correspondiente:
                        </label>
                        <div className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-amber-700 dark:text-amber-400">
                          {formDiaSemanaCompensatorio}
                        </div>
                      </div>
                    </div>
                  )}

                  {formTipoAsignacionLibre === 'dia_semana' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Día de la semana fijado para su día libre:
                      </label>
                      <select
                        value={formDiaSemanaCompensatorio}
                        onChange={e => setFormDiaSemanaCompensatorio(e.target.value as any)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-bold"
                      >
                        {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5 pt-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Se sincronizará automáticamente con el cuadrante semanal de días libres de tienda.</span>
                  </div>
                </div>
              )}

              {/* 5. Observaciones */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Observaciones / Justificación del Turno:
                </label>
                <textarea
                  rows={2}
                  value={formObservaciones}
                  onChange={e => setFormObservaciones(e.target.value)}
                  placeholder="Ej. Apoyo en apertura especial de tienda por temporada..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-800 dark:text-white focus:outline-hidden"
                />
              </div>

              {/* Botones de acción del Modal */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalNuevo(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar Registro Oficial</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL VISOR E IMPRESIÓN DE COMPROBANTE / BOLETA */}
      {comprobanteVer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#0c1222] w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6 animate-scaleIn">
            {/* Cabecera */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                  Folio: {comprobanteVer.numeroComprobante}
                </span>
                <h3 className="text-base font-black mt-1">
                  Comprobante Oficial de Feriado Laborado
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setComprobanteVer(null)}
                className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector de Formato de Impresión */}
            <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Formato de Impresión:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormatoImpresion('pos')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      formatoImpresion === 'pos'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Ticket POS (80mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormatoImpresion('carta')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      formatoImpresion === 'carta'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Formato Carta / PDF
                  </button>
                </div>
              </div>

              {/* Vista Previa */}
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="font-bold text-slate-500">Colaborador:</span>
                  <span className="font-black text-slate-900 dark:text-white">{comprobanteVer.nombreEmpleado}</span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="font-bold text-slate-500">Feriado Nacional:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{comprobanteVer.nombreFeriado}</span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="font-bold text-slate-500">Fecha Laborada:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{comprobanteVer.fechaFeriado} ({comprobanteVer.horasTrabajadas} hrs)</span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="font-bold text-slate-500">Modalidad Art. 67:</span>
                  <span className="font-black text-slate-900 dark:text-white">
                    {comprobanteVer.modalidad === 'PAGAR_MONETARIO' ? 'Pago Doble (100% Recargo)' : 'Día Libre Compensatorio'}
                  </span>
                </div>

                {comprobanteVer.modalidad === 'PAGAR_MONETARIO' ? (
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-800 dark:text-emerald-300 font-bold">Monto Total a Pagar:</span>
                      <span className="text-base font-black text-emerald-700 dark:text-emerald-300">
                        C$ {comprobanteVer.montoAPagar.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">
                      Estado: {comprobanteVer.estadoPago} • Método: {comprobanteVer.metodoPago || 'Planilla'}
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800/60">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-800 dark:text-amber-300 font-bold">Día Libre Asignado:</span>
                      <span className="text-sm font-black text-amber-700 dark:text-amber-300">
                        {comprobanteVer.diaSemanaCompensatorio || 'Por acordar'}
                      </span>
                    </div>
                    <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                      Fecha: {comprobanteVer.fechaCompensatoriaAsignada || 'En cuadrante'} • Estado: {comprobanteVer.estadoCompensacion}
                    </div>
                  </div>
                )}
              </div>

              {/* Botones de Impresión */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => imprimirTicketPOS(comprobanteVer)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Ticket POS (80mm)</span>
                </button>

                <button
                  type="button"
                  onClick={() => descargarPdfOficial(comprobanteVer)}
                  disabled={generandoPdf}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  <FileDown className="w-4 h-4" />
                  <span>{generandoPdf ? 'Generando PDF...' : 'Descargar Carta Oficial (PDF)'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL CONFIRMAR ELIMINACIÓN */}
      <ConfirmModal
        isOpen={eliminarItem !== null}
        onClose={() => setEliminarItem(null)}
        onConfirm={handleConfirmarEliminar}
        title="¿Eliminar Registro de Feriado?"
        itemName={eliminarItem?.nombreEmpleado}
        message={`¿Está seguro de que desea eliminar el registro de feriado "${eliminarItem?.nombreFeriado}" para ${eliminarItem?.nombreEmpleado}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar Registro"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
};
