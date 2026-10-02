import React, { useState } from 'react';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle
} from 'lucide-react';
import { SendaLogo } from './SendaLogo';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const { iniciarSesion, cargandoAuth, errorAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [recordarSesion, setRecordarSesion] = useState(true);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    if (!email || !password) {
      setErrorLocal('Por favor ingresa usuario y contraseña.');
      return;
    }

    const exito = await iniciarSesion(email, password, recordarSesion);
    if (!exito) {
      setErrorLocal(errorAuth || 'Credenciales inválidas. Por favor intente nuevamente.');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f0f4f9] p-4 relative overflow-hidden">
      {/* Círculos de luz ambiental sutil de fondo */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Tarjeta de Login exacta a la Captura 3 */}
      <div className="w-full max-w-[430px] bg-white rounded-[2.5rem] shadow-2xl shadow-blue-900/10 border border-slate-100 p-8 sm:p-10 relative z-10 transition-all">
        {/* Logotipo SENDA SISTEMAS centrado */}
        <div className="flex justify-center mb-4">
          <SendaLogo size="lg" showBadge={false} layout="vertical" />
        </div>

        {/* Títulos */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            ¡Bienvenido de nuevo!
          </h2>
          <p className="text-xs text-slate-400 font-semibold mt-1">
            Ingresa tus credenciales para acceder.
          </p>
        </div>

        {/* Mensaje de Error */}
        {(errorLocal || errorAuth) && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorLocal || errorAuth}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campo Usuario o Correo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 text-left">
              Usuario o Correo
            </label>
            <div className="relative flex items-center">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4 text-slate-400" />
              </div>
              <input
                type="email"
                required
                disabled={cargandoAuth}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@tienda.com"
                className="w-full pl-11 pr-4 py-3 bg-[#eef4ff] border-0 rounded-2xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1d63ff] transition disabled:opacity-50"
              />
            </div>
          </div>

          {/* Campo Contraseña */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 text-left">
              Contraseña
            </label>
            <div className="relative flex items-center">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4 text-slate-400" />
              </div>
              <input
                type={mostrarPassword ? 'text' : 'password'}
                required
                disabled={cargandoAuth}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-11 pr-11 py-3 bg-[#eef4ff] border-0 rounded-2xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1d63ff] transition disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {mostrarPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Checkbox Mantener sesión iniciada */}
          <div className="flex items-center text-left pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={recordarSesion}
                onChange={(e) => setRecordarSesion(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#1d63ff] focus:ring-[#1d63ff]"
              />
              <span>Mantener sesión iniciada</span>
            </label>
          </div>

          {/* Botón Principal Azul Eléctrico exacto a la Captura 3 */}
          <button
            type="submit"
            disabled={cargandoAuth}
            className="w-full mt-3 bg-[#1d63ff] hover:bg-blue-600 text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-lg shadow-blue-500/30 uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition transform active:scale-98 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {cargandoAuth ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Accediendo...</span>
              </span>
            ) : (
              <>
                <span>INICIAR SESIÓN</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>



        {/* Pie de Página: Acceso Restringido */}
        <div className="mt-5 flex items-center justify-center gap-1.5 text-slate-400 text-[11px] font-semibold">
          <ShieldCheck className="w-4 h-4 text-slate-400" />
          <span>Acceso Restringido - Personal Autorizado</span>
        </div>
      </div>
    </div>
  );
};
