"use client";

/**
 * Visor a pantalla completa de la imagen de Curiosity de un destino.
 *  - 360°: arrastrar gira sin fin (la imagen se repite en horizontal) y una brújula indica el giro.
 *  - Panorámica: se desplaza de lado a lado.
 *  - Foto: se ajusta a la pantalla; ampliada, se mueve.
 * Rueda o pellizco para ampliar, flechas para mover, Esc para cerrar.
 */
import { useEffect, useRef, useState } from "react";
import type { FotoDestino } from "@/lib/data/fotos";
import { enIdioma, useIdioma } from "@/lib/i18n";
import { CIFRA } from "./fuente";

const ZOOM_MAX = 5;

interface Props {
  foto: FotoDestino;
  nombre: string;
  onCerrar: () => void;
}

const cardinal = (cardinales: string[], grados: number) => cardinales[Math.round(grados / 22.5) % 16];

/** Datos oficiales de la imagen (NASA Photojournal), al lado de la imagen o abajo en móvil. */
function FichaOficial({ foto }: { foto: FotoDestino }) {
  const { t } = useIdioma();
  const filas: [string, string | undefined][] = [
    ["PIA", foto.pia],
    [t.camara, foto.camara],
    [t.sol, foto.sol],
    [t.tomada, foto.tomada],
    [t.publicada, foto.publicada],
    [t.imagenes, foto.imagenes ? String(foto.imagenes) : undefined],
    [t.credito, foto.credito],
  ];
  return (
    <aside
      aria-label={t.fichaOficialAria}
      className="flex w-[340px] shrink-0 flex-col gap-3 overflow-y-auto overscroll-contain border-l border-[#a0beff]/15 bg-[#060a17] p-4 max-sm:absolute max-sm:inset-x-0 max-sm:bottom-0 max-sm:max-h-[60%] max-sm:w-auto max-sm:border-l-0 max-sm:border-t"
    >
      <div>
        <p className="text-[12px] text-[#8d9cc2]">{t.tituloOficial}</p>
        <h3 className="mt-0.5 text-[15px] font-medium leading-snug">{foto.tituloOficial}</h3>
      </div>
      <p className="text-[13.5px] leading-relaxed text-[#b9c6e6]">{foto.descripcion}</p>
      <dl className="border-t border-[#a0beff]/15 pt-2 text-[13px]">
        {filas
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-3 py-0.5">
              <dt className="text-[#8d9cc2]">{k}</dt>
              <dd className={`${CIFRA} text-right text-[12.5px]`}>{v}</dd>
            </div>
          ))}
      </dl>
      <a
        href={foto.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-11 items-center justify-between rounded-[3px] border border-[#a0beff]/20 px-3 text-[13.5px] outline-none hover:bg-white/[0.06] focus-visible:ring-1 focus-visible:ring-white/70"
      >
        {t.verNasa}
        <span aria-hidden>↗</span>
      </a>
      <p className="text-[11.5px] leading-snug text-[#8d9cc2]">
        {t.notaDescripcion}
      </p>
    </aside>
  );
}

export default function VisorFoto({ foto: fotoOriginal, nombre, onCerrar }: Props) {
  const { t, idioma } = useIdioma();
  const TEXTOS = t;
  const foto = enIdioma(fotoOriginal, idioma);
  // La ficha oficial se ve de entrada en pantallas anchas (el visor solo existe en el cliente)
  const [info, setInfo] = useState(() => typeof window !== "undefined" && window.innerWidth >= 1024);
  const marcoRef = useRef<HTMLDivElement>(null);
  const [img, setImg] = useState<{ w: number; h: number } | null>(null);
  const [vista, setVista] = useState({ w: 0, h: 0 });
  // Zoom y desplazamiento juntos (desp null = centrado; se acota al dibujar). Se actualizan con
  // funciones para no perder movimiento cuando llegan varios eventos en el mismo fotograma.
  const [cam, setCam] = useState<{
    z: number;
    desp: { x: number; y: number } | null;
  }>({ z: 1, desp: null });
  const z = cam.z;
  const punteros = useRef(new Map<number, { x: number; y: number }>());
  const pellizco = useRef<number | null>(null);
  const gira = foto.tipo === "360";

  // Tamaño natural de la imagen y del marco
  useEffect(() => {
    const i = new Image();
    i.onload = () => setImg({ w: i.naturalWidth, h: i.naturalHeight });
    i.src = foto.src;
  }, [foto.src]);
  useEffect(() => {
    const el = marcoRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setVista({ w: e.contentRect.width, h: e.contentRect.height }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Escala base: las panorámicas llenan el alto; las fotos caben enteras
  const base =
    img && vista.w
      ? foto.tipo === "foto"
        ? Math.min(vista.w / img.w, vista.h / img.h)
        : vista.h / img.h
      : 1;
  const tamano = (zz: number) => ({
    W: img ? img.w * base * zz : 0,
    H: img ? img.h * base * zz : 0,
  });
  const { W, H } = tamano(z);

  const acotar = (p: { x: number; y: number }, zz: number) => {
    const t = tamano(zz);
    let { x, y } = p;
    if (gira && t.W)
      x = (((x % t.W) + t.W) % t.W) - t.W; // sin fin
    else
      x =
        t.W <= vista.w
          ? (vista.w - t.W) / 2
          : Math.min(0, Math.max(vista.w - t.W, x));
    y =
      t.H <= vista.h
        ? (vista.h - t.H) / 2
        : Math.min(0, Math.max(vista.h - t.H, y));
    return { x, y };
  };
  const posDe = (c: typeof cam) => {
    const t = tamano(c.z);
    return acotar(
      c.desp ?? { x: (vista.w - t.W) / 2, y: (vista.h - t.H) / 2 },
      c.z,
    );
  };
  const pos = posDe(cam);

  const mover = (dx: number, dy: number) =>
    setCam((c) => {
      const p = posDe(c);
      return { z: c.z, desp: acotar({ x: p.x + dx, y: p.y + dy }, c.z) };
    });

  const ampliar = (factor: number, cx = vista.w / 2, cy = vista.h / 2) =>
    setCam((c) => {
      const z1 = Math.min(ZOOM_MAX, Math.max(1, c.z * factor));
      if (z1 === c.z) return c;
      const p = posDe(c);
      const k = z1 / c.z;
      return {
        z: z1,
        desp: acotar({ x: cx - (cx - p.x) * k, y: cy - (cy - p.y) * k }, z1),
      };
    });

  // Teclado: el diálogo recibe las teclas (el foco está dentro: botón «Volver al mapa» o el propio diálogo)
  const onKeyDown = (e: React.KeyboardEvent) => {
    const paso = 80;
    const acciones: Record<string, () => void> = {
      Escape: onCerrar,
      ArrowLeft: () => mover(paso, 0),
      ArrowRight: () => mover(-paso, 0),
      ArrowUp: () => mover(0, paso),
      ArrowDown: () => mover(0, -paso),
      "+": () => ampliar(1.4),
      "=": () => ampliar(1.4),
      "-": () => ampliar(1 / 1.4),
    };
    const accion = acciones[e.key];
    if (!accion) return;
    e.preventDefault();
    e.stopPropagation();
    accion();
  };

  // Arrastre y pellizco
  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = punteros.current.get(e.pointerId);
    if (!prev) return;
    const ahora = { x: e.clientX, y: e.clientY };
    punteros.current.set(e.pointerId, ahora);
    if (punteros.current.size === 2) {
      const [a, b] = [...punteros.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const r = marcoRef.current!.getBoundingClientRect();
      if (pellizco.current)
        ampliar(
          d / pellizco.current,
          (a.x + b.x) / 2 - r.left,
          (a.y + b.y) / 2 - r.top,
        );
      pellizco.current = d;
      return;
    }
    mover(ahora.x - prev.x, ahora.y - prev.y);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    punteros.current.delete(e.pointerId);
    if (punteros.current.size < 2) pellizco.current = null;
  };

  // Rumbo del centro de la vista, solo si la ficha oficial da la orientación de la imagen
  const o = foto.orientacion;
  let rumbo: number | null = null;
  if (o && W) {
    const f0 = (vista.w / 2 - pos.x) / W;
    const f = gira ? ((f0 % 1) + 1) % 1 : Math.min(1, Math.max(0, f0));
    rumbo = Math.round((((o.izq + (o.der - o.izq) * f) % 360) + 360) % 360) % 360;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${nombre}: ${foto.titulo}`}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-50 flex flex-col bg-[#03050c] text-[#eaf0ff] outline-none"
      style={{
        fontFamily: "var(--font-jost), Futura, 'Century Gothic', sans-serif",
      }}
    >
      <header className="flex shrink-0 items-center gap-4 border-b border-[#a0beff]/15 py-2 pl-4 pr-2">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[16px] font-medium">{nombre}</h2>
          <p className={`${CIFRA} truncate text-[11.5px] text-[#8d9cc2]`}>
            {foto.pia} · {foto.camara} · sol {foto.sol} · {foto.credito}
          </p>
        </div>
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setInfo((v) => !v)}
            aria-pressed={info}
            className={`mr-1 h-11 rounded-[3px] px-3 text-[14px] outline-none focus-visible:ring-1 focus-visible:ring-white/70 ${info ? "bg-white/[0.08] text-[#eaf0ff]" : "text-[#b9c6e6] hover:text-white"}`}
          >
            {t.fichaOficial}
          </button>
          <div className="hidden items-center sm:flex">
            <button
              type="button"
              onClick={() => ampliar(1 / 1.4)}
              disabled={z <= 1}
              aria-label={TEXTOS.alejar}
              className="flex h-11 w-11 items-center justify-center text-[#eaf0ff] disabled:text-[#8d9cc2]/40"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M1.5 7h11" />
              </svg>
            </button>
            <span
              className={`${CIFRA} w-10 text-center text-[12px] text-[#8d9cc2]`}
            >
              {z.toFixed(1)}×
            </span>
            <button
              type="button"
              onClick={() => ampliar(1.4)}
              disabled={z >= ZOOM_MAX}
              aria-label={TEXTOS.acercar}
              className="flex h-11 w-11 items-center justify-center text-[#eaf0ff] disabled:text-[#8d9cc2]/40"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M7 1.5v11M1.5 7h11" />
              </svg>
            </button>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            autoFocus
            className="ml-2 h-11 rounded-[3px] border border-[#a0beff]/20 px-4 text-[14px] hover:bg-white/[0.06] outline-none focus-visible:ring-1 focus-visible:ring-white/70"
          >
            {t.volverMapa}
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
      <div
        ref={marcoRef}
        className="relative min-h-0 min-w-0 flex-1 cursor-grab touch-none select-none overflow-hidden active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={(e) => {
          const r = marcoRef.current!.getBoundingClientRect();
          ampliar(
            e.deltaY < 0 ? 1.15 : 1 / 1.15,
            e.clientX - r.left,
            e.clientY - r.top,
          );
        }}
        onDoubleClick={(e) => {
          const r = marcoRef.current!.getBoundingClientRect();
          ampliar(
            z < ZOOM_MAX ? 2 : 1 / ZOOM_MAX,
            e.clientX - r.left,
            e.clientY - r.top,
          );
        }}
      >
        {img ? (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${foto.src})`,
              backgroundRepeat: gira ? "repeat-x" : "no-repeat",
              backgroundSize: `${W}px ${H}px`,
              backgroundPosition: `${pos.x}px ${pos.y}px`,
            }}
          />
        ) : (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-[#8d9cc2]">
            Cargando imagen…
          </p>
        )}
        {rumbo !== null && (
          <div
            className="pointer-events-none absolute left-1/2 top-0 flex -translate-x-1/2 flex-col items-center"
            aria-live="polite"
            aria-label={t.mirando(cardinal(t.cardinales, rumbo), rumbo)}
          >
            <span className="h-3 w-px bg-[#eaf0ff]" />
            <span
              className={`${CIFRA} mt-1 rounded-[3px] bg-[#03050c]/85 px-2 py-0.5 text-[12px] text-[#eaf0ff]`}
            >
              {String(rumbo).padStart(3, "0")}° {cardinal(t.cardinales, rumbo)}
            </span>
          </div>
        )}
      </div>

      {info && <FichaOficial foto={foto} />}
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-[#a0beff]/15 px-4 py-2 text-[12.5px] text-[#8d9cc2]">
        <span className="truncate">{foto.titulo}</span>
        <span className="shrink-0 sm:hidden">
          {gira ? t.ayudaGiraCorta : t.ayudaMueveCorta}
        </span>
        <span className="hidden shrink-0 sm:inline">
          {gira ? t.ayudaGira : t.ayudaMueve} · {t.rueda}
          o pellizco para ampliar · Esc para volver
        </span>
      </footer>
    </div>
  );
}
