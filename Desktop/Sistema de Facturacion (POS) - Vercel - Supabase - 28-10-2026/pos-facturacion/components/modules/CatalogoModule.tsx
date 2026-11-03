"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Grid,
  List,
  Plus,
  Package,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Tag,
  DollarSign,
} from "lucide-react";
import { Producto, Categoria, ConfiguracionNegocio } from "@/lib/types";
import { formatoCordobas, convertirNIOaUSD } from "@/lib/currency";

interface CatalogoProps {
  productos: Producto[];
  categorias: Categoria[];
  config: ConfiguracionNegocio;
  onAgregarAlCarrito: (producto: Producto) => void;
}

export default function CatalogoModule({
  productos,
  categorias,
  config,
  onAgregarAlCarrito,
}: CatalogoProps) {
  const [busqueda, setBusqueda] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>("todas");
  const [modoVista, setModoVista] = useState<"grid" | "lista">("grid");

  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const coincideTexto =
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.codigo_barras.includes(busqueda);
      const coincideCat =
        categoriaSeleccionada === "todas" || p.categoria_id === categoriaSeleccionada;
      return coincideTexto && coincideCat;
    });
  }, [productos, busqueda, categoriaSeleccionada]);

  const obtenerNombreCat = (catId?: string) => {
    if (!catId) return "Sin Categoría";
    const cat = categorias.find((c) => c.id === catId);
    return cat ? cat.nombre : "General";
  };

  return (
    <div className="space-y-5">
      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 transition-colors">
        {/* Input Buscador */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre o código de barras..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        {/* Categories Bar & View switch */}
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <select
            value={categoriaSeleccionada}
            onChange={(e) => setCategoriaSeleccionada(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todas">Todas las Categorías ({productos.length})</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nombre}
              </option>
            ))}
          </select>

          {/* Grid / List switch */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 flex-shrink-0">
            <button
              onClick={() => setModoVista("grid")}
              className={`p-1.5 rounded-lg transition ${
                modoVista === "grid"
                  ? "bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400 font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
              title="Vista Cuadrícula"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setModoVista("lista")}
              className={`p-1.5 rounded-lg transition ${
                modoVista === "lista"
                  ? "bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400 font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
              title="Vista Lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {modoVista === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {productosFiltrados.map((p) => {
            const stockBajo = p.stock <= p.stock_minimo && p.stock > 0;
            const agotado = p.stock <= 0;
            const precioUSD = convertirNIOaUSD(p.precio_venta, config.tasa_cambio_oficial);

            return (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between group"
              >
                {/* Product Image if exists */}
                {p.imagen_url && (
                  <div className="w-full h-36 bg-slate-100 dark:bg-slate-800 overflow-hidden relative border-b border-slate-100 dark:border-slate-800">
                    <img
                      src={p.imagen_url}
                      alt={p.nombre}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  </div>
                )}

                {/* Product Header / Category */}
                <div className="p-4 space-y-2 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md truncate max-w-[140px]">
                      {obtenerNombreCat(p.categoria_id)}
                    </span>
                    {/* Badge Estado */}
                    {agotado ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-2 py-0.5 rounded-full">
                        <XCircle className="w-3 h-3" /> Agotado
                      </span>
                    ) : stockBajo ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full">
                        <AlertCircle className="w-3 h-3" /> Bajo ({p.stock})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Stock: {p.stock}
                      </span>
                    )}
                  </div>

                  {/* Title & Barcode */}
                  <div className="pt-1">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight line-clamp-2">
                      {p.nombre}
                    </h4>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                      {p.codigo_barras} • {p.unidad_medida}
                    </div>
                  </div>
                </div>

                {/* Product Footer: Price & Add to Cart */}
                <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
                  <div className="pt-2">
                    <div className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                      {formatoCordobas(p.precio_venta)}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      ≈ ${precioUSD.toFixed(2)} USD
                    </div>
                  </div>

                  <button
                    onClick={() => onAgregarAlCarrito(p)}
                    disabled={agotado}
                    className={`mt-2 p-2.5 rounded-xl font-semibold transition flex items-center gap-1.5 shadow-sm text-xs cursor-pointer ${
                      agotado
                        ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-95"
                    }`}
                    title="Añadir a la orden POS"
                  >
                    <Plus className="w-4 h-4" />
                    <span>POS</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
              <tr>
                <th className="px-4 py-3 text-center">Foto</th>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3 text-right">Precio (C$)</th>
                <th className="px-4 py-3 text-center">Stock</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {productosFiltrados.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                  <td className="px-4 py-2 text-center">
                    {p.imagen_url ? (
                      <img
                        src={p.imagen_url}
                        alt={p.nombre}
                        className="w-9 h-9 object-cover rounded-lg border border-slate-200 dark:border-slate-700 mx-auto"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mx-auto">
                        <Package className="w-4 h-4" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{p.codigo_barras}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100">{p.nombre}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{obtenerNombreCat(p.categoria_id)}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white font-mono">
                    {formatoCordobas(p.precio_venta)}
                  </td>
                  <td className="px-4 py-3 text-center font-mono">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        p.stock <= 0
                          ? "bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400"
                          : p.stock <= p.stock_minimo
                          ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400"
                          : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                      }`}
                    >
                      {p.stock} {p.unidad_medida}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onAgregarAlCarrito(p)}
                      disabled={p.stock <= 0}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition disabled:opacity-50 cursor-pointer"
                    >
                      Añadir POS
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {productosFiltrados.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400 dark:text-slate-500">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-40 text-slate-500" />
          <h4 className="font-bold text-slate-700 dark:text-slate-300 text-base">No se encontraron productos</h4>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Intenta con otro término de búsqueda o categoría.
          </p>
        </div>
      )}
    </div>
  );
}
