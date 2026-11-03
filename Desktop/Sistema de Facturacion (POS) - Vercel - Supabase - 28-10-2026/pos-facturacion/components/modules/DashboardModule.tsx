"use client";

import React, { useMemo } from "react";
import {
  TrendingUp,
  Receipt,
  AlertTriangle,
  CreditCard,
  DollarSign,
  ShoppingCart,
  Boxes,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  Wallet,
} from "lucide-react";
import {
  Producto,
  Factura,
  Categoria,
  CreditoCuenta,
  SesionCaja,
  ModuloId,
} from "@/lib/types";
import { formatoCordobas } from "@/lib/currency";

interface DashboardProps {
  productos: Producto[];
  facturas: Factura[];
  categorias: Categoria[];
  creditos: CreditoCuenta[];
  sesionCaja: SesionCaja | null;
  onIrAModulo: (modulo: ModuloId) => void;
}

export default function DashboardModule({
  productos,
  facturas,
  categorias,
  creditos,
  sesionCaja,
  onIrAModulo,
}: DashboardProps) {
  // 1. Estadísticas Generales
  const hoyStr = new Date().toISOString().split("T")[0];

  const facturasHoy = useMemo(() => {
    return facturas.filter((f) => f.created_at.startsWith(hoyStr));
  }, [facturas, hoyStr]);

  const totalVentasHoy = useMemo(() => {
    return facturasHoy.reduce((acc, f) => acc + (f.estado === "emitida" ? f.total : 0), 0);
  }, [facturasHoy]);

  const totalVentasGeneral = useMemo(() => {
    return facturas.reduce((acc, f) => acc + (f.estado === "emitida" ? f.total : 0), 0);
  }, [facturas]);

  const saldoPendienteCreditos = useMemo(() => {
    return creditos.reduce((acc, c) => acc + (c.estado !== "pagado" ? c.saldo_pendiente : 0), 0);
  }, [creditos]);

  const productosBajoStock = useMemo(() => {
    return productos.filter((p) => p.stock <= p.stock_minimo);
  }, [productos]);

  // 2. Gráfico de Pastel: Distribución por Método de Pago
  const datosMetodosPago = useMemo(() => {
    const mapa: Record<string, number> = {};
    facturas.forEach((f) => {
      if (f.estado === "emitida") {
        const metodo = f.metodo_pago || "efectivo_cordobas";
        mapa[metodo] = (mapa[metodo] || 0) + f.total;
      }
    });

    const colores: Record<string, string> = {
      efectivo_cordobas: "#10b981", // verde
      efectivo_dolares: "#0284c7",  // azul cielo
      tarjeta: "#6366f1",           // indigo
      transferencia: "#8b5cf6",     // violeta
      al_credito: "#f59e0b",        // ambar
      mixto: "#ec4899",             // rosa
    };

    const nombres: Record<string, string> = {
      efectivo_cordobas: "Efectivo C$",
      efectivo_dolares: "Dólares USD",
      tarjeta: "Tarjeta (POS)",
      transferencia: "Transferencia BCN",
      al_credito: "Al Crédito",
      mixto: "Pago Mixto",
    };

    const total = Object.values(mapa).reduce((a, b) => a + b, 0) || 1;

    return Object.entries(mapa).map(([clave, valor]) => ({
      clave,
      nombre: nombres[clave] || clave,
      valor,
      porcentaje: ((valor / total) * 100).toFixed(1),
      color: colores[clave] || "#94a3b8",
    }));
  }, [facturas]);

  // 3. Gráfico de Pastel: Distribución por Categorías
  const datosCategorias = useMemo(() => {
    const mapaCat: Record<string, number> = {};
    const catNombres: Record<string, { nombre: string; color: string }> = {};

    categorias.forEach((c) => {
      catNombres[c.id] = { nombre: c.nombre, color: c.color };
    });

    productos.forEach((p) => {
      const catId = p.categoria_id || "sin_categoria";
      const valorAproximado = p.stock * p.precio_venta;
      mapaCat[catId] = (mapaCat[catId] || 0) + valorAproximado;
    });

    const total = Object.values(mapaCat).reduce((a, b) => a + b, 0) || 1;

    const lista = Object.entries(mapaCat).map(([catId, valor]) => ({
      catId,
      nombre: catNombres[catId]?.nombre || "Otras / Variados",
      valor,
      porcentaje: ((valor / total) * 100).toFixed(1),
      color: catNombres[catId]?.color || "#64748b",
    }));

    return lista.sort((a, b) => b.valor - a.valor).slice(0, 5);
  }, [categorias, productos]);

  // Render SVG Donut Chart
  const renderDonutSVG = (
    data: { nombre: string; porcentaje: string; color: string; valor: number }[]
  ) => {
    let accumulatedPercent = 0;
    const slices = data.map((item) => {
      const percent = parseFloat(item.porcentaje) || 0;
      const startAngle = (accumulatedPercent / 100) * 360;
      accumulatedPercent += percent;
      const endAngle = (accumulatedPercent / 100) * 360;

      const x1 = 50 + 40 * Math.cos((Math.PI * (startAngle - 90)) / 180);
      const y1 = 50 + 40 * Math.sin((Math.PI * (startAngle - 90)) / 180);
      const x2 = 50 + 40 * Math.cos((Math.PI * (endAngle - 90)) / 180);
      const y2 = 50 + 40 * Math.sin((Math.PI * (endAngle - 90)) / 180);

      const largeArcFlag = percent > 50 ? 1 : 0;
      const pathData = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

      return { ...item, pathData };
    });

    return (
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-44 h-44 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {slices.length === 0 ? (
              <circle cx="50" cy="50" r="40" fill="#e2e8f0" />
            ) : (
              slices.map((slice, idx) => (
                <path
                  key={idx}
                  d={slice.pathData}
                  fill={slice.color}
                  className="transition-all hover:opacity-85"
                />
              ))
            )}
            {/* Center Hole for Donut */}
            <circle cx="50" cy="50" r="24" className="fill-white dark:fill-slate-900 transition-colors" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">TOTAL</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">100%</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 w-full space-y-2">
          {data.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate pr-2">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-slate-700 dark:text-slate-300 truncate font-medium">
                  {item.nombre}
                </span>
              </div>
              <div className="flex items-center gap-2 text-right flex-shrink-0">
                <span className="font-bold text-slate-900 dark:text-slate-100">{item.porcentaje}%</span>
                <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px]">
                  ({formatoCordobas(item.valor)})
                </span>
              </div>
            </div>
          ))}
          {data.length === 0 && (
            <div className="text-slate-400 dark:text-slate-500 text-xs italic py-4 text-center">
              Sin datos registrados aún
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Quick Action Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/30 text-blue-200 text-xs font-semibold mb-2">
            <span>🇳🇮</span> Moneda Oficial: Córdobas (C$) • Tasa Oficial BCN
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            Panel de Control y Analítica
          </h2>
          <p className="text-blue-100/90 text-sm max-w-xl mt-1">
            Resumen en tiempo real de facturación, flujo de caja, rotación PEPS y cuentas por cobrar en Nicaragua.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onIrAModulo("pos")}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-500/30 transition flex items-center gap-2 text-sm cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            Nueva Venta (F2)
          </button>
          <button
            onClick={() => onIrAModulo("caja")}
            className="bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2.5 rounded-xl backdrop-blur transition flex items-center gap-2 text-sm border border-white/20 cursor-pointer"
          >
            <Wallet className="w-4 h-4" />
            Control de Caja
          </button>
        </div>
      </div>

      {/* 4 Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ventas Hoy */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Ventas de Hoy (C$)
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2 font-mono">
            {formatoCordobas(totalVentasHoy)}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-2">
            <Receipt className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{facturasHoy.length} facturas emitidas hoy</span>
          </div>
        </div>

        {/* Total Facturado Histórico */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Facturación Total (C$)
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2 font-mono">
            {formatoCordobas(totalVentasGeneral)}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-2">
            <span>{facturas.length} transacciones registradas</span>
          </div>
        </div>

        {/* Cuentas por Cobrar Pendientes */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Créditos por Cobrar
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-2 font-mono">
            {formatoCordobas(saldoPendienteCreditos)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-2">
            <span>{creditos.filter((c) => c.estado !== "pagado").length} cuentas activas</span>
            <button
              onClick={() => onIrAModulo("creditos")}
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
            >
              Ver CxC
            </button>
          </div>
        </div>

        {/* Alerta de Stock Crítico */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Alertas de Inventario
            </span>
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                productosBajoStock.length > 0
                  ? "bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div
            className={`text-2xl font-extrabold mt-2 font-mono ${
              productosBajoStock.length > 0
                ? "text-red-600 dark:text-red-400"
                : "text-slate-800 dark:text-slate-100"
            }`}
          >
            {productosBajoStock.length}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-2">
            <span>Productos en stock mínimo</span>
            <button
              onClick={() => onIrAModulo("inventario")}
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
            >
              Ver Lotes PEPS
            </button>
          </div>
        </div>
      </div>

      {/* Gráficos de Pastel (Donuts): Métodos de Pago y Categorías */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pastel 1: Métodos de Pago */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                Ventas por Método de Pago
              </h3>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
              C$ vs USD vs Tarjetas
            </span>
          </div>
          {renderDonutSVG(datosMetodosPago)}
        </div>

        {/* Pastel 2: Distribución por Categoría */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                Inventario Valorado por Categoría
              </h3>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
              Top 5 Familias
            </span>
          </div>
          {renderDonutSVG(datosCategorias)}
        </div>
      </div>

      {/* Productos con Stock Bajo */}
      {productosBajoStock.length > 0 && (
        <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h3 className="font-bold text-amber-900 dark:text-amber-300 text-sm">
                Atención: Productos que requieren reorden o compra
              </h3>
            </div>
            <button
              onClick={() => onIrAModulo("inventario")}
              className="text-xs font-bold text-amber-800 dark:text-amber-400 hover:underline cursor-pointer"
            >
              Ir a Entrada de Lotes (PEPS) →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {productosBajoStock.slice(0, 6).map((p) => (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-amber-200 dark:border-amber-900/40 shadow-sm flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate max-w-[160px]">
                    {p.nombre}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    Mínimo: {p.stock_minimo} {p.unidad_medida}
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 font-mono">
                    {p.stock} disp.
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
