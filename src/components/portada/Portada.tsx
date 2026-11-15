"use client";

/**
 * Portada del proyecto: la página se desplaza sobre el globo de Marte del mapa, que va detrás (fijo)
 * y que el scroll gira, acerca y aparta mientras cuenta el proyecto por secciones. En la última, la
 * demo, Marte queda con la cara llena y Gale en el centro: al tocar el planeta, los textos se van y
 * queda solo el planeta. La demo empieza en ese mismo globo (con el rótulo de Gale, que baja a la
 * zona de estudio), sin cambiar de página ni de lienzo.
 *
 * Cómo está hecha:
 *   - Esta capa da la altura de la página (una pantalla más un tramo de scroll por sección) y pinta
 *     los textos en una capa fija. Al hacer scroll se calcula la posición en el recorrido
 *     (lib/portada/escenas.ts): el globo la lee en cada fotograma (`recorridoRef`) y aquí se funde el
 *     texto de cada sección según lo cerca que esté.
 *   - El planeta no recibe toques mientras se lee (los recoge esta capa, así el scroll táctil
 *     funciona encima de él); en la demo, un botón redondo encima del planeta es lo que se toca.
 *   - Fuera de la portada (en la demo) la capa se funde y queda inerte; la página no se desplaza.
 *   - «Abrir el mapa» (en la portada y en la cabecera) entra en la herramienta desde cualquier punto:
 *     los textos se funden y el planeta se coloca en la vista del globo en un solo movimiento suave
 *     (gira sobre su eje hacia Gale, se centra y la luz barre la cara).
 *
 * Estilo (para que no parezca una plantilla): el único movimiento con intención es el del planeta;
 * los textos solo se funden. Títulos en Space Mono, el resto en Jost (la letra de la herramienta) y
 * la monoespaciada solo para datos. Sin rótulos en versalitas encima de cada título, sin numerar
 * lo que no es una secuencia, sin tiras de cifras, sin tarjetas ni marcos, sin flechas decorativas
 * y sin color de acento: el color lo pone Marte.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useIdioma } from "@/lib/i18n";
import { recorridoDeScroll, ULTIMA, visibilidad } from "@/lib/portada/escenas";
import SelectorIdioma from "@/components/SelectorIdioma";
import { spaceMono } from "./fuente";

/** Scroll de cada tramo entre secciones, en alturas de pantalla */
const TRAMO = 1.3;
/** En la demo (recorrido): el planeta ya está quieto en el centro y se puede tocar */
const EN_DEMO = ULTIMA - 0.01;
/**
 * Imán de la demo: si el scroll se para en el último tramo con el planeta aún de camino (pasado este
 * punto del recorrido), se encaja solo en la demo. Así, cuando se puede tocar, el planeta está siempre
 * en el centro, donde está el botón.
 */
const IMAN = ULTIMA - 0.7;
/** Tiempo sin scroll (ms) para darlo por parado */
const PARADA_MS = 160;
const REPOSITORIO = "https://github.com/raaulalonso/LandAndStand";

const sinSuscripcion = () => () => {};
const esReducido = () => {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
};

interface Props {
  /** La portada está a la vista (si no, se está en la demo) */
  activa: boolean;
  /** Posición en el recorrido (0 … ULTIMA), para el globo */
  recorridoRef: { current: number };
  /** «globo»: el planeta 3D ya se ve; «plano»: no hay WebGL (no hay planeta que tocar); null: cargando */
  carga: "globo" | "plano" | null;
  /** Se ha tocado el planeta (o el botón): a la demo */
  onEntrar: () => void;
}

// ---- Tipografía ----
/** Space Mono: títulos y datos */
const MONO = "[font-family:var(--font-space-mono),ui-monospace,monospace]";
const TITULO = `${MONO} font-bold leading-[1.02] tracking-[-0.045em] text-white [text-wrap:balance]`;
/** Tamaño de los títulos de sección (en horizontal, según el ancho; en vertical, según el móvil) */
const T_SECCION = "text-[clamp(2.1rem,9.5vw,3.3rem)] landscape:text-[clamp(2.4rem,4.9vw,5.1rem)]";
const TEXTO = "text-[16px] leading-[1.6] text-[#d3d9ea] sm:text-[18px] [text-wrap:pretty]";
const SECUNDARIO = "text-[14px] leading-[1.55] text-[#9aa6c4] sm:text-[15px]";
/** Solo para que el texto se lea donde cruza el planeta */
const SOMBRA = "[text-shadow:0_1px_16px_rgba(0,0,0,0.7)]";

export default function Portada({ activa, recorridoRef, carga, onEntrar }: Props) {
  const { t } = useIdioma();
  const p = t.presentacion;
  const reducido = useSyncExternalStore(sinSuscripcion, esReducido, () => false);
  const capa = useRef<HTMLDivElement>(null);
  const [enDemo, setEnDemo] = useState(false);

  // ---- Scroll → recorrido: para el globo (ref) y para los textos (estilos directos, sin renderizar) ----
  useEffect(() => {
    if (!activa) return;
    let raf = 0;
    const actualizar = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const s = recorridoDeScroll(max > 0 ? window.scrollY / max : 0);
      recorridoRef.current = s;
      capa.current?.querySelectorAll<HTMLElement>("[data-seccion]").forEach((el) => {
        const o = visibilidad(s, Number(el.dataset.seccion));
        el.style.opacity = String(o);
        el.style.visibility = o < 0.01 ? "hidden" : "visible";
      });
      setEnDemo(s >= EN_DEMO);
    };
    const pedir = () => {
      if (!raf) raf = requestAnimationFrame(actualizar);
    };
    // Imán de la demo (ver IMAN). No se encaja mientras el dedo sigue en la pantalla.
    let parada = 0;
    let tocando = false;
    const encajar = () => {
      if (tocando) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const s = recorridoDeScroll(max > 0 ? window.scrollY / max : 0);
      if (s > IMAN && s < EN_DEMO) window.scrollTo({ top: max, behavior: reducido ? "auto" : "smooth" });
    };
    const esperarParada = () => {
      window.clearTimeout(parada);
      parada = window.setTimeout(encajar, PARADA_MS);
    };
    const alScroll = () => {
      pedir();
      esperarParada();
    };
    const alTocar = () => {
      tocando = true;
    };
    const alSoltar = () => {
      tocando = false;
      esperarParada();
    };
    actualizar();
    window.addEventListener("scroll", alScroll, { passive: true });
    window.addEventListener("resize", pedir);
    window.addEventListener("touchstart", alTocar, { passive: true });
    window.addEventListener("touchend", alSoltar, { passive: true });
    window.addEventListener("touchcancel", alSoltar, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(parada);
      window.removeEventListener("scroll", alScroll);
      window.removeEventListener("resize", pedir);
      window.removeEventListener("touchstart", alTocar);
      window.removeEventListener("touchend", alSoltar);
      window.removeEventListener("touchcancel", alSoltar);
    };
  }, [activa, recorridoRef, reducido]);

  /** Vuelve al principio de la portada */
  const alInicio = () => window.scrollTo({ top: 0, behavior: reducido ? "auto" : "smooth" });

  /** Entra en la herramienta desde cualquier punto de la portada: el globo se coloca solo, suave */
  const abrirHerramienta = onEntrar;

  const tocable = activa && enDemo && carga === "globo";
  // Cada sección ocupa la capa fija entera; el planeta va en la parte que deja libre
  const SECCION = "absolute inset-0 flex px-5 sm:px-10 lg:px-16";
  const OCULTA = "invisible opacity-0";

  return (
    <div
      aria-label={p.aria}
      inert={!activa}
      className={`${spaceMono.variable} relative z-10`}
      style={{ height: `${100 + ULTIMA * TRAMO * 100}vh`, fontFamily: "var(--font-jost), Futura, 'Century Gothic', sans-serif" }}
    >
      <div
        ref={capa}
        className={`pointer-events-none fixed inset-0 overflow-hidden transition-opacity duration-700 ease-out motion-reduce:transition-none [container-type:size] ${activa ? "opacity-100" : "opacity-0"}`}
      >
        {/* ---- Cabecera ---- */}
        <header className="pointer-events-auto absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 px-5 pt-4 sm:px-10 sm:pt-6 lg:px-16">
          <button
            type="button"
            onClick={alInicio}
            className="block shrink-0 rounded-full outline-none transition-transform duration-300 hover:scale-[1.04] focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            {/* Solo el logo: el nombre ya está en grande en la portada */}
            {/* eslint-disable-next-line @next/next/no-img-element -- logo vectorial local */}
            <img src="/logo.svg" alt="" width={64} height={64} className="h-12 w-12 sm:h-16 sm:w-16" />
            <span className="sr-only">Land &amp; Stand</span>
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            <SelectorIdioma />
            <button
              type="button"
              onClick={abrirHerramienta}
              className="h-9 whitespace-nowrap rounded-md bg-white px-3.5 text-[14px] font-medium text-black outline-none transition-colors hover:bg-[#dfe5f2] focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:px-4"
            >
              {p.probar}
            </button>
          </div>
        </header>

        {/* ---- 0 · Portada: el título sobre la cara de noche ---- */}
        <section data-seccion={0} aria-labelledby="portada-titulo" className={`${SECCION} items-end pb-[15vh] landscape:items-center landscape:pb-0`}>
          <div className={`${SOMBRA} max-w-[min(92vw,720px)]`}>
            <h1 id="portada-titulo" className={`${TITULO} text-[clamp(3.4rem,15vw,6rem)] uppercase leading-[0.9] tracking-[-0.05em] landscape:text-[clamp(3.5rem,9.6vw,10rem)]`}>
              Land
              <br />
              &amp;&nbsp;Stand
            </h1>
            <p className="mt-6 max-w-[26ch] text-[19px] leading-[1.35] text-white sm:mt-8 sm:text-[25px]">{p.inicio.subtitulo}</p>
            {/*
              Que se vea que esto no es solo una presentación: la herramienta está aquí. Botón y nota en
              una fila, más o menos del ancho del título: le hacen de base.
            */}
            <div className="mt-8 flex flex-col items-start gap-3 sm:mt-11 sm:flex-row sm:items-center sm:gap-6">
              <button
                type="button"
                onClick={abrirHerramienta}
                className="pointer-events-auto h-12 shrink-0 rounded-md bg-white px-6 text-[16px] font-medium text-black outline-none transition-colors hover:bg-[#dfe5f2] focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:h-14 sm:px-8 sm:text-[17px]"
              >
                {p.abrir}
              </button>
              <p className={`${SECUNDARIO} max-w-[25ch]`}>{p.abrirAyuda}</p>
            </div>
          </div>
          {/* Pie de la portada: el evento */}
          <p className="absolute inset-x-0 bottom-6 px-5 text-[13px] text-[#8390b0] sm:bottom-8 sm:px-10 lg:px-16">{p.evento}</p>
        </section>

        {/* ---- 1 · El problema (planeta a la derecha) ---- */}
        <section data-seccion={1} aria-labelledby="portada-problema" className={`${SECCION} ${OCULTA} items-end pb-[10vh] landscape:items-center landscape:pb-0`}>
          <div className={`${SOMBRA} max-w-[min(92vw,600px)] landscape:max-w-[min(42vw,600px)]`}>
            <h2 id="portada-problema" className={`${TITULO} ${T_SECCION}`}>
              {p.problema.titulo}
            </h2>
            <p className={`${TEXTO} mt-7 max-w-[44ch]`}>{p.problema.texto}</p>
            <p className={`${TEXTO} mt-4 max-w-[44ch] text-white`}>{p.problema.texto2}</p>
          </div>
        </section>

        {/* ---- 2 · La idea (planeta a la izquierda) ---- */}
        <section
          data-seccion={2}
          aria-labelledby="portada-idea"
          className={`${SECCION} ${OCULTA} items-end pb-[10vh] landscape:items-center landscape:justify-end landscape:pb-0`}
        >
          <div className={`${SOMBRA} max-w-[min(92vw,600px)] landscape:max-w-[min(37vw,560px)]`}>
            <h2 id="portada-idea" className={`${TITULO} ${T_SECCION}`}>
              {p.idea.titulo}
            </h2>
            <p className={`${TEXTO} mt-7 max-w-[46ch]`}>{p.idea.texto}</p>
            <p className={`${SECUNDARIO} mt-5 max-w-[50ch]`}>{p.idea.ejemplo}</p>
          </div>
        </section>

        {/* ---- 3 · Cómo funciona: las capas del modelo, con su dato (planeta pequeño a la derecha) ---- */}
        <section data-seccion={3} aria-labelledby="portada-modelo" className={`${SECCION} ${OCULTA} items-end pb-[7vh] landscape:items-center landscape:pb-0`}>
          <div className={`${SOMBRA} w-full max-w-[min(92vw,560px)] landscape:max-w-[min(48vw,600px)]`}>
            <h2 id="portada-modelo" className={`${TITULO} ${T_SECCION}`}>
              {p.modelo.titulo}
            </h2>
            <dl className="mt-8 border-b border-white/15 sm:mt-10">
              {p.modelo.capas.map(([nombre, dato]) => (
                <div key={nombre} className="flex items-baseline justify-between gap-6 border-t border-white/15 py-2.5 sm:py-3">
                  <dt className="text-[15px] font-medium text-white sm:text-[16px]">{nombre}</dt>
                  <dd className={`${MONO} text-right text-[12px] text-[#9aa6c4] sm:text-[13px]`}>{dato}</dd>
                </div>
              ))}
            </dl>
            <p className={`${SECUNDARIO} mt-6 max-w-[52ch]`}>{p.modelo.nota}</p>
          </div>
        </section>

        {/* ---- 4 · En la misión (el horizonte de Marte abajo) ---- */}
        <section data-seccion={4} aria-labelledby="portada-mision" className={`${SECCION} ${OCULTA} items-start pt-[13vh] landscape:pt-[14vh]`}>
          <div className={`${SOMBRA} w-full max-w-[1180px]`}>
            <h2 id="portada-mision" className={`${TITULO} ${T_SECCION}`}>
              {p.mision.titulo}
            </h2>
            <div className="mt-8 grid gap-5 sm:mt-10 sm:gap-8 landscape:grid-cols-2">
              {p.mision.usos.map(([pie, alt], i) => (
                <figure key={pie} className="min-w-0">
                  {/* eslint-disable-next-line @next/next/no-img-element -- imagen local ya reducida */}
                  <img
                    src={["/portada/concepto-nave.jpg", "/portada/concepto-muneca.jpg"][i]}
                    alt={alt}
                    width={960}
                    height={540}
                    loading="lazy"
                    decoding="async"
                    className="block w-full rounded-[2px] object-cover [@media(orientation:portrait)]:max-h-[21vh] landscape:max-h-[31vh]"
                  />
                  <figcaption className="mt-2.5 text-[14px] text-[#d3d9ea] sm:text-[15px]">{pie}</figcaption>
                </figure>
              ))}
            </div>
            <p className="mt-4 text-[12px] leading-[1.5] text-[#8390b0] sm:text-[13px]">{p.mision.nota}</p>
          </div>
        </section>

        {/* ---- 5 · Demo: Marte de frente, se toca para empezar ---- */}
        <section data-seccion={5} aria-labelledby="portada-demo" className={`${SECCION} ${OCULTA} flex-col justify-between pb-6 pt-[12vh] sm:pb-8 landscape:pt-0`}>
          <div className="flex flex-1 flex-col justify-between landscape:flex-row landscape:items-center">
            {/* Título: arriba en vertical, a la izquierda del planeta en horizontal */}
            <div className={`${SOMBRA} landscape:w-[calc((100cqw_-_70cqh)/2_-_5.5rem)]`}>
              <h2
                id="portada-demo"
                className={`${TITULO} text-[clamp(2.1rem,10vw,3.4rem)] landscape:text-[length:clamp(1.6rem,calc((100cqw_-_70cqh)/13),4.5rem)]`}
              >
                {p.demo.titulo}
              </h2>
              <p className={`${TEXTO} mt-5 hidden max-w-[34ch] landscape:block`}>{p.demo.texto}</p>
            </div>
            {/* Llamada: abajo en vertical, a la derecha del planeta en horizontal */}
            <div className={`${SOMBRA} pb-5 landscape:flex landscape:w-[calc((100cqw_-_70cqh)/2_-_5.5rem)] landscape:justify-end landscape:pb-0`}>
              <Llamada carga={carga} tocable={tocable} onEntrar={onEntrar} />
            </div>
          </div>
          <footer className="flex flex-wrap items-center gap-x-8 gap-y-1.5 border-t border-white/10 pt-4 text-[12.5px] text-[#8390b0] sm:text-[13px]">
            <span>{p.evento}</span>
            <a
              href={REPOSITORIO}
              target="_blank"
              rel="noreferrer"
              className="pointer-events-auto rounded-sm text-[#d3d9ea] underline decoration-white/30 underline-offset-4 outline-none hover:text-white hover:decoration-white focus-visible:ring-1 focus-visible:ring-white/60"
            >
              {p.demo.codigo}
            </a>
            <span>{p.demo.datos}</span>
          </footer>
        </section>

        {/* ---- El planeta, tocable en la demo (encima de él, del mismo tamaño) ---- */}
        {carga === "globo" && (
          <button
            type="button"
            onClick={onEntrar}
            aria-label={p.demo.boton}
            tabIndex={tocable ? 0 : -1}
            aria-hidden={!tocable}
            className={`group absolute left-1/2 top-1/2 aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full outline-none [--r:0.7] [@media(orientation:portrait)]:[--r:0.9] ${
              tocable ? "pointer-events-auto cursor-pointer" : "pointer-events-none"
            }`}
            style={{ width: "calc(var(--r) * min(100cqw, 100cqh))" }}
          >
            {/* Anillo fino al pasar el ratón o con el foco: dice que el planeta se puede tocar */}
            <span
              aria-hidden
              className="absolute -inset-[3%] scale-95 rounded-full border border-white/0 transition-[transform,border-color] duration-500 group-hover:scale-100 group-hover:border-white/45 group-focus-visible:scale-100 group-focus-visible:border-white/80"
            />
          </button>
        )}
      </div>
    </div>
  );
}

/** «Toca el planeta»: con el globo, señala al planeta (y también se puede pulsar); sin él, un botón. */
function Llamada({ carga, tocable, onEntrar }: { carga: Props["carga"]; tocable: boolean; onEntrar: () => void }) {
  const { t } = useIdioma();
  const p = t.presentacion.demo;
  if (carga === "plano") {
    return (
      <button
        type="button"
        onClick={onEntrar}
        className="pointer-events-auto h-12 rounded-md bg-white px-6 text-[15px] font-medium text-black outline-none transition-colors hover:bg-[#dfe5f2] focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        {p.abrir}
      </button>
    );
  }
  if (carga === null) return <p className={SECUNDARIO}>{p.cargando}</p>;
  return (
    <button
      type="button"
      onClick={onEntrar}
      tabIndex={-1}
      aria-hidden
      disabled={!tocable}
      className="group pointer-events-auto block max-w-[17rem] text-left outline-none landscape:text-right"
    >
      <span className={`${MONO} block text-[19px] font-bold tracking-[-0.03em] text-white sm:text-[22px]`}>{p.tocar}</span>
      <span className={`${SECUNDARIO} mt-1.5 block`}>{p.tocarAyuda}</span>
    </button>
  );
}
