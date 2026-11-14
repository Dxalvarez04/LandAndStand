/**
 * CAPA 6 · Incertidumbre y agregación (sección 6).
 * Población, tripulante y pareja con NÚMEROS ALEATORIOS COMUNES
 * (el sorteo i es el mismo en todos los soles, modos y tripulantes).
 * Para validar (paso 2) cargar `public/data/draws_seed11_300.json`.
 */
import type { Estado, Resultado } from "@/lib/contract";
import { CENTRALES, N } from "@/lib/constants";
import { DESTINOS, HABITAT, kmACelda } from "@/lib/data/targets";
import { alcanzable } from "./alcanzabilidad";
import { construirGeometria, type Geometria } from "./grafo";
import type { Parametros } from "./tipos";

export interface Datos {
  dem: Float32Array;
  sorteos: Parametros[];
  geometria?: Geometria;
}

/**
 * Generador pseudo-aleatorio determinista Mulberry32 para Números Aleatorios Comunes (CRN).
 */
function crearRNG(semilla: number) {
  let s = semilla >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Genera sorteos epistémicos y de población siguiendo las distribuciones de la sección 6.
 * Se utiliza como respaldo cuando aún no se ha cargado el archivo draws_seed11_300.json de Katrina.
 */
export function generarSorteos(n: number = 300, semilla: number = 11): Parametros[] {
  const rand = crearRNG(semilla);

  const u = (min: number, max: number) => min + rand() * (max - min);

  // Normal estándar vía Box-Muller
  const gaussian = (media: number, std: number, minVal: number, maxVal: number) => {
    let u1 = rand();
    const u2 = rand();
    while (u1 === 0) u1 = rand();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    const val = media + z0 * std;
    return Math.max(minVal, Math.min(maxVal, val));
  };

  const lista: Parametros[] = [];
  for (let i = 0; i < n; i++) {
    // Parámetros epistémicos
    const delta = u(0.11, 0.25);
    // tauA correlacionada negativamente con delta (r = -0.55)
    const tauA = Math.max(2, Math.min(40, 20 - delta * 30 + (rand() - 0.5) * 10));
    const tauB = u(0.35, 4.4);
    const fWalk = u(0.3, 0.4);
    const thLim = u(20, 30);
    const dTh = u(5, 10);
    const vFlat = u(0.8, 1.2);
    const ref2 = u(28, 30);
    const rest2 = u(4, 6);
    const vRef = u(0.5, 1.0);

    // Variabilidad de astronauta (para modo población)
    const vo2pre = gaussian(40.6, 6.4, 25, 60);
    const masa = gaussian(75, 10, 50, 100);

    lista.push({
      vo2pre,
      masa,
      delta,
      tauA,
      tauB,
      fWalk,
      thLim,
      dTh,
      vFlat,
      ref2,
      rest2,
      vRef,
    });
  }

  return lista;
}

/** Sorteos a evaluar (si datos.sorteos viene vacío, los 300 estándar). */
export function sorteosDe(datos: Datos): Parametros[] {
  if (!datos.sorteos || datos.sorteos.length === 0) datos.sorteos = generarSorteos(300, 11);
  return datos.sorteos;
}

/** Tramo [desde, hasta) de sorteos que le toca a la parte `parte` de `partes` (reparto entre workers). */
export function tramo(total: number, parte: number, partes: number): [number, number] {
  return [Math.floor((parte * total) / partes), Math.floor(((parte + 1) * total) / partes)];
}

/**
 * Suma a `conteo` las celdas alcanzables en el sorteo i (1 = alcanzable). Es el cuerpo del Monte
 * Carlo: el cálculo completo es sumar todos los sorteos y dividir por su número (combinar).
 * Así se puede repartir entre varios workers e interrumpir entre sorteos.
 */
export function sumarSorteo(estado: Estado, datos: Datos, i: number, conteo: Int32Array): void {
  const numNodos = N * N;

  // Reutilizar o construir la geometría del grafo
  if (!datos.geometria) {
    datos.geometria = construirGeometria(datos.dem);
  }
  const geo = datos.geometria;

  // Celda del hábitat (fila 84, col 42 por defecto)
  const hCelda = kmACelda(HABITAT.northKm, HABITAT.eastKm);
  const habitatIdx = hCelda.fila * N + hCelda.columna;

  const sBase = sorteosDe(datos)[i];

  // Parámetros de astronautas según modo
  const tA = estado.tripulantes && estado.tripulantes.length > 0
    ? estado.tripulantes[0]
    : { vo2pre: CENTRALES.vo2pre, masa: CENTRALES.masa };

  const tB = estado.tripulantes && estado.tripulantes.length > 1
    ? estado.tripulantes[1]
    : { vo2pre: CENTRALES.vo2pre, masa: CENTRALES.masa };

  // Escenario de intensidad de marcha: si no es "U", anula el sorteo epistémico
  const fWalkActual = estado.fwalk === "U" ? sBase.fWalk : estado.fwalk;

  if (estado.modo === "tripulante") {
    // MODO TRIPULANTE (1 astronauta): características físicas fijas del tripulante elegido
    const p: Parametros = {
      ...sBase,
      vo2pre: tA.vo2pre,
      masa: tA.masa,
      fWalk: fWalkActual,
    };

    const masc = alcanzable(geo, habitatIdx, estado.sol, p, estado.energiaHoras).mascara;
    for (let c = 0; c < numNodos; c++) {
      conteo[c] += masc[c];
    }
  } else if (estado.modo === "pareja") {
    // MODO PAREJA (2 astronautas): ambos comparten el mismo sorteo epistémico de traje y terreno
    const pA: Parametros = { ...sBase, vo2pre: tA.vo2pre, masa: tA.masa, fWalk: fWalkActual };
    const pB: Parametros = { ...sBase, vo2pre: tB.vo2pre, masa: tB.masa, fWalk: fWalkActual };

    const mascA = alcanzable(geo, habitatIdx, estado.sol, pA, estado.energiaHoras).mascara;
    const mascB = alcanzable(geo, habitatIdx, estado.sol, pB, estado.energiaHoras).mascara;

    // Una celda es alcanzable para la pareja ssi AMBOS pueden ir y volver
    for (let c = 0; c < numNodos; c++) {
      conteo[c] += mascA[c] & mascB[c];
    }
  } else if (estado.modo === "grupo") {
    // MODO GRUPO (3 o más astronautas caminando juntos):
    // Todo el grupo permanece unido: una celda solo es alcanzable si TODOS y cada uno
    // de los miembros del grupo pueden ir hasta allí, realizar la tarea y volver.
    const miembros = estado.tripulantes && estado.tripulantes.length > 0
      ? estado.tripulantes
      : [tA, tB];

    let mascaraGrupo: Uint8Array | null = null;

    for (let j = 0; j < miembros.length; j++) {
      const miembro = miembros[j];
      const pJ: Parametros = { ...sBase, vo2pre: miembro.vo2pre, masa: miembro.masa, fWalk: fWalkActual };
      const mascJ = alcanzable(geo, habitatIdx, estado.sol, pJ, estado.energiaHoras).mascara;

      if (mascaraGrupo === null) {
        mascaraGrupo = mascJ; // alcanzable() devuelve una máscara nueva en cada llamada
      } else {
        for (let c = 0; c < numNodos; c++) {
          mascaraGrupo[c] &= mascJ[c];
        }
      }
    }

    if (mascaraGrupo) {
      for (let c = 0; c < numNodos; c++) {
        conteo[c] += mascaraGrupo[c];
      }
    }
  }
}

/** Conteos de los `total` sorteos → matriz de probabilidad y probabilidad de T1–T6. */
export function combinar(conteo: Int32Array, total: number): Resultado {
  const numNodos = N * N;
  const prob = new Float32Array(numNodos);
  const invN = 1 / total;
  for (let c = 0; c < numNodos; c++) {
    prob[c] = conteo[c] * invN;
  }

  const destinos = DESTINOS.map((d) => {
    const { fila, columna } = kmACelda(d.northKm, d.eastKm);
    return { id: d.id, p: prob[fila * N + columna] };
  });

  return { prob, destinos };
}

/**
 * CAPA 6: Agregación de Monte Carlo para Población, Tripulante y Pareja.
 *
 * @param estado Estado de la simulación (sol, modo, tripulantes, fwalk, energiaHoras).
 * @param datos Modelo de elevaciones DEM y array de sorteos.
 * @param onProgreso Callback de notificación de avance (0 a 1).
 * @returns Resultado con matriz de probabilidades prob y destinos T1-T6.
 */
export function agregar(
  estado: Estado,
  datos: Datos,
  onProgreso: (fraccion: number) => void,
): Resultado {
  const nTotal = sorteosDe(datos).length;
  const conteo = new Int32Array(N * N);
  for (let i = 0; i < nTotal; i++) {
    sumarSorteo(estado, datos, i, conteo);
    // Notificar progreso periódicamente para no saturar postMessage
    if ((i + 1) % 15 === 0 || i === nTotal - 1) {
      onProgreso((i + 1) / nTotal);
    }
  }
  return combinar(conteo, nTotal);
}
