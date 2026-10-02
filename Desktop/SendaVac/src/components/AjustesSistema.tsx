import React, { useState, useRef, useEffect } from 'react';
import { 
  Settings, 
  Database, 
  Users, 
  Building2, 
  Download, 
  Upload, 
  Save, 
  AlertTriangle, 
  FileSpreadsheet, 
  RotateCcw, 
  Flame, 
  UserPlus, 
  Trash2, 
  CheckCircle2,
  Image as ImageIcon, 
  UploadCloud, 
  X,
  Mail,
  Phone,
  MapPin,
  FileText,
  BookOpen,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { ConfirmModal } from './ConfirmModal';
import { GuiaLeyNica } from './GuiaLeyNica';
import { Empleado, EmpresaInfo } from '../types';

interface PropsAjustes {
  tabInicial?: 'backup' | 'users' | 'company' | 'ley_nica';
}

export const AjustesSistema: React.FC<PropsAjustes> = ({ tabInicial = 'backup' }) => {
  const { empleados, solicitudes, agregarEmpleado, actualizarEmpleado, eliminarEmpleado, recargarDatos } = useData();
  const { usuarioActual } = useAuth();
  const { success, warning, error, info } = useToast();

  const [activeTab, setActiveTab] = useState<'backup' | 'users' | 'company' | 'ley_nica'>(tabInicial);

  // File input refs
  const jsonInputRef = useRef<HTMLInputElement | null>(null);
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  // Confirmation Modals State
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [deleteUserTarget, setDeleteUserTarget] = useState<{ id: string; name: string } | null>(null);

  // User modal state (Crear / Editar)
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Empleado | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [userRole, setUserRole] = useState<'administrador' | 'cajero' | 'vendedor'>('administrador');
  const [userEstado, setUserEstado] = useState<'Activo' | 'Inactivo'>('Activo');

  // Permisos de Administrador y Protección del Super Administrador General
  const esAdmin = (usuarioActual?.rol || '').toLowerCase() === 'administrador' || (usuarioActual?.email || '').toLowerCase().trim() === 'jairotten84@gmail.com';
  const esSuperAdminJairo = (email?: string) => (email || '').toLowerCase().trim() === 'jairotten84@gmail.com';

  // Company Settings
  const [company, setCompany] = useState<EmpresaInfo>(() => {
    const saved = localStorage.getItem('sendavac_empresa');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return {
      nombreComercial: 'SENDA SISTEMAS',
      ruc: 'J0310000012345',
      telefono: '+505 8505 9284',
      email: 'jairotten84@gmail.com',
      direccion: 'Managua, Nicaragua, Villa Sol Casa E8-23',
      logo: '/images/logo/senda-logo.png'
    };
  });

  // 1. BACKUP JSON (EXPORT)
  const handleExportJSON = () => {
    const dataToExport = {
      sistema: 'SendaVac - Control de Vacaciones (Nicaragua)',
      version: '3.0 (React)',
      fechaExportacion: new Date().toISOString(),
      empresa: company,
      empleados: empleados,
      solicitudes: solicitudes
    };

    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sendavac_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    success('¡Copia de Seguridad Descargada!', 'Archivo JSON generado con éxito');
  };

  // 1. BACKUP JSON (IMPORT / RESTORE)
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (parsed.empleados && Array.isArray(parsed.empleados)) {
          localStorage.setItem('sendavac_empleados', JSON.stringify(parsed.empleados));
        }
        if (parsed.solicitudes && Array.isArray(parsed.solicitudes)) {
          localStorage.setItem('sendavac_solicitudes', JSON.stringify(parsed.solicitudes));
        }
        if (parsed.empresa) {
          setCompany(parsed.empresa);
          localStorage.setItem('sendavac_empresa', JSON.stringify(parsed.empresa));
        }

        await recargarDatos();
        success('¡Base de Datos Restaurada!', 'Todos los registros han sido actualizados');
      } catch (err) {
        error('Error al Restaurar', 'El archivo JSON de respaldo es inválido');
      }
    };
    reader.readAsText(file);
    if (jsonInputRef.current) jsonInputRef.current.value = '';
  };

  // 1. BACKUP AUTOMÁTICO (RECUPERAR / VERIFICAR)
  const handleAutoBackupRestore = async () => {
    await recargarDatos();
    success('¡Backup Automático Sincronizado!', `${empleados.length} colaboradores y ${solicitudes.length} solicitudes verificadas en base de datos`);
  };

  // 2. CSV PERSONAL Y VACACIONES (EXPORT)
  const handleExportCSV = () => {
    const headers = ['ID,NOMBRE,CORREO,CARGO,DEPARTAMENTO,TELEFONO,FECHA_INGRESO,SALARIO_MENSUAL_CS,DIAS_ACUMULADOS,DIAS_TOMADOS,SALDO_DISPONIBLE,ROL,ESTADO'];
    const rows = empleados.map(emp => {
      return `"${emp.id}","${emp.nombre.replace(/"/g, '""')}","${emp.email}","${emp.cargo}","${emp.departamento || 'General'}","${emp.telefono || ''}","${emp.fechaIngreso}","${emp.salarioMensual}","${emp.diasAcumulados}","${emp.diasTomados}","${emp.saldoDisponible}","${emp.rol}","${emp.estado || 'Activo'}"`;
    });

    const csvContent = '\uFEFF' + [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `personal_vacaciones_sendavac_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    success('¡Personal CSV Exportado!', 'Archivo compatible con Microsoft Excel descargado');
  };

  // 2. CSV PERSONAL (IMPORT)
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r\n|\n/).filter(l => l.trim().length > 0);
        if (lines.length <= 1) {
          warning('Archivo vacío', 'El archivo CSV no contiene filas de colaboradores');
          return;
        }

        let importedCount = 0;
        // Skip header row
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.replace(/^"(.*)"$/, '$1').trim());
          if (cols.length >= 7) {
            const nombre = cols[1];
            const email = cols[2];
            const cargo = cols[3] || 'Personal de Tienda';
            const departamento = cols[4] || 'Ventas';
            const fechaIngreso = cols[6] || '2024-01-01';
            const salarioMensual = parseFloat(cols[7]) || 12000;

            const existente = empleados.find(emp => emp.email.toLowerCase() === email.toLowerCase());
            if (existente) {
              await actualizarEmpleado(existente.id, {
                nombre,
                cargo,
                departamento,
                salarioMensual,
                fechaIngreso
              });
            } else {
              await agregarEmpleado({
                nombre,
                email,
                cargo,
                departamento,
                fechaIngreso,
                salarioMensual,
                diasTomados: 0,
                rol: 'empleado',
                estado: 'Activo'
              });
            }
            importedCount++;
          }
        }

        await recargarDatos();
        success('¡Personal Actualizado!', `${importedCount} colaboradores procesados e importados desde Excel CSV`);
      } catch (err) {
        error('Error al importar CSV', 'Verifica el formato del archivo CSV');
      }
    };
    reader.readAsText(file, 'UTF-8');
    if (csvInputRef.current) csvInputRef.current.value = '';
  };

  // 3. RESTABLECER SISTEMA
  const confirmResetData = async () => {
    localStorage.removeItem('sendavac_empleados');
    localStorage.removeItem('sendavac_solicitudes');
    await recargarDatos();
    warning('¡Sistema Restablecido!', 'Base de datos devuelta a valores iniciales de fábrica');
    setShowResetConfirm(false);
  };

  // LOGO UPLOAD & REMOVE
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      error('Archivo no válido', 'Por favor selecciona una imagen válida (PNG, JPG, SVG o WebP)');
      return;
    }

    if (file.size > 2.5 * 1024 * 1024) {
      warning('Imagen muy pesada', 'El tamaño máximo recomendado es 2.5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setCompany(prev => ({ ...prev, logo: base64 }));
      info('Logo cargado', 'Haz clic en "Guardar Cambios" para confirmar');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setCompany(prev => ({ ...prev, logo: '' }));
    if (logoInputRef.current) logoInputRef.current.value = '';
    info('Logo removido', 'Haz clic en "Guardar Cambios" para confirmar');
  };

  // GUARDAR DATOS DE LA EMPRESA
  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('sendavac_empresa', JSON.stringify(company));
    success('¡Configuración Guardada!', 'Datos comerciales y logotipo de la empresa actualizados correctamente');
  };

  // GUARDAR / CREAR USUARIO
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!esAdmin) {
      error('Permiso Denegado', 'Solo los usuarios con rol de Administrador pueden gestionar usuarios del sistema');
      return;
    }

    if (!userName.trim() || !userEmail.trim()) {
      error('Campos incompletos', 'Nombre y correo electrónico son obligatorios');
      return;
    }

    // Proteger al Administrador General
    if (editingUser && esSuperAdminJairo(editingUser.email)) {
      error('Usuario Protegido', 'El Administrador General (jairotten84@gmail.com) está protegido desde la base de datos y no puede ser modificado ni editado.');
      return;
    }

    // Validar contraseña para nuevos usuarios
    if (!editingUser && userPassword.trim().length < 6) {
      error('Contraseña Inválida', 'La contraseña del usuario debe contener un mínimo de 6 caracteres');
      return;
    }

    // Validar contraseña si se ingresó una nueva al editar
    if (editingUser && userPassword.trim() && userPassword.trim().length < 6) {
      error('Contraseña Inválida', 'La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    const defaultCargo = userRole === 'administrador'
      ? 'Administrador General'
      : userRole === 'cajero'
        ? 'Cajero'
        : 'Vendedor';

    const defaultDepto = userRole === 'administrador'
      ? 'Dirección y Gerencia'
      : userRole === 'cajero'
        ? 'Caja y Cobros'
        : 'Ventas y Mostrador';

    if (editingUser) {
      const updates: Partial<Empleado> = {
        nombre: userName.trim(),
        email: userEmail.trim().toLowerCase(),
        cargo: editingUser.cargo || defaultCargo,
        departamento: editingUser.departamento || defaultDepto,
        rol: userRole,
        estado: userEstado,
        ...(userPassword.trim() ? { password: userPassword.trim() } : {})
      };
      await actualizarEmpleado(editingUser.id, updates);
      success('¡Usuario Actualizado!', `${userName} ha sido actualizado correctamente`);
    } else {
      await agregarEmpleado({
        nombre: userName.trim(),
        email: userEmail.trim().toLowerCase(),
        password: userPassword.trim(),
        cargo: defaultCargo,
        departamento: defaultDepto,
        salarioMensual: 12500,
        fechaIngreso: new Date().toISOString().slice(0, 10),
        diasTomados: 0,
        rol: userRole,
        estado: userEstado
      });
      success('¡Usuario Creado!', `${userName} registrado con éxito en el sistema con su contraseña de acceso`);
    }

    setShowUserModal(false);
    setEditingUser(null);
    setUserPassword('');
    setShowPassword(false);
  };

  const confirmDeleteUser = async () => {
    if (!deleteUserTarget) return;

    if (!esAdmin) {
      error('Permiso Denegado', 'Solo los administradores pueden eliminar usuarios');
      return;
    }

    const targetUser = empleados.find(e => e.id === deleteUserTarget.id);
    if (targetUser && esSuperAdminJairo(targetUser.email)) {
      error('Acción Bloqueada', 'El usuario Administrador General (jairotten84@gmail.com) no puede ser eliminado.');
      setDeleteUserTarget(null);
      return;
    }

    await eliminarEmpleado(deleteUserTarget.id);
    warning('Usuario Eliminado', `"${deleteUserTarget.name}" fue retirado del sistema`);
    setDeleteUserTarget(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* File inputs invisibles */}
      <input
        type="file"
        ref={jsonInputRef}
        accept=".json"
        onChange={handleImportJSON}
        className="hidden"
      />
      <input
        type="file"
        ref={csvInputRef}
        accept=".csv"
        onChange={handleImportCSV}
        className="hidden"
      />

      {/* Header Banner idéntico a la captura */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/40 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-700 to-slate-500 p-0.5 shadow-lg shadow-slate-500/20 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-slate-900 dark:bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Settings className="w-7 h-7 text-slate-300" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Ajustes Generales del Sistema
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Configuración fiscal, centro de respaldos de base de datos y control de usuarios
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Pestañas (Tabs) idéntica a la captura */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('backup')}
          className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'backup'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Centro de Copias y Respaldos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Usuarios y Permisos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('company')}
          className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'company'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Datos de la Empresa</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ley_nica')}
          className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'ley_nica'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4 text-amber-500" />
          <span>Art. 76 Cód. Trabajo</span>
        </button>
      </div>

      {/* PESTAÑA 1: CENTRO DE COPIAS Y RESPALDOS (3 TARJETAS EXACTAS A LA CAPTURA) */}
      {activeTab === 'backup' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Encabezado de Sección */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                Centro de Copias y Respaldos
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Gestiona la base de datos de tu negocio en formatos JSON completos o edita tu catálogo en Excel usando archivos CSV.
              </p>
            </div>
          </div>

          {/* Rejilla de 3 Columnas idéntica a la imagen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* TARJETA 1: 1 - BACKUP COMPLETO */}
            <div className="bg-white dark:bg-slate-900/60 rounded-2xl p-6 border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md transition-shadow">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <Save className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      1 - Backup Completo
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40">
                    Formato JSON
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Copia TODOS los datos de tu POS (productos, clientes, usuarios, ventas y turnos) en un solo archivo para transferirlos fácilmente entre dispositivos o guardarlos.
                </p>
              </div>

              {/* Botones de Acción */}
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-purple-500/20 flex items-center justify-center gap-2 transition cursor-pointer active:scale-[0.99]"
                >
                  <Save className="w-4 h-4" />
                  <span>Hacer Backup</span>
                </button>

                <button
                  type="button"
                  onClick={() => jsonInputRef.current?.click()}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs shadow-2xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-blue-500" />
                  <span>Restaurar Backup</span>
                </button>

                <button
                  type="button"
                  onClick={handleAutoBackupRestore}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs shadow-2xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-slate-400" />
                  <span>Recuperar Backup Automático</span>
                </button>
              </div>
            </div>

            {/* TARJETA 2: 2 - INVENTARIO CSV (EXCEL) */}
            <div className="bg-white dark:bg-slate-900/60 rounded-2xl p-6 border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md transition-shadow">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      2 - Inventario CSV (Excel)
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                    Compatible con Excel
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Exporta e importa tu catálogo en formato CSV para edición masiva en Excel. Modifica los precios, costos, nombres o stock y vuelve a importarlo para actualizar el sistema.
                </p>
              </div>

              {/* Botones de Acción */}
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition cursor-pointer active:scale-[0.99]"
                >
                  <Download className="w-4 h-4" />
                  <span>Exportar Inventario</span>
                </button>

                <button
                  type="button"
                  onClick={() => csvInputRef.current?.click()}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs shadow-2xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-blue-500" />
                  <span>Importar Inventario</span>
                </button>
              </div>
            </div>

            {/* TARJETA 3: 3 - RESTABLECER SISTEMA */}
            <div className="bg-white dark:bg-slate-900/60 rounded-2xl p-6 border border-rose-200 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/10 flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md transition-shadow">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-black text-rose-700 dark:text-rose-300">
                      3 - Restablecer Sistema
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40">
                    Acción Destructiva
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Borra TODO el almacenamiento local del POS (catálogo, clientes, ventas y configuraciones). Útil para limpiar el sistema si hay datos corruptos o para empezar de cero con datos demo.
                </p>
              </div>

              {/* Botón de Acción */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 transition cursor-pointer active:scale-[0.99]"
                >
                  <Flame className="w-4 h-4" />
                  <span>Restablecer Base de Datos</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* PESTAÑA 2: USUARIOS Y PERMISOS */}
      {activeTab === 'users' && (() => {
        // Deduplicar empleados por correo para asegurar un único registro por usuario (especialmente el Super Administrador)
        const map = new Map<string, Empleado>();
        for (const emp of empleados) {
          if (!emp) continue;
          const key = (emp.email || emp.id || '').trim().toLowerCase();
          if (!key) continue;

          const existing = map.get(key);
          if (!existing) {
            map.set(key, emp);
          } else {
            if (existing.id === 'emp-admin-1' && emp.id !== 'emp-admin-1') {
              map.set(key, { ...existing, ...emp });
            } else {
              const tieneMasDetalle = (emp.nombre?.length || 0) >= (existing.nombre?.length || 0);
              map.set(key, tieneMasDetalle ? { ...existing, ...emp } : { ...emp, ...existing });
            }
          }
        }
        const listaUsuariosUnicos = Array.from(map.values());

        return (
          <div className="space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Usuarios del Sistema</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Gestión de cuentas, colaboradores y roles de seguridad</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!esAdmin) {
                    warning('Acceso Restringido', 'Solo los usuarios con rol de Administrador pueden crear nuevas cuentas.');
                    return;
                  }
                  setEditingUser(null);
                  setUserName('');
                  setUserEmail('');
                  setUserPassword('');
                  setShowPassword(false);
                  setUserRole('administrador');
                  setUserEstado('Activo');
                  setShowUserModal(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition cursor-pointer active:scale-95"
              >
                <UserPlus className="w-4 h-4" />
                <span>Crear Usuario</span>
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-900/80 text-xs uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Usuario</th>
                    <th className="px-6 py-4">Correo</th>
                    <th className="px-6 py-4">Rol</th>
                    <th className="px-6 py-4 text-center">Estado</th>
                    <th className="px-6 py-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {listaUsuariosUnicos.map((u) => {
                  const r = (u.rol || '').toLowerCase();
                  const esSuperAdmin = esSuperAdminJairo(u.email);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition">
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full ${
                          esSuperAdmin 
                            ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300' 
                            : 'bg-blue-50 dark:bg-slate-800 border-blue-200 dark:border-slate-700 text-blue-600 dark:text-blue-400'
                        } border flex items-center justify-center font-bold text-xs`}>
                          {u.nombre.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span>{u.nombre}</span>
                            {esSuperAdmin && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                <ShieldCheck className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                <span>Super Admin</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-normal">{u.cargo}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs font-medium">{u.email}</td>
                      <td className="px-6 py-4">
                        {esSuperAdmin ? (
                          <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs">
                            ADMIN GENERAL
                          </span>
                        ) : r === 'administrador' ? (
                          <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40">
                            ADMINISTRADOR
                          </span>
                        ) : r === 'cajero' ? (
                          <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                            CAJERO
                          </span>
                        ) : r === 'vendedor' ? (
                          <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
                            VENDEDOR
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {u.rol?.toUpperCase() || 'COLABORADOR'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                          u.estado === 'Inactivo'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        }`}>
                          {u.estado || 'Activo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {esSuperAdmin ? (
                          <div 
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 text-xs font-bold border border-slate-200 dark:border-slate-700" 
                            title="Usuario Administrador General protegido por Firebase y el Sistema. No se puede modificar ni editar."
                          >
                            <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>Inmutable</span>
                          </div>
                        ) : !esAdmin ? (
                          <span className="text-xs text-slate-400 italic">Solo Admin</span>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingUser(u);
                                setUserName(u.nombre);
                                setUserEmail(u.email);
                                setUserPassword(u.password || '');
                                setShowPassword(false);
                                const parsedRol = (u.rol as any) === 'administrador' ? 'administrador' : (u.rol as any) === 'cajero' ? 'cajero' : (u.rol as any) === 'vendedor' ? 'vendedor' : 'administrador';
                                setUserRole(parsedRol);
                                setUserEstado(u.estado === 'Inactivo' ? 'Inactivo' : 'Activo');
                                setShowUserModal(true);
                              }}
                              className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs cursor-pointer transition"
                              title="Editar usuario"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteUserTarget({ id: u.id, name: u.nombre })}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white rounded-lg text-xs transition cursor-pointer"
                              title="Eliminar usuario"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        );
      })()}

      {/* PESTAÑA 3: DATOS DE LA EMPRESA (IDÉNTICO A LAS IMÁGENES 3 Y 4) */}
      {activeTab === 'company' && (
        <form onSubmit={handleSaveCompany} className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-2xl space-y-5 animate-fadeIn shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-500" />
                <span>Información del Comercio y Logotipo</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Personaliza la identidad y cabecera de tus facturas y tickets térmicos
              </p>
            </div>
          </div>

          {/* Logotipo de la Empresa con caja negra idéntica a la captura */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                  Logotipo de la Empresa
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Este logo aparecerá impreso en la parte superior de cada factura y ticket de venta (POS).
                </p>
              </div>
              {company.logo && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="px-2.5 py-1 text-xs font-medium text-rose-500 hover:text-white hover:bg-rose-500 border border-rose-200 dark:border-rose-900/50 rounded-lg transition flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Quitar Logo</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-4">
              {/* Preview Box con fondo negro idéntico a las capturas 3 y 4 */}
              <div className="w-24 h-24 rounded-2xl bg-black border border-slate-800 flex items-center justify-center p-2 overflow-hidden shadow-md shrink-0">
                {company.logo ? (
                  <img
                    src={company.logo}
                    alt="Logo Empresa"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center text-slate-500 flex flex-col items-center">
                    <ImageIcon className="w-7 h-7 stroke-[1.5]" />
                    <span className="text-[10px] mt-1 font-medium">Sin Logo</span>
                  </div>
                )}
              </div>

              {/* Botón de cambio de logo */}
              <div className="flex-1 space-y-2">
                <input
                  type="file"
                  ref={logoInputRef}
                  accept="image/png, image/jpeg, image/webp, image/svg+xml"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4 text-blue-400" />
                  <span>{company.logo ? 'Cambiar Logotipo' : 'Subir Logotipo de Empresa'}</span>
                </button>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  Formatos admitidos: PNG, JPG, SVG o WebP (Fondo transparente recomendado, máx. 2.5 MB).
                </p>
              </div>
            </div>
          </div>

          {/* Formulario de 2 Columnas idéntico a las capturas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">
                Nombre Comercial
              </label>
              <input
                type="text"
                required
                value={company.nombreComercial}
                onChange={(e) => setCompany({ ...company, nombreComercial: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">
                RUC / Cédula Jurídica
              </label>
              <input
                type="text"
                required
                value={company.ruc}
                onChange={(e) => setCompany({ ...company, ruc: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">
                Teléfono
              </label>
              <input
                type="text"
                value={company.telefono}
                onChange={(e) => setCompany({ ...company, telefono: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">
                Correo
              </label>
              <input
                type="email"
                value={company.email}
                onChange={(e) => setCompany({ ...company, email: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">
              Dirección
            </label>
            <input
              type="text"
              value={company.direccion}
              onChange={(e) => setCompany({ ...company, direccion: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Cambios</span>
          </button>
        </form>
      )}

      {/* PESTAÑA 4: ART. 76 CÓDIGO DEL TRABAJO (GUÍA LEGAL) */}
      {activeTab === 'ley_nica' && (
        <div className="pt-1 animate-fadeIn">
          <GuiaLeyNica />
        </div>
      )}

      {/* Modal para Crear / Editar Usuario idéntico a la imagen de referencia */}
      {showUserModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-[2px] animate-fadeIn">
          <div className="relative w-full max-w-[460px] bg-white dark:bg-[#0f172a] rounded-[28px] p-7 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-800 text-left">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5 text-blue-600 stroke-[2.3]" />
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-2">
                  NOMBRE COMPLETO
                </label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Ej. Jairo Cajina"
                  className="w-full bg-[#f8fafc] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-2">
                  CORREO ELECTRÓNICO
                </label>
                <input
                  type="email"
                  required
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="admin@sendasistemas.com"
                  className="w-full bg-[#f8fafc] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-2">
                  CONTRASEÑA DEL USUARIO
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!editingUser}
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    placeholder={editingUser ? '•••••••• (Dejar en blanco para mantener actual)' : 'Mínimo 6 caracteres'}
                    minLength={editingUser && !userPassword ? undefined : 6}
                    className="w-full bg-[#f8fafc] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl pl-4 pr-11 py-3 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                    title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    )}
                  </button>
                </div>
                {editingUser && (
                  <p className="text-[10.5px] text-slate-400 mt-1">
                    Opcional: Si se deja vacío, se mantendrá la contraseña existente.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* ROL */}
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-2">
                    ROL
                  </label>
                  <div className="relative">
                    <select
                      value={userRole}
                      onChange={(e) => setUserRole(e.target.value as any)}
                      className="w-full bg-[#f8fafc] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer appearance-none pr-10"
                    >
                      <option value="administrador">ADMINISTRADOR</option>
                      <option value="cajero">CAJERO</option>
                      <option value="vendedor">VENDEDOR</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-700 dark:text-slate-300">
                      <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* ESTADO */}
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-2">
                    ESTADO
                  </label>
                  <div className="relative">
                    <select
                      value={userEstado}
                      onChange={(e) => setUserEstado(e.target.value as any)}
                      className="w-full bg-[#f8fafc] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer appearance-none pr-10"
                    >
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-700 dark:text-slate-300">
                      <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-2xl shadow-lg shadow-blue-500/25 transition cursor-pointer active:scale-95"
                >
                  Guardar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Restablecer Base de Datos */}
      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={confirmResetData}
        title="¿Restablecer Base de Datos?"
        message="Esta acción borrará los registros de vacaciones y colaboradores locales para volver a los datos de muestra iniciales."
        confirmText="Sí, Restablecer"
        cancelText="Cancelar"
        type="danger"
        iconShape="circle"
      />

      {/* Modal de Confirmación para Eliminar Usuario */}
      <ConfirmModal
        isOpen={deleteUserTarget !== null}
        onClose={() => setDeleteUserTarget(null)}
        onConfirm={confirmDeleteUser}
        title="¿Eliminar Usuario?"
        itemName={deleteUserTarget?.name}
        message="¿Está seguro de que desea retirar a este usuario del sistema?"
        confirmText="Sí, Eliminar"
        cancelText="Cancelar"
        type="danger"
        iconShape="circle"
      />
    </div>
  );
};
