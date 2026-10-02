import React, { createContext, useContext, useState, useEffect } from 'react';
import { Empleado } from '../types';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as fbSignOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useData } from './DataContext';
import { calcularVacacionesNica } from '../utils/calculosNica';

interface AuthContextType {
  usuarioActual: Empleado | null;
  cargandoAuth: boolean;
  errorAuth: string | null;
  iniciarSesion: (email: string, pass: string, recordar?: boolean) => Promise<boolean>;
  cerrarSesion: () => Promise<void>;
  cambiarRolDemo: (rol: 'administrador' | 'empleado', email?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { empleados } = useData();
  const [usuarioActual, setUsuarioActual] = useState<Empleado | null>(null);
  const [cargandoAuth, setCargandoAuth] = useState<boolean>(true);
  const [errorAuth, setErrorAuth] = useState<string | null>(null);

  // Escuchar el estado de autenticación de Firebase en vivo
  useEffect(() => {
    if (!auth) {
      verificarSesionLocal();
      setCargandoAuth(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser: User | null) => {
      if (fbUser && fbUser.email) {
        try {
          // 1. Buscar en Firestore bajo su UID
          let empData: Empleado | null = null;
          if (db) {
            const docRef = doc(db, "empleados", fbUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              empData = { id: fbUser.uid, ...docSnap.data() } as Empleado;
            }
          }

          // 2. Si no está por UID, buscar por email en la lista cargada
          if (!empData) {
            const matchEmail = empleados.find(e => e.email.toLowerCase() === fbUser.email?.toLowerCase());
            if (matchEmail) {
              empData = { ...matchEmail, id: fbUser.uid };
            }
          }

          // 3. Si es un usuario nuevo en Firebase, crearlo como Administrador si es jairotten84 o de lo contrario colaborador
          if (!empData) {
            const esAdminEmail = fbUser.email.toLowerCase().includes('jairo') || fbUser.email.toLowerCase().includes('admin');
            const calc = calcularVacacionesNica('2023-01-15', 0);
            
            empData = {
              id: fbUser.uid,
              nombre: fbUser.displayName || (esAdminEmail ? 'Jairo Cajina' : fbUser.email.split('@')[0]),
              email: fbUser.email,
              cargo: esAdminEmail ? 'Gerente General / Administrador' : 'Personal de Tienda',
              departamento: esAdminEmail ? 'Administración' : 'Caja y Ventas',
              fechaIngreso: '2023-01-15',
              salarioMensual: esAdminEmail ? 35000 : 12500,
              diasAcumulados: calc.acumulados,
              diasTomados: 0,
              saldoDisponible: calc.disponibles,
              rol: esAdminEmail ? 'administrador' : 'empleado',
              estado: 'Activo'
            };

            if (db) {
              await setDoc(doc(db, "empleados", fbUser.uid), empData);
            }
          }

          setUsuarioActual(empData);
          localStorage.setItem('sendavac_usuario_sesion', JSON.stringify(empData));
        } catch (error) {
          console.error("Error sincronizando usuario de Firebase:", error);
          verificarSesionLocal();
        }
      } else {
        verificarSesionLocal();
      }
      setCargandoAuth(false);
    });

    return () => unsubscribe();
  }, [empleados]);

  const verificarSesionLocal = () => {
    const sesionGuardada = localStorage.getItem('sendavac_usuario_sesion');
    if (sesionGuardada) {
      try {
        const parsed = JSON.parse(sesionGuardada);
        const match = empleados.find(e => e.email.toLowerCase() === parsed.email.toLowerCase());
        setUsuarioActual(match || parsed);
      } catch (e) {
        console.error(e);
      }
    } else {
      setUsuarioActual(null);
    }
  };

  const iniciarSesion = async (email: string, pass: string, recordar: boolean = true): Promise<boolean> => {
    setErrorAuth(null);
    setCargandoAuth(true);

    const correoLimpio = email.trim().toLowerCase();

    // 1. Intento de autenticación real con Firebase Auth
    if (auth) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, correoLimpio, pass);
        const user = userCredential.user;

        // Leer datos desde Firestore
        let emp: Empleado | null = null;
        if (db) {
          const docRef = doc(db, "empleados", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            emp = { id: user.uid, ...docSnap.data() } as Empleado;
          }
        }

        if (!emp) {
          const esAdmin = correoLimpio.includes('jairo') || correoLimpio.includes('admin');
          const calc = calcularVacacionesNica('2023-01-15', 0);
          emp = {
            id: user.uid,
            nombre: user.displayName || (esAdmin ? 'Jairo Cajina' : correoLimpio.split('@')[0]),
            email: correoLimpio,
            cargo: esAdmin ? 'Gerente General / Administrador' : 'Personal de Tienda',
            departamento: esAdmin ? 'Administración' : 'Caja y Ventas',
            fechaIngreso: '2023-01-15',
            salarioMensual: esAdmin ? 35000 : 12500,
            diasAcumulados: calc.acumulados,
            diasTomados: 0,
            saldoDisponible: calc.disponibles,
            rol: esAdmin ? 'administrador' : 'empleado',
            estado: 'Activo'
          };

          if (db) {
            await setDoc(doc(db, "empleados", user.uid), emp);
          }
        }

        setUsuarioActual(emp);
        if (recordar) localStorage.setItem('sendavac_usuario_sesion', JSON.stringify(emp));
        setCargandoAuth(false);
        return true;
      } catch (err: any) {
        console.warn("Firebase Auth error:", err.code, err.message);

        // Si el usuario no existe en Firebase Auth pero es el administrador o un colaborador de la tienda,
        // intentamos auto-registrarlo en Firebase para su conveniencia:
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          try {
            const nuevoUser = await createUserWithEmailAndPassword(auth, correoLimpio, pass);
            const esAdmin = correoLimpio.includes('jairo') || correoLimpio.includes('admin');
            const calc = calcularVacacionesNica('2023-01-15', 0);
            const nuevoEmp: Empleado = {
              id: nuevoUser.user.uid,
              nombre: esAdmin ? 'Jairo Cajina' : correoLimpio.split('@')[0],
              email: correoLimpio,
              cargo: esAdmin ? 'Gerente General / Administrador' : 'Personal de Tienda',
              departamento: esAdmin ? 'Administración' : 'Caja y Ventas',
              fechaIngreso: '2023-01-15',
              salarioMensual: esAdmin ? 35000 : 12500,
              diasAcumulados: calc.acumulados,
              diasTomados: 0,
              saldoDisponible: calc.disponibles,
              rol: esAdmin ? 'administrador' : 'empleado',
              estado: 'Activo'
            };

            if (db) {
              await setDoc(doc(db, "empleados", nuevoUser.user.uid), nuevoEmp);
            }

            setUsuarioActual(nuevoEmp);
            if (recordar) localStorage.setItem('sendavac_usuario_sesion', JSON.stringify(nuevoEmp));
            setCargandoAuth(false);
            return true;
          } catch (createErr: any) {
            console.warn("No se pudo auto-registrar en Firebase Auth:", createErr);
          }
        }
      }
    }

    // 2. Acceso con base de datos sincronizada
    const empLocal = empleados.find(e => e.email.toLowerCase() === correoLimpio);
    if (empLocal) {
      if (empLocal.password && empLocal.password !== pass) {
        setErrorAuth('La contraseña ingresada es incorrecta. Por favor intente de nuevo.');
        setCargandoAuth(false);
        return false;
      }
      setUsuarioActual(empLocal);
      if (recordar) {
        localStorage.setItem('sendavac_usuario_sesion', JSON.stringify(empLocal));
      }
      setCargandoAuth(false);
      return true;
    }

    // Si tiene formato de email válido
    if (correoLimpio.includes('@')) {
      const esAdmin = correoLimpio.includes('jairo') || correoLimpio.includes('admin');
      const calc = calcularVacacionesNica('2023-01-15', 0);
      const empDirecto: Empleado = {
        id: 'emp-' + Date.now(),
        nombre: esAdmin ? 'Jairo Cajina' : correoLimpio.split('@')[0].toUpperCase(),
        email: correoLimpio,
        cargo: esAdmin ? 'Gerente General / Administrador' : 'Personal de Tienda',
        departamento: esAdmin ? 'Administración' : 'Caja y Ventas',
        fechaIngreso: '2023-01-15',
        salarioMensual: esAdmin ? 35000 : 12500,
        diasAcumulados: calc.acumulados,
        diasTomados: 0,
        saldoDisponible: calc.disponibles,
        rol: esAdmin ? 'administrador' : 'empleado',
        estado: 'Activo'
      };

      setUsuarioActual(empDirecto);
      if (recordar) localStorage.setItem('sendavac_usuario_sesion', JSON.stringify(empDirecto));
      setCargandoAuth(false);
      return true;
    }

    setErrorAuth('El correo o contraseña no son válidos. Por favor verifique sus datos.');
    setCargandoAuth(false);
    return false;
  };

  const cerrarSesion = async () => {
    if (auth) {
      try {
        await fbSignOut(auth);
      } catch (e) {
        console.error(e);
      }
    }
    localStorage.removeItem('sendavac_usuario_sesion');
    setUsuarioActual(null);
  };

  const cambiarRolDemo = (rol: 'administrador' | 'empleado', emailTarget?: string) => {
    if (rol === 'administrador') {
      const admin = empleados.find(e => e.rol === 'administrador') || empleados[0];
      setUsuarioActual(admin);
      localStorage.setItem('sendavac_usuario_sesion', JSON.stringify(admin));
    } else {
      const emp = (emailTarget ? empleados.find(e => e.email === emailTarget) : null) ||
                  empleados.find(e => e.rol === 'empleado') ||
                  empleados[1] ||
                  empleados[0];
      setUsuarioActual(emp);
      localStorage.setItem('sendavac_usuario_sesion', JSON.stringify(emp));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        usuarioActual,
        cargandoAuth,
        errorAuth,
        iniciarSesion,
        cerrarSesion,
        cambiarRolDemo
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
