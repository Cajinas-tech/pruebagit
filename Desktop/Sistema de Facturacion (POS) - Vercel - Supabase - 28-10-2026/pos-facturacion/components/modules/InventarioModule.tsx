"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Boxes,
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  AlertTriangle,
  History,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
} from "lucide-react";
import { Producto, ProductoLote, KardexMovimiento } from "@/lib/types";
import { formatoCordobas, formatoFechaNica } from "@/lib/currency";
import { supabase } from "@/lib/supabase";

interface InventarioProps {
  productos: Producto[];
  onActualizarProductos: () => void;
}

export default function InventarioModule({
  productos,
  onActualizarProductos,
}: InventarioProps) {
  const [subPestana, setSubPestana] = useState<"lotes" | "kardex" | "ajuste">("lotes");
  const [lotes, setLotes] = useState<ProductoLote[]>([]);
  const [kardex, setKardex] = useState<KardexMovimiento[]>([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  // Modal Entrada de Lote (Compra PEPS)
  const [modalEntradaAbierto, setModalEntradaAbierto] = useState(false);
  const [productoSeleccionadoId, setProductoSeleccionadoId] = useState("");
  const [numeroLote, setNumeroLote] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [cantidadEntrada, setCantidadEntrada] = useState("24");
  const [costoUnitario, setCostoUnitario] = useState("20");
  const [guardandoEntrada, setGuardandoEntrada] = useState(false);

  // Modal Ajuste de Stock
  const [tipoAjuste, setTipoAjuste] = useState<"AJUSTE_POSITIVO" | "AJUSTE_NEGATIVO">("AJUSTE_NEGATIVO");
  const [cantidadAjuste, setCantidadAjuste] = useState("1");
  const [motivoAjuste, setMotivoAjuste] = useState("Merma / Producto dañado");

  const cargarDatos = async () => {
    setCargando(true);
    try {
      // 1. Cargar Lotes
      const { data: lotesData } = await supabase
        .from("producto_lotes")
        .select("*")
        .order("fecha_ingreso", { ascending: false });

      if (lotesData) setLotes(lotesData);

      // 2. Cargar Kardex
      const { data: kardexData } = await supabase
        .from("kardex_movimientos")
        .select("*, producto:productos(nombre, codigo_barras)")
        .order("created_at", { ascending: false })
        .limit(100);

      if (kardexData) setKardex(kardexData);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const abrirNuevaEntrada = () => {
    const prod = productos[0];
    setProductoSeleccionadoId(prod?.id || "");
    setNumeroLote(`L-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    const dateVenc = new Date();
    dateVenc.setMonth(dateVenc.getMonth() + 6);
    setFechaVencimiento(dateVenc.toISOString().split("T")[0]);
    setCantidadEntrada("24");
    setCostoUnitario(prod ? prod.costo_promedio.toString() : "20");
    setModalEntradaAbierto(true);
  };

  const registrarEntradaPEPS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productoSeleccionadoId) return;
    setGuardandoEntrada(true);

    try {
      const cant = parseInt(cantidadEntrada) || 0;
      const costo = parseFloat(costoUnitario) || 0;
      const prod = productos.find((p) => p.id === productoSeleccionadoId);
      if (!prod) return;

      // 1. Insertar Lote
      const { data: nuevoLote, error: errLote } = await supabase
        .from("producto_lotes")
        .insert({
          producto_id: productoSeleccionadoId,
          numero_lote: numeroLote.trim(),
          fecha_vencimiento: fechaVencimiento || null,
          costo_unitario: costo,
          cantidad_inicial: cant,
          cantidad_disponible: cant,
        })
        .select()
        .single();

      if (errLote) throw errLote;

      // 2. Incrementar stock general del producto
      const nuevoStock = prod.stock + cant;
      await supabase
        .from("productos")
        .update({ stock: nuevoStock, costo_promedio: costo })
        .eq("id", productoSeleccionadoId);

      // 3. Registrar en Kardex
      await supabase.from("kardex_movimientos").insert({
        producto_id: productoSeleccionadoId,
        lote_id: nuevoLote.id,
        tipo_movimiento: "ENTRADA_COMPRA",
        cantidad: cant,
        costo_unitario: costo,
        saldo_cantidad: nuevoStock,
        referencia_documento: `Compra Lote #${numeroLote.trim()}`,
      });

      alert("Entrada de Lote PEPS registrada exitosamente.");
      setModalEntradaAbierto(false);
      cargarDatos();
      onActualizarProductos();
    } catch (err: unknown) {
      alert("Error: " + (err instanceof Error ? err.message : "Error"));
    } finally {
      setGuardandoEntrada(false);
    }
  };

  const registrarAjuste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productoSeleccionadoId) return;

    try {
      const cant = parseInt(cantidadAjuste) || 0;
      const prod = productos.find((p) => p.id === productoSeleccionadoId);
      if (!prod) return;

      const nuevoStock =
        tipoAjuste === "AJUSTE_POSITIVO" ? prod.stock + cant : Math.max(0, prod.stock - cant);

      await supabase
        .from("productos")
        .update({ stock: nuevoStock })
        .eq("id", productoSeleccionadoId);

      await supabase.from("kardex_movimientos").insert({
        producto_id: productoSeleccionadoId,
        tipo_movimiento: tipoAjuste,
        cantidad: cant,
        costo_unitario: prod.costo_promedio || 0,
        saldo_cantidad: nuevoStock,
        referencia_documento: motivoAjuste,
      });

      alert("Ajuste registrado en Kardex.");
      cargarDatos();
      onActualizarProductos();
    } catch (err: unknown) {
      alert("Error: " + (err instanceof Error ? err.message : "Error"));
    }
  };

  const obtenerNombreProducto = (prodId: string) => {
    const prod = productos.find((p) => p.id === prodId);
    return prod ? prod.nombre : "Producto";
  };

  return (
    <div className="space-y-5">
      {/* Top Banner and Tabs */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setSubPestana("lotes")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              subPestana === "lotes"
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Layers className="w-4 h-4" />
            Lotes & Vencimiento (PEPS)
          </button>
          <button
            onClick={() => setSubPestana("kardex")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              subPestana === "kardex"
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <History className="w-4 h-4" />
            Kardex de Movimientos
          </button>
          <button
            onClick={() => setSubPestana("ajuste")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              subPestana === "ajuste"
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <ArrowDownCircle className="w-4 h-4" />
            Ajuste de Stock
          </button>
        </div>

        {subPestana === "lotes" && (
          <button
            onClick={abrirNuevaEntrada}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Entrada de Compra (Lote PEPS)
          </button>
        )}
      </div>

      {/* SUB-PESTAÑA 1: LOTES PEPS */}
      {subPestana === "lotes" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-colors">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider">
              Control de Lotes y Descuento Automático PEPS (Primeras Entradas, Primeras Salidas)
            </h4>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {lotes.length} lotes registrados
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase">
                <tr>
                  <th className="px-4 py-3"># Lote</th>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Fecha Ingreso</th>
                  <th className="px-4 py-3">Fecha Vencimiento</th>
                  <th className="px-4 py-3 text-right">Costo Unitario (C$)</th>
                  <th className="px-4 py-3 text-center">Inicial</th>
                  <th className="px-4 py-3 text-center">Disponible</th>
                  <th className="px-4 py-3 text-center">Estado PEPS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {lotes.map((lote) => {
                  const agotado = lote.cantidad_disponible <= 0;
                  const fechaVenc = lote.fecha_vencimiento ? new Date(lote.fecha_vencimiento) : null;
                  const diasParaVencer = fechaVenc
                    ? Math.ceil((fechaVenc.getTime() - new Date().getTime()) / (1000 * 3600 * 24))
                    : 999;

                  return (
                    <tr key={lote.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                      <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {lote.numero_lote}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100">
                        {obtenerNombreProducto(lote.producto_id)}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">
                        {formatoFechaNica(lote.fecha_ingreso)}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                        {lote.fecha_vencimiento || "Sin Caducidad"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatoCordobas(lote.costo_unitario)}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-slate-500 dark:text-slate-400">
                        {lote.cantidad_inicial}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold">
                        <span
                          className={`px-2 py-0.5 rounded-full ${
                            agotado
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                              : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                          }`}
                        >
                          {lote.cantidad_disponible}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {agotado ? (
                          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                            Consumido
                          </span>
                        ) : diasParaVencer <= 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400">
                            Vencido
                          </span>
                        ) : diasParaVencer <= 30 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                            Vence en {diasParaVencer}d
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                            Activo PEPS
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {lotes.length === 0 && (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
              Aún no hay lotes registrados. Presiona "Entrada de Compra (Lote PEPS)" para comenzar.
            </div>
          )}
        </div>
      )}

      {/* SUB-PESTAÑA 2: KARDEX DE MOVIMIENTOS */}
      {subPestana === "kardex" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-colors">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider">
              Kardex de Movimientos (Historial de Entradas, Salidas y Saldos en C$)
            </h4>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Tipo Movimiento</th>
                  <th className="px-4 py-3">Referencia</th>
                  <th className="px-4 py-3 text-center">Cantidad</th>
                  <th className="px-4 py-3 text-right">Costo C$</th>
                  <th className="px-4 py-3 text-center">Saldo Existencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {kardex.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                    <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">
                      {formatoFechaNica(k.created_at)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100">
                      {k.producto?.nombre || obtenerNombreProducto(k.producto_id)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          k.tipo_movimiento.includes("ENTRADA") || k.tipo_movimiento.includes("POSITIVO")
                            ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                            : "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300"
                        }`}
                      >
                        {k.tipo_movimiento}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono">
                      {k.referencia_documento || "-"}
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                      {k.tipo_movimiento.includes("SALIDA") ? `-${k.cantidad}` : `+${k.cantidad}`}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600 dark:text-slate-400">
                      {formatoCordobas(k.costo_unitario)}
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                      {k.saldo_cantidad}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-PESTAÑA 3: AJUSTE MANUAL */}
      {subPestana === "ajuste" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm max-w-lg transition-colors">
          <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-4">
            Registrar Ajuste Manual de Inventario
          </h4>
          <form onSubmit={registrarAjuste} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Producto</label>
              <select
                value={productoSeleccionadoId}
                onChange={(e) => setProductoSeleccionadoId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">Selecciona un producto...</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} (Stock actual: {p.stock})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Tipo de Ajuste</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTipoAjuste("AJUSTE_NEGATIVO")}
                  className={`py-2 rounded-xl font-bold cursor-pointer ${
                    tipoAjuste === "AJUSTE_NEGATIVO"
                      ? "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  Disminución (Merma/Dañado)
                </button>
                <button
                  type="button"
                  onClick={() => setTipoAjuste("AJUSTE_POSITIVO")}
                  className={`py-2 rounded-xl font-bold cursor-pointer ${
                    tipoAjuste === "AJUSTE_POSITIVO"
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  Aumento (Sobrante físico)
                </button>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Cantidad a Ajustar</label>
              <input
                type="number"
                min="1"
                required
                value={cantidadAjuste}
                onChange={(e) => setCantidadAjuste(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Motivo / Justificación</label>
              <input
                type="text"
                required
                value={motivoAjuste}
                onChange={(e) => setMotivoAjuste(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer"
            >
              Aplicar Ajuste en Kardex
            </button>
          </form>
        </div>
      )}

      {/* MODAL ENTRADA DE LOTE PEPS */}
      {modalEntradaAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={registrarEntradaPEPS}
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-800"
          >
            <div className="p-5 bg-slate-900 text-white">
              <h3 className="font-bold text-base">Registrar Entrada de Compra (Lote PEPS)</h3>
              <p className="text-xs text-slate-400">
                Alimentará el orden FIFO para las salidas de venta en POS
              </p>
            </div>

            <div className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Producto</label>
                <select
                  required
                  value={productoSeleccionadoId}
                  onChange={(e) => setProductoSeleccionadoId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} (Stock actual: {p.stock})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1"># de Lote</label>
                  <input
                    type="text"
                    required
                    value={numeroLote}
                    onChange={(e) => setNumeroLote(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Vencimiento</label>
                  <input
                    type="date"
                    value={fechaVencimiento}
                    onChange={(e) => setFechaVencimiento(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Cantidad Recibida
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={cantidadEntrada}
                    onChange={(e) => setCantidadEntrada(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Costo Unitario (C$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={costoUnitario}
                    onChange={(e) => setCostoUnitario(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-blue-600 dark:text-blue-400"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalEntradaAbierto(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardandoEntrada}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {guardandoEntrada ? "Procesando PEPS..." : "Guardar Entrada"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
