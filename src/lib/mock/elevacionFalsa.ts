import { N } from "@/lib/constants";
import { DESTINOS, HABITAT, kmACelda } from "@/lib/data/targets";

/**
 * DEM provisional para que el panel pueda calcular desniveles de destinos
 * personalizados antes de que exista `dem_real.bin`.
 *
 * Se interpolan (IDW) los desniveles conocidos del hábitat y de T1–T6 sobre
 * una malla de 110 × 110. No sustituye al DEM real: cuando Persona 1 lo cargue,
 * `Resultado.elevacion` debe contener las elevaciones reales.
 */
const ELEVACION_BASE_M = -2600;

const PUNTOS_CONOCIDOS = [
  { ...kmACelda(HABITAT.northKm, HABITAT.eastKm), desnivelM: 0 },
  ...DESTINOS.map((d) => ({
    ...kmACelda(d.northKm, d.eastKm),
    desnivelM: d.desnivelM,
  })),
];

function crearElevacionProvisional(): Float32Array {
  const elevacion = new Float32Array(N * N);
  const EPS = 1e-6;

  for (let fila = 0; fila < N; fila++) {
    for (let columna = 0; columna < N; columna++) {
      let numerador = 0;
      let denominador = 0;

      for (const punto of PUNTOS_CONOCIDOS) {
        const df = fila - punto.fila;
        const dc = columna - punto.columna;
        const peso = 1 / (df * df + dc * dc + EPS);
        numerador += peso * punto.desnivelM;
        denominador += peso;
      }

      elevacion[fila * N + columna] = ELEVACION_BASE_M + numerador / denominador;
    }
  }

  // Forzar los valores conocidos en sus celdas exactas.
  for (const punto of PUNTOS_CONOCIDOS) {
    elevacion[punto.fila * N + punto.columna] = ELEVACION_BASE_M + punto.desnivelM;
  }

  return elevacion;
}

export const ELEVACION_PROVISIONAL = crearElevacionProvisional();
