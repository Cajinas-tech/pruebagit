/**
 * Utilidades monetarias y de formato para Nicaragua (Córdobas C$ / USD / BCN)
 */

export function formatoCordobas(monto: number): string {
  if (isNaN(monto) || monto === null || monto === undefined) return "C$ 0.00";
  return new Intl.NumberFormat("es-NI", {
    style: "currency",
    currency: "NIO",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(monto)
    .replace("NIO", "C$");
}

export function formatoDolares(monto: number): string {
  if (isNaN(monto) || monto === null || monto === undefined) return "$ 0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(monto);
}

/**
 * Convierte monto en dólares a Córdobas usando la tasa oficial del Banco Central de Nicaragua
 */
export function convertirUSDaNIO(montoUSD: number, tasaBCN: number): number {
  return Number((montoUSD * tasaBCN).toFixed(2));
}

/**
 * Convierte Córdobas a Dólares
 */
export function convertirNIOaUSD(montoNIO: number, tasaBCN: number): number {
  if (!tasaBCN || tasaBCN <= 0) return 0;
  return Number((montoNIO / tasaBCN).toFixed(2));
}

/**
 * Formatea fechas a horario local de Nicaragua
 */
export function formatoFechaNica(fechaStr?: string | Date): string {
  if (!fechaStr) return "-";
  const fecha = typeof fechaStr === "string" ? new Date(fechaStr) : fechaStr;
  return new Intl.DateTimeFormat("es-NI", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(fecha);
}

/**
 * Validador sintáctico simple para Cédula Nicaragüense (formato 001-000000-0000X)
 */
export function esCedulaNicaValida(cedula: string): boolean {
  const limpia = cedula.replace(/[-\s]/g, "");
  return /^[0-9]{13}[A-Z]$/i.test(limpia);
}

/**
 * Validador sintáctico simple para RUC Nicaragüense (ej. J0310000001234)
 */
export function esRUCValido(ruc: string): boolean {
  const limpia = ruc.replace(/[-\s]/g, "");
  return /^[A-Z0-9]{14}$/i.test(limpia);
}
