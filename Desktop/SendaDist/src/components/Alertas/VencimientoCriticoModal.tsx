import React, { useState, useMemo } from 'react';
import {
  Bell, Clock, Package, X, CheckCircle2,
  Sparkles, Search, ShoppingCart, Tag,
  ShieldAlert, DollarSign
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatMoneda } from '../../utils/formatters';

interface AlertasModalProps {
  onClose: () => void;
  onIrAInventario?: () => void;
  onIrAProductos?: () => void;
  onIrAPos?: () => void;
  onIrAPromociones?: () => void;
  tabInicial?: TabFiltro;
}

type TabFiltro = 'todas' | 'stock' | 'vencimiento' | 'critico';

export const VencimientoCriticoModal: React.FC<AlertasModalProps> = ({
  onClose,
  onIrAInventario,
  onIrAProductos,
  onIrAPos,
  onIrAPromociones,
  tabInicial = 'todas'
}) => {
  const {
    alertasStockBajo,
    alertasVencimientoCritico,
    alertasVencimientoProximo
  } = useApp();

  const [tabActiva, setTabActiva] = useState<TabFiltro>(tabInicial);
  const [busqueda, setBusqueda] = useState<string>('');

  // Notificaciones Web Push del Navegador
  const [permisoNotificacion, setPermisoNotificacion] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  const solicitarPermisoNotificaciones = async () => {
    if ('Notification' in window) {
      const p = await Notification.requestPermission();
      setPermisoNotificacion(p);
      if (p === 'granted') {
        const total = alertasVencimientoCritico.length + alertasStockBajo.length;
        new Notification('🔔 Alertas SendaDist Activadas', {
          body: `Monitoreo activo. Hay ${total} alertas de stock y vencimiento pendientes.`,
          icon: '/favicon.ico'
        });
      }
    }
  };

  // Cálculo de valor en riesgo (C$) por productos críticos
  const valorEnRiesgo = useMemo(() => {
    return alertasVencimientoCritico.reduce((acc, curr) => {
      const costo = Number(curr.lote.costoCompra) || 0;
      const cant = Number(curr.lote.cantidad) || 0;
      return acc + (costo * cant);
    }, 0);
  }, [alertasVencimientoCritico]);

  // Filtrado por búsqueda
  const stockBajoFiltrado = useMemo(() => {
    if (!busqueda.trim()) return alertasStockBajo;
    const q = busqueda.toLowerCase().trim();
    return alertasStockBajo.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.marca.toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q) ||
        (p.codigoBarras && p.codigoBarras.includes(q))
    );
  }, [alertasStockBajo, busqueda]);

  const vencimientoCriticoFiltrado = useMemo(() => {
    if (!busqueda.trim()) return alertasVencimientoCritico;
    const q = busqueda.toLowerCase().trim();
    return alertasVencimientoCritico.filter(
      (item) =>
        item.producto.nombre.toLowerCase().includes(q) ||
        item.producto.marca.toLowerCase().includes(q) ||
        (item.producto.categoria && item.producto.categoria.toLowerCase().includes(q)) ||
        item.lote.idLote.toLowerCase().includes(q)
    );
  }, [alertasVencimientoCritico, busqueda]);

  const vencimientoProximoFiltrado = useMemo(() => {
    if (!busqueda.trim()) return alertasVencimientoProximo;
    const q = busqueda.toLowerCase().trim();
    return alertasVencimientoProximo.filter(
      (item) =>
        item.producto.nombre.toLowerCase().includes(q) ||
        item.producto.marca.toLowerCase().includes(q) ||
        (item.producto.categoria && item.producto.categoria.toLowerCase().includes(q)) ||
        item.lote.idLote.toLowerCase().includes(q)
    );
  }, [alertasVencimientoProximo, busqueda]);

  const totalCriticos = alertasVencimientoCritico.length;
  const totalProximos = alertasVencimientoProximo.length;
  const totalStockBajo = alertasStockBajo.length;
  const totalGeneral = totalCriticos + totalProximos + totalStockBajo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-4 overflow-hidden animate-in fade-in duration-200">
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-100 my-auto max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* HEADER FIJO */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 shrink-0 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-gradient-to-tr from-rose-500 to-pink-600 text-white rounded-2xl shadow-md shadow-rose-500/20">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-wide">
                  Centro de Alertas & Vencimientos
                </h3>
                {totalGeneral > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    {totalGeneral} {totalGeneral === 1 ? 'Alerta' : 'Alertas'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Monitoreo en tiempo real de inventario crítico y rotación PEPS
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BARRAS DE KPI Y NOTIFICACIÓN */}
        <div className="px-6 pt-4 pb-2 shrink-0 space-y-3 bg-white dark:bg-slate-900">
          {/* Tarjetas de Métricas Rápidas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Stock Bajo */}
            <div
              onClick={() => setTabActiva('stock')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                tabActiva === 'stock'
                  ? 'bg-amber-500/10 border-amber-500/40 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-amber-400/40'
              }`}
            >
              <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
                <span className="text-[10px] uppercase font-black tracking-wider">Stock Bajo</span>
                <Package className="w-4 h-4" />
              </div>
              <p className="text-xl font-black text-slate-900 dark:text-white">
                {totalStockBajo}
              </p>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                {totalStockBajo === 1 ? 'Producto crítico' : 'Productos críticos'}
              </span>
            </div>

            {/* Vencimiento Crítico */}
            <div
              onClick={() => setTabActiva('critico')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                tabActiva === 'critico'
                  ? 'bg-rose-500/10 border-rose-500/40 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-rose-400/40'
              }`}
            >
              <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-1">
                <span className="text-[10px] uppercase font-black tracking-wider">Vence ≤ 5 Días</span>
                <Clock className="w-4 h-4" />
              </div>
              <p className="text-xl font-black text-rose-600 dark:text-rose-400">
                {totalCriticos}
              </p>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                {totalCriticos === 1 ? 'Lote de urgencia' : 'Lotes de urgencia'}
              </span>
            </div>

            {/* Vencimiento Próximo */}
            <div
              onClick={() => setTabActiva('vencimiento')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                tabActiva === 'vencimiento'
                  ? 'bg-blue-500/10 border-blue-500/40 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-blue-400/40'
              }`}
            >
              <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-1">
                <span className="text-[10px] uppercase font-black tracking-wider">Vence 6-45 Días</span>
                <Sparkles className="w-4 h-4" />
              </div>
              <p className="text-xl font-black text-slate-900 dark:text-white">
                {totalProximos}
              </p>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Lotes a monitorear
              </span>
            </div>

            {/* Valor en Riesgo */}
            <div className="p-3 rounded-2xl border bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
                <span className="text-[10px] uppercase font-black tracking-wider">Valor en Riesgo</span>
                <DollarSign className="w-4 h-4" />
              </div>
              <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                {formatMoneda(valorEnRiesgo)}
              </p>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Costo en lotes críticos
              </span>
            </div>
          </div>

          {/* Banner de Notificaciones Push Web */}
          {permisoNotificacion !== 'granted' && (
            <div className="p-3 bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-950/40 dark:to-blue-950/30 border border-sky-200 dark:border-sky-800/60 rounded-2xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2.5">
                <Bell className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <p className="text-sky-900 dark:text-sky-200 text-xs">
                  <strong className="font-bold">Notificaciones en segundo plano:</strong> Recibe alertas en tu dispositivo cuando un producto se esté agotando o venza.
                </p>
              </div>
              <button
                onClick={solicitarPermisoNotificaciones}
                className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl whitespace-nowrap transition cursor-pointer shadow-xs"
              >
                Activar Avisos
              </button>
            </div>
          )}

          {/* Barra de Filtros y Búsqueda */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
            {/* Pestañas */}
            <div className="flex items-center space-x-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto text-xs font-bold">
              <button
                onClick={() => setTabActiva('todas')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
                  tabActiva === 'todas'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Todas ({totalGeneral})
              </button>
              <button
                onClick={() => setTabActiva('stock')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
                  tabActiva === 'stock'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-amber-600'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Stock Bajo ({totalStockBajo})</span>
              </button>
              <button
                onClick={() => setTabActiva('critico')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
                  tabActiva === 'critico'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Vence ≤ 5 Días ({totalCriticos})</span>
              </button>
              <button
                onClick={() => setTabActiva('vencimiento')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
                  tabActiva === 'vencimiento'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-blue-600'
                }`}
              >
                <span>6 - 45 Días ({totalProximos})</span>
              </button>
            </div>

            {/* Input de Búsqueda */}
            <div className="relative w-full sm:w-64 min-w-[210px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por producto, lote, marca..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9.5 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition shadow-2xs"
                style={{ paddingLeft: '2.4rem' }}
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* LISTADO DE ALERTAS CON SCROLL INTERNO */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          
          {/* SECCIÓN 1: VENCIMIENTO CRÍTICO (≤ 5 DÍAS) */}
          {(tabActiva === 'todas' || tabActiva === 'critico') && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  Lotes con Vencimiento Crítico (Menos de 5 días o Vencidos):
                </h4>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {vencimientoCriticoFiltrado.length} {vencimientoCriticoFiltrado.length === 1 ? 'lote' : 'lotes'}
                </span>
              </div>

              {vencimientoCriticoFiltrado.length === 0 ? (
                tabActiva === 'critico' && (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {busqueda.trim()
                        ? `No se encontraron lotes críticos para "${busqueda}".`
                        : '¡Excelente! No hay lotes en estado de vencimiento crítico.'}
                    </p>
                  </div>
                )
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {vencimientoCriticoFiltrado.map(({ producto, lote, dias }) => {
                    const esVencido = dias <= 0;
                    const valorTotalLote = Number(lote.cantidad) * Number(lote.costoCompra);

                    return (
                      <div
                        key={lote.idLote}
                        className="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex flex-col justify-between gap-2.5 hover:shadow-md transition"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div>
                              <span className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight block">
                                {producto.nombre}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                {producto.marca} • {producto.categoria} • {producto.tamano}
                              </span>
                            </div>
                            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black tracking-wide uppercase whitespace-nowrap shadow-xs ${
                              esVencido
                                ? 'bg-rose-600 text-white animate-pulse'
                                : 'bg-rose-500 text-white'
                            }`}>
                              {esVencido ? '¡Vencido!' : `¡Vence en ${dias} ${dias === 1 ? 'día' : 'días'}!`}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs mt-2 bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/40">
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-bold block">Lote & Stock</span>
                              <strong className="text-slate-800 dark:text-slate-200 font-extrabold">
                                {lote.idLote} ({lote.cantidad} unds)
                              </strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-bold block">Fecha Vencimiento</span>
                              <strong className="text-rose-600 dark:text-rose-400 font-extrabold">
                                {lote.fechaVencimiento}
                              </strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-bold block">Costo Unitario</span>
                              <span className="text-slate-700 dark:text-slate-300 font-bold">
                                {formatMoneda(lote.costoCompra)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-bold block">Valor en Riesgo</span>
                              <span className="text-rose-600 dark:text-rose-400 font-extrabold">
                                {formatMoneda(valorTotalLote)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Botones de Acción */}
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-rose-100 dark:border-rose-900/30">
                          {onIrAPos && (
                            <button
                              onClick={onIrAPos}
                              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-xl flex items-center space-x-1 transition cursor-pointer shadow-xs"
                              title="Priorizar salida en POS con PEPS"
                            >
                              <ShoppingCart className="w-3 h-3" />
                              <span>Vender en POS</span>
                            </button>
                          )}
                          {onIrAPromociones && (
                            <button
                              onClick={onIrAPromociones}
                              className="px-2.5 py-1.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white text-[11px] font-bold rounded-xl flex items-center space-x-1 transition cursor-pointer"
                              title="Crear promoción o combo de liquidación"
                            >
                              <Tag className="w-3 h-3" />
                              <span>Crear Combo</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SECCIÓN 2: STOCK BAJO EN ALMACÉN */}
          {(tabActiva === 'todas' || tabActiva === 'stock') && (
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Package className="w-4 h-4" />
                  Bebidas con Stock Bajo o por Debajo del Mínimo:
                </h4>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {stockBajoFiltrado.length} {stockBajoFiltrado.length === 1 ? 'producto' : 'productos'}
                </span>
              </div>

              {stockBajoFiltrado.length === 0 ? (
                tabActiva === 'stock' && (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {busqueda.trim()
                        ? `No se encontraron productos con stock bajo para "${busqueda}".`
                        : '¡Inventario saludable! Todos los productos cuentan con stock superior al mínimo.'}
                    </p>
                  </div>
                )
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {stockBajoFiltrado.map((prod) => {
                    const deficit = Math.max(0, prod.stockMinimo - prod.stockTotal);
                    const porcentajeStock = Math.min(100, Math.round((prod.stockTotal / (prod.stockMinimo || 1)) * 100));

                    return (
                      <div
                        key={prod.id}
                        className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-2xl flex flex-col justify-between gap-2.5 hover:shadow-md transition"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div>
                              <span className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight block">
                                {prod.nombre}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                {prod.marca} • {prod.categoria} • {prod.tamano}
                              </span>
                            </div>
                            <span className="px-2.5 py-1 rounded-xl text-[10px] font-black tracking-wide uppercase bg-amber-500 text-white whitespace-nowrap shadow-xs">
                              ¡Stock Bajo!
                            </span>
                          </div>

                          {/* Barra de Nivel de Stock */}
                          <div className="mt-2.5 space-y-1">
                            <div className="flex justify-between text-[11px] font-bold">
                              <span className="text-slate-600 dark:text-slate-300">
                                Disponible: <strong className="text-rose-600 dark:text-rose-400">{prod.stockTotal} und</strong>
                              </span>
                              <span className="text-slate-500 dark:text-slate-400">
                                Mínimo requerido: <strong>{prod.stockMinimo} und</strong>
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  porcentajeStock <= 30
                                    ? 'bg-rose-500'
                                    : porcentajeStock <= 70
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.max(5, Math.min(100, porcentajeStock))}%` }}
                              />
                            </div>
                            {deficit > 0 && (
                              <p className="text-[10px] text-amber-700 dark:text-amber-400 font-extrabold pt-0.5">
                                ⚠️ Faltan {deficit} unidades para alcanzar el umbral seguro.
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Botón de Reabastecimiento */}
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-100 dark:border-amber-900/30">
                          {onIrAInventario && (
                            <button
                              onClick={onIrAInventario}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-xl flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
                            >
                              <Package className="w-3.5 h-3.5" />
                              <span>Registrar Entrada / Kardex</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SECCIÓN 3: VENCIMIENTO PRÓXIMO (6 - 45 DÍAS) */}
          {(tabActiva === 'todas' || tabActiva === 'vencimiento') && (
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Lotes con Vencimiento Próximo (6 a 45 días):
                </h4>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {vencimientoProximoFiltrado.length} {vencimientoProximoFiltrado.length === 1 ? 'lote' : 'lotes'}
                </span>
              </div>

              {vencimientoProximoFiltrado.length === 0 ? (
                tabActiva === 'vencimiento' && (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {busqueda.trim()
                        ? `No se encontraron lotes próximos a vencer para "${busqueda}".`
                        : 'No hay lotes con vencimiento previsto para este periodo.'}
                    </p>
                  </div>
                )
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {vencimientoProximoFiltrado.map(({ producto, lote, dias }) => (
                    <div
                      key={lote.idLote}
                      className="p-3.5 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-2xl flex flex-col justify-between gap-2.5 hover:shadow-md transition"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div>
                            <span className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight block">
                              {producto.nombre}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {producto.marca} • {producto.categoria} • {producto.tamano}
                            </span>
                          </div>
                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-black tracking-wide uppercase bg-blue-600 text-white whitespace-nowrap shadow-xs">
                            Vence en {dias} días
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs mt-2 bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-xl border border-blue-100 dark:border-blue-900/40">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Lote & Stock</span>
                            <strong className="text-slate-800 dark:text-slate-200 font-extrabold">
                              {lote.idLote} ({lote.cantidad} unds)
                            </strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Fecha Vencimiento</span>
                            <strong className="text-blue-600 dark:text-blue-400 font-extrabold">
                              {lote.fechaVencimiento}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Botón para POS */}
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-blue-100 dark:border-blue-900/30">
                        {onIrAPos && (
                          <button
                            onClick={onIrAPos}
                            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-xl flex items-center space-x-1 transition cursor-pointer shadow-xs"
                          >
                            <ShoppingCart className="w-3 h-3" />
                            <span>Vender en POS</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ESTADO VACÍO CUANDO NO HAY ALERTAS */}
          {totalGeneral === 0 && (
            <div className="py-12 px-6 text-center space-y-3 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-200 dark:border-slate-800">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                ¡Todo el inventario está en orden!
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                No se registran productos con stock por debajo del mínimo ni lotes próximos a vencer dentro de los próximos 30 días.
              </p>
            </div>
          )}

          {/* ESTADO VACÍO POR BÚSQUEDA SIN RESULTADOS EN TAB 'TODAS' */}
          {busqueda.trim() && tabActiva === 'todas' && vencimientoCriticoFiltrado.length === 0 && stockBajoFiltrado.length === 0 && vencimientoProximoFiltrado.length === 0 && (
            <div className="py-10 px-6 text-center space-y-2 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-200 dark:border-slate-800">
              <Search className="w-8 h-8 text-slate-400 mx-auto opacity-50 mb-1" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                No se encontraron alertas o productos que coincidan con "{busqueda}".
              </p>
              <button
                onClick={() => setBusqueda('')}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                Limpiar búsqueda
              </button>
            </div>
          )}
        </div>

        {/* PIE DE VENTANA FIJO */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 shrink-0 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
            <span>Sistema PEPS sincronizado con Firebase</span>
          </div>

          <div className="flex items-center space-x-2.5">
            {onIrAInventario && (
              <button
                onClick={onIrAInventario}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                Ver Inventario Completo
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-black transition cursor-pointer shadow-xs"
            >
              Entendido
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};