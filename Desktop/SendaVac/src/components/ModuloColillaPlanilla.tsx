import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Receipt,
  DollarSign,
  Calendar,
  Printer,
  FileDown,
  ShieldCheck,
  Scale,
  Palmtree,
  Users,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Clock,
  ChevronDown,
  Info,
  CalendarDays,
  FileSpreadsheet,
  Send,
  Building,
  Sparkles
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Empleado, TipoPeriodoPlanilla } from '../types';
import {
  formatearCordobas,
  calcularColillaPagoQuincenal,
  FERIADOS_NACIONALES_NICARAGUA
} from '../utils/calculosNica';

export const ModuloColillaPlanilla: React.FC = () => {
  const { empleados } = useData();
  const { usuarioActual } = useAuth();
  const esAdmin = usuarioActual?.rol === 'administrador';

  // Pestañas principales
  const [tabActual, setTabActual] = useState<'colilla' | 'resumen_tienda' | 'politica_descansos'>('colilla');

  // Selección de Empleado
  const [empleadoSeleccionadoId, setEmpleadoSeleccionadoId] = useState<string>(() => {
    if (usuarioActual && !esAdmin) return usuarioActual.id;
    return empleados[0]?.id || '';
  });

  const empleadoActual = empleados.find(e => e.id === empleadoSeleccionadoId) || empleados[0];

  // Fecha y Período
  const fechaHoy = new Date();
  const anioActual = fechaHoy.getFullYear();
  const mesActual = fechaHoy.getMonth() + 1; // 1-12
  const diaHoy = fechaHoy.getDate();
  const quincenaPorDefecto: TipoPeriodoPlanilla = diaHoy <= 15 ? 'quincena_1' : 'quincena_2';

  const [anio, setAnio] = useState<number>(anioActual);
  const [mes, setMes] = useState<number>(mesActual);
  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodoPlanilla>(quincenaPorDefecto);

  // Parámetros específicos del colaborador en la quincena
  const [salarioMensual, setSalarioMensual] = useState<number>(() => empleadoActual?.salarioMensual || 12000);
  const [saldoVacacionesPrevio, setSaldoVacacionesPrevio] = useState<number>(() => empleadoActual?.saldoDisponible || 15);
  const [diasVacacionesGozadas, setDiasVacacionesGozadas] = useState<number>(0);
  const [diasLibresSolicitados, setDiasLibresSolicitados] = useState<number>(0);
  const [diasCuentaVacaciones, setDiasCuentaVacaciones] = useState<number>(0);
  const [diasFeriados, setDiasFeriados] = useState<number>(0);
  const [vacacionesPagadasDinero, setVacacionesPagadasDinero] = useState<number>(0);
  const [feriadosTrabajadosPagados, setFeriadosTrabajadosPagados] = useState<number>(0);
  const [horasExtrasCantidad, setHorasExtrasCantidad] = useState<number>(0);
  const [otrosIngresos, setOtrosIngresos] = useState<number>(0);
  const [otrasDeducciones, setOtrasDeducciones] = useState<number>(0);
  const [observaciones, setObservaciones] = useState<string>('');

  const [generandoPdf, setGenerandoPdf] = useState<boolean>(false);

  // Sincronizar datos al cambiar de colaborador
  useEffect(() => {
    if (empleadoActual) {
      setSalarioMensual(empleadoActual.salarioMensual || 12000);
      setSaldoVacacionesPrevio(empleadoActual.saldoDisponible || 0);
      setDiasVacacionesGozadas(0);
      setDiasLibresSolicitados(0);
      setDiasCuentaVacaciones(0);
      setVacacionesPagadasDinero(0);
      setHorasExtrasCantidad(0);
      setOtrosIngresos(0);
      setOtrasDeducciones(0);
    }
  }, [empleadoSeleccionadoId, empleadoActual]);

  // Sincronizar automáticamente feriados trabajados y pagados con recargo (Art. 67 C.T.)
  useEffect(() => {
    if (!empleadoActual) return;
    try {
      const guardados = localStorage.getItem('sendavac_feriados_trabajados');
      if (guardados) {
        const lista: any[] = JSON.parse(guardados);
        const feriadosPeriodo = lista.filter(f => {
          if (f.empleadoId !== empleadoActual.id) return false;
          if (f.modalidad !== 'PAGAR_MONETARIO') return false;
          if (!f.fechaFeriado) return false;
          const partes = f.fechaFeriado.split('-');
          const fAnio = parseInt(partes[0], 10);
          const fMes = parseInt(partes[1], 10);
          const fDia = parseInt(partes[2], 10);

          if (fAnio !== anio || fMes !== mes) return false;
          if (tipoPeriodo === 'quincena_1') return fDia <= 15;
          if (tipoPeriodo === 'quincena_2') return fDia > 15;
          return true;
        });

        const sumaFeriados = feriadosPeriodo.reduce((acc, curr) => acc + (curr.montoAPagar || 0), 0);
        setFeriadosTrabajadosPagados(sumaFeriados);
      }
    } catch (e) {
      console.error('Error al sincronizar feriados en planilla', e);
    }
  }, [empleadoActual, anio, mes, tipoPeriodo]);

  // Detección automática de feriados de Nicaragua para el mes y quincena seleccionada
  useEffect(() => {
    const feriadosDelMes = FERIADOS_NACIONALES_NICARAGUA.filter(f => f.mes === mes);
    let conteoFeriadosPeriodo = 0;

    feriadosDelMes.forEach(f => {
      if (tipoPeriodo === 'quincena_1' && f.dia <= 15) {
        conteoFeriadosPeriodo += 1;
      } else if (tipoPeriodo === 'quincena_2' && f.dia > 15) {
        conteoFeriadosPeriodo += 1;
      } else if (tipoPeriodo === 'mes_completo') {
        conteoFeriadosPeriodo += 1;
      }
    });

    setDiasFeriados(conteoFeriadosPeriodo);
  }, [mes, tipoPeriodo]);

  // Cálculo en tiempo real de la Colilla de Pago
  const colillaCalculada = useMemo(() => {
    if (!empleadoActual) return null;

    return calcularColillaPagoQuincenal({
      empleadoId: empleadoActual.id,
      nombreEmpleado: empleadoActual.nombre,
      cargo: empleadoActual.cargo,
      departamento: empleadoActual.departamento,
      fechaIngreso: empleadoActual.fechaIngreso,
      salarioMensual,
      anio,
      mes,
      tipoPeriodo,
      saldoVacacionesPrevio,
      diasVacacionesGozadas,
      diasLibresSolicitados,
      diasCuentaVacaciones,
      diasFeriados,
      vacacionesPagadasDinero,
      feriadosTrabajadosPagados,
      horasExtrasCantidad,
      otrosIngresos,
      otrasDeducciones,
      observaciones
    });
  }, [
    empleadoActual,
    salarioMensual,
    anio,
    mes,
    tipoPeriodo,
    saldoVacacionesPrevio,
    diasVacacionesGozadas,
    diasLibresSolicitados,
    diasCuentaVacaciones,
    diasFeriados,
    vacacionesPagadasDinero,
    feriadosTrabajadosPagados,
    horasExtrasCantidad,
    otrosIngresos,
    otrasDeducciones,
    observaciones
  ]);

  // Generación de Planilla Consolidada de la Tienda para la quincena
  const planillaConsolidadaTienda = useMemo(() => {
    return empleados.map(emp => {
      const calc = calcularColillaPagoQuincenal({
        empleadoId: emp.id,
        nombreEmpleado: emp.nombre,
        cargo: emp.cargo,
        departamento: emp.departamento,
        fechaIngreso: emp.fechaIngreso,
        salarioMensual: emp.salarioMensual || 12000,
        anio,
        mes,
        tipoPeriodo,
        saldoVacacionesPrevio: emp.saldoDisponible || 0
      });
      return {
        empleado: emp,
        calculo: calc
      };
    });
  }, [empleados, anio, mes, tipoPeriodo]);

  // Totales de la Planilla Consolidada
  const totalesPlanilla = useMemo(() => {
    return planillaConsolidadaTienda.reduce(
      (acc, curr) => {
        acc.totalBruto += curr.calculo.ingresos.totalIngresosBrutos;
        acc.totalInss += curr.calculo.deducciones.inssLaboral;
        acc.totalIr += curr.calculo.deducciones.irRetencion;
        acc.totalNeto += curr.calculo.netoAPagar;
        acc.totalDiasVacaciones += curr.calculo.vacaciones.saldoActualDisponible;
        return acc;
      },
      { totalBruto: 0, totalInss: 0, totalIr: 0, totalNeto: 0, totalDiasVacaciones: 0 }
    );
  }, [planillaConsolidadaTienda]);

  // Imprimir Ticket Térmico POS
  const handlePrint = () => {
    window.print();
  };

  // Descargar Colilla Formal en PDF con membrete SENDA
  const handleDescargarPDF = () => {
    if (!colillaCalculada || !empleadoActual) return;
    try {
      setGenerandoPdf(true);
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const primaryColor = [29, 99, 255]; // Azul Senda
      const darkColor = [15, 23, 42]; // Slate 900
      const fechaEmision = new Date().toLocaleDateString('es-NI');

      // 1. Franja Superior Azul
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 16, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text('SENDA SISTEMAS • COMPROBANTE OFICIAL DE PAGO', 14, 11);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Emisión: ${fechaEmision}`, 196, 11, { align: 'right' });

      // 2. Título de Colilla
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('COLILLA OFICIAL DE PAGO DE PLANILLA', 105, 25, { align: 'center' });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Corte Fijo Comercial • ${colillaCalculada.periodo.periodoTexto}`,
        105,
        30,
        { align: 'center' }
      );

      // 3. Ficha de Datos del Trabajador
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 35, 182, 34, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text('DATOS DEL COLABORADOR Y CONDICIÓN SALARIAL', 18, 41);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);

      // Fila 1
      doc.text('Nombre:', 18, 47);
      doc.setFont('helvetica', 'bold');
      doc.text(empleadoActual.nombre, 38, 47);

      doc.setFont('helvetica', 'normal');
      doc.text('Cargo / Puesto:', 115, 47);
      doc.setFont('helvetica', 'bold');
      doc.text(empleadoActual.cargo, 142, 47);

      // Fila 2
      doc.setFont('helvetica', 'normal');
      doc.text('Fecha Ingreso:', 18, 53);
      doc.setFont('helvetica', 'bold');
      doc.text(empleadoActual.fechaIngreso || 'N/A', 42, 53);

      doc.setFont('helvetica', 'normal');
      doc.text('Días Computados:', 115, 53);
      doc.setFont('helvetica', 'bold');
      doc.text(`${colillaCalculada.periodo.diasLaboralesFijos} días (Pago fijo comercial)`, 145, 53);

      // Fila 3
      doc.setFont('helvetica', 'normal');
      doc.text('Salario Mensual:', 18, 59);
      doc.setFont('helvetica', 'bold');
      doc.text(formatearCordobas(salarioMensual), 44, 59);

      doc.setFont('helvetica', 'normal');
      doc.text('Salario Diario:', 115, 59);
      doc.setFont('helvetica', 'bold');
      doc.text(formatearCordobas(colillaCalculada.salario.salarioDiario), 140, 59);

      // Fila 4
      doc.setFont('helvetica', 'normal');
      doc.text('No. Comprobante:', 18, 65);
      doc.setFont('helvetica', 'bold');
      doc.text(`COL-${anio}-${String(mes).padStart(2, '0')}-${tipoPeriodo === 'quincena_1' ? 'Q1' : tipoPeriodo === 'quincena_2' ? 'Q2' : 'MES'}-${empleadoActual.id.slice(-4)}`, 48, 65);

      doc.setFont('helvetica', 'normal');
      doc.text('Departamento:', 115, 65);
      doc.setFont('helvetica', 'bold');
      doc.text(empleadoActual.departamento || 'Operaciones', 140, 65);

      // 4. Tabla de Percepciones y Deducciones
      autoTable(doc, {
        startY: 73,
        theme: 'grid',
        head: [['INGRESOS / PERCEPCIONES', 'MONTO (C$)', 'DEDUCCIONES DE LEY', 'MONTO (C$)']],
        body: [
          [
            `Salario Ordinario Fijo (${colillaCalculada.periodo.diasLaboralesFijos} días)`,
            formatearCordobas(colillaCalculada.ingresos.salarioOrdinarioDevengado),
            'INSS Laboral (7%)',
            formatearCordobas(colillaCalculada.deducciones.inssLaboral)
          ],
          [
            'Vacaciones Pagadas en Dinero',
            formatearCordobas(colillaCalculada.ingresos.vacacionesPagadasDinero),
            'IR Laboral Retenido (Ley DGI)',
            formatearCordobas(colillaCalculada.deducciones.irRetencion)
          ],
          [
            'Feriados Laborados Pagados (Art. 67 C.T.)',
            formatearCordobas(colillaCalculada.ingresos.feriadosTrabajadosPagados || 0),
            'Otras Deducciones (Adelantos / Préstamos)',
            formatearCordobas(colillaCalculada.deducciones.otrasDeducciones)
          ],
          [
            `Horas Extras (${colillaCalculada.ingresos.horasExtrasCantidad} hrs con 100% recargo)`,
            formatearCordobas(colillaCalculada.ingresos.montoHorasExtras),
            '-',
            '-'
          ],
          [
            'Otros Ingresos / Bonificaciones',
            formatearCordobas(colillaCalculada.ingresos.otrosIngresos),
            '-',
            '-'
          ]
        ],
        foot: [
          [
            'TOTAL INGRESOS BRUTOS:',
            formatearCordobas(colillaCalculada.ingresos.totalIngresosBrutos),
            'TOTAL DEDUCCIONES:',
            formatearCordobas(colillaCalculada.deducciones.totalDeducciones)
          ],
          [
            { content: 'TOTAL NETO A RECIBIR:', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', fontSize: 10 } },
            { content: formatearCordobas(colillaCalculada.netoAPagar), colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fontSize: 11, textColor: [16, 185, 129] } }
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
          fontSize: 8.5,
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 58 },
          1: { cellWidth: 33, halign: 'right' },
          2: { cellWidth: 58 },
          3: { cellWidth: 33, halign: 'right' }
        },
        margin: { left: 14, right: 14 }
      });

      // 5. Recuadro de Control de Vacaciones y Descansos (Requerimiento Clave)
      const tablaY = (doc as any).lastAutoTable?.finalY || 135;

      doc.setDrawColor(16, 185, 129);
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(14, tablaY + 6, 182, 38, 2.5, 2.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(6, 95, 70);
      doc.text('CONTROL OFICIAL DE VACACIONES, DÍAS LIBRES Y FERIADOS DEL PERÍODO', 18, tablaY + 12);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);

      // Fila 1 Vacaciones
      doc.text(`• Saldo de Vacaciones Anterior: `, 18, tablaY + 18);
      doc.setFont('helvetica', 'bold');
      doc.text(`${colillaCalculada.vacaciones.saldoAnterior} días`, 64, tablaY + 18);

      doc.setFont('helvetica', 'normal');
      doc.text(`• Días Ganados en el Período: `, 105, tablaY + 18);
      doc.setFont('helvetica', 'bold');
      doc.text(`+${colillaCalculada.vacaciones.diasGanadosPeriodo} días`, 150, tablaY + 18);

      // Fila 2 Vacaciones
      doc.setFont('helvetica', 'normal');
      doc.text(`• Vacaciones Gozadas en Período: `, 18, tablaY + 24);
      doc.setFont('helvetica', 'bold');
      doc.text(`${colillaCalculada.vacaciones.diasVacacionesGozadas} días (Con goce de sueldo)`, 68, tablaY + 24);

      doc.setFont('helvetica', 'normal');
      doc.text(`• Días a Cuenta de Vacaciones: `, 105, tablaY + 24);
      doc.setFont('helvetica', 'bold');
      doc.text(`${colillaCalculada.vacaciones.diasCuentaVacaciones} días (Sin rebajo salarial)`, 154, tablaY + 24);

      // Fila 3 Feriados y Saldo Final
      doc.setFont('helvetica', 'normal');
      doc.text(`• Feriados Nacionales Gozados: `, 18, tablaY + 30);
      doc.setFont('helvetica', 'bold');
      doc.text(`${colillaCalculada.vacaciones.diasFeriadosPeriodo} días (Art. 66 C.T.)`, 66, tablaY + 30);

      doc.setFont('helvetica', 'normal');
      doc.text(`• Saldo Final Disponible: `, 105, tablaY + 30);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text(`${colillaCalculada.vacaciones.saldoActualDisponible} días acumulados`, 142, tablaY + 30);

      // Nota explicativa legal
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        'Garantía Laboral: Los días libres concedidos a cuenta de vacaciones se descuentan únicamente del saldo de días acumulados del colaborador, garantizando el salario fijo quincenal íntegro.',
        18,
        tablaY + 39
      );

      // 6. Firmas de Conformidad
      const firmasY = tablaY + 68;

      doc.setDrawColor(148, 163, 184);
      doc.line(20, firmasY, 85, firmasY);
      doc.line(125, firmasY, 190, firmasY);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      doc.text('FIRMA DEL COLABORADOR', 52.5, firmasY + 4, { align: 'center' });
      doc.text('EMPLEADOR / GERENCIA GENERAL', 157.5, firmasY + 4, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('Recibí Conforme mi Salario de Quincena', 52.5, firmasY + 8, { align: 'center' });
      doc.text('SENDA SISTEMAS • Sello y Firma', 157.5, firmasY + 8, { align: 'center' });

      // Guardar PDF
      const nombreLimpio = empleadoActual.nombre.replace(/\s+/g, '_');
      doc.save(`Colilla_Pago_${nombreLimpio}_${anio}_M${mes}_${tipoPeriodo}.pdf`);
    } catch (err) {
      console.error('Error generando PDF de colilla:', err);
    } finally {
      setGenerandoPdf(false);
    }
  };

  // Enviar Colilla por WhatsApp
  const handleCompartirWhatsApp = () => {
    if (!colillaCalculada || !empleadoActual) return;
    const tel = (empleadoActual.telefono || '').replace(/[^\d]/g, '');
    const telefonoFinal = tel.startsWith('505') ? tel : `505${tel}`;

    const mensaje = 
      `*SENDA SISTEMAS • COLILLA DE PAGO*\n` +
      `👤 *Colaborador:* ${empleadoActual.nombre}\n` +
      `📅 *Período:* ${colillaCalculada.periodo.periodoTexto}\n` +
      `💼 *Cargo:* ${empleadoActual.cargo}\n\n` +
      `💵 *Salario Fijo Quincenal:* ${formatearCordobas(colillaCalculada.salario.salarioBasePeriodo)}\n` +
      `➕ *Total Ingresos Brutos:* ${formatearCordobas(colillaCalculada.ingresos.totalIngresosBrutos)}\n` +
      `➖ *Deducción INSS (7%):* ${formatearCordobas(colillaCalculada.deducciones.inssLaboral)}\n` +
      `💰 *TOTAL NETO A RECIBIR:* ${formatearCordobas(colillaCalculada.netoAPagar)}\n\n` +
      `🌴 *CONTROL DE VACACIONES Y DESCANSOS:*\n` +
      `• Saldo Anterior: ${colillaCalculada.vacaciones.saldoAnterior} días\n` +
      `• Ganados en Período: +${colillaCalculada.vacaciones.diasGanadosPeriodo} días\n` +
      (colillaCalculada.vacaciones.diasCuentaVacaciones > 0 ? `• Días a Cta. Vacaciones: ${colillaCalculada.vacaciones.diasCuentaVacaciones}d (Sin afectar su salario fijo)\n` : '') +
      (colillaCalculada.vacaciones.diasFeriadosPeriodo > 0 ? `• Feriados Reconocidos: ${colillaCalculada.vacaciones.diasFeriadosPeriodo}d\n` : '') +
      `• *Saldo Final Disponible:* ${colillaCalculada.vacaciones.saldoActualDisponible} días acumulados\n\n` +
      `_Comprobante emitido con base fija de 15 días comerciales conforme al Código del Trabajo de Nicaragua._`;

    const url = `https://api.whatsapp.com/send?phone=${telefonoFinal}&text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 animate-fadeIn w-full">
      {/* 1. HEADER BANNER IDÉNTICO AL DISEÑO DE GESTIÓN DE SOLICITUDES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/60 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs backdrop-blur-md">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-blue-500/25 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Receipt className="w-6 h-6 sm:w-7 sm:h-7 text-[#1d63ff] dark:text-blue-400" />
            </div>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Planilla y Colillas de Pago (Cortes 15 y 30)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Pago fijo independiente de 28 o 31 días • Control de descansos, feriados y vacaciones sin afectación de salario
            </p>
          </div>
        </div>

        {/* Indicador de Estado o Acción Rápida */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 font-bold text-xs">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Base Fija: 15 Días Quincenales</span>
          </div>
        </div>
      </div>

      {/* 2. BARRA DE PESTAÑAS IDÉNTICA AL DISEÑO DE GESTIÓN DE SOLICITUDES */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4 sm:gap-6 overflow-x-auto touch-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Pestaña 1: Colilla Individual */}
        <button
          type="button"
          onClick={() => setTabActual('colilla')}
          className={`pb-3.5 sm:pb-4 text-xs sm:text-sm font-extrabold flex items-center gap-2 sm:gap-2.5 border-b-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
            tabActual === 'colilla'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Colilla Individual de Pago</span>
          <span className="ml-1 text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
            {empleados.length}
          </span>
        </button>

        {/* Pestaña 2: Planilla General Tienda (Solo Admin) */}
        {esAdmin && (
          <button
            type="button"
            onClick={() => setTabActual('resumen_tienda')}
            className={`pb-3.5 sm:pb-4 text-xs sm:text-sm font-extrabold flex items-center gap-2 sm:gap-2.5 border-b-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
              tabActual === 'resumen_tienda'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Planilla Consolidada de Tienda</span>
            <span className="ml-1 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-indigo-500 text-white">
              Cortes 15 y 30
            </span>
          </button>
        )}

        {/* Pestaña 3: Política de Descansos y Salario Fijo */}
        <button
          type="button"
          onClick={() => setTabActual('politica_descansos')}
          className={`pb-3.5 sm:pb-4 text-xs sm:text-sm font-extrabold flex items-center gap-2 sm:gap-2.5 border-b-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
            tabActual === 'politica_descansos'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Palmtree className="w-4 h-4" />
          <span>Reglas de Feriados y Vacaciones a Cuenta</span>
          <span className="ml-1 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500 text-white">
            Sin Descuento Salarial
          </span>
        </button>
      </div>

      {/* 3. VISTA 1: COLILLA INDIVIDUAL DE PAGO */}
      {tabActual === 'colilla' && colillaCalculada && empleadoActual && (
        <div className="space-y-6">
          {/* BARRA DE FILTROS Y SELECTORES DE PERÍODO */}
          <div className="bg-white dark:bg-[#0f172a] p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {/* Selector de Colaborador */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Colaborador
                </label>
                {esAdmin ? (
                  <div className="relative">
                    <select
                      value={empleadoSeleccionadoId}
                      onChange={(e) => setEmpleadoSeleccionadoId(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer appearance-none"
                    >
                      {empleados.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.nombre} — {emp.cargo} ({formatearCordobas(emp.salarioMensual || 12000)})
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white">
                    {empleadoActual.nombre} ({empleadoActual.cargo})
                  </div>
                )}
              </div>

              {/* Selector de Mes y Año */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Mes / Año
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={mes}
                    onChange={(e) => setMes(parseInt(e.target.value, 10))}
                    className="w-full px-2.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                  >
                    {[
                      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                    ].map((nombre, idx) => (
                      <option key={idx + 1} value={idx + 1}>{nombre}</option>
                    ))}
                  </select>
                  <select
                    value={anio}
                    onChange={(e) => setAnio(parseInt(e.target.value, 10))}
                    className="w-full px-2.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                  >
                    {[2024, 2025, 2026, 2027].map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selector de Quincena (Cortes 15 y 30) */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Corte de Pago Fijo
                </label>
                <select
                  value={tipoPeriodo}
                  onChange={(e) => setTipoPeriodo(e.target.value as TipoPeriodoPlanilla)}
                  className="w-full px-3 py-2.5 bg-blue-50/80 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl font-bold text-blue-900 dark:text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition cursor-pointer"
                >
                  <option value="quincena_1">1ra Quincena (Corte 15) - 15 días</option>
                  <option value="quincena_2">2da Quincena (Corte 30) - 15 días</option>
                  <option value="mes_completo">Mes Completo (1 al 30) - 30 días</option>
                </select>
              </div>
            </div>

            {/* Fila de Parámetros Editables de Nómina e Incidencias (Solo Admin puede ajustar) */}
            {esAdmin && (
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Ajustes de Incidencias del Período ({colillaCalculada.periodo.periodoTexto})</span>
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Garantía: Salario Base Fijo de {formatearCordobas(colillaCalculada.salario.salarioBasePeriodo)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Vac. Gozadas (días)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={diasVacacionesGozadas || ''}
                      onChange={(e) => setDiasVacacionesGozadas(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 text-emerald-600 dark:text-emerald-400">
                      Días a Cta. Vacaciones
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={diasCuentaVacaciones || ''}
                      onChange={(e) => setDiasCuentaVacaciones(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-lg font-bold"
                      placeholder="0"
                      title="Días libres otorgados a cuenta de vacaciones (NO descuentan salario)"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Feriados Gozados
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={diasFeriados || ''}
                      onChange={(e) => setDiasFeriados(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Vac. Pagadas (C$)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={vacacionesPagadasDinero || ''}
                      onChange={(e) => setVacacionesPagadasDinero(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Feriados Pagados (C$)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={feriadosTrabajadosPagados || ''}
                      onChange={(e) => setFeriadosTrabajadosPagados(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                      placeholder="0.00"
                      title="Remuneración al 100% de recargo por feriados nacionales laborados (Art. 67 C.T.)"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Horas Extras (cant.)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={horasExtrasCantidad || ''}
                      onChange={(e) => setHorasExtrasCantidad(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Otras Deduc. (C$)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={otrasDeducciones || ''}
                      onChange={(e) => setOtrasDeducciones(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* VISTA OFICIAL DE LA COLILLA DE PAGO */}
          <div className="bg-white dark:bg-[#0f172a] p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl max-w-4xl mx-auto space-y-6">
            {/* Encabezado de la Colilla */}
            <div className="flex flex-col sm:flex-row items-center justify-between pb-5 border-b border-dashed border-slate-300 dark:border-slate-700 gap-4 text-center sm:text-left">
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="font-black text-lg sm:text-xl text-slate-900 dark:text-white tracking-wide">
                    SENDA SISTEMAS
                  </span>
                  <span className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">
                    Tienda & Comercio
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  RUC: J0310000000000 • Nicaragua • Código del Trabajo (Ley N° 185)
                </p>
                <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                  COLILLA DE PAGO DE SALARIO Y CONTROL DE VACACIONES
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDescargarPDF}
                  disabled={generandoPdf}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50"
                  title="Descargar Colilla en PDF"
                >
                  <FileDown className="w-4 h-4" />
                  <span>{generandoPdf ? 'Generando...' : 'Descargar PDF'}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="bg-slate-900 hover:bg-black text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                  title="Imprimir ticket térmico POS-80C"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span>Ticket POS-80C</span>
                </button>
                {empleadoActual.telefono && (
                  <button
                    type="button"
                    onClick={handleCompartirWhatsApp}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                    title="Enviar detalle por WhatsApp"
                  >
                    <Send className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </button>
                )}
              </div>
            </div>

            {/* Metadatos del Trabajador y Período */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Colaborador:</span>
                <strong className="text-slate-900 dark:text-white text-sm">{empleadoActual.nombre}</strong>
                <p className="text-[11px] text-slate-500">{empleadoActual.cargo}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Período de Pago:</span>
                <strong className="text-blue-600 dark:text-blue-400">{colillaCalculada.periodo.periodoTexto}</strong>
                <p className="text-[11px] text-slate-500">{colillaCalculada.periodo.diasLaboralesFijos} días fijos de ley</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Salario Mensual / Diario:</span>
                <strong className="text-slate-900 dark:text-white">{formatearCordobas(salarioMensual)}</strong>
                <p className="text-[11px] text-slate-500">{formatearCordobas(colillaCalculada.salario.salarioDiario)} / día</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Fecha de Ingreso:</span>
                <strong className="text-slate-900 dark:text-white">{empleadoActual.fechaIngreso || 'N/A'}</strong>
                <p className="text-[11px] text-slate-500">Depto: {empleadoActual.departamento || 'Tienda'}</p>
              </div>
            </div>

            {/* TABLA PRINCIPAL: PERCEPCIONES VS DEDUCCIONES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Columna 1: Ingresos / Percepciones */}
              <div className="bg-slate-50/70 dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>Percepciones (Ingresos)</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">Base comercial 15d</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800/60">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        Salario Ordinario Fijo ({colillaCalculada.periodo.diasLaboralesFijos} días)
                      </p>
                      <p className="text-[10px] text-slate-400">Pago fijo independiente de días del mes</p>
                    </div>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatearCordobas(colillaCalculada.ingresos.salarioOrdinarioDevengado)}
                    </span>
                  </div>

                  {colillaCalculada.ingresos.vacacionesPagadasDinero > 0 && (
                    <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800/60">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">Vacaciones Pagadas en Dinero</p>
                        <p className="text-[10px] text-emerald-600">Compensación económica convenida</p>
                      </div>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        +{formatearCordobas(colillaCalculada.ingresos.vacacionesPagadasDinero)}
                      </span>
                    </div>
                  )}

                  {Boolean(colillaCalculada.ingresos.feriadosTrabajadosPagados && colillaCalculada.ingresos.feriadosTrabajadosPagados > 0) && (
                    <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800/60">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">Feriados Laborados Pagados</p>
                        <p className="text-[10px] text-amber-600 dark:text-amber-400">Recargo 100% legal doble (Art. 67 C.T.)</p>
                      </div>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        +{formatearCordobas(colillaCalculada.ingresos.feriadosTrabajadosPagados || 0)}
                      </span>
                    </div>
                  )}

                  {colillaCalculada.ingresos.montoHorasExtras > 0 && (
                    <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800/60">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          Horas Extras ({colillaCalculada.ingresos.horasExtrasCantidad} hrs)
                        </p>
                        <p className="text-[10px] text-slate-400">Recargo 100% legal (Art. 58 C.T.)</p>
                      </div>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        +{formatearCordobas(colillaCalculada.ingresos.montoHorasExtras)}
                      </span>
                    </div>
                  )}

                  {colillaCalculada.ingresos.otrosIngresos > 0 && (
                    <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800/60">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">Otros Bonos / Incentivos</p>
                        <p className="text-[10px] text-slate-400">Comisiones o premios</p>
                      </div>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        +{formatearCordobas(colillaCalculada.ingresos.otrosIngresos)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 font-black text-sm text-slate-900 dark:text-white">
                    <span>TOTAL INGRESOS BRUTOS:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      {formatearCordobas(colillaCalculada.ingresos.totalIngresosBrutos)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Columna 2: Deducciones de Ley */}
              <div className="bg-slate-50/70 dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-rose-600" />
                    <span>Deducciones de Ley</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">Retenciones Oficiales</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800/60">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">INSS Laboral (7%)</p>
                      <p className="text-[10px] text-slate-400">Seguridad Social obligatoria</p>
                    </div>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      -{formatearCordobas(colillaCalculada.deducciones.inssLaboral)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800/60">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">IR Laboral Retenido</p>
                      <p className="text-[10px] text-slate-400">Tabla progresiva DGI / LCT</p>
                    </div>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      {colillaCalculada.deducciones.irRetencion > 0 ? `-${formatearCordobas(colillaCalculada.deducciones.irRetencion)}` : 'C$ 0.00 (Exento)'}
                    </span>
                  </div>

                  {colillaCalculada.deducciones.otrasDeducciones > 0 && (
                    <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800/60">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">Otras Deducciones</p>
                        <p className="text-[10px] text-slate-400">Préstamos o anticipos convenidos</p>
                      </div>
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                        -{formatearCordobas(colillaCalculada.deducciones.otrasDeducciones)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 font-black text-sm text-slate-900 dark:text-white">
                    <span>TOTAL DEDUCCIONES:</span>
                    <span className="font-mono text-rose-600 dark:text-rose-400">
                      -{formatearCordobas(colillaCalculada.deducciones.totalDeducciones)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CAJA DESTACADA: TOTAL NETO A RECIBIR */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase font-black tracking-wider text-emerald-100">
                  Total Neto a Recibir (Quincena)
                </p>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {formatearCordobas(colillaCalculada.netoAPagar)}
                </h3>
              </div>
              <div className="text-right text-xs text-emerald-100 sm:max-w-xs">
                <span>Salario garantizado y pagado íntegro por transferencia / efectivo en fecha de corte.</span>
              </div>
            </div>

            {/* SECCIÓN ESPECIAL: CONTROL DE VACACIONES, DESCANSOS Y FERIADOS DEL PERÍODO */}
            <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <Palmtree className="w-4 h-4 text-emerald-600" />
                  <span>Detalle de Vacaciones y Descansos del Período</span>
                </span>
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-full font-bold">
                  Art. 66 y 76 Código del Trabajo
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1 text-center text-xs">
                <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Saldo Anterior</span>
                  <strong className="text-slate-800 dark:text-slate-200 text-xs">
                    {colillaCalculada.vacaciones.saldoAnterior} días
                  </strong>
                </div>

                <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Ganados Período</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 text-xs">
                    +{colillaCalculada.vacaciones.diasGanadosPeriodo} días
                  </strong>
                </div>

                <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Vac. Gozadas</span>
                  <strong className="text-blue-600 dark:text-blue-400 text-xs">
                    {colillaCalculada.vacaciones.diasVacacionesGozadas} días
                  </strong>
                </div>

                <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">A Cta. Vacaciones</span>
                  <strong className="text-amber-600 dark:text-amber-400 text-xs">
                    {colillaCalculada.vacaciones.diasCuentaVacaciones} días
                  </strong>
                </div>

                <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Feriados Período</span>
                  <strong className="text-indigo-600 dark:text-indigo-400 text-xs">
                    {colillaCalculada.vacaciones.diasFeriadosPeriodo} días
                  </strong>
                </div>

                <div className="bg-emerald-100 dark:bg-emerald-950 p-2 rounded-xl border border-emerald-300 dark:border-emerald-700">
                  <span className="text-[9px] uppercase font-black text-emerald-800 dark:text-emerald-300 block">Saldo Final</span>
                  <strong className="text-emerald-800 dark:text-emerald-200 text-xs font-black">
                    {colillaCalculada.vacaciones.saldoActualDisponible} días
                  </strong>
                </div>
              </div>

              {/* Aclaración legal crucial requerida */}
              <div className="flex items-start gap-2 bg-white/80 dark:bg-slate-900/80 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/50 text-[11px] text-slate-600 dark:text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Garantía de Salario Fijo:</strong> {colillaCalculada.vacaciones.observacionVacaciones}
                </span>
              </div>
            </div>

            {/* Firmas de Conformidad */}
            <div className="pt-6 border-t border-dashed border-slate-300 dark:border-slate-700 grid grid-cols-2 gap-8 text-center text-xs text-slate-400">
              <div className="space-y-1">
                <div className="border-t border-slate-300 dark:border-slate-700 pt-2 font-bold text-slate-800 dark:text-slate-200">
                  {empleadoActual.nombre}
                </div>
                <p className="text-[10px]">Firma del Colaborador (Recibí Conforme)</p>
              </div>

              <div className="space-y-1">
                <div className="border-t border-slate-300 dark:border-slate-700 pt-2 font-bold text-slate-800 dark:text-slate-200">
                  Gerencia General / Recursos Humanos
                </div>
                <p className="text-[10px]">SENDA SISTEMAS • Sello y Firma Autorizada</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. VISTA 2: PLANILLA CONSOLIDADA DE LA TIENDA (CORTES 15 Y 30) */}
      {tabActual === 'resumen_tienda' && esAdmin && (
        <div className="space-y-4 animate-fadeIn">
          {/* Tarjetas de Métricas de la Planilla Quincenal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Bruto Planilla</span>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {formatearCordobas(totalesPlanilla.totalBruto)}
              </p>
              <span className="text-[10px] text-blue-600 font-semibold">{empleados.length} colaboradores activos</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Aporte INSS Laboral (7%)</span>
              <p className="text-xl font-black text-rose-600 mt-1">
                {formatearCordobas(totalesPlanilla.totalInss)}
              </p>
              <span className="text-[10px] text-slate-400 font-semibold">Deducción de seguridad social</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Neto a Pagar</span>
              <p className="text-xl font-black text-emerald-600 mt-1">
                {formatearCordobas(totalesPlanilla.totalNeto)}
              </p>
              <span className="text-[10px] text-emerald-500 font-semibold">A desembolsar en fecha de corte</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Saldo Vacaciones Total</span>
              <p className="text-xl font-black text-blue-600 mt-1">
                {totalesPlanilla.totalDiasVacaciones.toFixed(1)} días
              </p>
              <span className="text-[10px] text-slate-400 font-semibold">Pasivo de vacaciones acumulado</span>
            </div>
          </div>

          {/* Tabla de Empleados en la Quincena */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Resumen de Colillas • {tipoPeriodo === 'quincena_1' ? '1ra Quincena (1 al 15)' : tipoPeriodo === 'quincena_2' ? '2da Quincena (16 al 30)' : 'Mes Completo'}
                </h3>
                <p className="text-xs text-slate-400">Valores fijos comerciales garantizados por colaborador</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Corte:</span>
                <span className="text-xs bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-xl font-bold">
                  {tipoPeriodo === 'quincena_1' ? '15 de cada mes' : '30 de cada mes'}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-black text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4">Colaborador</th>
                    <th className="py-3 px-3">Cargo</th>
                    <th className="py-3 px-3 text-right">Salario Quincenal</th>
                    <th className="py-3 px-3 text-right">INSS (7%)</th>
                    <th className="py-3 px-3 text-right">Neto a Recibir</th>
                    <th className="py-3 px-3 text-center">Saldo Vac.</th>
                    <th className="py-3 px-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {planillaConsolidadaTienda.map(({ empleado, calculo }) => (
                    <tr key={empleado.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{empleado.nombre}</div>
                        <div className="text-[10px] text-slate-400">Ingreso: {empleado.fechaIngreso}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{empleado.cargo}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatearCordobas(calculo.salario.salarioBasePeriodo)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-rose-600">
                        -{formatearCordobas(calculo.deducciones.inssLaboral)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                        {formatearCordobas(calculo.netoAPagar)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full text-[10px]">
                          {calculo.vacaciones.saldoActualDisponible}d
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setEmpleadoSeleccionadoId(empleado.id);
                            setTabActual('colilla');
                          }}
                          className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-300 font-bold px-3 py-1 rounded-lg transition text-xs cursor-pointer"
                        >
                          Ver Colilla
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. VISTA 3: POLÍTICA DE DESCANSOS, FERIADOS Y SALARIO FIJO */}
      {tabActual === 'politica_descansos' && (
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5 animate-fadeIn max-w-4xl mx-auto text-left">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Régimen de Feriados, Vacaciones a Cuenta y Salario Fijo Quincenal
              </h3>
              <p className="text-xs text-slate-400">
                Código del Trabajo de la República de Nicaragua (Ley N° 185)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-200/80 dark:border-blue-900/40 space-y-2">
              <h4 className="font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Base Comercial de 15 Días por Quincena</span>
              </h4>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                En el comercio de Nicaragua, la planilla quincenal se cancela sobre una base comercial exacta de <strong>15 días laborables</strong> en la 1ra quincena (1 al 15) y <strong>15 días</strong> en la 2da quincena (16 al 30), independiente de si el mes tiene 28, 29, 30 o 31 días. El salario quincenal garantizado es la mitad exacta del salario mensual pactado.
              </p>
            </div>

            <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 space-y-2">
              <h4 className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Días Libres y Feriados "A Cuenta de Vacaciones"</span>
              </h4>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Cuando un colaborador solicita un día libre o puente festivo que se acuerda otorgar <strong>"a cuenta de vacaciones"</strong>, la afectación es <strong>estrictamente en el saldo de días de vacaciones</strong> acumuladas del trabajador. <strong>Su salario quincenal permanece 100% íntegro</strong> y no sufre ningún descuento monetario en su colilla de pago.
              </p>
            </div>
          </div>

          {/* Calendario de Feriados Oficiales de Nicaragua */}
          <div className="space-y-3 pt-2">
            <h4 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>Feriados Nacionales Oficiales de Nicaragua (Art. 66 C.T. - Con Goce de Sueldo)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
              {FERIADOS_NACIONALES_NICARAGUA.map((feriado, idx) => (
                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">{feriado.descripcion}</span>
                    <span className="text-[10px] text-slate-400">
                      {String(feriado.dia).padStart(2, '0')}/{String(feriado.mes).padStart(2, '0')}
                    </span>
                  </div>
                  <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Art. 66
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TICKET TÉRMICO POS-80C PARA IMPRESIÓN DIRECTA */}
      {colillaCalculada && typeof document !== 'undefined' && createPortal(
        <div id="ticket-recibo-print" className="hidden print:block text-black bg-white">
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <div style={{ fontWeight: '900', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              SENDA SISTEMAS
            </div>
            <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '2px' }}>
              COLILLA DE PAGO DE SALARIO
            </div>
            <div style={{ fontSize: '10px', color: '#222', marginTop: '1px' }}>
              RUC: J0310000000000 • Nicaragua
            </div>
            <div style={{ width: '100%', borderBottom: '1.5px dashed #000', margin: '6px 0' }} />
            <div style={{ fontWeight: '900', fontSize: '12px' }}>
              {colillaCalculada.periodo.periodoTexto.toUpperCase()}
            </div>
            <div style={{ width: '100%', borderBottom: '1.5px dashed #000', margin: '6px 0' }} />
          </div>

          <div style={{ fontSize: '11px', marginBottom: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '2px' }}>
              <span>Colaborador:</span>
              <span style={{ fontWeight: 'bold' }}>{empleadoActual.nombre}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '2px' }}>
              <span>Puesto:</span>
              <span>{empleadoActual.cargo}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '2px' }}>
              <span>Días Computados:</span>
              <span>{colillaCalculada.periodo.diasLaboralesFijos} días fijos</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <span>Salario Mensual:</span>
              <span>{formatearCordobas(salarioMensual)}</span>
            </div>
          </div>

          <div style={{ width: '100%', borderBottom: '1px dashed #000', margin: '6px 0' }} />

          {/* Percepciones */}
          <div style={{ fontSize: '11px', marginBottom: '6px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>PERCEPCIONES (C$):</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '2px' }}>
              <span>Salario Ordinario Fijo:</span>
              <span>{formatearCordobas(colillaCalculada.ingresos.salarioOrdinarioDevengado)}</span>
            </div>
            {colillaCalculada.ingresos.vacacionesPagadasDinero > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '2px' }}>
                <span>Vacaciones Pagadas:</span>
                <span>+{formatearCordobas(colillaCalculada.ingresos.vacacionesPagadasDinero)}</span>
              </div>
            )}
            {Boolean(colillaCalculada.ingresos.feriadosTrabajadosPagados && colillaCalculada.ingresos.feriadosTrabajadosPagados > 0) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '2px' }}>
                <span>Feriados Pagados (doble):</span>
                <span>+{formatearCordobas(colillaCalculada.ingresos.feriadosTrabajadosPagados || 0)}</span>
              </div>
            )}
            {colillaCalculada.ingresos.montoHorasExtras > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '2px' }}>
                <span>Horas Extras ({colillaCalculada.ingresos.horasExtrasCantidad}h):</span>
                <span>+{formatearCordobas(colillaCalculada.ingresos.montoHorasExtras)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontWeight: 'bold', marginTop: '3px' }}>
              <span>Total Bruto:</span>
              <span>{formatearCordobas(colillaCalculada.ingresos.totalIngresosBrutos)}</span>
            </div>
          </div>

          <div style={{ width: '100%', borderBottom: '1px dashed #000', margin: '6px 0' }} />

          {/* Deducciones */}
          <div style={{ fontSize: '11px', marginBottom: '6px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>DEDUCCIONES (C$):</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '2px' }}>
              <span>INSS Laboral (7%):</span>
              <span>-{formatearCordobas(colillaCalculada.deducciones.inssLaboral)}</span>
            </div>
            {colillaCalculada.deducciones.irRetencion > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '2px' }}>
                <span>IR Laboral:</span>
                <span>-{formatearCordobas(colillaCalculada.deducciones.irRetencion)}</span>
              </div>
            )}
            {colillaCalculada.deducciones.otrasDeducciones > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '2px' }}>
                <span>Otras Deducciones:</span>
                <span>-{formatearCordobas(colillaCalculada.deducciones.otrasDeducciones)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontWeight: 'bold', marginTop: '3px' }}>
              <span>Total Retenido:</span>
              <span>-{formatearCordobas(colillaCalculada.deducciones.totalDeducciones)}</span>
            </div>
          </div>

          {/* Total Neto */}
          <div style={{ width: '100%', borderTop: '2px dashed #000', borderBottom: '2px dashed #000', padding: '6px 0', margin: '8px 0', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold' }}>NETO A RECIBIR:</div>
            <div style={{ fontSize: '17px', fontWeight: '900', marginTop: '2px' }}>
              {formatearCordobas(colillaCalculada.netoAPagar)}
            </div>
          </div>

          {/* Resumen de Vacaciones */}
          <div style={{ fontSize: '10px', marginBottom: '8px', lineHeight: '1.3' }}>
            <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>CONTROL DE VACACIONES:</div>
            <div>• Saldo Anterior: {colillaCalculada.vacaciones.saldoAnterior} días</div>
            <div>• Ganados Período: +{colillaCalculada.vacaciones.diasGanadosPeriodo} días</div>
            {colillaCalculada.vacaciones.diasCuentaVacaciones > 0 && (
              <div>• A cta. vacaciones: -{colillaCalculada.vacaciones.diasCuentaVacaciones}d (Sin descuento salarial)</div>
            )}
            <div style={{ fontWeight: 'bold' }}>• Saldo Disponible: {colillaCalculada.vacaciones.saldoActualDisponible} días</div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', width: '100%', textAlign: 'center', fontSize: '10px' }}>
            <div style={{ width: '45%', borderTop: '1px solid #000', paddingTop: '4px' }}>
              Firma Trabajador
            </div>
            <div style={{ width: '45%', borderTop: '1px solid #000', paddingTop: '4px' }}>
              Firma y Sello Tienda
            </div>
          </div>

          <div style={{ textAlign: 'center', fontSize: '9px', marginTop: '12px', borderTop: '1px dashed #888', paddingTop: '6px' }}>
            *** Comprobante Oficial POS-80C • SENDA SISTEMAS ***
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
