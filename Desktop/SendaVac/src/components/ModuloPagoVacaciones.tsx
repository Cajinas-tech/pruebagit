import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  DollarSign, 
  Receipt, 
  Calculator, 
  Printer, 
  ShieldCheck, 
  X, 
  Users, 
  ChevronDown,
  FileDown,
  Briefcase,
  Palmtree,
  Gift,
  AlertCircle,
  Calendar,
  Layers,
  Scale,
  Clock
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useData } from '../context/DataContext';
import { 
  formatearCordobas, 
  calcularLiquidacionMonetaria, 
  calcularLiquidacionCompletaNica,
  ResultadoLiquidacionCompletaNica,
  MotivoTerminacionLaboral
} from '../utils/calculosNica';

interface PropsModuloPago {
  saldoDisponible?: number;
  nombreEmpleado?: string;
  cargoEmpleado?: string;
  salarioMensualInicial?: number;
  empleadoInicialId?: string;
  onCerrar?: () => void;
}

export const ModuloPagoVacaciones: React.FC<PropsModuloPago> = ({
  saldoDisponible: saldoProp,
  nombreEmpleado: nombreProp,
  cargoEmpleado: cargoProp,
  salarioMensualInicial: salarioProp,
  empleadoInicialId,
  onCerrar
}) => {
  const { empleados } = useData();

  // Modo de cálculo por pestañas: 'completa' o 'vacaciones_solo'
  const [modoCalculo, setModoCalculo] = useState<'completa' | 'vacaciones_solo'>('completa');

  // ID del colaborador seleccionado
  const [empleadoSeleccionadoId, setEmpleadoSeleccionadoId] = useState<string>(() => {
    if (empleadoInicialId) return empleadoInicialId;
    if (nombreProp) {
      const match = empleados.find(e => e.nombre.toLowerCase() === nombreProp.toLowerCase());
      if (match) return match.id;
    }
    return empleados[0]?.id || '';
  });

  const empleadoActual = empleados.find(e => e.id === empleadoSeleccionadoId) || empleados[0];

  // Datos base
  const [nombreEmpleado, setNombreEmpleado] = useState<string>(() => empleadoActual?.nombre || nombreProp || 'Colaborador');
  const [cargoEmpleado, setCargoEmpleado] = useState<string>(() => empleadoActual?.cargo || cargoProp || 'Colaborador');
  const [fechaIngreso, setFechaIngreso] = useState<string>(() => empleadoActual?.fechaIngreso || '2023-01-15');
  const [fechaEgreso, setFechaEgreso] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [salarioMensual, setSalarioMensual] = useState<number>(() => empleadoActual?.salarioMensual || salarioProp || 12000);
  
  // Parámetros de Liquidación Completa
  const [motivoTerminacion, setMotivoTerminacion] = useState<MotivoTerminacionLaboral>('despido_sin_causa');
  const [diasVacaciones, setDiasVacaciones] = useState<number>(() => {
    return empleadoActual ? empleadoActual.saldoDisponible : (saldoProp !== undefined ? saldoProp : 15);
  });
  const [diasSalarioPendiente, setDiasSalarioPendiente] = useState<number>(0);
  const [deduccionesExtras, setDeduccionesExtras] = useState<number>(0);
  const [retenerInssSalario, setRetenerInssSalario] = useState<boolean>(true);

  // Estados de cálculo
  const [resultadoCompleto, setResultadoCompleto] = useState<ResultadoLiquidacionCompletaNica | null>(null);
  const [montoVacacionesSolo, setMontoVacacionesSolo] = useState<number | null>(null);
  const [salarioDiarioVacacionesSolo, setSalarioDiarioVacacionesSolo] = useState<number | null>(null);
  const [mostrarComprobante, setMostrarComprobante] = useState<boolean>(false);
  const [generandoPdf, setGenerandoPdf] = useState<boolean>(false);

  // Sincronizar colaborador cuando cambian las props
  useEffect(() => {
    if (empleadoInicialId) {
      setEmpleadoSeleccionadoId(empleadoInicialId);
      const emp = empleados.find(e => e.id === empleadoInicialId);
      if (emp) {
        setNombreEmpleado(emp.nombre);
        setCargoEmpleado(emp.cargo);
        setFechaIngreso(emp.fechaIngreso || '2023-01-15');
        setSalarioMensual(emp.salarioMensual || 12000);
        setDiasVacaciones(emp.saldoDisponible);
      }
    } else if (!empleadoSeleccionadoId && empleados.length > 0) {
      const primerEmp = empleados[0];
      setEmpleadoSeleccionadoId(primerEmp.id);
      setNombreEmpleado(primerEmp.nombre);
      setCargoEmpleado(primerEmp.cargo);
      setFechaIngreso(primerEmp.fechaIngreso || '2023-01-15');
      setSalarioMensual(primerEmp.salarioMensual || 12000);
      setDiasVacaciones(primerEmp.saldoDisponible);
    }
  }, [empleadoInicialId, empleados]);

  // Manejar cambio de colaborador seleccionado
  const handleCambiarColaborador = (id: string) => {
    setEmpleadoSeleccionadoId(id);
    if (id === 'manual') {
      setNombreEmpleado('Colaborador Externo');
      setCargoEmpleado('Personal');
      setFechaIngreso('2023-01-01');
      setSalarioMensual(12000);
      setDiasVacaciones(15);
      setResultadoCompleto(null);
      setMontoVacacionesSolo(null);
      setMostrarComprobante(false);
      return;
    }

    const emp = empleados.find(e => e.id === id);
    if (emp) {
      setNombreEmpleado(emp.nombre);
      setCargoEmpleado(emp.cargo);
      setFechaIngreso(emp.fechaIngreso || '2023-01-15');
      setSalarioMensual(emp.salarioMensual || 12000);
      setDiasVacaciones(emp.saldoDisponible);
      setResultadoCompleto(null);
      setMontoVacacionesSolo(null);
      setMostrarComprobante(false);
    }
  };

  // Ejecutar cálculo automático al cambiar datos o al hacer submit
  const ejecutarCalculo = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (modoCalculo === 'completa') {
      const res = calcularLiquidacionCompletaNica({
        fechaIngresoStr: fechaIngreso,
        fechaEgresoStr: fechaEgreso,
        salarioMensual,
        diasVacacionesPendientes: diasVacaciones,
        diasSalarioPendientes: diasSalarioPendiente,
        motivoTerminacion,
        deduccionesExtras,
        retenerInssSalario
      });
      setResultadoCompleto(res);
      setMostrarComprobante(true);
    } else {
      if (salarioMensual <= 0 || diasVacaciones <= 0) return;
      const res = calcularLiquidacionMonetaria(salarioMensual, diasVacaciones);
      setSalarioDiarioVacacionesSolo(res.salarioDiario);
      setMontoVacacionesSolo(res.totalBruto);
      setMostrarComprobante(true);
    }
  };

  // Calcular en tiempo real
  useEffect(() => {
    if (modoCalculo === 'completa' && salarioMensual > 0) {
      const res = calcularLiquidacionCompletaNica({
        fechaIngresoStr: fechaIngreso,
        fechaEgresoStr: fechaEgreso,
        salarioMensual,
        diasVacacionesPendientes: diasVacaciones,
        diasSalarioPendientes: diasSalarioPendiente,
        motivoTerminacion,
        deduccionesExtras,
        retenerInssSalario
      });
      setResultadoCompleto(res);
    } else if (modoCalculo === 'vacaciones_solo' && salarioMensual > 0 && diasVacaciones > 0) {
      const res = calcularLiquidacionMonetaria(salarioMensual, diasVacaciones);
      setSalarioDiarioVacacionesSolo(res.salarioDiario);
      setMontoVacacionesSolo(res.totalBruto);
    }
  }, [modoCalculo, fechaIngreso, fechaEgreso, salarioMensual, diasVacaciones, diasSalarioPendiente, motivoTerminacion, deduccionesExtras, retenerInssSalario]);

  const handlePrint = () => {
    window.print();
  };

  // Generar y descargar Finiquito Oficial en PDF
  const handleDescargarPDF = () => {
    if (!resultadoCompleto) return;
    try {
      setGenerandoPdf(true);
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const primaryColor = [29, 99, 255]; // Azul Senda
      const darkColor = [15, 23, 42]; // Slate 900
      const fechaHoy = new Date().toLocaleDateString('es-NI');

      // 1. Franja superior
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 16, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text('SENDA SISTEMAS • CONTROL LABORAL Y DE PERSONAL', 14, 11);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha de Emisión: ${fechaHoy}`, 196, 11, { align: 'right' });

      // 2. Título de Documento
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('ACTA DE FINIQUITO Y LIQUIDACIÓN DEFINITIVA DE PRESTACIONES', 105, 26, { align: 'center' });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Conforme a la Legislación Laboral de la República de Nicaragua • Código del Trabajo (Ley N° 185)', 105, 31, { align: 'center' });

      // 3. Cuadro de Datos Generales del Colaborador
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 36, 182, 34, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text('DATOS DEL COLABORADOR Y CONTRATO', 18, 42);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);

      // Fila 1
      doc.text(`Nombre Completo: `, 18, 48);
      doc.setFont('helvetica', 'bold');
      doc.text(nombreEmpleado, 47, 48);

      doc.setFont('helvetica', 'normal');
      doc.text(`Cargo / Puesto: `, 115, 48);
      doc.setFont('helvetica', 'bold');
      doc.text(cargoEmpleado, 140, 48);

      // Fila 2
      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha de Ingreso: `, 18, 54);
      doc.setFont('helvetica', 'bold');
      doc.text(resultadoCompleto.fechaIngreso, 47, 54);

      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha de Egreso: `, 115, 54);
      doc.setFont('helvetica', 'bold');
      doc.text(resultadoCompleto.fechaEgreso, 140, 54);

      // Fila 3
      doc.setFont('helvetica', 'normal');
      doc.text(`Antigüedad Laboral: `, 18, 60);
      doc.setFont('helvetica', 'bold');
      doc.text(resultadoCompleto.antiguedad.texto, 47, 60);

      doc.setFont('helvetica', 'normal');
      doc.text(`Salario Mensual: `, 115, 60);
      doc.setFont('helvetica', 'bold');
      doc.text(formatearCordobas(resultadoCompleto.salarioMensual), 140, 60);

      // Fila 4
      doc.setFont('helvetica', 'normal');
      doc.text(`Salario Diario (Base 30): `, 18, 66);
      doc.setFont('helvetica', 'bold');
      doc.text(formatearCordobas(resultadoCompleto.salarioDiario), 52, 66);

      doc.setFont('helvetica', 'normal');
      doc.text(`Causal de Término: `, 115, 66);
      doc.setFont('helvetica', 'bold');
      const causalTexto = motivoTerminacion === 'despido_sin_causa' ? 'Despido sin causa (Art. 45)'
        : motivoTerminacion === 'renuncia_con_indemnizacion' ? 'Renuncia con indemnización'
        : motivoTerminacion === 'mutuo_acuerdo' ? 'Mutuo acuerdo de partes'
        : motivoTerminacion === 'despido_con_causa' ? 'Despido con causa justa (Art. 48)'
        : 'Renuncia ordinaria';
      doc.text(causalTexto, 143, 66);

      // 4. Tabla de Liquidación
      autoTable(doc, {
        startY: 75,
        theme: 'grid',
        head: [['RUBRO / CONCEPTO LABORAL', 'BASE LEGAL', 'TIEMPO / DÍAS', 'MONTO BRUTO (C$)', 'DEDUCCIÓN (C$)', 'TOTAL NETO (C$)']],
        body: [
          [
            'Indemnización por Antigüedad',
            'Art. 45 C.T.',
            resultadoCompleto.indemnizacion.aplica 
              ? `${resultadoCompleto.indemnizacion.diasCalculados} días (${resultadoCompleto.indemnizacion.mesesEquivalentes}m)` 
              : 'No aplica',
            formatearCordobas(resultadoCompleto.indemnizacion.monto),
            'C$ 0.00 (Exento)',
            formatearCordobas(resultadoCompleto.indemnizacion.monto)
          ],
          [
            'Vacaciones Acumuladas / Proporcionales',
            'Art. 76 C.T.',
            `${resultadoCompleto.vacaciones.diasPendientes} días`,
            formatearCordobas(resultadoCompleto.vacaciones.monto),
            'C$ 0.00 (Exento)',
            formatearCordobas(resultadoCompleto.vacaciones.monto)
          ],
          [
            'Aguinaldo Proporcional (13vo Mes)',
            'Art. 93 C.T.',
            `${resultadoCompleto.aguinaldo.diasAguinaldoAcumulados} días`,
            formatearCordobas(resultadoCompleto.aguinaldo.monto),
            'C$ 0.00 (Exento)',
            formatearCordobas(resultadoCompleto.aguinaldo.monto)
          ],
          [
            'Salario Pendiente Devengado',
            'Días laborados',
            `${resultadoCompleto.salario.diasLaborados} días`,
            formatearCordobas(resultadoCompleto.salario.montoBruto),
            formatearCordobas(resultadoCompleto.salario.inssLaboral) + ' (7% INSS)',
            formatearCordobas(resultadoCompleto.salario.montoNeto)
          ],
          ...(resultadoCompleto.deducciones.otrasDeducciones > 0 ? [
            [
              'Otras Deducciones / Adelantos',
              'Préstamos / Anticipos',
              '-',
              'C$ 0.00',
              formatearCordobas(resultadoCompleto.deducciones.otrasDeducciones),
              '-' + formatearCordobas(resultadoCompleto.deducciones.otrasDeducciones)
            ]
          ] : [])
        ],
        foot: [
          [
            'TOTAL DEFINITIVO A LIQUIDAR (C$)',
            '',
            '',
            formatearCordobas(resultadoCompleto.totalBruto),
            formatearCordobas(resultadoCompleto.deducciones.totalDeducciones),
            formatearCordobas(resultadoCompleto.netoAPagar)
          ]
        ],
        headStyles: {
          fillColor: [29, 99, 255],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [30, 41, 59]
        },
        footStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'right'
        },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 26, halign: 'center' },
          2: { cellWidth: 26, halign: 'center' },
          3: { cellWidth: 27, halign: 'right' },
          4: { cellWidth: 27, halign: 'right' },
          5: { cellWidth: 26, halign: 'right' }
        },
        margin: { left: 14, right: 14 }
      });

      // 5. Cláusula de Finiquito Legal
      const finalY = (doc as any).lastAutoTable?.finalY || 160;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text('DECLARACIÓN Y FINIQUITO LEGAL DEL TRABAJADOR:', 14, finalY + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      const textoFiniquito = `El(La) suscrito(a) ${nombreEmpleado}, confirma haber recibido a su entera satisfacción de la empresa SENDA SISTEMAS la suma total de ${formatearCordobas(resultadoCompleto.netoAPagar)} en concepto de pago íntegro, justo y definitivo de todas sus prestaciones sociales (Indemnización por Antigüedad según Art. 45, Vacaciones Acumuladas según Art. 76, Aguinaldo Proporcional según Art. 93 y Salarios devengados), no quedando pendiente reclamo laboral alguno por ningún concepto de conformidad con el Código del Trabajo de la República de Nicaragua (Ley N° 185).`;
      doc.text(doc.splitTextToSize(textoFiniquito, 182), 14, finalY + 13);

      // 6. Firmas
      const firmasY = finalY + 38;

      doc.setDrawColor(148, 163, 184);
      doc.line(20, firmasY, 85, firmasY);
      doc.line(125, firmasY, 190, firmasY);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text('FIRMA DEL COLABORADOR', 52.5, firmasY + 4, { align: 'center' });
      doc.text('EMPLEADOR / GERENCIA GENERAL', 157.5, firmasY + 4, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Cédula: ________________________`, 52.5, firmasY + 8, { align: 'center' });
      doc.text(`SENDA SISTEMAS • Sello Oficial`, 157.5, firmasY + 8, { align: 'center' });

      // Guardar PDF
      const nombreArchivo = `Finiquito_Liquidacion_${nombreEmpleado.replace(/\s+/g, '_')}_${fechaHoy.replace(/\//g, '-')}.pdf`;
      doc.save(nombreArchivo);
    } catch (err) {
      console.error('Error generando PDF de liquidación:', err);
    } finally {
      setGenerandoPdf(false);
    }
  };

  return (
    <>
      <div className="space-y-6 animate-fadeIn w-full">
        {/* HEADER BANNER IDÉNTICO AL DISEÑO DE GESTIÓN DE SOLICITUDES */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/60 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs backdrop-blur-md">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-blue-500/25 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Calculator className="w-6 h-6 sm:w-7 sm:h-7 text-[#1d63ff] dark:text-blue-400" />
              </div>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Calculadora de Liquidaciones Laborales
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Cálculo de prestaciones sociales y finiquitos de conformidad con la Ley N° 185 (Nicaragua)
              </p>
            </div>
          </div>

          {/* Indicador de Estado o Acción Rápida & Botón Cerrar si es modal */}
          <div className="flex items-center gap-2.5 shrink-0">
            {modoCalculo === 'completa' ? (
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 font-bold text-xs">
                <Scale className="w-4 h-4 text-blue-600" />
                <span>4 Rubros de Ley Integrados</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                <Palmtree className="w-4 h-4 text-emerald-600" />
                <span>Compensación de Vacaciones</span>
              </div>
            )}

            {onCerrar && (
              <button
                type="button"
                onClick={onCerrar}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* BARRA DE PESTAÑAS IDÉNTICA AL DISEÑO DE GESTIÓN DE SOLICITUDES */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4 sm:gap-6 overflow-x-auto touch-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Pestaña 1: Liquidación Completa */}
          <button
            type="button"
            onClick={() => setModoCalculo('completa')}
            className={`pb-3.5 sm:pb-4 text-xs sm:text-sm font-extrabold flex items-center gap-2 sm:gap-2.5 border-b-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
              modoCalculo === 'completa'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Liquidación Completa de Finiquito</span>
            <span className="ml-1 text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
              4
            </span>
            <span className="ml-1 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500 text-white">
              Ley Nica
            </span>
          </button>

          {/* Pestaña 2: Pago de Vacaciones Únicamente */}
          <button
            type="button"
            onClick={() => setModoCalculo('vacaciones_solo')}
            className={`pb-3.5 sm:pb-4 text-xs sm:text-sm font-extrabold flex items-center gap-2 sm:gap-2.5 border-b-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
              modoCalculo === 'vacaciones_solo'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Palmtree className="w-4 h-4" />
            <span>Pago de Vacaciones Únicamente</span>
            <span className="ml-1 text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
              Art. 76
            </span>
          </button>
        </div>

        {/* CONTENEDOR PRINCIPAL BLANCO / DARK CON BORDES REDONDEADOS */}
        <div className="bg-white dark:bg-[#0f172a] p-5 sm:p-7 rounded-[28px] shadow-sm border border-slate-200/80 dark:border-slate-800 text-left space-y-5">
          {/* Selector de Colaborador */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Colaborador a Liquidar</span>
              </label>
              <span className="text-[11px] text-slate-400 font-semibold">
                {empleados.length} colaboradores en planilla
              </span>
            </div>
            <div className="relative">
              <select
                value={empleadoSeleccionadoId}
                onChange={(e) => handleCambiarColaborador(e.target.value)}
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition cursor-pointer appearance-none shadow-2xs"
              >
                {empleados.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nombre} — {emp.cargo} ({emp.saldoDisponible} días vac. disp.)
                  </option>
                ))}
                <option value="manual">✏️ Cálculo Libre / Colaborador Manual</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Ficha Resumen del Colaborador */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-black flex items-center justify-center text-sm shadow-2xs">
                {nombreEmpleado.charAt(0)}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Colaborador Seleccionado
                </p>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">{nombreEmpleado}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{cargoEmpleado}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Salario Diario (Base 30)
                </p>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {formatearCordobas(salarioMensual / 30)}
                </span>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Saldo Vacaciones
                </p>
                <span className="bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-black px-2.5 py-0.5 rounded-full inline-block">
                  {diasVacaciones} días
                </span>
              </div>
            </div>
          </div>

          {/* FORMULARIO DE PARÁMETROS */}
          <form onSubmit={ejecutarCalculo} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Salario Mensual */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Salario Mensual (C$)
                </label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                    C$
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={salarioMensual || ''}
                    onChange={(e) => setSalarioMensual(parseFloat(e.target.value) || 0)}
                    className="w-full pl-9 pr-3 py-2 bg-[#f8fafc] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Base mensual ordinaria</p>
              </div>

              {/* Fecha de Ingreso */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Fecha de Ingreso
                </label>
                <input
                  type="date"
                  required
                  value={fechaIngreso}
                  onChange={(e) => setFechaIngreso(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f8fafc] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
                <p className="text-[10px] text-slate-400 mt-1">Inicio de relación laboral</p>
              </div>

              {/* Fecha de Egreso / Corte */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Fecha de Egreso / Corte
                </label>
                <input
                  type="date"
                  required
                  value={fechaEgreso}
                  onChange={(e) => setFechaEgreso(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f8fafc] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
                <p className="text-[10px] text-slate-400 mt-1">Término de contrato</p>
              </div>

              {/* Días de Vacaciones Pendientes */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Días Vacaciones (Art. 76)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={diasVacaciones ?? ''}
                  onChange={(e) => setDiasVacaciones(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-[#f8fafc] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  placeholder="0.00"
                />
                <p className="text-[10px] text-slate-400 mt-1">Saldo acumulado a compensar</p>
              </div>
            </div>

            {/* Opciones Adicionales para Liquidación Completa */}
            {modoCalculo === 'completa' && (
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Motivo de Terminación */}
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      Causal de Terminación (Indemnización)
                    </label>
                    <select
                      value={motivoTerminacion}
                      onChange={(e) => setMotivoTerminacion(e.target.value as MotivoTerminacionLaboral)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                    >
                      <option value="despido_sin_causa">Despido sin causa (Art. 45) - 100% Indemnización</option>
                      <option value="renuncia_con_indemnizacion">Renuncia con indemnización pactada</option>
                      <option value="mutuo_acuerdo">Mutuo acuerdo de partes</option>
                      <option value="despido_con_causa">Despido con causa justa (Art. 48) - Sin indemnización</option>
                      <option value="renuncia_simple">Renuncia voluntaria simple - Sin indemnización</option>
                    </select>
                  </div>

                  {/* Días de Salario Pendiente en el período */}
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      Días Salario Pendientes
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="31"
                      step="0.5"
                      value={diasSalarioPendiente || ''}
                      onChange={(e) => setDiasSalarioPendiente(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                      placeholder="0"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Días trabajados del mes no pagados</p>
                  </div>

                  {/* Deducciones Extras (Préstamos/Anticipos) */}
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      Deducciones Extras (C$)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={deduccionesExtras || ''}
                      onChange={(e) => setDeduccionesExtras(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                      placeholder="0.00"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Anticipos de salario o préstamos</p>
                  </div>
                </div>

                {/* Checkbox de INSS sobre Salario */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="chk-inss-tabs"
                    checked={retenerInssSalario}
                    onChange={(e) => setRetenerInssSalario(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                  />
                  <label htmlFor="chk-inss-tabs" className="text-xs text-slate-600 dark:text-slate-300 font-semibold cursor-pointer">
                    Retener 7% de INSS Laboral únicamente sobre el Salario Ordinario devengado (Las prestaciones sociales están legalmente exentas).
                  </label>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                className={`flex-1 font-black py-2.5 px-4 rounded-xl transition duration-150 ease-in-out text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] text-white ${
                  modoCalculo === 'completa'
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                }`}
              >
                <Calculator className="w-4 h-4" />
                <span>
                  {modoCalculo === 'completa' ? 'Recalcular Liquidación Completa (C$)' : 'Calcular Pago de Vacaciones (C$)'}
                </span>
              </button>
            </div>
          </form>

          {/* RESULTADOS: MODO LIQUIDACIÓN COMPLETA */}
          {modoCalculo === 'completa' && resultadoCompleto && (
            <div className="space-y-4 pt-2 animate-fadeIn">
              {/* Tarjeta de Resumen General */}
              <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white p-5 sm:p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center md:text-left">
                  <div className="inline-flex items-center gap-1.5 bg-blue-800/80 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
                    <span>Antigüedad: {resultadoCompleto.antiguedad.texto}</span>
                  </div>
                  <h4 className="text-xs font-bold text-blue-200">TOTAL NETO DEFINITIVO A LIQUIDAR</h4>
                  <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    {formatearCordobas(resultadoCompleto.netoAPagar)}
                  </div>
                  <p className="text-[11px] text-blue-200/80">
                    Total Bruto: {formatearCordobas(resultadoCompleto.totalBruto)} • Deducciones: {formatearCordobas(resultadoCompleto.deducciones.totalDeducciones)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDescargarPDF}
                    disabled={generandoPdf}
                    className="bg-white hover:bg-slate-100 text-blue-900 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50"
                    title="Descargar Acta de Finiquito en PDF"
                  >
                    <FileDown className="w-4 h-4 text-blue-600" />
                    <span>{generandoPdf ? 'Generando...' : 'Descargar Finiquito (PDF)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="bg-blue-700 hover:bg-blue-600 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                    title="Imprimir ticket para impresora térmica POS"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Ticket POS-80C</span>
                  </button>
                </div>
              </div>

              {/* LAS 4 TARJETAS DE DESGLOSE DE REQUERIMIENTOS DE LEY */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. INDEMNIZACIÓN POR ANTIGÜEDAD (Art. 45) */}
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                      <Scale className="w-4 h-4" />
                      <span className="text-xs font-black uppercase tracking-wider">1. Indemnización por Años</span>
                    </div>
                    <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                      Art. 45 C.T.
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {resultadoCompleto.indemnizacion.aplica 
                        ? `${resultadoCompleto.indemnizacion.diasCalculados} días (${resultadoCompleto.indemnizacion.mesesEquivalentes} meses)`
                        : 'No aplica por causal'}
                    </span>
                    <span className="text-lg font-black text-slate-900 dark:text-white">
                      {formatearCordobas(resultadoCompleto.indemnizacion.monto)}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
                    {resultadoCompleto.indemnizacion.explicacion}
                  </p>
                  {resultadoCompleto.indemnizacion.topeAplicado && (
                    <span className="inline-block text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded-md font-bold">
                      Tope Legal de 5 Meses Alcanzado
                    </span>
                  )}
                </div>

                {/* 2. VACACIONES ACUMULADAS (Art. 76) */}
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                      <Palmtree className="w-4 h-4" />
                      <span className="text-xs font-black uppercase tracking-wider">2. Vacaciones Acumuladas</span>
                    </div>
                    <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      Art. 76 C.T.
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {resultadoCompleto.vacaciones.diasPendientes} días pendientes
                    </span>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {formatearCordobas(resultadoCompleto.vacaciones.monto)}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
                    {resultadoCompleto.vacaciones.explicacion}
                  </p>
                </div>

                {/* 3. AGUINALDO PROPORCIONAL (Art. 93-99) */}
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                      <Gift className="w-4 h-4" />
                      <span className="text-xs font-black uppercase tracking-wider">3. Aguinaldo Proporcional</span>
                    </div>
                    <span className="text-[10px] bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-extrabold px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                      Art. 93 C.T.
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {resultadoCompleto.aguinaldo.diasAguinaldoAcumulados} días acumulados
                    </span>
                    <span className="text-lg font-black text-rose-600 dark:text-rose-400">
                      {formatearCordobas(resultadoCompleto.aguinaldo.monto)}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
                    {resultadoCompleto.aguinaldo.explicacion}
                  </p>
                </div>

                {/* 4. SALARIO PENDIENTE DEVENGADO */}
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <Briefcase className="w-4 h-4" />
                      <span className="text-xs font-black uppercase tracking-wider">4. Salario Pendiente</span>
                    </div>
                    <span className="text-[10px] bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-extrabold px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                      Días laborados
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {resultadoCompleto.salario.diasLaborados} días ({formatearCordobas(resultadoCompleto.salario.montoBruto)} bruto)
                    </span>
                    <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                      {formatearCordobas(resultadoCompleto.salario.montoNeto)}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
                    {resultadoCompleto.salario.inssLaboral > 0 ? `Deducción 7% INSS: ${formatearCordobas(resultadoCompleto.salario.inssLaboral)}.` : 'Sin deducción de INSS.'}
                  </p>
                </div>
              </div>

              {/* Desglose de Deducciones */}
              {resultadoCompleto.deducciones.totalDeducciones > 0 && (
                <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/50 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Deducciones Aplicadas:</span>
                  </div>
                  <div className="flex items-center gap-4 text-rose-900 dark:text-rose-200 font-mono text-[11px]">
                    {resultadoCompleto.deducciones.inssSalario > 0 && (
                      <span>INSS Laboral 7%: {formatearCordobas(resultadoCompleto.deducciones.inssSalario)}</span>
                    )}
                    {resultadoCompleto.deducciones.otrasDeducciones > 0 && (
                      <span>Otras Deducciones: {formatearCordobas(resultadoCompleto.deducciones.otrasDeducciones)}</span>
                    )}
                    <strong className="font-black text-rose-700 dark:text-rose-400">
                      Total Retenido: {formatearCordobas(resultadoCompleto.deducciones.totalDeducciones)}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* RESULTADOS: MODO VACACIONES SOLAMENTE */}
          {modoCalculo === 'vacaciones_solo' && montoVacacionesSolo !== null && (
            <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 space-y-3 animate-fadeIn">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-emerald-800 dark:text-emerald-300 uppercase font-black tracking-wider">
                    Monto Total a Pagar en Dinero (Vacaciones):
                  </p>
                  <p className="text-2xl font-black text-emerald-950 dark:text-emerald-200 mt-0.5">
                    {formatearCordobas(montoVacacionesSolo)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-2xs hover:bg-emerald-700 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir Recibo</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40 text-xs text-emerald-900 dark:text-emerald-300">
                <div>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold block">
                    Salario Diario (Base 30):
                  </span>
                  <strong className="text-xs font-black">{formatearCordobas(salarioDiarioVacacionesSolo || 0)}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold block">
                    Días Computados:
                  </span>
                  <strong className="text-xs font-black">{diasVacaciones} días</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TICKET TÉRMICO EXCLUSIVO PARA IMPRESORA POS-80C */}
      {typeof document !== 'undefined' && createPortal(
        <div id="ticket-recibo-print" className="hidden print:block text-black bg-white">
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <div style={{ fontWeight: '900', fontSize: '15px', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              SENDA SISTEMAS
            </div>
            <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '2px' }}>
              CONTROL DE PERSONAL Y LIQUIDACIONES
            </div>
            <div style={{ fontSize: '10px', color: '#222', marginTop: '1px' }}>
              Código del Trabajo de Nicaragua • Ley N° 185
            </div>
            <div style={{ width: '100%', borderBottom: '1.5px dashed #000', margin: '6px 0' }} />
            <div style={{ fontWeight: '900', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              {modoCalculo === 'completa' ? 'RECIBO DE FINIQUITO LABORAL' : 'RECIBO DE PAGO DE VACACIONES'}
            </div>
            <div style={{ width: '100%', borderBottom: '1.5px dashed #000', margin: '6px 0' }} />
          </div>

          <div style={{ fontSize: '11px', marginBottom: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '2px' }}>
              <span>Fecha / Hora:</span>
              <span>{new Date().toLocaleDateString('es-NI')} {new Date().toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <span>No. Liquidación:</span>
              <span style={{ fontWeight: 'bold' }}>LIQ-{Date.now().toString().slice(-6)}</span>
            </div>
          </div>

          <div style={{ width: '100%', borderBottom: '1px dashed #000', margin: '6px 0' }} />

          <div style={{ fontSize: '11px', marginBottom: '6px' }}>
            <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '4px' }}>
              DATOS DEL COLABORADOR:
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '2px' }}>
              <span>Nombre:</span>
              <span style={{ fontWeight: 'bold' }}>{nombreEmpleado}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <span>Puesto / Cargo:</span>
              <span>{cargoEmpleado}</span>
            </div>
            {modoCalculo === 'completa' && resultadoCompleto && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '2px' }}>
                  <span>Ingreso / Egreso:</span>
                  <span>{resultadoCompleto.fechaIngreso} al {resultadoCompleto.fechaEgreso}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span>Antigüedad:</span>
                  <span style={{ fontWeight: 'bold' }}>{resultadoCompleto.antiguedad.texto}</span>
                </div>
              </>
            )}
          </div>

          <div style={{ width: '100%', borderBottom: '1px dashed #000', margin: '6px 0' }} />

          {/* Desglose de Liquidación */}
          <div style={{ fontSize: '11px', marginBottom: '6px' }}>
            <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '4px' }}>
              DETALLE DE PRESTACIONES (C$):
            </div>
            {modoCalculo === 'completa' && resultadoCompleto ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '3px' }}>
                  <span>1. Indemnización (Art. 45):</span>
                  <span style={{ fontWeight: 'bold' }}>{formatearCordobas(resultadoCompleto.indemnizacion.monto)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '3px' }}>
                  <span>2. Vacaciones ({resultadoCompleto.vacaciones.diasPendientes}d - Art. 76):</span>
                  <span style={{ fontWeight: 'bold' }}>{formatearCordobas(resultadoCompleto.vacaciones.monto)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '3px' }}>
                  <span>3. Aguinaldo ({resultadoCompleto.aguinaldo.diasAguinaldoAcumulados}d - Art. 93):</span>
                  <span style={{ fontWeight: 'bold' }}>{formatearCordobas(resultadoCompleto.aguinaldo.monto)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '3px' }}>
                  <span>4. Salario ({resultadoCompleto.salario.diasLaborados}d laborados):</span>
                  <span style={{ fontWeight: 'bold' }}>{formatearCordobas(resultadoCompleto.salario.montoBruto)}</span>
                </div>
                {resultadoCompleto.deducciones.totalDeducciones > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '3px', color: '#666' }}>
                    <span>Deducciones (INSS / Otras):</span>
                    <span>-{formatearCordobas(resultadoCompleto.deducciones.totalDeducciones)}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '3px' }}>
                  <span>Salario Mensual:</span>
                  <span>{formatearCordobas(salarioMensual)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '3px' }}>
                  <span>Días a Compensar:</span>
                  <span style={{ fontWeight: 'bold' }}>{diasVacaciones} días</span>
                </div>
              </>
            )}
          </div>

          <div style={{ width: '100%', borderTop: '2px dashed #000', borderBottom: '2px dashed #000', padding: '8px 0', margin: '8px 0', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold' }}>TOTAL NETO A PAGAR:</div>
            <div style={{ fontSize: '18px', fontWeight: '900', marginTop: '3px' }}>
              {modoCalculo === 'completa' && resultadoCompleto 
                ? formatearCordobas(resultadoCompleto.netoAPagar) 
                : formatearCordobas(montoVacacionesSolo || ((salarioMensual / 30) * diasVacaciones))}
            </div>
          </div>

          <div style={{ fontSize: '9px', textAlign: 'justify', margin: '8px 0', lineHeight: '1.3' }}>
            Recibí a mi entera satisfacción el valor liquidado correspondiente a mis prestaciones laborales de conformidad con la Ley N° 185 (Código del Trabajo de la República de Nicaragua).
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', width: '100%', textAlign: 'center', fontSize: '10px' }}>
            <div style={{ width: '45%', borderTop: '1px solid #000', paddingTop: '4px' }}>
              Firma Colaborador
            </div>
            <div style={{ width: '45%', borderTop: '1px solid #000', paddingTop: '4px' }}>
              Firma y Sello Tienda
            </div>
          </div>

          <div style={{ textAlign: 'center', fontSize: '9px', marginTop: '14px', borderTop: '1px dashed #888', paddingTop: '6px' }}>
            *** Comprobante Oficial POS-80C • SENDA SISTEMAS ***
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
