import React, { useState, useEffect, useRef } from 'react';
import { 
  CalendarCheck, 
  CalendarClock, 
  DollarSign, 
  Users, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Printer, 
  Trash2, 
  X, 
  Receipt, 
  FileText, 
  CalendarDays,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Eye,
  Calculator,
  Timer,
  Download,
  Coffee,
  Palmtree,
  History,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { ConfirmModal } from './ConfirmModal';
import { 
  formatearCordobas, 
  calcularLiquidacionMonetaria,
  obtenerHistorialDescansosEmpleado,
  calcularResumenHistorialDescansos,
  exportarHistorialDescansosPDF
} from '../utils/calculosNica';
import { ModuloDiasLibres } from './ModuloDiasLibres';
import { ModuloFeriados } from './ModuloFeriados';
import { ModalHistorialDescansos } from './ModalHistorialDescansos';
import { createPortal } from 'react-dom';

export interface DescansoProgramado {
  id: string;
  empleadoId: string;
  nombreEmpleado: string;
  cargoEmpleado: string;
  departamento: string;
  fechaInicio: string;
  fechaFin: string;
  diasDescanso: number;
  tipo: 'Semestral (15 días)' | 'Fraccionado' | 'Compensatorio';
  estado: 'Programado' | 'En Curso' | 'Completado';
  observaciones?: string;
  fechaRegistro: string;
}

export interface VacacionPagada {
  id: string;
  numeroRecibo: string;
  empleadoId: string;
  nombreEmpleado: string;
  cargoEmpleado: string;
  salarioMensual: number;
  salarioDiario: number;
  diasPagados: number;
  totalPagado: number;
  fechaPago: string;
  metodoPago: 'Efectivo' | 'Transferencia Bancaria' | 'Cheque';
  observaciones?: string;
}

export interface RegistroHorasExtras {
  id: string;
  numeroComprobante: string;
  empleadoId: string;
  nombreEmpleado: string;
  cargoEmpleado: string;
  departamento: string;
  salarioMensual: number;
  valorHoraOrdinaria: number; // salarioMensual / 240
  valorHoraExtra: number; // valorHoraOrdinaria * 2 (100% recargo Art. 58 C.T.)
  horasExtras: number;
  periodoTipo: 'Semanal' | 'Quincenal' | 'Mensual';
  fechaInicioPeriodo: string;
  fechaFinPeriodo: string;
  totalPagar: number;
  fechaRegistro: string;
  estado: 'Pendiente' | 'Aprobado' | 'Pagado';
  observaciones?: string;
}

// Datos semilla de descansos programables
const DESCANSOS_INICIALES: DescansoProgramado[] = [
  {
    id: 'desc-1',
    empleadoId: 'emp-2',
    nombreEmpleado: 'María López Gutiérrez',
    cargoEmpleado: 'Cajera Principal',
    departamento: 'Caja y Ventas',
    fechaInicio: '2026-10-15',
    fechaFin: '2026-10-30',
    diasDescanso: 15,
    tipo: 'Semestral (15 días)',
    estado: 'Programado',
    observaciones: 'Descanso de 6 meses continuos (Art. 76 C.T.)',
    fechaRegistro: '2026-09-28'
  },
  {
    id: 'desc-2',
    empleadoId: 'emp-3',
    nombreEmpleado: 'Carlos Mendoza Jarquín',
    cargoEmpleado: 'Vendedor de Piso',
    departamento: 'Ventas (POS)',
    fechaInicio: '2026-10-01',
    fechaFin: '2026-10-07',
    diasDescanso: 6,
    tipo: 'Fraccionado',
    estado: 'En Curso',
    observaciones: 'Vacaciones de descanso fraccionado acordado con gerencia',
    fechaRegistro: '2026-09-25'
  },
  {
    id: 'desc-3',
    empleadoId: 'emp-4',
    nombreEmpleado: 'Andrea Morales Sequeira',
    cargoEmpleado: 'Encargada de Inventario y Bodega',
    departamento: 'Inventario',
    fechaInicio: '2026-11-05',
    fechaFin: '2026-11-20',
    diasDescanso: 15,
    tipo: 'Semestral (15 días)',
    estado: 'Programado',
    observaciones: 'Planificación anual de descanso de bodega',
    fechaRegistro: '2026-09-29'
  }
];

// Datos semilla de vacaciones pagadas en dinero
const PAGOS_INICIALES: VacacionPagada[] = [
  {
    id: 'pago-1',
    numeroRecibo: 'REC-844616',
    empleadoId: 'emp-2',
    nombreEmpleado: 'María López Gutiérrez',
    cargoEmpleado: 'Cajera Principal',
    salarioMensual: 13500,
    salarioDiario: 450,
    diasPagados: 10,
    totalPagado: 4500,
    fechaPago: '2026-09-29',
    metodoPago: 'Transferencia Bancaria',
    observaciones: 'Compensación económica de vacaciones no gozadas acumuladas'
  },
  {
    id: 'pago-2',
    numeroRecibo: 'REC-844620',
    empleadoId: 'emp-3',
    nombreEmpleado: 'Carlos Mendoza Jarquín',
    cargoEmpleado: 'Vendedor de Piso',
    salarioMensual: 11000,
    salarioDiario: 366.67,
    diasPagados: 12,
    totalPagado: 4400,
    fechaPago: '2026-09-20',
    metodoPago: 'Efectivo',
    observaciones: 'Liquidación monetaria correspondiente al período 2025-2026'
  }
];

// Datos semilla de horas extras valoradas
const HORAS_EXTRAS_INICIALES: RegistroHorasExtras[] = [
  {
    id: 'hex-1',
    numeroComprobante: 'HEX-920101',
    empleadoId: 'emp-2',
    nombreEmpleado: 'María López Gutiérrez',
    cargoEmpleado: 'Cajera Principal',
    departamento: 'Caja y Ventas',
    salarioMensual: 13500,
    valorHoraOrdinaria: 56.25,
    valorHoraExtra: 112.50,
    horasExtras: 14,
    periodoTipo: 'Quincenal',
    fechaInicioPeriodo: '2026-09-16',
    fechaFinPeriodo: '2026-09-30',
    totalPagar: 1575.00,
    fechaRegistro: '2026-09-30',
    estado: 'Aprobado',
    observaciones: 'Horas extras por cuadre y cierre contable de quincena'
  },
  {
    id: 'hex-2',
    numeroComprobante: 'HEX-920102',
    empleadoId: 'emp-3',
    nombreEmpleado: 'Carlos Mendoza Jarquín',
    cargoEmpleado: 'Vendedor de Piso',
    departamento: 'Ventas (POS)',
    salarioMensual: 11000,
    valorHoraOrdinaria: 45.83,
    valorHoraExtra: 91.67,
    horasExtras: 8,
    periodoTipo: 'Semanal',
    fechaInicioPeriodo: '2026-09-22',
    fechaFinPeriodo: '2026-09-28',
    totalPagar: 733.36,
    fechaRegistro: '2026-09-29',
    estado: 'Pagado',
    observaciones: 'Apoyo en jornada especial de ventas de fin de semana'
  },
  {
    id: 'hex-3',
    numeroComprobante: 'HEX-920103',
    empleadoId: 'emp-4',
    nombreEmpleado: 'Andrea Morales Sequeira',
    cargoEmpleado: 'Encargada de Inventario y Bodega',
    departamento: 'Inventario',
    salarioMensual: 14000,
    valorHoraOrdinaria: 58.33,
    valorHoraExtra: 116.67,
    horasExtras: 16,
    periodoTipo: 'Mensual',
    fechaInicioPeriodo: '2026-09-01',
    fechaFinPeriodo: '2026-09-30',
    totalPagar: 1866.72,
    fechaRegistro: '2026-09-30',
    estado: 'Pendiente',
    observaciones: 'Descarga de contenedor y auditoría física mensual de inventario'
  }
];

// Helper para obtener rango de fechas sugeridas según período
const obtenerFechasSugeridasPeriodo = (tipo: 'Semanal' | 'Quincenal' | 'Mensual') => {
  const hoy = new Date();
  const yyyy = hoy.getFullYear();
  const mm = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = hoy.getDate();

  if (tipo === 'Semanal') {
    const hace7dias = new Date(hoy);
    hace7dias.setDate(hoy.getDate() - 6);
    return {
      inicio: hace7dias.toISOString().split('T')[0],
      fin: hoy.toISOString().split('T')[0]
    };
  } else if (tipo === 'Quincenal') {
    if (dia <= 15) {
      return {
        inicio: `${yyyy}-${mm}-01`,
        fin: `${yyyy}-${mm}-15`
      };
    } else {
      const ultimoDiaMes = new Date(yyyy, hoy.getMonth() + 1, 0).getDate();
      return {
        inicio: `${yyyy}-${mm}-16`,
        fin: `${yyyy}-${mm}-${ultimoDiaMes}`
      };
    }
  } else {
    const ultimoDiaMes = new Date(yyyy, hoy.getMonth() + 1, 0).getDate();
    return {
      inicio: `${yyyy}-${mm}-01`,
      fin: `${yyyy}-${mm}-${ultimoDiaMes}`
    };
  }
};

export const ModuloGestionDescanso: React.FC = () => {
  const { empleados, solicitudes, actualizarEmpleado } = useData();
  const { usuarioActual } = useAuth();
  const { success, warning, error } = useToast();
  const [tabActiva, setTabActiva] = useState<'programable' | 'pagadas' | 'horas_extras' | 'dias_libres' | 'feriados' | 'historial'>('programable');
  const [colaboradorHistorialId, setColaboradorHistorialId] = useState<string>('');
  const [historialModalEmp, setHistorialModalEmp] = useState<any>(null);

  // Referencia y control de desplazamiento para pestañas
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [puedeScrollIzq, setPuedeScrollIzq] = useState(false);
  const [puedeScrollDer, setPuedeScrollDer] = useState(false);

  const verificarScrollPestanas = () => {
    if (tabsContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsContainerRef.current;
      setPuedeScrollIzq(scrollLeft > 6);
      setPuedeScrollDer(scrollLeft + clientWidth < scrollWidth - 6);
    }
  };

  useEffect(() => {
    verificarScrollPestanas();
    const handleResize = () => verificarScrollPestanas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [tabActiva]);

  const deslizarPestanas = (dir: 'izq' | 'der') => {
    if (tabsContainerRef.current) {
      const offset = dir === 'izq' ? -220 : 220;
      tabsContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
      setTimeout(verificarScrollPestanas, 250);
    }
  };

  // Estado de descansos programables
  const [descansos, setDescansos] = useState<DescansoProgramado[]>(() => {
    const saved = localStorage.getItem('sendavac_descansos_programados');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return DESCANSOS_INICIALES;
  });

  // Estado de vacaciones pagadas
  const [pagosVacaciones, setPagosVacaciones] = useState<VacacionPagada[]>(() => {
    const saved = localStorage.getItem('sendavac_vacaciones_pagadas');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return PAGOS_INICIALES;
  });

  // Estado de horas extras
  const [registrosHorasExtras, setRegistrosHorasExtras] = useState<RegistroHorasExtras[]>(() => {
    const saved = localStorage.getItem('sendavac_horas_extras');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return HORAS_EXTRAS_INICIALES;
  });

  // Guardar en localStorage
  useEffect(() => {
    localStorage.setItem('sendavac_descansos_programados', JSON.stringify(descansos));
  }, [descansos]);

  useEffect(() => {
    localStorage.setItem('sendavac_vacaciones_pagadas', JSON.stringify(pagosVacaciones));
  }, [pagosVacaciones]);

  useEffect(() => {
    localStorage.setItem('sendavac_horas_extras', JSON.stringify(registrosHorasExtras));
  }, [registrosHorasExtras]);

  // Búsqueda y Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | 'Programado' | 'En Curso' | 'Completado'>('Todos');
  const [filtroPeriodoHE, setFiltroPeriodoHE] = useState<'Todos' | 'Semanal' | 'Quincenal' | 'Mensual'>('Todos');
  const [filtroEstadoHE, setFiltroEstadoHE] = useState<'Todos' | 'Pendiente' | 'Aprobado' | 'Pagado'>('Todos');

  // Modales
  const [modalNuevoDescanso, setModalNuevoDescanso] = useState(false);
  const [modalNuevoPago, setModalNuevoPago] = useState(false);
  const [modalNuevaHoraExtra, setModalNuevaHoraExtra] = useState(false);
  const [reciboParaVer, setReciboParaVer] = useState<VacacionPagada | null>(null);
  const [comprobanteHEParaVer, setComprobanteHEParaVer] = useState<RegistroHorasExtras | null>(null);
  const [formatoImpresionHE, setFormatoImpresionHE] = useState<'pos' | 'carta'>('pos');
  const [formatoImpresionPago, setFormatoImpresionPago] = useState<'pos' | 'carta'>('pos');
  const [itemParaBorrar, setItemParaBorrar] = useState<{ id: string; tipo: 'descanso' | 'pago' | 'hora_extra'; nombre: string } | null>(null);

  // Generador PDF para Horas Extras (Tamaño Carta / A4)
  const descargarPDFHorasExtras = (item: RegistroHorasExtras) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // 1. Encabezado corporativo
      doc.setFillColor(15, 39, 94);
      doc.rect(0, 0, 210, 28, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text('SENDA SISTEMAS', 14, 11);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text('CONTROL DE PERSONAL Y VALORACIÓN DE HORAS EXTRAS', 14, 17);
      doc.text('Ley Laboral de Nicaragua • Código del Trabajo (Art. 58 C.T.)', 14, 22);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text(`COMPROBANTE: ${item.numeroComprobante}`, 196, 11, { align: 'right' });
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha Emisión: ${item.fechaRegistro}`, 196, 17, { align: 'right' });
      doc.text(`Período Evaluado: ${item.periodoTipo}`, 196, 22, { align: 'right' });

      // 2. Información del Colaborador
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('1. INFORMACIÓN DEL COLABORADOR', 14, 38);

      autoTable(doc, {
        startY: 41,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
          0: { fontStyle: 'bold', textColor: [100, 116, 139], cellWidth: 46 },
          1: { fontStyle: 'bold', textColor: [15, 23, 42], cellWidth: 58 },
          2: { fontStyle: 'bold', textColor: [100, 116, 139], cellWidth: 44 },
          3: { fontStyle: 'bold', textColor: [15, 23, 42], cellWidth: 40 }
        },
        body: [
          ['Nombre del Colaborador:', item.nombreEmpleado, 'Cargo / Puesto:', item.cargoEmpleado],
          ['Departamento / Área:', item.departamento, 'Período:', `${item.fechaInicioPeriodo} al ${item.fechaFinPeriodo}`],
          ['Salario Mensual Base:', formatearCordobas(item.salarioMensual), 'Estado de Pago:', item.estado]
        ]
      });

      // 3. Tabla Desglose de Cálculo Legal
      const yDesglose = (doc as any).lastAutoTable.finalY + 7;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text('2. DESGLOSE DE VALORACIÓN LABORAL (ART. 58 C.T.)', 14, yDesglose);

      autoTable(doc, {
        startY: yDesglose + 3,
        theme: 'striped',
        headStyles: { fillColor: [15, 39, 94], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        head: [['Concepto / Base Legal', 'Base de Cálculo', 'Factor', 'Total']],
        body: [
          ['Salario Diario Ordinario (Base 30 días)', `${formatearCordobas(item.salarioMensual)} / 30 días`, '1.0x', formatearCordobas(item.salarioMensual / 30)],
          ['Hora Ordinaria de Trabajo (Base 8 horas)', `${formatearCordobas(item.salarioMensual / 30)} / 8 hrs`, '1.0x', formatearCordobas(item.valorHoraOrdinaria)],
          ['Hora Extraordinaria (100% Recargo Art. 58)', `${formatearCordobas(item.valorHoraOrdinaria)} × 2`, '2.0x (Doble)', formatearCordobas(item.valorHoraExtra)],
          ['Horas Extras Acumuladas en Período', `${item.horasExtras} horas laboradas`, `${item.periodoTipo}`, `${item.horasExtras} hrs`],
          ['TOTAL VALORADO A LIQUIDAR (C$)', `${item.horasExtras} hrs × ${formatearCordobas(item.valorHoraExtra)}`, '100% Recargo', formatearCordobas(item.totalPagar)]
        ]
      });

      // 4. Observaciones y Declaración Legal
      const yObs = (doc as any).lastAutoTable.finalY + 6;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(14, yObs, 182, 20, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('DECLARACIÓN Y JUSTIFICACIÓN:', 18, yObs + 5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(
        `Motivo: ${item.observaciones || 'Jornada extraordinaria autorizada conforme a los artículos 57 y 58 del Código del Trabajo de Nicaragua.'}`,
        18,
        yObs + 10
      );
      doc.text(
        'El empleador y el colaborador dan constancia de la prestación de las horas extras aquí liquidadas a entera conformidad.',
        18,
        yObs + 15
      );

      // 5. Bloque de Firmas
      const yFirmas = yObs + 42;
      doc.setDrawColor(15, 23, 42);
      doc.line(25, yFirmas, 85, yFirmas);
      doc.line(125, yFirmas, 185, yFirmas);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('Firma del Colaborador', 55, yFirmas + 5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text(item.nombreEmpleado, 55, yFirmas + 9, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.text('Firma y Sello de Gerencia', 155, yFirmas + 5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text('SENDA SISTEMAS - Tienda', 155, yFirmas + 9, { align: 'center' });

      doc.save(`Comprobante_Horas_Extras_${item.numeroComprobante}_${item.nombreEmpleado.replace(/\s+/g, '_')}.pdf`);
      success('PDF Descargado', `Se descargó el comprobante ${item.numeroComprobante} en tamaño carta (A4)`);
    } catch (err) {
      console.error(err);
      error('Error al generar PDF', 'No se pudo generar el documento PDF');
    }
  };

  // Generador PDF para Vacaciones Pagadas (Tamaño Carta / A4)
  const descargarPDFVacacionPagada = (pago: VacacionPagada) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      doc.setFillColor(15, 39, 94);
      doc.rect(0, 0, 210, 28, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text('SENDA SISTEMAS', 14, 11);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text('COMPROBANTE OFICIAL DE VACACIONES PAGADAS EN DINERO', 14, 17);
      doc.text('Ley Laboral de Nicaragua • Código del Trabajo (Art. 76 C.T.)', 14, 22);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text(`RECIBO: ${pago.numeroRecibo}`, 196, 11, { align: 'right' });
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha Pago: ${pago.fechaPago}`, 196, 17, { align: 'right' });
      doc.text(`Método: ${pago.metodoPago}`, 196, 22, { align: 'right' });

      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('1. DATOS DEL COLABORADOR', 14, 38);

      autoTable(doc, {
        startY: 41,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
          0: { fontStyle: 'bold', textColor: [100, 116, 139], cellWidth: 46 },
          1: { fontStyle: 'bold', textColor: [15, 23, 42], cellWidth: 58 },
          2: { fontStyle: 'bold', textColor: [100, 116, 139], cellWidth: 44 },
          3: { fontStyle: 'bold', textColor: [15, 23, 42], cellWidth: 40 }
        },
        body: [
          ['Nombre del Colaborador:', pago.nombreEmpleado, 'Cargo / Puesto:', pago.cargoEmpleado],
          ['Salario Mensual Base:', formatearCordobas(pago.salarioMensual), 'Salario Diario (Base 30):', formatearCordobas(pago.salarioDiario)],
          ['Días Compensados:', `${pago.diasPagados} días`, 'Método de Pago:', pago.metodoPago]
        ]
      });

      const yDesglose = (doc as any).lastAutoTable.finalY + 7;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text('2. LIQUIDACIÓN MONETARIA (ART. 76 C.T.)', 14, yDesglose);

      autoTable(doc, {
        startY: yDesglose + 3,
        theme: 'striped',
        headStyles: { fillColor: [15, 39, 94], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        head: [['Concepto', 'Base de Cálculo', 'Factor / Días', 'Total']],
        body: [
          ['Salario Ordinario Mensual', `${formatearCordobas(pago.salarioMensual)}`, 'Mensual', formatearCordobas(pago.salarioMensual)],
          ['Salario Diario Ordinario', `${formatearCordobas(pago.salarioMensual)} / 30`, 'Base 30', formatearCordobas(pago.salarioDiario)],
          ['Días de Vacaciones Compensados', `${formatearCordobas(pago.salarioDiario)} × ${pago.diasPagados} días`, `${pago.diasPagados} días`, formatearCordobas(pago.totalPagado)],
          ['TOTAL NETO PAGADO (C$)', `${pago.diasPagados} días liquidados`, '100% Ordinario', formatearCordobas(pago.totalPagado)]
        ]
      });

      const yObs = (doc as any).lastAutoTable.finalY + 6;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(14, yObs, 182, 20, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('DECLARACIÓN DE RECIBIDO A CONFORMIDAD:', 18, yObs + 5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(
        `Observaciones: ${pago.observaciones || 'Compensación económica de vacaciones conforme a las leyes laborales vigentes.'}`,
        18,
        yObs + 10
      );
      doc.text(
        'Recibí a mi entera conformidad el importe indicado en concepto de compensación económica de vacaciones (Art. 76 C.T.).',
        18,
        yObs + 15
      );

      const yFirmas = yObs + 42;
      doc.setDrawColor(15, 23, 42);
      doc.line(25, yFirmas, 85, yFirmas);
      doc.line(125, yFirmas, 185, yFirmas);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('Firma del Colaborador', 55, yFirmas + 5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text(pago.nombreEmpleado, 55, yFirmas + 9, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.text('Firma y Sello de Gerencia', 155, yFirmas + 5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text('SENDA SISTEMAS - Tienda', 155, yFirmas + 9, { align: 'center' });

      doc.save(`Recibo_Vacaciones_${pago.numeroRecibo}_${pago.nombreEmpleado.replace(/\s+/g, '_')}.pdf`);
      success('PDF Descargado', `Se descargó el recibo ${pago.numeroRecibo} en tamaño carta (A4)`);
    } catch (err) {
      console.error(err);
      error('Error al generar PDF', 'No se pudo generar el documento PDF');
    }
  };

  // Formulario Nuevo Descanso
  const [formDescansoEmpId, setFormDescansoEmpId] = useState(empleados[0]?.id || '');
  const [formDescansoInicio, setFormDescansoInicio] = useState(new Date().toISOString().split('T')[0]);
  const [formDescansoFin, setFormDescansoFin] = useState('');
  const [formDescansoDias, setFormDescansoDias] = useState<number>(15);
  const [formDescansoTipo, setFormDescansoTipo] = useState<'Semestral (15 días)' | 'Fraccionado' | 'Compensatorio'>('Semestral (15 días)');
  const [formDescansoObs, setFormDescansoObs] = useState('');

  // Formulario Nuevo Pago Vacaciones
  const [formPagoEmpId, setFormPagoEmpId] = useState(empleados[0]?.id || '');
  const [formPagoSalario, setFormPagoSalario] = useState<number>(12000);
  const [formPagoDias, setFormPagoDias] = useState<number>(15);
  const [formPagoMetodo, setFormPagoMetodo] = useState<'Efectivo' | 'Transferencia Bancaria' | 'Cheque'>('Transferencia Bancaria');
  const [formPagoObs, setFormPagoObs] = useState('');

  // Formulario Nueva Hora Extra
  const [formHEEmpId, setFormHEEmpId] = useState(empleados[0]?.id || '');
  const [formHESalario, setFormHESalario] = useState<number>(empleados[0]?.salarioMensual || 12000);
  const [formHEPeriodo, setFormHEPeriodo] = useState<'Semanal' | 'Quincenal' | 'Mensual'>('Quincenal');
  const [formHEInicio, setFormHEInicio] = useState(obtenerFechasSugeridasPeriodo('Quincenal').inicio);
  const [formHEFin, setFormHEFin] = useState(obtenerFechasSugeridasPeriodo('Quincenal').fin);
  const [formHEHoras, setFormHEHoras] = useState<number>(10);
  const [formHEEstado, setFormHEEstado] = useState<'Pendiente' | 'Aprobado' | 'Pagado'>('Aprobado');
  const [formHEObs, setFormHEObs] = useState('');

  // Actualizar salario y días por defecto al cambiar empleado en modal de pago
  const handleCambioEmpPago = (id: string) => {
    setFormPagoEmpId(id);
    const emp = empleados.find(e => e.id === id);
    if (emp) {
      setFormPagoSalario(emp.salarioMensual || 12000);
      setFormPagoDias(emp.saldoDisponible > 0 ? emp.saldoDisponible : 15);
    }
  };

  // Actualizar salario al cambiar empleado en modal de horas extras
  const handleCambioEmpHE = (id: string) => {
    setFormHEEmpId(id);
    const emp = empleados.find(e => e.id === id);
    if (emp) {
      setFormHESalario(emp.salarioMensual || 12000);
    }
  };

  // Actualizar fechas según tipo de período en modal de horas extras
  const handleCambioPeriodoHE = (tipo: 'Semanal' | 'Quincenal' | 'Mensual') => {
    setFormHEPeriodo(tipo);
    const sugerido = obtenerFechasSugeridasPeriodo(tipo);
    setFormHEInicio(sugerido.inicio);
    setFormHEFin(sugerido.fin);
  };

  // Guardar Nuevo Descanso Programado
  const handleGuardarDescanso = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = empleados.find(e => e.id === formDescansoEmpId);
    if (!emp) {
      error('Error', 'Selecciona un colaborador válido');
      return;
    }

    if (formDescansoDias <= 0) {
      error('Error', 'Los días de descanso deben ser mayores a 0');
      return;
    }

    const nuevo: DescansoProgramado = {
      id: `desc-${Date.now()}`,
      empleadoId: emp.id,
      nombreEmpleado: emp.nombre,
      cargoEmpleado: emp.cargo,
      departamento: emp.departamento || 'General',
      fechaInicio: formDescansoInicio,
      fechaFin: formDescansoFin || formDescansoInicio,
      diasDescanso: formDescansoDias,
      tipo: formDescansoTipo,
      estado: 'Programado',
      observaciones: formDescansoObs,
      fechaRegistro: new Date().toISOString().split('T')[0]
    };

    setDescansos(prev => [nuevo, ...prev]);
    setModalNuevoDescanso(false);
    setFormDescansoObs('');
    success('Descanso Programado', `Se programó el descanso de ${emp.nombre} exitosamente.`);
  };

  // Guardar Nuevo Pago de Vacaciones en Dinero
  const handleGuardarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = empleados.find(e => e.id === formPagoEmpId);
    if (!emp) {
      error('Error', 'Selecciona un colaborador válido');
      return;
    }

    if (formPagoDias <= 0 || formPagoSalario <= 0) {
      error('Error', 'El salario y los días a liquidar deben ser mayores a 0');
      return;
    }

    const salarioDiario = formPagoSalario / 30;
    const totalBruto = salarioDiario * formPagoDias;
    const numeroRecibo = `REC-${Date.now().toString().slice(-6)}`;

    const nuevoPago: VacacionPagada = {
      id: `pago-${Date.now()}`,
      numeroRecibo,
      empleadoId: emp.id,
      nombreEmpleado: emp.nombre,
      cargoEmpleado: emp.cargo,
      salarioMensual: formPagoSalario,
      salarioDiario: Math.round(salarioDiario * 100) / 100,
      diasPagados: formPagoDias,
      totalPagado: Math.round(totalBruto * 100) / 100,
      fechaPago: new Date().toISOString().split('T')[0],
      metodoPago: formPagoMetodo,
      observaciones: formPagoObs || 'Liquidación monetaria conforme al Art. 76 C.T. de Nicaragua'
    };

    // Actualizar días tomados del colaborador en el sistema para mantener saldo real
    try {
      const diasTomadosActuales = emp.diasTomados || 0;
      await actualizarEmpleado(emp.id, {
        diasTomados: Math.round((diasTomadosActuales + formPagoDias) * 100) / 100
      });
    } catch (err) {
      console.warn('No se pudo actualizar diasTomados en Firebase:', err);
    }

    setPagosVacaciones(prev => [nuevoPago, ...prev]);
    setModalNuevoPago(false);
    setFormPagoObs('');
    setReciboParaVer(nuevoPago);
    success('Pago Registrado', `Se generó el comprobante ${numeroRecibo} por ${formatearCordobas(totalBruto)}`);
  };

  // Cambiar estado de un descanso programado
  const handleCambiarEstadoDescanso = (id: string, nuevoEstado: 'Programado' | 'En Curso' | 'Completado') => {
    setDescansos(prev => prev.map(d => d.id === id ? { ...d, estado: nuevoEstado } : d));
    success('Estado Actualizado', `El descanso ahora está marcado como "${nuevoEstado}"`);
  };

  // Guardar Nuevo Registro de Horas Extras
  const handleGuardarHorasExtras = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = empleados.find(e => e.id === formHEEmpId);
    if (!emp) {
      error('Error', 'Selecciona un colaborador válido');
      return;
    }

    if (formHEHoras <= 0 || formHESalario <= 0) {
      error('Error', 'Las horas extras y el salario deben ser mayores a 0');
      return;
    }

    // Salario por hora ordinaria = Salario Mensual / 240 horas laborales estándar mensuales
    const valorHoraOrdinaria = Math.round((formHESalario / 240) * 100) / 100;
    // Art. 58 C.T. Nicaragua: Horas extraordinarias se pagan con un 100% de recargo (doble)
    const valorHoraExtra = Math.round((valorHoraOrdinaria * 2) * 100) / 100;
    const totalPagar = Math.round((formHEHoras * valorHoraExtra) * 100) / 100;
    const numeroComprobante = `HEX-${Date.now().toString().slice(-6)}`;

    const nuevoRegistro: RegistroHorasExtras = {
      id: `hex-${Date.now()}`,
      numeroComprobante,
      empleadoId: emp.id,
      nombreEmpleado: emp.nombre,
      cargoEmpleado: emp.cargo,
      departamento: emp.departamento || 'General',
      salarioMensual: formHESalario,
      valorHoraOrdinaria,
      valorHoraExtra,
      horasExtras: formHEHoras,
      periodoTipo: formHEPeriodo,
      fechaInicioPeriodo: formHEInicio,
      fechaFinPeriodo: formHEFin,
      totalPagar,
      fechaRegistro: new Date().toISOString().split('T')[0],
      estado: formHEEstado,
      observaciones: formHEObs || `Horas extras período ${formHEPeriodo.toLowerCase()} (${formHEInicio} al ${formHEFin})`
    };

    setRegistrosHorasExtras(prev => [nuevoRegistro, ...prev]);
    setModalNuevaHoraExtra(false);
    setFormHEObs('');
    setComprobanteHEParaVer(nuevoRegistro);
    success('Horas Extras Registradas', `Se valoraron ${formHEHoras} hrs extras por ${formatearCordobas(totalPagar)}`);
  };

  // Cambiar estado de Horas Extras
  const handleCambiarEstadoHE = (id: string, nuevoEstado: 'Pendiente' | 'Aprobado' | 'Pagado') => {
    setRegistrosHorasExtras(prev => prev.map(h => h.id === id ? { ...h, estado: nuevoEstado } : h));
    success('Estado Actualizado', `Comprobante marcado como "${nuevoEstado}"`);
  };

  // Confirmar eliminación
  const confirmarEliminacion = () => {
    if (!itemParaBorrar) return;
    if (itemParaBorrar.tipo === 'descanso') {
      setDescansos(prev => prev.filter(d => d.id !== itemParaBorrar.id));
      warning('Descanso Eliminado', `Se retiró la programación de ${itemParaBorrar.nombre}`);
    } else if (itemParaBorrar.tipo === 'pago') {
      setPagosVacaciones(prev => prev.filter(p => p.id !== itemParaBorrar.id));
      warning('Registro Eliminado', `Se retiró el comprobante de ${itemParaBorrar.nombre}`);
    } else {
      setRegistrosHorasExtras(prev => prev.filter(h => h.id !== itemParaBorrar.id));
      warning('Registro Eliminado', `Se retiró el comprobante de horas extras de ${itemParaBorrar.nombre}`);
    }
    setItemParaBorrar(null);
  };

  // Filtrado de Descansos
  const descansosFiltrados = descansos.filter(d => {
    const coincideBusqueda = d.nombreEmpleado.toLowerCase().includes(busqueda.toLowerCase()) ||
      d.cargoEmpleado.toLowerCase().includes(busqueda.toLowerCase()) ||
      d.departamento.toLowerCase().includes(busqueda.toLowerCase());
    const coincideEstado = filtroEstado === 'Todos' || d.estado === filtroEstado;
    return coincideBusqueda && coincideEstado;
  });

  // Filtrado de Pagos
  const pagosFiltrados = pagosVacaciones.filter(p => {
    return p.nombreEmpleado.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.numeroRecibo.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.cargoEmpleado.toLowerCase().includes(busqueda.toLowerCase());
  });

  // Filtrado de Horas Extras
  const horasExtrasFiltradas = registrosHorasExtras.filter(item => {
    const coincideBusqueda = item.nombreEmpleado.toLowerCase().includes(busqueda.toLowerCase()) ||
      item.numeroComprobante.toLowerCase().includes(busqueda.toLowerCase()) ||
      item.cargoEmpleado.toLowerCase().includes(busqueda.toLowerCase()) ||
      item.departamento.toLowerCase().includes(busqueda.toLowerCase());
    const coincidePeriodo = filtroPeriodoHE === 'Todos' || item.periodoTipo === filtroPeriodoHE;
    const coincideEstado = filtroEstadoHE === 'Todos' || item.estado === filtroEstadoHE;
    return coincideBusqueda && coincidePeriodo && coincideEstado;
  });

  // Métricas
  const totalDescansosEnCurso = descansos.filter(d => d.estado === 'En Curso').length;
  const totalDescansosProgramados = descansos.filter(d => d.estado === 'Programado').length;
  const totalDiasProgramados = descansos.reduce((acc, curr) => acc + curr.diasDescanso, 0);

  const totalMontoPagado = pagosVacaciones.reduce((acc, curr) => acc + curr.totalPagado, 0);
  const totalDiasPagados = pagosVacaciones.reduce((acc, curr) => acc + curr.diasPagados, 0);
  const totalColaboradoresPagados = new Set(pagosVacaciones.map(p => p.empleadoId)).size;

  const totalHorasExtrasRegistradas = registrosHorasExtras.reduce((acc, curr) => acc + curr.horasExtras, 0);
  const totalMontoHE = registrosHorasExtras.reduce((acc, curr) => acc + curr.totalPagar, 0);
  const montoHESemanal = registrosHorasExtras.filter(h => h.periodoTipo === 'Semanal').reduce((acc, curr) => acc + curr.totalPagar, 0);
  const montoHEQuincenal = registrosHorasExtras.filter(h => h.periodoTipo === 'Quincenal').reduce((acc, curr) => acc + curr.totalPagar, 0);
  const montoHEMensual = registrosHorasExtras.filter(h => h.periodoTipo === 'Mensual').reduce((acc, curr) => acc + curr.totalPagar, 0);

  return (
    <div className="space-y-6 animate-fadeIn text-left">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/60 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs backdrop-blur-md">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-blue-500/25 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[14px] flex items-center justify-center">
              <CalendarCheck className="w-6 h-6 sm:w-7 sm:h-7 text-[#1d63ff] dark:text-blue-400" />
            </div>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Gestión del Personal
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Programación de descansos, vacaciones pagadas (Art. 76 C.T.) y horas extras acumuladas (Art. 58 C.T.)
            </p>
          </div>
        </div>

        {/* Botón de Acción Rápida Principal */}
        <div className="flex items-center gap-2.5 shrink-0">
          {tabActiva === 'programable' ? (
            <button
              onClick={() => setModalNuevoDescanso(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#1d63ff] hover:bg-blue-700 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Programar Descanso</span>
            </button>
          ) : tabActiva === 'pagadas' ? (
            <button
              onClick={() => setModalNuevoPago(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 transition cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Vacación Pagada</span>
            </button>
          ) : tabActiva === 'horas_extras' ? (
            <button
              onClick={() => {
                const emp = empleados[0];
                if (emp) {
                  setFormHEEmpId(emp.id);
                  setFormHESalario(emp.salarioMensual || 12000);
                }
                const sugerido = obtenerFechasSugeridasPeriodo(formHEPeriodo);
                setFormHEInicio(sugerido.inicio);
                setFormHEFin(sugerido.fin);
                setModalNuevaHoraExtra(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-md shadow-indigo-600/20 transition cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Valorar / Registrar Horas Extras</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Barra de Pestañas Acoplada, sin truncamiento y con navegación fluida */}
      <div className="relative bg-white dark:bg-slate-900/60 p-1.5 sm:p-2 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs backdrop-blur-md">
        <div className="flex items-center gap-1">
          {/* Botón Desplazar Izquierda (Visible si hay desbordamiento horizontal) */}
          {puedeScrollIzq && (
            <button
              type="button"
              onClick={() => deslizarPestanas('izq')}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer shrink-0 shadow-xs"
              title="Ver pestañas anteriores"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Contenedor con scroll suave y ajuste flexible */}
          <div
            ref={tabsContainerRef}
            onScroll={verificarScrollPestanas}
            className="flex-1 flex items-center gap-1 sm:gap-1.5 overflow-x-auto touch-scroll scroll-smooth [scrollbar-width:thin] scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 py-0.5"
          >
            {/* Pestaña 1: Descansos */}
            <button
              type="button"
              onClick={() => setTabActiva('programable')}
              title="Descanso del Personal"
              className={`py-2 px-3 sm:px-3.5 text-xs sm:text-sm font-extrabold flex items-center gap-2 rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                tabActiva === 'programable'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <CalendarClock className={`w-4 h-4 ${tabActiva === 'programable' ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
              <span>
                <span className="hidden 2xl:inline">Descanso del Personal</span>
                <span className="2xl:hidden">Descansos</span>
              </span>
              <span className={`text-[10px] sm:text-[11px] font-black px-1.5 py-0.5 rounded-full ${
                tabActiva === 'programable'
                  ? 'bg-white/20 text-white'
                  : 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300'
              }`}>
                {descansos.length}
              </span>
            </button>

            {/* Pestaña 2: Vacaciones Pagadas */}
            <button
              type="button"
              onClick={() => setTabActiva('pagadas')}
              title="Vacaciones Pagadas del Personal (Art. 76 C.T.)"
              className={`py-2 px-3 sm:px-3.5 text-xs sm:text-sm font-extrabold flex items-center gap-2 rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                tabActiva === 'pagadas'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <DollarSign className={`w-4 h-4 ${tabActiva === 'pagadas' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
              <span>
                <span className="hidden 2xl:inline">Vacaciones Pagadas del Personal</span>
                <span className="2xl:hidden">Vacaciones Pagadas</span>
              </span>
              <span className={`text-[10px] sm:text-[11px] font-black px-1.5 py-0.5 rounded-full ${
                tabActiva === 'pagadas'
                  ? 'bg-white/20 text-white'
                  : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
              }`}>
                {pagosVacaciones.length}
              </span>
            </button>

            {/* Pestaña 3: Horas Extras */}
            <button
              type="button"
              onClick={() => setTabActiva('horas_extras')}
              title="Horas Extras del Personal (Art. 58 C.T.)"
              className={`py-2 px-3 sm:px-3.5 text-xs sm:text-sm font-extrabold flex items-center gap-2 rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                tabActiva === 'horas_extras'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Clock className={`w-4 h-4 ${tabActiva === 'horas_extras' ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'}`} />
              <span>
                <span className="hidden 2xl:inline">Horas Extras del Personal</span>
                <span className="2xl:hidden">Horas Extras</span>
              </span>
              <span className={`text-[10px] sm:text-[11px] font-black px-1.5 py-0.5 rounded-full ${
                tabActiva === 'horas_extras'
                  ? 'bg-white/20 text-white'
                  : 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300'
              }`}>
                {registrosHorasExtras.length}
              </span>
            </button>

            {/* Pestaña 4: Días Libres */}
            <button
              type="button"
              onClick={() => setTabActiva('dias_libres')}
              title="Días Libres Semanales Obligatorios (Art. 64 C.T.)"
              className={`py-2 px-3 sm:px-3.5 text-xs sm:text-sm font-extrabold flex items-center gap-2 rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                tabActiva === 'dias_libres'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Coffee className={`w-4 h-4 ${tabActiva === 'dias_libres' ? 'text-white' : 'text-amber-600 dark:text-amber-400'}`} />
              <span>
                <span className="hidden 2xl:inline">Días Libres Semanales (Art. 64 C.T.)</span>
                <span className="2xl:hidden">Días Libres (Art. 64)</span>
              </span>
            </button>

            {/* Pestaña 5: Días Feriados */}
            <button
              type="button"
              onClick={() => setTabActiva('feriados')}
              title="Días Feriados Nacionales y Locales (Art. 66-67 C.T.)"
              className={`py-2 px-3 sm:px-3.5 text-xs sm:text-sm font-extrabold flex items-center gap-2 rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                tabActiva === 'feriados'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Palmtree className={`w-4 h-4 ${tabActiva === 'feriados' ? 'text-white' : 'text-rose-500'}`} />
              <span>
                <span className="hidden 2xl:inline">Días Feriados (Art. 66-67 C.T.)</span>
                <span className="2xl:hidden">Días Feriados (Art. 66-67)</span>
              </span>
            </button>

            {/* Pestaña 6: Historial */}
            <button
              type="button"
              onClick={() => setTabActiva('historial')}
              title="Historial de Descansos y Vacaciones de Colaboradores"
              className={`py-2 px-3 sm:px-3.5 text-xs sm:text-sm font-extrabold flex items-center gap-2 rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                tabActiva === 'historial'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <History className={`w-4 h-4 ${tabActiva === 'historial' ? 'text-white' : 'text-blue-500'}`} />
              <span>
                <span className="hidden 2xl:inline">Historial de Descansos y Vacaciones</span>
                <span className="2xl:hidden">Historial</span>
              </span>
            </button>
          </div>

          {/* Botón Desplazar Derecha (Visible si hay desbordamiento horizontal) */}
          {puedeScrollDer && (
            <button
              type="button"
              onClick={() => deslizarPestanas('der')}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer shrink-0 shadow-xs"
              title="Ver pestañas siguientes"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* PESTAÑA 1: DESCANSO DEL PERSONAL */}
      {tabActiva === 'programable' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Tarjetas de Métricas de Descanso */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Descansos en Curso
                </p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {totalDescansosEnCurso}
                </h3>
                <p className="text-[11px] text-emerald-600 font-bold mt-0.5">Colaboradores descansando</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Próximos Programados
                </p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {totalDescansosProgramados}
                </h3>
                <p className="text-[11px] text-blue-600 font-bold mt-0.5">Fechas futuras agendadas</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-bold">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Total Días Planificados
                </p>
                <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                  {totalDiasProgramados} días
                </h3>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5">Acumulado en calendario</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-bold">
                <CalendarDays className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Barra de Filtros y Búsqueda */}
          <div className="bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Buscar por colaborador, cargo o área..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Estado:
              </span>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value as any)}
                className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                <option value="Todos">Todos</option>
                <option value="Programado">Programado</option>
                <option value="En Curso">En Curso</option>
                <option value="Completado">Completado</option>
              </select>
            </div>
          </div>

          {/* Tabla de Descansos Programados */}
          <div className="bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto touch-scroll">
              <table className="w-full min-w-[620px] text-left border-collapse text-xs">
                <thead className="bg-slate-50/90 dark:bg-slate-900/90 text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Colaborador</th>
                    <th className="px-6 py-4">Período de Descanso</th>
                    <th className="px-6 py-4 text-center">Días</th>
                    <th className="px-6 py-4">Tipo de Descanso</th>
                    <th className="px-6 py-4 text-center">Estado</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {descansosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                        No hay descansos programados con los criterios de búsqueda.
                      </td>
                    </tr>
                  ) : (
                    descansosFiltrados.map((desc) => (
                      <tr key={desc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-[#1d63ff] dark:text-blue-300 font-black flex items-center justify-center text-sm border border-blue-200 dark:border-blue-700 shadow-xs">
                              {desc.nombreEmpleado.charAt(0)}
                            </div>
                            <div>
                              <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                                {desc.nombreEmpleado}
                              </div>
                              <div className="text-[11px] text-slate-400 font-medium">
                                {desc.cargoEmpleado} • {desc.departamento}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {desc.fechaInicio} <span className="text-slate-400">➔</span> {desc.fechaFin}
                          </div>
                          {desc.observaciones && (
                            <div className="text-[10px] text-slate-400 italic max-w-xs truncate">
                              {desc.observaciones}
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="px-3 py-1 inline-flex text-xs font-black rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                            {desc.diasDescanso} días
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {desc.tipo}
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span
                            className={`px-3 py-1 inline-flex text-[11px] font-black rounded-full ${
                              desc.estado === 'En Curso'
                                ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : desc.estado === 'Completado'
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                : 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                            }`}
                          >
                            {desc.estado}
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                            {desc.estado === 'Programado' && (
                              <button
                                type="button"
                                onClick={() => handleCambiarEstadoDescanso(desc.id, 'En Curso')}
                                className="px-2.5 py-1.5 rounded-xl font-bold transition text-xs bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 cursor-pointer active:scale-95"
                                title="Iniciar descanso"
                              >
                                Iniciar
                              </button>
                            )}

                            {desc.estado === 'En Curso' && (
                              <button
                                type="button"
                                onClick={() => handleCambiarEstadoDescanso(desc.id, 'Completado')}
                                className="px-2.5 py-1.5 rounded-xl font-bold transition text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 cursor-pointer active:scale-95"
                                title="Concluir descanso"
                              >
                                Concluir
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setItemParaBorrar({ id: desc.id, tipo: 'descanso', nombre: desc.nombreEmpleado })}
                              className="px-2.5 py-1.5 rounded-xl font-bold transition text-xs bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 cursor-pointer active:scale-95"
                              title="Eliminar programación"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: VACACIONES PAGADAS DE LOS COLABORADORES */}
      {tabActiva === 'pagadas' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Tarjetas de Métricas de Pagos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Total Pagado en Dinero
                </p>
                <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatearCordobas(totalMontoPagado)}
                </h3>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5">Liquidaciones compensadas</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center font-bold">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Días Compensados en Dinero
                </p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {totalDiasPagados} días
                </h3>
                <p className="text-[11px] text-blue-600 font-bold mt-0.5">Conforme Art. 76 Ley Nica</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-bold">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Colaboradores Beneficiados
                </p>
                <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                  {totalColaboradoresPagados}
                </h3>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5">Personal con pagos emitidos</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-bold">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Barra de Búsqueda */}
          <div className="bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Buscar por colaborador o no. de recibo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div className="text-xs font-bold text-slate-400">
              {pagosFiltrados.length} recibos registrados
            </div>
          </div>

          {/* Tabla de Vacaciones Pagadas */}
          <div className="bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto touch-scroll">
              <table className="w-full min-w-[640px] text-left border-collapse text-xs">
                <thead className="bg-slate-50/90 dark:bg-slate-900/90 text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">No. Recibo</th>
                    <th className="px-6 py-4">Colaborador</th>
                    <th className="px-6 py-4">Fecha Pago</th>
                    <th className="px-6 py-4 text-center">Días Pagados</th>
                    <th className="px-6 py-4 text-right">Monto Total</th>
                    <th className="px-6 py-4 text-center">Método</th>
                    <th className="px-6 py-4 text-right">Comprobante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pagosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                        No hay pagos de vacaciones registrados con los criterios seleccionados.
                      </td>
                    </tr>
                  ) : (
                    pagosFiltrados.map((pago) => (
                      <tr key={pago.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap font-mono font-black text-blue-600 dark:text-blue-400">
                          {pago.numeroRecibo}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-black flex items-center justify-center text-xs">
                              {pago.nombreEmpleado.charAt(0)}
                            </div>
                            <div>
                              <div className="font-extrabold text-slate-900 dark:text-white">
                                {pago.nombreEmpleado}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {pago.cargoEmpleado}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                          {pago.fechaPago}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="px-2.5 py-1 font-black rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {pago.diasPagados} días
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-right font-black text-sm text-emerald-600 dark:text-emerald-400">
                          {formatearCordobas(pago.totalPagado)}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="px-2.5 py-1 text-[11px] font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {pago.metodoPago}
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setReciboParaVer(pago)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold transition text-xs bg-slate-900 hover:bg-black text-white shadow-xs cursor-pointer active:scale-95"
                              title="Ver e imprimir ticket"
                            >
                              <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Ver Ticket</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setItemParaBorrar({ id: pago.id, tipo: 'pago', nombre: `${pago.numeroRecibo} (${pago.nombreEmpleado})` })}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                              title="Eliminar registro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: VALORACIÓN Y CONTROL DE HORAS EXTRAS */}
      {tabActiva === 'horas_extras' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Tarjetas de Métricas de Horas Extras */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Horas Extras Acumuladas
                </p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {totalHorasExtrasRegistradas} hrs
                </h3>
                <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">
                  Tiempo extraordinario registrado
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-bold">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Valor Total Valorado
                </p>
                <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatearCordobas(totalMontoHE)}
                </h3>
                <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                  100% Recargo de Ley (Art. 58 C.T.)
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center font-bold">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Valoración por Período
                </p>
                <div className="mt-1 space-y-0.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <div className="flex justify-between gap-3 text-[11px]">
                    <span className="text-purple-600 dark:text-purple-400 font-extrabold">Semanal:</span>
                    <span>{formatearCordobas(montoHESemanal)}</span>
                  </div>
                  <div className="flex justify-between gap-3 text-[11px]">
                    <span className="text-blue-600 dark:text-blue-400 font-extrabold">Quincenal:</span>
                    <span>{formatearCordobas(montoHEQuincenal)}</span>
                  </div>
                  <div className="flex justify-between gap-3 text-[11px]">
                    <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">Mensual:</span>
                    <span>{formatearCordobas(montoHEMensual)}</span>
                  </div>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 border border-purple-200 dark:border-purple-800 flex items-center justify-center font-bold">
                <Calculator className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Filtros: Selector de Período + Buscador + Filtro Estado */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 bg-white dark:bg-slate-900/60 p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            {/* Selector de Período (Todos, Semanal, Quincenal, Mensual) */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto touch-scroll">
              {(['Todos', 'Semanal', 'Quincenal', 'Mensual'] as const).map((per) => (
                <button
                  key={per}
                  type="button"
                  onClick={() => setFiltroPeriodoHE(per)}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition whitespace-nowrap cursor-pointer ${
                    filtroPeriodoHE === per
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {per === 'Todos' ? 'Todos los Períodos' : per}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Buscador */}
              <div className="relative min-w-[220px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar colaborador o comprobante..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              {/* Filtro de Estado */}
              <select
                value={filtroEstadoHE}
                onChange={(e) => setFiltroEstadoHE(e.target.value as any)}
                className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
              >
                <option value="Todos">Todos los Estados</option>
                <option value="Pendiente">Pendientes</option>
                <option value="Aprobado">Aprobados</option>
                <option value="Pagado">Pagados</option>
              </select>
            </div>
          </div>

          {/* Tabla de Horas Extras */}
          <div className="bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto touch-scroll">
              <table className="w-full min-w-[760px] text-left border-collapse text-xs">
                <thead className="bg-slate-50/90 dark:bg-slate-900/90 text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Comprobante</th>
                    <th className="px-5 py-3.5">Colaborador</th>
                    <th className="px-5 py-3.5">Período</th>
                    <th className="px-5 py-3.5 text-center">Horas Extras</th>
                    <th className="px-5 py-3.5 text-right">Valor Hora Extra</th>
                    <th className="px-5 py-3.5 text-right">Total Valorado</th>
                    <th className="px-5 py-3.5 text-center">Estado</th>
                    <th className="px-5 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {horasExtrasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                        No hay horas extras registradas con los criterios seleccionados.
                      </td>
                    </tr>
                  ) : (
                    horasExtrasFiltradas.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap font-mono font-black text-indigo-600 dark:text-indigo-400">
                          {item.numeroComprobante}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-black flex items-center justify-center text-xs">
                              {item.nombreEmpleado.charAt(0)}
                            </div>
                            <div>
                              <div className="font-extrabold text-slate-900 dark:text-white">
                                {item.nombreEmpleado}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {item.cargoEmpleado} • {item.departamento}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div>
                            <span className={`inline-block px-2 py-0.5 text-[10px] font-black rounded-md ${
                              item.periodoTipo === 'Semanal' 
                                ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                : item.periodoTipo === 'Quincenal'
                                ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            }`}>
                              {item.periodoTipo}
                            </span>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {item.fechaInicioPeriodo} → {item.fechaFinPeriodo}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-center">
                          <span className="px-2.5 py-1 font-black rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {item.horasExtras} hrs
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-right">
                          <div className="font-extrabold text-slate-800 dark:text-slate-200">
                            {formatearCordobas(item.valorHoraExtra)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Ord: {formatearCordobas(item.valorHoraOrdinaria)} (x2)
                          </div>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-right font-black text-sm text-emerald-600 dark:text-emerald-400">
                          {formatearCordobas(item.totalPagar)}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-center">
                          <select
                            value={item.estado}
                            onChange={(e) => handleCambiarEstadoHE(item.id, e.target.value as any)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-black cursor-pointer border focus:outline-none transition ${
                              item.estado === 'Pagado'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                : item.estado === 'Aprobado'
                                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            <option value="Pendiente">Pendiente</option>
                            <option value="Aprobado">Aprobado</option>
                            <option value="Pagado">Pagado</option>
                          </select>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setComprobanteHEParaVer(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold transition text-xs bg-slate-900 hover:bg-black text-white shadow-xs cursor-pointer active:scale-95"
                              title="Ver e imprimir comprobante"
                            >
                              <Receipt className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Comprobante</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setItemParaBorrar({ id: item.id, tipo: 'hora_extra', nombre: `${item.numeroComprobante} (${item.nombreEmpleado})` })}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                              title="Eliminar registro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: PROGRAMAR NUEVO DESCANSO */}
      {modalNuevoDescanso && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-950/45 backdrop-blur-[2px] animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#0f172a] rounded-[24px] sm:rounded-[28px] p-5 sm:p-7 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-bold">
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                    Programar Período de Descanso
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">Planificación de vacaciones laborales (Art. 76 C.T.)</p>
                </div>
              </div>
              <button
                onClick={() => setModalNuevoDescanso(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarDescanso} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Colaborador
                </label>
                <select
                  value={formDescansoEmpId}
                  onChange={(e) => setFormDescansoEmpId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {empleados.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nombre} — {emp.cargo} ({emp.saldoDisponible} días disp.)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    required
                    value={formDescansoInicio}
                    onChange={(e) => setFormDescansoInicio(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    required
                    value={formDescansoFin}
                    onChange={(e) => setFormDescansoFin(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Días de Descanso
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={formDescansoDias}
                    onChange={(e) => setFormDescansoDias(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Régimen / Tipo
                  </label>
                  <select
                    value={formDescansoTipo}
                    onChange={(e) => setFormDescansoTipo(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                  >
                    <option value="Semestral (15 días)">Semestral (15 días Art. 76)</option>
                    <option value="Fraccionado">Fraccionado</option>
                    <option value="Compensatorio">Compensatorio</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Observaciones / Notas
                </label>
                <input
                  type="text"
                  placeholder="Ej. Planificado con reemplazo temporal en caja"
                  value={formDescansoObs}
                  onChange={(e) => setFormDescansoObs(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalNuevoDescanso(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black text-white bg-[#1d63ff] hover:bg-blue-700 rounded-xl shadow-md transition active:scale-95 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Guardar Programación</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTRAR VACACIÓN PAGADA EN DINERO */}
      {modalNuevoPago && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-950/45 backdrop-blur-[2px] animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#0f172a] rounded-[24px] sm:rounded-[28px] p-5 sm:p-7 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center font-bold">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                    Registrar Vacación Pagada en Dinero
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">Liquidación y emisión de comprobante oficial</p>
                </div>
              </div>
              <button
                onClick={() => setModalNuevoPago(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarPago} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Colaborador a Liquidar
                </label>
                <select
                  value={formPagoEmpId}
                  onChange={(e) => handleCambioEmpPago(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {empleados.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nombre} — {emp.cargo} ({emp.saldoDisponible} días disp.)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Salario Mensual (C$)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={formPagoSalario || ''}
                    onChange={(e) => setFormPagoSalario(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Diario: {formatearCordobas(formPagoSalario / 30)}</span>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Días a Pagar / Liquidar
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.01"
                    required
                    value={formPagoDias || ''}
                    onChange={(e) => setFormPagoDias(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Base Art. 76 C.T.</span>
                </div>
              </div>

              {/* Caja de Total Estimado */}
              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300">Total a Liquidar:</p>
                  <p className="text-xl font-black text-emerald-950 dark:text-emerald-200">
                    {formatearCordobas((formPagoSalario / 30) * formPagoDias)}
                  </p>
                </div>
                <div className="text-right text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                  ({formPagoSalario} ÷ 30) × {formPagoDias} d
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Método de Pago
                </label>
                <select
                  value={formPagoMetodo}
                  onChange={(e) => setFormPagoMetodo(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                >
                  <option value="Transferencia Bancaria">Transferencia Bancaria (BAC / LAFISE / Banpro)</option>
                  <option value="Efectivo">Efectivo en Caja</option>
                  <option value="Cheque">Cheque Comercial</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Concepto / Observaciones
                </label>
                <input
                  type="text"
                  placeholder="Ej. Liquidación monetaria autorizada"
                  value={formPagoObs}
                  onChange={(e) => setFormPagoObs(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalNuevoPago(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition active:scale-95 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Emitir Pago y Recibo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VER E IMPRIMIR RECIBO DE PAGO (TICKET POS-80C Y TAMAÑO CARTA A4) */}
      {reciboParaVer && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-slate-950/50 backdrop-blur-[2px] animate-fadeIn">
          <div className={`relative w-full ${formatoImpresionPago === 'carta' ? 'max-w-4xl' : 'max-w-[480px]'} bg-white dark:bg-[#0f172a] rounded-[24px] shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[92vh] transition-all`}>
            
            {/* Header del Modal Fijo */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2 text-emerald-600">
                <Receipt className="w-5 h-5" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Comprobante Oficial {reciboParaVer.numeroRecibo}
                </h3>
              </div>
              <button
                onClick={() => setReciboParaVer(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector de Formato Fijo */}
            <div className="px-5 pt-3 pb-1 shrink-0">
              <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setFormatoImpresionPago('pos')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    formatoImpresionPago === 'pos'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Ticket POS-80C (80mm)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormatoImpresionPago('carta')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    formatoImpresionPago === 'carta'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Tamaño Carta (A4)</span>
                </button>
              </div>
            </div>

            {/* Cuerpo del Modal con Scroll */}
            <div className="px-5 py-3 overflow-y-auto flex-1 space-y-3">
              {/* Vista previa Formato Ticket Térmico POS-80C */}
              {formatoImpresionPago === 'pos' ? (
                <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-dashed border-emerald-300 dark:border-emerald-800 space-y-2.5 text-xs">
                  <div className="text-center pb-2 border-b border-dashed border-slate-200 dark:border-slate-800">
                    <p className="font-black text-sm uppercase">SENDA SISTEMAS</p>
                    <p className="text-[10px] text-slate-400">Recibo de Vacaciones Pagadas (Art. 76 C.T.)</p>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Colaborador:</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">{reciboParaVer.nombreEmpleado}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cargo:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{reciboParaVer.cargoEmpleado}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Fecha de Pago:</span>
                    <span className="font-semibold">{reciboParaVer.fechaPago}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Días Compensados:</span>
                    <span className="font-bold text-emerald-600">{reciboParaVer.diasPagados} días</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Método de Pago:</span>
                    <span className="font-semibold">{reciboParaVer.metodoPago}</span>
                  </div>

                  <div className="border-t-2 border-b-2 border-dashed border-slate-300 dark:border-slate-700 py-2 my-2 text-center">
                    <span className="text-[10px] font-black uppercase text-slate-500">Total Neto Liquidado:</span>
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                      {formatearCordobas(reciboParaVer.totalPagado)}
                    </p>
                  </div>
                </div>
              ) : (
                /* Vista previa Formato Documento Formal Carta / A4 */
                <div className="bg-slate-50 dark:bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3.5 text-xs shadow-inner">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-2">
                    <div>
                      <p className="font-black text-base text-slate-900 dark:text-white uppercase tracking-wider">SENDA SISTEMAS</p>
                      <p className="text-[11px] text-slate-500 font-medium">Control de Compensación Laboral • Ley de Nicaragua (Art. 76 C.T.)</p>
                    </div>
                    <div className="sm:text-right">
                      <span className="inline-block px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs">
                        {reciboParaVer.numeroRecibo}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">Fecha: {reciboParaVer.fechaPago}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700/60 space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Datos del Colaborador</p>
                      <p className="font-bold text-slate-900 dark:text-white text-sm">{reciboParaVer.nombreEmpleado}</p>
                      <p className="text-slate-600 dark:text-slate-300">Cargo: {reciboParaVer.cargoEmpleado}</p>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700/60 space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Detalles de la Liquidación</p>
                      <p className="text-slate-600 dark:text-slate-300">Método de Pago: <strong className="text-slate-900 dark:text-white">{reciboParaVer.metodoPago}</strong></p>
                      <p className="text-slate-600 dark:text-slate-300">Días Compensados: <strong className="text-emerald-600 dark:text-emerald-400">{reciboParaVer.diasPagados} días</strong></p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/60">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px]">
                          <th className="py-2 px-3 font-bold">Concepto</th>
                          <th className="py-2 px-3 text-right font-bold">Salario Mensual</th>
                          <th className="py-2 px-3 text-right font-bold">Salario Diario (Base 30)</th>
                          <th className="py-2 px-3 text-right font-bold">Días</th>
                          <th className="py-2 px-3 text-right font-bold">Total Liquidado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                        <tr>
                          <td className="py-2.5 px-3 font-semibold">Compensación de Vacaciones en Dinero</td>
                          <td className="py-2.5 px-3 text-right">{formatearCordobas(reciboParaVer.salarioMensual)}</td>
                          <td className="py-2.5 px-3 text-right">{formatearCordobas(reciboParaVer.salarioDiario)}</td>
                          <td className="py-2.5 px-3 text-right font-bold">{reciboParaVer.diasPagados}</td>
                          <td className="py-2.5 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">{formatearCordobas(reciboParaVer.totalPagado)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/50 flex justify-between items-center">
                    <span className="font-bold text-slate-700 dark:text-slate-300">TOTAL NETO LIQUIDADO:</span>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatearCordobas(reciboParaVer.totalPagado)}</span>
                  </div>

                  <p className="text-[10px] text-slate-500 italic text-justify leading-relaxed">
                    Recibí a mi entera conformidad de SENDA SISTEMAS la cantidad estipulada en concepto de compensación económica de vacaciones acumuladas, conforme a lo establecido en el Artículo 76 del Código del Trabajo de la República de Nicaragua.
                  </p>

                  <div className="grid grid-cols-2 gap-8 pt-3 text-center">
                    <div className="border-t border-slate-300 dark:border-slate-700 pt-1">
                      <p className="font-bold text-slate-800 dark:text-slate-200">{reciboParaVer.nombreEmpleado}</p>
                      <p className="text-[10px] text-slate-400">Firma del Colaborador</p>
                    </div>
                    <div className="border-t border-slate-300 dark:border-slate-700 pt-1">
                      <p className="font-bold text-slate-800 dark:text-slate-200">Gerencia / RRHH</p>
                      <p className="text-[10px] text-slate-400">Firma y Sello Autorizado</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Fijo con Botones de Acción */}
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 rounded-b-[24px] shrink-0">
              {formatoImpresionPago === 'pos' ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setReciboParaVer(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 bg-slate-900 hover:bg-black text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition text-xs shadow-md cursor-pointer active:scale-95"
                  >
                    <Printer className="w-4 h-4 text-emerald-400" />
                    <span>Imprimir Ticket Térmico (POS-80C)</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setReciboParaVer(null)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer order-last sm:order-first"
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="w-full sm:flex-1 bg-slate-900 hover:bg-black text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition text-xs shadow-md cursor-pointer active:scale-95"
                  >
                    <Printer className="w-4 h-4 text-emerald-400" />
                    <span>Imprimir Carta / A4</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => descargarPDFVacacionPagada(reciboParaVer)}
                    className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition text-xs shadow-md cursor-pointer active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar PDF (Carta/A4)</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Ticket Portaled para Impresora POS-80C */}
          {formatoImpresionPago === 'pos' && typeof document !== 'undefined' && createPortal(
            <div id="ticket-recibo-print" className="hidden print:block text-black bg-white">
              <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <div style={{ fontWeight: '900', fontSize: '15px', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  SENDA SISTEMAS
                </div>
                <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '2px' }}>
                  CONTROL DE PERSONAL Y VACACIONES
                </div>
                <div style={{ fontSize: '10px', color: '#222', marginTop: '1px' }}>
                  Ley Laboral de Nicaragua • Art. 76 C.T.
                </div>
                <div style={{ width: '100%', borderBottom: '1.5px dashed #000', margin: '6px 0' }} />
                <div style={{ fontWeight: '900', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  RECIBO DE VACACIONES PAGADAS
                </div>
                <div style={{ width: '100%', borderBottom: '1.5px dashed #000', margin: '6px 0' }} />
              </div>

              <div style={{ fontSize: '11px', marginBottom: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '2px' }}>
                  <span>Fecha / Hora:</span>
                  <span>{reciboParaVer.fechaPago}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span>No. Recibo:</span>
                  <span style={{ fontWeight: 'bold' }}>{reciboParaVer.numeroRecibo}</span>
                </div>
              </div>

              <div style={{ width: '100%', borderBottom: '1px dashed #000', margin: '6px 0' }} />

              <div style={{ fontSize: '11px', marginBottom: '6px' }}>
                <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '4px' }}>
                  DATOS DEL COLABORADOR:
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '2px' }}>
                  <span>Nombre:</span>
                  <span style={{ fontWeight: 'bold' }}>{reciboParaVer.nombreEmpleado}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span>Cargo:</span>
                  <span>{reciboParaVer.cargoEmpleado}</span>
                </div>
              </div>

              <div style={{ width: '100%', borderBottom: '1px dashed #000', margin: '6px 0' }} />

              <div style={{ fontSize: '11px', marginBottom: '6px' }}>
                <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '4px' }}>
                  DETALLE DEL PAGO:
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '3px' }}>
                  <span>Salario Mensual:</span>
                  <span style={{ fontWeight: 'bold' }}>{formatearCordobas(reciboParaVer.salarioMensual)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '3px' }}>
                  <span>Salario Diario (Base 30):</span>
                  <span>{formatearCordobas(reciboParaVer.salarioDiario)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '3px' }}>
                  <span>Días Compensados:</span>
                  <span style={{ fontWeight: 'bold' }}>{reciboParaVer.diasPagados} días</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '3px' }}>
                  <span>Método de Pago:</span>
                  <span>{reciboParaVer.metodoPago}</span>
                </div>
              </div>

              <div style={{ width: '100%', borderTop: '2px dashed #000', borderBottom: '2px dashed #000', padding: '8px 0', margin: '8px 0', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.5px' }}>TOTAL NETO PAGADO:</div>
                <div style={{ fontSize: '18px', fontWeight: '900', marginTop: '3px' }}>
                  {formatearCordobas(reciboParaVer.totalPagado)}
                </div>
              </div>

              <div style={{ fontSize: '10px', textAlign: 'justify', margin: '8px 0', lineHeight: '1.35' }}>
                Recibí a mi entera conformidad el importe indicado en concepto de compensación económica de vacaciones conforme a las leyes laborales vigentes de la República de Nicaragua (Art. 76 C.T.).
              </div>

              <div style={{ marginTop: '26px', display: 'flex', justifyContent: 'space-between', width: '100%', textAlign: 'center', fontSize: '10px' }}>
                <div style={{ width: '45%', borderTop: '1px solid #000', paddingTop: '4px' }}>
                  Firma Colaborador
                </div>
                <div style={{ width: '45%', borderTop: '1px solid #000', paddingTop: '4px' }}>
                  Firma y Sello Tienda
                </div>
              </div>

              <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '16px', borderTop: '1px dashed #888', paddingTop: '6px' }}>
                *** Comprobante Oficial POS-80C ***
              </div>
            </div>,
            document.body
          )}

          {/* Documento Portaled para Impresora en Tamaño Carta / A4 */}
          {formatoImpresionPago === 'carta' && typeof document !== 'undefined' && createPortal(
            <div id="ticket-recibo-carta-print" className="hidden print:block text-black bg-white">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase', color: '#0f172a' }}>
                    SENDA SISTEMAS
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#475569', marginTop: '2px' }}>
                    CONTROL DE PERSONAL Y COMPENSACIÓN LABORAL
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>
                    Marco Legal: Artículo 76 del Código del Trabajo de Nicaragua
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#059669' }}>
                    RECIBO OFICIAL DE VACACIONES
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>
                    {reciboParaVer.numeroRecibo}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                    Fecha: {reciboParaVer.fechaPago}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'center', margin: '14px 0', padding: '6px 0', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#1e293b' }}>
                  COMPROBANTE DE COMPENSACIÓN ECONÓMICA DE VACACIONES
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', fontSize: '11px' }}>
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', background: '#fcfcfd' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '6px' }}>
                    DATOS DEL BENEFICIARIO
                  </div>
                  <div style={{ marginBottom: '4px' }}><span style={{ color: '#64748b' }}>Colaborador:</span> <strong>{reciboParaVer.nombreEmpleado}</strong></div>
                  <div style={{ marginBottom: '4px' }}><span style={{ color: '#64748b' }}>Cargo:</span> {reciboParaVer.cargoEmpleado}</div>
                  <div><span style={{ color: '#64748b' }}>Empresa / Tienda:</span> SENDA SISTEMAS</div>
                </div>

                <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', background: '#fcfcfd' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '6px' }}>
                    DETALLES DE LIQUIDACIÓN
                  </div>
                  <div style={{ marginBottom: '4px' }}><span style={{ color: '#64748b' }}>Método de Pago:</span> <strong>{reciboParaVer.metodoPago}</strong></div>
                  <div style={{ marginBottom: '4px' }}><span style={{ color: '#64748b' }}>Salario Mensual:</span> {formatearCordobas(reciboParaVer.salarioMensual)}</div>
                  <div><span style={{ color: '#64748b' }}>Salario Diario (Base 30):</span> {formatearCordobas(reciboParaVer.salarioDiario)}</div>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: '#065f46', color: '#ffffff', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px', border: '1px solid #065f46' }}>Concepto</th>
                    <th style={{ padding: '8px 10px', border: '1px solid #065f46', textAlign: 'center' }}>Base de Cálculo</th>
                    <th style={{ padding: '8px 10px', border: '1px solid #065f46', textAlign: 'center' }}>Días Compensados</th>
                    <th style={{ padding: '8px 10px', border: '1px solid #065f46', textAlign: 'right' }}>Tarifa Diaria</th>
                    <th style={{ padding: '8px 10px', border: '1px solid #065f46', textAlign: 'right' }}>Total Valorado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', fontWeight: '600' }}>
                      Compensación Económica de Vacaciones (Art. 76 C.T.)
                    </td>
                    <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b' }}>
                      Salario Mensual / 30 días
                    </td>
                    <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold' }}>
                      {reciboParaVer.diasPagados} días
                    </td>
                    <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', textAlign: 'right' }}>
                      {formatearCordobas(reciboParaVer.salarioDiario)}
                    </td>
                    <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>
                      {formatearCordobas(reciboParaVer.totalPagado)}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f1f5f9', fontWeight: 'bold' }}>
                    <td colSpan={4} style={{ padding: '10px', border: '1px solid #cbd5e1', textAlign: 'right', fontSize: '12px' }}>
                      TOTAL NETO PAGADO (C$):
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #cbd5e1', textAlign: 'right', fontSize: '14px', color: '#047857' }}>
                      {formatearCordobas(reciboParaVer.totalPagado)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div style={{ fontSize: '10px', lineHeight: '1.5', color: '#334155', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '10px', background: '#f8fafc', marginBottom: '28px', textAlign: 'justify' }}>
                <strong>CONSTANCIA DE RECIBO:</strong> Recibí a mi entera conformidad de SENDA SISTEMAS la suma indicada en este recibo en concepto de compensación monetaria por días de vacaciones acumulados y no disfrutados, calculados conforme al Artículo 76 del Código del Trabajo de la República de Nicaragua.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', textAlign: 'center', fontSize: '11px', marginTop: '24px' }}>
                <div>
                  <div style={{ borderTop: '1.5px solid #0f172a', paddingTop: '6px', fontWeight: 'bold', color: '#0f172a' }}>
                    {reciboParaVer.nombreEmpleado}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>Firma del Colaborador • Recibí Conforme</div>
                </div>
                <div>
                  <div style={{ borderTop: '1.5px solid #0f172a', paddingTop: '6px', fontWeight: 'bold', color: '#0f172a' }}>
                    Gerencia / Recursos Humanos
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>Firma y Sello Autorizado • Tienda</div>
                </div>
              </div>

              <div style={{ textAlign: 'center', fontSize: '9px', color: '#94a3b8', marginTop: '30px', borderTop: '1px dashed #cbd5e1', paddingTop: '8px' }}>
                Documento Oficial emitido por el Sistema de Control de Personal y Vacaciones SendaVac • Tamaño Carta (A4)
              </div>
            </div>,
            document.body
          )}
        </div>
      )}

      {/* MODAL 4: CALCULAR Y REGISTRAR HORAS EXTRAS */}
      {modalNuevaHoraExtra && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-950/45 backdrop-blur-[2px] animate-fadeIn">
          <div className="relative w-full max-w-xl bg-white dark:bg-[#0f172a] rounded-[24px] sm:rounded-[28px] p-5 sm:p-7 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                    Calcular y Registrar Horas Extras
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Valoración legal de Nicaragua (Art. 58 C.T. • 100% de recargo)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalNuevaHoraExtra(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarHorasExtras} className="space-y-4 text-xs">
              {/* Selección de Colaborador */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Colaborador
                </label>
                <select
                  value={formHEEmpId}
                  onChange={(e) => handleCambioEmpHE(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
                >
                  {empleados.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nombre} — {emp.cargo} ({formatearCordobas(emp.salarioMensual || 12000)}/mes)
                    </option>
                  ))}
                </select>
              </div>

              {/* Período de Cálculo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Tipo de Período
                  </label>
                  <select
                    value={formHEPeriodo}
                    onChange={(e) => handleCambioPeriodoHE(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
                  >
                    <option value="Semanal">Semanal (7 días)</option>
                    <option value="Quincenal">Quincenal (15 días)</option>
                    <option value="Mensual">Mensual (30 días)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    required
                    value={formHEInicio}
                    onChange={(e) => setFormHEInicio(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    required
                    value={formHEFin}
                    onChange={(e) => setFormHEFin(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              {/* Salario y Horas Extras */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Salario Mensual Base (C$)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={formHESalario}
                    onChange={(e) => setFormHESalario(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Horas Extras Acumuladas
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    required
                    value={formHEHoras}
                    onChange={(e) => setFormHEHoras(parseFloat(e.target.value) || 0)}
                    placeholder="Ej. 10"
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-black text-indigo-600 dark:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-sm"
                  />
                </div>
              </div>

              {/* Panel de Cálculo en Tiempo Real según Ley de Nicaragua */}
              {(() => {
                const valorOrd = Math.round((formHESalario / 240) * 100) / 100;
                const valorExtra = Math.round((valorOrd * 2) * 100) / 100;
                const subtotal = Math.round((formHEHoras * valorExtra) * 100) / 100;
                return (
                  <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/80 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-indigo-200/60 dark:border-indigo-800/60">
                      <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Calculator className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Desglose de Valoración (Art. 58 C.T.)</span>
                      </span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                        100% Recargo Legal
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                      <div>
                        <span className="text-slate-500 block">Salario Diario:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {formatearCordobas(formHESalario / 30)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Hora Ordinaria (8h):</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {formatearCordobas(valorOrd)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Hora Extra (x2):</span>
                        <span className="font-black text-indigo-600 dark:text-indigo-400">
                          {formatearCordobas(valorExtra)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-between">
                      <span className="font-black uppercase text-slate-700 dark:text-slate-300 text-xs">
                        Total Valorado a Pagar:
                      </span>
                      <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                        {formatearCordobas(subtotal)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Estado y Observaciones */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Estado Inicial
                  </label>
                  <select
                    value={formHEEstado}
                    onChange={(e) => setFormHEEstado(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
                  >
                    <option value="Aprobado">Aprobado</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="Pagado">Pagado</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Motivo / Justificación
                  </label>
                  <input
                    type="text"
                    value={formHEObs}
                    onChange={(e) => setFormHEObs(e.target.value)}
                    placeholder="Ej. Jornada extraordinaria cierre contable o inventario"
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalNuevaHoraExtra(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Guardar y Emitir Comprobante</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: VER E IMPRIMIR COMPROBANTE DE HORAS EXTRAS (TICKET POS-80C Y TAMAÑO CARTA A4) */}
      {comprobanteHEParaVer && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-slate-950/50 backdrop-blur-[2px] animate-fadeIn">
          <div className={`relative w-full ${formatoImpresionHE === 'carta' ? 'max-w-4xl' : 'max-w-[480px]'} bg-white dark:bg-[#0f172a] rounded-[24px] shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[92vh] transition-all`}>
            
            {/* Header del Modal Fijo */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <Receipt className="w-5 h-5" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Comprobante {comprobanteHEParaVer.numeroComprobante}
                </h3>
              </div>
              <button
                onClick={() => setComprobanteHEParaVer(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector de Formato Fijo */}
            <div className="px-5 pt-3 pb-1 shrink-0">
              <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setFormatoImpresionHE('pos')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    formatoImpresionHE === 'pos'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Ticket POS-80C (80mm)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormatoImpresionHE('carta')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    formatoImpresionHE === 'carta'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Tamaño Carta (A4)</span>
                </button>
              </div>
            </div>

            {/* Cuerpo del Modal con Scroll */}
            <div className="px-5 py-3 overflow-y-auto flex-1 space-y-3">
              {/* Vista previa Formato Ticket Térmico POS-80C */}
              {formatoImpresionHE === 'pos' ? (
                <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-dashed border-indigo-300 dark:border-indigo-800 space-y-2.5 text-xs">
                  <div className="text-center pb-2 border-b border-dashed border-slate-200 dark:border-slate-800">
                    <p className="font-black text-sm uppercase">SENDA SISTEMAS</p>
                    <p className="text-[10px] text-slate-400 font-semibold">Comprobante de Horas Extras • Ley Laboral de Nicaragua (Art. 58 C.T.)</p>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Colaborador:</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">{comprobanteHEParaVer.nombreEmpleado}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cargo / Área:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{comprobanteHEParaVer.cargoEmpleado} • {comprobanteHEParaVer.departamento}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Período ({comprobanteHEParaVer.periodoTipo}):</span>
                    <span className="font-semibold">{comprobanteHEParaVer.fechaInicioPeriodo} al {comprobanteHEParaVer.fechaFinPeriodo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Horas Extras Acumuladas:</span>
                    <span className="font-black text-indigo-600 dark:text-indigo-400">{comprobanteHEParaVer.horasExtras} horas</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Valor Hora Extra (100% Recargo):</span>
                    <span className="font-semibold">{formatearCordobas(comprobanteHEParaVer.valorHoraExtra)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Estado del Pago:</span>
                    <span className={`font-black px-2 py-0.5 rounded-full text-[10px] ${
                      comprobanteHEParaVer.estado === 'Pagado'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                    }`}>
                      {comprobanteHEParaVer.estado}
                    </span>
                  </div>

                  <div className="border-t-2 border-b-2 border-dashed border-slate-300 dark:border-slate-700 py-2 my-2 text-center">
                    <span className="text-[10px] font-black uppercase text-slate-500">Total Valorado a Liquidar:</span>
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                      {formatearCordobas(comprobanteHEParaVer.totalPagar)}
                    </p>
                  </div>
                </div>
              ) : (
                /* Vista previa Formato Documento Formal Carta / A4 */
                <div className="bg-slate-50 dark:bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3.5 text-xs shadow-inner">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-2">
                    <div>
                      <p className="font-black text-base text-slate-900 dark:text-white uppercase tracking-wider">SENDA SISTEMAS</p>
                      <p className="text-[11px] text-slate-500 font-medium">Control de Asistencia y Tiempo Laboral • Art. 58 C.T. (100% Recargo)</p>
                    </div>
                    <div className="sm:text-right">
                      <span className="inline-block px-2.5 py-1 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs">
                        {comprobanteHEParaVer.numeroComprobante}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">Fecha Emisión: {comprobanteHEParaVer.fechaRegistro}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700/60 space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Datos del Colaborador</p>
                      <p className="font-bold text-slate-900 dark:text-white text-sm">{comprobanteHEParaVer.nombreEmpleado}</p>
                      <p className="text-slate-600 dark:text-slate-300">Cargo: {comprobanteHEParaVer.cargoEmpleado}</p>
                      <p className="text-slate-600 dark:text-slate-300">Área / Tienda: {comprobanteHEParaVer.departamento}</p>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700/60 space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Período de Liquidación</p>
                      <p className="text-slate-600 dark:text-slate-300">Modalidad: <strong className="text-slate-900 dark:text-white">{comprobanteHEParaVer.periodoTipo}</strong></p>
                      <p className="text-slate-600 dark:text-slate-300">Rango: <span className="font-semibold">{comprobanteHEParaVer.fechaInicioPeriodo} al {comprobanteHEParaVer.fechaFinPeriodo}</span></p>
                      <p className="text-slate-600 dark:text-slate-300">Salario Mensual: <strong>{formatearCordobas(comprobanteHEParaVer.salarioMensual)}</strong></p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/60">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px]">
                          <th className="py-2 px-3 font-bold">Concepto</th>
                          <th className="py-2 px-3 text-right font-bold">Hora Ordinaria</th>
                          <th className="py-2 px-3 text-right font-bold">Tarifa Extra (+100%)</th>
                          <th className="py-2 px-3 text-right font-bold">Horas Acumuladas</th>
                          <th className="py-2 px-3 text-right font-bold">Total Valorado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                        <tr>
                          <td className="py-2.5 px-3 font-semibold">Horas Extras Laboradas (Art. 58 C.T.)</td>
                          <td className="py-2.5 px-3 text-right">{formatearCordobas(comprobanteHEParaVer.valorHoraOrdinaria)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-indigo-600 dark:text-indigo-400">{formatearCordobas(comprobanteHEParaVer.valorHoraExtra)}</td>
                          <td className="py-2.5 px-3 text-right font-bold">{comprobanteHEParaVer.horasExtras} hrs</td>
                          <td className="py-2.5 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">{formatearCordobas(comprobanteHEParaVer.totalPagar)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-900/50 flex justify-between items-center">
                    <span className="font-bold text-slate-700 dark:text-slate-300">TOTAL VALORADO A LIQUIDAR:</span>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatearCordobas(comprobanteHEParaVer.totalPagar)}</span>
                  </div>

                  <p className="text-[10px] text-slate-500 italic text-justify leading-relaxed">
                    Conste por el presente documento que las horas extraordinarias detalladas han sido debidamente auditadas y autorizadas conforme a los artículos 57 y 58 del Código del Trabajo de la República de Nicaragua, pagándose con el cien por ciento (100%) de recargo legal sobre el valor ordinario.
                  </p>

                  <div className="grid grid-cols-2 gap-8 pt-3 text-center">
                    <div className="border-t border-slate-300 dark:border-slate-700 pt-1">
                      <p className="font-bold text-slate-800 dark:text-slate-200">{comprobanteHEParaVer.nombreEmpleado}</p>
                      <p className="text-[10px] text-slate-400">Firma del Colaborador • Recibí Conforme</p>
                    </div>
                    <div className="border-t border-slate-300 dark:border-slate-700 pt-1">
                      <p className="font-bold text-slate-800 dark:text-slate-200">Gerencia / RRHH</p>
                      <p className="text-[10px] text-slate-400">Firma y Sello Autorizado • SENDA SISTEMAS</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Fijo con Botones de Acción */}
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 rounded-b-[24px] shrink-0">
              {formatoImpresionHE === 'pos' ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setComprobanteHEParaVer(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 bg-slate-900 hover:bg-black text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition text-xs shadow-md cursor-pointer active:scale-95"
                  >
                    <Printer className="w-4 h-4 text-indigo-400" />
                    <span>Imprimir Ticket Térmico (POS-80C)</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setComprobanteHEParaVer(null)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer order-last sm:order-first"
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="w-full sm:flex-1 bg-slate-900 hover:bg-black text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition text-xs shadow-md cursor-pointer active:scale-95"
                  >
                    <Printer className="w-4 h-4 text-indigo-400" />
                    <span>Imprimir Carta / A4</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => descargarPDFHorasExtras(comprobanteHEParaVer)}
                    className="w-full sm:flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition text-xs shadow-md cursor-pointer active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar PDF (Carta/A4)</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Ticket Portaled para Impresora POS-80C */}
          {formatoImpresionHE === 'pos' && typeof document !== 'undefined' && createPortal(
            <div id="comprobante-horas-extras-print" className="hidden print:block text-black bg-white">
              <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <div style={{ fontWeight: '900', fontSize: '15px', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  SENDA SISTEMAS
                </div>
                <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '2px' }}>
                  CONTROL DE HORAS EXTRAS LABORALES
                </div>
                <div style={{ fontSize: '10px', color: '#222', marginTop: '1px' }}>
                  Ley Laboral de Nicaragua • Art. 58 C.T.
                </div>
                <div style={{ width: '100%', borderBottom: '1.5px dashed #000', margin: '6px 0' }} />
                <div style={{ fontWeight: '900', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  COMPROBANTE DE HORAS EXTRAS
                </div>
                <div style={{ width: '100%', borderBottom: '1.5px dashed #000', margin: '6px 0' }} />
              </div>

              <div style={{ fontSize: '11px', marginBottom: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '2px' }}>
                  <span>Fecha Emisión:</span>
                  <span>{comprobanteHEParaVer.fechaRegistro}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span>No. Comprobante:</span>
                  <span style={{ fontWeight: 'bold' }}>{comprobanteHEParaVer.numeroComprobante}</span>
                </div>
              </div>

              <div style={{ width: '100%', borderBottom: '1px dashed #000', margin: '6px 0' }} />

              <div style={{ fontSize: '11px', marginBottom: '6px' }}>
                <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '4px' }}>
                  DATOS DEL COLABORADOR:
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '2px' }}>
                  <span>Nombre:</span>
                  <span style={{ fontWeight: 'bold' }}>{comprobanteHEParaVer.nombreEmpleado}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span>Cargo:</span>
                  <span>{comprobanteHEParaVer.cargoEmpleado}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span>Área:</span>
                  <span>{comprobanteHEParaVer.departamento}</span>
                </div>
              </div>

              <div style={{ width: '100%', borderBottom: '1px dashed #000', margin: '6px 0' }} />

              <div style={{ fontSize: '11px', marginBottom: '6px' }}>
                <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '4px' }}>
                  DETALLE DE VALORACIÓN:
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '3px' }}>
                  <span>Período Evaluado:</span>
                  <span style={{ fontWeight: 'bold' }}>{comprobanteHEParaVer.periodoTipo}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '3px' }}>
                  <span>Rango de Fechas:</span>
                  <span>{comprobanteHEParaVer.fechaInicioPeriodo} al {comprobanteHEParaVer.fechaFinPeriodo}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '3px' }}>
                  <span>Salario Mensual:</span>
                  <span>{formatearCordobas(comprobanteHEParaVer.salarioMensual)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '3px' }}>
                  <span>Hora Ordinaria:</span>
                  <span>{formatearCordobas(comprobanteHEParaVer.valorHoraOrdinaria)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '3px' }}>
                  <span>Hora Extra (+100% Art. 58):</span>
                  <span style={{ fontWeight: 'bold' }}>{formatearCordobas(comprobanteHEParaVer.valorHoraExtra)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '3px' }}>
                  <span>Horas Extras Laboradas:</span>
                  <span style={{ fontWeight: 'bold' }}>{comprobanteHEParaVer.horasExtras} hrs</span>
                </div>
              </div>

              <div style={{ width: '100%', borderTop: '2px dashed #000', borderBottom: '2px dashed #000', padding: '8px 0', margin: '8px 0', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.5px' }}>TOTAL A PAGAR (C$):</div>
                <div style={{ fontSize: '18px', fontWeight: '900', marginTop: '3px' }}>
                  {formatearCordobas(comprobanteHEParaVer.totalPagar)}
                </div>
              </div>

              <div style={{ fontSize: '10px', textAlign: 'justify', margin: '8px 0', lineHeight: '1.35' }}>
                Conste por el presente documento que las horas extraordinarias detalladas han sido validadas conforme a los artículos 57 y 58 del Código del Trabajo de la República de Nicaragua.
              </div>

              <div style={{ marginTop: '26px', display: 'flex', justifyContent: 'space-between', width: '100%', textAlign: 'center', fontSize: '10px' }}>
                <div style={{ width: '45%', borderTop: '1px solid #000', paddingTop: '4px' }}>
                  Firma Colaborador
                </div>
                <div style={{ width: '45%', borderTop: '1px solid #000', paddingTop: '4px' }}>
                  Firma y Sello Gerencia
                </div>
              </div>

              <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '16px', borderTop: '1px dashed #888', paddingTop: '6px' }}>
                *** Comprobante Oficial POS-80C • SENDA SISTEMAS ***
              </div>
            </div>,
            document.body
          )}

          {/* Documento Portaled para Impresora en Tamaño Carta / A4 */}
          {formatoImpresionHE === 'carta' && typeof document !== 'undefined' && createPortal(
            <div id="comprobante-horas-extras-carta-print" className="hidden print:block text-black bg-white">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #1e293b', paddingBottom: '12px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase', color: '#0f172a' }}>
                    SENDA SISTEMAS
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#475569', marginTop: '2px' }}>
                    CONTROL DE ASISTENCIA Y GESTIÓN DE TIEMPO LABORAL
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>
                    Marco Legal: Artículos 57 y 58 del Código del Trabajo de Nicaragua
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#4338ca' }}>
                    COMPROBANTE OFICIAL
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>
                    {comprobanteHEParaVer.numeroComprobante}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                    Fecha: {comprobanteHEParaVer.fechaRegistro}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'center', margin: '14px 0', padding: '6px 0', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#1e293b' }}>
                  CERTIFICACIÓN DE LIQUIDACIÓN DE HORAS EXTRAORDINARIAS
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', fontSize: '11px' }}>
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', background: '#fcfcfd' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '6px' }}>
                    DATOS DEL COLABORADOR
                  </div>
                  <div style={{ marginBottom: '4px' }}><span style={{ color: '#64748b' }}>Nombre:</span> <strong>{comprobanteHEParaVer.nombreEmpleado}</strong></div>
                  <div style={{ marginBottom: '4px' }}><span style={{ color: '#64748b' }}>Cargo:</span> {comprobanteHEParaVer.cargoEmpleado}</div>
                  <div><span style={{ color: '#64748b' }}>Área / Tienda:</span> {comprobanteHEParaVer.departamento}</div>
                </div>

                <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', background: '#fcfcfd' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '6px' }}>
                    PERÍODO Y SALARIO BASE
                  </div>
                  <div style={{ marginBottom: '4px' }}><span style={{ color: '#64748b' }}>Modalidad:</span> Período {comprobanteHEParaVer.periodoTipo}</div>
                  <div style={{ marginBottom: '4px' }}><span style={{ color: '#64748b' }}>Vigencia:</span> {comprobanteHEParaVer.fechaInicioPeriodo} al {comprobanteHEParaVer.fechaFinPeriodo}</div>
                  <div><span style={{ color: '#64748b' }}>Salario Mensual:</span> <strong>{formatearCordobas(comprobanteHEParaVer.salarioMensual)}</strong></div>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: '#312e81', color: '#ffffff', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px', border: '1px solid #312e81' }}>Concepto</th>
                    <th style={{ padding: '8px 10px', border: '1px solid #312e81', textAlign: 'center' }}>Fórmula / Base</th>
                    <th style={{ padding: '8px 10px', border: '1px solid #312e81', textAlign: 'center' }}>Horas Computadas</th>
                    <th style={{ padding: '8px 10px', border: '1px solid #312e81', textAlign: 'right' }}>Tarifa Hora (+100%)</th>
                    <th style={{ padding: '8px 10px', border: '1px solid #312e81', textAlign: 'right' }}>Total Valorado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', fontWeight: '600' }}>
                      Horas Extras Art. 58 C.T.
                    </td>
                    <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b' }}>
                      Salario / 240 hrs x 2
                    </td>
                    <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold' }}>
                      {comprobanteHEParaVer.horasExtras} hrs
                    </td>
                    <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', textAlign: 'right' }}>
                      {formatearCordobas(comprobanteHEParaVer.valorHoraExtra)}
                    </td>
                    <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>
                      {formatearCordobas(comprobanteHEParaVer.totalPagar)}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f1f5f9', fontWeight: 'bold' }}>
                    <td colSpan={4} style={{ padding: '10px', border: '1px solid #cbd5e1', textAlign: 'right', fontSize: '12px' }}>
                      TOTAL NETO A LIQUIDAR (C$):
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #cbd5e1', textAlign: 'right', fontSize: '14px', color: '#047857' }}>
                      {formatearCordobas(comprobanteHEParaVer.totalPagar)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div style={{ fontSize: '10px', lineHeight: '1.5', color: '#334155', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '10px', background: '#f8fafc', marginBottom: '28px', textAlign: 'justify' }}>
                <strong>DECLARACIÓN DE CONFORMIDAD:</strong> Por medio del presente documento, la empresa hace constar la acreditación y valoración de las horas extraordinarias efectivamente laboradas por el colaborador durante el período de referencia, calculadas con el cien por ciento (100%) de recargo sobre la hora ordinaria en estricto apego al Artículo 58 del Código del Trabajo de la República de Nicaragua. El colaborador manifiesta haber recibido la remuneración correspondiente o su programación en nómina a su entera satisfacción.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', textAlign: 'center', fontSize: '11px', marginTop: '24px' }}>
                <div>
                  <div style={{ borderTop: '1.5px solid #0f172a', paddingTop: '6px', fontWeight: 'bold', color: '#0f172a' }}>
                    {comprobanteHEParaVer.nombreEmpleado}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>Firma del Colaborador • Recibí Conforme</div>
                </div>
                <div>
                  <div style={{ borderTop: '1.5px solid #0f172a', paddingTop: '6px', fontWeight: 'bold', color: '#0f172a' }}>
                    Gerencia General / Recursos Humanos
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>Firma y Sello Autorizado • SENDA SISTEMAS</div>
                </div>
              </div>

              <div style={{ textAlign: 'center', fontSize: '9px', color: '#94a3b8', marginTop: '30px', borderTop: '1px dashed #cbd5e1', paddingTop: '8px' }}>
                Documento Oficial emitido por el Sistema de Control de Personal y Vacaciones SendaVac • Tamaño Carta (A4)
              </div>
            </div>,
            document.body
          )}
        </div>
      )}

      {/* PESTAÑA 4: DÍAS LIBRES SEMANALES (Art. 64 C.T.) */}
      {tabActiva === 'dias_libres' && (
        <div className="space-y-6 animate-fadeIn">
          <ModuloDiasLibres />
        </div>
      )}

      {/* PESTAÑA 5: DÍAS FERIADOS Y COMPENSACIÓN (Art. 66 y 67 C.T.) */}
      {tabActiva === 'feriados' && (
        <div className="space-y-6 animate-fadeIn">
          <ModuloFeriados />
        </div>
      )}

      {/* PESTAÑA 6: HISTORIAL DE DÍAS LIBRES Y VACACIONES TOMADAS */}
      {tabActiva === 'historial' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Banner Superior Explicativo */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-7 shadow-lg border border-blue-800/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-[11px] font-black uppercase tracking-wider text-blue-200">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Auditoría Laboral Ley N° 185</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black">
                Historial Oficial de Días Libres y Vacaciones Tomadas
              </h2>
              <p className="text-xs text-blue-200/80 max-w-2xl leading-relaxed">
                Supervisa el historial cronológico individual o colectivo de descansos semanales (Art. 64), descansos de feriados (Art. 67), días a cuenta y vacaciones acumuladas o gozadas (Art. 76).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {colaboradorHistorialId && (
                <button
                  type="button"
                  onClick={() => {
                    const emp = empleados.find((e) => e.id === colaboradorHistorialId);
                    if (emp) setHistorialModalEmp(emp);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white text-blue-900 hover:bg-blue-50 text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <History className="w-4 h-4 text-blue-600" />
                  <span>Ver Expediente en Modal</span>
                </button>
              )}
            </div>
          </div>

          {/* Selector de Colaborador */}
          <div className="bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <label htmlFor="selector-colaborador-historial" className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 whitespace-nowrap">
                Seleccionar Colaborador:
              </label>
            </div>

            <select
              id="selector-colaborador-historial"
              value={colaboradorHistorialId || (empleados.length > 0 ? empleados[0].id : '')}
              onChange={(e) => setColaboradorHistorialId(e.target.value)}
              className="w-full sm:max-w-md px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {empleados.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.nombre} — {emp.cargo} ({emp.saldoDisponible} días saldo)
                </option>
              ))}
            </select>
          </div>

          {/* Resumen del Empleado Seleccionado */}
          {(() => {
            const empActual = empleados.find(
              (e) => e.id === (colaboradorHistorialId || (empleados[0]?.id || ''))
            );
            if (!empActual) {
              return (
                <div className="p-8 text-center bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs text-slate-400">
                  No hay colaboradores registrados en el sistema.
                </div>
              );
            }

            const itemsHist = obtenerHistorialDescansosEmpleado(empActual.id);
            const res = calcularResumenHistorialDescansos(itemsHist, empActual.id);

            return (
              <div className="space-y-4">
                {/* 4 Métricas Clave */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                      Vacaciones Gozadas
                    </span>
                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                      {res.totalDiasVacacionesGozadas} <span className="text-xs font-normal text-slate-400">días</span>
                    </p>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Art. 76 C.T.</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                      Descansos Semanales
                    </span>
                    <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                      {res.totalDescansosSemanales} <span className="text-xs font-normal text-slate-400">días</span>
                    </p>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Art. 64 C.T.</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                      Compensatorios / Feriados
                    </span>
                    <p className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">
                      {res.totalDiasCompensatorios} <span className="text-xs font-normal text-slate-400">días</span>
                    </p>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Art. 67 C.T.</span>
                  </div>

                  <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
                    <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block">
                      Saldo Disponible Hoy
                    </span>
                    <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
                      {empActual.saldoDisponible} <span className="text-xs font-normal text-emerald-600">días</span>
                    </p>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">
                      Equivalente: {formatearCordobas(((empActual.salarioMensual || 0) / 30) * empActual.saldoDisponible)}
                    </span>
                  </div>
                </div>

                {/* Tabla Cronológica de Descansos del Colaborador */}
                <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                        <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>Detalle Cronológico: {empActual.nombre}</span>
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {itemsHist.length} evento(s) de descanso registrados en el sistema
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => exportarHistorialDescansosPDF(empActual, itemsHist, res)}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-xs font-bold border border-blue-200 dark:border-blue-800 transition flex items-center gap-1 cursor-pointer"
                        title="Descargar reporte oficial en PDF tamaño carta"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Exportar PDF</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setHistorialModalEmp(empActual)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Vista Completa</span>
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800 uppercase text-[10px] font-black tracking-wider">
                          <th className="py-3 px-4">Fecha / Período</th>
                          <th className="py-3 px-3 text-center">Días</th>
                          <th className="py-3 px-4">Tipo Descanso</th>
                          <th className="py-3 px-3 text-center">Deducción Saldo</th>
                          <th className="py-3 px-3 text-center">Estado</th>
                          <th className="py-3 px-4">Motivo / Base Legal</th>
                          <th className="py-3 px-3">Autorizado Por</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        {itemsHist.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                              No hay registros de descansos o vacaciones para este colaborador aún.
                            </td>
                          </tr>
                        ) : (
                          itemsHist.map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                              <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                {item.fechaInicio === item.fechaFin || !item.fechaFin 
                                  ? item.fechaInicio 
                                  : `${item.fechaInicio} al ${item.fechaFin}`}
                              </td>
                              <td className="py-3 px-3 text-center font-black text-blue-600 dark:text-blue-400">
                                {item.dias}
                              </td>
                              <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                                {item.tipo}
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
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  item.estado === 'Disfrutado'
                                    ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                                    : item.estado === 'Cancelado'
                                    ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300'
                                    : 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300'
                                }`}>
                                  {item.estado}
                                </span>
                              </td>
                              <td className="py-3 px-4 max-w-xs truncate text-slate-600 dark:text-slate-400">
                                {item.motivo || item.observacionLegal || 'Descanso autorizado'}
                              </td>
                              <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                                {item.autorizadoPor || 'Administración'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Modal Historial de Descansos Reutilizable */}
      <ModalHistorialDescansos
        isOpen={!!historialModalEmp}
        onClose={() => setHistorialModalEmp(null)}
        empleado={historialModalEmp}
        solicitudes={solicitudes}
      />

      {/* Modal de Confirmación para Borrar */}
      <ConfirmModal
        isOpen={itemParaBorrar !== null}
        onClose={() => setItemParaBorrar(null)}
        onConfirm={confirmarEliminacion}
        title="¿Eliminar Registro?"
        itemName={itemParaBorrar?.nombre}
        message={`¿Está seguro de que desea eliminar este registro de ${itemParaBorrar?.tipo === 'descanso' ? 'descanso programado' : itemParaBorrar?.tipo === 'pago' ? 'vacación pagada' : 'horas extras'}?`}
        confirmText="Sí, Eliminar"
        cancelText="Cancelar"
        type="danger"
        iconShape="circle"
      />
    </div>
  );
};
