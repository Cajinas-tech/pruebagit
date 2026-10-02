/**
 * Utilidades de cálculo laboral según la legislación de Nicaragua
 * Código del Trabajo de la República de Nicaragua - Ley N° 185
 * Artículo 76: "Todo trabajador tiene derecho a quince días de descanso remunerado
 * por cada seis meses de trabajo continuo al servicio de un mismo empleador...
 * o la parte proporcional que corresponda (2.5 días por cada mes laborado)".
 */

import { 
  ParametrosCalculoAumento, 
  ResultadoCalculoAumento,
  RegistroHistorialDescanso,
  ResumenHistorialDescansos,
  FiltrosHistorialDescanso,
  TipoDescansoHistorial,
  SolicitudVacaciones,
  Empleado,
  EmpresaInfo
} from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ResultadoCalculoVacaciones {
  mesesCompletos: number;
  diasAdicionales: number;
  acumulados: number;
  disponibles: number;
  diasTomados: number;
  antiguedadTexto: string;
}

export const calcularVacacionesNica = (
  fechaIngresoStr: string,
  diasTomados: number = 0,
  fechaCorte: Date = new Date()
): ResultadoCalculoVacaciones => {
  if (!fechaIngresoStr) {
    return {
      mesesCompletos: 0,
      diasAdicionales: 0,
      acumulados: 0,
      disponibles: 0,
      diasTomados,
      antiguedadTexto: 'Fecha no válida'
    };
  }

  // Parsear fecha de ingreso evitando desfases de timezone
  const partes = fechaIngresoStr.split('-');
  const añoIngreso = parseInt(partes[0], 10);
  const mesIngreso = parseInt(partes[1], 10) - 1; // 0-indexed
  const diaIngreso = parseInt(partes[2], 10);
  const fechaIngreso = new Date(añoIngreso, mesIngreso, diaIngreso);

  if (fechaIngreso > fechaCorte) {
    return {
      mesesCompletos: 0,
      diasAdicionales: 0,
      acumulados: 0,
      disponibles: 0,
      diasTomados,
      antiguedadTexto: 'Ingreso futuro'
    };
  }

  // Diferencia de años y meses
  let años = fechaCorte.getFullYear() - fechaIngreso.getFullYear();
  let meses = fechaCorte.getMonth() - fechaIngreso.getMonth();
  let dias = fechaCorte.getDate() - fechaIngreso.getDate();

  if (dias < 0) {
    meses -= 1;
    // Días del mes anterior
    const ultimoDiaMesAnterior = new Date(fechaCorte.getFullYear(), fechaCorte.getMonth(), 0).getDate();
    dias += ultimoDiaMesAnterior;
  }

  if (meses < 0) {
    años -= 1;
    meses += 12;
  }

  const totalMeses = (años * 12) + meses;
  // Fracción de días del mes incompleto (base comercial laboral 30 días)
  const fraccionMes = Math.min(dias, 30) / 30;
  const tiempoLaboradoMeses = totalMeses + fraccionMes;

  // Tasa oficial en Nicaragua: 2.5 días por mes (30 días anuales)
  const diasAcumuladosTotales = Number((tiempoLaboradoMeses * 2.5).toFixed(2));
  const saldoDisponible = Number(Math.max(0, diasAcumuladosTotales - diasTomados).toFixed(2));

  // Generar texto descriptivo de antigüedad
  let antiguedadTexto = '';
  if (años > 0) antiguedadTexto += `${años} año${años > 1 ? 's' : ''} `;
  if (meses > 0) antiguedadTexto += `${meses} mes${meses > 1 ? 'es' : ''} `;
  if (dias > 0 || (años === 0 && meses === 0)) antiguedadTexto += `${dias} día${dias !== 1 ? 's' : ''}`;

  return {
    mesesCompletos: totalMeses,
    diasAdicionales: dias,
    acumulados: diasAcumuladosTotales,
    disponibles: saldoDisponible,
    diasTomados,
    antiguedadTexto: antiguedadTexto.trim()
  };
};

/**
 * Cálculo del valor monetario de las vacaciones acumuladas
 * Fórmula oficial nica: (Salario Mensual / 30) * Días Pendientes
 */
export const calcularLiquidacionMonetaria = (salarioMensual: number, diasPendientes: number) => {
  if (salarioMensual <= 0 || diasPendientes <= 0) {
    return {
      salarioDiario: 0,
      totalBruto: 0,
      inssLaboral: 0,
      irEstimado: 0,
      netoAPagar: 0
    };
  }

  const salarioDiario = Number((salarioMensual / 30).toFixed(2));
  const totalBruto = Number((salarioDiario * diasPendientes).toFixed(2));

  // Las vacaciones compensadas en dinero al término de contrato o adelanto especial
  // Generalmente están exentas de INSS según criterio laboral o sujetas si es salario ordinario
  return {
    salarioDiario,
    totalBruto,
    inssLaboral: 0,
    irEstimado: 0,
    netoAPagar: totalBruto
  };
};

/**
 * Formatear moneda nacional de Nicaragua: Córdobas (C$)
 */
export const formatearCordobas = (monto: number): string => {
  return new Intl.NumberFormat('es-NI', {
    style: 'currency',
    currency: 'NIO',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(monto).replace('NIO', 'C$');
};

/**
 * Calcular días calendario entre dos fechas (inclusive)
 */
export const calcularDiasEntreFechas = (fechaInicioStr: string, fechaFinStr: string): number => {
  if (!fechaInicioStr || !fechaFinStr) return 0;
  const fInicio = new Date(fechaInicioStr + 'T00:00:00');
  const fFin = new Date(fechaFinStr + 'T00:00:00');

  const diffMs = fFin.getTime() - fInicio.getTime();
  if (diffMs < 0) return 0;

  const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return diffDias;
};

export type MotivoTerminacionLaboral = 
  | 'despido_sin_causa' // Art. 45 - Indemnización obligatoria
  | 'renuncia_con_indemnizacion' // Convenio o política de tienda
  | 'mutuo_acuerdo' // Art. 45 por común acuerdo
  | 'despido_con_causa' // Art. 48 - Sin indemnización por falta grave
  | 'renuncia_simple'; // Renuncia voluntaria ordinaria

export interface ParametrosLiquidacionCompleta {
  fechaIngresoStr: string;
  fechaEgresoStr?: string; // Formato YYYY-MM-DD (por defecto hoy)
  salarioMensual: number;
  diasVacacionesPendientes?: number; // Saldo de días acumulados a compensar
  diasTomadosVacaciones?: number;
  diasSalarioPendientes?: number; // Días laborados en el período no pagados aún
  aplicaIndemnizacion?: boolean; // Forzar aplicación o descarte
  motivoTerminacion?: MotivoTerminacionLaboral;
  deduccionesExtras?: number; // Préstamos, adelantos, etc.
  retenerInssSalario?: boolean; // 7% INSS laboral sobre el salario pendiente
}

export interface ResultadoLiquidacionCompletaNica {
  fechaIngreso: string;
  fechaEgreso: string;
  salarioMensual: number;
  salarioDiario: number;

  antiguedad: {
    anios: number;
    meses: number;
    dias: number;
    totalMeses: number;
    texto: string;
  };

  // 1. Indemnización por Antigüedad (Art. 45 Código del Trabajo)
  indemnizacion: {
    aplica: boolean;
    motivo: MotivoTerminacionLaboral;
    diasCalculados: number;
    mesesEquivalentes: number;
    monto: number;
    topeAplicado: boolean;
    explicacion: string;
  };

  // 2. Vacaciones Acumuladas y Proporcionales (Art. 76 Código del Trabajo)
  vacaciones: {
    diasAcumuladosTotales: number;
    diasTomados: number;
    diasPendientes: number;
    monto: number;
    explicacion: string;
  };

  // 3. Aguinaldo Proporcional / Décimo Tercer Mes (Art. 93-99 Código del Trabajo)
  aguinaldo: {
    fechaInicioCiclo: string;
    fechaCorte: string;
    mesesComputados: number;
    diasComputados: number;
    diasAguinaldoAcumulados: number;
    monto: number;
    explicacion: string;
  };

  // 4. Salario Pendiente por Días Laborados
  salario: {
    diasLaborados: number;
    montoBruto: number;
    inssLaboral: number; // 7% sobre salario ordinario
    montoNeto: number;
    explicacion: string;
  };

  // Deducciones
  deducciones: {
    inssSalario: number;
    otrasDeducciones: number;
    totalDeducciones: number;
  };

  // Totales de Liquidación
  subtotalPrestaciones: number; // Indemnización + Vacaciones + Aguinaldo (Exentas de INSS)
  totalBruto: number; // Prestaciones + Salario
  netoAPagar: number; // totalBruto - totalDeducciones
}

/**
 * Función principal para el cálculo íntegro de liquidaciones laborales en Nicaragua
 * Implementa estrictamente:
 * 1. Indemnización por años de servicio (Art. 45 C.T.)
 * 2. Vacaciones acumuladas y proporcionales (Art. 76 C.T.)
 * 3. Aguinaldo proporcional / Décimo tercer mes (Art. 93-99 C.T.)
 * 4. Salario pendiente devengado (Base comercial 30 días)
 */
export const calcularLiquidacionCompletaNica = (
  params: ParametrosLiquidacionCompleta
): ResultadoLiquidacionCompletaNica => {
  const {
    fechaIngresoStr,
    fechaEgresoStr,
    salarioMensual,
    diasVacacionesPendientes,
    diasTomadosVacaciones = 0,
    diasSalarioPendientes = 0,
    aplicaIndemnizacion,
    motivoTerminacion = 'despido_sin_causa',
    deduccionesExtras = 0,
    retenerInssSalario = true
  } = params;

  // Fecha de Ingreso
  const partesIngreso = (fechaIngresoStr || '').split('-');
  const fIngreso = new Date(
    parseInt(partesIngreso[0] || '2023', 10),
    parseInt(partesIngreso[1] || '1', 10) - 1,
    parseInt(partesIngreso[2] || '1', 10)
  );

  // Fecha de Egreso / Corte
  let fEgreso: Date;
  if (fechaEgresoStr) {
    const partesEgreso = fechaEgresoStr.split('-');
    fEgreso = new Date(
      parseInt(partesEgreso[0], 10),
      parseInt(partesEgreso[1], 10) - 1,
      parseInt(partesEgreso[2], 10)
    );
  } else {
    fEgreso = new Date();
  }

  const fechaIngresoFormateada = fechaIngresoStr || fIngreso.toISOString().slice(0, 10);
  const fechaEgresoFormateada = fechaEgresoStr || fEgreso.toISOString().slice(0, 10);

  // Salario Diario (Base legal nicaragüense de 30 días comerciales por mes)
  const salarioDiario = Number((Math.max(0, salarioMensual) / 30).toFixed(2));

  // 1. CÁLCULO EXACTO DE ANTIGÜEDAD LABORAL
  let anios = fEgreso.getFullYear() - fIngreso.getFullYear();
  let meses = fEgreso.getMonth() - fIngreso.getMonth();
  let dias = fEgreso.getDate() - fIngreso.getDate();

  if (dias < 0) {
    meses -= 1;
    const diasMesAnterior = new Date(fEgreso.getFullYear(), fEgreso.getMonth(), 0).getDate();
    dias += diasMesAnterior;
  }

  if (meses < 0) {
    anios -= 1;
    meses += 12;
  }

  if (anios < 0 || (anios === 0 && meses === 0 && dias < 0)) {
    anios = 0;
    meses = 0;
    dias = 0;
  }

  const totalMesesCompletos = (anios * 12) + meses;
  const fraccionMes = Math.min(dias, 30) / 30;
  const totalMesesLaborados = totalMesesCompletos + fraccionMes;

  let antiguedadTexto = '';
  if (anios > 0) antiguedadTexto += `${anios} año${anios > 1 ? 's' : ''} `;
  if (meses > 0) antiguedadTexto += `${meses} mes${meses > 1 ? 'es' : ''} `;
  if (dias > 0 || (anios === 0 && meses === 0)) antiguedadTexto += `${dias} día${dias !== 1 ? 's' : ''}`;
  antiguedadTexto = antiguedadTexto.trim();

  // 2. INDEMNIZACIÓN POR ANTIGÜEDAD (Art. 45 Código del Trabajo)
  // Reglas:
  // - 1 mes por cada año trabajado en los primeros 3 años (fracciones proporcionales: 2.5 días/mes)
  // - 20 días por cada año adicional a partir del 4to año (fracciones proporcionales: 1.6667 días/mes)
  // - Tope máximo: 5 meses de salario (150 días de salario)
  // - No aplica si es despido con causa justa (Art. 48) o renuncia voluntaria sin indemnización
  const debeAplicarIndemnizacion = aplicaIndemnizacion !== undefined 
    ? aplicaIndemnizacion 
    : (motivoTerminacion === 'despido_sin_causa' || motivoTerminacion === 'renuncia_con_indemnizacion' || motivoTerminacion === 'mutuo_acuerdo');

  let diasIndemnizacionCalculados = 0;
  let topeIndemnizacionAplicado = false;
  let explicacionIndemnizacion = '';

  if (debeAplicarIndemnizacion && totalMesesLaborados > 0) {
    if (anios < 3) {
      // Menos de 3 años: 30 días de salario por año laborado (2.5 días por mes)
      diasIndemnizacionCalculados = (anios * 30) + (meses * 2.5) + (Math.min(dias, 30) * (2.5 / 30));
      explicacionIndemnizacion = `Primeros 3 años: 1 mes de salario por año (${anios}a, ${meses}m, ${dias}d).`;
    } else {
      // 3 años o más: 90 días por los primeros 3 años + 20 días por año adicional
      const diasPrimeros3 = 90;
      const aniosAdicionales = anios - 3;
      const diasAniosAdicionales = aniosAdicionales * 20;
      const diasMesesAdicionales = meses * (20 / 12);
      const diasDiasAdicionales = Math.min(dias, 30) * (20 / 360);
      diasIndemnizacionCalculados = diasPrimeros3 + diasAniosAdicionales + diasMesesAdicionales + diasDiasAdicionales;
      explicacionIndemnizacion = `3 meses (90 días) por los 1ros 3 años + 20 días por cada año adicional (${aniosAdicionales}a, ${meses}m, ${dias}d).`;
    }

    // Tope legal de 5 meses (150 días)
    const TOPE_DIAS = 150;
    if (diasIndemnizacionCalculados >= TOPE_DIAS) {
      diasIndemnizacionCalculados = TOPE_DIAS;
      topeIndemnizacionAplicado = true;
      explicacionIndemnizacion += ' Aplica el tope legal máximo de 5 meses de salario.';
    }
  } else {
    explicacionIndemnizacion = debeAplicarIndemnizacion 
      ? 'Sin antigüedad acumulada computable.'
      : 'No aplica indemnización por motivo de terminación (Art. 48 o renuncia simple).';
  }

  const diasIndemnizacionFinal = Number(diasIndemnizacionCalculados.toFixed(2));
  const mesesEquivalentesIndemnizacion = Number((diasIndemnizacionFinal / 30).toFixed(2));
  const montoIndemnizacion = Number((diasIndemnizacionFinal * salarioDiario).toFixed(2));

  // 3. VACACIONES ACUMULADAS / PROPORCIONALES (Art. 76 Código del Trabajo)
  // Regla: 2.5 días por cada mes laborado (15 días por semestre = 30 días al año)
  const totalDiasVacacionesGenerados = Number((totalMesesLaborados * 2.5).toFixed(2));
  let saldoVacacionesPendientes: number;

  if (diasVacacionesPendientes !== undefined && diasVacacionesPendientes !== null) {
    saldoVacacionesPendientes = Math.max(0, diasVacacionesPendientes);
  } else {
    saldoVacacionesPendientes = Number(Math.max(0, totalDiasVacacionesGenerados - diasTomadosVacaciones).toFixed(2));
  }

  const montoVacaciones = Number((saldoVacacionesPendientes * salarioDiario).toFixed(2));
  const explicacionVacaciones = `Art. 76 C.T.: ${saldoVacacionesPendientes} días pendientes compensados a C$ ${salarioDiario}/día.`;

  // 4. AGUINALDO PROPORCIONAL / DÉCIMO TERCER MES (Art. 93 - 99 Código del Trabajo)
  // Ciclo legal nica: Del 1 de diciembre al 30 de noviembre.
  // El aguinaldo acumula desde el 1 de diciembre anterior (o desde fecha de ingreso si es posterior).
  const egresoYear = fEgreso.getFullYear();
  const egresoMonth = fEgreso.getMonth(); // 0 a 11
  const inicioCicloYear = egresoMonth === 11 ? egresoYear : egresoYear - 1;
  const fechaInicioCiclo = new Date(inicioCicloYear, 11, 1); // 1 de diciembre

  const fechaInicioAguinaldo = fIngreso > fechaInicioCiclo ? fIngreso : fechaInicioCiclo;
  const fechaInicioAguinaldoStr = `${fechaInicioAguinaldo.getFullYear()}-${String(fechaInicioAguinaldo.getMonth() + 1).padStart(2, '0')}-${String(fechaInicioAguinaldo.getDate()).padStart(2, '0')}`;

  let mesesAguinaldo = (fEgreso.getFullYear() - fechaInicioAguinaldo.getFullYear()) * 12 + (fEgreso.getMonth() - fechaInicioAguinaldo.getMonth());
  let diasAguinaldo = fEgreso.getDate() - fechaInicioAguinaldo.getDate() + 1;

  if (diasAguinaldo < 0) {
    mesesAguinaldo -= 1;
    const diasMesAntAguinaldo = new Date(fEgreso.getFullYear(), fEgreso.getMonth(), 0).getDate();
    diasAguinaldo += diasMesAntAguinaldo;
  }

  if (mesesAguinaldo < 0) {
    mesesAguinaldo = 0;
    diasAguinaldo = 0;
  }

  const fraccionAguinaldo = Math.min(diasAguinaldo, 30) / 30;
  let totalMesesAguinaldo = mesesAguinaldo + fraccionAguinaldo;
  if (totalMesesAguinaldo > 12) totalMesesAguinaldo = 12;

  let diasAguinaldoAcumulados = Number((totalMesesAguinaldo * 2.5).toFixed(2));
  if (diasAguinaldoAcumulados > 30) diasAguinaldoAcumulados = 30;

  const montoAguinaldo = Number((diasAguinaldoAcumulados * salarioDiario).toFixed(2));
  const explicacionAguinaldo = `Art. 93 C.T.: Período ${fechaInicioAguinaldoStr} al ${fechaEgresoFormateada} (${mesesAguinaldo}m, ${diasAguinaldo}d = ${diasAguinaldoAcumulados} días). Exento de INSS e IR.`;

  // 5. SALARIO PENDIENTE DEVENGADO (Días laborados no pagados en el mes)
  const diasSalario = Math.max(0, diasSalarioPendientes);
  const montoSalarioBruto = Number((diasSalario * salarioDiario).toFixed(2));
  const inssLaboralSalario = retenerInssSalario ? Number((montoSalarioBruto * 0.07).toFixed(2)) : 0;
  const montoSalarioNeto = Number((montoSalarioBruto - inssLaboralSalario).toFixed(2));
  const explicacionSalario = diasSalario > 0
    ? `${diasSalario} días trabajados pendientes a C$ ${salarioDiario}/día.`
    : 'No se registran días pendientes de salario.';

  // 6. DEDUCCIONES Y TOTALES CONSOLIDADOS
  const deduccionesOtras = Math.max(0, deduccionesExtras);
  const totalDeducciones = Number((inssLaboralSalario + deduccionesOtras).toFixed(2));

  // Las prestaciones sociales (Indemnización + Vacaciones + Aguinaldo) están exentas de INSS
  const subtotalPrestaciones = Number((montoIndemnizacion + montoVacaciones + montoAguinaldo).toFixed(2));
  const totalBruto = Number((subtotalPrestaciones + montoSalarioBruto).toFixed(2));
  const netoAPagar = Number(Math.max(0, totalBruto - totalDeducciones).toFixed(2));

  return {
    fechaIngreso: fechaIngresoFormateada,
    fechaEgreso: fechaEgresoFormateada,
    salarioMensual,
    salarioDiario,
    antiguedad: {
      anios,
      meses,
      dias,
      totalMeses: Number(totalMesesLaborados.toFixed(2)),
      texto: antiguedadTexto || '0 días'
    },
    indemnizacion: {
      aplica: debeAplicarIndemnizacion,
      motivo: motivoTerminacion,
      diasCalculados: diasIndemnizacionFinal,
      mesesEquivalentes: mesesEquivalentesIndemnizacion,
      monto: montoIndemnizacion,
      topeAplicado: topeIndemnizacionAplicado,
      explicacion: explicacionIndemnizacion
    },
    vacaciones: {
      diasAcumuladosTotales: totalDiasVacacionesGenerados,
      diasTomados: diasTomadosVacaciones,
      diasPendientes: saldoVacacionesPendientes,
      monto: montoVacaciones,
      explicacion: explicacionVacaciones
    },
    aguinaldo: {
      fechaInicioCiclo: fechaInicioAguinaldoStr,
      fechaCorte: fechaEgresoFormateada,
      mesesComputados: mesesAguinaldo,
      diasComputados: diasAguinaldo,
      diasAguinaldoAcumulados,
      monto: montoAguinaldo,
      explicacion: explicacionAguinaldo
    },
    salario: {
      diasLaborados: diasSalario,
      montoBruto: montoSalarioBruto,
      inssLaboral: inssLaboralSalario,
      montoNeto: montoSalarioNeto,
      explicacion: explicacionSalario
    },
    deducciones: {
      inssSalario: inssLaboralSalario,
      otrasDeducciones: deduccionesOtras,
      totalDeducciones
    },
    subtotalPrestaciones,
    totalBruto,
    netoAPagar
  };
};

/**
 * Feriados Nacionales de la República de Nicaragua (Art. 66 Código del Trabajo y Ley 1118)
 * Son días de descanso obligatorio con goce de salario.
 */
export interface FeriadoNicaInfo {
  mes: number; // 1-12
  dia: number;
  descripcion: string;
  aplicaNacional: boolean;
  esInamovible?: boolean;
}

/**
 * Algoritmo eclesiástico para el cálculo del Domingo de Resurrección (Pascua)
 */
export const calcularDomingoPascua = (anio: number): { mes: number; dia: number } => {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31); // 3 = Marzo, 4 = Abril
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return { mes, dia };
};

/**
 * Retorna todos los feriados oficiales de Nicaragua para un año específico,
 * calculando con precisión Jueves y Viernes Santo móviles.
 */
export const obtenerFeriadosNicaragua = (anio: number = new Date().getFullYear()): FeriadoNicaInfo[] => {
  const pascua = calcularDomingoPascua(anio);
  const fechaPascua = new Date(anio, pascua.mes - 1, pascua.dia);

  const fechaJuevesSanto = new Date(fechaPascua);
  fechaJuevesSanto.setDate(fechaPascua.getDate() - 3);

  const fechaViernesSanto = new Date(fechaPascua);
  fechaViernesSanto.setDate(fechaPascua.getDate() - 2);

  const feriados: FeriadoNicaInfo[] = [
    { mes: 1, dia: 1, descripcion: 'Año Nuevo (Feriado Nacional)', aplicaNacional: true, esInamovible: true },
    { 
      mes: fechaJuevesSanto.getMonth() + 1, 
      dia: fechaJuevesSanto.getDate(), 
      descripcion: 'Jueves Santo (Semana Santa)', 
      aplicaNacional: true 
    },
    { 
      mes: fechaViernesSanto.getMonth() + 1, 
      dia: fechaViernesSanto.getDate(), 
      descripcion: 'Viernes Santo (Semana Santa)', 
      aplicaNacional: true 
    },
    { mes: 5, dia: 1, descripcion: 'Día Internacional de los Trabajadores', aplicaNacional: true, esInamovible: true },
    { mes: 5, dia: 30, descripcion: 'Día de la Madre Nicaragüense (Ley N° 1118)', aplicaNacional: true, esInamovible: true },
    { mes: 7, dia: 19, descripcion: 'Día de la Revolución Popular', aplicaNacional: true, esInamovible: true },
    { mes: 8, dia: 1, descripcion: 'Bajada de Santo Domingo (Feriado Managua)', aplicaNacional: false },
    { mes: 8, dia: 10, descripcion: 'Subida de Santo Domingo (Feriado Managua)', aplicaNacional: false },
    { mes: 9, dia: 14, descripcion: 'Batalla de San Jacinto (Feriado Nacional)', aplicaNacional: true, esInamovible: true },
    { mes: 9, dia: 15, descripcion: 'Independencia de Centroamérica (Feriado Nacional)', aplicaNacional: true, esInamovible: true },
    { mes: 12, dia: 8, descripcion: 'Día de la Purísima Concepción (Feriado Nacional)', aplicaNacional: true, esInamovible: true },
    { mes: 12, dia: 25, descripcion: 'Navidad (Feriado Nacional)', aplicaNacional: true, esInamovible: true }
  ];

  // Ordenar cronológicamente
  return feriados.sort((a, b) => {
    if (a.mes !== b.mes) return a.mes - b.mes;
    return a.dia - b.dia;
  });
};

export const FERIADOS_NACIONALES_NICARAGUA: FeriadoNicaInfo[] = obtenerFeriadosNicaragua(new Date().getFullYear());

/**
 * Cálculo de Remuneración por Trabajo en Día Feriado Nacional o Descanso Obligatorio
 * Art. 67 Código del Trabajo de Nicaragua:
 * "El trabajo en día de descanso obligatorio o feriado nacional se remunerará
 * con el doble del salario ordinario que corresponda a la jornada ordinaria de trabajo".
 */
export const calcularRemuneracionFeriado = (
  salarioMensual: number,
  horasTrabajadas: number = 8
) => {
  const salarioDiario = Number((salarioMensual / 30).toFixed(2));
  const valorHoraOrdinaria = Number((salarioDiario / 8).toFixed(2));
  // Remuneración doble (100% recargo legal)
  const valorHoraFeriado = Number((valorHoraOrdinaria * 2).toFixed(2));
  const montoAPagar = Number((valorHoraFeriado * horasTrabajadas).toFixed(2));

  return {
    salarioDiario,
    valorHoraOrdinaria,
    valorHoraFeriado,
    horasTrabajadas,
    tasaRecargo: 100, // 100% de recargo según Art. 67 C.T.
    montoAPagar
  };
};


/**
 * Cálculo del Impuesto sobre la Renta (IR) de Nicaragua según la Ley de Concertación Tributaria (LCT)
 * Tabla progresiva de retención laboral sobre el salario neto del INSS laboral (7%).
 */
export const calcularIRNicaragua = (salarioMensual: number, inssLaboralMensual: number): number => {
  const baseMensualGravable = Math.max(0, salarioMensual - inssLaboralMensual);
  const baseAnualEsperada = baseMensualGravable * 12;

  let irAnual = 0;
  if (baseAnualEsperada <= 100000) {
    irAnual = 0;
  } else if (baseAnualEsperada <= 200000) {
    irAnual = (baseAnualEsperada - 100000) * 0.15;
  } else if (baseAnualEsperada <= 350000) {
    irAnual = 15000 + (baseAnualEsperada - 200000) * 0.20;
  } else if (baseAnualEsperada <= 500000) {
    irAnual = 45000 + (baseAnualEsperada - 350000) * 0.25;
  } else {
    irAnual = 82500 + (baseAnualEsperada - 500000) * 0.30;
  }

  const irMensual = Number((irAnual / 12).toFixed(2));
  return irMensual;
};

export interface ParametrosColillaPago {
  empleadoId: string;
  nombreEmpleado: string;
  cargo: string;
  departamento?: string;
  inssNo?: string;
  cedula?: string;
  fechaIngreso: string;
  salarioMensual: number;
  anio: number;
  mes: number; // 1 a 12
  tipoPeriodo: 'quincena_1' | 'quincena_2' | 'mes_completo';
  
  // Saldo de vacaciones previo al corte
  saldoVacacionesPrevio?: number;
  // Días de vacaciones gozados en el período
  diasVacacionesGozadas?: number;
  // Días libres o permisos solicitados
  diasLibresSolicitados?: number;
  // Días otorgados a cuenta de vacaciones (SIN DESCUENTO SALARIAL)
  diasCuentaVacaciones?: number;
  // Feriados reconocidos en el período
  diasFeriados?: number;
  // Vacaciones compensadas en dinero
  vacacionesPagadasDinero?: number;
  // Feriados laborados pagados (Art. 67 C.T. con 100% recargo)
  feriadosTrabajadosPagados?: number;
  // Horas extras
  horasExtrasCantidad?: number;
  // Otros bonos o incentivos
  otrosIngresos?: number;
  // Deducciones adicionales (adelantos, préstamos)
  otrasDeducciones?: number;
  observaciones?: string;
}

/**
 * Genera el cálculo completo de la colilla de pago quincenal o mensual
 * Garantiza:
 * - Pago fijo comercial de 15 días (quincena) o 30 días (mes), sin importar si el mes tiene 28, 30 o 31 días.
 * - Los días libres o feriados a cuenta de vacaciones NO descuentan el salario del trabajador;
 *   únicamente se deducen del saldo de días de vacaciones acumuladas.
 */
export const calcularColillaPagoQuincenal = (params: ParametrosColillaPago) => {
  const {
    salarioMensual,
    anio,
    mes,
    tipoPeriodo,
    saldoVacacionesPrevio = 15,
    diasVacacionesGozadas = 0,
    diasLibresSolicitados = 0,
    diasCuentaVacaciones = 0,
    diasFeriados = 0,
    vacacionesPagadasDinero = 0,
    feriadosTrabajadosPagados = 0,
    horasExtrasCantidad = 0,
    otrosIngresos = 0,
    otrasDeducciones = 0,
    observaciones
  } = params;

  // Base fija comercial: 15 días quincenales, 30 días mensuales
  const esQuincenal = tipoPeriodo !== 'mes_completo';
  const diasLaboralesFijos = esQuincenal ? 15 : 30;
  const salarioDiario = Number((salarioMensual / 30).toFixed(2));
  const salarioBasePeriodo = Number((salarioDiario * diasLaboralesFijos).toFixed(2));

  // El salario ordinario devengado permanece fijo e íntegro
  const salarioOrdinarioDevengado = salarioBasePeriodo;

  // Horas extras: valor hora ordinaria = salarioMensual / 240. Recargo legal del 100% (x2)
  const valorHoraOrdinaria = Number((salarioMensual / 240).toFixed(2));
  const valorHoraExtra = Number((valorHoraOrdinaria * 2).toFixed(2));
  const montoHorasExtras = Number((horasExtrasCantidad * valorHoraExtra).toFixed(2));

  // Total Ingresos Brutos (incluyendo feriados trabajados pagados con recargo)
  const totalIngresosBrutos = Number(
    (salarioOrdinarioDevengado + vacacionesPagadasDinero + montoHorasExtras + feriadosTrabajadosPagados + otrosIngresos).toFixed(2)
  );

  // Deducción INSS Laboral (7% obligatorio sobre salario ordinario devengado + horas extras + feriados pagados)
  const baseInss = salarioOrdinarioDevengado + montoHorasExtras + feriadosTrabajadosPagados;
  const inssLaboral = Number((baseInss * 0.07).toFixed(2));

  // IR Laboral estimado (para el período)
  const irMensualCalculado = calcularIRNicaragua(salarioMensual, salarioMensual * 0.07);
  const irRetencionPeriodo = esQuincenal ? Number((irMensualCalculado / 2).toFixed(2)) : irMensualCalculado;

  // Total deducciones
  const totalDeducciones = Number((inssLaboral + irRetencionPeriodo + otrasDeducciones).toFixed(2));

  // Salario Neto a Recibir
  const netoAPagar = Number(Math.max(0, totalIngresosBrutos - totalDeducciones).toFixed(2));

  // Control de Vacaciones y Descansos del Período
  // Acumulación: 1.25 días en la quincena o 2.5 mensual
  const diasGanadosPeriodo = esQuincenal ? 1.25 : 2.5;

  // Total días a descontar del saldo de vacaciones:
  // Se descuentan las vacaciones gozadas y los días libres dados a cuenta de vacaciones
  const totalDiasDescontarVacaciones = Number((diasVacacionesGozadas + diasCuentaVacaciones).toFixed(2));
  
  // Saldo final resultante
  const saldoFinalVacaciones = Number(
    Math.max(0, saldoVacacionesPrevio + diasGanadosPeriodo - totalDiasDescontarVacaciones).toFixed(2)
  );

  // Fechas y Textos del Período
  const nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const mesNombre = nombresMeses[mes - 1] || 'Mes';

  let periodoTexto = '';
  let fechaInicio = '';
  let fechaFin = '';

  const mesStr = String(mes).padStart(2, '0');
  if (tipoPeriodo === 'quincena_1') {
    periodoTexto = `1ra Quincena (01 al 15 de ${mesNombre} ${anio})`;
    fechaInicio = `${anio}-${mesStr}-01`;
    fechaFin = `${anio}-${mesStr}-15`;
  } else if (tipoPeriodo === 'quincena_2') {
    // Último día real del mes para referencia
    const ultimoDiaReal = new Date(anio, mes, 0).getDate();
    periodoTexto = `2da Quincena (16 al 30 de ${mesNombre} ${anio})`;
    fechaInicio = `${anio}-${mesStr}-16`;
    fechaFin = `${anio}-${mesStr}-${ultimoDiaReal}`;
  } else {
    const ultimoDiaReal = new Date(anio, mes, 0).getDate();
    periodoTexto = `Mes Completo (01 al 30 de ${mesNombre} ${anio})`;
    fechaInicio = `${anio}-${mesStr}-01`;
    fechaFin = `${anio}-${mesStr}-${ultimoDiaReal}`;
  }

  // Generar nota explicativa de vacaciones y salario fijo
  let explicacionVacaciones = `Saldo anterior: ${saldoVacacionesPrevio}d + Ganados: ${diasGanadosPeriodo}d.`;
  if (diasCuentaVacaciones > 0) {
    explicacionVacaciones += ` Se otorgaron ${diasCuentaVacaciones} día(s) a cuenta de vacaciones (descontados únicamente de su saldo de días, manteniendo íntegro su salario fijo quincenal de ${formatearCordobas(salarioBasePeriodo)}).`;
  }
  if (diasVacacionesGozadas > 0) {
    explicacionVacaciones += ` Gozó de ${diasVacacionesGozadas} día(s) de descanso remunerado con 100% de salario.`;
  }
  if (diasFeriados > 0) {
    explicacionVacaciones += ` ${diasFeriados} día(s) feriado(s) nacional(es) gozado(s) con salario íntegro conforme al Art. 66 C.T.`;
  }
  if (feriadosTrabajadosPagados > 0) {
    explicacionVacaciones += ` Incluye remuneración especial de C$ ${feriadosTrabajadosPagados.toLocaleString('es-NI', { minimumFractionDigits: 2 })} por feriado(s) laborado(s) con 100% de recargo legal (Art. 67 C.T.).`;
  }

  return {
    periodo: {
      anio,
      mes,
      mesNombre,
      tipoPeriodo,
      periodoTexto,
      fechaInicio,
      fechaFin,
      fechaPago: new Date().toISOString().slice(0, 10),
      diasLaboralesFijos
    },
    salario: {
      salarioMensual,
      salarioDiario,
      salarioBasePeriodo,
      salarioOrdinarioDevengado
    },
    ingresos: {
      salarioOrdinarioDevengado,
      vacacionesPagadasDinero,
      feriadosTrabajadosPagados,
      horasExtrasCantidad,
      valorHoraExtra,
      montoHorasExtras,
      otrosIngresos,
      totalIngresosBrutos
    },
    deducciones: {
      inssLaboral,
      irRetencion: irRetencionPeriodo,
      otrasDeducciones,
      totalDeducciones
    },
    netoAPagar,
    vacaciones: {
      saldoAnterior: saldoVacacionesPrevio,
      diasGanadosPeriodo,
      diasVacacionesGozadas,
      diasLibresSolicitados,
      diasFeriadosPeriodo: diasFeriados,
      diasCuentaVacaciones,
      saldoActualDisponible: saldoFinalVacaciones,
      observacionVacaciones: explicacionVacaciones
    },
    observacionesGenerales: observaciones || 'Salario quincenal fijo comercial. No sujeto a deducción por descansos o feriados legales.'
  };
};

/**
 * Función para calcular el salario en base a cuando empezó a trabajar
 * y en base a su nuevo aumento (el último salario más lo del incremento).
 *
 * Cumple con la normativa laboral y mercantil de Nicaragua:
 * - Base comercial de 30 días mensuales (salarioDiario = nuevoSalario / 30)
 * - Base quincenal de 15 días (salarioQuincenal = nuevoSalario / 2)
 * - Jornada ordinaria mensual de 240 horas (valorHora = nuevoSalario / 240)
 * - Recargo legal de horas extras al 100% (valorHoraExtra = valorHora * 2)
 * - Feriado trabajado remunerado al doble (salarioDiario * 2)
 * - Retención INSS laboral (7%) sobre el nuevo salario devengado
 * - Computa el crecimiento salarial acumulado desde su salario inicial
 */
export const calcularSalarioConAumento = (
  params: ParametrosCalculoAumento
): ResultadoCalculoAumento => {
  const {
    salarioInicial: salIniParam,
    salarioAnterior: salAntParam,
    tipoIncremento,
    valorIncremento,
    fechaIngreso,
    fechaAumento,
    motivo
  } = params;

  // Si no se provee salarioAnterior, se asume salarioInicial (o viceversa)
  const salarioAnterior = Number(salAntParam || salIniParam || 0);
  const salarioInicial = Number(salIniParam || salAntParam || 0);

  let montoIncremento = 0;
  let nuevoSalario = salarioAnterior;

  if (tipoIncremento === 'monto_fijo') {
    montoIncremento = Math.max(0, Number(valorIncremento) || 0);
    nuevoSalario = Number((salarioAnterior + montoIncremento).toFixed(2));
  } else if (tipoIncremento === 'porcentaje') {
    const pct = Math.max(0, Number(valorIncremento) || 0);
    montoIncremento = Number((salarioAnterior * (pct / 100)).toFixed(2));
    nuevoSalario = Number((salarioAnterior + montoIncremento).toFixed(2));
  } else if (tipoIncremento === 'nuevo_salario') {
    nuevoSalario = Math.max(0, Number(valorIncremento) || 0);
    montoIncremento = Number((Math.max(0, nuevoSalario - salarioAnterior)).toFixed(2));
  }

  // Porcentaje de aumento respecto al último salario
  const porcentajeIncremento = salarioAnterior > 0 
    ? Number(((montoIncremento / salarioAnterior) * 100).toFixed(2)) 
    : 0;

  // Crecimiento acumulado respecto a cuando empezó a trabajar
  const porcentajeCrecimientoTotal = salarioInicial > 0 
    ? Number((((nuevoSalario - salarioInicial) / salarioInicial) * 100).toFixed(2)) 
    : 0;

  // Tarifas legales de Nicaragua (Base comercial 30 días mensuales y 240 horas anuales/mensuales)
  const salarioDiario = Number((nuevoSalario / 30).toFixed(2));
  const salarioQuincenal = Number((nuevoSalario / 2).toFixed(2));
  const salarioSemanal = Number(((nuevoSalario / 30) * 7).toFixed(2));
  const valorHoraOrdinaria = Number((nuevoSalario / 240).toFixed(2));
  const valorHoraExtra = Number((valorHoraOrdinaria * 2).toFixed(2)); // Recargo 100% Art. 58 C.T.
  const valorDiaFeriado = Number((salarioDiario * 2).toFixed(2)); // Art. 67 C.T.

  // Diferenciales comparativos
  const diferenciaSalarioMensual = montoIncremento;
  const diferenciaSalarioQuincenal = Number((montoIncremento / 2).toFixed(2));
  const diferenciaSalarioDiario = Number((montoIncremento / 30).toFixed(2));

  // Impacto en deducción INSS Laboral (7%)
  const inssLaboralNuevo = Number((nuevoSalario * 0.07).toFixed(2));
  const inssLaboralAnterior = Number((salarioAnterior * 0.07).toFixed(2));
  const diferenciaInssLaboral = Number((inssLaboralNuevo - inssLaboralAnterior).toFixed(2));
  const incrementoNetoMensual = Number((montoIncremento - diferenciaInssLaboral).toFixed(2));

  // Cálculo de antigüedad si hay fechas válidas
  let tiempoLaboradoTexto = '';
  let anios = 0;
  let meses = 0;
  let dias = 0;

  if (fechaIngreso) {
    const partesIni = fechaIngreso.split('-');
    const fIni = new Date(parseInt(partesIni[0], 10), parseInt(partesIni[1], 10) - 1, parseInt(partesIni[2], 10));
    
    let fFin: Date;
    if (fechaAumento) {
      const partesFin = fechaAumento.split('-');
      fFin = new Date(parseInt(partesFin[0], 10), parseInt(partesFin[1], 10) - 1, parseInt(partesFin[2], 10));
    } else {
      fFin = new Date();
    }

    if (!isNaN(fIni.getTime()) && !isNaN(fFin.getTime()) && fFin >= fIni) {
      anios = fFin.getFullYear() - fIni.getFullYear();
      meses = fFin.getMonth() - fIni.getMonth();
      dias = fFin.getDate() - fIni.getDate();

      if (dias < 0) {
        meses -= 1;
        const diasMesAnterior = new Date(fFin.getFullYear(), fFin.getMonth(), 0).getDate();
        dias += diasMesAnterior;
      }
      if (meses < 0) {
        anios -= 1;
        meses += 12;
      }

      const partes = [];
      if (anios > 0) partes.push(`${anios} año${anios > 1 ? 's' : ''}`);
      if (meses > 0) partes.push(`${meses} mes${meses > 1 ? 'es' : ''}`);
      if (dias > 0 || partes.length === 0) partes.push(`${dias} día${dias !== 1 ? 's' : ''}`);
      tiempoLaboradoTexto = partes.join(', ');
    }
  }

  // Resumen textual oficial
  let resumenExplicativo = `El colaborador inició labores con un salario base de C$ ${salarioInicial.toLocaleString('es-NI', { minimumFractionDigits: 2 })}`;
  if (fechaIngreso) resumenExplicativo += ` el ${fechaIngreso}`;
  if (tiempoLaboradoTexto) resumenExplicativo += ` (${tiempoLaboradoTexto} de antigüedad laboral)`;
  resumenExplicativo += `. Su último salario previo al nuevo incremento era de C$ ${salarioAnterior.toLocaleString('es-NI', { minimumFractionDigits: 2 })}.`;
  resumenExplicativo += ` Con el nuevo incremento salarial de C$ ${montoIncremento.toLocaleString('es-NI', { minimumFractionDigits: 2 })} (+${porcentajeIncremento}%), su nuevo salario mensual devengado pasa a ser de C$ ${nuevoSalario.toLocaleString('es-NI', { minimumFractionDigits: 2 })} (salario diario: C$ ${salarioDiario.toFixed(2)}, salario quincenal: C$ ${salarioQuincenal.toFixed(2)}).`;
  if (porcentajeCrecimientoTotal > porcentajeIncremento) {
    resumenExplicativo += ` Acumula un crecimiento salarial total del +${porcentajeCrecimientoTotal}% desde su ingreso.`;
  }

  return {
    salarioInicial,
    salarioAnterior,
    tipoIncremento,
    valorIncremento,
    montoIncremento,
    porcentajeIncremento,
    porcentajeCrecimientoTotal,
    nuevoSalario,
    salarioDiario,
    salarioQuincenal,
    salarioSemanal,
    valorHoraOrdinaria,
    valorHoraExtra,
    valorDiaFeriado,
    diferenciaSalarioMensual,
    diferenciaSalarioQuincenal,
    diferenciaSalarioDiario,
    inssLaboralNuevo,
    inssLaboralAnterior,
    diferenciaInssLaboral,
    incrementoNetoMensual,
    tiempoLaboradoTexto: tiempoLaboradoTexto || undefined,
    antiguedadAnios: anios,
    antiguedadMeses: meses,
    antiguedadDias: dias,
    resumenExplicativo
  };
};

/**
 * ============================================================================
 * SISTEMA UNIFICADO DE HISTORIAL DE DÍAS LIBRES Y VACACIONES TOMADAS
 * Legislación Laboral de Nicaragua (Ley N° 185 - Código del Trabajo)
 * - Art. 76: Quince (15) días de descanso remunerado por cada seis meses de trabajo.
 * - Art. 64: Séptimo día de descanso semanal remunerado tras seis días de labor.
 * - Art. 67: Compensación con descanso libre equivalente por laborar en días feriados.
 * ============================================================================
 */

export interface OpcionesHistorialDescansos {
  solicitudes?: SolicitudVacaciones[];
  anio?: number;
  tipo?: TipoDescansoHistorial | 'TODOS';
  soloEfectivosODisfrutados?: boolean;
}

/**
 * Consolida todas las fuentes de datos de descansos para un colaborador específico:
 * 1. Solicitudes de vacaciones (aprobadas / tomadas)
 * 2. Registro de días libres semanales (Art. 64 y a cuenta de vacaciones)
 * 3. Descansos programados semestrales o fraccionados
 * 4. Feriados trabajados con compensación de día libre (Art. 67)
 * 5. Vacaciones pagadas monetariamente
 */
export const obtenerHistorialDescansosEmpleado = (
  empleadoId: string,
  opciones?: OpcionesHistorialDescansos
): RegistroHistorialDescanso[] => {
  if (!empleadoId) return [];

  const items: RegistroHistorialDescanso[] = [];
  const idsProcesados = new Set<string>();

  // 1. Fuentes: Solicitudes de Vacaciones
  let listaSolicitudes = opciones?.solicitudes ? [...opciones.solicitudes] : [];
  try {
    const rawSol = localStorage.getItem('sendavac_solicitudes');
    if (rawSol) {
      const parsedSol = JSON.parse(rawSol);
      const idsExistentes = new Set(listaSolicitudes.map(s => s.id));
      parsedSol.forEach((s: any) => {
        if (s && s.id && !idsExistentes.has(s.id)) {
          listaSolicitudes.push(s);
          idsExistentes.add(s.id);
        }
      });
    }
  } catch (e) {
    console.error(e);
  }
  listaSolicitudes.forEach((sol) => {
    if (sol.empleadoId === empleadoId) {
      // Filtrar canceladas/rechazadas si se requiere solo efectivas
      if (opciones?.soloEfectivosODisfrutados && sol.estado !== 'Aprobado') {
        return;
      }

      const idUnico = `sol-${sol.id}`;
      idsProcesados.add(idUnico);

      // Determinar si ya fue disfrutada en base a la fecha
      const hoy = new Date().toISOString().slice(0, 10);
      let estadoFinal: 'Disfrutado' | 'Programado' | 'Aprobado' | 'Pendiente' | 'Cancelado' = 'Aprobado';
      if (sol.estado === 'Rechazado') {
        estadoFinal = 'Cancelado';
      } else if (sol.estado === 'Pendiente') {
        estadoFinal = 'Pendiente';
      } else if (sol.fechaFin && sol.fechaFin < hoy) {
        estadoFinal = 'Disfrutado';
      } else {
        estadoFinal = 'Programado';
      }

      items.push({
        id: idUnico,
        empleadoId: sol.empleadoId,
        nombreEmpleado: sol.nombreEmpleado,
        cargoEmpleado: sol.cargoEmpleado,
        tipo: 'Vacaciones Gozadas',
        fechaInicio: sol.fechaInicio,
        fechaFin: sol.fechaFin,
        dias: sol.diasSolicitados,
        descuentaSaldoVacaciones: sol.estado === 'Aprobado',
        estado: estadoFinal,
        motivo: sol.motivo || 'Vacaciones de ley autorizadas',
        autorizadoPor: sol.comentarioAdmin ? `Admin (${sol.comentarioAdmin})` : 'Administración SendaVac',
        referenciaId: sol.id,
        origenModulo: 'Solicitud Vacaciones',
        fechaRegistro: sol.fechaSolicitud || sol.fechaInicio,
        observacionLegal: 'Art. 76 Código del Trabajo (15 días continuos por cada 6 meses continuos)'
      });
    }
  });

  // 2. Fuentes: Días Libres Semanales (localStorage)
  try {
    const rawDiasLibres = localStorage.getItem('sendavac_dias_libres_semanales');
    if (rawDiasLibres) {
      const diasLibres: any[] = JSON.parse(rawDiasLibres);
      diasLibres.forEach((dl) => {
        if (dl.empleadoId === empleadoId) {
          if (opciones?.soloEfectivosODisfrutados && dl.estado === 'Cancelado') return;

          let tipoHistorial: TipoDescansoHistorial = 'Descanso Semanal';
          let descuentaSaldo = false;
          let obsLegal = 'Art. 64 Código del Trabajo (Séptimo día de descanso semanal remunerado)';

          if (dl.tipo === 'A Cuenta de Vacaciones') {
            tipoHistorial = 'A Cuenta de Vacaciones';
            descuentaSaldo = true;
            obsLegal = 'Art. 76 Código del Trabajo (Día libre deducido del saldo acumulado de vacaciones)';
          } else if (dl.tipo === 'Compensatorio') {
            tipoHistorial = 'Día Compensatorio';
            obsLegal = 'Art. 67 Código del Trabajo (Día compensatorio por jornada o descanso sustitutivo)';
          } else if (dl.tipo === 'Permiso Especial') {
            tipoHistorial = 'Permiso Especial';
            obsLegal = 'Permiso especial acordado con la empresa';
          }

          items.push({
            id: `dl-${dl.id}`,
            empleadoId: dl.empleadoId,
            nombreEmpleado: dl.nombreEmpleado,
            cargoEmpleado: dl.cargoEmpleado,
            departamento: dl.departamento,
            tipo: tipoHistorial,
            fechaInicio: dl.fecha,
            fechaFin: dl.fecha,
            dias: 1,
            descuentaSaldoVacaciones: descuentaSaldo,
            estado: dl.estado === 'Disfrutado' ? 'Disfrutado' : dl.estado === 'Cancelado' ? 'Cancelado' : 'Programado',
            motivo: dl.motivo || `Día libre asignado (${dl.diaSemana})`,
            autorizadoPor: dl.autorizadoPor || 'Gerencia SendaVac',
            referenciaId: dl.id,
            origenModulo: 'Día Libre Semanal',
            fechaRegistro: dl.fechaRegistro || dl.fecha,
            observacionLegal: obsLegal
          });
        }
      });
    }
  } catch (err) {
    console.error('Error al recuperar días libres semanales:', err);
  }

  // 3. Fuentes: Descansos Programados de ModuloGestionDescanso (localStorage)
  try {
    const rawDescansos = localStorage.getItem('sendavac_descansos_programados');
    if (rawDescansos) {
      const descansos: any[] = JSON.parse(rawDescansos);
      descansos.forEach((dp) => {
        if (dp.empleadoId === empleadoId) {
          // Evitar registrar si ya existe la misma fecha de inicio y fin desde solicitudes
          const yaExiste = items.some(
            (it) => it.fechaInicio === dp.fechaInicio && it.fechaFin === dp.fechaFin
          );
          if (yaExiste) return;

          let tipoHistorial: TipoDescansoHistorial = 'Vacaciones Gozadas';
          let obsLegal = 'Art. 76 Código del Trabajo (Descanso continuo de vacaciones)';
          let descuenta = true;

          if (dp.tipo === 'Compensatorio') {
            tipoHistorial = 'Día Compensatorio';
            descuenta = false;
            obsLegal = 'Art. 67 Código del Trabajo (Descanso compensatorio)';
          }

          items.push({
            id: `dp-${dp.id}`,
            empleadoId: dp.empleadoId,
            nombreEmpleado: dp.nombreEmpleado,
            cargoEmpleado: dp.cargoEmpleado,
            departamento: dp.departamento,
            tipo: tipoHistorial,
            fechaInicio: dp.fechaInicio,
            fechaFin: dp.fechaFin,
            dias: Number(dp.diasDescanso) || 1,
            descuentaSaldoVacaciones: descuenta,
            estado: dp.estado === 'Completado' ? 'Disfrutado' : 'Programado',
            motivo: dp.observaciones || `Descanso programado: ${dp.tipo}`,
            autorizadoPor: 'Planificación de Descansos',
            referenciaId: dp.id,
            origenModulo: 'Descanso Programado',
            fechaRegistro: dp.fechaRegistro || dp.fechaInicio,
            observacionLegal: obsLegal
          });
        }
      });
    }
  } catch (err) {
    console.error('Error al recuperar descansos programados:', err);
  }

  // 4. Fuentes: Feriados Trabajados con Día Libre Compensatorio (localStorage)
  try {
    const rawFeriados = localStorage.getItem('sendavac_feriados_trabajados');
    if (rawFeriados) {
      const feriados: any[] = JSON.parse(rawFeriados);
      feriados.forEach((fer) => {
        if (fer.empleadoId === empleadoId && fer.modalidad === 'DIA_LIBRE_COMPENSATORIO') {
          const fechaAsignada = fer.fechaCompensatoriaAsignada || fer.fechaFeriado;
          
          // Verificar si ya fue mapeado como día libre con el mismo diaLibreId
          const yaMapeado = items.some((it) => it.referenciaId === fer.diaLibreId);
          if (yaMapeado) return;

          items.push({
            id: `fer-${fer.id}`,
            empleadoId: fer.empleadoId,
            nombreEmpleado: fer.nombreEmpleado,
            cargoEmpleado: fer.cargoEmpleado,
            departamento: fer.departamento,
            tipo: 'Feriado Compensatorio',
            fechaInicio: fechaAsignada,
            fechaFin: fechaAsignada,
            dias: 1,
            descuentaSaldoVacaciones: false, // NO descuenta vacaciones, es compensación del feriado
            estado: fer.estadoCompensacion === 'Disfrutado' ? 'Disfrutado' : 'Programado',
            motivo: `Compensación de día libre por laborar feriado: ${fer.nombreFeriado} (${fer.fechaFeriado})`,
            autorizadoPor: fer.autorizadoPor || 'Gerencia General',
            referenciaId: fer.id,
            origenModulo: 'Feriado Compensatorio',
            fechaRegistro: fer.fechaRegistro || fer.fechaFeriado,
            observacionLegal: `Art. 67 Código del Trabajo (Día compensatorio de descanso sustitutivo por feriado nacional: ${fer.nombreFeriado})`
          });
        }
      });
    }
  } catch (err) {
    console.error('Error al recuperar feriados compensatorios:', err);
  }

  // 5. Fuentes: Vacaciones Pagadas en Dinero (localStorage)
  try {
    const rawPagadas = localStorage.getItem('sendavac_vacaciones_pagadas');
    if (rawPagadas) {
      const pagadas: any[] = JSON.parse(rawPagadas);
      pagadas.forEach((vp) => {
        if (vp.empleadoId === empleadoId) {
          items.push({
            id: `vp-${vp.id}`,
            empleadoId: vp.empleadoId,
            nombreEmpleado: vp.nombreEmpleado,
            cargoEmpleado: vp.cargoEmpleado,
            tipo: 'Vacaciones Pagadas',
            fechaInicio: vp.fechaPago,
            fechaFin: vp.fechaPago,
            dias: Number(vp.diasPagados) || 0,
            descuentaSaldoVacaciones: true,
            estado: 'Disfrutado',
            motivo: vp.observaciones || `Compensación monetaria de ${vp.diasPagados} días de vacaciones`,
            montoMonetario: vp.totalPagado,
            referenciaId: vp.id,
            origenModulo: 'Vacaciones Pagadas',
            fechaRegistro: vp.fechaPago,
            observacionLegal: 'Art. 76 Código del Trabajo (Remuneración en dinero del descanso no gozado por acuerdo)'
          });
        }
      });
    }
  } catch (err) {
    console.error('Error al recuperar vacaciones pagadas:', err);
  }

  // Ordenar cronológicamente descendente (más recientes primero)
  items.sort((a, b) => {
    const fA = a.fechaInicio || '';
    const fB = b.fechaInicio || '';
    return fB.localeCompare(fA);
  });

  // Filtros opcionales
  let resultado = items;
  if (opciones?.anio) {
    resultado = resultado.filter((it) => it.fechaInicio && it.fechaInicio.startsWith(`${opciones.anio}-`));
  }
  if (opciones?.tipo && opciones.tipo !== 'TODOS') {
    resultado = resultado.filter((it) => it.tipo === opciones.tipo);
  }

  return resultado;
};

/**
 * Calcula el resumen analítico y consolidado de días tomados, gozados y libres
 */
export const calcularResumenHistorialDescansos = (
  historial: RegistroHistorialDescanso[],
  empleadoId: string = ''
): ResumenHistorialDescansos => {
  let totalDiasGeneral = 0;
  let totalDiasVacacionesGozadas = 0;
  let totalDiasACuentaVacaciones = 0;
  let totalDescansosSemanales = 0;
  let totalDiasCompensatorios = 0;
  let totalDiasPermisoEspecial = 0;
  let totalDiasVacacionesPagadas = 0;
  let diasDeducidosSaldoVacaciones = 0;

  const hoy = new Date().toISOString().slice(0, 10);
  let ultimoDescansoTomado: RegistroHistorialDescanso | undefined;
  let proximoDescansoProgramado: RegistroHistorialDescanso | undefined;

  historial.forEach((item) => {
    // Si no está cancelado
    if (item.estado !== 'Cancelado') {
      totalDiasGeneral += item.dias;

      if (item.descuentaSaldoVacaciones) {
        diasDeducidosSaldoVacaciones += item.dias;
      }

      switch (item.tipo) {
        case 'Vacaciones Gozadas':
          totalDiasVacacionesGozadas += item.dias;
          break;
        case 'A Cuenta de Vacaciones':
          totalDiasACuentaVacaciones += item.dias;
          break;
        case 'Descanso Semanal':
          totalDescansosSemanales += item.dias;
          break;
        case 'Día Compensatorio':
        case 'Feriado Compensatorio':
          totalDiasCompensatorios += item.dias;
          break;
        case 'Permiso Especial':
          totalDiasPermisoEspecial += item.dias;
          break;
        case 'Vacaciones Pagadas':
          totalDiasVacacionesPagadas += item.dias;
          break;
      }

      // Detectar último gozado y próximo programado
      if (item.fechaInicio <= hoy && item.estado === 'Disfrutado') {
        if (!ultimoDescansoTomado || item.fechaInicio > ultimoDescansoTomado.fechaInicio) {
          ultimoDescansoTomado = item;
        }
      } else if (item.fechaInicio >= hoy && (item.estado === 'Programado' || item.estado === 'Aprobado')) {
        if (!proximoDescansoProgramado || item.fechaInicio < proximoDescansoProgramado.fechaInicio) {
          proximoDescansoProgramado = item;
        }
      }
    }
  });

  return {
    empleadoId,
    totalRegistros: historial.length,
    totalDiasGeneral,
    totalDiasVacacionesGozadas,
    totalDiasACuentaVacaciones,
    totalDescansosSemanales,
    totalDiasCompensatorios,
    totalDiasPermisoEspecial,
    totalDiasVacacionesPagadas,
    diasDeducidosSaldoVacaciones,
    ultimoDescansoTomado,
    proximoDescansoProgramado
  };
};

/**
 * Filtra el historial de descansos según criterios dinámicos
 */
export const filtrarHistorialDescansos = (
  historial: RegistroHistorialDescanso[],
  filtros: FiltrosHistorialDescanso
): RegistroHistorialDescanso[] => {
  return historial.filter((item) => {
    if (filtros.empleadoId && item.empleadoId !== filtros.empleadoId) return false;
    if (filtros.tipo && filtros.tipo !== 'TODOS' && item.tipo !== filtros.tipo) return false;
    if (filtros.estado && filtros.estado !== 'TODOS' && item.estado !== filtros.estado) return false;

    if (filtros.anio) {
      const anioItem = item.fechaInicio ? parseInt(item.fechaInicio.split('-')[0], 10) : null;
      if (anioItem !== filtros.anio) return false;
    }

    if (filtros.mes) {
      const mesItem = item.fechaInicio ? parseInt(item.fechaInicio.split('-')[1], 10) : null;
      if (mesItem !== filtros.mes) return false;
    }

    if (filtros.busqueda && filtros.busqueda.trim() !== '') {
      const q = filtros.busqueda.toLowerCase();
      const matchMotivo = item.motivo?.toLowerCase().includes(q);
      const matchTipo = item.tipo.toLowerCase().includes(q);
      const matchFecha = item.fechaInicio.includes(q) || (item.fechaFin && item.fechaFin.includes(q));
      const matchAutorizado = item.autorizadoPor?.toLowerCase().includes(q);
      if (!matchMotivo && !matchTipo && !matchFecha && !matchAutorizado) return false;
    }

    return true;
  });
};

/**
 * Genera y descarga un reporte formal en PDF del historial de descansos y vacaciones
 */
export const exportarHistorialDescansosPDF = (
  empleado: Empleado,
  historial: RegistroHistorialDescanso[],
  resumen: ResumenHistorialDescansos,
  empresa?: EmpresaInfo
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const primaryColor: [number, number, number] = [29, 99, 255]; // Azul SendaVac
  const darkSlate: [number, number, number] = [30, 41, 59];
  const emeraldColor: [number, number, number] = [16, 185, 129];
  const grayBorder: [number, number, number] = [226, 232, 240];

  // 1. Encabezado con Franja Superior
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 216, 6, 'F');

  // Datos Empresa
  const nombreEmpresa = empresa?.nombreComercial || 'TIENDA SENDA - NICARAGUA';
  const rucEmpresa = empresa?.ruc || 'RUC: J0310000000000';
  const direccionEmpresa = empresa?.direccion || 'Managua, Nicaragua';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...primaryColor);
  doc.text(nombreEmpresa, 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${rucEmpresa} | ${direccionEmpresa}`, 14, 23);
  doc.text('Sistema SendaVac • Control Integral de Vacaciones y Descansos Laborales', 14, 27);

  // Título del Documento
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...darkSlate);
  doc.text('HISTORIAL OFICIAL DE DÍAS LIBRES Y VACACIONES TOMADAS', 14, 37);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const fechaGeneracion = new Date().toLocaleDateString('es-NI', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  doc.text(`Fecha de emisión: ${fechaGeneracion} | Ley N° 185 (Código del Trabajo de Nicaragua)`, 14, 42);

  // 2. Tarjeta del Colaborador
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...grayBorder);
  doc.roundedRect(14, 46, 188, 26, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...darkSlate);
  doc.text(empleado.nombre, 18, 53);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Cargo: ${empleado.cargo || 'No asignado'}   |   Área: ${empleado.departamento || 'General'}`, 18, 59);
  doc.text(`Fecha de Ingreso: ${empleado.fechaIngreso || 'No registrada'}   |   Salario Mensual: C$ ${(empleado.salarioMensual || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}`, 18, 64);
  doc.text(`Saldo Actual Disponible: ${empleado.saldoDisponible || 0} días   |   Total Días Tomados Registrados: ${resumen.totalDiasGeneral} días`, 18, 69);

  // 3. Tarjetas Resumen de Métricas
  const boxY = 76;
  const boxW = 44;
  const boxH = 16;
  const gap = 4;

  const metricas = [
    { label: 'Vacaciones Gozadas', valor: `${resumen.totalDiasVacacionesGozadas} días`, sub: 'Art. 76 C.T.' },
    { label: 'Descansos Semanales', valor: `${resumen.totalDescansosSemanales} días`, sub: 'Art. 64 C.T.' },
    { label: 'Compensatorios/Feriados', valor: `${resumen.totalDiasCompensatorios} días`, sub: 'Art. 67 C.T.' },
    { label: 'A Cuenta Vacaciones', valor: `${resumen.totalDiasACuentaVacaciones} días`, sub: 'Deducidos de Saldo' }
  ];

  metricas.forEach((m, idx) => {
    const x = 14 + idx * (boxW + gap);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...grayBorder);
    doc.roundedRect(x, boxY, boxW, boxH, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(m.label, x + 3, boxY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.text(m.valor, x + 3, boxY + 10.5);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(m.sub, x + 3, boxY + 14);
  });

  // 4. Tabla Detallada del Historial
  const tableData = historial.map((h) => [
    h.fechaInicio === h.fechaFin || !h.fechaFin ? h.fechaInicio : `${h.fechaInicio} al ${h.fechaFin}`,
    `${h.dias} d`,
    h.tipo,
    h.descuentaSaldoVacaciones ? 'Sí (Afecta Saldo)' : 'No (Remunerado)',
    h.estado,
    h.motivo || h.observacionLegal || 'Descanso legal otorgado'
  ]);

  autoTable(doc, {
    startY: 96,
    head: [['Período / Fecha', 'Días', 'Tipo de Descanso', 'Deducción Saldo', 'Estado', 'Motivo / Base Legal']],
    body: tableData.length > 0 ? tableData : [['Sin registros', '-', '-', '-', '-', 'No se registran descansos tomados aún']],
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      textColor: darkSlate,
      lineColor: grayBorder,
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 38, fontStyle: 'bold' },
      3: { cellWidth: 28, halign: 'center' },
      4: { cellWidth: 22, halign: 'center' },
      5: { cellWidth: 'auto' }
    },
    didDrawCell: (data) => {
      // Color highlight para estado
      if (data.section === 'body' && data.column.index === 4) {
        const val = data.cell.raw as string;
        if (val === 'Disfrutado') {
          doc.setTextColor(...emeraldColor);
        }
      }
    }
  });

  // 5. Marco Legal y Firmas
  const finalY = (doc as any).lastAutoTable?.finalY || 180;
  let legalY = finalY + 8;

  // Si no cabe en la misma página, nueva página
  if (legalY > 230) {
    doc.addPage();
    legalY = 20;
  }

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, legalY, 188, 18, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...darkSlate);
  doc.text('MARCO LEGAL VIGENTE (CÓDIGO DEL TRABAJO DE NICARAGUA - LEY N° 185):', 18, legalY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('• Art. 76: Quince (15) días de descanso remunerado continuo por cada 6 meses de trabajo continuo (2.5 días/mes).', 18, legalY + 9);
  doc.text('• Art. 64: Séptimo día de descanso semanal remunerado de ley tras seis días consecutivos de labores.', 18, legalY + 12.5);
  doc.text('• Art. 67: Compensación con descanso libre o remuneración doble en caso de laborar en día feriado nacional.', 18, legalY + 16);

  // Firmas
  const firmasY = legalY + 36;
  doc.setDrawColor(148, 163, 184);
  doc.line(25, firmasY, 85, firmasY);
  doc.line(131, firmasY, 191, firmasY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...darkSlate);
  doc.text(empleado.nombre, 55, firmasY + 4, { align: 'center' });
  doc.text('Recursos Humanos / Administración', 161, firmasY + 4, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Firma del Colaborador (Recibido conforme)', 55, firmasY + 8, { align: 'center' });
  doc.text('Autorizado y Sellado Tienda Senda', 161, firmasY + 8, { align: 'center' });

  // Pie de Página
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Página ${i} de ${pageCount} • Sistema SendaVac Nicaragua • Documento de validez laboral interna`, 108, 272, { align: 'center' });
  }

  // Descargar PDF
  const cleanNombre = empleado.nombre.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Historial_Descansos_${cleanNombre}_${new Date().toISOString().slice(0, 10)}.pdf`);
};



