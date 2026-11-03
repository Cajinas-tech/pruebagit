"use client";

import React, { useState, useMemo } from "react";
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Search,
  Phone,
  MessageCircle,
  CreditCard,
  Building,
  User,
} from "lucide-react";
import { Cliente } from "@/lib/types";
import { formatoCordobas } from "@/lib/currency";
import { supabase } from "@/lib/supabase";

interface ClientesProps {
  clientes: Cliente[];
  onClienteGuardado: (cli: Cliente) => void;
  onClienteEliminado: (id: string) => void;
}

export default function ClientesModule({
  clientes,
  onClienteGuardado,
  onClienteEliminado,
}: ClientesProps) {
  const [busqueda, setBusqueda] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Form states
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [tipoIdentificacion, setTipoIdentificacion] = useState<"cedula" | "ruc" | "consumidor_final">("cedula");
  const [numeroIdentificacion, setNumeroIdentificacion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [direccion, setDireccion] = useState("");
  const [limiteCredito, setLimiteCredito] = useState("5000");
  const [diasCredito, setDiasCredito] = useState("15");

  const clientesFiltrados = useMemo(() => {
    return clientes.filter(
      (c) =>
        c.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.numero_identificacion.includes(busqueda) ||
        (c.telefono && c.telefono.includes(busqueda))
    );
  }, [clientes, busqueda]);

  const abrirNuevo = () => {
    setEditandoId(null);
    setNombreCompleto("");
    setTipoIdentificacion("cedula");
    setNumeroIdentificacion("001-");
    setTelefono("");
    setWhatsapp("");
    setDireccion("Managua, Nicaragua");
    setLimiteCredito("5000");
    setDiasCredito("15");
    setModalAbierto(true);
  };

  const abrirEditar = (c: Cliente) => {
    setEditandoId(c.id);
    setNombreCompleto(c.nombre_completo);
    setTipoIdentificacion(c.tipo_identificacion);
    setNumeroIdentificacion(c.numero_identificacion);
    setTelefono(c.telefono || "");
    setWhatsapp(c.whatsapp || "");
    setDireccion(c.direccion || "");
    setLimiteCredito(c.limite_credito.toString());
    setDiasCredito(c.dias_credito.toString());
    setModalAbierto(true);
  };

  const guardarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    try {
      const payload = {
        nombre_completo: nombreCompleto.trim(),
        tipo_identificacion: tipoIdentificacion,
        numero_identificacion: numeroIdentificacion.trim(),
        telefono: telefono.trim(),
        whatsapp: whatsapp.trim(),
        direccion: direccion.trim(),
        limite_credito: parseFloat(limiteCredito) || 0,
        dias_credito: parseInt(diasCredito) || 15,
        activo: true,
      };

      if (editandoId) {
        const { data, error } = await supabase
          .from("clientes")
          .update(payload)
          .eq("id", editandoId)
          .select()
          .single();

        if (error) throw error;
        onClienteGuardado(data);
      } else {
        const { data, error } = await supabase
          .from("clientes")
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        onClienteGuardado(data);
      }

      setModalAbierto(false);
    } catch (err: unknown) {
      alert("Error: " + (err instanceof Error ? err.message : "Error"));
    } finally {
      setGuardando(false);
    }
  };

  const eliminarCliente = async (id: string) => {
    if (!confirm("¿Eliminar este cliente?")) return;
    try {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
      onClienteEliminado(id);
    } catch (err: unknown) {
      alert("No se puede eliminar porque tiene historial de facturación o créditos.");
    }
  };

  return (
    <div className="space-y-5">
      {/* Search and New Client */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 transition-colors">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre, cédula o teléfono..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={abrirNuevo}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nuevo Cliente
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-bold">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Tipo / Identificación</th>
                <th className="px-4 py-3">Teléfono / WhatsApp</th>
                <th className="px-4 py-3 text-right">Límite Crédito</th>
                <th className="px-4 py-3 text-right">Saldo Deudor (C$)</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {clientesFiltrados.map((cli) => (
                <tr key={cli.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                  <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100">
                    {cli.nombre_completo}
                    {cli.direccion && (
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                        {cli.direccion}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                    <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded mr-1">
                      {cli.tipo_identificacion}
                    </span>
                    {cli.numero_identificacion}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {cli.telefono && (
                        <span className="text-slate-600 dark:text-slate-300 font-mono">{cli.telefono}</span>
                      )}
                      {cli.whatsapp && (
                        <a
                          href={`https://wa.me/505${cli.whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition"
                          title="Enviar WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-600 dark:text-slate-400">
                    {formatoCordobas(cli.limite_credito)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                    {formatoCordobas(cli.saldo_deudor)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => abrirEditar(cli)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {cli.numero_identificacion !== "000-000000-0000X" && (
                        <button
                          onClick={() => eliminarCliente(cli.id)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nuevo/Editar */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={guardarCliente}
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-800"
          >
            <div className="p-4 bg-slate-900 text-white font-bold text-sm">
              {editandoId ? "Editar Cliente" : "Nuevo Cliente"}
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Nombre o Razón Social..."
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Tipo de Identificación
                  </label>
                  <select
                    value={tipoIdentificacion}
                    onChange={(e) => setTipoIdentificacion(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="cedula">Cédula Nicaragüense</option>
                    <option value="ruc">RUC (Empresa/Negocio)</option>
                    <option value="consumidor_final">Consumidor Final</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Número (Cédula o RUC)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="001-000000-0000X"
                    value={numeroIdentificacion}
                    onChange={(e) => setNumeroIdentificacion(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Teléfono</label>
                  <input
                    type="text"
                    placeholder="2222-3333"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">WhatsApp</label>
                  <input
                    type="text"
                    placeholder="8888-9999"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Dirección</label>
                <input
                  type="text"
                  placeholder="Barrio, semáforos, ciudad..."
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Límite de Crédito (C$)
                  </label>
                  <input
                    type="number"
                    value={limiteCredito}
                    onChange={(e) => setLimiteCredito(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Plazo de Crédito (Días)
                  </label>
                  <input
                    type="number"
                    value={diasCredito}
                    onChange={(e) => setDiasCredito(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Guardar Cliente
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
