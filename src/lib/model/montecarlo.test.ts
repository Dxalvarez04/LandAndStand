/**
 * Test suite para la Capa 6: Incertidumbre y agregación (Monte Carlo).
 * Valida los modos Tripulante, Pareja y Grupo (más de dos astronautas caminando juntos),
 * y cumplimiento del contrato Resultado ({ prob, destinos }).
 */
import { expect, test } from "vitest";
import type { Estado } from "@/lib/contract";
import { N } from "../constants";
import { HABITAT, kmACelda } from "../data/targets";
import { agregar, generarSorteos } from "./montecarlo";

export function ejecutarTestsMonteCarlo() {
  const resultados: { test: string; ok: boolean; detalle: string }[] = [];

  // DEM sintético plano
  const dem = new Float32Array(N * N);
  const sorteos = generarSorteos(30, 11);

  // TEST 1: Generación y rangos de sorteos deterministas
  const ok1 =
    sorteos.length === 30 &&
    sorteos.every(
      (p) =>
        p.vo2pre >= 25 &&
        p.vo2pre <= 60 &&
        p.masa >= 50 &&
        p.masa <= 100 &&
        p.delta >= 0.11 &&
        p.delta <= 0.25 &&
        p.fWalk >= 0.3 &&
        p.fWalk <= 0.4,
    );
  resultados.push({
    test: "1. Generación de sorteos epistémicos dentro de rangos válidos",
    ok: ok1,
    detalle: `Generados ${sorteos.length} sorteos conformes a las distribuciones de la sección 6`,
  });

  // TEST 2: Agregación en Modo Tripulante y respeto del contrato Resultado
  const estadoTripulante: Estado = {
    sol: 1,
    modo: "tripulante",
    tripulantes: [{ vo2pre: 40.6, masa: 75 }],
    fwalk: "U",
    energiaHoras: 6,
  };

  const resTripulante = agregar(estadoTripulante, { dem, sorteos }, () => {});

  const hCelda = kmACelda(HABITAT.northKm, HABITAT.eastKm);
  const hIdx = hCelda.fila * N + hCelda.columna;
  const probHabitat = resTripulante.prob[hIdx];

  const ok2 =
    resTripulante.prob.length === N * N &&
    probHabitat === 1.0 &&
    resTripulante.destinos.length === 6 &&
    resTripulante.prob.every((p) => p >= 0 && p <= 1);

  resultados.push({
    test: "2. Modo Tripulante: probabilidades en [0, 1], hábitat = 1.0 y 6 destinos",
    ok: ok2,
    detalle: `Malla 110x110 (${resTripulante.prob.length} celdas), Prob en hábitat: ${probHabitat.toFixed(2)}, Destinos: ${resTripulante.destinos.length}`,
  });

  // TEST 3: Modo Pareja (la pareja está limitada por el miembro más lento)
  const estadoPareja: Estado = {
    ...estadoTripulante,
    modo: "pareja",
    tripulantes: [
      { vo2pre: 40.6, masa: 75 }, // Astronauta 1 (medio)
      { vo2pre: 30.0, masa: 90 }, // Astronauta 2 (desentrenado)
    ],
  };

  const resPareja = agregar(estadoPareja, { dem, sorteos }, () => {});

  let sumaTripulante = 0;
  let sumaPareja = 0;
  let parejaLimitada = true;
  for (let c = 0; c < N * N; c++) {
    sumaTripulante += resTripulante.prob[c];
    sumaPareja += resPareja.prob[c];
    if (resPareja.prob[c] > resTripulante.prob[c] + 1e-6) {
      parejaLimitada = false;
      break;
    }
  }

  const ok3 = parejaLimitada && sumaPareja < sumaTripulante;
  resultados.push({
    test: "3. Modo Pareja: prob_pareja[c] <= prob_tripulante[c] en toda la malla",
    ok: ok3,
    detalle: `Área media alcanzable -> Tripulante: ${(sumaTripulante / (N * N) * 100).toFixed(1)}% | Pareja: ${(sumaPareja / (N * N) * 100).toFixed(1)}%`,
  });

  // TEST 4: Modo Grupo (3 o más astronautas caminando juntos)
  // Añadimos un 3er y 4to astronauta al grupo: uno muy fuerte (VO2=55) y uno aún más limitado (VO2=26, 98kg)
  const estadoGrupo: Estado = {
    ...estadoTripulante,
    modo: "grupo",
    tripulantes: [
      { vo2pre: 40.6, masa: 75 }, // A1
      { vo2pre: 30.0, masa: 90 }, // A2
      { vo2pre: 55.0, masa: 68 }, // A3 (atleta)
      { vo2pre: 26.0, masa: 98 }, // A4 (cuello de botella del grupo)
    ],
  };

  const resGrupo = agregar(estadoGrupo, { dem, sorteos }, () => {});

  let sumaGrupo = 0;
  let grupoLimitado = true;
  for (let c = 0; c < N * N; c++) {
    sumaGrupo += resGrupo.prob[c];
    // La alcanzabilidad del grupo no puede superar a la de la pareja original (A1+A2)
    if (resGrupo.prob[c] > resPareja.prob[c] + 1e-6) {
      grupoLimitado = false;
      break;
    }
  }

  const ok4 = grupoLimitado && sumaGrupo < sumaPareja;
  resultados.push({
    test: "4. Modo Grupo (>2 astronautas): el alcance conjunto disminuye al incorporar miembros más lentos",
    ok: ok4,
    detalle: `Área media -> Pareja (2 ast): ${(sumaPareja / (N * N) * 100).toFixed(1)}% | Grupo (4 ast con A4 lento): ${(sumaGrupo / (N * N) * 100).toFixed(1)}%`,
  });

  return resultados;
}

// Ejecución con vitest (npm test): cada comprobación de la lista es un caso

test.each(ejecutarTestsMonteCarlo())("$test", ({ ok, detalle }) => {
  expect(ok, detalle).toBe(true);
});
