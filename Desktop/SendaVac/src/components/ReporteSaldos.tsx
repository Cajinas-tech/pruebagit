import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  FileSpreadsheet, 
  Printer, 
  Download, 
  FileText,
  Users, 
  TrendingUp, 
  Wallet,
  CheckCircle2,
  Calendar,
  Building2,
  DollarSign,
  Receipt,
  ChevronDown,
  X,
  Layers,
  Eye
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { formatearCordobas } from '../utils/calculosNica';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const ReporteSaldos: React.FC = () => {
  const { empleados } = useData();
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [showModalImpresion, setShowModalImpresion] = useState(false);
  const [formatoImpresion, setFormatoImpresion] = useState<'pos80' | 'pos80c' | 'carta'>('carta');
  const [orientacionCarta, setOrientacionCarta] = useState<'portrait' | 'landscape'>('portrait');
  const [menuImprimirAbierto, setMenuImprimirAbierto] = useState(false);

  const totalDiasDisponibles = empleados.reduce((acc, e) => acc + (e.saldoDisponible || 0), 0);
  const totalDiasAcumulados = empleados.reduce((acc, e) => acc + (e.diasAcumulados || 0), 0);
  const totalDiasGozados = empleados.reduce((acc, e) => acc + (e.diasTomados || 0), 0);
  const totalProvisionMonetaria = empleados.reduce((acc, e) => {
    return acc + (((e.salarioMensual || 12000) / 30) * (e.saldoDisponible || 0));
  }, 0);

  const fechaActual = new Date().toLocaleDateString('es-NI', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const horaActual = new Date().toLocaleTimeString('es-NI', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const imprimirDirecto = (formato: 'pos80' | 'pos80c' | 'carta') => {
    setFormatoImpresion(formato);
    setMenuImprimirAbierto(false);
    setTimeout(() => {
      window.print();
    }, 120);
  };

  const abrirModalImpresion = (formatoInicial?: 'pos80' | 'pos80c' | 'carta') => {
    if (formatoInicial) setFormatoImpresion(formatoInicial);
    setShowModalImpresion(true);
    setMenuImprimirAbierto(false);
  };

  const handleExportPDF = () => {
    try {
      setGenerandoPdf(true);
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // 1. Barra de Encabezado Azul SENDA
      doc.setFillColor(29, 99, 255);
      doc.rect(0, 0, 297, 18, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.text('SENDA SISTEMAS • CONTROL DE VACACIONES Y PERSONAL', 14, 12);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha de Emisión: ${fechaActual} • ${horaActual}`, 283, 12, { align: 'right' });

      // 2. Título del Reporte e Información de la Tienda
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('REPORTE CONSOLIDADO DE SALDOS DE VACACIONES Y PROVISIÓN SALARIAL', 14, 27);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Cálculo oficial según el Artículo 76 del Código del Trabajo de Nicaragua (15 días de descanso remunerado por cada 6 meses)', 14, 32);

      // 3. Resumen Ejecutivo (3 Cajas)
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(14, 37, 85, 16, 2, 2, 'F');
      doc.roundedRect(105, 37, 85, 16, 2, 2, 'F');
      doc.roundedRect(196, 37, 87, 16, 2, 2, 'F');

      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL COLABORADORES', 20, 43);
      doc.text('SALDO TOTAL ACUMULADO', 111, 43);
      doc.text('PROVISIÓN MONEDA NACIONAL (C$)', 202, 43);

      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(`${empleados.length} colaboradores`, 20, 50);

      doc.setTextColor(29, 99, 255);
      doc.text(`${totalDiasDisponibles.toFixed(1)} días disponibles`, 111, 50);

      doc.setTextColor(5, 150, 105);
      doc.text(formatearCordobas(totalProvisionMonetaria), 202, 50);

      // 4. Datos de la Tabla
      const tableData = empleados.map((emp, index) => {
        const prov = ((emp.salarioMensual || 12000) / 30) * emp.saldoDisponible;
        return [
          (index + 1).toString(),
          emp.nombre,
          emp.cargo || '-',
          emp.departamento || 'Caja y Ventas',
          emp.fechaIngreso,
          formatearCordobas(emp.salarioMensual || 0),
          emp.diasAcumulados.toFixed(2),
          (emp.diasTomados || 0).toFixed(2),
          `${emp.saldoDisponible} días`,
          formatearCordobas(prov)
        ];
      });

      // Fila Final de Totales
      tableData.push([
        '',
        'TOTALES GENERALES',
        '',
        '',
        '',
        '',
        totalDiasAcumulados.toFixed(2),
        totalDiasGozados.toFixed(2),
        `${totalDiasDisponibles.toFixed(1)} días`,
        formatearCordobas(totalProvisionMonetaria)
      ]);

      // 5. Generación de Tabla con jsPDF AutoTable
      autoTable(doc, {
        startY: 58,
        head: [[
          '#',
          'Colaborador',
          'Cargo / Puesto',
          'Departamento',
          'Ingreso',
          'Salario Mensual',
          'Acum.',
          'Gozados',
          'Saldo Disp.',
          'Provisión (C$)'
        ]],
        body: tableData,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 2,
          textColor: [30, 41, 59],
          valign: 'middle'
        },
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'left'
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 50, fontStyle: 'bold' },
          2: { cellWidth: 42 },
          3: { cellWidth: 32 },
          4: { cellWidth: 22, halign: 'center' },
          5: { cellWidth: 28, halign: 'right' },
          6: { cellWidth: 16, halign: 'center' },
          7: { cellWidth: 16, halign: 'center' },
          8: { cellWidth: 26, halign: 'center', fontStyle: 'bold', textColor: [29, 99, 255] },
          9: { cellWidth: 30, halign: 'right', fontStyle: 'bold', textColor: [5, 150, 105] }
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        didParseCell: (data) => {
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fillColor = [224, 231, 255];
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = [15, 23, 42];
          }
        }
      });

      // Guardar PDF automáticamente
      const fechaStr = new Date().toISOString().split('T')[0];
      doc.save(`Reporte_Consolidado_Vacaciones_SENDA_${fechaStr}.pdf`);
    } catch (err) {
      console.error('Error generando PDF:', err);
      window.print();
    } finally {
      setGenerandoPdf(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Nombre', 'Cargo', 'Departamento', 'Fecha Ingreso', 'Salario Mensual (C$)', 'Dias Acumulados', 'Dias Tomados', 'Saldo Disponible', 'Provision Estimada (C$)'];
    const rows = empleados.map(e => [
      `"${e.nombre}"`,
      `"${e.cargo}"`,
      `"${e.departamento || 'General'}"`,
      e.fechaIngreso,
      e.salarioMensual,
      e.diasAcumulados,
      e.diasTomados,
      e.saldoDisponible,
      (((e.salarioMensual || 12000) / 30) * e.saldoDisponible).toFixed(2)
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_vacaciones_senda_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Cabecera del Reporte en Pantalla */}
      <div className="bg-white dark:bg-slate-900/60 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 backdrop-blur-md">
        <div>
          <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#1d63ff] dark:text-blue-400" />
            <span>Reporte Consolidado de Saldos y Provisión Salarial</span>
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Cálculo oficial con base en el Art. 76 del Código del Trabajo de Nicaragua
          </p>
        </div>

        {/* Botones de Acción: Descargar CSV, Descargar PDF e Imprimir Reporte */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* 1. Descargar CSV */}
          <button
            onClick={handleExportCSV}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer active:scale-95"
            title="Exportar a hoja de cálculo Excel / CSV"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Descargar CSV</span>
          </button>

          {/* 2. Descargar Reporte en PDF */}
          <button
            onClick={handleExportPDF}
            disabled={generandoPdf}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-black px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 transition cursor-pointer active:scale-95 shadow-xs disabled:opacity-50"
            title="Descargar reporte completo en formato PDF oficial"
          >
            <FileText className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>{generandoPdf ? 'Generando PDF...' : 'Descargar PDF'}</span>
          </button>

          {/* 3. Imprimir Reporte con Opciones Multi-formato (POS 80, POS 80 C, Carta/A4) */}
          <div className="relative flex-1 md:flex-initial flex items-center">
            <button
              onClick={() => abrirModalImpresion()}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-[#1d63ff] hover:bg-blue-700 text-white text-xs font-black px-4 py-2.5 rounded-l-xl md:rounded-l-xl shadow-md shadow-blue-500/20 transition cursor-pointer active:scale-95"
              title="Abrir opciones de impresión: POS 80, POS 80 C o Carta / A4"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Reporte</span>
            </button>
            <button
              type="button"
              onClick={() => setMenuImprimirAbierto(!menuImprimirAbierto)}
              className="bg-blue-700 hover:bg-blue-800 text-white px-2.5 py-2.5 rounded-r-xl border-l border-blue-500/80 transition cursor-pointer shadow-md shadow-blue-500/20"
              title="Opciones rápidas de formato de impresión"
            >
              <ChevronDown className="w-4 h-4" />
            </button>

            {/* Dropdown de Acceso Rápido */}
            {menuImprimirAbierto && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 z-50 space-y-1 animate-fadeIn text-xs">
                <button
                  type="button"
                  onClick={() => imprimirDirecto('pos80')}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 flex items-center gap-2.5 font-bold text-slate-800 dark:text-slate-200 cursor-pointer transition"
                >
                  <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="leading-tight font-black">Imprimir en POS 80</p>
                    <p className="text-[10px] text-slate-400 font-normal">Ticket térmico estándar 80mm</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => imprimirDirecto('pos80c')}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 flex items-center gap-2.5 font-bold text-slate-800 dark:text-slate-200 cursor-pointer transition"
                >
                  <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="leading-tight font-black">Imprimir en POS 80 C</p>
                    <p className="text-[10px] text-slate-400 font-normal">Térmico continuo detallado</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => imprimirDirecto('carta')}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 flex items-center gap-2.5 font-bold text-slate-800 dark:text-slate-200 cursor-pointer transition"
                >
                  <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="leading-tight font-black">Imprimir en Carta / A4</p>
                    <p className="text-[10px] text-slate-400 font-normal">Documento corporativo formal</p>
                  </div>
                </button>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-1 mt-1">
                  <button
                    type="button"
                    onClick={() => abrirModalImpresion()}
                    className="w-full text-center px-3 py-1.5 rounded-xl text-blue-600 dark:text-blue-400 font-extrabold hover:bg-blue-50 dark:hover:bg-blue-950/40 text-[11px] transition cursor-pointer"
                  >
                    Ver Opciones y Vista Previa
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tarjetas de Resumen del Reporte */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Total Colaboradores
          </span>
          <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{empleados.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Saldo Total Acumulado
          </span>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{totalDiasDisponibles.toFixed(1)} días</p>
        </div>
        <div className="bg-white dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Provisión Moneda Nacional (C$)
          </span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatearCordobas(totalProvisionMonetaria)}</p>
        </div>
      </div>

      {/* Tabla Detallada en Pantalla */}
      <div className="bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto touch-scroll">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs text-left">
            <thead className="bg-slate-50/90 dark:bg-slate-900/90 text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Colaborador</th>
                <th className="px-6 py-4">Puesto / Depto</th>
                <th className="px-6 py-4">Fecha Ingreso</th>
                <th className="px-6 py-4 text-right">Salario Mensual</th>
                <th className="px-6 py-4 text-center">Acumulados</th>
                <th className="px-6 py-4 text-center">Gozados</th>
                <th className="px-6 py-4 text-center">Saldo Disponible</th>
                <th className="px-6 py-4 text-right">Provisión (C$)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
              {empleados.map((emp) => {
                const prov = ((emp.salarioMensual || 12000) / 30) * emp.saldoDisponible;
                return (
                  <tr key={emp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition">
                    <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {emp.nombre}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {emp.cargo}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap font-medium text-slate-500 dark:text-slate-400">
                      {emp.fechaIngreso}
                    </td>
                    <td className="px-6 py-3.5 text-right font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {formatearCordobas(emp.salarioMensual || 0)}
                    </td>
                    <td className="px-6 py-3.5 text-center font-bold whitespace-nowrap">
                      {emp.diasAcumulados}
                    </td>
                    <td className="px-6 py-3.5 text-center font-bold text-orange-600 dark:text-orange-400 whitespace-nowrap">
                      {emp.diasTomados || 0}
                    </td>
                    <td className="px-6 py-3.5 text-center whitespace-nowrap">
                      <span className="bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 px-2.5 py-0.5 rounded-full font-black text-[11px] border border-blue-200 dark:border-blue-800/60">
                        {emp.saldoDisponible} días
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {formatearCordobas(prov)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE SELECCIÓN Y VISTA PREVIA DE IMPRESIÓN (POS 80, POS 80 C, CARTA/A4) */}
      {showModalImpresion && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-4xl bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[88vh] overflow-hidden">
            
            {/* Header del Modal */}
            <div className="flex items-center justify-between px-5 py-2.5 sm:py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60">
                  <Printer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight">
                    Imprimir Reporte de Saldos y Provisión
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Selecciona el formato de impresión según la impresora conectada
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModalImpresion(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pestañas / Tarjetas de Selección de los 3 Formatos */}
            <div className="px-4 sm:px-5 py-2 sm:py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* 1. POS 80 */}
                <button
                  type="button"
                  onClick={() => setFormatoImpresion('pos80')}
                  className={`p-2 sm:p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                    formatoImpresion === 'pos80'
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 shadow-xs ring-2 ring-blue-500/20'
                      : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${formatoImpresion === 'pos80' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-1">
                      <span>POS 80</span>
                      {formatoImpresion === 'pos80' && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />}
                    </p>
                    <p className="text-[9.5px] text-slate-500 dark:text-slate-400 truncate">Ticket térmico 80mm</p>
                  </div>
                </button>

                {/* 2. POS 80 C */}
                <button
                  type="button"
                  onClick={() => setFormatoImpresion('pos80c')}
                  className={`p-2 sm:p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                    formatoImpresion === 'pos80c'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20'
                      : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${formatoImpresion === 'pos80c' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-1">
                      <span>POS 80 C</span>
                      {formatoImpresion === 'pos80c' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />}
                    </p>
                    <p className="text-[9.5px] text-slate-500 dark:text-slate-400 truncate">Rollo continuo detallado</p>
                  </div>
                </button>

                {/* 3. Carta / A4 */}
                <button
                  type="button"
                  onClick={() => setFormatoImpresion('carta')}
                  className={`p-2 sm:p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                    formatoImpresion === 'carta'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 shadow-xs ring-2 ring-indigo-500/20'
                      : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${formatoImpresion === 'carta' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                    <Printer className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-1">
                      <span>Tamaño Carta (A4)</span>
                      {formatoImpresion === 'carta' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />}
                    </p>
                    <p className="text-[9.5px] text-slate-500 dark:text-slate-400 truncate">Documento formal A4</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Vista Previa Visual del Documento */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 bg-slate-100/70 dark:bg-slate-950/60 text-xs flex justify-center custom-scrollbar">
              
              {/* VISTA PREVIA POS 80 */}
              {formatoImpresion === 'pos80' && (
                <div className="w-[330px] bg-white text-black p-4 rounded-2xl shadow-md border border-slate-300 font-mono text-[11px] space-y-2 h-fit">
                  <div className="text-center pb-2 border-b border-dashed border-black">
                    <p className="font-black text-sm uppercase">SENDA SISTEMAS</p>
                    <p className="text-[10px] font-bold">CONTROL DE VACACIONES Y PERSONAL</p>
                    <p className="text-[9px] text-gray-600">Ley Laboral Art. 76 C.T. • Managua</p>
                    <p className="font-bold text-[11px] mt-1">REPORTE DE SALDOS (POS-80)</p>
                    <p className="text-[9px] text-gray-500">Fecha: {fechaActual} • {horaActual}</p>
                  </div>

                  <div className="text-[10px] space-y-1 py-1 border-b border-dashed border-black">
                    <div className="flex justify-between">
                      <span>Colaboradores:</span>
                      <span className="font-bold">{empleados.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Saldo Total Acumulado:</span>
                      <span className="font-bold">{totalDiasDisponibles.toFixed(1)} días</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Provisión Total Estimada:</span>
                      <span className="font-bold">{formatearCordobas(totalProvisionMonetaria)}</span>
                    </div>
                  </div>

                  <div className="pt-1">
                    <div className="flex justify-between font-bold text-[10px] border-b border-black pb-1 mb-1">
                      <span className="w-1/2">COLABORADOR</span>
                      <span className="w-1/4 text-center">SALDO</span>
                      <span className="w-1/4 text-right">PROVISIÓN</span>
                    </div>
                    <div className="space-y-1 text-[10px]">
                      {empleados.map((emp, idx) => {
                        const prov = ((emp.salarioMensual || 12000) / 30) * emp.saldoDisponible;
                        return (
                          <div key={emp.id} className="flex justify-between items-center">
                            <span className="w-1/2 truncate font-medium">{idx + 1}. {emp.nombre}</span>
                            <span className="w-1/4 text-center font-bold">{emp.saldoDisponible} d</span>
                            <span className="w-1/4 text-right font-bold text-gray-800">{formatearCordobas(prov)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-black pt-2 font-bold text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span>TOTAL SALDO DISPONIBLE:</span>
                      <span>{totalDiasDisponibles.toFixed(1)} DÍAS</span>
                    </div>
                    <div className="flex justify-between">
                      <span>PROVISIÓN TOTAL:</span>
                      <span>{formatearCordobas(totalProvisionMonetaria)}</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-black pt-2 text-center text-[9px] text-gray-500">
                    <p>SENDA SISTEMAS • CONTROL LABORAL POS-80</p>
                    <p>*** CORTE DE TICKET ***</p>
                  </div>
                </div>
              )}

              {/* VISTA PREVIA POS 80 C */}
              {formatoImpresion === 'pos80c' && (
                <div className="w-[350px] bg-white text-black p-4 rounded-2xl shadow-md border border-slate-300 font-mono text-[11px] space-y-2 h-fit">
                  <div className="text-center pb-2 border-b-2 border-black">
                    <p className="font-black text-base uppercase">SENDA SISTEMAS</p>
                    <p className="text-[11px] font-bold">CONTROL CONSOLIDADO DE VACACIONES</p>
                    <p className="text-[10px] text-gray-600">Régimen Art. 76 C.T. • Managua, Nicaragua</p>
                    <div className="border-t border-black my-1.5" />
                    <p className="font-black text-[12px]">REPORTE DETALLADO CONTINUO (POS-80C)</p>
                    <p className="text-[9.5px] text-gray-600">Fecha: {fechaActual} | Hora: {horaActual}</p>
                    <p className="text-[9.5px]">Total Colaboradores: <strong>{empleados.length}</strong></p>
                  </div>

                  <div className="space-y-2 py-1">
                    {empleados.map((emp, idx) => {
                      const prov = ((emp.salarioMensual || 12000) / 30) * emp.saldoDisponible;
                      return (
                        <div key={emp.id} className="pb-2 border-b border-dashed border-gray-400 space-y-0.5 text-[10px]">
                          <p className="font-bold text-[11px]">{idx + 1}. {emp.nombre.toUpperCase()}</p>
                          <p className="text-gray-600">Puesto: {emp.cargo || 'General'} | Depto: {emp.departamento || 'Tienda'}</p>
                          <p className="text-gray-600">Ingreso: {emp.fechaIngreso} | Salario: {formatearCordobas(emp.salarioMensual || 0)}</p>
                          <div className="flex justify-between">
                            <span>Acumulados: <strong>{emp.diasAcumulados} d</strong></span>
                            <span>Gozados: <strong>{emp.diasTomados || 0} d</strong></span>
                          </div>
                          <div className="flex justify-between font-bold text-[11px] pt-0.5">
                            <span>&gt;&gt; SALDO DISP:</span>
                            <span>{emp.saldoDisponible} DÍAS</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span>&gt;&gt; PROVISIÓN (C$):</span>
                            <span>{formatearCordobas(prov)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t-2 border-black pt-2 font-bold text-[11px] space-y-1">
                    <p className="text-center uppercase text-[10px] font-black tracking-wider mb-1">RESUMEN CONSOLIDADO FINAL</p>
                    <div className="flex justify-between text-[10px]">
                      <span>Días Totales Acumulados:</span>
                      <span>{totalDiasAcumulados.toFixed(1)} d</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span>Días Totales Disfrutados:</span>
                      <span>{totalDiasGozados.toFixed(1)} d</span>
                    </div>
                    <div className="flex justify-between text-xs pt-1 border-t border-black">
                      <span>SALDO TOTAL DISPONIBLE:</span>
                      <span>{totalDiasDisponibles.toFixed(1)} DÍAS</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>PROVISIÓN TOTAL ESTIMADA:</span>
                      <span>{formatearCordobas(totalProvisionMonetaria)}</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-black pt-3 mt-3 text-center text-[9.5px] space-y-3">
                    <div>
                      <div className="border-b border-black w-3/4 mx-auto mb-1" />
                      <p className="font-bold">Elaborado Por: RRHH / Nómina</p>
                    </div>
                    <div>
                      <div className="border-b border-black w-3/4 mx-auto mb-1" />
                      <p className="font-bold">Aprobado: Gerencia General</p>
                    </div>
                  </div>

                  <div className="border-t border-black pt-2 text-center text-[9px] text-gray-500">
                    <p>SENDA SISTEMAS • Impreso en POS-80C</p>
                    <p>*** CORTE DE PAPEL CONTINUO ***</p>
                  </div>
                </div>
              )}

              {/* VISTA PREVIA CARTA / A4 */}
              {formatoImpresion === 'carta' && (
                <div className={`w-full ${orientacionCarta === 'landscape' ? 'max-w-4xl' : 'max-w-3xl'} bg-white text-black p-4 sm:p-5 rounded-xl shadow-md border border-slate-300 space-y-3 h-fit transition-all`}>
                  {/* Selector de Orientación */}
                  <div className="pb-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-700">Orientación de Hoja:</span>
                      <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                        <button
                          type="button"
                          onClick={() => setOrientacionCarta('portrait')}
                          className={`px-2.5 py-1 rounded-md font-bold text-xs transition cursor-pointer ${
                            orientacionCarta === 'portrait'
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          📄 Vertical (Retrato)
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrientacionCarta('landscape')}
                          className={`px-2.5 py-1 rounded-md font-bold text-xs transition cursor-pointer ${
                            orientacionCarta === 'landscape'
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          📑 Horizontal (Apaisado)
                        </button>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">Tamaño Carta / A4</span>
                  </div>

                  <div className="border-b-2 border-black pb-2.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h1 className="text-lg font-black tracking-tight text-black uppercase">SENDA SISTEMAS</h1>
                        <p className="text-[10px] font-bold text-gray-700 uppercase">Control de Vacaciones y Gestión de Personal • Ley Art. 76</p>
                        <p className="text-[9px] text-gray-600">Tienda Senda • RUC: J0310000123456 • Managua, Nicaragua</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block border border-black px-2 py-0.5 text-[9px] font-black uppercase">REPORTE CONSOLIDADO</span>
                        <p className="text-[9px] mt-1 text-gray-700">Emisión: <strong>{fechaActual}</strong></p>
                        <p className="text-[8px] text-gray-500">Hora: {horaActual}</p>
                      </div>
                    </div>
                    <div className="mt-3 bg-gray-100 p-2 rounded border border-gray-300 text-center">
                      <h2 className="text-xs font-black uppercase tracking-wider text-black">
                        CONSOLIDADO GENERAL DE SALDOS DE VACACIONES Y PROVISIÓN SALARIAL
                      </h2>
                      <p className="text-[8.5px] text-gray-600 mt-0.5">
                        Cálculo oficial según el Artículo 76 del Código del Trabajo de Nicaragua
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="border border-gray-300 p-2 rounded bg-gray-50">
                      <span className="text-[8px] font-black uppercase text-gray-600 block">Total Colaboradores</span>
                      <span className="text-sm font-black text-black">{empleados.length}</span>
                    </div>
                    <div className="border border-gray-300 p-2 rounded bg-gray-50">
                      <span className="text-[8px] font-black uppercase text-gray-600 block">Saldo Total Acumulado</span>
                      <span className="text-sm font-black text-black">{totalDiasDisponibles.toFixed(1)} DÍAS</span>
                    </div>
                    <div className="border border-gray-300 p-2 rounded bg-gray-50">
                      <span className="text-[8px] font-black uppercase text-gray-600 block">Provisión Total Estimada</span>
                      <span className="text-sm font-black text-black">{formatearCordobas(totalProvisionMonetaria)}</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '9px', textAlign: 'left' }}>
                      <colgroup>
                        <col style={{ width: '4%' }} />
                        <col style={{ width: '22%' }} />
                        <col style={{ width: '15%' }} />
                        <col style={{ width: '11%' }} />
                        <col style={{ width: '12%' }} />
                        <col style={{ width: '8%' }} />
                        <col style={{ width: '8%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '10%' }} />
                      </colgroup>
                      <thead>
                        <tr className="bg-gray-200 text-black font-black uppercase">
                          <th className="border border-gray-400 p-1 text-center">#</th>
                          <th className="border border-gray-400 p-1">Colaborador</th>
                          <th className="border border-gray-400 p-1">Cargo / Puesto</th>
                          <th className="border border-gray-400 p-1 text-center">Ingreso</th>
                          <th className="border border-gray-400 p-1 text-right">Salario (C$)</th>
                          <th className="border border-gray-400 p-1 text-center">Acum.</th>
                          <th className="border border-gray-400 p-1 text-center">Goz.</th>
                          <th className="border border-gray-400 p-1 text-center font-black">Saldo Disp.</th>
                          <th className="border border-gray-400 p-1 text-right font-black">Provisión (C$)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {empleados.map((emp, index) => {
                          const prov = ((emp.salarioMensual || 12000) / 30) * emp.saldoDisponible;
                          return (
                            <tr key={emp.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="border border-gray-300 p-1 text-center font-bold">{index + 1}</td>
                              <td className="border border-gray-300 p-1 font-bold text-black truncate">{emp.nombre}</td>
                              <td className="border border-gray-300 p-1 text-gray-700 truncate">{emp.cargo}</td>
                              <td className="border border-gray-300 p-1 text-center">{emp.fechaIngreso}</td>
                              <td className="border border-gray-300 p-1 text-right">{formatearCordobas(emp.salarioMensual || 0)}</td>
                              <td className="border border-gray-300 p-1 text-center">{emp.diasAcumulados}</td>
                              <td className="border border-gray-300 p-1 text-center">{emp.diasTomados || 0}</td>
                              <td className="border border-gray-300 p-1 text-center font-black text-black">{emp.saldoDisponible} d</td>
                              <td className="border border-gray-300 p-1 text-right font-black text-black">{formatearCordobas(prov)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-200 font-black text-black">
                          <td colSpan={4} className="border border-gray-400 p-1 text-right uppercase">TOTALES GENERALES:</td>
                          <td className="border border-gray-400 p-1 text-right">{formatearCordobas(empleados.reduce((acc, e) => acc + (e.salarioMensual || 0), 0))}</td>
                          <td className="border border-gray-400 p-1 text-center">{totalDiasAcumulados.toFixed(1)}</td>
                          <td className="border border-gray-400 p-1 text-center">{totalDiasGozados.toFixed(1)}</td>
                          <td className="border border-gray-400 p-1 text-center">{totalDiasDisponibles.toFixed(1)} d</td>
                          <td className="border border-gray-400 p-1 text-right">{formatearCordobas(totalProvisionMonetaria)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="pt-4 flex justify-around items-center text-center text-[9px]">
                    <div className="w-56 border-t border-black pt-1">
                      <p className="font-bold text-black uppercase">Elaborado Por</p>
                      <p className="text-gray-600">Recursos Humanos / Nómina</p>
                    </div>
                    <div className="w-56 border-t border-black pt-1">
                      <p className="font-bold text-black uppercase">Revisado y Aprobado</p>
                      <p className="text-gray-600">Gerencia General / Administración</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal con Botones */}
            <div className="px-4 sm:px-5 py-2.5 sm:py-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0f172a] shrink-0 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowModalImpresion(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cerrar
              </button>
              <div className="flex items-center gap-2">
                {formatoImpresion === 'carta' && (
                  <button
                    type="button"
                    onClick={handleExportPDF}
                    disabled={generandoPdf}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
                  >
                    <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>{generandoPdf ? 'Generando...' : 'Descargar PDF'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setTimeout(() => {
                      window.print();
                    }, 180);
                  }}
                  className={`px-4 sm:px-5 py-2 rounded-xl text-xs font-black text-white flex items-center gap-1.5 transition cursor-pointer shadow-md active:scale-95 ${
                    formatoImpresion === 'pos80'
                      ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                      : formatoImpresion === 'pos80c'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
                  }`}
                >
                  <Printer className="w-4 h-4" />
                  <span>
                    {formatoImpresion === 'pos80'
                      ? 'Imprimir Ticket POS-80'
                      : formatoImpresion === 'pos80c'
                      ? 'Imprimir Rollo POS-80C'
                      : `Imprimir en Carta / A4 (${orientacionCarta === 'portrait' ? 'Vertical' : 'Horizontal'})`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3 PLANTILLAS FÍSICAS DE IMPRESIÓN OFICIAL (@media print) CON PORTAL */}
      {/* ============================================================== */}
      {typeof document !== 'undefined' && createPortal(
        <>
          {formatoImpresion === 'carta' ? (
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                #root {
                  display: none !important;
                }
                @page {
                  size: auto !important;
                  margin: 0mm !important;
                }
                html, body {
                  width: 100% !important;
                  background: #ffffff !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
                #reporte-saldos-carta-print,
                #reporte-saldos-carta-print * {
                  visibility: visible !important;
                }
                #reporte-saldos-carta-print {
                  display: block !important;
                  position: relative !important;
                  left: auto !important;
                  top: auto !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  box-sizing: border-box !important;
                  margin: 0 auto !important;
                  padding: 8mm 10mm !important;
                  background: #ffffff !important;
                  color: #000000 !important;
                  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                }
                #reporte-saldos-carta-print table {
                  width: 100% !important;
                  table-layout: fixed !important;
                  border-collapse: collapse !important;
                }
              }
            `}} />
          ) : (
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                #root {
                  display: none !important;
                }
                @page {
                  size: auto !important;
                  margin: 0mm !important;
                }
                html, body {
                  width: 100% !important;
                  background: #ffffff !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
                #reporte-saldos-pos80-print,
                #reporte-saldos-pos80-print *,
                #reporte-saldos-pos80c-print,
                #reporte-saldos-pos80c-print * {
                  visibility: visible !important;
                }
                #reporte-saldos-pos80-print,
                #reporte-saldos-pos80c-print {
                  display: block !important;
                  position: relative !important;
                  left: auto !important;
                  top: auto !important;
                  width: 100% !important;
                  max-width: 76mm !important;
                  margin: 0 auto !important;
                  padding: 3mm 3.5mm !important;
                  box-sizing: border-box !important;
                  background: #ffffff !important;
                  color: #000000 !important;
                  font-family: 'Courier New', Courier, monospace !important;
                }
              }
            `}} />
          )}

          {/* 1. PLANTILLA POS 80 (Ticket Térmico 80mm Estándar) */}
          {formatoImpresion === 'pos80' && (
        <div id="reporte-saldos-pos80-print" className="hidden print:block text-black bg-white">
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <div style={{ fontWeight: '900', fontSize: '15px', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              SENDA SISTEMAS
            </div>
            <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '2px' }}>
              CONTROL DE VACACIONES Y PERSONAL
            </div>
            <div style={{ fontSize: '10px', color: '#333', marginTop: '1px' }}>
              Ley Laboral Art. 76 C.T. • Managua
            </div>
            <div style={{ borderBottom: '1.5px dashed #000', margin: '6px 0' }} />
            <div style={{ fontWeight: '900', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              REPORTE DE SALDOS (POS-80)
            </div>
            <div style={{ fontSize: '10px', marginTop: '2px' }}>
              Fecha: {fechaActual} • {horaActual}
            </div>
            <div style={{ borderBottom: '1.5px dashed #000', margin: '6px 0' }} />
          </div>

          <div style={{ fontSize: '10.5px', marginBottom: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>Total Colaboradores:</span>
              <span style={{ fontWeight: 'bold' }}>{empleados.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>Saldo Total Acumulado:</span>
              <span style={{ fontWeight: 'bold' }}>{totalDiasDisponibles.toFixed(1)} días</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Provisión Total Estimada:</span>
              <span style={{ fontWeight: 'bold' }}>{formatearCordobas(totalProvisionMonetaria)}</span>
            </div>
          </div>

          <div style={{ borderBottom: '1.5px dashed #000', margin: '6px 0' }} />

          <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ width: '52%' }}>COLABORADOR</span>
              <span style={{ width: '20%', textAlign: 'center' }}>SALDO</span>
              <span style={{ width: '28%', textAlign: 'right' }}>PROVISIÓN</span>
            </div>
          </div>
          <div style={{ borderBottom: '1px solid #000', marginBottom: '6px' }} />

          <div style={{ fontSize: '10px' }}>
            {empleados.map((emp, idx) => {
              const prov = ((emp.salarioMensual || 12000) / 30) * emp.saldoDisponible;
              return (
                <div key={emp.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'flex-start' }}>
                  <div style={{ width: '52%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {idx + 1}. {emp.nombre}
                  </div>
                  <div style={{ width: '20%', textAlign: 'center', fontWeight: 'bold' }}>
                    {emp.saldoDisponible} d
                  </div>
                  <div style={{ width: '28%', textAlign: 'right', fontWeight: 'bold' }}>
                    {formatearCordobas(prov)}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ borderBottom: '1.5px dashed #000', margin: '8px 0' }} />

          <div style={{ fontSize: '11px', fontWeight: '900' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span>TOTAL SALDO DISPONIBLE:</span>
              <span>{totalDiasDisponibles.toFixed(1)} DÍAS</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>PROVISIÓN TOTAL:</span>
              <span>{formatearCordobas(totalProvisionMonetaria)}</span>
            </div>
          </div>

          <div style={{ borderBottom: '1.5px dashed #000', margin: '8px 0' }} />

          <div style={{ textAlign: 'center', fontSize: '9px', color: '#444', marginTop: '6px' }}>
            <div>SENDA SISTEMAS • CONTROL LABORAL POS-80</div>
            <div>Documento de uso interno administrativo</div>
            <div style={{ marginTop: '4px' }}>*** FIN DEL TICKET ***</div>
          </div>
        </div>
      )}

      {/* 2. PLANTILLA POS 80 C (Térmico Continuo 80mm Detallado con Firmas) */}
      {formatoImpresion === 'pos80c' && (
        <div id="reporte-saldos-pos80c-print" className="hidden print:block text-black bg-white">
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <div style={{ fontWeight: '900', fontSize: '16px', letterSpacing: '1px', textTransform: 'uppercase' }}>
              SENDA SISTEMAS
            </div>
            <div style={{ fontSize: '11.5px', fontWeight: 'bold', marginTop: '2px' }}>
              CONTROL CONSOLIDADO DE VACACIONES
            </div>
            <div style={{ fontSize: '10px', color: '#222', marginTop: '1px' }}>
              Régimen Art. 76 C.T. • Managua, Nicaragua
            </div>
            <div style={{ borderBottom: '2px solid #000', margin: '6px 0' }} />
            <div style={{ fontWeight: '900', fontSize: '12px', textTransform: 'uppercase' }}>
              REPORTE DETALLADO CONTINUO (POS-80C)
            </div>
            <div style={{ fontSize: '10px', marginTop: '2px' }}>
              Fecha: {fechaActual} | Hora: {horaActual}
            </div>
            <div style={{ fontSize: '10px', color: '#333' }}>
              Total Colaboradores Activos: <strong>{empleados.length}</strong>
            </div>
            <div style={{ borderBottom: '2px solid #000', margin: '6px 0' }} />
          </div>

          {/* Lista detallada continua */}
          <div style={{ fontSize: '10.5px' }}>
            {empleados.map((emp, idx) => {
              const prov = ((emp.salarioMensual || 12000) / 30) * emp.saldoDisponible;
              return (
                <div key={emp.id} style={{ marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px dashed #666' }}>
                  <div style={{ fontWeight: '900', fontSize: '11px' }}>
                    {idx + 1}. {emp.nombre.toUpperCase()}
                  </div>
                  <div style={{ color: '#333', fontSize: '10px', marginTop: '1px' }}>
                    Puesto: {emp.cargo || 'General'} | Depto: {emp.departamento || 'Tienda'}
                  </div>
                  <div style={{ color: '#444', fontSize: '10px' }}>
                    Ingreso: {emp.fechaIngreso} | Salario: {formatearCordobas(emp.salarioMensual || 0)}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '2px' }}>
                    <span>Acumulados: <strong>{emp.diasAcumulados} d</strong></span>
                    <span>Gozados: <strong>{emp.diasTomados || 0} d</strong></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '2px', fontWeight: 'bold' }}>
                    <span>&gt;&gt; SALDO DISPONIBLE:</span>
                    <span style={{ fontSize: '11.5px' }}>{emp.saldoDisponible} DÍAS</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', marginTop: '1px' }}>
                    <span>&gt;&gt; PROVISIÓN (C$):</span>
                    <span style={{ fontWeight: 'bold' }}>{formatearCordobas(prov)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ borderBottom: '2px solid #000', margin: '8px 0' }} />

          {/* Resumen Final */}
          <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '8px' }}>
            <div style={{ textTransform: 'uppercase', textAlign: 'center', marginBottom: '4px', fontSize: '11.5px' }}>
              RESUMEN CONSOLIDADO FINAL
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>Días Totales Acumulados:</span>
              <span>{totalDiasAcumulados.toFixed(1)} d</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>Días Totales Disfrutados:</span>
              <span>{totalDiasGozados.toFixed(1)} d</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '12px', fontWeight: '900' }}>
              <span>SALDO TOTAL DISPONIBLE:</span>
              <span>{totalDiasDisponibles.toFixed(1)} DÍAS</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '900', borderTop: '1px solid #000', paddingTop: '3px' }}>
              <span>PROVISIÓN TOTAL:</span>
              <span>{formatearCordobas(totalProvisionMonetaria)}</span>
            </div>
          </div>

          <div style={{ borderBottom: '1.5px dashed #000', margin: '10px 0' }} />

          {/* Firmas en Rollo */}
          <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '14px' }}>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ borderBottom: '1px solid #000', width: '70%', margin: '0 auto 3px auto' }} />
              <div style={{ fontWeight: 'bold' }}>Elaborado Por: RRHH / Nómina</div>
            </div>
            <div>
              <div style={{ borderBottom: '1px solid #000', width: '70%', margin: '0 auto 3px auto' }} />
              <div style={{ fontWeight: 'bold' }}>Aprobado: Gerencia General</div>
            </div>
          </div>

          <div style={{ borderBottom: '2px solid #000', margin: '10px 0 6px 0' }} />
          <div style={{ textAlign: 'center', fontSize: '9px', color: '#444' }}>
            SENDA SISTEMAS • Control Continuo POS-80C<br />
            *** CORTE DE PAPEL CONTINUO ***
          </div>
        </div>
      )}

      {/* 3. PLANTILLA CARTA / A4 (Documento Corporativo Formal) */}
      {formatoImpresion === 'carta' && (
        <div id="reporte-saldos-carta-print" className="hidden print:block text-black bg-white">
          {/* Cabecera del Documento Impreso */}
          <div className="border-b-2 border-black pb-3 mb-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-lg font-black tracking-tight text-black uppercase">
                  SENDA SISTEMAS
                </h1>
                <p className="text-[10px] font-bold text-gray-700 uppercase">
                  Control de Vacaciones y Gestión de Personal • Ley Art. 76
                </p>
                <p className="text-[9px] text-gray-600">
                  Tienda Senda • RUC: J0310000123456 • Managua, Nicaragua
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block border border-black px-2 py-0.5 text-[9px] font-black uppercase">
                  REPORTE CONSOLIDADO
                </span>
                <p className="text-[9px] mt-1 text-gray-700">
                  Emisión: <strong>{fechaActual}</strong>
                </p>
                <p className="text-[8px] text-gray-500">
                  Hora: {horaActual}
                </p>
              </div>
            </div>

            <div className="mt-3 bg-gray-100 p-2 rounded border border-gray-300 text-center">
              <h2 className="text-xs font-black uppercase tracking-wider text-black">
                CONSOLIDADO GENERAL DE SALDOS DE VACACIONES Y PROVISIÓN SALARIAL
              </h2>
              <p className="text-[8.5px] text-gray-600 mt-0.5">
                Cálculo reglamentario: 15 días continuos de descanso remunerado por cada 6 meses (2.5 días por mes laborado)
              </p>
            </div>
          </div>

          {/* Resumen de Cifras Clave */}
          <div className="grid grid-cols-3 gap-2 mb-4 text-center">
            <div className="border border-gray-300 p-2 rounded bg-gray-50">
              <span className="text-[8px] font-black uppercase text-gray-600 block">Total Colaboradores</span>
              <span className="text-sm font-black text-black">{empleados.length}</span>
            </div>
            <div className="border border-gray-300 p-2 rounded bg-gray-50">
              <span className="text-[8px] font-black uppercase text-gray-600 block">Saldo Total Acumulado</span>
              <span className="text-sm font-black text-black">{totalDiasDisponibles.toFixed(1)} DÍAS</span>
            </div>
            <div className="border border-gray-300 p-2 rounded bg-gray-50">
              <span className="text-[8px] font-black uppercase text-gray-600 block">Provisión Total Estimada</span>
              <span className="text-sm font-black text-black">{formatearCordobas(totalProvisionMonetaria)}</span>
            </div>
          </div>

          {/* Tabla Completa de Colaboradores para Impresión */}
          <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '9px', textAlign: 'left' }}>
            <colgroup>
              <col style={{ width: '4%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <thead>
              <tr style={{ background: '#e2e8f0', color: '#000000', fontWeight: '900', textTransform: 'uppercase' }}>
                <th style={{ border: '1px solid #94a3b8', padding: '5px 3px', textAlign: 'center' }}>#</th>
                <th style={{ border: '1px solid #94a3b8', padding: '5px 5px' }}>Colaborador</th>
                <th style={{ border: '1px solid #94a3b8', padding: '5px 5px' }}>Cargo / Puesto</th>
                <th style={{ border: '1px solid #94a3b8', padding: '5px 3px', textAlign: 'center' }}>Ingreso</th>
                <th style={{ border: '1px solid #94a3b8', padding: '5px 5px', textAlign: 'right' }}>Salario (C$)</th>
                <th style={{ border: '1px solid #94a3b8', padding: '5px 3px', textAlign: 'center' }}>Acum.</th>
                <th style={{ border: '1px solid #94a3b8', padding: '5px 3px', textAlign: 'center' }}>Goz.</th>
                <th style={{ border: '1px solid #94a3b8', padding: '5px 3px', textAlign: 'center', fontWeight: '900' }}>Saldo Disp.</th>
                <th style={{ border: '1px solid #94a3b8', padding: '5px 5px', textAlign: 'right', fontWeight: '900' }}>Provisión (C$)</th>
              </tr>
            </thead>
            <tbody>
              {empleados.map((emp, index) => {
                const prov = ((emp.salarioMensual || 12000) / 30) * emp.saldoDisponible;
                return (
                  <tr key={emp.id} style={{ background: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ border: '1px solid #cbd5e1', padding: '4px 3px', textAlign: 'center', fontWeight: 'bold' }}>{index + 1}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '4px 5px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.nombre}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '4px 5px', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.cargo}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '4px 3px', textAlign: 'center' }}>{emp.fechaIngreso}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '4px 5px', textAlign: 'right' }}>{formatearCordobas(emp.salarioMensual || 0)}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '4px 3px', textAlign: 'center' }}>{emp.diasAcumulados}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '4px 3px', textAlign: 'center' }}>{emp.diasTomados || 0}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '4px 3px', textAlign: 'center', fontWeight: '900' }}>
                      {emp.saldoDisponible} d
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '4px 5px', textAlign: 'right', fontWeight: '900' }}>
                      {formatearCordobas(prov)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#e2e8f0', fontWeight: '900', color: '#000000' }}>
                <td colSpan={4} style={{ border: '1px solid #94a3b8', padding: '5px 5px', textAlign: 'right', textTransform: 'uppercase' }}>
                  TOTALES GENERALES:
                </td>
                <td style={{ border: '1px solid #94a3b8', padding: '5px 5px', textAlign: 'right' }}>
                  {formatearCordobas(empleados.reduce((acc, e) => acc + (e.salarioMensual || 0), 0))}
                </td>
                <td style={{ border: '1px solid #94a3b8', padding: '5px 3px', textAlign: 'center' }}>
                  {totalDiasAcumulados.toFixed(1)}
                </td>
                <td style={{ border: '1px solid #94a3b8', padding: '5px 3px', textAlign: 'center' }}>
                  {totalDiasGozados.toFixed(1)}
                </td>
                <td style={{ border: '1px solid #94a3b8', padding: '5px 3px', textAlign: 'center' }}>
                  {totalDiasDisponibles.toFixed(1)} d
                </td>
                <td style={{ border: '1px solid #94a3b8', padding: '5px 5px', textAlign: 'right' }}>
                  {formatearCordobas(totalProvisionMonetaria)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Sección de Firmas de Autorización */}
          <div className="mt-8 pt-4 flex justify-around items-center text-center text-[9px]">
            <div className="w-56 border-t border-black pt-1">
              <p className="font-bold text-black uppercase">Elaborado Por</p>
              <p className="text-gray-600">Recursos Humanos / Nómina</p>
            </div>
            <div className="w-56 border-t border-black pt-1">
              <p className="font-bold text-black uppercase">Revisado y Aprobado</p>
              <p className="text-gray-600">Gerencia General / Administración</p>
            </div>
          </div>

          {/* Pie de Página */}
          <div className="mt-6 text-center text-[7.5px] text-gray-500 border-t border-gray-300 pt-2">
            SENDA SISTEMAS • Sistema de Control y Gestión de Vacaciones • República de Nicaragua • Documento oficial generado automáticamente
          </div>
        </div>
      )}
    </>,
    document.body
  )}
</div>
  );
};
