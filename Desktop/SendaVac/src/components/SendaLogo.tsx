import React from 'react';

interface SendaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
  layout?: 'horizontal' | 'vertical';
  className?: string;
}

export const SendaLogo: React.FC<SendaLogoProps> = ({
  size = 'md',
  showBadge = true,
  layout = 'vertical',
  className = ''
}) => {
  // Versión colapsada o pequeña
  if (size === 'sm') {
    return (
      <div className={`w-14 h-14 rounded-2xl bg-[#070b14] flex items-center justify-center shadow-lg shadow-blue-950/40 p-1.5 shrink-0 overflow-hidden border border-slate-800/80 mx-auto ${className}`}>
        <img
          src="/images/logo/senda-logo.png"
          alt="Senda Sistemas"
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  // Versión horizontal si aplica
  if (layout === 'horizontal') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="w-11 h-11 rounded-xl bg-[#070b14] flex items-center justify-center shadow-md p-1 shrink-0 overflow-hidden border border-slate-800/80">
          <img src="/images/logo/senda-logo.png" alt="Senda Sistemas" className="w-full h-full object-contain" />
        </div>
        <img
          src="/images/logo/senda-brand-text.png"
          alt="SENDA SISTEMAS"
          className="w-auto h-5 max-w-[170px] object-contain drop-shadow-md select-none"
        />
      </div>
    );
  }

  // Versión vertical estándar idéntica al dashboard de referencia (SendaFact)
  return (
    <div className={`flex flex-col items-center justify-center text-center space-y-2.5 ${className}`}>
      {/* 1. Recuadro del Logo (Caja de 90px x 90px con bordes redondeados y sombra 3D profunda) */}
      <div className="w-[90px] h-[90px] rounded-2xl bg-[#070b14] flex items-center justify-center shadow-xl shadow-blue-950/40 p-2 shrink-0 overflow-hidden border border-slate-800/80">
        <img
          src="/images/logo/senda-logo.png"
          alt="Senda Sistemas"
          className="w-full h-full object-contain"
        />
      </div>

      {/* 2. Título de Marca SENDA SISTEMAS (Gráfico 3D metálico exacto) */}
      <div className="w-full px-1 flex justify-center py-0.5">
        <img
          src="/images/logo/senda-brand-text.png"
          alt="SENDA SISTEMAS"
          className="w-auto h-5 sm:h-5.5 max-w-[195px] object-contain drop-shadow-md select-none pointer-events-none"
        />
      </div>

      {/* 3. Píldora de Versión */}
      {showBadge && (
        <div className="flex justify-center">
          <span className="text-[10px] font-black px-3.5 py-0.5 rounded-full bg-purple-50/80 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 uppercase tracking-wider shadow-2xs">
            SISTEMA V3.0 (REACT)
          </span>
        </div>
      )}
    </div>
  );
};
