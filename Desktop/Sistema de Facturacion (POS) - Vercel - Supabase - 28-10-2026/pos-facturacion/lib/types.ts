export interface ConfiguracionNegocio {
  id: string;
  nombre_comercial: string;
  razon_social: string;
  ruc: string;
  telefono: string;
  whatsapp: string;
  direccion: string;
  tasa_cambio_oficial: number; // Ej: 36.80 C$ por USD
  iva_porcentaje: number; // Ej: 15%
  pie_ticket: string;
  updated_at?: string;
}

export interface Categoria {
  id: string;
  nombre: string;
  descripcion?: string;
  icono: string;
  color: string;
  activo: boolean;
  created_at?: string;
}

export interface Cliente {
  id: string;
  nombre_completo: string;
  tipo_identificacion: "cedula" | "ruc" | "consumidor_final";
  numero_identificacion: string;
  telefono?: string;
  whatsapp?: string;
  direccion?: string;
  limite_credito: number;
  saldo_deudor: number;
  dias_credito: number;
  activo: boolean;
  created_at?: string;
}

export interface ProductoLote {
  id: string;
  producto_id: string;
  numero_lote: string;
  fecha_vencimiento?: string;
  costo_unitario: number;
  cantidad_inicial: number;
  cantidad_disponible: number;
  fecha_ingreso: string;
}

export interface Producto {
  id: string;
  codigo_barras: string;
  nombre: string;
  categoria_id?: string;
  categoria?: Categoria;
  unidad_medida: string; // Unidad, Libra, Litro, Docena, Quintal
  costo_promedio: number;
  precio_venta: number; // En Córdobas C$
  aplica_iva: boolean; // Gravado 15% o Exento
  stock_minimo: number;
  stock: number; // Stock consolidado actual
  imagen_url?: string;
  activo: boolean;
  lotes?: ProductoLote[];
  created_at?: string;
}

export interface ItemCarrito {
  producto: Producto;
  cantidad: number;
  precio_unitario: number;
  costo_unitario: number;
  aplica_iva: boolean;
  subtotal: number;
}

export interface SesionCaja {
  id: string;
  cajero_nombre: string;
  monto_apertura: number;
  monto_apertura_usd: number;
  monto_cierre_declarado?: number;
  monto_cierre_sistema?: number;
  diferencia?: number;
  estado: "abierta" | "cerrada";
  fecha_apertura: string;
  fecha_cierre?: string;
  notas?: string;
}

export interface MovimientoCaja {
  id: string;
  sesion_caja_id: string;
  tipo: "ingreso" | "egreso";
  concepto: string;
  monto: number;
  created_at: string;
}

export interface DetalleFactura {
  id: string;
  factura_id: string;
  producto_id: string;
  producto?: Producto;
  lote_id?: string;
  lote?: ProductoLote;
  cantidad: number;
  precio_unitario: number;
  costo_unitario: number;
  subtotal: number;
}

export interface Factura {
  id: string;
  numero_factura: number;
  sesion_caja_id?: string;
  cliente_id?: string;
  cliente?: Cliente;
  condicion_venta: "contado" | "credito";
  metodo_pago:
    | "efectivo_cordobas"
    | "efectivo_dolares"
    | "tarjeta"
    | "transferencia"
    | "mixto"
    | "al_credito";
  subtotal: number;
  monto_iva: number;
  total: number;
  monto_recibido_cordobas: number;
  monto_recibido_dolares: number;
  cambio_devuelto_cordobas: number;
  tasa_cambio_aplicada: number;
  estado: "emitida" | "anulada";
  created_at: string;
  detalles?: DetalleFactura[];
}

export interface KardexMovimiento {
  id: string;
  producto_id: string;
  producto?: Producto;
  lote_id?: string;
  lote?: ProductoLote;
  tipo_movimiento:
    | "ENTRADA_COMPRA"
    | "SALIDA_VENTA"
    | "AJUSTE_POSITIVO"
    | "AJUSTE_NEGATIVO"
    | "ANULACION_VENTA";
  cantidad: number;
  costo_unitario: number;
  saldo_cantidad: number;
  referencia_documento?: string;
  created_at: string;
}

export interface CreditoCuenta {
  id: string;
  factura_id: string;
  factura?: Factura;
  cliente_id: string;
  cliente?: Cliente;
  monto_total: number;
  saldo_pendiente: number;
  fecha_vencimiento: string;
  estado: "pendiente" | "pagado" | "vencido";
  created_at: string;
}

export interface AbonoCredito {
  id: string;
  credito_id: string;
  numero_recibo: number;
  monto_abonado: number;
  metodo_pago: string;
  notas?: string;
  created_at: string;
}

export type ModuloId =
  | "dashboard"
  | "catalogo"
  | "pos"
  | "facturas"
  | "caja"
  | "productos"
  | "categorias"
  | "inventario"
  | "creditos"
  | "clientes"
  | "administracion";
