import React, { useState } from 'react';
import { Clock, PieChart, TrendingUp, Info } from 'lucide-react';
import { useData } from '../context/DataContext';
import { formatearCordobas } from '../utils/calculosNica';

interface SegmentData {
  label: string;
  value: number;
  color: string;
  displayValue?: string;
}

interface DonutWidgetProps {
  titulo: string;
  icono: React.ReactNode;
  segmentos: SegmentData[];
  unidad?: string;
  centroTexto?: string;
  centroSubtexto?: string;
}

const DonutWidget: React.FC<DonutWidgetProps> = ({
  titulo,
  icono,
  segmentos,
  unidad = '',
  centroTexto,
  centroSubtexto
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const total = segmentos.reduce((acc, s) => acc + s.value, 0) || 1;
  const radius = 38;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  let acumuladoAngulo = 0;

  return (
    <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:shadow-md transition">
      {/* Cabecera del Gráfico */}
      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
        <span className="text-slate-500 dark:text-slate-400">{icono}</span>
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
          {titulo}
        </h3>
      </div>

      {/* Donut SVG con Anillos Interactivos */}
      <div className="relative flex items-center justify-center my-3 h-48">
        <svg viewBox="0 0 100 100" className="w-40 h-40 transform -rotate-90">
          {/* Círculo base de fondo con soporte dark */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            className="text-slate-100 dark:text-slate-800"
            strokeWidth={strokeWidth}
          />

          {/* Segmentos de Donut */}
          {segmentos.map((seg, idx) => {
            const porcentaje = seg.value / total;
            const strokeDasharray = `${porcentaje * circumference} ${circumference}`;
            const strokeDashoffset = -acumuladoAngulo * circumference;
            acumuladoAngulo += porcentaje;

            const isHovered = hoverIndex === idx;

            return (
              <circle
                key={idx}
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={isHovered ? strokeWidth + 2 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
              />
            );
          })}
        </svg>

        {/* Texto Central */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-xl font-black text-slate-800 dark:text-white leading-tight">
            {hoverIndex !== null ? segmentos[hoverIndex].value : (centroTexto || Math.round(total))}
          </span>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {hoverIndex !== null ? segmentos[hoverIndex].label : (centroSubtexto || unidad)}
          </span>
        </div>
      </div>

      {/* Leyenda en Cuadrícula inferior idéntica a la captura */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs mt-2">
        {segmentos.map((seg, idx) => (
          <div
            key={idx}
            onMouseEnter={() => setHoverIndex(idx)}
            onMouseLeave={() => setHoverIndex(null)}
            className={`flex items-center justify-between p-1 rounded-lg cursor-pointer transition ${
              hoverIndex === idx ? 'bg-slate-50 dark:bg-slate-800 font-bold' : ''
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: seg.color }}
              />
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 truncate uppercase">
                {seg.label}:
              </span>
            </div>
            <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 ml-2">
              {seg.displayValue || seg.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const DonutCharts: React.FC = () => {
  const { empleados, solicitudes } = useData();

  // 1. Datos para Balance de Vacaciones
  const diasDisponiblesTotales = Math.round(
    empleados.reduce((acc, curr) => acc + (curr.saldoDisponible || 0), 0)
  );
  const diasTomadosTotales = Math.round(
    empleados.reduce((acc, curr) => acc + (curr.diasTomados || 0), 0)
  );
  const solicitudesAprobadas = solicitudes.filter(s => s.estado === 'Aprobado').length;
  const solicitudesPendientes = solicitudes.filter(s => s.estado === 'Pendiente').length;

  const segmentosVacaciones: SegmentData[] = [
    { label: 'Disponibles', value: diasDisponiblesTotales, color: '#ef4444' }, // Rojo vibrante según captura
    { label: 'Gozados', value: diasTomadosTotales, color: '#f59e0b' },      // Amarillo
    { label: 'Aprobados', value: solicitudesAprobadas * 5, color: '#10b981', displayValue: `${solicitudesAprobadas}` }, // Verde
    { label: 'Por Revisar', value: solicitudesPendientes * 5, color: '#3b82f6', displayValue: `${solicitudesPendientes}` }  // Azul
  ];

  // 2. Datos para Personal por Área / Cargo
  const areaCounts = empleados.reduce((acc, e) => {
    const dep = e.departamento || 'General';
    acc[dep] = (acc[dep] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const segmentosAreas: SegmentData[] = [
    { label: 'Caja y Ventas', value: areaCounts['Caja y Ventas'] || 2, color: '#3b82f6' },
    { label: 'Inventario', value: areaCounts['Inventario'] || 1, color: '#06b6d4' },
    { label: 'Administración', value: areaCounts['Administración'] || 1, color: '#f59e0b' },
    { label: 'Créditos / POS', value: areaCounts['Créditos y Cuentas'] || 1, color: '#10b981' }
  ];

  // 3. Proyección de Nómina Vacacional por Departamento en Córdobas
  const nominasPorArea = empleados.reduce((acc, e) => {
    const dep = e.departamento || 'General';
    const monto = ((e.salarioMensual || 12000) / 30) * (e.saldoDisponible || 0);
    acc[dep] = (acc[dep] || 0) + monto;
    return acc;
  }, {} as Record<string, number>);

  const segmentosNomina: SegmentData[] = [
    {
      label: 'Admin / Gerencia',
      value: Math.round(nominasPorArea['Administración'] || 35000),
      color: '#3b82f6',
      displayValue: formatearCordobas(nominasPorArea['Administración'] || 35000)
    },
    {
      label: 'Inventario',
      value: Math.round(nominasPorArea['Inventario'] || 15000),
      color: '#8b5cf6',
      displayValue: formatearCordobas(nominasPorArea['Inventario'] || 15000)
    },
    {
      label: 'Caja & Piso',
      value: Math.round(nominasPorArea['Caja y Ventas'] || 13500),
      color: '#ec4899',
      displayValue: formatearCordobas(nominasPorArea['Caja y Ventas'] || 13500)
    },
    {
      label: 'Créditos',
      value: Math.round(nominasPorArea['Créditos y Cuentas'] || 10500),
      color: '#06b6d4',
      displayValue: formatearCordobas(nominasPorArea['Créditos y Cuentas'] || 10500)
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {/* Gráfico 1: Resumen de Vacaciones */}
      <DonutWidget
        titulo="Resumen de Vacaciones"
        icono={<Clock className="w-4 h-4 text-rose-500" />}
        segmentos={segmentosVacaciones}
        unidad="días tot."
        centroTexto={`${diasDisponiblesTotales}`}
        centroSubtexto="días disp."
      />

      {/* Gráfico 2: Personal por Categoría */}
      <DonutWidget
        titulo="Personal por Área"
        icono={<Clock className="w-4 h-4 text-sky-500" />}
        segmentos={segmentosAreas}
        unidad="colabs."
        centroTexto={`${empleados.length}`}
        centroSubtexto="empleados"
      />

      {/* Gráfico 3: Proyección en C$ Córdobas */}
      <DonutWidget
        titulo="Provisión Salarial (C$)"
        icono={<TrendingUp className="w-4 h-4 text-purple-600" />}
        segmentos={segmentosNomina}
        unidad="C$ Total"
        centroTexto="100%"
        centroSubtexto="Ley Nica"
      />
    </div>
  );
};
