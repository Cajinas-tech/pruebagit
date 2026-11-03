"use client";

import React, { useState } from "react";
import {
  Wallet,
  DollarSign,
  ArrowDownRight,
  ArrowUpRight,
  FileCheck2,
  Clock,
  AlertCircle,
  Plus,
  Minus,
  CheckCircle,
} from "lucide-react";
import { SesionCaja, MovimientoCaja, Factura, ConfiguracionNegocio } from "@/lib/types";
import { formatoCordobas, formatoFechaNica } from "@/lib/currency";
import { supabase } from "@/lib/supabase";

interface CajaProps {
  sesionCaja: SesionCaja | null;
  facturas: Factura[];
  config: ConfiguracionNegocio;
  onActualizarSesion: (sesion: SesionCaja | null) => void;
}

export default function CajaModule({
  sesionCaja,
  facturas,
  config,
  onActualizarSesion,
}: CajaProps) {
  const [montoApertura, setMontoApertura] = useState("1000");
  const [cajeroNombre, setCajeroNombre] = useState("Cajero Principal");
  const [modalGastoAbierto, setModalGastoAbierto] = useState(false);
  const [modalCierreAbierto, setModalCierreAbierto] = useState(false);

  // Gasto menor
  const [tipoMov, setTipoMov] = useState<"ingreso" | "egreso">("egreso");
  const [conceptoMov, setConceptoMov] = useState("");
  const [montoMov, setMontoMov] = useState("");

  // Arqueo de billetes de Nicaragua (Corte Z)
  const [billetes, setBilletes] = useState({
    b1000: 0,
    b500: 0,
    b200: 0,
    b100: 0,
    b50: 0,
    b20: 0,
    b10: 0,
    monedas: 0,
  });

  const totalDeclaradoArqueo =
    billetes.b1000 * 1000 +
    billetes.b500 * 500 +
    billetes.b200 * 200 +
    billetes.b100 * 100 +
    billetes.b50 * 50 +
    billetes.b20 * 20 +
    billetes.b10 * 10 +
    billetes.monedas;

  // Total ventas en efectivo registradas en esta sesión
  const ventasEfectivoSesion = facturas
    .filter((f) => f.estado === "emitida" && f.metodo_pago === "efectivo_cordobas")
    .reduce((acc, f) => acc + f.total, 0);

  const totalSistemaEsperado = (sesionCaja?.monto_apertura || 0) + ventasEfectivoSesion;
  const diferenciaArqueo = totalDeclaradoArqueo - totalSistemaEsperado;

  const abrirCaja = async () => {
    const fondo = parseFloat(montoApertura) || 0;
    try {
      const { data, error } = await supabase
        .from("sesiones_caja")
        .insert({
          cajero_nombre: cajeroNombre,
          monto_apertura: fondo,
          estado: "abierta",
        })
        .select()
        .single();

      if (error) throw error;
      onActualizarSesion(data);
    } catch (err: unknown) {
      alert("Error al abrir caja: " + (err instanceof Error ? err.message : "Error"));
    }
  };

  const registrarGastoMenor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sesionCaja || !conceptoMov || !montoMov) return;

    try {
      const { error } = await supabase.from("movimientos_caja").insert({
        sesion_caja_id: sesionCaja.id,
        tipo: tipoMov,
        concepto: conceptoMov,
        monto: parseFloat(montoMov) || 0,
      });

      if (error) throw error;
      alert("Movimiento registrado en caja correctamente.");
      setModalGastoAbierto(false);
      setConceptoMov("");
      setMontoMov("");
    } catch (err: unknown) {
      alert("Error: " + (err instanceof Error ? err.message : "Error"));
    }
  };

  const cerrarCajaZ = async () => {
    if (!sesionCaja) return;
    if (!confirm("¿Deseas cerrar el turno de caja definitivamente con Corte Z?")) return;

    try {
      const { data, error } = await supabase
        .from("sesiones_caja")
        .update({
          estado: "cerrada",
          monto_cierre_declarado: totalDeclaradoArqueo,
          monto_cierre_sistema: totalSistemaEsperado,
          diferencia: diferenciaArqueo,
          fecha_cierre: new Date().toISOString(),
        })
        .eq("id", sesionCaja.id)
        .select()
        .single();

      if (error) throw error;
      onActualizarSesion(null);
      setModalCierreAbierto(false);
      alert("Caja cerrada exitosamente. Descuadre registrado: " + formatoCordobas(diferenciaArqueo));
    } catch (err: unknown) {
      alert("Error al cerrar caja: " + (err instanceof Error ? err.message : "Error"));
    }
  };

  return (
    <div className="space-y-6">
      {/* Caja Status Top Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
              sesionCaja?.estado === "abierta"
                ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                : "bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60"
            }`}
          >
            <Wallet className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {sesionCaja?.estado === "abierta" ? "Turno de Caja Activo" : "Caja Cerrada"}
              </h2>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  sesionCaja?.estado === "abierta"
                    ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                    : "bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300"
                }`}
              >
                {sesionCaja?.estado === "abierta" ? "Abierta" : "Cerrada"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {sesionCaja?.estado === "abierta"
                ? `Abierta por ${sesionCaja.cajero_nombre} desde ${formatoFechaNica(sesionCaja.fecha_apertura)}`
                : "Debes aperturar la caja con el fondo inicial en Córdobas para empezar a cobrar."}
            </p>
          </div>
        </div>

        {sesionCaja?.estado === "abierta" ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModalGastoAbierto(true)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowDownRight className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Gasto Menor
            </button>
            <button
              onClick={() => setModalCierreAbierto(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4" />
              Corte Z (Cierre)
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <input
              type="number"
              placeholder="Fondo C$"
              value={montoApertura}
              onChange={(e) => setMontoApertura(e.target.value)}
              className="w-32 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white"
            />
            <button
              onClick={abrirCaja}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              Aperturar Caja
            </button>
          </div>
        )}
      </div>

      {/* Resumen del Turno Actual (Corte X) */}
      {sesionCaja?.estado === "abierta" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Fondo Inicial</span>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2 font-mono">
              {formatoCordobas(sesionCaja.monto_apertura)}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Ventas Efectivo C$</span>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
              {formatoCordobas(ventasEfectivoSesion)}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Total en Gaveta Estimado</span>
            <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-2 font-mono">
              {formatoCordobas(totalSistemaEsperado)}
            </div>
          </div>
        </div>
      )}

      {/* Modal Arqueo Ciego / Corte Z */}
      {modalCierreAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-5 bg-slate-900 text-white">
              <h3 className="font-bold text-base">Arqueo de Caja (Corte Z - Billetes C$)</h3>
              <p className="text-xs text-slate-400">
                Conteo físico de denominaciones oficiales de Nicaragua
              </p>
            </div>

            <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { key: "b1000", label: "Billetes C$ 1,000", val: 1000 },
                  { key: "b500", label: "Billetes C$ 500", val: 500 },
                  { key: "b200", label: "Billetes C$ 200", val: 200 },
                  { key: "b100", label: "Billetes C$ 100", val: 100 },
                  { key: "b50", label: "Billetes C$ 50", val: 50 },
                  { key: "b20", label: "Billetes C$ 20", val: 20 },
                  { key: "b10", label: "Billetes C$ 10", val: 10 },
                  { key: "monedas", label: "Monedas Varias (C$)", val: 1 },
                ].map((item) => (
                  <div key={item.key} className="bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      {item.label}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={(billetes as any)[item.key] || ""}
                      onChange={(e) =>
                        setBilletes({
                          ...billetes,
                          [item.key]: parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="0"
                      className="w-full text-sm font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-900 dark:text-white"
                    />
                  </div>
                ))}
              </div>

              {/* Total Declarado vs Sistema */}
              <div className="p-4 bg-slate-100 dark:bg-slate-800/70 rounded-2xl space-y-1 text-xs">
                <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-200">
                  <span>Total Contado Físicamente:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatoCordobas(totalDeclaradoArqueo)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Esperado por Sistema:</span>
                  <span className="font-mono">{formatoCordobas(totalSistemaEsperado)}</span>
                </div>
                <div className="flex justify-between font-bold pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>Diferencia (Sobrante/Faltante):</span>
                  <span
                    className={`font-mono ${
                      diferenciaArqueo >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {formatoCordobas(diferenciaArqueo)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setModalCierreAbierto(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={cerrarCajaZ}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Confirmar Cierre Z
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gasto Menor */}
      {modalGastoAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={registrarGastoMenor}
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 dark:border-slate-800"
          >
            <div className="p-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm">Movimiento de Caja Menor</h3>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-500 dark:text-slate-400 block mb-1">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoMov("egreso")}
                    className={`py-2 rounded-xl font-bold cursor-pointer ${
                      tipoMov === "egreso" ? "bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    Salida / Gasto
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoMov("ingreso")}
                    className={`py-2 rounded-xl font-bold cursor-pointer ${
                      tipoMov === "ingreso" ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    Ingreso / Cambio
                  </button>
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-500 dark:text-slate-400 block mb-1">Concepto</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Pago de hielo, compras menores..."
                  value={conceptoMov}
                  onChange={(e) => setConceptoMov(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="font-bold text-slate-500 dark:text-slate-400 block mb-1">Monto en Córdobas (C$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={montoMov}
                  onChange={(e) => setMontoMov(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalGastoAbierto(false)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
