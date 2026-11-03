"use client";

import React, { useState, useMemo, useRef } from "react";
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle,
  AlertCircle,
  Barcode,
  Percent,
  UploadCloud,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { Producto, Categoria } from "@/lib/types";
import { formatoCordobas } from "@/lib/currency";
import { supabase } from "@/lib/supabase";

interface ProductosProps {
  productos: Producto[];
  categorias: Categoria[];
  onProductoGuardado: (prod: Producto) => void;
  onProductoEliminado: (id: string) => void;
}

export default function ProductosModule({
  productos,
  categorias,
  onProductoGuardado,
  onProductoEliminado,
}: ProductosProps) {
  const [busqueda, setBusqueda] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Form states
  const [codigoBarras, setCodigoBarras] = useState("");
  const [nombre, setNombre] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [unidadMedida, setUnidadMedida] = useState("Unidad");
  const [costoPromedio, setCostoPromedio] = useState("");
  const [precioVenta, setPrecioVenta] = useState("");
  const [stockMinimo, setStockMinimo] = useState("5");
  const [stockInicial, setStockInicial] = useState("10");
  const [aplicaIva, setAplicaIva] = useState(true);

  // Image states
  const [imagenUrl, setImagenUrl] = useState<string | null>(null);
  const [archivoImagen, setArchivoImagen] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const productosFiltrados = useMemo(() => {
    return productos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.codigo_barras.includes(busqueda)
    );
  }, [productos, busqueda]);

  const abrirNuevo = () => {
    setEditandoId(null);
    setCodigoBarras(Math.floor(100000000000 + Math.random() * 900000000000).toString());
    setNombre("");
    setCategoriaId(categorias[0]?.id || "");
    setUnidadMedida("Unidad");
    setCostoPromedio("20");
    setPrecioVenta("28");
    setStockMinimo("5");
    setStockInicial("12");
    setAplicaIva(true);
    setImagenUrl(null);
    setArchivoImagen(null);
    setModalAbierto(true);
  };

  const abrirEditar = (p: Producto) => {
    setEditandoId(p.id);
    setCodigoBarras(p.codigo_barras);
    setNombre(p.nombre);
    setCategoriaId(p.categoria_id || "");
    setUnidadMedida(p.unidad_medida || "Unidad");
    setCostoPromedio(p.costo_promedio ? p.costo_promedio.toString() : "0");
    setPrecioVenta(p.precio_venta.toString());
    setStockMinimo(p.stock_minimo ? p.stock_minimo.toString() : "5");
    setStockInicial(p.stock.toString());
    setAplicaIva(p.aplica_iva ?? true);
    setImagenUrl(p.imagen_url || null);
    setArchivoImagen(null);
    setModalAbierto(true);
  };

  const calcularPrecioPorMargen = (margenPorcentaje: number) => {
    const costo = parseFloat(costoPromedio) || 0;
    if (costo > 0) {
      const sugerido = costo * (1 + margenPorcentaje / 100);
      setPrecioVenta(sugerido.toFixed(2));
    }
  };

  // Manejador de selección de imagen JPG o PNG
  const manejarSeleccionImagen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    // Validar tipo de formato (JPG o PNG)
    const tiposPermitidos = ["image/jpeg", "image/jpg", "image/png"];
    if (!tiposPermitidos.includes(archivo.type)) {
      alert("Por favor selecciona una imagen válida en formato JPG o PNG.");
      return;
    }

    // Validar tamaño máximo (5MB)
    if (archivo.size > 5 * 1024 * 1024) {
      alert("El tamaño de la imagen debe ser inferior a 5MB.");
      return;
    }

    setArchivoImagen(archivo);

    // Previsualización instantánea
    const lector = new FileReader();
    lector.onloadend = () => {
      setImagenUrl(lector.result as string);
    };
    lector.readAsDataURL(archivo);
  };

  const quitarImagen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImagenUrl(null);
    setArchivoImagen(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const guardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    try {
      let finalImagenUrl = imagenUrl;

      // Si el usuario seleccionó un nuevo archivo, intentar subir a Supabase Storage
      if (archivoImagen) {
        try {
          const extension = archivoImagen.name.split(".").pop()?.toLowerCase() || "jpg";
          const nombreArchivo = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${extension}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("productos")
            .upload(nombreArchivo, archivoImagen, {
              cacheControl: "3600",
              upsert: true,
            });

          if (!uploadError && uploadData) {
            const { data: publicUrlData } = supabase.storage
              .from("productos")
              .getPublicUrl(nombreArchivo);
            if (publicUrlData?.publicUrl) {
              finalImagenUrl = publicUrlData.publicUrl;
            }
          }
        } catch (storageErr) {
          console.warn("Storage upload fallback to data URL:", storageErr);
        }
      }

      const payload = {
        codigo_barras: codigoBarras.trim(),
        nombre: nombre.trim(),
        categoria_id: categoriaId || null,
        unidad_medida: unidadMedida,
        costo_promedio: parseFloat(costoPromedio) || 0,
        precio_venta: parseFloat(precioVenta) || 0,
        stock_minimo: parseInt(stockMinimo) || 5,
        stock: parseInt(stockInicial) || 0,
        aplica_iva: aplicaIva,
        imagen_url: finalImagenUrl,
        activo: true,
      };

      if (editandoId) {
        const { data, error } = await supabase
          .from("productos")
          .update(payload)
          .eq("id", editandoId)
          .select()
          .single();

        if (error) throw error;
        onProductoGuardado(data);
      } else {
        const { data, error } = await supabase
          .from("productos")
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        onProductoGuardado(data);
      }

      setModalAbierto(false);
    } catch (err: unknown) {
      alert("Error al guardar producto: " + (err instanceof Error ? err.message : "Error"));
    } finally {
      setGuardando(false);
    }
  };

  const eliminarProducto = async (id: string, nombreP: string) => {
    if (!confirm(`¿Eliminar producto "${nombreP}"?`)) return;

    try {
      const { error } = await supabase.from("productos").delete().eq("id", id);
      if (error) throw error;
      onProductoEliminado(id);
    } catch (err: unknown) {
      alert("No se puede eliminar el producto porque ya tiene facturas o movimientos asociados.");
    }
  };

  return (
    <div className="space-y-5">
      {/* Search and New Product Button */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 transition-colors">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por código de barras o nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={abrirNuevo}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nuevo Producto
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-bold">
              <tr>
                <th className="px-4 py-3 text-center">Foto</th>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Unidad</th>
                <th className="px-4 py-3 text-right">Costo (C$)</th>
                <th className="px-4 py-3 text-right">Precio (C$)</th>
                <th className="px-4 py-3 text-center">IVA 15%</th>
                <th className="px-4 py-3 text-center">Stock</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {productosFiltrados.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                  <td className="px-4 py-2 text-center">
                    {p.imagen_url ? (
                      <img
                        src={p.imagen_url}
                        alt={p.nombre}
                        className="w-10 h-10 object-cover rounded-xl border border-slate-200 dark:border-slate-700 mx-auto shadow-sm"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 mx-auto">
                        <Package className="w-5 h-5" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">{p.codigo_barras}</td>
                  <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100">{p.nombre}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{p.unidad_medida}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-500 dark:text-slate-400">
                    {formatoCordobas(p.costo_promedio || 0)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                    {formatoCordobas(p.precio_venta)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.aplica_iva
                          ? "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300"
                          : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                      }`}
                    >
                      {p.aplica_iva ? "Gravado" : "Exento"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-bold">
                    <span
                      className={`px-2 py-0.5 rounded-full ${
                        p.stock <= p.stock_minimo
                          ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => abrirEditar(p)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 transition cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => eliminarProducto(p.id, p.nombre)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-700 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nuevo / Editar Producto */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={guardarProducto}
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800"
          >
            <div className="p-5 bg-slate-900 text-white">
              <h3 className="font-bold text-base">
                {editandoId ? "Editar Producto" : "Registrar Nuevo Producto"}
              </h3>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* SELECCIÓN DE IMAGEN (JPG O PNG) */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Imagen del Producto (Opcional)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg, .jpeg, .png, image/jpeg, image/png"
                  onChange={manejarSeleccionImagen}
                  className="hidden"
                  id="producto-imagen-input"
                />

                {imagenUrl ? (
                  <div className="relative border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-2xl p-3 bg-blue-50/40 dark:bg-blue-950/30 flex items-center gap-4">
                    <img
                      src={imagenUrl}
                      alt="Vista previa"
                      className="w-16 h-16 object-cover rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 dark:text-slate-100 truncate text-xs">
                        {archivoImagen ? archivoImagen.name : "Imagen del producto"}
                      </div>
                      <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">
                        Imagen cargada correctamente
                      </p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[11px] text-blue-700 dark:text-blue-400 underline font-semibold mt-1 cursor-pointer"
                      >
                        Cambiar imagen (JPG o PNG)
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={quitarImagen}
                      className="p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 hover:border-red-200 transition shadow-sm cursor-pointer"
                      title="Quitar imagen"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-2xl p-5 text-center cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition group"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-2 transition">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div className="font-bold text-slate-700 dark:text-slate-300 text-xs group-hover:text-blue-700 dark:group-hover:text-blue-400">
                      Selecciona una imagen en formato JPG o PNG desde tu dispositivo
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      Haz clic aquí o arrastra tu archivo (Máx. 5MB)
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Código de Barras / SKU
                  </label>
                  <input
                    type="text"
                    required
                    value={codigoBarras}
                    onChange={(e) => setCodigoBarras(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Categoría</label>
                  <select
                    value={categoriaId}
                    onChange={(e) => setCategoriaId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="">Sin Categoría</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Nombre o Descripción
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Frijol Rojo Nacional Libra"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Unidad de Medida (Nicaragua)
                  </label>
                  <select
                    value={unidadMedida}
                    onChange={(e) => setUnidadMedida(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Unidad">Unidad (Pza)</option>
                    <option value="Libra">Libra (Lb)</option>
                    <option value="Quintal">Quintal (Qq)</option>
                    <option value="Docena">Docena (Doc)</option>
                    <option value="Litro">Litro (Lt)</option>
                    <option value="Caja">Caja</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Stock Mínimo</label>
                  <input
                    type="number"
                    value={stockMinimo}
                    onChange={(e) => setStockMinimo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Precios y Margen en Córdobas */}
              <div className="bg-slate-50 dark:bg-slate-800/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      Costo Base (C$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={costoPromedio}
                      onChange={(e) => setCostoPromedio(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      Precio de Venta (C$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={precioVenta}
                      onChange={(e) => setPrecioVenta(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-blue-600 dark:text-blue-400"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Margen rápido:</span>
                  {[20, 25, 30, 40].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => calcularPrecioPorMargen(m)}
                      className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      +{m}%
                    </button>
                  ))}
                </div>
              </div>

              {/* IVA Toggle */}
              <div className="flex items-center justify-between p-3 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    Impuesto al Valor Agregado (IVA 15%)
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Desactívalo si es de la canasta básica exenta (Arroz, Frijol, etc.)
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={aplicaIva}
                  onChange={(e) => setAplicaIva(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </div>

              {!editandoId && (
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Existencia Inicial
                  </label>
                  <input
                    type="number"
                    value={stockInicial}
                    onChange={(e) => setStockInicial(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {guardando ? "Guardando..." : "Guardar Producto"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
