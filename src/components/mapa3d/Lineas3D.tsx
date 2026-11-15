"use client";

/**
 * Líneas de la zona de estudio sobre el terreno 3D, como en el mapa 2D: contornos del 50 % (punteado
 * claro) y del 90 % (ámbar) con su rótulo, borde de la zona y regla en km en los bordes sur y oeste.
 *
 * Son líneas de grosor constante en pantalla, apoyadas en el relieve: se ven igual de nítidas desde
 * lejos que a ras de suelo (pintadas en la textura del terreno se volvían franjas borrosas al
 * acercarse, y sus rótulos se leían al revés desde el norte).
 */
import { Html, Line } from "@react-three/drei";
import { memo, useMemo } from "react";
import { CELDA_M, N } from "@/lib/constants";
import type { Contorno } from "@/lib/mapa/contornos";
import { ESTILO } from "@/lib/mapa/estilo";
import type { Punto } from "@/lib/mapa/geo";
import { alturaEn, type Alturas } from "@/lib/mapa3d/alturas";
import { aEscena, mundoAProyectadas } from "@/lib/mapa3d/coordenadas";
import { CIFRA } from "@/components/mapa/fuente";

type P3 = [number, number, number];

const SOBRE_SUELO = 5; // m, para que la línea no se hunda en el terreno
const COLOR: Record<number, string> = { 0.5: ESTILO.contorno50, 0.9: ESTILO.ambar };
const HALO = "#040814";
const SOMBRA = "[text-shadow:0_0_3px_rgba(6,10,23,1),0_0_7px_rgba(6,10,23,0.95)]";
const Z_ROTULOS: [number, number] = [9, 5]; // por debajo de las etiquetas de los sitios
/** Si se pisan con otro rótulo, ceden (ver lib/mapa3d/rotulos.ts): los sitios mandan */
const PRIORIDAD = { contorno: 10, regla: 5 };

/** Tramo en coordenadas de mundo → puntos sobre el relieve, uno cada media celda como mucho. */
function apoyar(tramo: Punto[], a: Alturas, zRef: number, sobre = SOBRE_SUELO): P3[] {
  const out: P3[] = [];
  const poner = (m: Punto) => {
    const { este, norte } = mundoAProyectadas(m);
    const { x, z } = aEscena(este, norte);
    out.push([x, alturaEn(a, este, norte) - zRef + sobre, z]);
  };
  for (let i = 0; i + 1 < tramo.length; i++) {
    const p = tramo[i];
    const q = tramo[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(q.x - p.x, q.y - p.y) * 2));
    for (let k = 0; k < n; k++) poner({ x: p.x + ((q.x - p.x) * k) / n, y: p.y + ((q.y - p.y) * k) / n });
  }
  if (tramo.length) poner(tramo[tramo.length - 1]);
  return out;
}

const MARCO: Punto[] = [
  { x: 0, y: 0 },
  { x: N, y: 0 },
  { x: N, y: N },
  { x: 0, y: N },
  { x: 0, y: 0 },
];
const PASO_REGLA = 500 / CELDA_M; // celdas

interface Props {
  contornos: Contorno[];
  alturas: Alturas;
  zRef: number;
  /** Se muestran los rótulos (porcentajes y km); de lejos o durante la llegada, no */
  rotulos: boolean;
  /** De muy lejos solo queda el borde de la zona: los contornos y la regla serían un borrón */
  soloBorde: boolean;
  /** Texto del rótulo de cada contorno, ya en el idioma de la interfaz */
  textos: Record<number, string>;
}

function Lineas3D({ contornos, alturas, zRef, rotulos, soloBorde, textos }: Props) {
  // Lo fijo: borde de la zona y marcas de la regla (cada 500 m; más largas las de cada km)
  const fijo = useMemo(() => {
    const marcas: P3[] = [];
    const km: { pos: P3; texto: string; lado: "sur" | "oeste" }[] = [];
    for (let k = 1; k * PASO_REGLA < N; k++) {
      const d = k * PASO_REGLA;
      const largo = k % 2 === 0 ? 3.4 : 1.8; // celdas
      const sur = apoyar([{ x: d, y: N }, { x: d, y: N - largo }], alturas, zRef);
      const oeste = apoyar([{ x: 0, y: N - d }, { x: largo, y: N - d }], alturas, zRef);
      for (const t of [sur, oeste]) for (let i = 0; i + 1 < t.length; i++) marcas.push(t[i], t[i + 1]);
      if (k % 2 === 0) {
        km.push({ pos: sur[sur.length - 1], texto: `${k / 2} km`, lado: "sur" });
        km.push({ pos: oeste[oeste.length - 1], texto: `${k / 2} km`, lado: "oeste" });
      }
    }
    return { marco: apoyar(MARCO, alturas, zRef), marcas, km };
  }, [alturas, zRef]);

  const lineas = useMemo(
    () =>
      contornos.map((c) => ({
        umbral: c.umbral,
        tramos: c.tramos.filter((t) => t.length > 1).map((t) => apoyar(t, alturas, zRef)),
        rotulo: c.etiqueta && c.radio >= 4 ? apoyar([c.etiqueta], alturas, zRef, 12)[0] : null,
      })),
    [contornos, alturas, zRef],
  );

  const visible: React.CSSProperties = { opacity: rotulos ? 1 : 0, transition: "opacity 400ms ease-out" };

  return (
    <group>
      <Line points={fijo.marco} color="#eaf0ff" lineWidth={1.3} transparent opacity={0.8} toneMapped={false} renderOrder={3} />
      <Line points={fijo.marcas} segments color="#eaf0ff" lineWidth={1.3} transparent opacity={0.85} toneMapped={false} renderOrder={3} visible={!soloBorde} />
      {fijo.km.map((m) => (
        <Html key={`${m.lado}${m.texto}`} position={m.pos} zIndexRange={Z_ROTULOS} style={{ pointerEvents: "none" }}>
          <span style={{ ...visible, display: "block", transform: m.lado === "sur" ? "translate(-50%, -135%)" : "translate(6px, -50%)" }}>
            <span data-rotulo={PRIORIDAD.regla} className={`${CIFRA} block whitespace-nowrap text-[11px] text-[#d9dfee] transition-opacity duration-200 ${SOMBRA}`}>
              {m.texto}
            </span>
          </span>
        </Html>
      ))}

      {lineas.map((c) => (
        <group key={c.umbral} visible={!soloBorde}>
          {c.tramos.map((pts, i) => (
            <group key={i}>
              {/* Transparentes para ordenarlas con renderOrder: halo debajo, línea encima */}
              <Line points={pts} color={HALO} lineWidth={c.umbral === 0.9 ? 5 : 4} transparent opacity={c.umbral === 0.9 ? 0.5 : 0.32} depthWrite={false} renderOrder={3} />
              <Line
                points={pts}
                color={COLOR[c.umbral]}
                lineWidth={c.umbral === 0.9 ? 2.3 : 1.8}
                dashed={c.umbral === 0.5}
                dashSize={52}
                gapSize={40}
                transparent
                toneMapped={false}
                renderOrder={4}
              />
            </group>
          ))}
          {c.rotulo && (
            <Html position={c.rotulo} zIndexRange={Z_ROTULOS} style={{ pointerEvents: "none" }}>
              <span style={{ ...visible, display: "block", transform: "translate(6px, -120%)" }}>
                <span
                  data-rotulo={PRIORIDAD.contorno}
                  className={`block whitespace-nowrap text-[12px] font-medium transition-opacity duration-200 ${SOMBRA}`}
                  style={{ color: COLOR[c.umbral] }}
                >
                  {textos[c.umbral]}
                </span>
              </span>
            </Html>
          )}
        </group>
      ))}
    </group>
  );
}

export default memo(Lineas3D);
