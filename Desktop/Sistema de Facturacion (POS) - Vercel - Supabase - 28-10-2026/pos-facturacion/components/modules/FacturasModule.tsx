"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Receipt,
  Printer,
  Ban,
  Eye,
  Calendar,
  Filter,
  CheckCircle,
  XCircle,
  Download,
} from "lucide-react";
import { Factura, ConfiguracionNegocio } from "@/lib/types";
import { formatoCordobas, formatoFechaNica } from "@/lib/currency";
import { supabase } from "@/lib/supabase";

interface FacturasProps {
  facturas: Factura[];
  config: ConfiguracionNegocio;
  onAbrirTicket: (factura: Factura) => void;
  onFacturaAnulada: (facturaId: string) => void;
}

export default function FacturasModule({
  facturas,
  config,
  onAbrirTicket,
  onFacturaAnulada,
}: FacturasProps) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroMetodo, setFiltroMetodo] = useState<string>("todos");
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<Factura | null>(null);
  const [anulandoId, setAnulandoId] = useState<string | null>(null);

  const facturasFiltradas = useMemo(() => {
    return facturas.filter((f) => {
      const matchBusqueda =
        f.numero_factura.toString().includes(busqueda) ||
        (f.cliente?.nombre_completo || "").toLowerCase().includes(busqueda.toLowerCase());
      const matchMetodo =
        filtroMetodo === "todos" || f.metodo_pago === filtroMetodo;
      return matchBusqueda && matchMetodo;
    });
  }, [facturas, busqueda, filtroMetodo]);

  const anularFactura = async (factura: Factura) => {
    if (!confirm(`¿Estás seguro de anular la Factura #${factura.numero_factura}? Esta acción revertirá el inventario.`)) {
      return;
    }

    setAnulandoId(factura.id);
    try {
      const { error } = await supabase
        .from("facturas")
        .update({ estado: "anulada" })
        .eq("id", factura.id);

      if (error) throw error;
      onFacturaAnulada(factura.id);
    } catch (err: unknown) {
      alert("Error al anular factura: " + (err instanceof Error ? err.message : "Error"));
    } finally {
      setAnulandoId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 transition-colors">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por # de Factura o Cliente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={filtroMetodo}
            onChange={(e) => setFiltroMetodo(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos los Métodos de Pago</option>
            <option value="efectivo_cordobas">Efectivo C$</option>
            <option value="efectivo_dolares">Dólares USD</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="transferencia">Transferencia</option>
            <option value="al_credito">Al Crédito</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-bold">
              <tr>
                <th className="px-4 py-3.5"># Factura</th>
                <th className="px-4 py-3.5">Fecha / Hora</th>
                <th className="px-4 py-3.5">Cliente</th>
                <th className="px-4 py-3.5">Método de Pago</th>
                <th className="px-4 py-3.5 text-right">Subtotal</th>
                <th className="px-4 py-3.5 text-right">IVA (15%)</th>
                <th className="px-4 py-3.5 text-right">Total (C$)</th>
                <th className="px-4 py-3.5 text-center">Estado</th>
                <th className="px-4 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {facturasFiltradas.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                  <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                    #{String(f.numero_factura).padStart(6, "0")}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono">
                    {formatoFechaNica(f.created_at)}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                    {f.cliente?.nombre_completo || "Consumidor Final"}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 capitalize">
                    {f.metodo_pago.replace("_", " ")}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-600 dark:text-slate-400">
                    {formatoCordobas(f.subtotal)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-600 dark:text-slate-400">
                    {formatoCordobas(f.monto_iva)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                    {formatoCordobas(f.total)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        f.estado === "emitida"
                          ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                          : "bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300"
                      }`}
                    >
                      {f.estado === "emitida" ? "Emitida" : "Anulada"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onAbrirTicket(f)}
                        className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition cursor-pointer"
                        title="Reimprimir Comprobante"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      {f.estado === "emitida" && (
                        <button
                          onClick={() => anularFactura(f)}
                          disabled={anulandoId === f.id}
                          className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 transition disabled:opacity-50 cursor-pointer"
                          title="Anular Factura"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {facturasFiltradas.length === 0 && (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500">
            <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-500" />
            <p className="font-semibold text-xs">No se encontraron facturas</p>
          </div>
        )}
      </div>
    </div>
  );
}
