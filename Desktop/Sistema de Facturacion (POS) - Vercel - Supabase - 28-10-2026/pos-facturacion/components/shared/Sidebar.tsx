"use client";

import React from "react";
import {
  LayoutDashboard,
  ShoppingBag,
  ShoppingCart,
  Receipt,
  Wallet,
  Package,
  Tags,
  Boxes,
  CreditCard,
  Users,
  Settings,
  ChevronRight,
  LogOut,
  Building2,
} from "lucide-react";
import { ModuloId } from "@/lib/types";

interface SidebarProps {
  moduloActivo: ModuloId;
  onSeleccionarModulo: (id: ModuloId) => void;
  cajaAbierta: boolean;
  alertasStockCount: number;
  creditosPendientesCount: number;
  onLogout: () => void;
  usuarioEmail: string | null;
}

interface ItemMenu {
  id: ModuloId;
  numero: number;
  nombre: string;
  descripcion: string;
  icono: React.ElementType;
  badge?: string | number;
  badgeColor?: string;
}

export default function Sidebar({
  moduloActivo,
  onSeleccionarModulo,
  cajaAbierta,
  alertasStockCount,
  creditosPendientesCount,
  onLogout,
  usuarioEmail,
}: SidebarProps) {
  const items: ItemMenu[] = [
    {
      id: "dashboard",
      numero: 1,
      nombre: "Panel Central",
      descripcion: "Estadísticas y Gráficos",
      icono: LayoutDashboard,
    },
    {
      id: "catalogo",
      numero: 2,
      nombre: "Catálogo",
      descripcion: "Vitrina de Productos",
      icono: ShoppingBag,
    },
    {
      id: "pos",
      numero: 3,
      nombre: "Ventas (POS)",
      descripcion: "Caja Rápida Córdobas/USD",
      icono: ShoppingCart,
      badge: "F2",
      badgeColor: "bg-emerald-500 text-white",
    },
    {
      id: "facturas",
      numero: 4,
      nombre: "Facturas",
      descripcion: "Historial y Comprobantes",
      icono: Receipt,
    },
    {
      id: "caja",
      numero: 5,
      nombre: "Control de Caja",
      descripcion: "Arqueos, Cortes X y Z",
      icono: Wallet,
      badge: cajaAbierta ? "Abierta" : "Cerrada",
      badgeColor: cajaAbierta ? "bg-emerald-600 text-white" : "bg-red-500 text-white",
    },
    {
      id: "productos",
      numero: 6,
      nombre: "Productos",
      descripcion: "Precios y Catálogo Base",
      icono: Package,
    },
    {
      id: "categorias",
      numero: 7,
      nombre: "Categorías",
      descripcion: "Familias de Productos",
      icono: Tags,
    },
    {
      id: "inventario",
      numero: 8,
      nombre: "Inventario & Kardex",
      descripcion: "PEPS / Lotes y Stock",
      icono: Boxes,
      badge: alertasStockCount > 0 ? alertasStockCount : undefined,
      badgeColor: "bg-amber-500 text-white",
    },
    {
      id: "creditos",
      numero: 9,
      nombre: "Créditos & Cuentas",
      descripcion: "Cuentas por Cobrar (CxC)",
      icono: CreditCard,
      badge: creditosPendientesCount > 0 ? creditosPendientesCount : undefined,
      badgeColor: "bg-blue-500 text-white",
    },
    {
      id: "clientes",
      numero: 10,
      nombre: "Clientes",
      descripcion: "Cédula / RUC / WhatsApp",
      icono: Users,
    },
    {
      id: "administracion",
      numero: 11,
      nombre: "Administración",
      descripcion: "Ajustes DGI, BCN, Ticket",
      icono: Settings,
    },
  ];

  return (
    <aside className="w-72 bg-slate-900 text-slate-200 flex flex-col h-screen border-r border-slate-800 select-none shadow-xl flex-shrink-0">
      {/* Brand & Nicaragua Banner */}
      <div className="p-4 border-b border-slate-800 bg-gradient-to-r from-slate-950 to-slate-900">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 font-bold text-xl">
            🇳🇮
          </div>
          <div>
            <h1 className="font-bold text-white text-base leading-tight tracking-tight">
              POS Nicaragua
            </h1>
            <p className="text-xs text-blue-400 font-medium">
              Facturación & PEPS (C$)
            </p>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1 custom-scrollbar">
        <div className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase px-3 py-1">
          Módulos del Sistema
        </div>
        {items.map((item) => {
          const Icon = item.icono;
          const activo = moduloActivo === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSeleccionarModulo(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all text-sm group ${
                activo
                  ? "bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/25"
                  : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`p-2 rounded-lg transition-colors ${
                    activo
                      ? "bg-blue-700/60 text-white"
                      : "bg-slate-800 text-slate-400 group-hover:text-blue-400 group-hover:bg-slate-700/60"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] opacity-75 font-mono">
                      {item.numero}.
                    </span>
                    <span className="truncate">{item.nombre}</span>
                  </div>
                  <div
                    className={`text-[11px] truncate font-normal ${
                      activo ? "text-blue-100/90" : "text-slate-400"
                    }`}
                  >
                    {item.descripcion}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      item.badgeColor || "bg-slate-700 text-slate-200"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {activo && <ChevronRight className="w-4 h-4 opacity-70" />}
              </div>
            </button>
          );
        })}
      </nav>

      {/* User Session Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/70">
        <div className="flex items-center justify-between px-2 py-1.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-blue-400">
              {usuarioEmail ? usuarioEmail.substring(0, 2).toUpperCase() : "NI"}
            </div>
            <div className="truncate text-xs">
              <div className="font-semibold text-slate-200 truncate">
                {usuarioEmail ? usuarioEmail.split("@")[0] : "Operador"}
              </div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                En Línea
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            title="Cerrar sesión"
            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
