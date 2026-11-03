"use client";

import React, { useState } from "react";
import { Tags, Plus, Edit2, Trash2, CheckCircle2 } from "lucide-react";
import { Categoria, Producto } from "@/lib/types";
import { supabase } from "@/lib/supabase";

interface CategoriasProps {
  categorias: Categoria[];
  productos: Producto[];
  onCategoriaGuardada: (cat: Categoria) => void;
  onCategoriaEliminada: (id: string) => void;
}

export default function CategoriasModule({
  categorias,
  productos,
  onCategoriaGuardada,
  onCategoriaEliminada,
}: CategoriasProps) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [color, setColor] = useState("#2563eb");
  const [guardando, setGuardando] = useState(false);

  const coloresPaleta = [
    "#2563eb", // blue
    "#0284c7", // sky
    "#10b981", // emerald
    "#d97706", // amber
    "#ea580c", // orange
    "#dc2626", // red
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#475569", // slate
  ];

  const abrirNuevo = () => {
    setEditandoId(null);
    setNombre("");
    setColor("#2563eb");
    setModalAbierto(true);
  };

  const abrirEditar = (cat: Categoria) => {
    setEditandoId(cat.id);
    setNombre(cat.nombre);
    setColor(cat.color || "#2563eb");
    setModalAbierto(true);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setGuardando(true);

    try {
      const payload = {
        nombre: nombre.trim(),
        color,
        activo: true,
      };

      if (editandoId) {
        const { data, error } = await supabase
          .from("categorias")
          .update(payload)
          .eq("id", editandoId)
          .select()
          .single();

        if (error) throw error;
        onCategoriaGuardada(data);
      } else {
        const { data, error } = await supabase
          .from("categorias")
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        onCategoriaGuardada(data);
      }

      setModalAbierto(false);
    } catch (err: unknown) {
      alert("Error: " + (err instanceof Error ? err.message : "Error"));
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar esta categoría?")) return;
    try {
      const { error } = await supabase.from("categorias").delete().eq("id", id);
      if (error) throw error;
      onCategoriaEliminada(id);
    } catch (err: unknown) {
      alert("No se puede eliminar porque tiene productos asignados.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div>
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Familias y Categorías</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Organiza tus productos para ventas más rápidas en el POS
          </p>
        </div>
        <button
          onClick={abrirNuevo}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nueva Categoría
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {categorias.map((cat) => {
          const conteo = productos.filter((p) => p.categoria_id === cat.id).length;
          return (
            <div
              key={cat.id}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-sm"
                    style={{ backgroundColor: cat.color }}
                  >
                    <Tags className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{cat.nombre}</h4>
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                      {conteo} productos
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 flex items-center justify-end gap-1.5">
                <button
                  onClick={() => abrirEditar(cat)}
                  className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => eliminar(cat.id)}
                  className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={guardar}
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 dark:border-slate-800"
          >
            <div className="p-4 bg-slate-900 text-white font-bold text-sm">
              {editandoId ? "Editar Categoría" : "Nueva Categoría"}
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Abarrotes, Bebidas..."
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Color Identificador</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {coloresPaleta.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full transition flex items-center justify-center cursor-pointer ${
                        color === c ? "ring-2 ring-offset-2 ring-slate-800 dark:ring-slate-200 scale-110" : ""
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {color === c && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </button>
                  ))}
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
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
