import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  Coffee,
  Palmtree,
  Star,
  ChevronLeft,
  ChevronRight,
  Plus,
  Users,
  X,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Clock,
  DollarSign,
  ShieldCheck,
  Search,
  Filter,
  Eye,
  TrendingDown
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Empleado, SolicitudVacaciones, RegistroFeriadoTrabajado, ModalidadCompensacionFeriado } from '../types';
import { 
  formatearCordobas, 
  obtenerFeriadosNicaragua, 
  calcularRemuneracionFeriado,
  FeriadoNicaInfo
} from '../utils/calculosNica';
import { DiaLibreSemanal, TipoDiaLibre, obtenerDiaSemanaNica } from './ModuloDiasLibres';

type TipoEventoCalendario = 'dia_libre' | 'vacaciones' | 'feriado';

interface EventoDia {
  id: string;
  tipo: TipoEventoCalendario;
  titulo: string;
  subtitulo?: string;
  color: 'purple' | 'emerald' | 'amber' | 'blue';
  detalles: any;
}

export const ModuloCalendarioLaboral: React.FC = () => {
  const { empleados, solicitudes, actualizarEmpleado, recargarDatos, modoFirebaseReal } = useData();
  const { usuarioActual } = useAuth();
  const { success, warning, error } = useToast();

  // 1. Colaborador Seleccionado (Pestaña)
  const [colaboradorId, setColaboradorId] = useState<string>('');
  const [busquedaColaborador, setBusquedaColaborador] = useState<string>('');

  // 2. Mes y Año del Calendario
  const hoy = new Date();
  const [mesActual, setMesActual] = useState<number>(hoy.getMonth()); // 0 - 11
  const [anioActual, setAnioActual] = useState<number>(hoy.getFullYear());

  // 3. Filtro de eventos en el calendario
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'dia_libre' | 'vacaciones' | 'feriado'>('todos');

  // 4. Modal de Registro Directo en Fecha Seleccionada
  const [modalRegistroAbierto, setModalRegistroAbierto] = useState<boolean>(false);
  const [fechaSeleccionadaModal, setFechaSeleccionadaModal] = useState<string>('');
  const [tipoRegistro, setTipoRegistro] = useState<TipoEventoCalendario>('dia_libre');

  // Estados del Formulario del Modal
  const [tipoDiaLibre, setTipoDiaLibre] = useState<TipoDiaLibre>('Descanso Semanal (Art. 64 C.T.)');
  const [motivoDiaLibre, setMotivoDiaLibre] = useState<string>('Día de descanso semanal obligatorio remunerado');
  const [motivoVacaciones, setMotivoVacaciones] = useState<string>('Período de descanso de vacaciones de ley');
  const [modalidadFeriado, setModalidadFeriado] = useState<ModalidadCompensacionFeriado>('PAGAR_MONETARIO');
  const [horasFeriado, setHorasFeriado] = useState<number>(8);
  const [fechaCompensatoriaFeriado, setFechaCompensatoriaFeriado] = useState<string>('');
  const [guardando, setGuardando] = useState<boolean>(false);

  // 5. Modal de Detalle de Día Existente
  const [modalDetalleAbierto, setModalDetalleAbierto] = useState<boolean>(false);
  const [eventosDiaDetalle, setEventosDiaDetalle] = useState<EventoDia[]>([]);
  const [fechaDetalle, setFechaDetalle] = useState<string>('');

  // 6. Almacenamiento local de Días Libres, Vacaciones y Feriados
  const [diasLibres, setDiasLibres] = useState<DiaLibreSemanal[]>([]);
  const [feriadosTrabajados, setFeriadosTrabajados] = useState<RegistroFeriadoTrabajado[]>([]);
  const [solicitudesVacaciones, setSolicitudesVacaciones] = useState<SolicitudVacaciones[]>([]);

  // Inicializar colaborador seleccionado
  useEffect(() => {
    if (empleados.length > 0 && !colaboradorId) {
      setColaboradorId(empleados[0].id);
    }
  }, [empleados, colaboradorId]);

  // Cargar Días Libres, Feriados y Vacaciones de localStorage de forma reactiva
  const cargarRegistrosLocales = () => {
    try {
      const savedDL = localStorage.getItem('sendavac_dias_libres_semanales');
      if (savedDL) setDiasLibres(JSON.parse(savedDL));

      const savedFT = localStorage.getItem('sendavac_feriados_trabajados');
      if (savedFT) setFeriadosTrabajados(JSON.parse(savedFT));

      // Cargar solicitudes de vacaciones desde localStorage (sendavac_solicitudes y retrocompatibilidad con sendavac_solicitudes_locales)
      const savedSol = localStorage.getItem('sendavac_solicitudes');
      let listaSol: SolicitudVacaciones[] = [];
      if (savedSol) {
        try {
          listaSol = JSON.parse(savedSol);
        } catch (e) {
          console.error(e);
        }
      }

      const savedSolLocales = localStorage.getItem('sendavac_solicitudes_locales');
      if (savedSolLocales) {
        try {
          const parsedLocales: SolicitudVacaciones[] = JSON.parse(savedSolLocales);
          listaSol = [...listaSol, ...parsedLocales];
        } catch (e) {
          console.error(e);
        }
      }

      // Unificar solicitudes de context con las de localStorage deduplicando por id
      const mapSol = new Map<string, SolicitudVacaciones>();
      [...solicitudes, ...listaSol].forEach(s => {
        if (s && s.id) mapSol.set(s.id, s);
      });
      setSolicitudesVacaciones(Array.from(mapSol.values()));
    } catch (e) {
      console.error('Error cargando registros de calendario:', e);
    }
  };

  useEffect(() => {
    cargarRegistrosLocales();
  }, [modalRegistroAbierto, modalDetalleAbierto, solicitudes]);

  // Colaborador actual seleccionado
  const empleadoActual = useMemo(() => {
    return empleados.find(e => e.id === colaboradorId) || empleados[0];
  }, [empleados, colaboradorId]);

  // Feriados Oficiales de Nicaragua para el año actual
  const feriadosOficialesAnio = useMemo(() => {
    return obtenerFeriadosNicaragua(anioActual);
  }, [anioActual]);

  // Colaboradores filtrados para la barra de pestañas
  const colaboradoresFiltrados = useMemo(() => {
    if (!busquedaColaborador.trim()) return empleados;
    const term = busquedaColaborador.toLowerCase();
    return empleados.filter(e => 
      e.nombre.toLowerCase().includes(term) ||
      e.cargo.toLowerCase().includes(term) ||
      (e.departamento && e.departamento.toLowerCase().includes(term))
    );
  }, [empleados, busquedaColaborador]);

  // Navegación de Meses
  const irMesAnterior = () => {
    if (mesActual === 0) {
      setMesActual(11);
      setAnioActual(prev => prev - 1);
    } else {
      setMesActual(prev => prev - 1);
    }
  };

  const irMesSiguiente = () => {
    if (mesActual === 11) {
      setMesActual(0);
      setAnioActual(prev => prev + 1);
    } else {
      setMesActual(prev => prev + 1);
    }
  };

  const irAHoy = () => {
    const now = new Date();
    setMesActual(now.getMonth());
    setAnioActual(now.getFullYear());
  };

  // Nombres de meses y días
  const nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const diasSemanaNombres = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  // Generar la matriz de días para el mes visible
  const diasCalendario = useMemo(() => {
    // Primer día del mes
    const primerDia = new Date(anioActual, mesActual, 1);
    // Día de la semana (0 = Domingo, 1 = Lunes, ...) convertimos a 0 = Lunes, 6 = Domingo
    let diaInicioSemana = primerDia.getDay() - 1;
    if (diaInicioSemana === -1) diaInicioSemana = 6;

    // Total días del mes actual
    const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();
    // Total días del mes anterior
    const diasEnMesAnterior = new Date(anioActual, mesActual, 0).getDate();

    const celdas = [];

    // 1. Días del mes anterior (relleno)
    for (let i = diaInicioSemana - 1; i >= 0; i--) {
      const numDia = diasEnMesAnterior - i;
      const mesPrev = mesActual === 0 ? 11 : mesActual - 1;
      const anioPrev = mesActual === 0 ? anioActual - 1 : anioActual;
      const fechaStr = `${anioPrev}-${String(mesPrev + 1).padStart(2, '0')}-${String(numDia).padStart(2, '0')}`;
      celdas.push({
        numDia,
        fechaStr,
        esMesActual: false,
        esHoy: false
      });
    }

    // 2. Días del mes actual
    const hoyStr = new Date().toISOString().slice(0, 10);
    for (let i = 1; i <= diasEnMes; i++) {
      const fechaStr = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      celdas.push({
        numDia: i,
        fechaStr,
        esMesActual: true,
        esHoy: fechaStr === hoyStr
      });
    }

    // 3. Días del mes siguiente (relleno para completar 35 o 42 celdas)
    const celdasFaltantes = (7 - (celdas.length % 7)) % 7;
    for (let i = 1; i <= celdasFaltantes; i++) {
      const mesNext = mesActual === 11 ? 0 : mesActual + 1;
      const anioNext = mesActual === 11 ? anioActual + 1 : anioActual;
      const fechaStr = `${anioNext}-${String(mesNext + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      celdas.push({
        numDia: i,
        fechaStr,
        esMesActual: false,
        esHoy: false
      });
    }

    return celdas;
  }, [mesActual, anioActual]);

  // Mapa de eventos por fecha para el colaborador actual
  const eventosPorFecha = useMemo(() => {
    if (!empleadoActual) return new Map<string, EventoDia[]>();

    const mapa = new Map<string, EventoDia[]>();

    const agregarEvento = (fecha: string, evento: EventoDia) => {
      const list = mapa.get(fecha) || [];
      list.push(evento);
      mapa.set(fecha, list);
    };

    // A. DÍAS LIBRES SEMANALES del colaborador
    diasLibres
      .filter(dl => dl.empleadoId === empleadoActual.id)
      .forEach(dl => {
        agregarEvento(dl.fecha, {
          id: dl.id,
          tipo: 'dia_libre',
          titulo: dl.tipo === 'Descanso Semanal (Art. 64 C.T.)' ? 'Día Libre (Art. 64)' : dl.tipo,
          subtitulo: dl.motivo,
          color: 'purple',
          detalles: dl
        });
      });

    // B. VACACIONES del colaborador
    solicitudesVacaciones
      .filter(s => s.empleadoId === empleadoActual.id && (s.estado === 'Aprobado' || s.estado === 'Pendiente'))
      .forEach(s => {
        // Expandir rango de fechaInicio a fechaFin sin desfase horario
        try {
          if (!s.fechaInicio) return;
          const [y1, m1, d1] = s.fechaInicio.split('-').map(Number);
          const fFinStr = s.fechaFin || s.fechaInicio;
          const [y2, m2, d2] = fFinStr.split('-').map(Number);

          const curr = new Date(y1, m1 - 1, d1, 12, 0, 0);
          const end = new Date(y2, m2 - 1, d2, 12, 0, 0);

          while (curr <= end) {
            const y = curr.getFullYear();
            const m = String(curr.getMonth() + 1).padStart(2, '0');
            const d = String(curr.getDate()).padStart(2, '0');
            const fStr = `${y}-${m}-${d}`;

            agregarEvento(fStr, {
              id: `${s.id}-${fStr}`,
              tipo: 'vacaciones',
              titulo: 'Vacaciones (Art. 76)',
              subtitulo: s.motivo || 'Vacaciones de ley',
              color: 'emerald',
              detalles: s
            });
            curr.setDate(curr.getDate() + 1);
          }
        } catch (e) {
          console.error('Error calculando fechas de vacaciones:', e);
        }
      });

    // C. FERIADOS TRABAJADOS del colaborador
    feriadosTrabajados
      .filter(ft => ft.empleadoId === empleadoActual.id)
      .forEach(ft => {
        agregarEvento(ft.fechaFeriado, {
          id: ft.id,
          tipo: 'feriado',
          titulo: ft.modalidad === 'PAGAR_MONETARIO' ? 'Feriado Pagado Doble' : 'Feriado Compensado',
          subtitulo: ft.nombreFeriado,
          color: 'amber',
          detalles: ft
        });
      });

    return mapa;
  }, [empleadoActual, diasLibres, solicitudesVacaciones, feriadosTrabajados]);

  // Mapa de Feriados Oficiales de Ley de Nicaragua (Generales del calendario)
  const feriadosOficialesMap = useMemo(() => {
    const mapa = new Map<string, FeriadoNicaInfo>();
    feriadosOficialesAnio.forEach(f => {
      const fStr = `${anioActual}-${String(f.mes).padStart(2, '0')}-${String(f.dia).padStart(2, '0')}`;
      mapa.set(fStr, f);
    });
    return mapa;
  }, [feriadosOficialesAnio, anioActual]);

  // Métricas del Colaborador Seleccionado
  const metricasColaborador = useMemo(() => {
    if (!empleadoActual) return { diasLibresMes: 0, vacacionesMes: 0, feriadosMes: 0 };

    const mesStr = String(mesActual + 1).padStart(2, '0');
    const anioStr = String(anioActual);
    const prefijoMes = `${anioStr}-${mesStr}`;

    const dlMes = diasLibres.filter(d => d.empleadoId === empleadoActual.id && d.fecha.startsWith(prefijoMes)).length;

    let vacMes = 0;
    solicitudesVacaciones
      .filter(s => s.empleadoId === empleadoActual.id && (s.estado === 'Aprobado' || s.estado === 'Pendiente'))
      .forEach(s => {
        if ((s.fechaInicio && s.fechaInicio.startsWith(prefijoMes)) || (s.fechaFin && s.fechaFin.startsWith(prefijoMes))) {
          vacMes += (s.diasSolicitados || 1);
        }
      });

    const ferMes = feriadosTrabajados.filter(f => f.empleadoId === empleadoActual.id && f.fechaFeriado.startsWith(prefijoMes)).length;

    return {
      diasLibresMes: dlMes,
      vacacionesMes: vacMes,
      feriadosMes: ferMes
    };
  }, [empleadoActual, diasLibres, solicitudesVacaciones, feriadosTrabajados, mesActual, anioActual]);

  // Abrir Modal de Registro en Fecha
  const handleClicCelda = (fechaStr: string) => {
    const eventos = eventosPorFecha.get(fechaStr) || [];
    if (eventos.length > 0) {
      // Si ya tiene eventos, abrir modal de detalles/acciones
      setFechaDetalle(fechaStr);
      setEventosDiaDetalle(eventos);
      setModalDetalleAbierto(true);
    } else {
      // Si está vacía, abrir modal para registrar nuevo evento
      setFechaSeleccionadaModal(fechaStr);
      // Pre-seleccionar tipo sugerido: si es feriado oficial, sugerir 'feriado'
      if (feriadosOficialesMap.has(fechaStr)) {
        setTipoRegistro('feriado');
      } else if (filtroTipo === 'vacaciones') {
        setTipoRegistro('vacaciones');
      } else {
        setTipoRegistro('dia_libre');
      }
      setModalRegistroAbierto(true);
    }
  };

  // Guardar Nuevo Evento en el Calendario
  const handleGuardarEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empleadoActual || !fechaSeleccionadaModal) return;

    setGuardando(true);
    const diaDetectado = obtenerDiaSemanaNica(fechaSeleccionadaModal);

    try {
      if (tipoRegistro === 'dia_libre') {
        // REGISTRO DE DÍA LIBRE
        const nuevoDL: DiaLibreSemanal = {
          id: `dl-${Date.now()}`,
          empleadoId: empleadoActual.id,
          nombreEmpleado: empleadoActual.nombre,
          cargoEmpleado: empleadoActual.cargo,
          departamento: empleadoActual.departamento || 'Tienda',
          fecha: fechaSeleccionadaModal,
          diaSemana: diaDetectado,
          tipo: tipoDiaLibre,
          estado: 'Programado',
          motivo: motivoDiaLibre.trim() || 'Día libre programado',
          fechaRegistro: new Date().toISOString().slice(0, 10),
          autorizadoPor: usuarioActual?.nombre || 'Gerencia General'
        };

        const lista = [...diasLibres, nuevoDL];
        setDiasLibres(lista);
        localStorage.setItem('sendavac_dias_libres_semanales', JSON.stringify(lista));

        // Si es a cuenta de vacaciones, deducir 1 día
        if (tipoDiaLibre === 'A Cuenta de Vacaciones') {
          const tomadosActuales = empleadoActual.diasTomados || 0;
          await actualizarEmpleado(empleadoActual.id, {
            diasTomados: Number((tomadosActuales + 1).toFixed(2))
          });
        }

        success('Día Libre Registrado', `Se programó el día libre para ${empleadoActual.nombre} el ${fechaSeleccionadaModal}`);
      } else if (tipoRegistro === 'vacaciones') {
        // REGISTRO DE VACACIONES (1 día individual en la fecha seleccionada)
        if (empleadoActual.saldoDisponible < 1) {
          warning('Saldo Insuficiente', `${empleadoActual.nombre} tiene ${empleadoActual.saldoDisponible} días de vacaciones disponibles.`);
        }

        const nuevaSolicitud: SolicitudVacaciones = {
          id: `sol-${Date.now()}`,
          empleadoId: empleadoActual.id,
          nombreEmpleado: empleadoActual.nombre,
          cargoEmpleado: empleadoActual.cargo,
          fechaInicio: fechaSeleccionadaModal,
          fechaFin: fechaSeleccionadaModal,
          diasSolicitados: 1,
          motivo: motivoVacaciones.trim() || 'Vacaciones tomadas',
          estado: 'Aprobado',
          fechaSolicitud: new Date().toISOString().slice(0, 10),
          fechaResolucion: new Date().toISOString().slice(0, 10),
          comentarioAdmin: 'Aprobado directamente desde el Calendario Laboral'
        };

        // Guardar solicitud en el almacenamiento oficial (sendavac_solicitudes)
        const savedSol = localStorage.getItem('sendavac_solicitudes');
        let listaSol: SolicitudVacaciones[] = [];
        if (savedSol) {
          try {
            listaSol = JSON.parse(savedSol);
          } catch (e) {
            console.error(e);
          }
        }
        if (listaSol.length === 0) {
          listaSol = [...solicitudesVacaciones];
        }
        const listaActualizada = [nuevaSolicitud, ...listaSol.filter(s => s.id !== nuevaSolicitud.id)];
        localStorage.setItem('sendavac_solicitudes', JSON.stringify(listaActualizada));
        localStorage.setItem('sendavac_solicitudes_locales', JSON.stringify(listaActualizada));
        setSolicitudesVacaciones(listaActualizada);

        // Si Firebase está activo, sincronizar en la colección solicitudes
        if (modoFirebaseReal && db) {
          try {
            await setDoc(doc(db, 'solicitudes', nuevaSolicitud.id), nuevaSolicitud);
          } catch (fbErr) {
            console.warn('No se pudo guardar la solicitud en Firestore:', fbErr);
          }
        }

        // Deducir 1 día del colaborador
        const tomadosActuales = empleadoActual.diasTomados || 0;
        await actualizarEmpleado(empleadoActual.id, {
          diasTomados: Number((tomadosActuales + 1).toFixed(2))
        });

        if (recargarDatos) await recargarDatos();
        success('Vacaciones Asignadas', `Se asignó 1 día de vacaciones a ${empleadoActual.nombre} el ${fechaSeleccionadaModal}`);
      } else if (tipoRegistro === 'feriado') {
        // REGISTRO DE FERIADO TRABAJADO
        const feriadoOficial = feriadosOficialesMap.get(fechaSeleccionadaModal);
        const nombreFeriado = feriadoOficial ? feriadoOficial.descripcion : 'Feriado de Ley';

        const calc = calcularRemuneracionFeriado(empleadoActual.salarioMensual, horasFeriado);

        const nuevoFT: RegistroFeriadoTrabajado = {
          id: `fer-${Date.now()}`,
          numeroComprobante: `FER-${new Date().getFullYear()}-${String(feriadosTrabajados.length + 1).padStart(3, '0')}`,
          empleadoId: empleadoActual.id,
          nombreEmpleado: empleadoActual.nombre,
          cargoEmpleado: empleadoActual.cargo,
          departamento: empleadoActual.departamento || 'Tienda',
          fechaFeriado: fechaSeleccionadaModal,
          nombreFeriado,
          horasTrabajadas: horasFeriado,
          modalidad: modalidadFeriado,
          salarioMensual: empleadoActual.salarioMensual,
          salarioDiario: calc.salarioDiario,
          tasaRecargo: 100,
          montoAPagar: modalidadFeriado === 'PAGAR_MONETARIO' ? calc.montoAPagar : 0,
          fechaCompensatoriaAsignada: modalidadFeriado === 'DIA_LIBRE_COMPENSATORIO' ? fechaCompensatoriaFeriado : undefined,
          estadoCompensacion: modalidadFeriado === 'DIA_LIBRE_COMPENSATORIO' ? 'Programado' : undefined,
          estadoPago: modalidadFeriado === 'PAGAR_MONETARIO' ? 'Pendiente' : 'Pagado',
          fechaRegistro: new Date().toISOString().slice(0, 10),
          autorizadoPor: usuarioActual?.nombre || 'Gerencia General'
        };

        const lista = [...feriadosTrabajados, nuevoFT];
        setFeriadosTrabajados(lista);
        localStorage.setItem('sendavac_feriados_trabajados', JSON.stringify(lista));

        success('Feriado Registrado', `Se registró la labor de feriado para ${empleadoActual.nombre} con compensación.`);
      }

      setModalRegistroAbierto(false);
    } catch (err: any) {
      console.error(err);
      error('Error al guardar', err?.message || 'No se pudo completar el registro');
    } finally {
      setGuardando(false);
    }
  };

  // Eliminar un evento del colaborador
  const handleEliminarEvento = async (evento: EventoDia) => {
    if (!empleadoActual) return;

    try {
      if (evento.tipo === 'dia_libre') {
        const nuevaLista = diasLibres.filter(d => d.id !== evento.detalles.id);
        setDiasLibres(nuevaLista);
        localStorage.setItem('sendavac_dias_libres_semanales', JSON.stringify(nuevaLista));

        // Si era a cuenta de vacaciones, devolver el día
        if (evento.detalles.tipo === 'A Cuenta de Vacaciones') {
          const tomados = Math.max(0, (empleadoActual.diasTomados || 0) - 1);
          await actualizarEmpleado(empleadoActual.id, { diasTomados: Number(tomados.toFixed(2)) });
        }
        success('Día Libre Eliminado', 'Se retiró el día libre del colaborador');
      } else if (evento.tipo === 'vacaciones') {
        const solId = evento.detalles?.id || (evento.id.includes('-') ? evento.id.split('-')[0] : evento.id);

        // Remover solicitud de localStorage y estado reactivo
        const actualizarClave = (clave: string) => {
          const raw = localStorage.getItem(clave);
          if (raw) {
            try {
              const parsed: SolicitudVacaciones[] = JSON.parse(raw);
              const filtrada = parsed.filter(s => s.id !== solId && !evento.id.startsWith(s.id));
              localStorage.setItem(clave, JSON.stringify(filtrada));
              return filtrada;
            } catch (e) {
              return null;
            }
          }
          return null;
        };

        const listaFiltrada = actualizarClave('sendavac_solicitudes') || 
                              solicitudesVacaciones.filter(s => s.id !== solId && !evento.id.startsWith(s.id));
        actualizarClave('sendavac_solicitudes_locales');
        setSolicitudesVacaciones(listaFiltrada);

        // Si Firebase está activo
        if (modoFirebaseReal && db && solId) {
          try {
            await deleteDoc(doc(db, 'solicitudes', solId));
          } catch (fbErr) {
            console.warn('No se pudo eliminar en Firebase:', fbErr);
          }
        }

        // Devolver día de vacaciones
        const tomados = Math.max(0, (empleadoActual.diasTomados || 0) - 1);
        await actualizarEmpleado(empleadoActual.id, { diasTomados: Number(tomados.toFixed(2)) });
        if (recargarDatos) await recargarDatos();

        success('Vacaciones Canceladas', 'Se reintegró el día al saldo de vacaciones del colaborador');
      } else if (evento.tipo === 'feriado') {
        const nuevaLista = feriadosTrabajados.filter(f => f.id !== evento.detalles.id);
        setFeriadosTrabajados(nuevaLista);
        localStorage.setItem('sendavac_feriados_trabajados', JSON.stringify(nuevaLista));
        success('Feriado Retirado', 'Se retiró el registro de feriado trabajado');
      }

      setModalDetalleAbierto(false);
    } catch (err: any) {
      console.error(err);
      error('Error al eliminar', err?.message || 'No se pudo eliminar el registro');
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn text-left w-full">
      {/* 1. CABECERA PRINCIPAL DEL MÓDULO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#0f172a] p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-0.5 shadow-lg shadow-blue-500/25 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[14px] flex items-center justify-center">
              <CalendarDays className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Calendario Laboral
              </h1>
              <span className="text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                Turnos y Descansos
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Programación interactiva por colaborador: Días Libres (Art. 64), Vacaciones (Art. 76) y Feriados (Art. 66-67)
            </p>
          </div>
        </div>

        {/* Botón Acción Rápida */}
        <button
          type="button"
          onClick={() => {
            setFechaSeleccionadaModal(new Date().toISOString().slice(0, 10));
            setTipoRegistro('dia_libre');
            setModalRegistroAbierto(true);
          }}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-blue-600/20 transition cursor-pointer active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar en Calendario</span>
        </button>
      </div>

      {/* 2. LAYOUT PRINCIPAL: LISTA DE EMPLEADOS VERTICALMENTE ALINEADA + ÁREA DE CALENDARIO */}
      <div className="flex flex-col lg:flex-row gap-5 items-start w-full">
        
        {/* PANEL IZQUIERDO: LISTA DE EMPLEADOS ALINEADOS EN LISTA */}
        <div className="w-full lg:w-80 xl:w-96 shrink-0 bg-white dark:bg-[#0f172a] p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3.5 sticky top-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Lista de Colaboradores
              </h3>
            </div>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {empleados.length} en total
            </span>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Selecciona un colaborador para desplegar y gestionar su calendario individual:
          </p>

          {/* Buscador de Colaboradores */}
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busquedaColaborador}
              onChange={(e) => setBusquedaColaborador(e.target.value)}
              placeholder="Buscar colaborador..."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {/* Lista Vertical de Colaboradores Alineados */}
          <div className="flex flex-col space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1 touch-scroll">
            {colaboradoresFiltrados.map((emp) => {
              const estaSeleccionado = emp.id === colaboradorId;
              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => setColaboradorId(emp.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer text-left ${
                    estaSeleccionado
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.01]'
                      : 'bg-slate-50/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                      estaSeleccionado 
                        ? 'bg-white/20 text-white shadow-xs' 
                        : 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                    }`}>
                      {emp.nombre.charAt(0)}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 pr-2">
                      <p className={`text-xs font-black truncate ${
                        estaSeleccionado ? 'text-white' : 'text-slate-900 dark:text-white'
                      }`}>
                        {emp.nombre}
                      </p>
                      <p className={`text-[11px] truncate ${
                        estaSeleccionado ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        {emp.cargo}
                      </p>
                      <span className={`text-[9px] font-semibold block truncate ${
                        estaSeleccionado ? 'text-blue-200' : 'text-slate-400'
                      }`}>
                        {emp.departamento || 'Tienda'}
                      </span>
                    </div>
                  </div>

                  {/* Badge de saldo */}
                  <div className="text-right shrink-0">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full inline-block ${
                      estaSeleccionado 
                        ? 'bg-white/25 text-white' 
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    }`}>
                      {emp.saldoDisponible}d vac.
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* PANEL DERECHO: FICHA DEL COLABORADOR + CALENDARIO */}
        <div className="flex-1 min-w-0 space-y-5 w-full">

      {/* 3. FICHA RESUMEN DEL COLABORADOR SELECCIONADO */}
      {empleadoActual && (
        <div className="bg-white dark:bg-[#0f172a] p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              {empleadoActual.nombre.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {empleadoActual.nombre}
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {empleadoActual.departamento || 'Tienda'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {empleadoActual.cargo} • Ingreso: <strong className="text-slate-700 dark:text-slate-200">{empleadoActual.fechaIngreso}</strong> • Salario: <strong className="text-slate-700 dark:text-slate-200">{formatearCordobas(empleadoActual.salarioMensual)}</strong>
              </p>
            </div>
          </div>

          {/* 3 Mini Tarjetas de Métricas del Mes para este Empleado */}
          <div className="grid grid-cols-3 gap-2.5 shrink-0">
            {/* Vacaciones */}
            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 rounded-2xl p-2.5 sm:px-3 text-center min-w-[100px]">
              <div className="flex items-center justify-center gap-1 text-emerald-700 dark:text-emerald-300 mb-0.5">
                <Palmtree className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase font-black">Vacaciones</span>
              </div>
              <p className="text-base sm:text-lg font-black text-emerald-800 dark:text-emerald-200">
                {empleadoActual.saldoDisponible} <span className="text-[10px] font-bold">días</span>
              </p>
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 block font-semibold">
                {empleadoActual.diasTomados} tomados
              </span>
            </div>

            {/* Días Libres */}
            <div className="bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/80 rounded-2xl p-2.5 sm:px-3 text-center min-w-[100px]">
              <div className="flex items-center justify-center gap-1 text-purple-700 dark:text-purple-300 mb-0.5">
                <Coffee className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase font-black">Días Libres</span>
              </div>
              <p className="text-base sm:text-lg font-black text-purple-800 dark:text-purple-200">
                {metricasColaborador.diasLibresMes} <span className="text-[10px] font-bold">este mes</span>
              </p>
              <span className="text-[9px] text-purple-600 dark:text-purple-400 block font-semibold">
                Art. 64 C.T.
              </span>
            </div>

            {/* Feriados */}
            <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 rounded-2xl p-2.5 sm:px-3 text-center min-w-[100px]">
              <div className="flex items-center justify-center gap-1 text-amber-700 dark:text-amber-300 mb-0.5">
                <Star className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase font-black">Feriados</span>
              </div>
              <p className="text-base sm:text-lg font-black text-amber-800 dark:text-amber-200">
                {metricasColaborador.feriadosMes} <span className="text-[10px] font-bold">este mes</span>
              </p>
              <span className="text-[9px] text-amber-600 dark:text-amber-400 block font-semibold">
                Art. 66-67 C.T.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. CALENDARIO MENSUAL INTERACTIVO */}
      <div className="bg-white dark:bg-[#0f172a] p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        {/* Controles de Navegación del Calendario */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              {nombresMeses[mesActual]} {anioActual}
            </h3>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={irMesAnterior}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer"
                title="Mes anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={irAHoy}
                className="px-2.5 py-1 text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={irMesSiguiente}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer"
                title="Mes siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filtros de eventos visibles */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400">Ver:</span>
            <button
              type="button"
              onClick={() => setFiltroTipo('todos')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                filtroTipo === 'todos'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setFiltroTipo('dia_libre')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                filtroTipo === 'dia_libre'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
              }`}
            >
              <Coffee className="w-3 h-3" />
              <span>Días Libres</span>
            </button>
            <button
              type="button"
              onClick={() => setFiltroTipo('vacaciones')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                filtroTipo === 'vacaciones'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              <Palmtree className="w-3 h-3" />
              <span>Vacaciones</span>
            </button>
            <button
              type="button"
              onClick={() => setFiltroTipo('feriado')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                filtroTipo === 'feriado'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
              }`}
            >
              <Star className="w-3 h-3" />
              <span>Feriados</span>
            </button>
          </div>
        </div>

        {/* Encabezado de los días de la semana */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center">
          {diasSemanaNombres.map((dia, idx) => (
            <div
              key={dia}
              className={`py-2 text-[11px] sm:text-xs font-black uppercase tracking-wider rounded-xl ${
                idx >= 5 
                  ? 'text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20' 
                  : 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50'
              }`}
            >
              <span className="hidden sm:inline">{dia}</span>
              <span className="sm:hidden">{dia.slice(0, 3)}</span>
            </div>
          ))}
        </div>

        {/* Matriz de Celdas del Calendario */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {diasCalendario.map((celda, idx) => {
            const eventos = (eventosPorFecha.get(celda.fechaStr) || []).filter(e => {
              if (filtroTipo === 'todos') return true;
              return e.tipo === filtroTipo;
            });

            const feriadoOficial = feriadosOficialesMap.get(celda.fechaStr);
            const esFinDeSemana = (idx % 7) >= 5;

            return (
              <div
                key={celda.fechaStr + idx}
                onClick={() => handleClicCelda(celda.fechaStr)}
                className={`min-h-[90px] sm:min-h-[110px] p-1.5 sm:p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 ${
                  !celda.esMesActual
                    ? 'bg-slate-50/40 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800/40 opacity-40'
                    : celda.esHoy
                    ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-400 dark:border-blue-600 shadow-xs'
                    : esFinDeSemana
                    ? 'bg-slate-50/80 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
                }`}
              >
                {/* Parte superior de la celda: Número de día y badges de feriado */}
                <div className="flex items-start justify-between gap-1">
                  <span className={`text-xs sm:text-sm font-black w-6 h-6 rounded-lg flex items-center justify-center ${
                    celda.esHoy
                      ? 'bg-blue-600 text-white shadow-xs'
                      : esFinDeSemana
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-800 dark:text-slate-200'
                  }`}>
                    {celda.numDia}
                  </span>

                  {/* Feriado Oficial de Ley Nicaragua */}
                  {feriadoOficial && (
                    <span 
                      className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 truncate max-w-[80px]"
                      title={feriadoOficial.descripcion}
                    >
                      ⭐ {feriadoOficial.descripcion.split(' ')[0]}
                    </span>
                  )}
                </div>

                {/* Eventos asignados al colaborador en esta fecha */}
                <div className="space-y-1 my-1">
                  {eventos.map((ev) => (
                    <div
                      key={ev.id}
                      className={`text-[10px] font-bold p-1 rounded-lg truncate flex items-center gap-1 shadow-2xs ${
                        ev.tipo === 'dia_libre'
                          ? 'bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200 border border-purple-200 dark:border-purple-800'
                          : ev.tipo === 'vacaciones'
                          ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-200 dark:border-amber-800'
                      }`}
                      title={`${ev.titulo}: ${ev.subtitulo || ''}`}
                    >
                      {ev.tipo === 'dia_libre' && <Coffee className="w-3 h-3 shrink-0 text-purple-600" />}
                      {ev.tipo === 'vacaciones' && <Palmtree className="w-3 h-3 shrink-0 text-emerald-600" />}
                      {ev.tipo === 'feriado' && <Star className="w-3 h-3 shrink-0 text-amber-600" />}
                      <span className="truncate">{ev.titulo}</span>
                    </div>
                  ))}
                </div>

                {/* Indicador sutil de clic para agregar */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-blue-600 dark:text-blue-400 font-bold flex items-center justify-end">
                  <Plus className="w-3 h-3" />
                  <span>Registrar</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Leyenda al pie del calendario */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-purple-600"></span>
              <span className="text-slate-600 dark:text-slate-400 font-medium">Día Libre Semanal (Art. 64 C.T.)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-600"></span>
              <span className="text-slate-600 dark:text-slate-400 font-medium">Vacaciones Pagadas (Art. 76 C.T.)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <span className="text-slate-600 dark:text-slate-400 font-medium">Feriado Trabajado / Compensado (Art. 66-67 C.T.)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-600"></span>
              <span className="text-slate-600 dark:text-slate-400 font-medium">Fecha Actual (Hoy)</span>
            </div>
          </div>

          <span className="text-[11px] text-slate-400">
            Haz clic en cualquier día para programar descansos o ver detalles
          </span>
        </div>
      </div>
    </div>
  </div>

      {/* 5. MODAL PARA REGISTRAR EN EL CALENDARIO (Directo en fecha) */}
      {modalRegistroAbierto && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          {/* Backdrop diáfano sin espacios oscuros */}
          <div 
            className="fixed inset-0 bg-black/15 dark:bg-black/30 backdrop-blur-[1px] transition-opacity"
            onClick={() => !guardando && setModalRegistroAbierto(false)}
          />

          <div 
            className="relative w-full max-w-[480px] bg-white dark:bg-[#0f172a] rounded-[26px] shadow-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 text-left my-auto animate-scaleIn z-10 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                    Programar en Calendario
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {empleadoActual?.nombre} • <strong>{fechaSeleccionadaModal}</strong> ({obtenerDiaSemanaNica(fechaSeleccionadaModal)})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalRegistroAbierto(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector de Tipo de Evento (Pestañas Rápidas) */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl">
              <button
                type="button"
                onClick={() => setTipoRegistro('dia_libre')}
                className={`py-2 px-2 rounded-xl text-xs font-black transition cursor-pointer flex flex-col items-center gap-1 ${
                  tipoRegistro === 'dia_libre'
                    ? 'bg-white dark:bg-purple-950 text-purple-700 dark:text-purple-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Coffee className="w-4 h-4 text-purple-600" />
                <span>Día Libre</span>
              </button>

              <button
                type="button"
                onClick={() => setTipoRegistro('vacaciones')}
                className={`py-2 px-2 rounded-xl text-xs font-black transition cursor-pointer flex flex-col items-center gap-1 ${
                  tipoRegistro === 'vacaciones'
                    ? 'bg-white dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Palmtree className="w-4 h-4 text-emerald-600" />
                <span>Vacaciones</span>
              </button>

              <button
                type="button"
                onClick={() => setTipoRegistro('feriado')}
                className={`py-2 px-2 rounded-xl text-xs font-black transition cursor-pointer flex flex-col items-center gap-1 ${
                  tipoRegistro === 'feriado'
                    ? 'bg-white dark:bg-amber-950 text-amber-700 dark:text-amber-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Star className="w-4 h-4 text-amber-600" />
                <span>Día Feriado</span>
              </button>
            </div>

            {/* Formulario según el Tipo */}
            <form onSubmit={handleGuardarEvento} className="space-y-3.5 text-xs">
              {/* CASO A: DÍA LIBRE */}
              {tipoRegistro === 'dia_libre' && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      TIPO DE DÍA LIBRE
                    </label>
                    <select
                      value={tipoDiaLibre}
                      onChange={(e) => setTipoDiaLibre(e.target.value as TipoDiaLibre)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    >
                      <option value="Descanso Semanal (Art. 64 C.T.)">Descanso Semanal Obligatorio (Art. 64 C.T.) - Remunerado</option>
                      <option value="A Cuenta de Vacaciones">A Cuenta de Vacaciones (Art. 76 C.T.) - Deduce 1 día</option>
                      <option value="Compensatorio">Compensatorio por Feriado o Turno Extra (Art. 67 C.T.)</option>
                      <option value="Permiso Especial">Permiso Especial / Motivo Personal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      MOTIVO / OBSERVACIÓN
                    </label>
                    <textarea
                      rows={2}
                      value={motivoDiaLibre}
                      onChange={(e) => setMotivoDiaLibre(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none"
                    />
                  </div>
                </>
              )}

              {/* CASO B: VACACIONES */}
              {tipoRegistro === 'vacaciones' && (
                <>
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Descuento Legal de Vacaciones (Art. 76 C.T.)</span>
                    </div>
                    <p>
                      Se registrará 1 día de vacaciones para esta fecha. Saldo disponible actual: <strong>{empleadoActual?.saldoDisponible} días</strong>.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      MOTIVO DE LA VACACIÓN
                    </label>
                    <textarea
                      rows={2}
                      value={motivoVacaciones}
                      onChange={(e) => setMotivoVacaciones(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                    />
                  </div>
                </>
              )}

              {/* CASO C: DÍA FERIADO */}
              {tipoRegistro === 'feriado' && (
                <>
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/60 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-1">
                    <span className="font-bold block">
                      {feriadosOficialesMap.has(fechaSeleccionadaModal) 
                        ? `⭐ Feriado Detectado: ${feriadosOficialesMap.get(fechaSeleccionadaModal)?.descripcion}` 
                        : '⭐ Feriado Nacional o Local'}
                    </span>
                    <p className="text-[11px]">
                      Conforme al Art. 67 del Código del Trabajo, si el colaborador labora este día se le debe remunerar con el 100% de recargo (pago doble) o concederle un día de descanso compensatorio.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      MODALIDAD DE COMPENSACIÓN
                    </label>
                    <select
                      value={modalidadFeriado}
                      onChange={(e) => setModalidadFeriado(e.target.value as ModalidadCompensacionFeriado)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    >
                      <option value="PAGAR_MONETARIO">Pagar Monetario (Recargo 100% - Pago Doble en Planilla)</option>
                      <option value="DIA_LIBRE_COMPENSATORIO">Dar Día Libre Compensatorio en otra fecha</option>
                    </select>
                  </div>

                  {modalidadFeriado === 'DIA_LIBRE_COMPENSATORIO' && (
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                        FECHA COMPENSATORIA ASIGNADA
                      </label>
                      <input
                        type="date"
                        required
                        value={fechaCompensatoriaFeriado}
                        onChange={(e) => setFechaCompensatoriaFeriado(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-bold text-slate-800 dark:text-white"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Botones */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  disabled={guardando}
                  onClick={() => setModalRegistroAbierto(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  {guardando ? 'Guardando...' : 'Confirmar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL PARA VER DETALLES / ELIMINAR EVENTOS DE UN DÍA */}
      {modalDetalleAbierto && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div 
            className="fixed inset-0 bg-black/15 dark:bg-black/30 backdrop-blur-[1px] transition-opacity"
            onClick={() => setModalDetalleAbierto(false)}
          />

          <div 
            className="relative w-full max-w-[460px] bg-white dark:bg-[#0f172a] rounded-[26px] shadow-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 text-left my-auto animate-scaleIn z-10 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Eventos del {fechaDetalle}
                </h3>
                <p className="text-xs text-slate-500">
                  {empleadoActual?.nombre} • {obtenerDiaSemanaNica(fechaDetalle)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalDetalleAbierto(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {eventosDiaDetalle.map((ev) => (
                <div 
                  key={ev.id}
                  className={`p-3.5 rounded-2xl border flex items-start justify-between gap-3 ${
                    ev.tipo === 'dia_libre'
                      ? 'bg-purple-50/70 border-purple-200 text-purple-900 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-200'
                      : ev.tipo === 'vacaciones'
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
                      : 'bg-amber-50/70 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200'
                  }`}
                >
                  <div className="space-y-1">
                    <span className="text-xs font-black uppercase tracking-wider block">
                      {ev.titulo}
                    </span>
                    <p className="text-xs font-medium">
                      {ev.subtitulo || 'Sin notas adicionales'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleEliminarEvento(ev)}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition cursor-pointer shadow-xs shrink-0"
                    title="Eliminar este evento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setModalDetalleAbierto(false);
                  setFechaSeleccionadaModal(fechaDetalle);
                  setModalRegistroAbierto(true);
                }}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar otro evento aquí</span>
              </button>

              <button
                type="button"
                onClick={() => setModalDetalleAbierto(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 transition cursor-pointer text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ModuloCalendarioLaboral;
