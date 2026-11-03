"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Barcode,
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  DollarSign,
  User,
  CheckCircle,
  AlertCircle,
  Printer,
  X,
  ArrowRight,
  Receipt,
  RotateCcw,
} from "lucide-react";
import {
  Producto,
  Cliente,
  ItemCarrito,
  SesionCaja,
  Factura,
  ConfiguracionNegocio,
} from "@/lib/types";
import {
  formatoCordobas,
  formatoDolares,
  convertirUSDaNIO,
  convertirNIOaUSD,
} from "@/lib/currency";
import { supabase } from "@/lib/supabase";

interface PosProps {
  productos: Producto[];
  clientes: Cliente[];
  sesionCaja: SesionCaja | null;
  config: ConfiguracionNegocio;
  carrito: ItemCarrito[];
  setCarrito: React.Dispatch<React.SetStateAction<ItemCarrito[]>>;
  onVentaCompletada: (factura: Factura) => void;
  onAbrirTicket: (factura: Factura) => void;
  onIrACaja: () => void;
}

export default function PosModule({
  productos,
  clientes,
  sesionCaja,
  config,
  carrito,
  setCarrito,
  onVentaCompletada,
  onAbrirTicket,
  onIrACaja,
}: PosProps) {
  const [codigoInput, setCodigoInput] = useState("");
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState<string>("");
  const [modalCobroAbierto, setModalCobroAbierto] = useState(false);
  const [metodoPago, setMetodoPago] = useState<
    "efectivo_cordobas" | "efectivo_dolares" | "tarjeta" | "transferencia" | "al_credito"
  >("efectivo_cordobas");
  const [recibidoCordobas, setRecibidoCordobas] = useState<string>("");
  const [recibidoDolares, setRecibidoDolares] = useState<string>("");
  const [procesando, setProcesando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Focus barcode input on mount and keep it focused
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Keyboard shortcut listener (F2: Cobrar, Esc: cerrar modal)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        if (carrito.length > 0) {
          abrirModalCobro();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [carrito]);

  // Cliente actual
  const clienteActual = useMemo(() => {
    return clientes.find((c) => c.id === clienteSeleccionadoId) || clientes[0] || null;
  }, [clientes, clienteSeleccionadoId]);

  // Cálculos de Totales e IVA 15% (Nicaragua LCT)
  const totales = useMemo(() => {
    let subtotalGravado = 0;
    let subtotalExento = 0;

    carrito.forEach((item) => {
      if (item.aplica_iva) {
        subtotalGravado += item.subtotal;
      } else {
        subtotalExento += item.subtotal;
      }
    });

    const subtotal = subtotalGravado + subtotalExento;
    const montoIva = Number((subtotalGravado * (config.iva_porcentaje / 100)).toFixed(2));
    const total = Number((subtotal + montoIva).toFixed(2));
    const totalUSD = convertirNIOaUSD(total, config.tasa_cambio_oficial);

    return {
      subtotalGravado,
      subtotalExento,
      subtotal,
      montoIva,
      total,
      totalUSD,
    };
  }, [carrito, config]);

  // Cálculo de Vuelto / Cambio en Córdobas
  const calculoCambio = useMemo(() => {
    const recC = parseFloat(recibidoCordobas) || 0;
    const recUSD = parseFloat(recibidoDolares) || 0;
    const recUSDEnNIO = convertirUSDaNIO(recUSD, config.tasa_cambio_oficial);
    const totalRecibidoNIO = recC + recUSDEnNIO;

    const cambioNIO = totalRecibidoNIO - totales.total;
    const faltaNIO = totales.total - totalRecibidoNIO;

    return {
      totalRecibidoNIO,
      cambioNIO: Math.max(0, Number(cambioNIO.toFixed(2))),
      faltaNIO: Math.max(0, Number(faltaNIO.toFixed(2))),
      esSuficiente: totalRecibidoNIO >= totales.total,
    };
  }, [recibidoCordobas, recibidoDolares, totales.total, config.tasa_cambio_oficial]);

  // Manejar escaneo o ingreso de código
  const handleCodigoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoInput.trim()) return;

    const query = codigoInput.trim().toLowerCase();
    const prod = productos.find(
      (p) =>
        p.codigo_barras.toLowerCase() === query ||
        p.nombre.toLowerCase().includes(query)
    );

    if (prod) {
      agregarProducto(prod);
      setCodigoInput("");
    } else {
      setErrorMsg(`Producto no encontrado para: ${codigoInput}`);
      setTimeout(() => setErrorMsg(null), 3500);
    }
  };

  const agregarProducto = (prod: Producto) => {
    if (prod.stock <= 0) {
      setErrorMsg(`"${prod.nombre}" no tiene stock disponible.`);
      setTimeout(() => setErrorMsg(null), 3500);
      return;
    }

    setCarrito((prev) => {
      const index = prev.findIndex((item) => item.producto.id === prod.id);
      if (index >= 0) {
        const itemActual = prev[index];
        if (itemActual.cantidad + 1 > prod.stock) {
          setErrorMsg(`Stock máximo alcanzado para "${prod.nombre}" (${prod.stock}).`);
          setTimeout(() => setErrorMsg(null), 3000);
          return prev;
        }
        const nuevaCantidad = itemActual.cantidad + 1;
        const copia = [...prev];
        copia[index] = {
          ...itemActual,
          cantidad: nuevaCantidad,
          subtotal: Number((nuevaCantidad * itemActual.precio_unitario).toFixed(2)),
        };
        return copia;
      } else {
        return [
          ...prev,
          {
            producto: prod,
            cantidad: 1,
            precio_unitario: prod.precio_venta,
            costo_unitario: prod.costo_promedio || 0,
            aplica_iva: prod.aplica_iva,
            subtotal: prod.precio_venta,
          },
        ];
      }
    });
  };

  const cambiarCantidad = (productoId: string, delta: number) => {
    setCarrito((prev) => {
      return prev
        .map((item) => {
          if (item.producto.id === productoId) {
            const nuevaCant = item.cantidad + delta;
            if (nuevaCant <= 0) return null;
            if (nuevaCant > item.producto.stock) {
              setErrorMsg(`Solo hay ${item.producto.stock} unidades en existencia.`);
              setTimeout(() => setErrorMsg(null), 3000);
              return item;
            }
            return {
              ...item,
              cantidad: nuevaCant,
              subtotal: Number((nuevaCant * item.precio_unitario).toFixed(2)),
            };
          }
          return item;
        })
        .filter(Boolean) as ItemCarrito[];
    });
  };

  const eliminarItem = (productoId: string) => {
    setCarrito((prev) => prev.filter((i) => i.producto.id !== productoId));
  };

  const abrirModalCobro = () => {
    if (carrito.length === 0) return;
    setRecibidoCordobas(totales.total.toString());
    setRecibidoDolares("");
    setModalCobroAbierto(true);
  };

  // Procesar Transacción Final con Supabase RPC procesar_venta_peps
  const procesarVenta = async () => {
    if (carrito.length === 0) return;
    setProcesando(true);
    setErrorMsg(null);

    try {
      const itemsPayload = carrito.map((item) => ({
        producto_id: item.producto.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        costo_unitario: item.costo_unitario,
      }));

      const recC = parseFloat(recibidoCordobas) || 0;
      const recUSD = parseFloat(recibidoDolares) || 0;
      const condicion = metodoPago === "al_credito" ? "credito" : "contado";

      // Llamada RPC PEPS en Supabase
      const { data, error } = await supabase.rpc("procesar_venta_peps", {
        p_sesion_caja_id: sesionCaja?.id || null,
        p_cliente_id: clienteActual?.id || null,
        p_condicion_venta: condicion,
        p_metodo_pago: metodoPago,
        p_subtotal: totales.subtotal,
        p_monto_iva: totales.montoIva,
        p_total: totales.total,
        p_recibido_c: recC,
        p_recibido_usd: recUSD,
        p_cambio_c: calculoCambio.cambioNIO,
        p_tasa_bcn: config.tasa_cambio_oficial,
        p_items: itemsPayload,
      });

      if (error) {
        throw new Error(error.message);
      }

      const nuevaFactura: Factura = {
        id: data?.factura_id || "fac-" + Date.now(),
        numero_factura: data?.numero_factura || Math.floor(Math.random() * 90000) + 10000,
        sesion_caja_id: sesionCaja?.id,
        cliente_id: clienteActual?.id,
        cliente: clienteActual || undefined,
        condicion_venta: condicion,
        metodo_pago: metodoPago,
        subtotal: totales.subtotal,
        monto_iva: totales.montoIva,
        total: totales.total,
        monto_recibido_cordobas: recC,
        monto_recibido_dolares: recUSD,
        cambio_devuelto_cordobas: calculoCambio.cambioNIO,
        tasa_cambio_aplicada: config.tasa_cambio_oficial,
        estado: "emitida",
        created_at: new Date().toISOString(),
        detalles: carrito.map((i, idx) => ({
          id: `det-${idx}`,
          factura_id: data?.factura_id || "",
          producto_id: i.producto.id,
          producto: i.producto,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
          costo_unitario: i.costo_unitario,
          subtotal: i.subtotal,
        })),
      };

      onVentaCompletada(nuevaFactura);
      setCarrito([]);
      setModalCobroAbierto(false);
      onAbrirTicket(nuevaFactura);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al registrar venta";
      setErrorMsg(msg);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-125px)]">
      {/* LEFT COLUMN (8 cols): Barcode input + Products quick selector */}
      <div className="lg:col-span-7 flex flex-col space-y-4">
        {/* Scanner Barcode Form */}
        <form
          onSubmit={handleCodigoSubmit}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 transition-colors"
        >
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
            <Barcode className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Pistola Escáner / Búsqueda Rápida
            </label>
            <input
              ref={barcodeInputRef}
              type="text"
              placeholder="Escanea el código de barras o escribe el nombre..."
              value={codigoInput}
              onChange={(e) => setCodigoInput(e.target.value)}
              className="w-full text-base font-semibold text-slate-900 dark:text-white bg-transparent focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-normal"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow transition cursor-pointer"
          >
            Agregar
          </button>
        </form>

        {/* Error Notification Alert */}
        {errorMsg && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Fast Touch Products Grid for Cashiers */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1 flex flex-col overflow-hidden transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              Artículos Frecuentes (Punto de Venta)
            </h3>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Click para añadir de inmediato
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto pt-3 flex-1 custom-scrollbar">
            {productos.map((prod) => (
              <button
                key={prod.id}
                onClick={() => agregarProducto(prod)}
                disabled={prod.stock <= 0}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-850 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/30 text-left transition flex items-center gap-2.5 group active:scale-95 disabled:opacity-40 disabled:hover:border-slate-200 cursor-pointer"
              >
                {prod.imagen_url ? (
                  <img
                    src={prod.imagen_url}
                    alt={prod.nombre}
                    className="w-10 h-10 object-cover rounded-lg flex-shrink-0 border border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 flex-shrink-0">
                    <Barcode className="w-4 h-4" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {prod.nombre}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    {prod.stock} disp.
                  </div>
                  <div className="font-mono font-extrabold text-xs text-slate-900 dark:text-white">
                    {formatoCordobas(prod.precio_venta)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN (5 cols): Live Cart, Client Selection & Totals */}
      <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden transition-colors">
        {/* Cart Header & Client Selector */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100 text-sm">
              <ShoppingCart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Orden de Venta</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                ({carrito.reduce((a, b) => a + b.cantidad, 0)} items)
              </span>
            </div>
            {carrito.length > 0 && (
              <button
                onClick={() => setCarrito([])}
                className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1 font-medium cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Vaciar
              </button>
            )}
          </div>

          {/* Client Selection */}
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
            <select
              value={clienteSeleccionadoId}
              onChange={(e) => setClienteSeleccionadoId(e.target.value)}
              className="w-full text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre_completo} ({c.numero_identificacion})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-slate-100 dark:divide-slate-800 custom-scrollbar">
          {carrito.map((item) => (
            <div
              key={item.producto.id}
              className="pt-2 first:pt-0 flex items-center justify-between text-xs"
            >
              <div className="flex-1 pr-2 min-w-0">
                <div className="font-bold text-slate-800 dark:text-slate-100 truncate">
                  {item.producto.nombre}
                </div>
                <div className="text-slate-400 dark:text-slate-500 font-mono text-[11px] flex items-center gap-2">
                  <span>{formatoCordobas(item.precio_unitario)} c/u</span>
                  {item.aplica_iva ? (
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                      +15% IVA
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      Exento
                    </span>
                  )}
                </div>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => cambiarCantidad(item.producto.id, -1)}
                  className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-8 text-center font-bold font-mono text-sm text-slate-900 dark:text-white">
                  {item.cantidad}
                </span>
                <button
                  onClick={() => cambiarCantidad(item.producto.id, 1)}
                  className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <div className="w-20 text-right font-mono font-bold text-slate-900 dark:text-white text-sm">
                  {formatoCordobas(item.subtotal)}
                </div>
                <button
                  onClick={() => eliminarItem(item.producto.id)}
                  className="p-1 text-slate-400 hover:text-red-500 transition ml-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {carrito.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 py-12">
              <ShoppingCart className="w-12 h-12 opacity-30 mb-2" />
              <p className="font-bold text-sm text-slate-600 dark:text-slate-300">Carrito vacío</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Escanea un producto o selecciónalo de la lista izquierda.
              </p>
            </div>
          )}
        </div>

        {/* Totals & Cobrar Button Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
          <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex justify-between">
              <span>Subtotal Gravado (15%):</span>
              <span className="font-mono text-slate-900 dark:text-slate-200">{formatoCordobas(totales.subtotalGravado)}</span>
            </div>
            {totales.subtotalExento > 0 && (
              <div className="flex justify-between">
                <span>Subtotal Exento (0%):</span>
                <span className="font-mono text-slate-900 dark:text-slate-200">{formatoCordobas(totales.subtotalExento)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>IVA ({config.iva_porcentaje}%):</span>
              <span className="font-mono text-slate-900 dark:text-slate-200">{formatoCordobas(totales.montoIva)}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-end justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Total a Pagar (C$)
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono leading-none">
                {formatoCordobas(totales.total)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                ≈ ${totales.totalUSD.toFixed(2)} USD (Tasa {Number(config.tasa_cambio_oficial).toFixed(2)})
              </div>
            </div>

            <button
              onClick={abrirModalCobro}
              disabled={carrito.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 text-base active:scale-95 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>Cobrar (F2)</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE COBRO PROFESIONAL (NICARAGUA) */}
      {modalCobroAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Procesar Cobro POS</h3>
                <p className="text-xs text-slate-400">
                  Total: {formatoCordobas(totales.total)} (o ${totales.totalUSD.toFixed(2)} USD)
                </p>
              </div>
              <button
                onClick={() => setModalCobroAbierto(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Payment Methods Tabs */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                  Método de Pago
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "efectivo_cordobas", label: "Efectivo C$", sub: "Córdobas" },
                    { id: "efectivo_dolares", label: "Dólares USD", sub: `Tasa: ${config.tasa_cambio_oficial}` },
                    { id: "tarjeta", label: "Tarjeta", sub: "BAC/Banpro/POS" },
                    { id: "transferencia", label: "Transferencia", sub: "Bancaria" },
                    { id: "al_credito", label: "Al Crédito", sub: "15/30 días" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMetodoPago(m.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        metodoPago === m.id
                          ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 font-bold shadow-sm"
                          : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <div className="text-xs font-bold">{m.label}</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">{m.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash Inputs for Cordobas & USD */}
              {(metodoPago === "efectivo_cordobas" || metodoPago === "efectivo_dolares") && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">
                      Monto Recibido (C$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={recibidoCordobas}
                      onChange={(e) => setRecibidoCordobas(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-lg font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">
                      Monto Recibido ($ USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={recibidoDolares}
                      onChange={(e) => setRecibidoDolares(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-lg font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Change / Vuelto Display in Cordobas */}
              {(metodoPago === "efectivo_cordobas" || metodoPago === "efectivo_dolares") && (
                <div
                  className={`p-4 rounded-2xl border flex items-center justify-between ${
                    calculoCambio.esSuficiente
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200"
                      : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/60 text-red-900 dark:text-red-200"
                  }`}
                >
                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-wider">
                      {calculoCambio.esSuficiente ? "Vuelto / Cambio a Entregar:" : "Monto Faltante:"}
                    </div>
                    <div className="text-2xl font-black font-mono">
                      {calculoCambio.esSuficiente
                        ? formatoCordobas(calculoCambio.cambioNIO)
                        : formatoCordobas(calculoCambio.faltaNIO)}
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-semibold">
                      Total Pagado: {formatoCordobas(calculoCambio.totalRecibidoNIO)}
                    </div>
                  </div>
                </div>
              )}

              {/* Warning if credit sale */}
              {metodoPago === "al_credito" && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Venta al Crédito para: {clienteActual?.nombre_completo}
                  </div>
                  <p>
                    Límite disponible: {formatoCordobas((clienteActual?.limite_credito || 0) - (clienteActual?.saldo_deudor || 0))}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalCobroAbierto(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={procesarVenta}
                disabled={
                  procesando ||
                  ((metodoPago === "efectivo_cordobas" || metodoPago === "efectivo_dolares") &&
                    !calculoCambio.esSuficiente)
                }
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 text-sm disabled:cursor-not-allowed cursor-pointer"
              >
                {procesando ? (
                  <span>Registrando con PEPS...</span>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Confirmar e Imprimir Factura</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
