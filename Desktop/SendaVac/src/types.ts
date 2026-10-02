export interface Empleado {
  id: string; // Coincidirá con el UID de Firebase Auth
  nombre: string;
  email: string;
  password?: string; // Contraseña de acceso
  cargo: string;
  departamento?: string;
  telefono?: string;
  fechaIngreso: string; // Formato YYYY-MM-DD (Cuando empezó a trabajar)
  salarioInicial?: number; // Salario base de contratación (cuando empezó a trabajar)
  salarioAnterior?: number; // Último salario antes del incremento más reciente
  salarioMensual: number; // Salario actual vigente (último salario + incremento)
  fechaUltimoAumento?: string; // YYYY-MM-DD
  montoUltimoIncremento?: number; // En Córdobas (C$)
  porcentajeUltimoIncremento?: number; // En porcentaje (%)
  motivoUltimoIncremento?: string; // Razón del ajuste salarial
  diasAcumulados: number; // 2.5 días por mes según Art. 76 Código del Trabajo
  diasTomados: number; // Días ya gozados
  saldoDisponible: number; // acumulados - tomados
  rol: 'administrador' | 'empleado' | 'cajero' | 'vendedor';
  estado?: 'Activo' | 'Inactivo' | 'De Vacaciones';
  avatar?: string;
}

export interface SolicitudVacaciones {
  id: string;
  empleadoId: string;
  nombreEmpleado: string;
  cargoEmpleado?: string;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string; // YYYY-MM-DD
  diasSolicitados: number;
  motivo?: string;
  estado: 'Pendiente' | 'Aprobado' | 'Rechazado';
  fechaSolicitud: string;
  fechaResolucion?: string;
  comentarioAdmin?: string;
}

export type MotivoTerminacion = 
  | 'despido_sin_causa' // Art. 45 - Aplica 100% indemnización
  | 'renuncia_con_indemnizacion' // Política interna / mutuo acuerdo
  | 'mutuo_acuerdo' // Art. 45 acordado
  | 'despido_con_causa' // Art. 48 - Sin indemnización
  | 'renuncia_simple'; // Sin indemnización

export interface LiquidacionDetalle {
  empleadoId: string;
  nombreEmpleado: string;
  cargo: string;
  fechaCalculo: string;
  salarioMensual: number;
  salarioDiario: number;
  diasPendientes: number;
  totalPagar: number;
  inssLaboral: number; // 7% INSS laboral en liquidaciones si aplica
  irRetencion: number; // IR proporcional
  netoPagar: number;
}

export interface LiquidacionCompleta {
  id?: string;
  empleadoId: string;
  nombreEmpleado: string;
  cargo: string;
  departamento?: string;
  fechaIngreso: string;
  fechaEgreso: string;
  motivoTerminacion: MotivoTerminacion;
  salarioMensual: number;
  salarioDiario: number;
  
  // Antigüedad
  antiguedadAnios: number;
  antiguedadMeses: number;
  antiguedadDias: number;
  antiguedadTexto: string;

  // 1. Indemnización por Antigüedad (Art. 45)
  aplicaIndemnizacion: boolean;
  diasIndemnizacion: number;
  mesesIndemnizacion: number;
  montoIndemnizacion: number;
  topeIndemnizacionAplicado: boolean;

  // 2. Vacaciones Acumuladas (Art. 76)
  diasVacaciones: number;
  montoVacaciones: number;

  // 3. Aguinaldo Proporcional / 13vo Mes (Art. 93-99)
  diasAguinaldo: number;
  mesesAguinaldo: number;
  montoAguinaldo: number;
  periodoAguinaldoTexto: string;

  // 4. Salario Pendiente
  diasSalarioPendientes: number;
  montoSalarioBruto: number;
  inssLaboralSalario: number; // 7% solo sobre salario ordinario
  montoSalarioNeto: number;

  // Deducciones adicionales
  deduccionesExtras: number;
  totalDeducciones: number;

  // Totales
  subtotalPrestaciones: number; // Indemnización + Vacaciones + Aguinaldo
  totalBruto: number;
  netoAPagar: number;

  fechaElaboracion: string;
  elaboradoPor?: string;
}

export type TipoPeriodoPlanilla = 'quincena_1' | 'quincena_2' | 'mes_completo';

export interface ColillaPago {
  id: string;
  numeroColilla: string;
  empleadoId: string;
  nombreEmpleado: string;
  cargo: string;
  departamento?: string;
  inssNo?: string;
  cedula?: string;
  fechaIngreso: string;
  
  // Período
  anio: number;
  mes: number; // 1 a 12
  mesNombre: string;
  tipoPeriodo: TipoPeriodoPlanilla;
  periodoTexto: string; // ej. "1ra Quincena (1 al 15 de Octubre 2026)"
  fechaInicio: string;
  fechaFin: string;
  fechaPago: string;

  // Días y Base Salarial (pago fijo de ley)
  diasLaboralesPeriodo: number; // 15 días (quincenal) o 30 días (mensual)
  salarioMensual: number;
  salarioDiario: number;
  salarioBasePeriodo: number; // salarioMensual / 2 para quincena fija

  // Ingresos / Percepciones
  salarioOrdinarioDevengado: number;
  vacacionesPagadasDinero: number; // Si se pagaron vacaciones en dinero adicionales
  horasExtrasMonto: number;
  horasExtrasCantidad: number;
  otrosIngresosBonos: number;
  totalIngresosBrutos: number;

  // Deducciones de Ley
  inssLaboral: number; // 7% sobre salario ordinario
  irRetencion: number; // IR estimado progresivo
  otrasDeducciones: number; // Adelantos, préstamos
  totalDeducciones: number;

  // Total Neto
  netoAPagar: number;

  // CONTROL ESPECIAL DE VACACIONES Y DESCANSOS DEL PERÍODO (Sin afectar salario quincenal)
  vacaciones: {
    saldoAnterior: number;
    diasGanadosPeriodo: number; // 1.25 días en la quincena o 2.5 mensual
    diasVacacionesGozadas: number; // Días que estuvo de vacaciones (100% remuneradas)
    diasLibresSolicitados: number; // Días libres pedidos
    diasFeriadosPeriodo: number; // Feriados nacionales oficiales en el período
    diasCuentaVacaciones: number; // Días libres/feriados dados a cuenta de vacaciones (SIN DESCUENTO SALARIAL)
    saldoActualDisponible: number; // Saldo resultante disponible
    observacionVacaciones: string;
  };

  observacionesGenerales?: string;
  estado: 'Emitida' | 'Pagada' | 'Borrador';
}

export interface EmpresaInfo {
  nombreComercial: string;
  ruc: string;
  telefono: string;
  email: string;
  direccion: string;
  logo?: string;
}

export type ModalidadCompensacionFeriado = 'PAGAR_MONETARIO' | 'DIA_LIBRE_COMPENSATORIO';

export interface FeriadoOficial {
  id: string;
  fecha: string; // YYYY-MM-DD
  mes: number;
  dia: number;
  nombre: string;
  descripcion: string;
  aplicaNacional: boolean;
  esInamovible?: boolean;
}

export interface RegistroFeriadoTrabajado {
  id: string;
  numeroComprobante: string;
  empleadoId: string;
  nombreEmpleado: string;
  cargoEmpleado: string;
  departamento: string;
  
  // Datos del Feriado
  fechaFeriado: string; // YYYY-MM-DD
  nombreFeriado: string;
  horasTrabajadas: number; // Regularmente 8 horas (jornada completa)
  
  // Modalidad seleccionada (Art. 67 Código del Trabajo)
  modalidad: ModalidadCompensacionFeriado;
  
  // Si la modalidad es PAGAR_MONETARIO (remuneración al 100% de recargo / pago doble)
  salarioMensual: number;
  salarioDiario: number;
  tasaRecargo: number; // 100% (x2) según Art. 67 C.T.
  montoAPagar: number; // salarioDiario * 2 (o proporción si horas < 8)
  estadoPago: 'Pendiente' | 'Pagado' | 'En Planilla';
  metodoPago?: 'Efectivo' | 'Transferencia Bancaria' | 'Planilla Quincenal';
  fechaPago?: string;
  
  // Si la modalidad es DIA_LIBRE_COMPENSATORIO (otorgado en otra fecha o día de la semana)
  fechaCompensatoriaAsignada?: string; // YYYY-MM-DD
  diaSemanaCompensatorio?: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';
  estadoCompensacion?: 'Por Asignar' | 'Programado' | 'Disfrutado';
  fechaDisfrutado?: string;
  diaLibreId?: string; // ID en ModuloDiasLibres para sincronización bidireccional
  
  // Auditoría y notas
  observaciones?: string;
  autorizadoPor: string;
  fechaRegistro: string;
}

export type TipoIncrementoSalarial = 'monto_fijo' | 'porcentaje' | 'nuevo_salario';

export interface ParametrosCalculoAumento {
  salarioInicial?: number; // Salario base cuando empezó a trabajar
  salarioAnterior?: number; // Último salario previo al aumento
  tipoIncremento: TipoIncrementoSalarial;
  valorIncremento: number; // Monto en C$, porcentaje % o nuevo salario neto
  fechaIngreso?: string; // Fecha en que empezó a trabajar (YYYY-MM-DD)
  fechaAumento?: string; // Fecha en que entra en vigor el aumento (YYYY-MM-DD)
  motivo?: string;
}

export interface ResultadoCalculoAumento {
  salarioInicial: number; // Salario con el que empezó a trabajar
  salarioAnterior: number; // Último salario antes del nuevo incremento
  tipoIncremento: TipoIncrementoSalarial;
  valorIncremento: number;
  montoIncremento: number; // Monto en Córdobas (C$) del incremento
  porcentajeIncremento: number; // Porcentaje de aumento sobre el último salario
  porcentajeCrecimientoTotal: number; // Crecimiento acumulado desde que empezó a trabajar
  nuevoSalario: number; // Último salario más lo del incremento
  
  // Desglose de bases laborales legales (Nicaragua base 30 días)
  salarioDiario: number; // nuevoSalario / 30
  salarioQuincenal: number; // nuevoSalario / 2
  salarioSemanal: number; // (nuevoSalario / 30) * 7
  valorHoraOrdinaria: number; // nuevoSalario / 240
  valorHoraExtra: number; // valorHoraOrdinaria * 2 (100% recargo Art. 58 C.T.)
  valorDiaFeriado: number; // salarioDiario * 2 (Art. 67 C.T.)
  
  // Diferenciales comparativos frente al último salario
  diferenciaSalarioMensual: number;
  diferenciaSalarioQuincenal: number;
  diferenciaSalarioDiario: number;
  
  // Impacto en deducciones legales
  inssLaboralNuevo: number; // 7% sobre nuevo salario
  inssLaboralAnterior: number; // 7% sobre salario previo
  diferenciaInssLaboral: number;
  incrementoNetoMensual: number; // montoIncremento - diferenciaInssLaboral
  
  // Antigüedad laboral
  tiempoLaboradoTexto?: string;
  antiguedadAnios?: number;
  antiguedadMeses?: number;
  antiguedadDias?: number;
  
  // Resumen textual
  resumenExplicativo: string;
}

export interface RegistroAumentoSalarial {
  id: string;
  empleadoId: string;
  nombreEmpleado: string;
  cargoEmpleado: string;
  fechaIngreso: string; // Cuando empezó a trabajar
  salarioInicial: number; // Salario al iniciar
  salarioAnterior: number; // Último salario antes del incremento
  tipoIncremento: TipoIncrementoSalarial;
  valorIncremento: number;
  montoIncremento: number; // Valor del aumento en C$
  porcentajeIncremento: number; // % sobre el último salario
  nuevoSalario: number; // Último salario más lo del incremento
  salarioDiarioNuevo: number;
  salarioQuincenalNuevo: number;
  fechaEfectiva: string; // Fecha del aumento
  motivo: string;
  autorizadoPor?: string;
  fechaRegistro: string;
}

export type TipoDescansoHistorial = 
  | 'Vacaciones Gozadas'
  | 'Descanso Semanal'
  | 'A Cuenta de Vacaciones'
  | 'Día Compensatorio'
  | 'Feriado Compensatorio'
  | 'Vacaciones Pagadas'
  | 'Permiso Especial';

export type EstadoDescansoHistorial = 'Disfrutado' | 'Programado' | 'Aprobado' | 'Pendiente' | 'Cancelado';

export interface RegistroHistorialDescanso {
  id: string;
  empleadoId: string;
  nombreEmpleado: string;
  cargoEmpleado?: string;
  departamento?: string;
  tipo: TipoDescansoHistorial;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin?: string; // YYYY-MM-DD
  dias: number; // Cantidad de días tomados / asignados
  descuentaSaldoVacaciones: boolean;
  estado: EstadoDescansoHistorial;
  motivo?: string;
  autorizadoPor?: string;
  referenciaId?: string;
  origenModulo: 'Solicitud Vacaciones' | 'Día Libre Semanal' | 'Descanso Programado' | 'Feriado Compensatorio' | 'Vacaciones Pagadas' | 'Manual';
  fechaRegistro: string;
  observacionLegal?: string; // Referencia al Código del Trabajo (Art. 76, Art. 64, Art. 67)
  montoMonetario?: number; // Para vacaciones pagadas o liquidaciones
}

export interface ResumenHistorialDescansos {
  empleadoId: string;
  totalRegistros: number;
  totalDiasGeneral: number;
  totalDiasVacacionesGozadas: number; // Art. 76 C.T.
  totalDiasACuentaVacaciones: number; // Días tomados a cuenta
  totalDescansosSemanales: number; // Art. 64 C.T.
  totalDiasCompensatorios: number; // Art. 67 C.T. (feriados / horas extras)
  totalDiasPermisoEspecial: number;
  totalDiasVacacionesPagadas: number;
  diasDeducidosSaldoVacaciones: number; // Total que afectó el saldo de vacaciones
  ultimoDescansoTomado?: RegistroHistorialDescanso;
  proximoDescansoProgramado?: RegistroHistorialDescanso;
}

export interface FiltrosHistorialDescanso {
  empleadoId?: string;
  tipo?: TipoDescansoHistorial | 'TODOS';
  anio?: number;
  mes?: number;
  estado?: EstadoDescansoHistorial | 'TODOS';
  busqueda?: string;
}



