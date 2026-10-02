import React, { useState } from 'react';
import { UserPlus, X, ShieldAlert, Sparkles } from 'lucide-react';
import { useData } from '../context/DataContext';

interface PropsModal {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  isInline?: boolean;
}

export const RegistroEmpleadoModal: React.FC<PropsModal> = ({
  isOpen,
  onClose,
  onSuccess,
  isInline = false
}) => {
  const { agregarEmpleado } = useData();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargo, setCargo] = useState('');
  const [departamento, setDepartamento] = useState('Caja y Ventas');
  const [salarioAnterior, setSalarioAnterior] = useState<number>(0);
  const [salarioMensual, setSalarioMensual] = useState<number>(12000);
  const [fechaIngreso, setFechaIngreso] = useState(new Date().toISOString().split('T')[0]);
  const [rol, setRol] = useState<'empleado' | 'administrador'>('empleado');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  if (!isOpen) return null;

  const registrarEmpleadoEnTienda = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
      await agregarEmpleado({
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        cargo: cargo.trim(),
        departamento,
        salarioInicial: salarioMensual,
        salarioAnterior: Number(salarioAnterior) || salarioMensual,
        salarioMensual,
        fechaIngreso,
        rol,
        diasTomados: 0,
        estado: 'Activo'
      });

      // Limpiar formulario y cerrar
      setNombre('');
      setEmail('');
      setPassword('');
      setCargo('');
      setSalarioAnterior(0);
      setSalarioMensual(12000);
      setRol('empleado');

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError('Error al registrar el empleado: ' + (err.message || err));
    } finally {
      setCargando(false);
    }
  };

  const formularioContenido = (
    <div className={`relative w-full max-w-2xl bg-white dark:bg-[#0f172a] rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-fadeIn ${isInline ? 'my-2' : 'my-8'}`}>
      {/* Encabezado con azul de la tienda */}
      <div className="bg-[#0f275e] dark:bg-slate-900 px-6 py-5 flex justify-between items-center text-white border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-blue-300" />
          </div>
          <div>
            <h3 className="text-base font-black">Registrar Nuevo Colaborador</h3>
            <p className="text-xs text-blue-200 dark:text-blue-300">Alta de personal para cálculo de vacaciones (Ley Nica)</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Formulario */}
      <form onSubmit={registrarEmpleadoEnTienda} autoComplete="off" className={`p-6 space-y-4 text-xs ${isInline ? '' : 'max-h-[calc(100vh-140px)] overflow-y-auto'}`}>
        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 p-3 rounded-xl text-rose-700 dark:text-rose-300 font-bold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Nombre Completo */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            Nombre Completo
          </label>
          <input
            type="text"
            required
            autoComplete="off"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Juan José Pérez Mendoza"
            className="block w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Cargo en la Tienda */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Cargo / Puesto
            </label>
            <input
              type="text"
              required
              autoComplete="off"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              placeholder="Ej. Cajero, Vendedor de Mostrador"
              className="block w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          {/* Departamento */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Área / Departamento
            </label>
            <select
              value={departamento}
              onChange={(e) => setDepartamento(e.target.value)}
              className="block w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="Caja y Ventas">Caja y Ventas</option>
              <option value="Inventario">Inventario y Bodega</option>
              <option value="Administración">Administración</option>
              <option value="Créditos y Cuentas">Créditos y Cuentas</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Correo Electrónico */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              autoComplete="new-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="empleado@tienda.com"
              className="block w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          {/* Contraseña Inicial */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Contraseña Inicial
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="block w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Salario Anterior (C$) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Salario Anterior (C$) <span className="text-[10px] text-slate-400 font-normal lowercase">(opcional)</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              autoComplete="off"
              value={salarioAnterior || ''}
              onChange={(e) => setSalarioAnterior(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="block w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          {/* Salario Mensual Actual (C$) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Salario Mensual Actual (C$)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              autoComplete="off"
              value={salarioMensual || ''}
              onChange={(e) => setSalarioMensual(parseFloat(e.target.value) || 0)}
              placeholder="12000.00"
              className="block w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>
        </div>

        {/* Fecha de Ingreso */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            Fecha de Ingreso
          </label>
          <input
            type="date"
            required
            value={fechaIngreso}
            onChange={(e) => setFechaIngreso(e.target.value)}
            className="block w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {/* Rol del Sistema */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            Rol del Sistema
          </label>
          <select
            value={rol}
            onChange={(e) => setRol(e.target.value as 'empleado' | 'administrador')}
            className="block w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="empleado">Colaborador / Empleado (Solo ver sus vacaciones y solicitar)</option>
            <option value="administrador">Administrador (Gestión total, aprobar y liquidar)</option>
          </select>
        </div>

        {/* Botones de Acción */}
        <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            disabled={cargando}
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={cargando}
            className="px-5 py-2.5 text-xs font-black text-white bg-[#1d63ff] hover:bg-blue-700 rounded-xl shadow-md transition disabled:bg-slate-300 flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>{cargando ? 'Guardando...' : 'Registrar Colaborador'}</span>
          </button>
        </div>
      </form>
    </div>
  );

  if (isInline) {
    return formularioContenido;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      {formularioContenido}
    </div>
  );
};
