import React, { useState, useMemo } from 'react';
import { 
  CalendarDays, 
  Check, 
  X, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Filter,
  User,
  Users,
  Palmtree,
  MessageSquare,
  Printer,
  Download,
  Phone,
  FileText,
  Send,
  CalendarPlus,
  Search,
  Share2,
  AlertCircle,
  Sparkles,
  TrendingUp,
  CheckCheck,
  Copy,
  ExternalLink
} from 'lucide-react';
import { createPortal } from 'react-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SolicitudVacaciones, Empleado } from '../types';
import { useData } from '../context/DataContext';
import { useToast } from './Toast';
import { formatearCordobas } from '../utils/calculosNica';

export const PanelSolicitudesAdmin: React.FC = () => {
  const { solicitudes, procesarSolicitud, empleados, crearSolicitud } = useData();
  const { success, warning, error, info } = useToast();

  // Control de Pestañas: 'solicitudes' | 'acumuladas'
  const [tabPrincipal, setTabPrincipal] = useState<'solicitudes' | 'acumuladas'>('solicitudes');

  // Estado de Filtros Solicitudes
  const [filtroEstado, setFiltroEstado] = useState<'Todas' | 'Pendiente' | 'Aprobado' | 'Rechazado'>('Todas');
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  // Estado de Filtros y Búsqueda en Vacaciones Acumuladas
  const [busquedaAcumuladas, setBusquedaAcumuladas] = useState('');
  const [filtroSaldo, setFiltroSaldo] = useState<'todos' | 'urgente' | 'menor15'>('todos');

  // Modales de Gestión
  const [empleadoParaHoja, setEmpleadoParaHoja] = useState<Empleado | null>(null);
  const [empleadoParaMensaje, setEmpleadoParaMensaje] = useState<Empleado | null>(null);
  const [empleadoParaProgramar, setEmpleadoParaProgramar] = useState<Empleado | null>(null);

  // Estado Formulario de Mensaje Administrativo
  const [asuntoMensaje, setAsuntoMensaje] = useState('Convocatoria para goce de vacaciones acumuladas');
  const [cuerpoMensaje, setCuerpoMensaje] = useState('');
  const [prioridadMensaje, setPrioridadMensaje] = useState<'Normal' | 'Urgente (Art. 76 C.T.)'>('Urgente (Art. 76 C.T.)');

  // Estado Formulario de Programación Rápida
  const [fechaInicioProg, setFechaInicioProg] = useState('');
  const [fechaFinProg, setFechaFinProg] = useState('');
  const [diasProg, setDiasProg] = useState<number>(15);
  const [motivoProg, setMotivoProg] = useState('Programación acordada con Administración');

  // Filtrado de solicitudes
  const solicitudesFiltradas = solicitudes.filter(s => {
    if (filtroEstado === 'Todas') return true;
    return s.estado === filtroEstado;
  });

  const pendientesCount = solicitudes.filter(s => s.estado === 'Pendiente').length;

  // Filtrado de empleados con vacaciones acumuladas
  const empleadosConVacaciones = useMemo(() => {
    return empleados
      .filter(emp => (emp.saldoDisponible || 0) > 0)
      .filter(emp => {
        const matchesQuery = 
          emp.nombre.toLowerCase().includes(busquedaAcumuladas.toLowerCase()) ||
          emp.cargo.toLowerCase().includes(busquedaAcumuladas.toLowerCase()) ||
          (emp.departamento || '').toLowerCase().includes(busquedaAcumuladas.toLowerCase());

        if (!matchesQuery) return false;

        if (filtroSaldo === 'urgente') return (emp.saldoDisponible || 0) >= 15;
        if (filtroSaldo === 'menor15') return (emp.saldoDisponible || 0) < 15;
        return true;
      })
      .sort((a, b) => (b.saldoDisponible || 0) - (a.saldoDisponible || 0));
  }, [empleados, busquedaAcumuladas, filtroSaldo]);

  const empleadosUrgentesCount = empleados.filter(e => (e.saldoDisponible || 0) >= 15).length;
  const totalDiasPendientes = empleados.reduce((acc, curr) => acc + (curr.saldoDisponible || 0), 0);
  const provisionTotalCordobas = empleados.reduce((acc, curr) => {
    const salarioDiario = (curr.salarioMensual || 12000) / 30;
    return acc + (salarioDiario * (curr.saldoDisponible || 0));
  }, 0);

  // Procesar Solicitud Recibida
  const handleProcesar = async (sol: SolicitudVacaciones, nuevoEstado: 'Aprobado' | 'Rechazado') => {
    setProcesandoId(sol.id);
    try {
      await procesarSolicitud(sol.id, nuevoEstado);
      success('Solicitud Procesada', `La solicitud de ${sol.nombreEmpleado} fue marcada como ${nuevoEstado}`);
    } catch (e: any) {
      error('Error al procesar', e?.message || 'No se pudo actualizar el estado');
    } finally {
      setProcesandoId(null);
    }
  };

  // Enviar mensaje por WhatsApp
  const handleEnviarWhatsApp = (emp: Empleado) => {
    const telefonoLimpio = (emp.telefono || '').replace(/[^\d]/g, '');
    if (!telefonoLimpio) {
      warning('Sin teléfono registrado', `El colaborador ${emp.nombre} no tiene un número telefónico asignado`);
      return;
    }

    const phoneFinal = telefonoLimpio.startsWith('505') ? telefonoLimpio : `505${telefonoLimpio}`;
    const dias = emp.saldoDisponible || 0;
    const esUrgente = dias >= 15;

    const textoWhatsApp = 
      `Hola *${emp.nombre}*, reciba un cordial saludo de la Administración de *SENDA SISTEMAS*.\n\n` +
      `Le informamos que actualmente registra un saldo de *${dias} días de vacaciones acumuladas* disponibles para su goce, ` +
      `conforme al Artículo 76 del Código del Trabajo de Nicaragua${esUrgente ? ' (cuenta con derecho a descanso inmediato de 15 días)' : ''}.\n\n` +
      `Le solicitamos coordinar con su jefatura para convenir sus fechas y proceder con la programación de sus vacaciones según la planificación administrativa.\n\n` +
      `¡Agradecemos su atención y valiosa labor!`;

    const url = `https://api.whatsapp.com/send?phone=${phoneFinal}&text=${encodeURIComponent(textoWhatsApp)}`;
    window.open(url, '_blank');
    success('WhatsApp abierto', `Se abrió el chat con ${emp.nombre} con el mensaje oficial`);
  };

  // Abrir Modal de Mensaje
  const abrirModalMensaje = (emp: Empleado) => {
    setEmpleadoParaMensaje(emp);
    setAsuntoMensaje(`Convocatoria a Goce de Vacaciones - ${emp.nombre}`);
    setCuerpoMensaje(
      `Estimado/a ${emp.nombre},\n\n` +
      `Por medio de la presente, la Gerencia y Administración de SENDA SISTEMAS le notifica que a la fecha cuenta con ${emp.saldoDisponible} días de vacaciones acumuladas legalmente disponibles.\n\n` +
      `Conforme a lo regulado en el Artículo 76 del Código del Trabajo de Nicaragua, le convocamos a presentar su propuesta de fechas de descanso para coordinar la respectiva programación de vacaciones.\n\n` +
      `Favor responder o presentarse a Recursos Humanos para formalizar su período.`
    );
  };

  // Enviar Notificación Interna
  const handleEnviarNotificacionInterna = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empleadoParaMensaje) return;

    // Guardar en bitácora de mensajes local para trazabilidad
    const savedLogs = localStorage.getItem('sendavac_mensajes_vacaciones') || '[]';
    try {
      const logs = JSON.parse(savedLogs);
      logs.unshift({
        id: 'msg-' + Date.now(),
        empleadoId: empleadoParaMensaje.id,
        nombreEmpleado: empleadoParaMensaje.nombre,
        asunto: asuntoMensaje,
        cuerpo: cuerpoMensaje,
        prioridad: prioridadMensaje,
        fecha: new Date().toLocaleString()
      });
      localStorage.setItem('sendavac_mensajes_vacaciones', JSON.stringify(logs.slice(0, 50)));
    } catch (err) {
      console.error(err);
    }

    success(
      '¡Mensaje Registrado y Enviado!',
      `Se ha enviado la notificación formal a ${empleadoParaMensaje.nombre}`
    );
    setEmpleadoParaMensaje(null);
  };

  // Abrir Modal de Programar Vacación Rápida
  const abrirModalProgramar = (emp: Empleado) => {
    setEmpleadoParaProgramar(emp);
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    
    // Sugerir inicio en 7 días
    const fechaSugerida = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000);
    const yyyyS = fechaSugerida.getFullYear();
    const mmS = String(fechaSugerida.getMonth() + 1).padStart(2, '0');
    const ddS = String(fechaSugerida.getDate()).padStart(2, '0');

    const diasADisfrutar = Math.min(15, emp.saldoDisponible || 15);
    const fechaFinCalc = new Date(fechaSugerida.getTime() + (diasADisfrutar - 1) * 24 * 60 * 60 * 1000);
    const yyyyF = fechaFinCalc.getFullYear();
    const mmF = String(fechaFinCalc.getMonth() + 1).padStart(2, '0');
    const ddF = String(fechaFinCalc.getDate()).padStart(2, '0');

    setFechaInicioProg(`${yyyyS}-${mmS}-${ddS}`);
    setFechaFinProg(`${yyyyF}-${mmF}-${ddF}`);
    setDiasProg(diasADisfrutar);
    setMotivoProg(`Programación oficial convenida por Administración (${diasADisfrutar} días)`);
  };

  // Guardar y Proceder con Vacación
  const handleGuardarProgramacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empleadoParaProgramar) return;

    if (diasProg <= 0 || diasProg > (empleadoParaProgramar.saldoDisponible || 0)) {
      error('Días Inválidos', `Los días deben ser entre 1 y su saldo disponible (${empleadoParaProgramar.saldoDisponible} días)`);
      return;
    }

    try {
      // Crear la solicitud de vacaciones
      const solId = await crearSolicitud({
        empleadoId: empleadoParaProgramar.id,
        nombreEmpleado: empleadoParaProgramar.nombre,
        cargoEmpleado: empleadoParaProgramar.cargo,
        fechaInicio: fechaInicioProg,
        fechaFin: fechaFinProg,
        diasSolicitados: diasProg,
        motivo: motivoProg
      });

      // Aprobarla de inmediato ya que es emitida directamente por Administración
      await procesarSolicitud(solId, 'Aprobado', 'Aprobado directamente por Administración');

      success(
        '¡Vacaciones Programadas!',
        `Se han programado y descontado ${diasProg} días a ${empleadoParaProgramar.nombre}`
      );
      setEmpleadoParaProgramar(null);
    } catch (err: any) {
      error('Error al programar', err?.message || 'No se pudo guardar la solicitud');
    }
  };

  // Generador PDF para la Hoja Oficial de Detalle de Vacaciones (Tamaño Carta / A4)
  const descargarPDFHojaDetalle = (emp: Empleado) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
      });

      const primaryColor = [29, 99, 255]; // Azul Senda
      const darkColor = [15, 23, 42];

      // Membrete Corporativo
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('SENDA SISTEMAS', 15, 18);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Control Oficial de Personal y Vacaciones Laborales', 15, 23);
      doc.text('Fundamento Legal: Art. 76 del Código del Trabajo de Nicaragua', 15, 27);

      // Fecha y Folio
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text(`Fecha Emisión: ${new Date().toISOString().split('T')[0]}`, 140, 18);
      doc.text(`Expediente No.: VAC-${emp.id.slice(-6).toUpperCase()}`, 140, 23);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(15, 31, 200, 31);

      // Título
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text('HOJA DE NOTIFICACIÓN Y ESTADO DE VACACIONES ACUMULADAS', 15, 39);

      // Tarjetas de datos en 2 columnas
      autoTable(doc, {
        startY: 44,
        head: [['DATOS DEL COLABORADOR', 'RESUMEN LABORAL']],
        body: [
          [
            `Nombre: ${emp.nombre}\nCargo: ${emp.cargo}\nDepartamento: ${emp.departamento || 'General'}\nTeléfono: ${emp.telefono || 'No registrado'}`,
            `Fecha de Ingreso: ${emp.fechaIngreso}\nSalario Mensual: ${formatearCordobas(emp.salarioMensual || 0)}\nSalario Diario (Base 30): ${formatearCordobas((emp.salarioMensual || 0) / 30)}\nEstado Laboral: ${emp.estado || 'Activo'}`
          ]
        ],
        theme: 'grid',
        headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8.5, textColor: [51, 65, 85], cellPadding: 3.5 },
        columnStyles: { 0: { cellWidth: 92 }, 1: { cellWidth: 93 } },
        margin: { left: 15, right: 15 }
      });

      // Tabla de Desglose de Saldo
      const currentY = (doc as any).lastAutoTable.finalY + 6;
      autoTable(doc, {
        startY: currentY,
        head: [['Concepto Cómputo Legal (Art. 76 C.T.)', 'Base Legal', 'Días Registrados', 'Valor Estimado (C$)']],
        body: [
          [
            'Días Totales Acumulados por Antigüedad',
            '2.5 días por mes continuo',
            `${emp.diasAcumulados} días`,
            formatearCordobas(emp.diasAcumulados * ((emp.salarioMensual || 0) / 30))
          ],
          [
            'Días Gozados / Compensados Anteriormente',
            'Historial de permisos y pagos',
            `${emp.diasTomados} días`,
            formatearCordobas(emp.diasTomados * ((emp.salarioMensual || 0) / 30))
          ],
          [
            'SALDO DISPONIBLE PARA GOCE INMEDIATO',
            'Días pendientes de disfrute',
            `${emp.saldoDisponible} DÍAS`,
            formatearCordobas(emp.saldoDisponible * ((emp.salarioMensual || 0) / 30))
          ]
        ],
        theme: 'striped',
        headStyles: { fillColor: [29, 99, 255], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8.5, cellPadding: 3.5 },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 45 },
          2: { cellWidth: 30, halign: 'center', fontStyle: 'bold' },
          3: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: 15, right: 15 }
      });

      // Directriz Administrativa y Base Legal
      const finalTableY = (doc as any).lastAutoTable.finalY + 8;
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      
      const textoNotificacion = `NOTIFICACIÓN DE LA ADMINISTRACIÓN: Se notifica formalmente al colaborador que a la presente fecha cuenta con un saldo de ${emp.saldoDisponible} días de vacaciones acumuladas. De conformidad con el Artículo 76 del Código del Trabajo de la República de Nicaragua, el descanso es un derecho laboral inalienable remunerado. Por medio de la presente, la Gerencia convoca al colaborador para convenir y presentar su plan de fechas de salida a fin de proceder con el descanso reglamentario sin afectar las operaciones regulares de la tienda.`;

      const splitText = doc.splitTextToSize(textoNotificacion, 185);
      doc.text(splitText, 15, finalTableY);

      // Firmas
      const firmasY = finalTableY + 36;
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.5);

      // Firma Colaborador
      doc.line(20, firmasY, 85, firmasY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text(emp.nombre, 52.5, firmasY + 5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Firma del Colaborador (Notificado Conforme)', 52.5, firmasY + 9, { align: 'center' });

      // Firma Gerencia
      doc.line(130, firmasY, 195, firmasY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text('Gerencia General / Recursos Humanos', 162.5, firmasY + 5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Firma y Sello Autorizado • SENDA SISTEMAS', 162.5, firmasY + 9, { align: 'center' });

      // Guardar PDF
      const nombreLimpio = emp.nombre.replace(/\s+/g, '_');
      doc.save(`Detalle_Vacaciones_${nombreLimpio}.pdf`);
      success('PDF Descargado', `Se generó la hoja de vacaciones de ${emp.nombre}`);
    } catch (err) {
      console.error('Error al generar PDF:', err);
      error('Error al generar PDF', 'No se pudo compilar el documento');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner idéntico a Gestión del Personal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/60 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs backdrop-blur-md">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-blue-500/25 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[14px] flex items-center justify-center">
              <CalendarDays className="w-6 h-6 sm:w-7 sm:h-7 text-[#1d63ff] dark:text-blue-400" />
            </div>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Gestión de Solicitudes y Vacaciones
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Aprobación en tiempo real y convocatoria administrativa de colaboradores con vacaciones acumuladas
            </p>
          </div>
        </div>

        {/* Indicador de Estado o Acción Rápida */}
        <div className="flex items-center gap-2.5 shrink-0">
          {tabPrincipal === 'solicitudes' ? (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 font-bold text-xs">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>{pendientesCount > 0 ? `${pendientesCount} Solicitudes Pendientes` : 'Todas al Día'}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
              <Palmtree className="w-4 h-4 text-emerald-600" />
              <span>{empleadosConVacaciones.length} con Saldo Acumulado</span>
            </div>
          )}
        </div>
      </div>

      {/* Barra de Pestañas idéntica al diseño de Gestión del Personal */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4 sm:gap-6 overflow-x-auto touch-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setTabPrincipal('solicitudes')}
          className={`pb-3.5 sm:pb-4 text-xs sm:text-sm font-extrabold flex items-center gap-2 sm:gap-2.5 border-b-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
            tabPrincipal === 'solicitudes'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Solicitudes de Colaboradores</span>
          <span className="ml-1 text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
            {solicitudes.length}
          </span>
          {pendientesCount > 0 && (
            <span className="ml-1 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
              {pendientesCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setTabPrincipal('acumuladas')}
          className={`pb-3.5 sm:pb-4 text-xs sm:text-sm font-extrabold flex items-center gap-2 sm:gap-2.5 border-b-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
            tabPrincipal === 'acumuladas'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Palmtree className="w-4 h-4" />
          <span>Vacaciones Acumuladas del Personal</span>
          <span className="ml-1 text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
            {empleadosConVacaciones.length}
          </span>
          {empleadosUrgentesCount > 0 && (
            <span className="ml-1 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-500 text-white">
              {empleadosUrgentesCount} listos
            </span>
          )}
        </button>
      </div>

      {/* ============================================================== */}
      {/* PESTAÑA 1: SOLICITUDES DE COLABORADORES                        */}
      {/* ============================================================== */}
      {tabPrincipal === 'solicitudes' && (
        <div className="space-y-4">
          {/* Píldoras de filtro por estado */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Filtrar solicitudes por estado:
            </span>
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold border border-slate-200/60 dark:border-slate-700">
              {(['Todas', 'Pendiente', 'Aprobado', 'Rechazado'] as const).map(estado => (
                <button
                  key={estado}
                  onClick={() => setFiltroEstado(estado)}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    filtroEstado === estado
                      ? 'bg-white dark:bg-[#1d63ff] text-slate-900 dark:text-white shadow-xs font-black'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  {estado}
                  {estado === 'Pendiente' && pendientesCount > 0 && (
                    <span className="ml-1.5 bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                      {pendientesCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Grid de Solicitudes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {solicitudesFiltradas.length === 0 ? (
              <div className="col-span-full bg-white dark:bg-slate-900/60 p-12 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center text-slate-400 dark:text-slate-500 text-xs font-medium">
                ✨ No hay solicitudes en el estado seleccionado.
              </div>
            ) : (
              solicitudesFiltradas.map((sol) => {
                const isPendiente = sol.estado === 'Pendiente';

                return (
                  <div
                    key={sol.id}
                    className="bg-white dark:bg-slate-900/60 p-6 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-4 hover:shadow-md transition"
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-extrabold flex items-center justify-center text-sm border border-blue-200 dark:border-blue-700">
                            {sol.nombreEmpleado.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                              {sol.nombreEmpleado}
                            </h4>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                              {sol.cargoEmpleado || 'Colaborador'} • Solicitado: {sol.fechaSolicitud}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`text-xs font-black px-3 py-1 rounded-xl ${
                            sol.estado === 'Aprobado'
                              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : sol.estado === 'Rechazado'
                              ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                              : 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse'
                          }`}
                        >
                          {sol.diasSolicitados} días
                        </span>
                      </div>

                      {/* Periodo de vacaciones */}
                      <div className="mt-4 grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                        <div>
                          <span className="text-slate-400 dark:text-slate-500 block uppercase font-bold text-[10px]">
                            Fecha de Salida:
                          </span>
                          <strong className="text-slate-800 dark:text-slate-200">{sol.fechaInicio}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 dark:text-slate-500 block uppercase font-bold text-[10px]">
                            Fecha de Regreso:
                          </span>
                          <strong className="text-slate-800 dark:text-slate-200">{sol.fechaFin}</strong>
                        </div>
                      </div>

                      {sol.motivo && (
                        <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          "{sol.motivo}"
                        </p>
                      )}
                    </div>

                    {/* Acciones de Aprobación */}
                    {isPendiente ? (
                      <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                          disabled={procesandoId === sol.id}
                          onClick={() => handleProcesar(sol, 'Rechazado')}
                          className="flex-1 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-black py-2.5 rounded-xl transition duration-150 flex items-center justify-center gap-1.5 border border-rose-200 dark:border-rose-900 cursor-pointer active:scale-95"
                        >
                          <X className="w-4 h-4" />
                          <span>Rechazar</span>
                        </button>
                        <button
                          disabled={procesandoId === sol.id}
                          onClick={() => handleProcesar(sol, 'Aprobado')}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-2.5 rounded-xl shadow-md shadow-emerald-600/20 transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <Check className="w-4 h-4" />
                          <span>{procesandoId === sol.id ? 'Descontando...' : 'Aprobar y Descontar'}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 font-medium">
                        <span className="flex items-center gap-1 font-bold">
                          {sol.estado === 'Aprobado' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-500" />
                          )}
                          <span className="text-slate-700 dark:text-slate-300">Resolución: {sol.estado}</span>
                        </span>
                        <span className="text-slate-400 dark:text-slate-500">{sol.fechaResolucion || 'Procesada'}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PESTAÑA 2: VACACIONES ACUMULADAS DEL PERSONAL (GESTIÓN ADMIN)  */}
      {/* ============================================================== */}
      {tabPrincipal === 'acumuladas' && (
        <div className="space-y-6">
          {/* Métricas del Pasivo y Acumulación */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Colaboradores con Saldo
                </p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {empleados.filter(e => (e.saldoDisponible || 0) > 0).length}
                </h3>
                <p className="text-[11px] text-blue-600 font-bold mt-0.5">Con días acumulados</p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Descanso Obligatorio (≥15d)
                </p>
                <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {empleadosUrgentesCount}
                </h3>
                <p className="text-[11px] text-amber-600 font-bold mt-0.5">Listos para descanso legal</p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 border border-amber-200 dark:border-amber-800 flex items-center justify-center font-bold">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Días Totales Pendientes
                </p>
                <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {totalDiasPendientes.toFixed(2)}
                </h3>
                <p className="text-[11px] text-emerald-600 font-bold mt-0.5">Días acumulados en tienda</p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center font-bold">
                <Palmtree className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Provisión Monetaria Total
                </p>
                <h3 className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                  {formatearCordobas(provisionTotalCordobas)}
                </h3>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5">Pasivo laboral de vacaciones</p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Barra de Búsqueda y Filtros de Vacaciones */}
          <div className="bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por colaborador, cargo o departamento..."
                value={busquedaAcumuladas}
                onChange={(e) => setBusquedaAcumuladas(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filtroSaldo}
                onChange={(e) => setFiltroSaldo(e.target.value as any)}
                className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                <option value="todos">Todos los que tienen saldo ({empleados.filter(e => (e.saldoDisponible || 0) > 0).length})</option>
                <option value="urgente">Prioridad: Saldo ≥ 15 días Art. 76 ({empleadosUrgentesCount})</option>
                <option value="menor15">Saldo Menor a 15 días ({empleados.filter(e => (e.saldoDisponible || 0) > 0 && (e.saldoDisponible || 0) < 15).length})</option>
              </select>
            </div>
          </div>

          {/* Tabla de Colaboradores con Vacaciones Acumuladas */}
          <div className="bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Colaboradores con Saldo Acumulado para Goce de Vacaciones
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-400">
                {empleadosConVacaciones.length} colaboradores encontrados
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    <th className="py-3 px-4">Colaborador</th>
                    <th className="py-3 px-4">Cargo / Departamento</th>
                    <th className="py-3 px-4 text-center">Acumulados</th>
                    <th className="py-3 px-4 text-center">Tomados</th>
                    <th className="py-3 px-4 text-center">Saldo Disponible</th>
                    <th className="py-3 px-4 text-right">Provisión (C$)</th>
                    <th className="py-3 px-4 text-center">Acciones de Administración</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {empleadosConVacaciones.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                        No se encontraron colaboradores con saldo de vacaciones según los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    empleadosConVacaciones.map((emp) => {
                      const saldo = emp.saldoDisponible || 0;
                      const esUrgente = saldo >= 15;
                      const salarioDiario = (emp.salarioMensual || 12000) / 30;
                      const valorProvision = salarioDiario * saldo;

                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                          {/* Colaborador */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold flex items-center justify-center text-xs shadow-xs shrink-0">
                                {emp.nombre.charAt(0)}
                              </div>
                              <div>
                                <p className="font-extrabold text-slate-900 dark:text-white leading-tight">
                                  {emp.nombre}
                                </p>
                                <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-emerald-500" />
                                  <span>{emp.telefono || 'Sin teléfono'}</span>
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Cargo */}
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-700 dark:text-slate-300">{emp.cargo}</p>
                            <p className="text-[11px] text-slate-400">{emp.departamento || 'General'}</p>
                          </td>

                          {/* Acumulados */}
                          <td className="py-3.5 px-4 text-center font-bold text-slate-600 dark:text-slate-400">
                            {emp.diasAcumulados} d
                          </td>

                          {/* Tomados */}
                          <td className="py-3.5 px-4 text-center font-bold text-slate-500">
                            {emp.diasTomados} d
                          </td>

                          {/* Saldo Disponible con Alerta Legal */}
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black shadow-xs ${
                                esUrgente
                                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                                  : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              }`}
                            >
                              {esUrgente && <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                              <span>{saldo} días</span>
                            </span>
                            {esUrgente && (
                              <p className="text-[9.5px] font-black text-amber-600 dark:text-amber-400 mt-1 uppercase tracking-tight">
                                ¡Descanso Obligatorio Art. 76!
                              </p>
                            )}
                          </td>

                          {/* Provisión Monetaria */}
                          <td className="py-3.5 px-4 text-right font-black text-slate-800 dark:text-slate-200">
                            {formatearCordobas(valorProvision)}
                          </td>

                          {/* Acciones */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {/* Botón WhatsApp */}
                              <button
                                type="button"
                                onClick={() => handleEnviarWhatsApp(emp)}
                                title="Enviar mensaje oficial por WhatsApp"
                                className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-200 dark:border-emerald-800/80 transition cursor-pointer active:scale-95 shadow-2xs"
                              >
                                <Share2 className="w-4 h-4" />
                              </button>

                              {/* Botón Mensaje / Notificación Interna */}
                              <button
                                type="button"
                                onClick={() => abrirModalMensaje(emp)}
                                title="Redactar y enviar mensaje administrativo formal"
                                className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200 dark:border-blue-800/80 transition cursor-pointer active:scale-95 shadow-2xs"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>

                              {/* Botón Ver e Imprimir Hoja Oficial */}
                              <button
                                type="button"
                                onClick={() => setEmpleadoParaHoja(emp)}
                                title="Ver e imprimir Hoja de Detalle Oficial (Carta/A4)"
                                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-900 hover:text-white text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer active:scale-95 shadow-2xs"
                              >
                                <Printer className="w-4 h-4 text-indigo-500" />
                              </button>

                              {/* Botón Exportar PDF Directo */}
                              <button
                                type="button"
                                onClick={() => descargarPDFHojaDetalle(emp)}
                                title="Descargar Hoja Oficial en PDF (Carta/A4)"
                                className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-200 dark:border-indigo-800/80 transition cursor-pointer active:scale-95 shadow-2xs"
                              >
                                <Download className="w-4 h-4" />
                              </button>

                              {/* Botón Proceder con Vacaciones (Programar) */}
                              <button
                                type="button"
                                onClick={() => abrirModalProgramar(emp)}
                                title="Proceder con la programación de vacaciones según administración"
                                className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-[11px] transition cursor-pointer active:scale-95 shadow-xs flex items-center gap-1"
                              >
                                <CalendarPlus className="w-3.5 h-3.5" />
                                <span>Proceder</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: REDACTAR Y ENVIAR MENSAJE ADMINISTRATIVO               */}
      {/* ============================================================== */}
      {empleadoParaMensaje && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-950/50 backdrop-blur-[2px] animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#0f172a] rounded-[24px] shadow-2xl border border-slate-100 dark:border-slate-800 p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <MessageSquare className="w-5 h-5" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Enviar Mensaje a {empleadoParaMensaje.nombre}
                </h3>
              </div>
              <button
                onClick={() => setEmpleadoParaMensaje(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/60 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">Saldo Actual Acumulado:</p>
                <p className="text-blue-600 dark:text-blue-400 font-black text-base">{empleadoParaMensaje.saldoDisponible} días disponibles</p>
              </div>
              <button
                type="button"
                onClick={() => handleEnviarWhatsApp(empleadoParaMensaje)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Enviar por WhatsApp</span>
              </button>
            </div>

            <form onSubmit={handleEnviarNotificacionInterna} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Asunto del Mensaje
                </label>
                <input
                  type="text"
                  required
                  value={asuntoMensaje}
                  onChange={(e) => setAsuntoMensaje(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Prioridad / Carácter de la Convocatoria
                </label>
                <select
                  value={prioridadMensaje}
                  onChange={(e) => setPrioridadMensaje(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                >
                  <option value="Urgente (Art. 76 C.T.)">Urgente - Descanso Legal Obligatorio (Art. 76 C.T.)</option>
                  <option value="Normal">Informativo - Planificación Regular de Vacaciones</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Cuerpo del Mensaje Oficial
                </label>
                <textarea
                  rows={6}
                  required
                  value={cuerpoMensaje}
                  onChange={(e) => setCuerpoMensaje(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEmpleadoParaMensaje(null)}
                  className="px-4 py-2 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Registrar y Enviar Notificación</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: PROCEDER CON PROGRAMACIÓN DE VACACIONES               */}
      {/* ============================================================== */}
      {empleadoParaProgramar && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-950/50 backdrop-blur-[2px] animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#0f172a] rounded-[24px] shadow-2xl border border-slate-100 dark:border-slate-800 p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <CalendarPlus className="w-5 h-5" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Proceder con Vacaciones de {empleadoParaProgramar.nombre}
                </h3>
              </div>
              <button
                onClick={() => setEmpleadoParaProgramar(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-900/60 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Saldo Disponible:</span>
                <span className="font-black text-indigo-600 dark:text-indigo-400">{empleadoParaProgramar.saldoDisponible} días</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cargo / Área:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{empleadoParaProgramar.cargo}</span>
              </div>
              <p className="text-[10px] text-slate-400 pt-1 italic">
                Esta acción creará y aprobará inmediatamente la solicitud de vacaciones según acuerdo de la administración.
              </p>
            </div>

            <form onSubmit={handleGuardarProgramacion} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Fecha de Salida
                  </label>
                  <input
                    type="date"
                    required
                    value={fechaInicioProg}
                    onChange={(e) => setFechaInicioProg(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Fecha de Regreso
                  </label>
                  <input
                    type="date"
                    required
                    value={fechaFinProg}
                    onChange={(e) => setFechaFinProg(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Días a Disfrutar y Descontar
                </label>
                <input
                  type="number"
                  min="1"
                  max={empleadoParaProgramar.saldoDisponible || 30}
                  required
                  value={diasProg}
                  onChange={(e) => setDiasProg(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Justificación / Resolución Administrativa
                </label>
                <input
                  type="text"
                  required
                  value={motivoProg}
                  onChange={(e) => setMotivoProg(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEmpleadoParaProgramar(null)}
                  className="px-4 py-2 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Aprobar y Descontar Vacaciones</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: VER E IMPRIMIR HOJA DE DETALLE OFICIAL (CARTA/A4)      */}
      {/* ============================================================== */}
      {empleadoParaHoja && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-4xl bg-white dark:bg-[#0f172a] rounded-[24px] shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden transition-all">
            
            {/* Header del Modal Fijo */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0f172a] shrink-0">
              <div className="flex items-center gap-2.5 text-[#1d63ff] dark:text-blue-400">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight">
                    Hoja Oficial de Detalle de Vacaciones
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Colaborador: <span className="font-bold text-slate-700 dark:text-slate-300">{empleadoParaHoja.nombre}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEmpleadoParaHoja(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Cerrar vista"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Vista previa Formato Documento Carta / A4 Centrada y Limpia */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100/70 dark:bg-slate-950/60 custom-scrollbar text-xs">
              <div className="bg-white dark:bg-slate-900 p-5 sm:p-7 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4 max-w-3xl mx-auto">
                {/* Membrete Documental */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b-2 border-slate-900 dark:border-slate-700 gap-3">
                  <div>
                    <h2 className="font-black text-lg sm:text-xl text-slate-900 dark:text-white uppercase tracking-wider">
                      SENDA SISTEMAS
                    </h2>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold mt-0.5">
                      Control Oficial de Personal y Vacaciones • Ley Laboral de Nicaragua
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Régimen Legal: Artículo 76 del Código del Trabajo (C.T.)
                    </p>
                  </div>
                  <div className="sm:text-right shrink-0">
                    <span className="inline-block px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 font-black text-xs tracking-wide">
                      EXP-VAC-{empleadoParaHoja.id.slice(-6).toUpperCase()}
                    </span>
                    <p className="text-[11px] text-slate-500 font-medium mt-1">
                      Fecha de Emisión: <strong>{new Date().toISOString().split('T')[0]}</strong>
                    </p>
                  </div>
                </div>

                {/* Tarjetas 2 Columnas de Información */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Datos del Colaborador
                    </p>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">
                      {empleadoParaHoja.nombre}
                    </p>
                    <div className="text-[11px] space-y-0.5 text-slate-600 dark:text-slate-300">
                      <p><span className="text-slate-400">Cargo:</span> <strong className="text-slate-700 dark:text-slate-200">{empleadoParaHoja.cargo}</strong></p>
                      <p><span className="text-slate-400">Departamento:</span> <strong className="text-slate-700 dark:text-slate-200">{empleadoParaHoja.departamento || 'General'}</strong></p>
                      <p><span className="text-slate-400">Teléfono:</span> <strong className="text-slate-700 dark:text-slate-200">{empleadoParaHoja.telefono || 'No registrado'}</strong></p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Condiciones Laborales y Salario
                    </p>
                    <div className="text-[11px] space-y-0.5 text-slate-600 dark:text-slate-300">
                      <p><span className="text-slate-400">Fecha de Ingreso:</span> <strong className="text-slate-900 dark:text-white">{empleadoParaHoja.fechaIngreso}</strong></p>
                      <p><span className="text-slate-400">Salario Mensual:</span> <strong className="text-slate-900 dark:text-white">{formatearCordobas(empleadoParaHoja.salarioMensual || 0)}</strong></p>
                      <p><span className="text-slate-400">Salario Diario (Base 30):</span> <strong className="text-slate-900 dark:text-white">{formatearCordobas((empleadoParaHoja.salarioMensual || 0) / 30)}</strong></p>
                      <p><span className="text-slate-400">Régimen:</span> 15 días continuos por cada 6 meses</p>
                    </div>
                  </div>
                </div>

                {/* Tabla de Cómputo de Saldo */}
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-2xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px]">
                        <th className="py-2.5 px-3.5 font-bold">Concepto de Cómputo Legal</th>
                        <th className="py-2.5 px-3.5 font-bold">Base de Cálculo</th>
                        <th className="py-2.5 px-3.5 text-center font-bold">Días</th>
                        <th className="py-2.5 px-3.5 text-right font-bold">Provisión Monetaria</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 text-xs">
                      <tr>
                        <td className="py-2.5 px-3.5 font-semibold">Días Totales Acumulados por Ley</td>
                        <td className="py-2.5 px-3.5 text-slate-500">2.5 días por mes continuo trabajado</td>
                        <td className="py-2.5 px-3.5 text-center font-bold text-slate-800 dark:text-slate-200">{empleadoParaHoja.diasAcumulados} d</td>
                        <td className="py-2.5 px-3.5 text-right font-bold text-slate-800 dark:text-slate-200">{formatearCordobas(empleadoParaHoja.diasAcumulados * ((empleadoParaHoja.salarioMensual || 0) / 30))}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3.5 font-semibold">Días Disfrutados / Compensados</td>
                        <td className="py-2.5 px-3.5 text-slate-500">Historial de descansos registrados</td>
                        <td className="py-2.5 px-3.5 text-center font-bold text-rose-600 dark:text-rose-400">-{empleadoParaHoja.diasTomados} d</td>
                        <td className="py-2.5 px-3.5 text-right text-slate-500">-{formatearCordobas(empleadoParaHoja.diasTomados * ((empleadoParaHoja.salarioMensual || 0) / 30))}</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className="bg-emerald-50 dark:bg-emerald-950/40 font-black text-emerald-950 dark:text-emerald-200 border-t-2 border-emerald-200 dark:border-emerald-800">
                        <td colSpan={2} className="py-3 px-3.5 uppercase tracking-wide text-xs">
                          SALDO DISPONIBLE PARA GOCE INMEDIATO:
                        </td>
                        <td className="py-3 px-3.5 text-center text-sm font-black text-emerald-700 dark:text-emerald-300">
                          {empleadoParaHoja.saldoDisponible} DÍAS
                        </td>
                        <td className="py-3 px-3.5 text-right text-sm font-black text-emerald-700 dark:text-emerald-300">
                          {formatearCordobas((empleadoParaHoja.saldoDisponible || 0) * ((empleadoParaHoja.salarioMensual || 0) / 30))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Firmas */}
                <div className="grid grid-cols-2 gap-8 pt-5 pb-1 text-center">
                  <div className="border-t border-slate-300 dark:border-slate-700 pt-2">
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">{empleadoParaHoja.nombre}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Firma del Colaborador • Notificado Conforme</p>
                  </div>
                  <div className="border-t border-slate-300 dark:border-slate-700 pt-2">
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">Gerencia General / Recursos Humanos</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Firma y Sello Autorizado • SENDA SISTEMAS</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Fijo con Botones de Acción Bien Acoplados */}
            <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0f172a] shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setEmpleadoParaHoja(null)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer order-last sm:order-first"
              >
                Cerrar
              </button>

              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => handleEnviarWhatsApp(empleadoParaHoja)}
                  className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Enviar por WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-800 hover:bg-black text-white transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <Printer className="w-4 h-4 text-blue-400" />
                  <span>Imprimir (Carta / A4)</span>
                </button>
                <button
                  type="button"
                  onClick={() => descargarPDFHojaDetalle(empleadoParaHoja)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar PDF</span>
                </button>
              </div>
            </div>
          </div>

          {/* Portal de Impresión Tamaño Carta / A4 */}
          {typeof document !== 'undefined' && createPortal(
            <div id="hoja-detalle-vacaciones-print" className="hidden print:block text-black bg-white">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase', color: '#0f172a' }}>
                    SENDA SISTEMAS
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#475569', marginTop: '2px' }}>
                    CONTROL OFICIAL DE PERSONAL Y VACACIONES LABORALES
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>
                    Fundamento Legal: Artículo 76 del Código del Trabajo de Nicaragua
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#1d63ff' }}>
                    NOTIFICACIÓN DE VACACIONES
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>
                    EXP-VAC-{empleadoParaHoja.id.slice(-6).toUpperCase()}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                    Fecha: {new Date().toISOString().split('T')[0]}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'center', margin: '14px 0', padding: '6px 0', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#1e293b' }}>
                  HOJA DE NOTIFICACIÓN Y ESTADO DE VACACIONES ACUMULADAS
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', fontSize: '11px' }}>
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', background: '#fcfcfd' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '6px' }}>
                    DATOS DEL COLABORADOR
                  </div>
                  <div style={{ marginBottom: '4px' }}><span style={{ color: '#64748b' }}>Nombre:</span> <strong>{empleadoParaHoja.nombre}</strong></div>
                  <div style={{ marginBottom: '4px' }}><span style={{ color: '#64748b' }}>Cargo:</span> {empleadoParaHoja.cargo}</div>
                  <div style={{ marginBottom: '4px' }}><span style={{ color: '#64748b' }}>Área:</span> {empleadoParaHoja.departamento || 'General'}</div>
                  <div><span style={{ color: '#64748b' }}>Teléfono:</span> {empleadoParaHoja.telefono || 'No registrado'}</div>
                </div>

                <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', background: '#fcfcfd' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '6px' }}>
                    CONDICIONES LABORALES
                  </div>
                  <div style={{ marginBottom: '4px' }}><span style={{ color: '#64748b' }}>Fecha de Ingreso:</span> <strong>{empleadoParaHoja.fechaIngreso}</strong></div>
                  <div style={{ marginBottom: '4px' }}><span style={{ color: '#64748b' }}>Salario Mensual:</span> <strong>{formatearCordobas(empleadoParaHoja.salarioMensual || 0)}</strong></div>
                  <div style={{ marginBottom: '4px' }}><span style={{ color: '#64748b' }}>Salario Diario (Base 30):</span> {formatearCordobas((empleadoParaHoja.salarioMensual || 0) / 30)}</div>
                  <div><span style={{ color: '#64748b' }}>Régimen:</span> 15 días por cada 6 meses continuos</div>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: '#1d63ff', color: '#ffffff', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px', border: '1px solid #1d63ff' }}>Concepto de Cómputo Legal</th>
                    <th style={{ padding: '8px 10px', border: '1px solid #1d63ff' }}>Base Legal</th>
                    <th style={{ padding: '8px 10px', border: '1px solid #1d63ff', textAlign: 'center' }}>Días</th>
                    <th style={{ padding: '8px 10px', border: '1px solid #1d63ff', textAlign: 'right' }}>Provisión Monetaria</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', fontWeight: '600' }}>
                      Días Totales Acumulados por Ley
                    </td>
                    <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', color: '#64748b' }}>
                      2.5 días por mes continuo laborado
                    </td>
                    <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold' }}>
                      {empleadoParaHoja.diasAcumulados} d
                    </td>
                    <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', textAlign: 'right' }}>
                      {formatearCordobas(empleadoParaHoja.diasAcumulados * ((empleadoParaHoja.salarioMensual || 0) / 30))}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', fontWeight: '600' }}>
                      Días Disfrutados / Compensados
                    </td>
                    <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', color: '#64748b' }}>
                      Historial de permisos y pagos previos
                    </td>
                    <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold', color: '#b91c1c' }}>
                      -{empleadoParaHoja.diasTomados} d
                    </td>
                    <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', textAlign: 'right', color: '#64748b' }}>
                      -{formatearCordobas(empleadoParaHoja.diasTomados * ((empleadoParaHoja.salarioMensual || 0) / 30))}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr style={{ background: '#ecfdf5', fontWeight: 'bold' }}>
                    <td colSpan={2} style={{ padding: '10px', border: '1px solid #a7f3d0', fontSize: '11px', color: '#065f46' }}>
                      SALDO DISPONIBLE PARA GOCE INMEDIATO:
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #a7f3d0', textAlign: 'center', fontSize: '13px', color: '#047857', fontWeight: '900' }}>
                      {empleadoParaHoja.saldoDisponible} DÍAS
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #a7f3d0', textAlign: 'right', fontSize: '13px', color: '#047857', fontWeight: '900' }}>
                      {formatearCordobas((empleadoParaHoja.saldoDisponible || 0) * ((empleadoParaHoja.salarioMensual || 0) / 30))}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div style={{ fontSize: '10px', lineHeight: '1.5', color: '#334155', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '10px', background: '#f8fafc', marginBottom: '28px', textAlign: 'justify' }}>
                <strong>NOTIFICACIÓN Y CONVOCATORIA DE ADMINISTRACIÓN:</strong> Se notifica formalmente al colaborador que a la presente fecha cuenta con un saldo de {empleadoParaHoja.saldoDisponible} días de vacaciones acumuladas. De conformidad con el Artículo 76 del Código del Trabajo de la República de Nicaragua, el descanso es un derecho laboral inalienable remunerado. Por medio de la presente, la Gerencia convoca al colaborador para convenir y presentar su plan de fechas de salida a fin de proceder con el descanso reglamentario sin afectar las operaciones regulares de la tienda.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', textAlign: 'center', fontSize: '11px', marginTop: '24px' }}>
                <div>
                  <div style={{ borderTop: '1.5px solid #0f172a', paddingTop: '6px', fontWeight: 'bold', color: '#0f172a' }}>
                    {empleadoParaHoja.nombre}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>Firma del Colaborador • Notificado Conforme</div>
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
    </div>
  );
};
