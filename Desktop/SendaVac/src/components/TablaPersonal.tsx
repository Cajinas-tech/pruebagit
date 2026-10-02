import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Calculator, 
  UserPlus, 
  Calendar, 
  Phone, 
  Briefcase, 
  FileText,
  Trash2,
  Eye,
  Pencil,
  User,
  X,
  Coffee,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  History
} from 'lucide-react';
import { Empleado, TipoIncrementoSalarial, RegistroAumentoSalarial } from '../types';
import { ModuloPagoVacaciones } from './ModuloPagoVacaciones';
import { ModuloDiasLibres } from './ModuloDiasLibres';
import { ModalHistorialDescansos } from './ModalHistorialDescansos';
import { ModalGenerarDiaLibre } from './ModalGenerarDiaLibre';
import { ConfirmModal } from './ConfirmModal';
import { useToast } from './Toast';
import { useData } from '../context/DataContext';
import { formatearCordobas, calcularSalarioConAumento } from '../utils/calculosNica';

interface TablaPersonalProps {
  onNuevoEmpleado: () => void;
}

export const TablaPersonal: React.FC<TablaPersonalProps> = ({ onNuevoEmpleado }) => {
  const { empleados, actualizarEmpleado, eliminarEmpleado } = useData();
  const { success, warning, error } = useToast();

  const [busqueda, setBusqueda] = useState('');
  const [departamentoFiltro, setDepartamentoFiltro] = useState('Todos');
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<Empleado | null>(null);

  // Estados para Detalle, Edición, Eliminación y Aumento Salarial
  const [empleadoDetalle, setEmpleadoDetalle] = useState<Empleado | null>(null);
  const [empleadoEditar, setEmpleadoEditar] = useState<Empleado | null>(null);
  const [eliminarTarget, setEliminarTarget] = useState<{ id: string; nombre: string } | null>(null);
  const [empleadoDiaLibre, setEmpleadoDiaLibre] = useState<Empleado | null>(null);
  const [empleadoAumento, setEmpleadoAumento] = useState<Empleado | null>(null);
  const [empleadoHistorial, setEmpleadoHistorial] = useState<Empleado | null>(null);

  // Estados de la Calculadora de Aumento Salarial
  const [tipoIncremento, setTipoIncremento] = useState<TipoIncrementoSalarial>('monto_fijo');
  const [valorIncremento, setValorIncremento] = useState<number>(1000);
  const [fechaAumento, setFechaAumento] = useState<string>(new Date().toISOString().slice(0, 10));
  const [motivoAumento, setMotivoAumento] = useState<string>('Ajuste y aumento salarial por mérito y antigüedad');

  // Abrir modal de Aumento Salarial con datos iniciales
  const abrirModalAumento = (emp: Empleado) => {
    setEmpleadoAumento(emp);
    setTipoIncremento('monto_fijo');
    // Incremento sugerido por defecto: 1,000 C$ o 10%
    setValorIncremento(1000);
    setFechaAumento(new Date().toISOString().slice(0, 10));
    setMotivoAumento('Aumento salarial acordado por evaluación de desempeño');
  };

  // Cálculo en tiempo real del nuevo salario basado en cuando empezó y su aumento
  const calculoAumento = useMemo(() => {
    if (!empleadoAumento) return null;
    return calcularSalarioConAumento({
      salarioInicial: empleadoAumento.salarioInicial || empleadoAumento.salarioAnterior || empleadoAumento.salarioMensual,
      salarioAnterior: empleadoAumento.salarioMensual,
      tipoIncremento,
      valorIncremento,
      fechaIngreso: empleadoAumento.fechaIngreso,
      fechaAumento,
      motivo: motivoAumento
    });
  }, [empleadoAumento, tipoIncremento, valorIncremento, fechaAumento, motivoAumento]);

  // Guardar y Aplicar Aumento Salarial al colaborador
  const handleGuardarAumento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empleadoAumento || !calculoAumento) return;

    if (calculoAumento.montoIncremento <= 0) {
      error('Incremento Requerido', 'El monto o porcentaje de incremento debe ser mayor a cero.');
      return;
    }

    try {
      // 1. Actualizar empleado en DataContext (memoria y persistencia)
      await actualizarEmpleado(empleadoAumento.id, {
        salarioInicial: calculoAumento.salarioInicial,
        salarioAnterior: calculoAumento.salarioAnterior,
        salarioMensual: calculoAumento.nuevoSalario,
        fechaUltimoAumento: fechaAumento,
        montoUltimoIncremento: calculoAumento.montoIncremento,
        porcentajeUltimoIncremento: calculoAumento.porcentajeIncremento,
        motivoUltimoIncremento: motivoAumento.trim() || 'Aumento salarial de ley'
      });

      // 2. Guardar en historial de aumentos en localStorage
      try {
        const guardados = localStorage.getItem('sendavac_historial_aumentos');
        const lista: RegistroAumentoSalarial[] = guardados ? JSON.parse(guardados) : [];
        const nuevoRegistro: RegistroAumentoSalarial = {
          id: `aum-${Date.now()}`,
          empleadoId: empleadoAumento.id,
          nombreEmpleado: empleadoAumento.nombre,
          cargoEmpleado: empleadoAumento.cargo,
          fechaIngreso: empleadoAumento.fechaIngreso,
          salarioInicial: calculoAumento.salarioInicial,
          salarioAnterior: calculoAumento.salarioAnterior,
          tipoIncremento,
          valorIncremento,
          montoIncremento: calculoAumento.montoIncremento,
          porcentajeIncremento: calculoAumento.porcentajeIncremento,
          nuevoSalario: calculoAumento.nuevoSalario,
          salarioDiarioNuevo: calculoAumento.salarioDiario,
          salarioQuincenalNuevo: calculoAumento.salarioQuincenal,
          fechaEfectiva: fechaAumento,
          motivo: motivoAumento.trim() || 'Aumento salarial',
          fechaRegistro: new Date().toISOString().slice(0, 10)
        };
        lista.unshift(nuevoRegistro);
        localStorage.setItem('sendavac_historial_aumentos', JSON.stringify(lista));
      } catch (e) {
        console.error('Error guardando en historial de aumentos', e);
      }

      success(
        '¡Aumento Salarial Aplicado con Éxito!',
        `${empleadoAumento.nombre} ahora devenga C$ ${calculoAumento.nuevoSalario.toLocaleString('es-NI')} (+C$ ${calculoAumento.montoIncremento.toLocaleString('es-NI')} / +${calculoAumento.porcentajeIncremento}%)`
      );

      setEmpleadoAumento(null);
    } catch (err: any) {
      error('Error al aplicar aumento', err?.message || 'No se pudo guardar el incremento');
    }
  };

  // Campos de formulario para Edición
  const [editNombre, setEditNombre] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editTelefono, setEditTelefono] = useState('');
  const [editCargo, setEditCargo] = useState('');
  const [editDepartamento, setEditDepartamento] = useState('Caja y Ventas');
  const [editSalarioAnterior, setEditSalarioAnterior] = useState<number>(0);
  const [editSalario, setEditSalario] = useState<number>(12000);
  const [editFechaIngreso, setEditFechaIngreso] = useState('');
  const [editRol, setEditRol] = useState<'administrador' | 'cajero' | 'vendedor' | 'empleado'>('vendedor');
  const [editEstado, setEditEstado] = useState<'Activo' | 'Inactivo' | 'De Vacaciones'>('Activo');

  const abrirEditarEmpleado = (emp: Empleado) => {
    setEmpleadoEditar(emp);
    setEditNombre(emp.nombre);
    setEditEmail(emp.email);
    setEditTelefono(emp.telefono || '');
    setEditCargo(emp.cargo);
    setEditDepartamento(emp.departamento || 'Caja y Ventas');
    setEditSalarioAnterior(emp.salarioAnterior || 0);
    setEditSalario(emp.salarioMensual || 12000);
    setEditFechaIngreso(emp.fechaIngreso);
    const parsedRol = (emp.rol as any) === 'administrador' ? 'administrador' : (emp.rol as any) === 'cajero' ? 'cajero' : 'vendedor';
    setEditRol(parsedRol);
    setEditEstado(emp.estado || 'Activo');
  };

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empleadoEditar) return;
    if (!editNombre.trim() || !editEmail.trim()) {
      error('Campos requeridos', 'Por favor ingresa nombre y correo');
      return;
    }

    try {
      await actualizarEmpleado(empleadoEditar.id, {
        nombre: editNombre.trim(),
        email: editEmail.trim(),
        telefono: editTelefono.trim(),
        cargo: editCargo.trim(),
        departamento: editDepartamento,
        salarioAnterior: Number(editSalarioAnterior) || 0,
        salarioMensual: Number(editSalario) || 12000,
        fechaIngreso: editFechaIngreso,
        rol: editRol,
        estado: editEstado
      });

      success('¡Colaborador Actualizado!', `${editNombre} ha sido actualizado correctamente`);
      setEmpleadoEditar(null);
    } catch (err: any) {
      error('Error al actualizar', err?.message || 'No se pudo guardar la información');
    }
  };

  const confirmEliminar = async () => {
    if (!eliminarTarget) return;
    await eliminarEmpleado(eliminarTarget.id);
    warning('Colaborador Eliminado', `"${eliminarTarget.nombre}" ha sido retirado del sistema`);
    setEliminarTarget(null);
  };

  // Filtrado
  const empleadosFiltrados = empleados.filter((emp) => {
    const coincideTexto =
      emp.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      emp.cargo.toLowerCase().includes(busqueda.toLowerCase()) ||
      emp.email.toLowerCase().includes(busqueda.toLowerCase());

    const coincideDep =
      departamentoFiltro === 'Todos' || emp.departamento === departamentoFiltro;

    return coincideTexto && coincideDep;
  });

  // Departamentos únicos
  const departamentos = ['Todos', ...new Set(empleados.map(e => e.departamento || 'General'))];

  return (
    <div className="space-y-6">
      {/* Barra de Controles Superiores */}
      <div className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Campo de Búsqueda */}
        <div className="relative w-full md:w-96">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Buscar colaborador por nombre, cargo o correo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800 transition"
          />
        </div>

        {/* Filtros y Botón Nuevo Colaborador */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={departamentoFiltro}
              onChange={(e) => setDepartamentoFiltro(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 py-2.5 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {departamentos.map(dep => (
                <option key={dep} value={dep}>{dep}</option>
              ))}
            </select>
          </div>

          <button
            onClick={onNuevoEmpleado}
            className="flex items-center gap-2 bg-[#1d63ff] hover:bg-blue-700 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-md transition transform active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo Colaborador</span>
          </button>
        </div>
      </div>

      {/* Contenedor de Tabla Responsiva */}
      <div className="bg-white dark:bg-[#111827] shadow-xs rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800">
        <div className="overflow-x-auto touch-scroll">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-xs">
            <thead className="bg-slate-50/90 dark:bg-slate-900/90 text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Colaborador</th>
                <th className="px-6 py-4">Cargo / Área</th>
                <th className="px-6 py-4">Fecha Ingreso (Ley Nica)</th>
                <th className="px-6 py-4 text-center">Acumulados</th>
                <th className="px-6 py-4 text-center">Tomados</th>
                <th className="px-6 py-4 text-center">Saldo Disponible</th>
                <th className="px-6 py-4 text-right min-w-[340px]">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-[#111827] divide-y divide-slate-100 dark:divide-slate-800">
              {empleadosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                    No se encontraron colaboradores con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                empleadosFiltrados.map((empleado) => {
                  return (
                    <tr 
                      key={empleado.id} 
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      {/* Colaborador: Avatar + Nombre + Email */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-[#1d63ff] dark:text-blue-300 font-extrabold flex items-center justify-center text-sm border border-blue-200 dark:border-blue-700 shadow-xs">
                            {empleado.nombre.charAt(0)}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-800 dark:text-white text-sm">
                              {empleado.nombre}
                            </div>
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                              {empleado.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Cargo y Área */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-slate-700 dark:text-slate-200">{empleado.cargo}</div>
                        <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 dark:text-slate-500">
                          {empleado.departamento || 'General'}
                        </div>
                      </td>

                      {/* Fecha de Ingreso */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-slate-700 dark:text-slate-300 font-semibold">{empleado.fechaIngreso}</div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                          Salario: {formatearCordobas(empleado.salarioMensual || 0)}
                        </div>
                      </td>

                      {/* Días Acumulados */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="font-extrabold text-slate-700 dark:text-slate-200">
                          {empleado.diasAcumulados}
                        </span>
                      </td>

                      {/* Días Tomados */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="font-extrabold text-orange-600 dark:text-orange-400">
                          {empleado.diasTomados || 0}
                        </span>
                      </td>

                      {/* Saldo Disponible con Badges por nivel */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-black rounded-full ${
                            empleado.saldoDisponible >= 15
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                              : empleado.saldoDisponible > 5
                              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {empleado.saldoDisponible} días
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-6 py-4 whitespace-nowrap text-right min-w-[340px]">
                        <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                          {/* Botón Ver Detalle */}
                          <button
                            type="button"
                            onClick={() => setEmpleadoDetalle(empleado)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold transition text-xs bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/60 shadow-2xs cursor-pointer active:scale-95 shrink-0"
                            title="Ver expediente y detalle del colaborador"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Detalle</span>
                          </button>

                          {/* Botón Historial Descansos */}
                          <button
                            type="button"
                            onClick={() => setEmpleadoHistorial(empleado)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold transition text-xs bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800/60 shadow-2xs cursor-pointer active:scale-95 shrink-0"
                            title="Ver historial cronológico de vacaciones y días libres tomados"
                          >
                            <History className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                            <span>Historial</span>
                          </button>

                          {/* Botón Editar */}
                          <button
                            type="button"
                            onClick={() => abrirEditarEmpleado(empleado)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold transition text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-2xs cursor-pointer active:scale-95 shrink-0"
                            title="Editar información del colaborador"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>

                          {/* Botón Aumento Salarial */}
                          <button
                            type="button"
                            onClick={() => abrirModalAumento(empleado)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold transition text-xs bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 shadow-2xs cursor-pointer active:scale-95 shrink-0"
                            title="Calcular y aplicar nuevo aumento salarial (último salario + incremento)"
                          >
                            <TrendingUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>Aumento</span>
                          </button>

                          {/* Botón Liquidación */}
                          <button
                            type="button"
                            onClick={() => setEmpleadoSeleccionado(empleado)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold transition text-xs bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 shadow-2xs cursor-pointer active:scale-95 shrink-0"
                            title="Calcular liquidación monetaria de vacaciones"
                          >
                            <Calculator className="w-3.5 h-3.5" />
                            <span>Liquidación</span>
                          </button>

                          {/* Botón Día Libre Semanal */}
                          <button
                            type="button"
                            onClick={() => setEmpleadoDiaLibre(empleado)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold transition text-xs bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 shadow-2xs cursor-pointer active:scale-95 shrink-0"
                            title="Generar o programar día libre semanal (Art. 64 C.T.)"
                          >
                            <Coffee className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span>Día Libre</span>
                          </button>

                          {/* Botón Borrar */}
                          <button
                            type="button"
                            onClick={() => setEliminarTarget({ id: empleado.id, nombre: empleado.nombre })}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold transition text-xs bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/60 shadow-2xs cursor-pointer active:scale-95 shrink-0"
                            title="Borrar colaborador del sistema"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                            <span>Borrar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Frontal para Calculadora de Liquidación */}
      {empleadoSeleccionado && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEmpleadoSeleccionado(null);
            }
          }}
        >
          <div 
            className="relative w-full max-w-5xl bg-[#f8fafc] dark:bg-[#0c1322] rounded-[32px] p-3 sm:p-5 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[94vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <ModuloPagoVacaciones
              empleadoInicialId={empleadoSeleccionado.id}
              saldoDisponible={empleadoSeleccionado.saldoDisponible}
              nombreEmpleado={empleadoSeleccionado.nombre}
              cargoEmpleado={empleadoSeleccionado.cargo}
              salarioMensualInicial={empleadoSeleccionado.salarioMensual || 12000}
              onCerrar={() => setEmpleadoSeleccionado(null)}
            />
          </div>
        </div>
      )}

      {/* Modal Frontal: Ver Detalle del Colaborador */}
      {empleadoDetalle && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-[2px] animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEmpleadoDetalle(null);
          }}
        >
          <div className="relative w-full max-w-2xl bg-white dark:bg-[#0f172a] rounded-[28px] p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-800 text-left max-h-[92vh] overflow-y-auto space-y-6">
            {/* Encabezado */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Expediente del Colaborador
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Control de personal, acumulación legal (Art. 76) y salario
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEmpleadoDetalle(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ficha Principal */}
            <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-900/60 dark:to-blue-950/20 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-blue-500/25 border-2 border-white dark:border-slate-800">
                  {empleadoDetalle.nombre.charAt(0)}
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white">
                    {empleadoDetalle.nombre}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {empleadoDetalle.cargo} • <span className="font-bold text-slate-700 dark:text-slate-300">{empleadoDetalle.departamento || 'General'}</span>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40">
                  {empleadoDetalle.rol?.toUpperCase() || 'COLABORADOR'}
                </span>
                <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border ${
                  empleadoDetalle.estado === 'Inactivo'
                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                }`}>
                  {empleadoDetalle.estado || 'Activo'}
                </span>
              </div>
            </div>

            {/* Desglose en 2 Columnas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sección 1: Datos Laborales y Salario */}
              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <h5 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-500" />
                  <span>Datos Laborales y Salario</span>
                </h5>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Correo:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{empleadoDetalle.email}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Teléfono:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{empleadoDetalle.telefono || '+505 No registrado'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Fecha de Ingreso:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{empleadoDetalle.fechaIngreso}</span>
                  </div>
                  {empleadoDetalle.salarioInicial !== undefined && empleadoDetalle.salarioInicial > 0 && (
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Salario Inicial (Al Iniciar):</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{formatearCordobas(empleadoDetalle.salarioInicial)}</span>
                    </div>
                  )}
                  {empleadoDetalle.salarioAnterior !== undefined && empleadoDetalle.salarioAnterior > 0 && empleadoDetalle.salarioAnterior !== empleadoDetalle.salarioMensual && (
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Salario Anterior:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{formatearCordobas(empleadoDetalle.salarioAnterior)}</span>
                    </div>
                  )}
                  {empleadoDetalle.montoUltimoIncremento !== undefined && empleadoDetalle.montoUltimoIncremento > 0 && (
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-950/30 px-2 rounded-md">
                      <span className="text-indigo-700 dark:text-indigo-300 font-medium">Último Incremento:</span>
                      <span className="font-bold text-indigo-700 dark:text-indigo-300">
                        +{formatearCordobas(empleadoDetalle.montoUltimoIncremento)} ({empleadoDetalle.porcentajeUltimoIncremento ? `+${empleadoDetalle.porcentajeUltimoIncremento}%` : ''})
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Salario Mensual Actual:</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400">{formatearCordobas(empleadoDetalle.salarioMensual || 0)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Salario Diario (Base 30):</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{formatearCordobas((empleadoDetalle.salarioMensual || 0) / 30)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Salario Quincenal (Base 15):</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{formatearCordobas((empleadoDetalle.salarioMensual || 0) / 2)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const emp = empleadoDetalle;
                      setEmpleadoDetalle(null);
                      abrirModalAumento(emp);
                    }}
                    className="w-full mt-2 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer border border-indigo-200 dark:border-indigo-800"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Calcular / Aplicar Nuevo Aumento Salarial</span>
                  </button>
                </div>
              </div>

              {/* Sección 2: Balance de Vacaciones */}
              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <h5 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                  <span>Balance de Vacaciones (Art. 76 CT)</span>
                </h5>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Días Acumulados:</span>
                    <span className="font-black text-slate-800 dark:text-white">{empleadoDetalle.diasAcumulados} días</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Días Tomados / Gozados:</span>
                    <span className="font-black text-orange-600 dark:text-orange-400">{empleadoDetalle.diasTomados || 0} días</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Saldo Disponible:</span>
                    <span className="font-black text-blue-600 dark:text-blue-400">{empleadoDetalle.saldoDisponible} días</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Valor Monetario Estimado:</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400">
                      {formatearCordobas(((empleadoDetalle.salarioMensual || 0) / 30) * empleadoDetalle.saldoDisponible)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const emp = empleadoDetalle;
                      setEmpleadoHistorial(emp);
                    }}
                    className="w-full mt-2 py-2 px-3 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer border border-sky-200 dark:border-sky-800"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Ver Historial de Días Libres y Vacaciones</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Botones del Modal Detalle */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  const emp = empleadoDetalle;
                  setEmpleadoHistorial(emp);
                }}
                className="px-4 py-2.5 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 text-sky-700 dark:text-sky-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <History className="w-3.5 h-3.5" />
                <span>Historial de Descansos</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const emp = empleadoDetalle;
                  setEmpleadoDetalle(null);
                  abrirEditarEmpleado(emp);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Editar Datos</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const emp = empleadoDetalle;
                  setEmpleadoDetalle(null);
                  setEmpleadoSeleccionado(emp);
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>💵 Calcular Liquidación</span>
              </button>

              <button
                type="button"
                onClick={() => setEmpleadoDetalle(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-bold transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Frontal: Editar Colaborador */}
      {empleadoEditar && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-slate-900/30 backdrop-blur-[2px] animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEmpleadoEditar(null);
          }}
        >
          <div className="relative w-full max-w-2xl bg-white dark:bg-[#0f172a] rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 text-left max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header Fijo */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0f172a] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    Editar Colaborador
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Modifica la información laboral y salarial
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEmpleadoEditar(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario con scroll interno y footer acoplado */}
            <form onSubmit={handleGuardarEdicion} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    NOMBRE COMPLETO
                  </label>
                  <input
                    type="text"
                    required
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    className="w-full bg-[#f8fafc] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>

                {/* Correo y Teléfono */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      CORREO ELECTRÓNICO
                    </label>
                    <input
                      type="email"
                      required
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full bg-[#f8fafc] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      TELÉFONO
                    </label>
                    <input
                      type="text"
                      value={editTelefono}
                      onChange={(e) => setEditTelefono(e.target.value)}
                      placeholder="+505 8888-8888"
                      className="w-full bg-[#f8fafc] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                {/* Cargo y Área/Depto */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      CARGO / PUESTO
                    </label>
                    <input
                      type="text"
                      required
                      value={editCargo}
                      onChange={(e) => setEditCargo(e.target.value)}
                      className="w-full bg-[#f8fafc] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      DEPARTAMENTO / ÁREA
                    </label>
                    <select
                      value={editDepartamento}
                      onChange={(e) => setEditDepartamento(e.target.value)}
                      className="w-full bg-[#f8fafc] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                    >
                      <option value="Caja y Ventas">Caja y Ventas</option>
                      <option value="Administración">Administración</option>
                      <option value="Atención y Mostrador">Atención y Mostrador</option>
                      <option value="Bodega y Despacho">Bodega y Despacho</option>
                      <option value="General">General</option>
                    </select>
                  </div>
                </div>

                {/* Salarios */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      SALARIO ANTERIOR (C$)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editSalarioAnterior || ''}
                      onChange={(e) => setEditSalarioAnterior(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full bg-[#f8fafc] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      SALARIO MENSUAL ACTUAL (C$)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={editSalario || ''}
                      onChange={(e) => setEditSalario(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full bg-[#f8fafc] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                {/* Fecha de Ingreso, Rol y Estado */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      FECHA DE INGRESO
                    </label>
                    <input
                      type="date"
                      required
                      value={editFechaIngreso}
                      onChange={(e) => setEditFechaIngreso(e.target.value)}
                      className="w-full bg-[#f8fafc] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      ROL EN EL SISTEMA
                    </label>
                    <select
                      value={editRol}
                      onChange={(e) => setEditRol(e.target.value as any)}
                      className="w-full bg-[#f8fafc] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                    >
                      <option value="administrador">ADMINISTRADOR</option>
                      <option value="cajero">CAJERO</option>
                      <option value="vendedor">VENDEDOR</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      ESTADO
                    </label>
                    <select
                      value={editEstado}
                      onChange={(e) => setEditEstado(e.target.value as any)}
                      className="w-full bg-[#f8fafc] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                    >
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                      <option value="De Vacaciones">De Vacaciones</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Botones Fijos */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setEmpleadoEditar(null)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/25 transition cursor-pointer active:scale-95"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Eliminar Colaborador */}
      <ConfirmModal
        isOpen={eliminarTarget !== null}
        onClose={() => setEliminarTarget(null)}
        onConfirm={confirmEliminar}
        title="¿Eliminar Colaborador?"
        itemName={eliminarTarget?.nombre}
        message="¿Está seguro de que desea retirar a este colaborador de la plantilla del sistema? Esta acción no se puede deshacer."
        confirmText="Sí, Eliminar"
        cancelText="Cancelar"
        type="danger"
        iconShape="circle"
      />

      {/* Modal Frontal: Generar Día Libre Semanal Acoplado */}
      <ModalGenerarDiaLibre
        isOpen={!!empleadoDiaLibre}
        onClose={() => setEmpleadoDiaLibre(null)}
        empleado={empleadoDiaLibre}
      />

      {/* Modal Frontal: Calculadora y Registro de Aumento Salarial */}
      {empleadoAumento && calculoAumento && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-900/30 backdrop-blur-[2px] animate-fadeIn overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEmpleadoAumento(null);
          }}
        >
          <div className="relative w-full max-w-2xl bg-white dark:bg-[#0c1222] rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 text-left my-6 animate-scaleIn">
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                      Gestión Salarial
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Nicaragua (Base 30 días)
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                    Aumento Salarial: {empleadoAumento.nombre}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEmpleadoAumento(null)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario de Aumento */}
            <form onSubmit={handleGuardarAumento} className="mt-4 space-y-4 max-h-[78vh] overflow-y-auto pr-1">
              {/* 1. Tarjeta informativa de antecedentes */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Fecha de Ingreso:</span>
                  <strong className="text-slate-800 dark:text-slate-200">{empleadoAumento.fechaIngreso}</strong>
                  <p className="text-[10px] text-slate-500">{calculoAumento.tiempoLaboradoTexto || 'Antigüedad activa'}</p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Salario Inicial (Al Iniciar):</span>
                  <strong className="text-slate-700 dark:text-slate-300">
                    C$ {calculoAumento.salarioInicial.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </strong>
                  <p className="text-[10px] text-slate-400">Base de contratación</p>
                </div>

                <div className="col-span-2 sm:col-span-1 bg-white dark:bg-slate-800/80 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-black text-blue-600 dark:text-blue-400 block">Último Salario Previo:</span>
                  <strong className="text-sm font-black text-slate-900 dark:text-white">
                    C$ {calculoAumento.salarioAnterior.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </strong>
                  <p className="text-[10px] text-slate-400">Salario base para el incremento</p>
                </div>
              </div>

              {/* 2. Selector de Modalidad del Incremento */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  1. Modalidad del Incremento Salarial:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTipoIncremento('monto_fijo');
                      setValorIncremento(1000);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      tipoIncremento === 'monto_fijo'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Monto en C$ (+C$)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTipoIncremento('porcentaje');
                      setValorIncremento(10);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      tipoIncremento === 'porcentaje'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <span>Porcentaje (+%)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTipoIncremento('nuevo_salario');
                      setValorIncremento(calculoAumento.salarioAnterior + 1500);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      tipoIncremento === 'nuevo_salario'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <span>Nuevo Salario Final</span>
                  </button>
                </div>
              </div>

              {/* 3. Inputs del Incremento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    {tipoIncremento === 'monto_fijo' 
                      ? 'Monto del Incremento (C$):' 
                      : tipoIncremento === 'porcentaje' 
                        ? 'Porcentaje de Incremento (%):' 
                        : 'Nuevo Salario Mensual Deseado (C$):'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step={tipoIncremento === 'porcentaje' ? '0.5' : '50'}
                      min="1"
                      required
                      value={valorIncremento}
                      onChange={e => setValorIncremento(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-black text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      {tipoIncremento === 'porcentaje' ? '%' : 'C$'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Fecha Efectiva del Aumento:
                  </label>
                  <input
                    type="date"
                    required
                    value={fechaAumento}
                    onChange={e => setFechaAumento(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Motivo o Justificación del Aumento:
                </label>
                <input
                  type="text"
                  value={motivoAumento}
                  onChange={e => setMotivoAumento(e.target.value)}
                  placeholder="Ej. Evaluación de metas, antigüedad laboral, ascenso de puesto..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              {/* 4. RESULTADO EN VIVO: FÓRMULA ÚLTIMO SALARIO + INCREMENTO */}
              <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-emerald-50 dark:from-indigo-950/40 dark:via-blue-950/40 dark:to-emerald-950/40 p-4 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Cálculo Salarial en Vivo (Último Salario + Incremento)</span>
                  </span>
                  <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md">
                    +{calculoAumento.porcentajeIncremento}% de Aumento
                  </span>
                </div>

                {/* Fórmula visual */}
                <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Último Salario</span>
                    <strong className="text-slate-700 dark:text-slate-300 font-mono text-sm">
                      C$ {calculoAumento.salarioAnterior.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>

                  <span className="text-lg font-black text-indigo-600">+</span>

                  <div>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block font-bold">Incremento</span>
                    <strong className="text-indigo-700 dark:text-indigo-300 font-mono text-sm">
                      C$ {calculoAumento.montoIncremento.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>

                  <span className="text-lg font-black text-emerald-600">=</span>

                  <div className="bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-black">NUEVO SALARIO MENSUAL</span>
                    <strong className="text-base font-black text-emerald-700 dark:text-emerald-300 font-mono">
                      C$ {calculoAumento.nuevoSalario.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>

                {/* Tarjetas de Desglose de Impacto */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                  <div className="bg-white/90 dark:bg-slate-900/90 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Salario Quincenal</span>
                    <span className="font-mono font-black text-slate-900 dark:text-white text-xs sm:text-sm">
                      C$ {calculoAumento.salarioQuincenal.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-emerald-600 block mt-0.5 font-bold">
                      +C$ {calculoAumento.diferenciaSalarioQuincenal.toFixed(2)} / qna
                    </span>
                  </div>

                  <div className="bg-white/90 dark:bg-slate-900/90 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Salario Diario (30d)</span>
                    <span className="font-mono font-black text-slate-900 dark:text-white text-xs sm:text-sm">
                      C$ {calculoAumento.salarioDiario.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-emerald-600 block mt-0.5 font-bold">
                      +C$ {calculoAumento.diferenciaSalarioDiario.toFixed(2)} / día
                    </span>
                  </div>

                  <div className="bg-white/90 dark:bg-slate-900/90 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Crecimiento Total</span>
                    <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-xs sm:text-sm">
                      +{calculoAumento.porcentajeCrecimientoTotal}%
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      desde su inicio
                    </span>
                  </div>

                  <div className="bg-white/90 dark:bg-slate-900/90 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Neto en Mano (INSS)</span>
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                      +C$ {calculoAumento.incrementoNetoMensual.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      INSS 7%: C$ {calculoAumento.inssLaboralNuevo.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Resumen explicativo */}
                <p className="text-[11px] text-slate-600 dark:text-slate-400 italic bg-white/60 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200/40 dark:border-slate-800/40">
                  {calculoAumento.resumenExplicativo}
                </p>
              </div>

              {/* Botones de acción */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEmpleadoAumento(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-500/20 transition flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Aplicar y Guardar Aumento Salarial</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Frontal: Historial Unificado de Vacaciones y Días Libres */}
      <ModalHistorialDescansos
        isOpen={!!empleadoHistorial}
        onClose={() => setEmpleadoHistorial(null)}
        empleado={empleadoHistorial}
      />
    </div>
  );
};
