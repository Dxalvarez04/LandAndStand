/**
 * Contornos del 50 % y del 90 % con marching squares (d3-contour) sobre los centros de celda.
 *
 * d3-contour coloca el valor de índice i en la coordenada i + 0,5, que es justo el centro
 * de celda en coordenadas de mundo. Le pasamos la malla ya invertida (norte arriba), así
 * que sus coordenadas son directamente de mundo.
 *
 * La malla se rellena por fuera con RELLENO celdas que repiten el borde: las líneas que tocan
 * el borde de la ventana se cierran fuera de la vista y no se dibuja un trazo a lo largo del marco.
 */
import { contours } from "d3-contour";
import { N } from "@/lib/constants";
import type { Punto } from "./geo";

export const UMBRALES = [0.5, 0.9] as const;
const RELLENO = 2;

export interface Contorno {
  umbral: number;
  /** Atributo `d` de SVG en coordenadas de mundo */
  d: string;
  /** Las mismas líneas como tramos de puntos en coordenadas de mundo, recortados a la ventana */
  tramos: Punto[][];
  /** Dónde poner la etiqueta («90 %»), en coordenadas de mundo; null si no hay línea visible */
  etiqueta: Punto | null;
  /** Radio aproximado del anillo de la etiqueta, en celdas (para no rotular anillos diminutos) */
  radio: number;
}

const M = N + 2 * RELLENO;
const generador = contours().size([M, M]).thresholds(UMBRALES as unknown as number[]);
const valores = new Float64Array(M * M);

/** prob: malla del contrato (fila 0 = sur). */
export function calcularContornos(prob: Float32Array): Contorno[] {
  for (let y = 0; y < M; y++) {
    const filaPantalla = Math.max(0, Math.min(N - 1, y - RELLENO));
    const fila = N - 1 - filaPantalla;
    for (let x = 0; x < M; x++) {
      const col = Math.max(0, Math.min(N - 1, x - RELLENO));
      valores[y * M + x] = prob[fila * N + col];
    }
  }

  return generador(valores as unknown as number[]).map((mp) => {
    let d = "";
    const tramos: Punto[][] = [];
    let etiqueta: Punto | null = null;
    let mejorArea = 0;
    let radio = 0;
    for (const poligono of mp.coordinates) {
      for (const anillo of poligono) {
        d += "M" + anillo.map(([x, y]) => `${(x - RELLENO).toFixed(2)},${(y - RELLENO).toFixed(2)}`).join("L") + "Z";
        recortar(anillo, tramos);
      }
      // La etiqueta va en el anillo exterior más grande, en su punto visible más al noreste
      // (arriba del hábitat ya está su propia etiqueta).
      const exterior = poligono[0];
      const area = Math.abs(areaAnillo(exterior));
      if (area > mejorArea) {
        const p = puntoEtiqueta(exterior);
        if (p) {
          mejorArea = area;
          etiqueta = p;
          radio = Math.sqrt(area / Math.PI);
        }
      }
    }
    return { umbral: mp.value, d, tramos, etiqueta, radio };
  });
}

/**
 * Parte un anillo (cerrado, con el relleno) en los tramos que caen dentro de la ventana [0, N]²,
 * en coordenadas de mundo. Donde el anillo sale o entra se añade el punto exacto del borde.
 */
function recortar(anillo: number[][], tramos: Punto[][]) {
  const dentro = (q: Punto) => q.x >= 0 && q.x <= N && q.y >= 0 && q.y <= N;
  const pts: Punto[] = anillo.map(([x, y]) => ({ x: x - RELLENO, y: y - RELLENO }));
  // d3 repite el primer punto al final
  if (pts.length > 1 && pts[0].x === pts[pts.length - 1].x && pts[0].y === pts[pts.length - 1].y) pts.pop();
  const n = pts.length;
  if (n < 2) return;
  const fuera = pts.findIndex((q) => !dentro(q));
  if (fuera < 0) {
    tramos.push([...pts, pts[0]]);
    return;
  }
  /** Punto del segmento a→b sobre el borde de la ventana (a dentro, b fuera, o al revés). */
  const corte = (a: Punto, b: Punto): Punto => {
    let t = 1;
    for (const [pa, pb] of [[a.x, b.x], [a.y, b.y]] as const) {
      if (pb < 0 && pa >= 0) t = Math.min(t, pa / (pa - pb));
      if (pb > N && pa <= N) t = Math.min(t, (N - pa) / (pb - pa));
      if (pa < 0 && pb >= 0) t = Math.min(t, 1 - pb / (pb - pa));
      if (pa > N && pb <= N) t = Math.min(t, 1 - (N - pb) / (pa - pb));
    }
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  };
  let actual: Punto[] | null = null;
  // Se empieza en un punto de fuera: ningún tramo queda partido entre el final y el principio
  for (let k = 1; k <= n; k++) {
    const ant = pts[(fuera + k - 1) % n];
    const q = pts[(fuera + k) % n];
    const dAnt = dentro(ant);
    const dQ = dentro(q);
    if (dQ) {
      if (!actual) actual = dAnt ? [ant] : [corte(q, ant)];
      actual.push(q);
    } else if (actual) {
      actual.push(corte(ant, q));
      if (actual.length > 1) tramos.push(actual);
      actual = null;
    }
  }
}

function areaAnillo(a: number[][]): number {
  let s = 0;
  for (let i = 0, j = a.length - 1; i < a.length; j = i++) s += (a[j][0] + a[i][0]) * (a[j][1] - a[i][1]);
  return s / 2;
}

/** Punto más al noreste del anillo que quede bien dentro de la ventana (para que la etiqueta se vea). */
function puntoEtiqueta(anillo: number[][]): Punto | null {
  const margen = 4;
  let mejor: Punto | null = null;
  for (const [xr, yr] of anillo) {
    const x = xr - RELLENO;
    const y = yr - RELLENO;
    if (x < margen || x > N - margen || y < margen || y > N - margen) continue;
    if (!mejor || x - y > mejor.x - mejor.y) mejor = { x, y };
  }
  return mejor;
}
