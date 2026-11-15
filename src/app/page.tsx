"use client";

/**
 * Pantalla de la nave: fija, sin scroll de página.
 *   · Mapa (persona 2): ocupa toda la pantalla.
 *   · Panel (persona 3): flota encima, en una columna a la derecha en horizontal y en la mitad
 *     inferior en vertical (móvil). Se esconde y se saca con la pestaña de su borde. Se lee de
 *     arriba abajo: qué es (cabecera), la salida que se define (qué sol, quién sale, a qué ritmo)
 *     y lo que el modelo responde para los destinos de la misión.
 *
 * El panel no redimensiona el mapa (redimensionar el lienzo 3D en cada fotograma de la animación
 * sería caro): el mapa aparta sus controles y desplaza el centro de la vista (`hueco`).
 *
 * En la nave el panel debe caber entero en su columna (≈ 440 px × alto de pantalla) para que no
 * aparezca ninguna barra. En pantallas pequeñas (móvil) el panel se desplaza por dentro.
 *
 * En el globo de Marte y durante el descenso solo se ve el mapa: el panel entra cuando la cámara ya
 * se ha posado en la zona de estudio y se va al volver al globo.
 *
 * Destinos de la misión (decisión de la persona 3): el plan empieza con los destinos propuestos
 * (M1–M6). La tripulación puede quitarlos y añadir los suyos: el panel pide un punto, se toca en el
 * mapa (o se pulsa «Añadir» en la ficha de un punto o de un punto de referencia), se le pone nombre
 * y tareas en el panel y el mapa lo muestra con su probabilidad. Los sitios de Curiosity (T1–T6) no
 * son destinos: en el mapa son puntos de referencia. Al pulsar un destino en el panel, el mapa vuela
 * hasta él.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import type { Estado } from "@/lib/contract";
import { useModelo } from "@/hooks/useModelo";
import DeslizadorSol from "@/components/panel/DeslizadorSol";
import SelectorCaminante from "@/components/panel/SelectorCaminante";
import SelectorEscenario from "@/components/panel/SelectorEscenario";
import TablaDestinos from "@/components/panel/TablaDestinos";
import Creditos from "@/components/panel/Creditos";
import BarraProgreso from "@/components/panel/BarraProgreso";
import { PERFILES_ASTRONAUTAS } from "@/lib/data/perfiles";
import { DESTINOS_MISION, type DestinoMision } from "@/lib/data/targets";
import { DURACION_PANEL, PESTANA_PX } from "@/lib/panel";
import { useIdioma } from "@/lib/i18n";
import { jost, plexMono } from "@/components/mapa/fuente";

type PuntoMapa = { fila: number; columna: number };
type FaseMapa = "globo" | "descenso" | "terreno";

// El mapa 3D (WebGL) solo existe en el navegador; si no hay WebGL usa el mapa 2D por dentro
const MapaMarte3D = dynamic(() => import("@/components/mapa3d/MapaMarte3D"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-black" />,
});

const ESTADO_INICIAL: Estado = {
  sol: 1,
  modo: "grupo",
  tripulantes: [
    {
      vo2pre: PERFILES_ASTRONAUTAS[1].vo2pre,
      masa: PERFILES_ASTRONAUTAS[1].masa,
    },
    {
      vo2pre: PERFILES_ASTRONAUTAS[0].vo2pre,
      masa: PERFILES_ASTRONAUTAS[0].masa,
    },
    {
      vo2pre: PERFILES_ASTRONAUTAS[3].vo2pre,
      masa: PERFILES_ASTRONAUTAS[3].masa,
    },
  ],
  fwalk: 0.35,
  energiaHoras: 6,
};

// Orientación (la misma consulta que las variantes landscape: de Tailwind)
const CONSULTA_APAISADO = "(orientation: landscape)";
function suscribirOrientacion(aviso: () => void) {
  try {
    const mq = window.matchMedia(CONSULTA_APAISADO);
    mq.addEventListener("change", aviso);
    return () => mq.removeEventListener("change", aviso);
  } catch {
    return () => {};
  }
}
function esApaisado() {
  try {
    return window.matchMedia(CONSULTA_APAISADO).matches;
  } catch {
    return true;
  }
}

export default function Home() {
  const { t, idioma } = useIdioma();
  // El idioma del documento sigue al de la interfaz (lectores de pantalla, traductores, guiones)
  useEffect(() => {
    document.documentElement.lang = idioma;
  }, [idioma]);
  const [estado, setEstado] = useState<Estado>(ESTADO_INICIAL);
  const [destinosMision, setDestinosMision] = useState<DestinoMision[]>(DESTINOS_MISION);
  const [seleccionandoDestino, setSeleccionandoDestino] = useState(false);
  const [puntoDestino, setPuntoDestino] = useState<PuntoMapa | null>(null);
  // Al añadir un punto de referencia se proponen su nombre y lo que se estudió allí
  const [sugerencia, setSugerencia] = useState<{ nombre: string; tareas: string[] } | null>(null);
  const [enfoque, setEnfoque] = useState<{ id: string; n: number } | null>(null);
  // Destino desplegado en el panel (la fila activa). Lo lleva la página para poder elegirlo también desde el mapa.
  const [destinoActivo, setDestinoActivo] = useState<string | null>(null);
  const contadorDestinos = useRef(0);
  const [faseMapa, setFaseMapa] = useState<FaseMapa>("globo");
  const alCambiarFase = useCallback((f: FaseMapa) => setFaseMapa(f), []);
  const { resultado, progreso, calculando, error, pedirRuta } =
    useModelo(estado);
  const set = (parcial: Partial<Estado>) =>
    setEstado((e) => ({ ...e, ...parcial }));

  // ---- Panel: disponible en la zona de estudio; la tripulación lo esconde o lo saca ----
  const [panelOculto, setPanelOculto] = useState(false);
  const disponible = faseMapa === "terreno";
  const panelVisible = disponible && !panelOculto;
  const apaisado = useSyncExternalStore(suscribirOrientacion, esApaisado, () => true);
  const panelRef = useRef<HTMLElement>(null);
  const [tamPanel, setTamPanel] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    // El tamaño no cambia al esconderlo (se desplaza con transform)
    const ro = new ResizeObserver(() => setTamPanel({ w: el.offsetWidth, h: el.offsetHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Lo que el panel tapa del mapa. En vertical la pestaña queda siempre por encima del borde.
  const huecoDer = apaisado && panelVisible ? tamPanel.w : 0;
  const huecoAbajo = !apaisado && disponible ? (panelVisible ? tamPanel.h : 0) + PESTANA_PX : 0;
  const hueco = useMemo(() => ({ der: huecoDer, abajo: huecoAbajo }), [huecoDer, huecoAbajo]);

  // ---- Destinos ----
  const elegirPuntoDestino = useCallback((punto: PuntoMapa) => {
    setPuntoDestino(punto);
    setSugerencia(null);
    setSeleccionandoDestino(false);
    setPanelOculto(false);
  }, []);

  /** Desde la ficha de un punto del mapa: el panel pide el nombre y las tareas */
  const agregarDestinoDesdeMapa = useCallback(
    (punto: PuntoMapa, propuesta?: { nombre: string; tareas: string[] }) => {
      setSeleccionandoDestino(false);
      setPuntoDestino(punto);
      setSugerencia(propuesta ?? null);
      setPanelOculto(false);
    },
    [],
  );

  const iniciarSeleccionDestino = () => {
    setPuntoDestino(null);
    setSugerencia(null);
    setSeleccionandoDestino(true);
  };

  const cancelarSeleccionDestino = useCallback(() => {
    setSeleccionandoDestino(false);
    setPuntoDestino(null);
    setSugerencia(null);
  }, []);

  const guardarDestino = (datos: { nombre: string; tareas: string[] }) => {
    if (!puntoDestino) return;
    contadorDestinos.current += 1;
    const nuevoDestino: DestinoMision = {
      id: `P${contadorDestinos.current}`,
      nombre: datos.nombre,
      fila: puntoDestino.fila,
      columna: puntoDestino.columna,
      tareas: datos.tareas,
    };
    setDestinosMision((actuales) => [...actuales, nuevoDestino]);
    setPuntoDestino(null);
    setSugerencia(null);
  };

  const quitarDestino = (id: string) => {
    setDestinosMision((actuales) => actuales.filter((d) => d.id !== id));
    setDestinoActivo((activo) => (activo === id ? null : activo));
  };

  const enfocarDestino = (id: string) => setEnfoque((e) => ({ id, n: (e?.n ?? 0) + 1 }));

  return (
    <main
      className={`${jost.variable} ${plexMono.variable} relative h-dvh w-full overflow-hidden bg-[#060a17]`}
      style={{
        fontFamily: "var(--font-jost), Futura, 'Century Gothic', sans-serif",
      }}
    >
      {/* ---- Zona 1 · Mapa (persona 2) ---- */}
      <section aria-label={t.mapaAria} className="absolute inset-0">
        <MapaMarte3D
          resultado={resultado}
          sol={estado.sol}
          calculando={calculando}
          pedirRuta={pedirRuta}
          destinosMision={destinosMision}
          seleccionandoDestino={seleccionandoDestino}
          puntoDestino={puntoDestino}
          onElegirPuntoDestino={elegirPuntoDestino}
          onCancelarSeleccionDestino={cancelarSeleccionDestino}
          onAgregarDestino={agregarDestinoDesdeMapa}
          onSeleccionDestino={setDestinoActivo}
          onFase={alCambiarFase}
          hueco={hueco}
          enfoque={enfoque}
        />
      </section>

      {/* ---- Zona 2 · Panel (persona 3) ---- */}
      {/* Se desliza con transform (sin recalcular el diseño); la pestaña va fuera de la parte inerte */}
      <div
        className={`absolute inset-x-0 bottom-0 z-40 h-[40dvh] transition-transform ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none landscape:inset-x-auto landscape:right-0 landscape:top-0 landscape:h-full landscape:w-[min(440px,34vw)] ${
          panelVisible
            ? "translate-x-0 translate-y-0"
            : disponible
              ? "translate-y-full landscape:translate-x-full landscape:translate-y-0"
              : "translate-y-[calc(100%+3rem)] landscape:translate-x-[calc(100%+3rem)] landscape:translate-y-0"
        }`}
        style={{ transitionDuration: `${DURACION_PANEL}ms` }}
      >
        {disponible && (
          <button
            type="button"
            onClick={() => setPanelOculto((o) => !o)}
            aria-controls="panel-control"
            aria-expanded={panelVisible}
            aria-label={panelVisible ? t.esconderPanel : t.mostrarPanel}
            title={panelVisible ? t.esconderPanel : t.mostrarPanel}
            className="absolute -top-8 left-1/2 flex h-8 w-16 -translate-x-1/2 items-center justify-center rounded-t-md border border-b-0 border-[#a0beff]/15 bg-[#0a0f1f] text-[#b9c6e6] outline-none transition-colors hover:text-white focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/60 landscape:-left-8 landscape:top-1/2 landscape:h-16 landscape:w-8 landscape:translate-x-0 landscape:-translate-y-1/2 landscape:rounded-l-md landscape:rounded-tr-none landscape:border-b landscape:border-r-0"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className={`transition-transform duration-300 ${panelVisible ? "rotate-90 landscape:rotate-0" : "-rotate-90 landscape:rotate-180"}`}
            >
              <path d="M6 3l5 5-5 5" />
            </svg>
          </button>
        )}
        <aside
          ref={panelRef}
          id="panel-control"
          aria-label={t.panelAria}
          aria-hidden={!panelVisible}
          inert={!panelVisible}
          className="relative h-full w-full overflow-hidden border-t border-[#a0beff]/15 bg-[#0a0f1f] text-[#eaf0ff] shadow-[0_0_40px_-12px_rgba(0,0,0,0.85)] landscape:border-l landscape:border-t-0"
        >
          <BarraProgreso progreso={progreso} visible={calculando} />
          {/* @container: las piezas del panel se adaptan a su ancho, no al de la ventana */}
          <div
            data-panel-scroll
            className="@container flex h-full w-full flex-col overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-color:rgba(160,190,255,0.28)_transparent] [scrollbar-width:thin]"
          >
            {error && (
              <p role="alert" className="border-b border-[#a0beff]/15 px-4 py-2 text-[12.5px] text-[#ffb4b4] @[400px]:px-5">
                {error}
              </p>
            )}
            <DeslizadorSol sol={estado.sol} onChange={(sol) => set({ sol })} />
            <SelectorCaminante
              tripulantes={estado.tripulantes}
              onModo={(modo) => set({ modo })}
              onTripulantes={(tripulantes) => set({ tripulantes })}
              sol={estado.sol}
              fwalk={estado.fwalk}
              energiaHoras={estado.energiaHoras}
            />
            <SelectorEscenario
              fwalk={estado.fwalk}
              onFwalk={(fwalk) => set({ fwalk })}
            />
            <TablaDestinos
              resultado={resultado}
              destinosMision={destinosMision}
              activo={destinoActivo}
              onActivo={setDestinoActivo}
              calculando={calculando}
              sugerencia={sugerencia}
              seleccionando={seleccionandoDestino}
              puntoSeleccionado={puntoDestino}
              onIniciarSeleccion={iniciarSeleccionDestino}
              onCancelarSeleccion={cancelarSeleccionDestino}
              onGuardarDestino={guardarDestino}
              onEliminarDestino={quitarDestino}
              onEnfocar={enfocarDestino}
            />
            <div className="mt-auto">
              <Creditos />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
