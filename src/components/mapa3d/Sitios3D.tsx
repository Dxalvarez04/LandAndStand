"use client";

/**
 * Sobre el terreno 3D, cada sitio con un poste fino desde el suelo y su etiqueta (HTML, tamaño
 * constante), como en el 2D:
 *   ▲ hábitat
 *   ● destinos de la misión propuestos (M1…) y ◆ los añadidos por la tripulación (P1…): ámbar a
 *     partir del 50 %
 *   ◎ puntos de referencia de Curiosity (T1–T6): anillo hueco y texto más apagado, sin ámbar (no son
 *     metas, solo orientan); al tocarlos se ve lo que fotografió Curiosity
 * También la retícula de la selección, apoyada en el suelo.
 *
 * Cada texto lleva `data-rotulo` con su prioridad: cuando se juntan en pantalla (vista inclinada), se
 * ve el de más prioridad y de los demás queda la marca (lib/mapa3d/rotulos.ts).
 */
import { Html, Line } from "@react-three/drei";
import { memo, useMemo } from "react";
import { DoubleSide } from "three";
import type { IdDestino } from "@/lib/contract";
import { DESTINOS, HABITAT } from "@/lib/data/targets";
import { CELDA_KM, X0, Y0 } from "@/lib/constants";
import { ESTILO } from "@/lib/mapa/estilo";
import { enIdioma, useIdioma } from "@/lib/i18n";
import { alturaEn, type Alturas } from "@/lib/mapa3d/alturas";
import { aEscena, celdaAProyectadas } from "@/lib/mapa3d/coordenadas";
import type { Celda } from "@/lib/mapa/geo";
import { CIFRA } from "@/components/mapa/fuente";
import { MarcaReferencia } from "@/components/mapa/CapaSitios";

const POSTE = 70; // m sobre el suelo
const SOMBRA = "[text-shadow:0_0_3px_rgba(6,10,23,1),0_0_8px_rgba(6,10,23,0.95),0_1px_2px_rgba(6,10,23,1)]";
const Z_ETIQUETAS: [number, number] = [20, 10]; // por debajo de la ficha (z-30) y de los controles
/**
 * Lado de cada etiqueta respecto a su punto, para que no se pisen en la vista 3D por defecto y en la
 * cenital (T1 y T2 están juntos, y T3, T4 y T6 casi en línea; M3 queda junto a T3). Los destinos de la
 * misión que no aparecen van a la derecha.
 */
const LADO: Record<string, "izq" | "der" | "abajo"> = { T1: "abajo", T2: "izq", T3: "izq", T4: "izq", T5: "der", T6: "der", M3: "izq" };
/** En pantallas estrechas las referencias no llevan texto: solo hay que separar M2 y M3. */
const LADO_COMPACTO: Record<string, "izq" | "der" | "abajo"> = { M3: "abajo" };
const MEDIO_PUNTO = 11; // px desde el borde de la etiqueta hasta el centro del punto (padding + radio)
const MEDIO_ALTO = 13; // px desde arriba hasta el centro del punto en las etiquetas «abajo»
const TRANSFORMA = {
  izq: `translate(calc(-100% + ${MEDIO_PUNTO}px), -50%)`,
  der: `translate(-${MEDIO_PUNTO}px, -50%)`,
  abajo: `translate(-50%, -${MEDIO_ALTO}px)`,
};
const DISPOSICION = { izq: "flex-row-reverse", der: "", abajo: "flex-col gap-0.5" };
/** Prioridad de cada rótulo cuando se pisan: hábitat, selección, destinos (antes los probables) y referencias */
const PRIORIDAD = { habitat: 100, nuevo: 95, seleccion: 90, destinoProbable: 55, destino: 50, referencia: 20 };
const TEXTO_ROTULO = "transition-opacity duration-200";
const MARCA = "pointer-events-auto shrink-0";

const ladoPropio = (id: string, compacto: boolean) => (compacto ? LADO_COMPACTO[id] : LADO[id]) ?? "der";

function posicion(a: Alturas, zRef: number, northKm: number, eastKm: number) {
  const este = X0 + eastKm * 1000;
  const norte = Y0 + northKm * 1000;
  const { x, z } = aEscena(este, norte);
  return { x, z, y: alturaEn(a, este, norte) - zRef };
}

function posicionCelda(a: Alturas, zRef: number, c: Celda) {
  const { este, norte } = celdaAProyectadas(c);
  const { x, z } = aEscena(este, norte);
  return { x, z, y: alturaEn(a, este, norte) - zRef };
}

/** Destino de la misión: propuesto (M1…) o añadido por la tripulación desde el panel (P1…). */
export interface SitioPropio {
  id: string;
  nombre: string;
  celda: Celda;
  /** Propuesto (●); si no, añadido (◆) */
  propuesto?: boolean;
}

interface Props {
  alturas: Alturas;
  zRef: number;
  probDe: (id: IdDestino) => number | undefined;
  probCelda: (c: Celda) => number | undefined;
  seleccionado: IdDestino | null;
  onElegir: (id: IdDestino) => void;
  propios: SitioPropio[];
  propioSel: string | null;
  onElegirPropio: (id: string) => void;
  /** Punto elegido para un destino nuevo, a falta de nombre en el panel */
  puntoNuevo: Celda | null;
  /** Etiqueta corta (T1…) en pantallas estrechas */
  compacto: boolean;
  /** Se ocultan (con fundido) mientras la cámara llega */
  visibles: boolean;
}

/** Estilo de aparición de las etiquetas HTML. */
const aparecer = (visibles: boolean, transform?: string): React.CSSProperties => ({
  transform,
  opacity: visibles ? 1 : 0,
  transition: "opacity 600ms ease-out",
  pointerEvents: visibles ? undefined : "none",
});

/** Punto de los destinos de la misión propuestos (M1…). */
function Punto({ relleno, sel }: { relleno: string; sel: boolean }) {
  return (
    <svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden className="shrink-0 overflow-visible">
      {sel && <circle r="6.6" fill="none" stroke="#ff8fd8" strokeWidth="2" />}
      <circle r="4.4" fill={relleno} stroke="#060a17" strokeWidth="1.5" />
    </svg>
  );
}

/** Rombo de los destinos añadidos por la tripulación (P1…). */
function Rombo({ relleno, sel, hueco }: { relleno: string; sel: boolean; hueco?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden className="shrink-0 overflow-visible">
      {sel && <rect x="-6.2" y="-6.2" width="12.4" height="12.4" transform="rotate(45)" fill="none" stroke="#ff8fd8" strokeWidth="2" />}
      <rect
        x="-4"
        y="-4"
        width="8"
        height="8"
        transform="rotate(45)"
        fill={hueco ? "none" : relleno}
        stroke={hueco ? relleno : "#060a17"}
        strokeWidth={hueco ? 1.8 : 1.5}
      />
    </svg>
  );
}

function Sitios3D({
  alturas,
  zRef,
  probDe,
  probCelda,
  seleccionado,
  onElegir,
  propios,
  propioSel,
  onElegirPropio,
  puntoNuevo,
  compacto,
  visibles,
}: Props) {
  // Los textos se calculan aquí: el contenido de <Html> vive en otra raíz de React
  const { t, pct, idioma } = useIdioma();
  const sitios = useMemo(
    () => DESTINOS.map((d) => ({ ...enIdioma(d, idioma), ...posicion(alturas, zRef, d.northKm, d.eastKm) })),
    [alturas, zRef, idioma],
  );
  const h = useMemo(() => posicion(alturas, zRef, HABITAT.northKm, HABITAT.eastKm), [alturas, zRef]);
  const suyos = useMemo(
    () => propios.map((d) => ({ ...d, ...posicionCelda(alturas, zRef, d.celda) })),
    [propios, alturas, zRef],
  );
  const nuevo = useMemo(() => (puntoNuevo ? posicionCelda(alturas, zRef, puntoNuevo) : null), [puntoNuevo, alturas, zRef]);
  const pNuevo = puntoNuevo ? probCelda(puntoNuevo) : undefined;

  return (
    <group>
      {/* Hábitat */}
      <Line points={[[h.x, h.y, h.z], [h.x, h.y + POSTE, h.z]]} color="#ffffff" lineWidth={1.2} transparent opacity={0.85} />
      <Html position={[h.x, h.y + POSTE, h.z]} center zIndexRange={Z_ETIQUETAS} style={{ pointerEvents: "none" }}>
        <div className={`flex flex-col items-center ${SOMBRA}`} style={aparecer(visibles)}>
          <span data-rotulo={PRIORIDAD.habitat} className="mb-0.5 whitespace-nowrap text-[13px] font-medium text-white">
            {t.habitat}
          </span>
          <svg width="16" height="14" viewBox="0 0 16 14" aria-hidden className="[filter:drop-shadow(0_0_2px_rgba(6,10,23,1))]">
            <path d="M8 1 L15 13 L1 13 Z" fill="#ffffff" stroke="#060a17" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </div>
      </Html>

      {/* Puntos de referencia (Curiosity) */}
      {sitios.map((s) => {
        const p = probDe(s.id);
        const sel = seleccionado === s.id;
        return (
          <group key={s.id}>
            <Line points={[[s.x, s.y, s.z], [s.x, s.y + POSTE, s.z]]} color="#ffffff" lineWidth={1} transparent opacity={0.55} />
            {/* El punto queda justo sobre el poste; el texto, al lado que toque */}
            <Html position={[s.x, s.y + POSTE, s.z]} zIndexRange={Z_ETIQUETAS}>
              <button
                type="button"
                data-no-zoom
                onClick={(e) => {
                  e.stopPropagation();
                  onElegir(s.id);
                }}
                aria-label={`${t.referencia} ${s.nombre}: ${p !== undefined ? pct(p) : t.sinResultado}`}
                style={aparecer(visibles, compacto ? "translate(-50%, -50%)" : TRANSFORMA[LADO[s.id]])}
                className={`group flex items-center gap-1.5 whitespace-nowrap rounded-[3px] outline-none focus-visible:ring-1 focus-visible:ring-white/70 ${compacto ? "p-2.5" : `px-1.5 py-1 ${DISPOSICION[LADO[s.id]]}`} ${SOMBRA}`}
              >
                <span className={MARCA}>
                  <MarcaReferencia activo={sel} />
                </span>
                {/* En pantallas estrechas, solo el anillo: el nombre y la foto salen al tocarlo */}
                {!compacto && (
                  <span data-rotulo={sel ? PRIORIDAD.seleccion : PRIORIDAD.referencia} className={`flex items-baseline gap-1.5 ${TEXTO_ROTULO}`}>
                    <span className="text-[13px] text-[#d9dfee] group-hover:underline">{s.nombre}</span>
                    {p !== undefined && <span className={`${CIFRA} text-[12px] text-[#b9c6e6]`}>{pct(p)}</span>}
                  </span>
                )}
              </button>
            </Html>
          </group>
        );
      })}

      {/* Destinos de la misión: punto los propuestos (M1…), rombo los añadidos (P1…); ámbar si ≥ 50 % */}
      {suyos.map((s) => {
        const p = probCelda(s.celda);
        const alcance = p !== undefined && p >= 0.5;
        const sel = propioSel === s.id;
        return (
          <group key={s.id}>
            <Line
              points={[[s.x, s.y, s.z], [s.x, s.y + POSTE, s.z]]}
              color={alcance ? ESTILO.ambar : "#ffffff"}
              lineWidth={1.2}
              transparent
              opacity={0.8}
            />
            <Html position={[s.x, s.y + POSTE, s.z]} zIndexRange={Z_ETIQUETAS}>
              <button
                type="button"
                data-no-zoom
                onClick={(e) => {
                  e.stopPropagation();
                  onElegirPropio(s.id);
                }}
                aria-label={`${s.id} ${s.nombre}: ${p !== undefined ? pct(p) : t.sinResultado}`}
                style={aparecer(visibles, TRANSFORMA[ladoPropio(s.id, compacto)])}
                className={`group flex items-center gap-1.5 whitespace-nowrap rounded-[3px] px-1 py-1 outline-none focus-visible:ring-1 focus-visible:ring-white/70 ${DISPOSICION[ladoPropio(s.id, compacto)]} ${SOMBRA}`}
              >
                <span className={MARCA}>
                  {s.propuesto ? <Punto relleno={alcance ? "#ffcf70" : "#ffffff"} sel={sel} /> : <Rombo relleno={alcance ? "#ffcf70" : "#ffffff"} sel={sel} />}
                </span>
                <span
                  data-rotulo={sel ? PRIORIDAD.seleccion : alcance ? PRIORIDAD.destinoProbable : PRIORIDAD.destino}
                  className={`flex items-baseline gap-1.5 ${TEXTO_ROTULO}`}
                >
                  <span className={`${CIFRA} text-[11.5px] text-[#b9c6e6]`}>{s.id}</span>
                  {!compacto && <span className="max-w-[11rem] truncate text-[13.5px] text-white group-hover:underline">{s.nombre}</span>}
                  {p !== undefined && (
                    <span className={`${CIFRA} text-[12.5px] ${alcance ? "text-[#ffcf70]" : "text-[#b9c6e6]"}`}>{pct(p)}</span>
                  )}
                </span>
              </button>
            </Html>
          </group>
        );
      })}

      {/* Punto elegido para un destino nuevo, mientras se le pone nombre en el panel */}
      {nuevo && (
        <group>
          <Line
            points={[[nuevo.x, nuevo.y, nuevo.z], [nuevo.x, nuevo.y + POSTE, nuevo.z]]}
            color={ESTILO.ruta}
            lineWidth={1.5}
            dashed
            dashSize={8}
            gapSize={6}
            depthTest={false}
          />
          <Html position={[nuevo.x, nuevo.y + POSTE, nuevo.z]} zIndexRange={Z_ETIQUETAS} style={{ pointerEvents: "none" }}>
            <div
              style={aparecer(visibles, `translate(-${MEDIO_PUNTO - 4}px, -50%)`)}
              className={`flex items-center gap-1.5 whitespace-nowrap ${SOMBRA}`}
            >
              <Rombo relleno="#ff8fd8" sel={false} hueco />
              <span data-rotulo={PRIORIDAD.nuevo} className="leading-tight">
                <span className="flex items-baseline gap-1.5">
                  <span className="text-[13.5px] font-medium text-[#ff8fd8]">{t.destinoNuevo}</span>
                  {pNuevo !== undefined && <span className={`${CIFRA} text-[12.5px] text-white`}>{pct(pNuevo)}</span>}
                </span>
                <span className="block text-[11.5px] text-[#d9dfee]">{t.ponleNombre}</span>
              </span>
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}

/** Solo se vuelve a renderizar cuando cambian sus datos (no con la cámara ni con el panel). */
export default memo(Sitios3D);

/** Retícula rosa sobre el suelo en la celda seleccionada (se ve a través del relieve). */
export function Reticula3D({ x, y, z }: { x: number; y: number; z: number }) {
  const r = CELDA_KM * 1000 * 0.9;
  return (
    <group position={[x, y, z]}>
      <mesh rotation-x={-Math.PI / 2} position-y={2} renderOrder={10}>
        <ringGeometry args={[r * 0.82, r, 48]} />
        <meshBasicMaterial color={ESTILO.ruta} side={DoubleSide} depthTest={false} transparent opacity={0.95} toneMapped={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={2} renderOrder={10}>
        <circleGeometry args={[r * 0.18, 16]} />
        <meshBasicMaterial color={ESTILO.ruta} depthTest={false} transparent toneMapped={false} />
      </mesh>
      <Line points={[[0, 0, 0], [0, POSTE * 0.8, 0]]} color={ESTILO.ruta} lineWidth={1.5} depthTest={false} />
    </group>
  );
}
