/**
 * Test suite para la Capa 4: Grafo del terreno (8 vecinos y formato CSR).
 * Valida topología, reciprocidad de aristas, cálculo de pendiente y factibilidad.
 */
import { N } from "../constants";
import { CENTRALES } from "../constants";
import { construirGeometria, evaluarAristas } from "./grafo";

export function ejecutarTestsGrafo() {
  const resultados: { test: string; ok: boolean; detalle: string }[] = [];

  // DEM plano sintético de 110x110 (12100 celdas)
  const demPlano = new Float32Array(N * N);
  const geo = construirGeometria(demPlano);

  // TEST 1: Dimensiones de nodos y aristas totales
  const numNodos = N * N;
  const numAristas = geo.destino.length;
  const ok1 = geo.offsets.length === numNodos + 1 && numAristas === 95484;
  resultados.push({
    test: "1. Dimensiones del grafo CSR (12 100 nodos y 95 484 aristas)",
    ok: ok1,
    detalle: `Nodos: ${numNodos}, Aristas: ${numAristas} (esperado exacto: 95 484)`,
  });

  // TEST 2: Grados de conectividad (Esquinas=3, Bordes=5, Interiores=8)
  const gradoEsquina = geo.offsets[1] - geo.offsets[0]; // celda (0,0)
  const gradoBorde = geo.offsets[51] - geo.offsets[50]; // celda (0,50)
  const uInterior = 50 * N + 50;
  const gradoInterior = geo.offsets[uInterior + 1] - geo.offsets[uInterior]; // celda (50,50)
  const ok2 = gradoEsquina === 3 && gradoBorde === 5 && gradoInterior === 8;
  resultados.push({
    test: "2. Grado de conectividad topológica (Esquina = 3, Borde = 5, Interior = 8)",
    ok: ok2,
    detalle: `Esquina: ${gradoEsquina}, Borde: ${gradoBorde}, Interior: ${gradoInterior}`,
  });

  // TEST 3: Reciprocidad exacta del grafo inverso (revEdge)
  // Para cada arista k, revEdge[revEdge[k]] debe ser k
  let reciprocidadOk = true;
  for (let k = 0; k < numAristas; k++) {
    const revK = geo.revEdge[k];
    if (revK < 0 || revK >= numAristas || geo.revEdge[revK] !== k) {
      reciprocidadOk = false;
      break;
    }
  }
  resultados.push({
    test: "3. Reciprocidad de aristas inversas revEdge[revEdge[k]] === k",
    ok: reciprocidadOk,
    detalle: `Comprobadas 95 484 aristas: ${reciprocidadOk ? "100% RECÍPROCAS" : "FALLO"}`,
  });

  // TEST 4: Geometría en terreno plano
  // En terreno plano todas las pendientes G = 0, theta = 0, ratio = 1.0
  let planoOk = true;
  for (let k = 0; k < numAristas; k++) {
    if (geo.G[k] !== 0 || geo.theta[k] !== 0 || geo.ratio[k] !== 1.0) {
      planoOk = false;
      break;
    }
  }
  resultados.push({
    test: "4. Geometría en terreno plano (G = 0%, theta = 0°, ratio = 1.0)",
    ok: planoOk,
    detalle: `Todas las aristas en plano tienen G = 0 y ratio = 1.0: ${planoOk ? "SÍ" : "NO"}`,
  });

  // TEST 5: Evaluación de costes en terreno plano (Sol 1)
  const costes = evaluarAristas(geo, 1, CENTRALES);
  // Todas las aristas deben ser factibles y con tiempo/energía válidos
  let factiblesCount = 0;
  for (let k = 0; k < numAristas; k++) {
    if (costes.factible[k] === 1) factiblesCount++;
  }
  const ok5 = factiblesCount === numAristas;
  resultados.push({
    test: "5. Factibilidad en terreno plano (100% de aristas transitables)",
    ok: ok5,
    detalle: `${factiblesCount} de ${numAristas} aristas factibles`,
  });

  // TEST 6: Detección de acantilado no transitable (|G| > 45% o theta > thetaMax)
  // Creamos un DEM con una falla brusca de 50 metros entre la celda (10,10) y (10,11)
  const demFalla = new Float32Array(N * N);
  demFalla[10 * N + 11] = 50.0; // 50m en 32m -> pendiente > 150%
  const geoFalla = construirGeometria(demFalla);
  const costesFalla = evaluarAristas(geoFalla, 1, CENTRALES);

  // Buscar la arista de (10,10) a (10,11)
  const u10 = 10 * N + 10;
  const v11 = 10 * N + 11;
  let aristaFallaIdx = -1;
  for (let k = geoFalla.offsets[u10]; k < geoFalla.offsets[u10 + 1]; k++) {
    if (geoFalla.destino[k] === v11) {
      aristaFallaIdx = k;
      break;
    }
  }

  const ok6 =
    aristaFallaIdx !== -1 &&
    costesFalla.factible[aristaFallaIdx] === 0 &&
    costesFalla.energia[aristaFallaIdx] === Infinity;
  resultados.push({
    test: "6. Detección y bloqueo de acantilados (|G| > 45% bloquea arista con Infinity)",
    ok: ok6,
    detalle: `Arista de falla: G = ${geoFalla.G[aristaFallaIdx].toFixed(1)}%, Factible = ${costesFalla.factible[aristaFallaIdx]} (Energía = ${costesFalla.energia[aristaFallaIdx]})`,
  });

  return resultados;
}
