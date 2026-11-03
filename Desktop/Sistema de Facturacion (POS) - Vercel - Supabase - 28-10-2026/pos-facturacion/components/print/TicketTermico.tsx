"use client";

import React, { useState, useEffect } from "react";
import { Printer, X, Settings2 } from "lucide-react";
import { Factura, ConfiguracionNegocio } from "@/lib/types";
import { formatoCordobas, formatoFechaNica } from "@/lib/currency";

interface TicketTermicoProps {
  factura: Factura;
  config: ConfiguracionNegocio;
  onCerrar: () => void;
}

type TipoImpresora = "POS-80C" | "POS-80" | "POS-58";

export default function TicketTermico({
  factura,
  config,
  onCerrar,
}: TicketTermicoProps) {
  // Selector de impresora guardado en localStorage
  const [tipoImpresora, setTipoImpresora] = useState<TipoImpresora>("POS-80C");

  useEffect(() => {
    const guardada = localStorage.getItem("tipo_impresora_pos") as TipoImpresora;
    if (guardada && (guardada === "POS-80C" || guardada === "POS-80" || guardada === "POS-58")) {
      setTipoImpresora(guardada);
    }
  }, []);

  const cambiarTipoImpresora = (tipo: TipoImpresora) => {
    setTipoImpresora(tipo);
    localStorage.setItem("tipo_impresora_pos", tipo);
  };

  const imprimir = () => {
    window.print();
  };

  // Medidas de ancho exactas según impresora
  const configAncho = {
    "POS-80C": {
      anchoModal: "max-w-[340px]",
      anchoPrint: "72mm",
      fontSize: "11px",
      fontSizeSm: "10px",
      fontSizeXs: "9px",
      padding: "2mm",
    },
    "POS-80": {
      anchoModal: "max-w-[320px]",
      anchoPrint: "68mm",
      fontSize: "11px",
      fontSizeSm: "10px",
      fontSizeXs: "9px",
      padding: "2mm",
    },
    "POS-58": {
      anchoModal: "max-w-[270px]",
      anchoPrint: "48mm",
      fontSize: "10px",
      fontSizeSm: "9px",
      fontSizeXs: "8px",
      padding: "1mm",
    },
  }[tipoImpresora];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        className={`bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full ${configAncho.anchoModal} overflow-hidden flex flex-col max-h-[95vh] border border-slate-200 dark:border-slate-800`}
      >
        {/* Modal Toolbar (No se imprime) */}
        <div className="p-3 bg-slate-900 text-white flex flex-col gap-2 no-print border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-blue-400" />
              <span className="font-bold text-xs">Impresión de Ticket</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={imprimir}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shadow flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir
              </button>
              <button
                onClick={onCerrar}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Selector de Impresora: POS-80C vs POS-80 vs POS-58 */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl text-[11px]">
            <span className="text-slate-400 text-[10px] px-1 font-semibold flex items-center gap-1">
              <Settings2 className="w-3 h-3" /> Tipo:
            </span>
            {(["POS-80C", "POS-80", "POS-58"] as TipoImpresora[]).map((tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() => cambiarTipoImpresora(tipo)}
                className={`flex-1 py-1 rounded-lg font-bold text-center transition ${
                  tipoImpresora === tipo
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/60"
                }`}
              >
                {tipo}
              </button>
            ))}
          </div>
        </div>

        {/* Printable Ticket Receipt */}
        <div className="overflow-y-auto p-4 bg-white text-black font-mono leading-tight printable-ticket-wrapper custom-scrollbar">
          <div
            className="ticket-impresion"
            style={{
              width: configAncho.anchoPrint,
              maxWidth: configAncho.anchoPrint,
              margin: "0 auto",
              fontSize: configAncho.fontSize,
              padding: configAncho.padding,
            }}
          >
            {/* Header del Comercio */}
            <div className="text-center pb-2 border-b border-dashed border-black">
              <div className="font-bold text-sm uppercase tracking-tight">
                {config.nombre_comercial}
              </div>
              {config.razon_social && (
                <div style={{ fontSize: configAncho.fontSizeXs }} className="text-slate-700">
                  {config.razon_social}
                </div>
              )}
              <div className="font-bold text-[11px] mt-0.5">
                RUC: {config.ruc || "J0310000001234"}
              </div>
              {config.direccion && (
                <div style={{ fontSize: configAncho.fontSizeXs }} className="mt-0.5 text-slate-700">
                  {config.direccion}
                </div>
              )}
              {config.telefono && (
                <div style={{ fontSize: configAncho.fontSizeXs }} className="text-slate-700">
                  Tel: {config.telefono}
                </div>
              )}
            </div>

            {/* Datos de Factura y Cliente */}
            <div className="py-2 border-b border-dashed border-black space-y-0.5" style={{ fontSize: configAncho.fontSizeSm }}>
              <div className="flex justify-between font-bold">
                <span>FACTURA: #{String(factura.numero_factura).padStart(6, "0")}</span>
                <span className="uppercase">{factura.condicion_venta}</span>
              </div>
              <div style={{ fontSize: configAncho.fontSizeXs }} className="text-slate-700">
                Fecha: {formatoFechaNica(factura.created_at)}
              </div>
              <div className="font-semibold pt-0.5 truncate">
                Cliente: {factura.cliente?.nombre_completo || "Consumidor Final"}
              </div>
              {factura.cliente?.numero_identificacion && (
                <div style={{ fontSize: configAncho.fontSizeXs }} className="text-slate-700">
                  Cédula/RUC: {factura.cliente.numero_identificacion}
                </div>
              )}
              <div style={{ fontSize: configAncho.fontSizeXs }} className="text-slate-700 uppercase">
                Pago: {factura.metodo_pago.replace("_", " ")}
              </div>
            </div>

            {/* Tabla de Artículos con Table-Layout Fixed para evitar desbordes */}
            <div className="py-2 border-b border-dashed border-black">
              <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px dashed #000", fontSize: configAncho.fontSizeXs }}>
                    <th style={{ width: "16%", textAlign: "left", paddingBottom: "3px" }}>CANT</th>
                    <th style={{ width: "50%", textAlign: "left", paddingBottom: "3px" }}>DESCRIPCIÓN</th>
                    <th style={{ width: "34%", textAlign: "right", paddingBottom: "3px" }}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {factura.detalles?.map((item, idx) => (
                    <tr key={idx} style={{ verticalAlign: "top", fontSize: configAncho.fontSizeSm }}>
                      <td style={{ textAlign: "left", paddingTop: "4px" }}>
                        {item.cantidad}x
                      </td>
                      <td style={{ textAlign: "left", paddingTop: "4px", paddingRight: "4px", wordBreak: "break-word" }}>
                        <div className="font-medium leading-tight">
                          {item.producto?.nombre || "Producto"}
                        </div>
                        <div style={{ fontSize: configAncho.fontSizeXs, color: "#444" }}>
                          @{formatoCordobas(item.precio_unitario)}
                        </div>
                      </td>
                      <td style={{ textAlign: "right", paddingTop: "4px", fontWeight: "bold", whiteSpace: "nowrap" }}>
                        {formatoCordobas(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totales y Desglose de Impuestos */}
            <div className="py-2 border-b border-dashed border-black space-y-1" style={{ fontSize: configAncho.fontSizeSm }}>
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-mono">{formatoCordobas(factura.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA (15%):</span>
                <span className="font-mono">{formatoCordobas(factura.monto_iva)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm pt-1 border-t border-black">
                <span>TOTAL (C$):</span>
                <span className="font-mono">{formatoCordobas(factura.total)}</span>
              </div>
            </div>

            {/* Pagos Recibidos y Vuelto en Córdobas */}
            <div className="py-2 border-b border-dashed border-black space-y-0.5" style={{ fontSize: configAncho.fontSizeSm }}>
              {factura.monto_recibido_cordobas > 0 && (
                <div className="flex justify-between">
                  <span>Recibido C$:</span>
                  <span className="font-mono">{formatoCordobas(factura.monto_recibido_cordobas)}</span>
                </div>
              )}
              {factura.monto_recibido_dolares > 0 && (
                <div className="flex justify-between">
                  <span>Recibido USD (Tasa {Number(factura.tasa_cambio_aplicada).toFixed(2)}):</span>
                  <span className="font-mono">${Number(factura.monto_recibido_dolares).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-0.5">
                <span>Cambio / Vuelto:</span>
                <span className="font-mono">{formatoCordobas(factura.cambio_devuelto_cordobas)}</span>
              </div>
            </div>

            {/* Pie de Página */}
            <div className="text-center pt-2 space-y-1" style={{ fontSize: configAncho.fontSizeXs }}>
              <p className="font-semibold">{config.pie_ticket}</p>
              <p className="text-slate-600">Sistema POS Nicaragua</p>
            </div>
          </div>
        </div>

        {/* Estilos CSS @media print específicos para térmicas POS-80 / POS-80C / POS-58 */}
        <style jsx global>{`
          @page {
            size: auto;
            margin: 0mm !important;
          }

          @media print {
            html,
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
            }

            body * {
              visibility: hidden;
            }

            .printable-ticket-wrapper,
            .printable-ticket-wrapper * {
              visibility: visible;
            }

            .printable-ticket-wrapper {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
              background: #fff !important;
            }

            .ticket-impresion {
              margin: 0 auto !important;
              color: #000 !important;
              line-height: 1.25 !important;
            }

            .no-print {
              display: none !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
