/**
 * Test suite para la Capa 5: Alcanzabilidad (Dijkstra bidireccional y presupuestos).
 * Valida máscara de alcanzabilidad, radio cardinal, caminos de ida/vuelta y escenario Apolo.
 */
import { N, CENTRALES } from "../constants";
import { construirGeometria } from "./grafo";
import { alcanzable } from "./alcanzabilidad";

export function ejecutarTestsAlcanzabilidad() {
  const resultados: { test: string; ok: boolean; detalle: string }[] = [];

  // DEM plano sintético de 110x110
  const demPlano = new Float32Array(N * N);
  const geo = construirGeometria(demPlano);
  const habitatCentro = 55 * N + 55; // (55, 55)

  // TEST 1: El hábitat siempre debe ser alcanzable
  const alcSol1 = alcanzable(geo, habitatCentro, 1, CENTRALES, 6);
  const ok1 = alcSol1.mascara[habitatCentro] === 1;
  resultados.push({
    test: "1. Auto-alcanzabilidad del hábitat (mascara[H] === 1)",
    ok: ok1,
    detalle: `Hábitat (55, 55) alcanzable: ${ok1 ? "SÍ" : "NO"}`,
  });

  // TEST 2: Radio cardinal en llano concordante con la teoría (≈ 53 celdas = 1696 m)
  let maxCeldasEste = 0;
  for (let c = 55; c < N; c++) {
    const idx = 55 * N + c;
    if (alcSol1.mascara[idx] === 1) {
      maxCeldasEste = c - 55;
    }
  }
  const distMetros = maxCeldasEste * 32;
  // Teórico: 1713.2 m -> 53 celdas (1696 m) < 1713 m < 54 celdas (1728 m)
  const ok2 = maxCeldasEste === 53;
  resultados.push({
    test: "2. Alcance cardinal en llano vs radio teórico (1713 m)",
    ok: ok2,
    detalle: `Celdas hacia el este: ${maxCeldasEste} (${distMetros} m) | Esperado: 53 celdas (1696 m)`,
  });

  // TEST 3: Trazabilidad y consistencia de los caminos predIda y predVuelta
  // Tomamos una celda alcanzable a 20 celdas de distancia: (55, 75)
  const destinoTest = 55 * N + 75;
  let curr = destinoTest;
  let pasosVuelta = 0;
  let llegoAHabitat = false;
  while (curr !== -1 && pasosVuelta < 100) {
    if (curr === habitatCentro) {
      llegoAHabitat = true;
      break;
    }
    curr = alcSol1.predVuelta[curr];
    pasosVuelta++;
  }
  const ok3 = llegoAHabitat && pasosVuelta === 20;
  resultados.push({
    test: "3. Trazabilidad del camino de retorno a través de predVuelta",
    ok: ok3,
    detalle: `Ruta desde (55, 75) llega a H en ${pasosVuelta} pasos (esperado: 20 pasos): ${llegoAHabitat ? "ÉXITO" : "FALLO"}`,
  });

  // TEST 4: Reducción del radio con el escenario de energía Apolo (4 h)
  const alcApolo = alcanzable(geo, habitatCentro, 1, CENTRALES, 4);
  let maxCeldasApolo = 0;
  for (let c = 55; c < N; c++) {
    const idx = 55 * N + c;
    if (alcApolo.mascara[idx] === 1) {
      maxCeldasApolo = c - 55;
    }
  }
  const distApolo = maxCeldasApolo * 32;
  // Teórico Apolo: 1281 m -> 40 celdas (1280 m)
  const ok4 = maxCeldasApolo === 40;
  resultados.push({
    test: "4. Escenario Apolo (4 h): reducción del alcance a ~1280 m",
    ok: ok4,
    detalle: `Alcance 4h: ${maxCeldasApolo} celdas (${distApolo} m) | Reducción de 53 a 40 celdas`,
  });

  // TEST 5: Monotonía espacial y área de alcanzabilidad
  let total6h = 0;
  let total4h = 0;
  for (let i = 0; i < N * N; i++) {
    if (alcSol1.mascara[i] === 1) total6h++;
    if (alcApolo.mascara[i] === 1) total4h++;
  }
  const ok5 = total6h > total4h && total4h > 0;
  resultados.push({
    test: "5. Área de alcance comparativa (Caso Base 6h > Escenario 4h)",
    ok: ok5,
    detalle: `Celdas alcanzables 6h: ${total6h} (~${((total6h * 32 * 32) / 1e6).toFixed(2)} km²) | 4h: ${total4h} (~${((total4h * 32 * 32) / 1e6).toFixed(2)} km²)`,
  });

  return resultados;
}
