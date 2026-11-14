/**
 * Test suite para la Capa 3: Marcha con traje (modelo M2).
 * Valida ratio, tobler, marcha y radioLlano según el protocolo de validación y el informe técnico.
 */
import { expect, test } from "vitest";
import { ratio, marcha, radioLlano } from "./marcha";
import { CENTRALES } from "../constants";

export function ejecutarTestsMarcha() {
  const resultados: { test: string; ok: boolean; detalle: string }[] = [];

  // TEST 1: Ratio Minetti en llano (G = 0)
  const r0 = ratio(0);
  const ok1 = Math.abs(r0 - 1.0) < 1e-5;
  resultados.push({
    test: "1. Ratio de coste Minetti en llano (G = 0)",
    ok: ok1,
    detalle: `ratio(0) = ${r0.toFixed(4)} (esperado: 1.0000)`,
  });

  // TEST 2: Velocidad sostenible en llano, Sol 1 (Protocolo Paso 1)
  const sol1 = marcha(0, 1, CENTRALES);
  const ok2 = Math.abs(sol1.V - 0.2213) < 0.01;
  resultados.push({
    test: "2. Velocidad sostenible en llano, Sol 1 (≈ 0.22 m/s)",
    ok: ok2,
    detalle: `V = ${sol1.V.toFixed(4)} m/s, P = ${sol1.P.toFixed(2)} W (esperado V ≈ 0.22 m/s)`,
  });

  // TEST 3: Tope de bajada al -20% (Protocolo Paso 1)
  // Nadie baja más deprisa que en llano para evitar caídas
  const bajada20 = marcha(-20, 1, CENTRALES);
  const ok3 = Math.abs(bajada20.V - sol1.V) < 1e-5;
  resultados.push({
    test: "3. Tope de bajada al -20% de pendiente",
    ok: ok3,
    detalle: `V(-20%) = ${bajada20.V.toFixed(4)} m/s == V(0%) = ${sol1.V.toFixed(4)} m/s`,
  });

  // TEST 4: Radio en llano, Sol 1 (Protocolo Paso 1: ≈ 1.7 km)
  const rSol1 = radioLlano(1, CENTRALES);
  const ok4 = Math.abs(rSol1 - 1713.2) < 20; // ≈ 1.71 km
  resultados.push({
    test: "4. Radio en llano, Sol 1 (≈ 1.7 km)",
    ok: ok4,
    detalle: `Radio = ${(rSol1 / 1000).toFixed(3)} km (esperado ≈ 1.7 km)`,
  });

  // TEST 5: Evolución a Sol 30 (V ≈ 0.28 m/s, Radio ≈ 2.2 km)
  const sol30 = marcha(0, 30, CENTRALES);
  const rSol30 = radioLlano(30, CENTRALES);
  const ok5 = Math.abs(sol30.V - 0.28) < 0.02 && Math.abs(rSol30 - 2153) < 30;
  resultados.push({
    test: "5. Evolución al Sol 30 (V ≈ 0.28 m/s, Radio ≈ 2.2 km)",
    ok: ok5,
    detalle: `V(30) = ${sol30.V.toFixed(3)} m/s, Radio(30) = ${(rSol30 / 1000).toFixed(3)} km`,
  });

  // TEST 6: Escenario energía Apolo (4 h vs 6 h)
  // Al bajar a 4h de soporte vital, el radio cae de ~1.7 km a ~1.28 km (limita energía)
  const rApolo = radioLlano(1, CENTRALES, 4);
  const ok6 = Math.abs(rApolo - 1281) < 20;
  resultados.push({
    test: "6. Escenario energía Apolo (4 h de soporte vital)",
    ok: ok6,
    detalle: `Radio Apolo (4h) = ${(rApolo / 1000).toFixed(3)} km (baja de 1.7 km por límite energético)`,
  });

  // TEST 7: Escenario intensidad observada en simulaciones lunares (fWalk = 0.47)
  const paramF47 = { ...CENTRALES, fWalk: 0.47 };
  const rF47 = radioLlano(1, paramF47);
  const ok7 = Math.abs(rF47 - 2385) < 30; // ≈ 2.38 km
  resultados.push({
    test: "7. Escenario marcha observada lunar (fWalk = 47%)",
    ok: ok7,
    detalle: `Radio (fWalk = 0.47) = ${(rF47 / 1000).toFixed(3)} km (sube de 1.7 km a ~2.38 km)`,
  });

  return resultados;
}

// Ejecución con vitest (npm test): cada comprobación de la lista es un caso

test.each(ejecutarTestsMarcha())("$test", ({ ok, detalle }) => {
  expect(ok, detalle).toBe(true);
});
