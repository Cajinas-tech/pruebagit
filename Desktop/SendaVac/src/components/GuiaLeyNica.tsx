import React from 'react';
import { 
  BookOpen, 
  Scale, 
  Clock, 
  Calculator, 
  CheckCircle, 
  AlertTriangle,
  FileText,
  ShieldCheck
} from 'lucide-react';

export const GuiaLeyNica: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Portada */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-8 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-blue-800/80 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase mb-3">
            <span>🇳🇮 República de Nicaragua</span>
            <span>•</span>
            <span>Código del Trabajo (Ley N° 185)</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">
            Artículo 76: Régimen Legal de Vacaciones
          </h2>
          <p className="text-xs md:text-sm text-blue-200 mt-2 max-w-2xl leading-relaxed">
            Reglas, cálculo exacto de días proporcionales y liquidación económica obligatoria para el personal de tiendas y comercio en Nicaragua.
          </p>
        </div>
      </div>

      {/* Tarjetas de Claves Legales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Clave 1 */}
        <div className="bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center mb-3 border border-blue-200 dark:border-blue-800">
              <Clock className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-black text-slate-800 dark:text-white">2.5 Días por Mes</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Por cada mes de trabajo continuo al servicio del empleador, el trabajador acumula 2.5 días hábiles, totalizando <strong>30 días al año</strong>.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-bold text-blue-700 dark:text-blue-400">
            Art. 76, Párrafo 1
          </div>
        </div>

        {/* Clave 2 */}
        <div className="bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center mb-3 border border-amber-200 dark:border-amber-800">
              <Scale className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-black text-slate-800 dark:text-white">Descanso de 6 Meses</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              El trabajador tiene derecho por cada 6 meses de trabajo continuo a <strong>quince (15) días de descanso remunerado</strong>.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-bold text-amber-700 dark:text-amber-400">
            Art. 76, Párrafo 2
          </div>
        </div>

        {/* Clave 3 */}
        <div className="bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mb-3 border border-emerald-200 dark:border-emerald-800">
              <Calculator className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-black text-slate-800 dark:text-white">Fórmula de Pago (C$)</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Al liquidar vacaciones no gozadas: <br />
              <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px] font-mono text-emerald-800 dark:text-emerald-300">
                (Salario Mensual ÷ 30) × Días
              </code>
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
            Base Salario Ordinario
          </div>
        </div>
      </div>

      {/* Detalle normativo completo */}
      <div className="bg-white dark:bg-slate-900/60 rounded-3xl p-6 md:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span>Texto íntegro del Artículo 76 - Código del Trabajo</span>
        </h3>

        <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border-l-4 border-blue-600 text-xs md:text-sm text-slate-700 dark:text-slate-200 font-medium leading-relaxed italic">
          "Todo trabajador tiene derecho a quince días de descanso continuo remunerado en concepto de vacaciones, por cada seis meses de trabajo continuo al servicio de un mismo empleador.
          <br /><br />
          Los trabajadores que presten servicios por tiempo determinado o por obra determinada, o que no alcancen a cumplir los seis meses de trabajo continuo, gozarán de un período de vacaciones proporcional al tiempo trabajado."
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 text-xs">
          <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl">
            <h5 className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5 mb-1">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ¿Cómo calcula este sistema los saldos?
            </h5>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              El sistema SendaVac toma la fecha exacta de ingreso del trabajador y calcula los meses y días transcurridos hasta el día de hoy, multiplicando por 2.5 y restando automáticamente los días tomados y aprobados.
            </p>
          </div>

          <div className="p-4 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl">
            <h5 className="font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Salario promedio de los 6 meses
            </h5>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              En caso de personal con salario variable (comisiones por ventas de mostrador o metas de tienda), la base se establece sobre el promedio devengado durante el último semestre laboral.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
