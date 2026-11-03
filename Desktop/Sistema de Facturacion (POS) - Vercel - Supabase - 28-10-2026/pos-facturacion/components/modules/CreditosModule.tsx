"use client";

import React, { useState, useMemo } from "react";
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  Receipt,
  Clock,
  Printer,
  DollarSign,
} from "lucide-react";
import { CreditoCuenta, AbonoCredito, Cliente, ConfiguracionNegocio } from "@/lib/types";
import { formatoCordobas, formatoFechaNica } from "@/lib/currency";
import { supabase } from "@/lib/supabase";

interface CreditosProps {
  creditos: CreditoCuenta[];
  clientes: Cliente[];
  config: ConfiguracionNegocio;
  onActualizarCreditos: () => void;
}

export default function CreditosModule({
  creditos,
  clientes,
  config,
  onActualizarCreditos,
}: CreditosProps) {
  const [busqueda, setBusqueda] = useState("");
  const [modalAbonoAbierto, setModalAbonoAbierto] = useState(false);
  const [creditoSeleccionado, setCreditoSeleccionado] = useState<CreditoCuenta | null>(null);
  const [montoAbono, setMontoAbono] = useState("");
  const [metodoPago, setMetodoPago] = useState("efectivo_cordobas");
  const [notasAbono, setNotasAbono] = useState("");
  const [guardando, setGuardando] = useState(false);

  const creditosFiltrados = useMemo(() => {
    return creditos.filter((c) => {
      const clienteNombre = c.cliente?.nombre_completo || "";
      return (
        clienteNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.id.includes(busqueda)
      );
    });
  }, [creditos, busqueda]);

  const totalPorCobrar = useMemo(() => {
    return creditos.reduce(
      (acc, c) => acc + (c.estado !== "pagado" ? c.saldo_pendiente : 0),
      0
    );
  }, [creditos]);

  const abrirAbono = (c: CreditoCuenta) => {
    setCreditoSeleccionado(c);
    setMontoAbono(c.saldo_pendiente.toString());
    setMetodoPago("efectivo_cordobas");
    setNotasAbono("");
    setModalAbonoAbierto(true);
  };

  const registrarAbono = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditoSeleccionado) return;
    const monto = parseFloat(montoAbono) || 0;
    if (monto <= 0) return;

    setGuardando(true);
    try {
      // 1. Insertar registro de abono
      const { error: errAbono } = await supabase.from("abonos_credito").insert({
        credito_id: creditoSeleccionado.id,
        monto_abonado: monto,
        metodo_pago: metodoPago,
        notas: notasAbono,
      });

      if (errAbono) throw errAbono;

      // 2. Disminuir saldo de la cuenta de crédito
      const nuevoSaldo = Math.max(0, creditoSeleccionado.saldo_pendiente - monto);
      const nuevoEstado = nuevoSaldo === 0 ? "pagado" : "pendiente";

      await supabase
        .from("creditos_cuentas")
        .update({
          saldo_pendiente: nuevoSaldo,
          estado: nuevoEstado,
        })
        .eq("id", creditoSeleccionado.id);

      // 3. Disminuir saldo deudor del cliente
      if (creditoSeleccionado.cliente_id) {
        const clienteActual = clientes.find((cli) => cli.id === creditoSeleccionado.cliente_id);
        if (clienteActual) {
          const saldoCliente = Math.max(0, clienteActual.saldo_deudor - monto);
          await supabase
            .from("clientes")
            .update({ saldo_deudor: saldoCliente })
            .eq("id", clienteActual.id);
        }
      }

      alert("Abono registrado exitosamente.");
      setModalAbonoAbierto(false);
      onActualizarCreditos();
    } catch (err: unknown) {
      alert("Error: " + (err instanceof Error ? err.message : "Error"));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* KPI Cards & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
              Cartera Total de Clientes
            </span>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
              {formatoCordobas(totalPorCobrar)}
            </div>
          </div>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por cliente o factura..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Credits Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-bold">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Fecha Vencimiento</th>
                <th className="px-4 py-3 text-right">Monto Original</th>
                <th className="px-4 py-3 text-right">Saldo Pendiente (C$)</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {creditosFiltrados.map((c) => {
                const esPagado = c.estado === "pagado" || c.saldo_pendiente <= 0;
                return (
                  <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100">
                      {c.cliente?.nombre_completo || "Cliente"}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                      {c.fecha_vencimiento}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-500 dark:text-slate-400">
                      {formatoCordobas(c.monto_total)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                      {formatoCordobas(c.saldo_pendiente)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          esPagado
                            ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                            : "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                        }`}
                      >
                        {esPagado ? "Cancelado" : "Pendiente"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!esPagado && (
                        <button
                          onClick={() => abrirAbono(c)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition shadow-sm cursor-pointer"
                        >
                          Abonar C$
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {creditosFiltrados.length === 0 && (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
            No hay créditos registrados. Cuando realizas una venta POS con método "Al Crédito", aparecerá aquí automáticamente.
          </div>
        )}
      </div>

      {/* Modal Abono */}
      {modalAbonoAbierto && creditoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={registrarAbono}
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 dark:border-slate-800"
          >
            <div className="p-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm">Registrar Abono a Cuenta</h3>
              <p className="text-xs text-slate-400">
                {creditoSeleccionado.cliente?.nombre_completo}
              </p>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/60">
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">
                  Saldo Actual Pendiente
                </span>
                <div className="text-lg font-black text-amber-900 dark:text-amber-200 font-mono">
                  {formatoCordobas(creditoSeleccionado.saldo_pendiente)}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Monto a Abonar (C$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={creditoSeleccionado.saldo_pendiente}
                  required
                  value={montoAbono}
                  onChange={(e) => setMontoAbono(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Forma de Pago del Abono
                </label>
                <select
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="efectivo_cordobas">Efectivo Córdobas (C$)</option>
                  <option value="transferencia">Transferencia Bancaria</option>
                  <option value="tarjeta">Tarjeta (POS)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Notas / Observaciones
                </label>
                <input
                  type="text"
                  placeholder="Ej: Abono quincenal..."
                  value={notasAbono}
                  onChange={(e) => setNotasAbono(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalAbonoAbierto(false)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {guardando ? "Guardando..." : "Confirmar Abono"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
