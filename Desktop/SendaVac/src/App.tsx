import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { Sidebar, TabId } from './components/Sidebar';
import { TopNavbar } from './components/TopNavbar';
import { WelcomeBanner } from './components/WelcomeBanner';
import { MetricCards } from './components/MetricCards';
import { DonutCharts } from './components/DonutCharts';
import { AlertsWidget } from './components/AlertsWidget';
import { TablaPersonal } from './components/TablaPersonal';
import { PanelSolicitudesAdmin } from './components/PanelSolicitudesAdmin';
import { PanelEmpleado } from './components/PanelEmpleado';
import { ModuloPagoVacaciones } from './components/ModuloPagoVacaciones';
import { ModuloColillaPlanilla } from './components/ModuloColillaPlanilla';
import { ModuloGestionDescanso } from './components/ModuloGestionDescanso';
import { ModuloDiasLibres } from './components/ModuloDiasLibres';
import { ModuloFeriados } from './components/ModuloFeriados';
import { GuiaLeyNica } from './components/GuiaLeyNica';
import { ReporteSaldos } from './components/ReporteSaldos';
import { AjustesSistema } from './components/AjustesSistema';
import { RegistroEmpleadoModal } from './components/RegistroEmpleadoModal';
import { Login } from './components/Login';
import { ToastProvider } from './components/Toast';

function MainLayout() {
  const { usuarioActual, cargandoAuth } = useAuth();
  const [tabActiva, setTabActiva] = useState<TabId>('dashboard');
  const [colapsada, setColapsada] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [modalNuevoEmpleado, setModalNuevoEmpleado] = useState<boolean>(false);
  const [esModoOscuro, setEsModoOscuro] = useState<boolean>(() => {
    const guardado = localStorage.getItem('sendavac_theme');
    if (guardado) return guardado === 'dark';
    return false;
  });

  const esAdmin = usuarioActual?.rol === 'administrador';

  // Scrollbar independiente para el contenedor derecho (Dashboard y demás módulos)
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const [mainThumbTop, setMainThumbTop] = useState<number>(0);
  const [mainThumbHeight, setMainThumbHeight] = useState<number>(30); // porcentaje
  const isDraggingMainRef = useRef<boolean>(false);
  const startMainYRef = useRef<number>(0);
  const startMainScrollTopRef = useRef<number>(0);

  const actualizarMainScroll = useCallback(() => {
    if (!mainScrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = mainScrollRef.current;
    const maxScroll = scrollHeight - clientHeight;

    if (maxScroll <= 0) {
      setMainThumbHeight(100);
      setMainThumbTop(0);
      return;
    }

    const visibleRatio = clientHeight / scrollHeight;
    const computedThumbH = Math.max(10, Math.min(65, visibleRatio * 100));
    setMainThumbHeight(computedThumbH);

    const progress = Math.min(1, Math.max(0, scrollTop / maxScroll));
    const computedTop = progress * (100 - computedThumbH);
    setMainThumbTop(computedTop);
  }, []);

  useEffect(() => {
    actualizarMainScroll();
    const el = mainScrollRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      actualizarMainScroll();
    });
    ro.observe(el);
    if (el.firstElementChild) {
      ro.observe(el.firstElementChild);
    }

    window.addEventListener('resize', actualizarMainScroll);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', actualizarMainScroll);
    };
  }, [tabActiva, actualizarMainScroll]);

  // Al cambiar de tab, reiniciar el scroll arriba de forma limpia
  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, behavior: 'instant' });
      setTimeout(actualizarMainScroll, 60);
    }
  }, [tabActiva, actualizarMainScroll]);

  const handleMainScrollUp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollBy({ top: -200, behavior: 'smooth' });
      setTimeout(actualizarMainScroll, 100);
    }
  };

  const handleMainScrollDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollBy({ top: 200, behavior: 'smooth' });
      setTimeout(actualizarMainScroll, 100);
    }
  };

  const handleMainTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mainScrollRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const trackH = rect.height;
    const clickPercentage = Math.max(0, Math.min(1, clickY / trackH));
    const maxScroll = mainScrollRef.current.scrollHeight - mainScrollRef.current.clientHeight;
    if (maxScroll > 0) {
      mainScrollRef.current.scrollTo({ top: clickPercentage * maxScroll, behavior: 'smooth' });
      setTimeout(actualizarMainScroll, 50);
    }
  };

  const handleMainThumbMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingMainRef.current = true;
    startMainYRef.current = e.clientY;
    if (mainScrollRef.current) {
      startMainScrollTopRef.current = mainScrollRef.current.scrollTop;
    }

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingMainRef.current || !mainScrollRef.current) return;
      const deltaY = moveEvent.clientY - startMainYRef.current;
      const { scrollHeight, clientHeight } = mainScrollRef.current;
      const maxScroll = scrollHeight - clientHeight;
      const trackHeight = clientHeight - 40;
      const scrollRatio = maxScroll / (trackHeight || 1);
      mainScrollRef.current.scrollTop = startMainScrollTopRef.current + deltaY * scrollRatio;
      actualizarMainScroll();
    };

    const onMouseUp = () => {
      isDraggingMainRef.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Sincronizar clase 'dark' en el elemento raíz <html> para que Tailwind CSS active todos los dark:
  useEffect(() => {
    if (esModoOscuro) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('sendavac_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sendavac_theme', 'light');
    }
  }, [esModoOscuro]);

  // Si no es administrador y está en una ruta restringida, redirigir al portal de vacaciones
  useEffect(() => {
    if (usuarioActual && !esAdmin && !['dashboard', 'solicitudes', 'ley_nica', 'personal', 'planilla'].includes(tabActiva)) {
      setTabActiva('dashboard');
    }
  }, [usuarioActual, esAdmin, tabActiva]);

  // Si se navega a 'nuevo_empleado', abrir el modal en 'personal'
  useEffect(() => {
    if (tabActiva === 'nuevo_empleado') {
      setTabActiva('personal');
      setModalNuevoEmpleado(true);
    }
  }, [tabActiva]);

  const toggleTema = () => {
    setEsModoOscuro(prev => !prev);
  };

  if (cargandoAuth) {
    return (
      <div className="min-h-screen bg-[#f4f7fb] flex flex-col items-center justify-center space-y-3">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-slate-600">Cargando SendaVac...</p>
      </div>
    );
  }

  // Si no hay sesión iniciada, mostrar pantalla de Login idéntica a la Captura 3
  if (!usuarioActual) {
    return <Login />;
  }

  // Título dinámico para la barra superior
  const titulos: Record<TabId, string> = {
    dashboard: esAdmin ? 'Dashboard / Estadísticas' : 'Mis Vacaciones y Saldo',
    personal: esAdmin ? 'Registro del Personal' : 'Mis Vacaciones y Saldo',
    solicitudes: esAdmin ? 'Gestión de Solicitudes' : 'Solicitar Vacaciones',
    planilla: 'Planilla • Colilla de Pago (Cortes 15 y 30)',
    calculadora: 'Calculadora de Liquidación (Ley Nica)',
    descanso: 'Gestión del Personal',
    dias_libres: 'Día Libre Semanal (Art. 64 C.T.)',
    feriados: 'Días Feriados y Compensación (Art. 66 y 67 C.T.)',
    nuevo_empleado: 'Alta de Personal',
    ley_nica: 'Art. 76 Código del Trabajo (Nicaragua)',
    reportes: 'Reporte Consolidado de Saldos',
    ajustes: 'Ajustes del Sistema y Firebase'
  };

  const handleOpenAlertas = () => {
    setTabActiva('solicitudes');
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-[#f4f7fb] dark:bg-[#0b0f19] text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* Sidebar Fijo / Colapsable con su scroll independiente */}
      <Sidebar
        tabActiva={tabActiva}
        onCambiarTab={(tab) => setTabActiva(tab)}
        colapsada={colapsada}
        onToggleColapsada={() => setColapsada(!colapsada)}
        isOpenMobile={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Área Principal de Contenido con su scroll independiente */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Navbar Fijo */}
        <TopNavbar
          tituloSeccion={titulos[tabActiva]}
          onToggleSidebar={() => setMobileMenuOpen(true)}
          onOpenAlertas={handleOpenAlertas}
          onToggleTema={toggleTema}
          esModoOscuro={esModoOscuro}
        />

        {/* Contenedor Relativo con Scroll Independiente y Barra Azul SENDA a la derecha */}
        <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Contenedor de Scroll de Vistas */}
          <div
            ref={mainScrollRef}
            onScroll={actualizarMainScroll}
            className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 pr-5 sm:pr-7 md:pr-8 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            <main className="space-y-6 max-w-7xl w-full mx-auto animate-fadeIn pb-14">
              {/* VISTA 1: DASHBOARD / ESTADÍSTICAS O PORTAL DE VACACIONES DEL COLABORADOR */}
              {tabActiva === 'dashboard' && (
                esAdmin ? (
                  <div className="space-y-6">
                    {/* Banner de Bienvenida Verde agua idéntico a la captura */}
                    <WelcomeBanner />

                    {/* 4 Tarjetas de Métricas de la Tienda */}
                    <MetricCards />

                    {/* 3 Donut Charts circulares idénticos a la captura */}
                    <DonutCharts />

                    {/* Alertas y Recordatorios inferiores */}
                    <AlertsWidget
                      onVerTodasSolicitudes={() => setTabActiva('solicitudes')}
                      onVerLeyNica={() => setTabActiva('ley_nica')}
                    />
                  </div>
                ) : (
                  <PanelEmpleado empleado={usuarioActual} />
                )
              )}

              {/* VISTA 2: REGISTRO DEL PERSONAL */}
              {tabActiva === 'personal' && (
                <div>
                  {esAdmin ? (
                    <TablaPersonal onNuevoEmpleado={() => setModalNuevoEmpleado(true)} />
                  ) : (
                    <PanelEmpleado empleado={usuarioActual} />
                  )}
                </div>
              )}

              {/* VISTA 3: SOLICITUDES DE VACACIONES */}
              {tabActiva === 'solicitudes' && (
                <div>
                  {esAdmin ? (
                    <PanelSolicitudesAdmin />
                  ) : (
                    <PanelEmpleado empleado={usuarioActual} initialOpenForm={true} />
                  )}
                </div>
              )}

              {/* VISTA: PLANILLA Y COLILLAS DE PAGO (Cortes 15 y 30) */}
              {tabActiva === 'planilla' && (
                <ModuloColillaPlanilla />
              )}

              {/* VISTA 4: CALCULADORA DE LIQUIDACIÓN (Solo Administrador) */}
              {tabActiva === 'calculadora' && (
                esAdmin ? (
                  <ModuloPagoVacaciones />
                ) : (
                  <PanelEmpleado empleado={usuarioActual} />
                )
              )}

              {/* VISTA 5: GESTIÓN DE DESCANSO (Solo Administrador) */}
              {tabActiva === 'descanso' && (
                esAdmin ? (
                  <ModuloGestionDescanso />
                ) : (
                  <PanelEmpleado empleado={usuarioActual} />
                )
              )}

              {/* VISTA 5B: DÍAS LIBRES SEMANALES (Art. 64 C.T.) */}
              {tabActiva === 'dias_libres' && (
                <ModuloDiasLibres />
              )}

              {/* VISTA 5C: DÍAS FERIADOS Y COMPENSACIÓN (Art. 66 y 67 C.T.) */}
              {tabActiva === 'feriados' && (
                <ModuloFeriados />
              )}

              {/* VISTA 6: LEY NICA ART. 76 (Admin en ajustes / Colaborador vista directa) */}
              {tabActiva === 'ley_nica' && (
                esAdmin ? (
                  <AjustesSistema tabInicial="ley_nica" />
                ) : (
                  <GuiaLeyNica />
                )
              )}

              {/* VISTA 8: REPORTE DE SALDOS (Solo Administrador) */}
              {tabActiva === 'reportes' && (
                esAdmin ? (
                  <ReporteSaldos />
                ) : (
                  <PanelEmpleado empleado={usuarioActual} />
                )
              )}

              {/* VISTA 9: AJUSTES DEL SISTEMA (Solo Administrador) */}
              {tabActiva === 'ajustes' && (
                esAdmin ? (
                  <AjustesSistema />
                ) : (
                  <PanelEmpleado empleado={usuarioActual} />
                )
              )}
            </main>
          </div>

          {/* Barra Azul Visual Fija en el borde derecho que se desplaza arriba y abajo idéntica a SENDA */}
          <div 
            onWheel={(e) => {
              if (mainScrollRef.current) {
                mainScrollRef.current.scrollTop += e.deltaY;
                actualizarMainScroll();
              }
            }}
            className="absolute right-1 top-2 bottom-2 w-2.5 flex flex-col items-center select-none pointer-events-auto z-20"
          >
            {/* Flecha Arriba */}
            <button
              type="button"
              onClick={handleMainScrollUp}
              className="w-3.5 h-3.5 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:text-blue-800 active:scale-90 transition cursor-pointer text-[9px] leading-none mb-0.5 select-none"
              title="Subir vista"
            >
              ▲
            </button>

            {/* Riel de Fondo */}
            <div
              onClick={handleMainTrackClick}
              className="relative flex-1 w-2 bg-blue-100/70 dark:bg-slate-800/80 rounded-full cursor-pointer overflow-hidden my-0.5"
            >
              {/* Barra / Thumb Azul que se mueve en tiempo real de arriba a abajo */}
              <div
                onMouseDown={handleMainThumbMouseDown}
                className="absolute left-0 right-0 bg-blue-600 dark:bg-blue-500 rounded-full shadow-sm hover:bg-blue-700 active:bg-blue-800 transition-[top] duration-75 cursor-grab active:cursor-grabbing"
                style={{
                  top: `${mainThumbTop}%`,
                  height: `${mainThumbHeight}%`,
                  minHeight: '28px'
                }}
              />
            </div>

            {/* Flecha Abajo */}
            <button
              type="button"
              onClick={handleMainScrollDown}
              className="w-3.5 h-3.5 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:text-blue-800 active:scale-90 transition cursor-pointer text-[9px] leading-none mt-0.5 select-none"
              title="Bajar vista"
            >
              ▼
            </button>
          </div>
        </div>
      </div>

      {/* Modal para Registrar Nuevo Colaborador */}
      <RegistroEmpleadoModal
        isOpen={modalNuevoEmpleado}
        onClose={() => setModalNuevoEmpleado(false)}
        onSuccess={() => {
          setTabActiva('personal');
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <DataProvider>
        <AuthProvider>
          <MainLayout />
        </AuthProvider>
      </DataProvider>
    </ToastProvider>
  );
}
