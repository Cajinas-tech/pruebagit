import React, { createContext, useContext, useState, useEffect } from 'react';
import { Empleado, SolicitudVacaciones } from '../types';
import { calcularVacacionesNica } from '../utils/calculosNica';
import { db, isConfigValid } from '../firebase';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  runTransaction
} from 'firebase/firestore';

interface DataContextType {
  empleados: Empleado[];
  solicitudes: SolicitudVacaciones[];
  cargando: boolean;
  modoFirebaseReal: boolean;
  notificacionesPendientes: number;
  agregarEmpleado: (datos: Omit<Empleado, 'id' | 'diasAcumulados' | 'saldoDisponible'>) => Promise<string>;
  actualizarEmpleado: (id: string, datos: Partial<Empleado>) => Promise<void>;
  eliminarEmpleado: (id: string) => Promise<void>;
  crearSolicitud: (datos: Omit<SolicitudVacaciones, 'id' | 'fechaSolicitud' | 'estado'>) => Promise<string>;
  procesarSolicitud: (solicitudId: string, nuevoEstado: 'Aprobado' | 'Rechazado', comentario?: string) => Promise<void>;
  recargarDatos: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Empleados semilla de la tienda nicaragüense
const EMPLEADOS_INICIALES: Empleado[] = [
  {
    id: 'emp-admin-1',
    nombre: 'Jairo Cajina',
    email: 'jairotten84@gmail.com',
    cargo: 'Gerente General / Administrador',
    departamento: 'Administración',
    telefono: '+505 8888-1234',
    fechaIngreso: '2023-01-15',
    salarioInicial: 30000,
    salarioAnterior: 32000,
    salarioMensual: 35000,
    fechaUltimoAumento: '2026-01-01',
    montoUltimoIncremento: 3000,
    porcentajeUltimoIncremento: 9.38,
    motivoUltimoIncremento: 'Ajuste anual gerencial por antigüedad y metas',
    diasAcumulados: 0,
    diasTomados: 10,
    saldoDisponible: 0,
    rol: 'administrador',
    estado: 'Activo'
  },
  {
    id: 'emp-2',
    nombre: 'María López Gutiérrez',
    email: 'maria.lopez@tienda.com',
    cargo: 'Cajera Principal',
    departamento: 'Caja y Ventas',
    telefono: '+505 8765-4321',
    fechaIngreso: '2023-08-01',
    salarioInicial: 11500,
    salarioAnterior: 12000,
    salarioMensual: 13500,
    fechaUltimoAumento: '2026-03-01',
    montoUltimoIncremento: 1500,
    porcentajeUltimoIncremento: 12.5,
    motivoUltimoIncremento: 'Ascenso y responsabilidad de arqueo de caja principal',
    diasAcumulados: 0,
    diasTomados: 5,
    saldoDisponible: 0,
    rol: 'cajero',
    estado: 'Activo'
  },
  {
    id: 'emp-3',
    nombre: 'Carlos Mendoza Jarquín',
    email: 'carlos.mendoza@tienda.com',
    cargo: 'Vendedor de Piso',
    departamento: 'Ventas (POS)',
    telefono: '+505 8321-9876',
    fechaIngreso: '2024-02-15',
    salarioInicial: 10000,
    salarioAnterior: 10000,
    salarioMensual: 11000,
    fechaUltimoAumento: '2026-02-15',
    montoUltimoIncremento: 1000,
    porcentajeUltimoIncremento: 10,
    motivoUltimoIncremento: 'Aumento al cumplir 2 años de servicio en tienda',
    diasAcumulados: 0,
    diasTomados: 2,
    saldoDisponible: 0,
    rol: 'vendedor',
    estado: 'Activo'
  },
  {
    id: 'emp-4',
    nombre: 'Andrea Morales Sequeira',
    email: 'andrea.morales@tienda.com',
    cargo: 'Encargada de Inventario y Bodega',
    departamento: 'Inventario',
    telefono: '+505 8456-7890',
    fechaIngreso: '2023-06-10',
    salarioInicial: 13000,
    salarioAnterior: 14000,
    salarioMensual: 15000,
    fechaUltimoAumento: '2026-06-10',
    montoUltimoIncremento: 1000,
    porcentajeUltimoIncremento: 7.14,
    motivoUltimoIncremento: 'Revisión periódica de desempeño en bodega',
    diasAcumulados: 0,
    diasTomados: 8,
    saldoDisponible: 0,
    rol: 'empleado',
    estado: 'Activo'
  },
  {
    id: 'emp-5',
    nombre: 'Roberto José Gómez Ruiz',
    email: 'roberto.gomez@tienda.com',
    cargo: 'Asistente de Ventas y Créditos',
    departamento: 'Créditos y Cuentas',
    telefono: '+505 8123-5678',
    fechaIngreso: '2024-07-01',
    salarioInicial: 10500,
    salarioAnterior: 10500,
    salarioMensual: 10500,
    diasAcumulados: 0,
    diasTomados: 0,
    saldoDisponible: 0,
    rol: 'empleado',
    estado: 'Activo'
  }
];

const SOLICITUDES_INICIALES: SolicitudVacaciones[] = [
  {
    id: 'sol-1',
    empleadoId: 'emp-2',
    nombreEmpleado: 'María López Gutiérrez',
    cargoEmpleado: 'Cajera Principal',
    fechaInicio: '2026-10-05',
    fechaFin: '2026-10-10',
    diasSolicitados: 6,
    motivo: 'Vacaciones familiares programadas',
    estado: 'Pendiente',
    fechaSolicitud: '2026-09-28'
  },
  {
    id: 'sol-2',
    empleadoId: 'emp-3',
    nombreEmpleado: 'Carlos Mendoza Jarquín',
    cargoEmpleado: 'Vendedor de Piso',
    fechaInicio: '2026-10-15',
    fechaFin: '2026-10-18',
    diasSolicitados: 4,
    motivo: 'Asuntos personales y descanso',
    estado: 'Pendiente',
    fechaSolicitud: '2026-09-29'
  },
  {
    id: 'sol-3',
    empleadoId: 'emp-4',
    nombreEmpleado: 'Andrea Morales Sequeira',
    cargoEmpleado: 'Encargada de Inventario y Bodega',
    fechaInicio: '2026-08-01',
    fechaFin: '2026-08-08',
    diasSolicitados: 8,
    motivo: 'Descanso de mitad de año',
    estado: 'Aprobado',
    fechaSolicitud: '2026-07-20',
    fechaResolucion: '2026-07-22'
  }
];

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudVacaciones[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [modoFirebaseReal, setModoFirebaseReal] = useState<boolean>(false);

  // Recalcular saldo de vacaciones en tiempo real según Ley Nica
  const enriquecerEmpleados = (lista: Empleado[]): Empleado[] => {
    return lista.map(emp => {
      const calc = calcularVacacionesNica(emp.fechaIngreso, emp.diasTomados || 0);
      return {
        ...emp,
        diasAcumulados: calc.acumulados,
        saldoDisponible: calc.disponibles
      };
    });
  };

  // Función para unificar y deduplicar empleados por correo único
  const unificarEmpleados = (...listas: Empleado[][]): Empleado[] => {
    const map = new Map<string, Empleado>();
    for (const lista of listas) {
      if (!Array.isArray(lista)) continue;
      for (const emp of lista) {
        if (!emp) continue;
        const key = (emp.email || emp.id || '').trim().toLowerCase();
        if (!key) continue;

        const exist = map.get(key);
        if (!exist) {
          map.set(key, emp);
        } else {
          // Si el existente era la semilla ('emp-admin-1') y el nuevo es el de Firebase, preferir el de Firebase
          const esSemillaAdmin = exist.id === 'emp-admin-1';
          const nuevoReal = emp.id && emp.id !== 'emp-admin-1';

          if (esSemillaAdmin && nuevoReal) {
            map.set(key, { ...exist, ...emp });
          } else {
            // Preservar la información más detallada
            const nuevoTieneMasDetalle = (emp.nombre?.length || 0) >= (exist.nombre?.length || 0);
            map.set(key, nuevoTieneMasDetalle ? { ...exist, ...emp } : { ...emp, ...exist });
          }
        }
      }
    }
    return Array.from(map.values());
  };

  // Inicializar datos
  useEffect(() => {
    const initData = async () => {
      setCargando(true);
      // Primero cargamos de inmediato los datos de localStorage para no perder nada
      cargarDesdeLocalStorage();

      const isReal = isConfigValid();
      setModoFirebaseReal(isReal);

      if (isReal && db) {
        try {
          // Escuchador en tiempo real de Empleados en Firestore con merge inteligente
          const unsubEmp = onSnapshot(collection(db, "empleados"), (snapshot) => {
            const firestoreItems: Empleado[] = snapshot.docs.map(docSnap => ({
              id: docSnap.id,
              ...docSnap.data()
            } as Empleado));

            const storedEmp = localStorage.getItem('sendavac_empleados');
            let localItems: Empleado[] = [];
            if (storedEmp) {
              try {
                localItems = JSON.parse(storedEmp);
              } catch (e) {
                console.error(e);
              }
            }

            // Unir y deduplicar estrictamente por correo
            const merged = unificarEmpleados(EMPLEADOS_INICIALES, localItems, firestoreItems);
            setEmpleados(enriquecerEmpleados(merged));
            localStorage.setItem('sendavac_empleados', JSON.stringify(merged));
          }, (err) => {
            console.warn("Firestore error de lectura, manteniendo datos locales seguros:", err);
            cargarDesdeLocalStorage();
          });

          // Escuchador en tiempo real de Solicitudes en Firestore
          const unsubSol = onSnapshot(collection(db, "solicitudes"), (snapshot) => {
            const items: SolicitudVacaciones[] = snapshot.docs.map(docSnap => ({
              id: docSnap.id,
              ...docSnap.data()
            } as SolicitudVacaciones));
            setSolicitudes(items);
          });

          setCargando(false);
          return () => {
            unsubEmp();
            unsubSol();
          };
        } catch (error) {
          console.warn("Error conectando a Firestore, cargando modo local seguro:", error);
          cargarDesdeLocalStorage();
        }
      }
      setCargando(false);
    };

    initData();
  }, []);

  const cargarDesdeLocalStorage = () => {
    const storedEmp = localStorage.getItem('sendavac_empleados');
    const storedSol = localStorage.getItem('sendavac_solicitudes');

    let baseEmp: Empleado[] = EMPLEADOS_INICIALES;
    let baseSol: SolicitudVacaciones[] = SOLICITUDES_INICIALES;

    if (storedEmp) {
      try {
        const parsed: Empleado[] = JSON.parse(storedEmp);
        baseEmp = unificarEmpleados(EMPLEADOS_INICIALES, parsed);
        // Asegurar asignación de roles específicos para demostración
        baseEmp = baseEmp.map(emp => {
          if (emp.email === 'maria.lopez@tienda.com' && (emp.rol === 'empleado' || !emp.rol)) {
            return { ...emp, rol: 'cajero' as const };
          }
          if (emp.email === 'carlos.mendoza@tienda.com' && (emp.rol === 'empleado' || !emp.rol)) {
            return { ...emp, rol: 'vendedor' as const };
          }
          return emp;
        });
      } catch (e) {
        console.error(e);
      }
    } else {
      localStorage.setItem('sendavac_empleados', JSON.stringify(EMPLEADOS_INICIALES));
    }

    if (storedSol) {
      try {
        baseSol = JSON.parse(storedSol);
      } catch (e) {
        console.error(e);
      }
    } else {
      localStorage.setItem('sendavac_solicitudes', JSON.stringify(SOLICITUDES_INICIALES));
    }

    setEmpleados(enriquecerEmpleados(baseEmp));
    setSolicitudes(baseSol);
  };

  const guardarLocal = (nuevosEmp: Empleado[], nuevasSol: SolicitudVacaciones[]) => {
    localStorage.setItem('sendavac_empleados', JSON.stringify(nuevosEmp));
    localStorage.setItem('sendavac_solicitudes', JSON.stringify(nuevasSol));
  };

  const agregarEmpleado = async (datos: Omit<Empleado, 'id' | 'diasAcumulados' | 'saldoDisponible'>): Promise<string> => {
    const newId = 'emp-' + Date.now();
    const calc = calcularVacacionesNica(datos.fechaIngreso, datos.diasTomados || 0);
    const nuevoEmpleado: Empleado = {
      ...datos,
      id: newId,
      diasAcumulados: calc.acumulados,
      saldoDisponible: calc.disponibles,
      estado: datos.estado || 'Activo'
    };

    // 1. Guardar de forma inmediata en el estado de React y en LocalStorage
    setEmpleados(prev => {
      const actualizada = [...prev.filter(e => e.id !== newId), nuevoEmpleado];
      localStorage.setItem('sendavac_empleados', JSON.stringify(actualizada));
      return enriquecerEmpleados(actualizada);
    });

    // 2. Persistir en Firestore si la conexión está lista
    if (db) {
      try {
        await setDoc(doc(db, "empleados", newId), nuevoEmpleado);
      } catch (e) {
        console.warn("Empleado guardado localmente, sincronización en Firestore pendiente:", e);
      }
    }

    return newId;
  };

  const actualizarEmpleado = async (id: string, datos: Partial<Empleado>) => {
    setEmpleados(prev => {
      const actualizada = prev.map(e => {
        if (e.id === id) {
          const merge = { ...e, ...datos };
          const calc = calcularVacacionesNica(merge.fechaIngreso, merge.diasTomados || 0);
          return {
            ...merge,
            diasAcumulados: calc.acumulados,
            saldoDisponible: calc.disponibles
          };
        }
        return e;
      });
      localStorage.setItem('sendavac_empleados', JSON.stringify(actualizada));
      return enriquecerEmpleados(actualizada);
    });

    if (db) {
      try {
        await updateDoc(doc(db, "empleados", id), datos);
      } catch (e) {
        console.warn("Empleado actualizado localmente, Firestore pendiente:", e);
      }
    }
  };

  const eliminarEmpleado = async (id: string) => {
    setEmpleados(prev => {
      const actualizada = prev.filter(e => e.id !== id);
      localStorage.setItem('sendavac_empleados', JSON.stringify(actualizada));
      return enriquecerEmpleados(actualizada);
    });

    if (db) {
      try {
        await deleteDoc(doc(db, "empleados", id));
      } catch (e) {
        console.warn("Empleado eliminado localmente, Firestore pendiente:", e);
      }
    }
  };

  const crearSolicitud = async (datos: Omit<SolicitudVacaciones, 'id' | 'fechaSolicitud' | 'estado'>): Promise<string> => {
    const newId = 'sol-' + Date.now();
    const hoyStr = new Date().toISOString().split('T')[0];
    const nuevaSolicitud: SolicitudVacaciones = {
      ...datos,
      id: newId,
      estado: 'Pendiente',
      fechaSolicitud: hoyStr
    };

    if (modoFirebaseReal && db) {
      try {
        await setDoc(doc(db, "solicitudes", newId), nuevaSolicitud);
        return newId;
      } catch (e) {
        console.error(e);
      }
    }

    const actualizadas = [nuevaSolicitud, ...solicitudes];
    setSolicitudes(actualizadas);
    guardarLocal(empleados, actualizadas);
    return newId;
  };

  const procesarSolicitud = async (
    solicitudId: string, 
    nuevoEstado: 'Aprobado' | 'Rechazado',
    comentario?: string
  ) => {
    const solicitud = solicitudes.find(s => s.id === solicitudId);
    if (!solicitud) return;

    const fechaHoy = new Date().toISOString().split('T')[0];

    if (modoFirebaseReal && db) {
      try {
        const solicitudRef = doc(db, "solicitudes", solicitudId);
        const empleadoRef = doc(db, "empleados", solicitud.empleadoId);

        await runTransaction(db, async (transaction) => {
          const empDoc = await transaction.get(empleadoRef);
          if (!empDoc.exists()) throw new Error("Empleado no encontrado");

          transaction.update(solicitudRef, {
            estado: nuevoEstado,
            fechaResolucion: fechaHoy,
            ...(comentario ? { comentarioAdmin: comentario } : {})
          });

          if (nuevoEstado === 'Aprobado') {
            const diasTomadosActuales = empDoc.data().diasTomados || 0;
            const nuevosDiasTomados = diasTomadosActuales + solicitud.diasSolicitados;
            transaction.update(empleadoRef, {
              diasTomados: nuevosDiasTomados
            });
          }
        });
        return;
      } catch (error) {
        console.error("Error en transacción Firebase:", error);
      }
    }

    // Modo local / reactivo
    const nuevasSolicitudes = solicitudes.map(s => {
      if (s.id === solicitudId) {
        return {
          ...s,
          estado: nuevoEstado,
          fechaResolucion: fechaHoy,
          comentarioAdmin: comentario
        };
      }
      return s;
    });

    let nuevosEmpleados = [...empleados];
    if (nuevoEstado === 'Aprobado') {
      nuevosEmpleados = empleados.map(emp => {
        if (emp.id === solicitud.empleadoId) {
          const nuevosTomados = (emp.diasTomados || 0) + solicitud.diasSolicitados;
          const calc = calcularVacacionesNica(emp.fechaIngreso, nuevosTomados);
          return {
            ...emp,
            diasTomados: nuevosTomados,
            diasAcumulados: calc.acumulados,
            saldoDisponible: calc.disponibles
          };
        }
        return emp;
      });
    }

    setSolicitudes(nuevasSolicitudes);
    setEmpleados(nuevosEmpleados);
    guardarLocal(nuevosEmpleados, nuevasSolicitudes);
  };

  const recargarDatos = async () => {
    cargarDesdeLocalStorage();
  };

  const notificacionesPendientes = solicitudes.filter(s => s.estado === 'Pendiente').length;

  return (
    <DataContext.Provider
      value={{
        empleados,
        solicitudes,
        cargando,
        modoFirebaseReal,
        notificacionesPendientes,
        agregarEmpleado,
        actualizarEmpleado,
        eliminarEmpleado,
        crearSolicitud,
        procesarSolicitud,
        recargarDatos
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData debe usarse dentro de un DataProvider');
  }
  return context;
};
