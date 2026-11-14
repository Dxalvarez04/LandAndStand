/**
 * Test suite para la Capa 2: Fisiología.
 * Valida vo2max(s, p) y thetaMax(s, p) contra las especificaciones del modelo v3.1.
 */
import { expect, test } from "vitest";
import { vo2max, thetaMax } from "./fisiologia";
import { CENTRALES } from "../constants";

export function ejecutarTestsFisiologia() {
  const resultados: { test: string; ok: boolean; detalle: string }[] = [];

  // TEST 1: Protocolo de validación oficial (Paso 1 de la especificación)
  // Especificación: vo2max(1) con delta = 0.16 y tauA = 15 ≈ 34.5 mL/kg/min
  const v1 = vo2max(1, CENTRALES);
  const ok1 = Math.abs(v1 - 34.52) < 0.05;
  resultados.push({
    test: "1. Protocolo de validación oficial (Sol 1 ≈ 34.5 mL/kg/min)",
    ok: ok1,
    detalle: `Obtenido: ${v1.toFixed(3)} mL/kg/min | Esperado: ≈ 34.52 mL/kg/min`,
  });

  // TEST 2: Asintótica en sol grande (s -> inf)
  // vo2max debe aproximarse a vo2pre (40.6) y thetaMax a thLim (25.0)
  const vInf = vo2max(1000, CENTRALES);
  const tInf = thetaMax(1000, CENTRALES);
  const ok2 = Math.abs(vInf - CENTRALES.vo2pre) < 1e-6 && Math.abs(tInf - CENTRALES.thLim) < 1e-6;
  resultados.push({
    test: "2. Comportamiento asintótico a largo plazo (s = 1000 soles)",
    ok: ok2,
    detalle: `vo2max(inf): ${vInf.toFixed(4)} (esperado: ${CENTRALES.vo2pre}) | thetaMax(inf): ${tInf.toFixed(4)}° (esperado: ${CENTRALES.thLim}°)`,
  });

  // TEST 3: Monotonía creciente con el sol
  // A medida que s aumenta, la condición fisiológica siempre debe mejorar o mantenerse
  let monotono = true;
  let prevV = vo2max(1, CENTRALES);
  let prevT = thetaMax(1, CENTRALES);
  for (let s = 2; s <= 30; s++) {
    const curV = vo2max(s, CENTRALES);
    const curT = thetaMax(s, CENTRALES);
    if (curV <= prevV || curT < prevT) {
      monotono = false;
      break;
    }
    prevV = curV;
    prevT = curT;
  }
  resultados.push({
    test: "3. Monotonía física (la capacidad aeróbica y el equilibrio crecen monótonamente)",
    ok: monotono,
    detalle: `Monótono de sol 1 a sol 30: ${monotono ? "SÍ" : "NO"}`,
  });

  // TEST 4: Dinámica temporal diferenciada (Recuperación rápida vs lenta)
  // El equilibrio se recupera en días (tauB = 0.95), vo2max en semanas (tauA = 15)
  const t7 = thetaMax(7, CENTRALES);
  const recEquilibrio7 = (t7 - (CENTRALES.thLim - CENTRALES.dTh)) / CENTRALES.dTh;
  const v7 = vo2max(7, CENTRALES);
  const recAero7 = (v7 - CENTRALES.vo2pre * (1 - CENTRALES.delta)) / (CENTRALES.vo2pre * CENTRALES.delta);
  const ok4 = recEquilibrio7 > 0.99 && recAero7 < 0.5;
  resultados.push({
    test: "4. Asimetría biológica: Equilibrio rápido (días) vs Aeróbico lento (semanas)",
    ok: ok4,
    detalle: `Recuperación al Sol 7 -> Equilibrio: ${(recEquilibrio7 * 100).toFixed(2)}% | Aeróbico: ${(recAero7 * 100).toFixed(2)}%`,
  });

  // TEST 5: Cumplimiento de requisito NASA-STD-3001 (VO2max >= 36.5 mL/kg/min)
  // Para un astronauta promedio, ver exactamente cuándo cruza el umbral
  let solCruceNASA: number | null = null;
  for (let s = 1; s <= 30; s++) {
    if (vo2max(s, CENTRALES) >= 36.5) {
      solCruceNASA = s;
      break;
    }
  }
  resultados.push({
    test: "5. Umbral de idoneidad NASA (36.5 mL/kg/min)",
    ok: solCruceNASA === 7,
    detalle: `El astronauta medio cruza el umbral NASA en el Sol ${solCruceNASA} (${vo2max(solCruceNASA!, CENTRALES).toFixed(2)} mL/kg/min)`,
  });

  return resultados;
}

// Ejecución con vitest (npm test): cada comprobación de la lista es un caso

test.each(ejecutarTestsFisiologia())("$test", ({ ok, detalle }) => {
  expect(ok, detalle).toBe(true);
});
