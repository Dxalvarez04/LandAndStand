"use client";

/**
 * Ruta del modelo sobre el terreno 3D: ida continua y vuelta punteada, en rosa, pegadas al suelo.
 * Mismo camino que en el 2D (celdas de la capa 5), suavizado para que no se vea el zigzag de la malla.
 */
import { Line } from "@react-three/drei";
import { memo, useMemo } from "react";
import type { Ruta } from "@/lib/contract";
import { ESTILO } from "@/lib/mapa/estilo";
import { celdaAMundo, celdaDeIndice } from "@/lib/mapa/geo";
import { suavizar } from "@/lib/mapa/suavizar";
import { alturaEn, type Alturas } from "@/lib/mapa3d/alturas";
import { aEscena, deEscena, mundoAProyectadas } from "@/lib/mapa3d/coordenadas";

const SOBRE_SUELO = 7; // m, para que la línea no se hunda en el terreno
/**
 * La vuelta del modelo suele ser el mismo camino que la ida: cada una se dibuja desplazada a su
 * derecha (en el sentido de la marcha) para que se vean las dos, como dos carriles.
 */
const CARRIL_M = 9;

function puntos3D(indices: Int32Array, a: Alturas, zRef: number): [number, number, number][] {
  const mundo = suavizar(Array.from(indices, (i) => celdaAMundo(celdaDeIndice(i))));
  // Densificar: un punto cada ~8 m para que la línea siga el relieve entre celdas
  const densos: { x: number; y: number }[] = [];
  for (let i = 0; i + 1 < mundo.length; i++) {
    const p = mundo[i];
    const q = mundo[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(q.x - p.x, q.y - p.y) * 4));
    for (let k = 0; k < n; k++) densos.push({ x: p.x + ((q.x - p.x) * k) / n, y: p.y + ((q.y - p.y) * k) / n });
  }
  densos.push(mundo[mundo.length - 1]);
  const xz = densos.map((m) => {
    const { este, norte } = mundoAProyectadas(m);
    return aEscena(este, norte);
  });
  return xz.map((p, i) => {
    // Tangente media y normal a la derecha (en la escena: x = este, z = sur)
    const a0 = xz[Math.max(0, i - 3)];
    const a1 = xz[Math.min(xz.length - 1, i + 3)];
    const tx = a1.x - a0.x;
    const tz = a1.z - a0.z;
    const l = Math.hypot(tx, tz) || 1;
    const x = p.x - (tz / l) * CARRIL_M;
    const z = p.z + (tx / l) * CARRIL_M;
    const { este, norte } = deEscena(x, z);
    return [x, alturaEn(a, este, norte) - zRef + SOBRE_SUELO, z];
  });
}

function Ruta3D({ ruta, alturas, zRef }: { ruta: Ruta | null; alturas: Alturas; zRef: number }) {
  const ida = useMemo(() => (ruta && ruta.ida.length > 1 ? puntos3D(ruta.ida, alturas, zRef) : null), [ruta, alturas, zRef]);
  const vuelta = useMemo(
    () => (ruta && ruta.vuelta.length > 1 ? puntos3D(ruta.vuelta, alturas, zRef) : null),
    [ruta, alturas, zRef],
  );
  if (!ida) return null;
  return (
    // Todas transparentes para ordenarlas con renderOrder: halo debajo, línea rosa encima
    <group>
      <Line points={ida} color="#060a17" lineWidth={7} transparent opacity={0.5} depthWrite={false} renderOrder={5} />
      <Line points={ida} color={ESTILO.ruta} lineWidth={3} transparent toneMapped={false} renderOrder={6} />
      {vuelta && (
        <>
          <Line points={vuelta} color="#060a17" lineWidth={5.5} transparent opacity={0.45} depthWrite={false} renderOrder={5} />
          <Line
            points={vuelta}
            color={ESTILO.ruta}
            lineWidth={2.4}
            dashed
            dashSize={14}
            gapSize={16}
            transparent
            toneMapped={false}
            renderOrder={6}
          />
        </>
      )}
    </group>
  );
}

export default memo(Ruta3D);
