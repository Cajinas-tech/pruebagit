"use client";

import React, { useState } from "react";
import {
  Settings,
  Building,
  Save,
  CheckCircle2,
  DollarSign,
  Printer,
  ShieldCheck,
  Globe,
  Database,
} from "lucide-react";
import { ConfiguracionNegocio } from "@/lib/types";
import { formatoCordobas } from "@/lib/currency";
import { supabase } from "@/lib/supabase";

interface AdministracionProps {
  config: ConfiguracionNegocio;
  onConfigActualizada: (nuevaConfig: ConfiguracionNegocio) => void;
}

export default function AdministracionModule({
  config,
  onConfigActualizada,
}: AdministracionProps) {
  const [nombreComercial, setNombreComercial] = useState(config.nombre_comercial);
  const [razonSocial, setRazonSocial] = useState(config.razon_social || "");
  const [ruc, setRuc] = useState(config.ruc || "");
  const [telefono, setTelefono] = useState(config.telefono || "");
  const [whatsapp, setWhatsapp] = useState(config.whatsapp || "");
  const [direccion, setDireccion] = useState(config.direccion || "");
  const [tasaCambio, setTasaCambio] = useState(config.tasa_cambio_oficial.toString());
  const [ivaPorcentaje, setIvaPorcentaje] = useState(config.iva_porcentaje.toString());
  const [pieTicket, setPieTicket] = useState(config.pie_ticket || "");
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(false);

  const guardarAjustes = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setExito(false);

    try {
      const payload = {
        nombre_comercial: nombreComercial.trim(),
        razon_social: razonSocial.trim(),
        ruc: ruc.trim(),
        telefono: telefono.trim(),
        whatsapp: whatsapp.trim(),
        direccion: direccion.trim(),
        tasa_cambio_oficial: parseFloat(tasaCambio) || 36.8,
        iva_porcentaje: parseFloat(ivaPorcentaje) || 15,
        pie_ticket: pieTicket.trim(),
      };

      const { data, error } = await supabase
        .from("configuracion_negocio")
        .update(payload)
        .eq("id", config.id)
        .select()
        .single();

      if (error) throw error;
      onConfigActualizada(data || { ...config, ...payload });
      setExito(true);
      setTimeout(() => setExito(false), 4000);
    } catch (err: unknown) {
      alert("Error al guardar ajustes: " + (err instanceof Error ? err.message : "Error"));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <form onSubmit={guardarAjustes} className="space-y-6">
        {/* Banner Top */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">
              Ajustes del Sistema & Configuración Comercial
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Parámetros de facturación para Nicaragua, tipo de cambio BCN e impresión de comprobantes.
            </p>
          </div>
          <button
            type="submit"
            disabled={guardando}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {guardando ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>

        {exito && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>Los ajustes del sistema se han actualizado y aplicado correctamente.</span>
          </div>
        )}

        {/* Sección 1: Datos Fiscales del Negocio */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-100 text-sm">
            <Building className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Datos Fiscales del Emisor (DGI Nicaragua)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                Nombre Comercial del Negocio
              </label>
              <input
                type="text"
                required
                value={nombreComercial}
                onChange={(e) => setNombreComercial(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                Razón Social
              </label>
              <input
                type="text"
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                Número RUC
              </label>
              <input
                type="text"
                required
                placeholder="J0310000001234"
                value={ruc}
                onChange={(e) => setRuc(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                Teléfono de Contacto
              </label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                Dirección Física
              </label>
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Sección 2: Moneda y Tipo de Cambio BCN */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-100 text-sm">
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Moneda, Tributación e Impuestos</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-2xl">
              <label className="font-bold text-blue-900 dark:text-blue-300 block mb-1">
                Tasa Oficial Banco Central de Nicaragua (BCN)
              </label>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600 dark:text-slate-400">1 USD = C$</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={tasaCambio}
                  onChange={(e) => setTasaCambio(e.target.value)}
                  className="w-32 px-3 py-2 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded-xl font-mono font-bold text-blue-700 dark:text-blue-400 text-sm"
                />
              </div>
              <p className="text-[10px] text-blue-700/80 dark:text-blue-300/80 mt-1">
                Se utiliza para convertir pagos en billetes de dólares y entregar el cambio exacto en Córdobas (C$).
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl">
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Tasa de IVA Nicaragua (%)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  required
                  value={ivaPorcentaje}
                  onChange={(e) => setIvaPorcentaje(e.target.value)}
                  className="w-24 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl font-mono font-bold text-slate-800 dark:text-white text-sm"
                />
                <span className="font-bold text-slate-600 dark:text-slate-400">% (Ley de Concertación Tributaria)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sección 3: Formato de Ticket Térmico */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-100 text-sm">
            <Printer className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Pie de Comprobante / Ticket</span>
          </div>

          <div className="text-xs">
            <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
              Mensaje al pie de la factura impresa
            </label>
            <input
              type="text"
              value={pieTicket}
              onChange={(e) => setPieTicket(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </form>
    </div>
  );
}
