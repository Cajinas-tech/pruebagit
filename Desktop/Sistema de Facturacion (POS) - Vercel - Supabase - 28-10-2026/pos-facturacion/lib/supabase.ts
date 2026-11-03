import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Producto, Categoria, Cliente, ConfiguracionNegocio } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ycjfdkgqoynznxrcdiev.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_f9ZqgbJegJS3I9OVXWiEWg_AYzQsMcV";

export const isSupabaseConfigured =
  Boolean(supabaseUrl && supabaseAnonKey) &&
  !supabaseUrl.includes("tu-proyecto.supabase.co");

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export * from "./types";
export * from "./currency";

export const CONFIGURACION_DEFAULT: ConfiguracionNegocio = {
  id: "cfg-1",
  nombre_comercial: "Comercial Nicaragua POS",
  razon_social: "Comercial Nicaragua S.A.",
  ruc: "J0310000001234",
  telefono: "+505 2222-3333",
  whatsapp: "+505 8888-9999",
  direccion: "De los semáforos de Plaza Inter, 2c al lago, Managua",
  tasa_cambio_oficial: 36.80,
  iva_porcentaje: 15.00,
  pie_ticket: "¡Gracias por su compra! Factura Simplificada en Córdobas (C$)",
};

export const CATEGORIAS_DEMO: Categoria[] = [
  { id: "cat-1", nombre: "Bebidas y Refrescos", icono: "CupSoda", color: "#0284c7", activo: true },
  { id: "cat-2", nombre: "Granos Básicos y Abarrotes", icono: "Wheat", color: "#d97706", activo: true },
  { id: "cat-3", nombre: "Lácteos y Derivados", icono: "Milk", color: "#eab308", activo: true },
  { id: "cat-4", nombre: "Snacks y Golosinas", icono: "Candy", color: "#ec4899", activo: true },
  { id: "cat-5", nombre: "Limpieza del Hogar", icono: "Sparkles", color: "#10b981", activo: true },
];

export const CLIENTES_DEMO: Cliente[] = [
  {
    id: "cli-1",
    nombre_completo: "Consumidor Final (General)",
    tipo_identificacion: "consumidor_final",
    numero_identificacion: "000-000000-0000X",
    telefono: "2222-0000",
    whatsapp: "",
    direccion: "Managua, Nicaragua",
    limite_credito: 0,
    saldo_deudor: 0,
    dias_credito: 0,
    activo: true,
  },
  {
    id: "cli-2",
    nombre_completo: "Pulpería La Bendición - Doña Carmen",
    tipo_identificacion: "cedula",
    numero_identificacion: "001-140582-0008F",
    telefono: "8888-1234",
    whatsapp: "88881234",
    direccion: "Barrio Monseñor Lezcano, Managua",
    limite_credito: 15000,
    saldo_deudor: 3250,
    dias_credito: 15,
    activo: true,
  },
  {
    id: "cli-3",
    nombre_completo: "Distribuidora El Éxito Rivas",
    tipo_identificacion: "ruc",
    numero_identificacion: "J0310000129845",
    telefono: "2563-9988",
    whatsapp: "87654321",
    direccion: "Rotonda Rivas, 1c al este, Rivas",
    limite_credito: 50000,
    saldo_deudor: 12400,
    dias_credito: 30,
    activo: true,
  },
];

export const PRODUCTOS_DEMO: Producto[] = [
  {
    id: "prod-1",
    codigo_barras: "7501055300075",
    nombre: "Coca-Cola Vidrio Retornable 500ml",
    categoria_id: "cat-1",
    unidad_medida: "Unidad",
    costo_promedio: 18.00,
    precio_venta: 25.00,
    aplica_iva: true,
    stock_minimo: 24,
    stock: 72,
    activo: true,
  },
  {
    id: "prod-2",
    codigo_barras: "7501000111201",
    nombre: "Arroz Grano Entero 80/20 Libra",
    categoria_id: "cat-2",
    unidad_medida: "Libra",
    costo_promedio: 19.50,
    precio_venta: 24.00,
    aplica_iva: false, // Exento canasta básica
    stock_minimo: 50,
    stock: 220,
    activo: true,
  },
  {
    id: "prod-3",
    codigo_barras: "7501031311309",
    nombre: "Frijol Rojo Nacional Libra",
    categoria_id: "cat-2",
    unidad_medida: "Libra",
    costo_promedio: 28.00,
    precio_venta: 34.00,
    aplica_iva: false, // Exento
    stock_minimo: 40,
    stock: 180,
    activo: true,
  },
  {
    id: "prod-4",
    codigo_barras: "7501059200128",
    nombre: "Aceite Ideal Soya 800ml",
    categoria_id: "cat-2",
    unidad_medida: "Unidad",
    costo_promedio: 42.00,
    precio_venta: 55.00,
    aplica_iva: false,
    stock_minimo: 15,
    stock: 45,
    activo: true,
  },
  {
    id: "prod-5",
    codigo_barras: "7501011123456",
    nombre: "Leche Parmalat Entera 1 Litro",
    categoria_id: "cat-3",
    unidad_medida: "Litro",
    costo_promedio: 36.00,
    precio_venta: 46.00,
    aplica_iva: false,
    stock_minimo: 20,
    stock: 60,
    activo: true,
  },
  {
    id: "prod-6",
    codigo_barras: "7501022234567",
    nombre: "Cerveza Toña 12oz Lata",
    categoria_id: "cat-1",
    unidad_medida: "Unidad",
    costo_promedio: 38.00,
    precio_venta: 50.00,
    aplica_iva: true, // Gravada 15%
    stock_minimo: 24,
    stock: 96,
    activo: true,
  },
];
