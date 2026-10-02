import React from 'react';
import { createPortal } from 'react-dom';
import { X, LogOut, Trash2, AlertTriangle, Info } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: string;
  itemName?: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'logout';
  icon?: React.ReactNode;
  iconShape?: 'rounded' | 'circle';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  confirmText = 'Sí, Salir',
  cancelText = 'Cancelar',
  type = 'logout',
  icon,
  iconShape = 'circle'
}) => {
  if (!isOpen) return null;

  const isLogout = type === 'logout';
  const isDanger = type === 'danger';
  const isWarning = type === 'warning';

  return createPortal(
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-[2px] animate-fadeIn"
      onClick={onClose}
    >
      {/* Modal Dialog Card */}
      <div 
        className="relative w-full max-w-[430px] bg-white dark:bg-[#0b1329] border border-slate-100 dark:border-slate-800 rounded-[32px] p-7 sm:p-9 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] text-center space-y-6 overflow-hidden animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Soft Ambient Top Glow behind the icon */}
        <div 
          className={`absolute -top-16 left-1/2 -translate-x-1/2 w-44 h-32 blur-3xl opacity-30 rounded-full pointer-events-none ${
            isLogout || isDanger ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-blue-500'
          }`} 
        />

        {/* Close Button X */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition cursor-pointer"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Circular Icon with Glow */}
        <div className="pt-1 flex justify-center">
          <div 
            className={`w-20 h-20 flex items-center justify-center border transition-transform duration-200 hover:scale-105 ${
              iconShape === 'circle' ? 'rounded-full' : 'rounded-3xl'
            } ${
              isLogout
                ? 'bg-[#fff1f2] dark:bg-rose-950/40 text-[#e11d48] border-[#ffe4e6] dark:border-rose-900/60 shadow-[0_0_30px_rgba(244,63,94,0.22)]'
                : isDanger
                ? 'bg-rose-500/10 text-rose-500 border-rose-500/30 shadow-[0_0_30px_rgba(244,63,94,0.22)]'
                : isWarning
                ? 'bg-amber-500/10 text-amber-500 border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.22)]'
                : 'bg-blue-500/10 text-blue-500 border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.22)]'
            }`}
          >
            {icon ? (
              icon
            ) : isLogout ? (
              <LogOut className="w-8 h-8 text-[#e11d48] stroke-[2.2] ml-0.5" />
            ) : isDanger ? (
              <Trash2 className="w-8 h-8 stroke-[2.2] text-[#e11d48]" />
            ) : isWarning ? (
              <AlertTriangle className="w-8 h-8 stroke-[2.2] text-amber-500" />
            ) : (
              <Info className="w-8 h-8 stroke-[2.2] text-blue-500" />
            )}
          </div>
        </div>

        {/* Title & Message */}
        <div className="space-y-2.5 px-2">
          <h3 className="text-2xl sm:text-[26px] font-black text-slate-900 dark:text-white tracking-tight">
            {title}
          </h3>
          
          {itemName && (
            <div className="inline-block max-w-full px-4 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 font-mono truncate">
              {itemName}
            </div>
          )}

          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-[13.5px] leading-relaxed max-w-[340px] mx-auto font-medium">
            {message}
          </p>
        </div>

        {/* Action Buttons: Cancelar & Sí, Salir */}
        <div className="flex items-center gap-3.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold text-sm transition cursor-pointer"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 py-3.5 px-4 rounded-2xl text-white font-bold text-sm shadow-[0_10px_25px_-5px_rgba(225,29,72,0.4)] hover:shadow-[0_12px_28px_-5px_rgba(225,29,72,0.55)] transition flex items-center justify-center gap-2 cursor-pointer ${
              isLogout || isDanger
                ? 'bg-[#e11d48] hover:bg-[#be123c]'
                : isWarning
                ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
            }`}
          >
            <span>{confirmText}</span>
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default ConfirmModal;
