"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  supabase,
  isSupabaseConfigured,
  Producto,
  Categoria,
  Cliente,
  Factura,
  SesionCaja,
  CreditoCuenta,
  ConfiguracionNegocio,
  ModuloId,
  ItemCarrito,
  PRODUCTOS_DEMO,
  CATEGORIAS_DEMO,
  CLIENTES_DEMO,
  CONFIGURACION_DEFAULT,
} from "@/lib/supabase";

import Sidebar from "@/components/shared/Sidebar";
import Header from "@/components/shared/Header";
import TicketTermico from "@/components/print/TicketTermico";

// Los 11 Módulos
import DashboardModule from "@/components/modules/DashboardModule";
import CatalogoModule from "@/components/modules/CatalogoModule";
import PosModule from "@/components/modules/PosModule";
import FacturasModule from "@/components/modules/FacturasModule";
import CajaModule from "@/components/modules/CajaModule";
import ProductosModule from "@/components/modules/ProductosModule";
import CategoriasModule from "@/components/modules/CategoriasModule";
import InventarioModule from "@/components/modules/InventarioModule";
import CreditosModule from "@/components/modules/CreditosModule";
import ClientesModule from "@/components/modules/ClientesModule";
import AdministracionModule from "@/components/modules/AdministracionModule";

export default function PosMasterPage() {
  const router = useRouter();

  // Estado de navegación
  const [moduloActivo, setModuloActivo] = useState<ModuloId>("dashboard");
  const [usuarioEmail, setUsuarioEmail] = useState<string | null>(null);
  const [cargandoInicial, setCargandoInicial] = useState(true);

  // Estados principales de datos
  const [config, setConfig] = useState<ConfiguracionNegocio>(CONFIGURACION_DEFAULT);
  const [productos, setProductos] = useState<Producto[]>(PRODUCTOS_DEMO);
  const [categorias, setCategorias] = useState<Categoria[]>(CATEGORIAS_DEMO);
  const [clientes, setClientes] = useState<Cliente[]>(CLIENTES_DEMO);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [creditos, setCreditos] = useState<CreditoCuenta[]>([]);
  const [sesionCaja, setSesionCaja] = useState<SesionCaja | null>(null);

  // Carrito persistente entre cambios de módulo en el POS
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);

  // Modal de Ticket Térmico
  const [ticketParaImprimir, setTicketParaImprimir] = useState<Factura | null>(null);

  // Cargar datos desde Supabase
  const cargarDatos = useCallback(async () => {
    try {
      // 1. Configuración de Negocio
      const { data: cfgData } = await supabase
        .from("configuracion_negocio")
        .select("*")
        .limit(1)
        .single();
      if (cfgData) setConfig(cfgData);

      // 2. Categorías
      const { data: catData } = await supabase
        .from("categorias")
        .select("*")
        .order("nombre", { ascending: true });
      if (catData && catData.length > 0) setCategorias(catData);

      // 3. Productos
      const { data: prodData } = await supabase
        .from("productos")
        .select("*, categoria:categorias(*)")
        .order("nombre", { ascending: true });
      if (prodData && prodData.length > 0) {
        setProductos(
          prodData.map((p) => ({
            ...p,
            precio_venta: Number(p.precio_venta),
            costo_promedio: Number(p.costo_promedio || 0),
            stock: Number(p.stock),
            stock_minimo: Number(p.stock_minimo || 5),
          }))
        );
      }

      // 4. Clientes
      const { data: cliData } = await supabase
        .from("clientes")
        .select("*")
        .order("nombre_completo", { ascending: true });
      if (cliData && cliData.length > 0) setClientes(cliData);

      // 5. Facturas
      const { data: facData } = await supabase
        .from("facturas")
        .select("*, cliente:clientes(*)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (facData) {
        setFacturas(
          facData.map((f) => ({
            ...f,
            subtotal: Number(f.subtotal),
            monto_iva: Number(f.monto_iva),
            total: Number(f.total),
            tasa_cambio_aplicada: Number(f.tasa_cambio_aplicada || 36.8),
          }))
        );
      }

      // 6. Sesión de Caja Activa
      const { data: cajaData } = await supabase
        .from("sesiones_caja")
        .select("*")
        .eq("estado", "abierta")
        .order("fecha_apertura", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cajaData) setSesionCaja(cajaData);

      // 7. Créditos y Cuentas por Cobrar
      const { data: credData } = await supabase
        .from("creditos_cuentas")
        .select("*, cliente:clientes(*), factura:facturas(*)")
        .order("created_at", { ascending: false });
      if (credData) {
        setCreditos(
          credData.map((c) => ({
            ...c,
            monto_total: Number(c.monto_total),
            saldo_pendiente: Number(c.saldo_pendiente),
          }))
        );
      }
    } catch (err) {
      console.warn("Aviso al cargar datos de Supabase:", err);
    } finally {
      setCargandoInicial(false);
    }
  }, []);

  // Verificar sesión y autenticación
  useEffect(() => {
    async function inicializar() {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setUsuarioEmail(data.session.user.email ?? "operador@pos.ni");
      }
      await cargarDatos();
    }
    inicializar();
  }, [cargarDatos]);

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  // Manejar cuando se añade un producto desde el Catálogo al carrito del POS
  const agregarDesdeCatalogoAlPOS = (producto: Producto) => {
    setCarrito((prev) => {
      const index = prev.findIndex((item) => item.producto.id === producto.id);
      if (index >= 0) {
        const item = prev[index];
        const copia = [...prev];
        copia[index] = {
          ...item,
          cantidad: item.cantidad + 1,
          subtotal: Number(((item.cantidad + 1) * item.precio_unitario).toFixed(2)),
        };
        return copia;
      }
      return [
        ...prev,
        {
          producto,
          cantidad: 1,
          precio_unitario: producto.precio_venta,
          costo_unitario: producto.costo_promedio || 0,
          aplica_iva: producto.aplica_iva,
          subtotal: producto.precio_venta,
        },
      ];
    });
    // Navegar directamente a POS para ver la orden
    setModuloActivo("pos");
  };

  // Conteo de alertas
  const alertasStockCount = productos.filter((p) => p.stock <= p.stock_minimo).length;
  const creditosPendientesCount = creditos.filter((c) => c.estado !== "pagado").length;

  // Metadata por módulo para el Header
  const moduloInfo: Record<ModuloId, { titulo: string; subtitulo: string }> = {
    dashboard: {
      titulo: "1. Panel Central (Dashboard)",
      subtitulo: "Estadísticas generales, gráficos de pastel y métricas en Córdobas (C$)",
    },
    catalogo: {
      titulo: "2. Catálogo de Productos",
      subtitulo: "Vitrina visual interactiva con precios y disponibilidad en tiempo real",
    },
    pos: {
      titulo: "3. Punto de Venta (POS)",
      subtitulo: "Cobro rápido con pistola de código de barras, vuelto en C$ y cálculo USD",
    },
    facturas: {
      titulo: "4. Auditoría de Facturas",
      subtitulo: "Historial de facturación, comprobantes emitidos y anulación",
    },
    caja: {
      titulo: "5. Control de Caja",
      subtitulo: "Aperturas de turno, gastos menores, Corte X y arqueo con Corte Z",
    },
    productos: {
      titulo: "6. Gestión de Productos",
      subtitulo: "Maestro de artículos, márgenes de ganancia, unidades de medida e IVA",
    },
    categorias: {
      titulo: "7. Categorías",
      subtitulo: "Familias de artículos y colores identificadores para el POS",
    },
    inventario: {
      titulo: "8. Inventario & Movimientos (PEPS)",
      subtitulo: "Control de Lotes, Primeras Entradas Primeras Salidas (FIFO) y Kardex de Auditoría",
    },
    creditos: {
      titulo: "9. Créditos y Cuentas por Cobrar",
      subtitulo: "Control de clientes al crédito, plazos de pago y registro de abonos",
    },
    clientes: {
      titulo: "10. Gestión de Clientes",
      subtitulo: "Padrón con Cédula Nicaragüense, RUC, WhatsApp y límites autorizados",
    },
    administracion: {
      titulo: "11. Administración del Sistema",
      subtitulo: "Ajustes de empresa, RUC, tasa oficial BCN y formato de comprobante",
    },
  };

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950 overflow-hidden text-slate-800 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* 1. SIDEBAR DE NAVEGACIÓN MODULAR */}
      <Sidebar
        moduloActivo={moduloActivo}
        onSeleccionarModulo={(mod) => setModuloActivo(mod)}
        cajaAbierta={sesionCaja?.estado === "abierta"}
        alertasStockCount={alertasStockCount}
        creditosPendientesCount={creditosPendientesCount}
        onLogout={cerrarSesion}
        usuarioEmail={usuarioEmail}
      />

      {/* 2. ÁREA DE CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-100 dark:bg-slate-950">
        {/* Header Superior Dinámico */}
        <Header
          titulo={moduloInfo[moduloActivo].titulo}
          subtitulo={moduloInfo[moduloActivo].subtitulo}
          config={config}
          sesionCaja={sesionCaja}
          onIrAModulo={(m) => setModuloActivo(m)}
          alertasStockCount={alertasStockCount}
        />

        {/* Vista del Módulo Activo */}
        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-100 dark:bg-slate-950">
          {moduloActivo === "dashboard" && (
            <DashboardModule
              productos={productos}
              facturas={facturas}
              categorias={categorias}
              creditos={creditos}
              sesionCaja={sesionCaja}
              onIrAModulo={(m) => setModuloActivo(m)}
            />
          )}

          {moduloActivo === "catalogo" && (
            <CatalogoModule
              productos={productos}
              categorias={categorias}
              config={config}
              onAgregarAlCarrito={agregarDesdeCatalogoAlPOS}
            />
          )}

          {moduloActivo === "pos" && (
            <PosModule
              productos={productos}
              clientes={clientes}
              sesionCaja={sesionCaja}
              config={config}
              carrito={carrito}
              setCarrito={setCarrito}
              onVentaCompletada={(nuevaFac) => {
                setFacturas((prev) => [nuevaFac, ...prev]);
                cargarDatos();
              }}
              onAbrirTicket={(fac) => setTicketParaImprimir(fac)}
              onIrACaja={() => setModuloActivo("caja")}
            />
          )}

          {moduloActivo === "facturas" && (
            <FacturasModule
              facturas={facturas}
              config={config}
              onAbrirTicket={(fac) => setTicketParaImprimir(fac)}
              onFacturaAnulada={(facId) => {
                setFacturas((prev) =>
                  prev.map((f) => (f.id === facId ? { ...f, estado: "anulada" } : f))
                );
                cargarDatos();
              }}
            />
          )}

          {moduloActivo === "caja" && (
            <CajaModule
              sesionCaja={sesionCaja}
              facturas={facturas}
              config={config}
              onActualizarSesion={(nuevaSesion) => setSesionCaja(nuevaSesion)}
            />
          )}

          {moduloActivo === "productos" && (
            <ProductosModule
              productos={productos}
              categorias={categorias}
              onProductoGuardado={() => cargarDatos()}
              onProductoEliminado={() => cargarDatos()}
            />
          )}

          {moduloActivo === "categorias" && (
            <CategoriasModule
              categorias={categorias}
              productos={productos}
              onCategoriaGuardada={() => cargarDatos()}
              onCategoriaEliminada={() => cargarDatos()}
            />
          )}

          {moduloActivo === "inventario" && (
            <InventarioModule
              productos={productos}
              onActualizarProductos={() => cargarDatos()}
            />
          )}

          {moduloActivo === "creditos" && (
            <CreditosModule
              creditos={creditos}
              clientes={clientes}
              config={config}
              onActualizarCreditos={() => cargarDatos()}
            />
          )}

          {moduloActivo === "clientes" && (
            <ClientesModule
              clientes={clientes}
              onClienteGuardado={() => cargarDatos()}
              onClienteEliminado={() => cargarDatos()}
            />
          )}

          {moduloActivo === "administracion" && (
            <AdministracionModule
              config={config}
              onConfigActualizada={(nuevaConfig) => setConfig(nuevaConfig)}
            />
          )}
        </main>
      </div>

      {/* 3. MODAL DE IMPRESIÓN DE TICKET TÉRMICO */}
      {ticketParaImprimir && (
        <TicketTermico
          factura={ticketParaImprimir}
          config={config}
          onCerrar={() => setTicketParaImprimir(null)}
        />
      )}
    </div>
  );
}
