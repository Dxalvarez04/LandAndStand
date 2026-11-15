/**
 * Atmósfera del terreno 3D: el cielo «butterscotch» de Marte y la bruma de polvo, con el mismo color.
 *
 * La bruma no es una niebla uniforme: el polvo se concentra abajo y se aclara con la altura (escala
 * ~9 km), así que se integra a lo largo de cada rayo. Mirando hacia el horizonte se atraviesa mucho
 * aire y el relieve lejano se funde con el cielo; mirando hacia abajo, aunque sea desde muy alto,
 * casi nada, y el terreno se ve limpio. De cerca (unos kilómetros) no se nota: a 10 km tapa un 7 %.
 *
 * El cielo y los materiales del terreno comparten estos uniformes y este GLSL.
 */
import { Color, Vector2, Vector3 } from "three";

export const HORIZONTE = "#d3ad8a";
export const CENIT = "#a17a5d";
const HALO = "#cdd6df";

/** Dirección hacia el sol: oestesuroeste a 32° (la hora de las imágenes HiRISE, ~15 h local). */
export function direccionSol(azimutGrados = 250, elevacionGrados = 32): Vector3 {
  const az = (azimutGrados * Math.PI) / 180;
  const el = (elevacionGrados * Math.PI) / 180;
  // escena: x = este, y = arriba, z = sur
  return new Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
}

export const SOL = direccionSol();

/** Uniformes compartidos (los mismos objetos en todos los materiales). */
export const UNIFORMES_ATMOSFERA = {
  uSol: { value: SOL },
  uHorizonte: { value: new Color(HORIZONTE) },
  uCenit: { value: new Color(CENIT) },
  uHalo: { value: new Color(HALO) },
  /** x = densidad a la altura del hábitat (1/m); y = 1 / escala de altura (1/m) */
  uBruma: { value: new Vector2(0.75e-5, 1 / 8000) },
};

export const GLSL_ATMOSFERA = /* glsl */ `
uniform vec3 uSol;
uniform vec3 uHorizonte;
uniform vec3 uCenit;
uniform vec3 uHalo;
uniform vec2 uBruma;

// Color del cielo en una dirección (lineal, sin tonos)
vec3 colorCielo(vec3 d) {
  float h = d.y;
  vec3 c = mix(uHorizonte, uCenit, pow(clamp(h, 0.0, 1.0), 0.5));
  float s = max(dot(d, uSol), 0.0);
  c = mix(c, uHalo, pow(s, 18.0) * 0.5);   // aureola azulada alrededor del sol
  c += uHorizonte * pow(s, 4.0) * 0.12;    // el polvo brilla más hacia el sol
  return c;
}

// Fracción de bruma entre la cámara y un punto (polvo que decae exponencialmente con la altura)
float bruma(vec3 camara, vec3 punto) {
  vec3 v = punto - camara;
  float d = length(v);
  float a0 = exp(-max(camara.y, -2000.0) * uBruma.y);
  float dh = v.y * uBruma.y;
  float medio = abs(dh) > 1e-3 ? a0 * (1.0 - exp(-dh)) / dh : a0 * (1.0 - 0.5 * dh);
  return 1.0 - exp(-uBruma.x * d * medio);
}

// Ruido fino para que los degradados suaves (cielo, bruma) no hagan bandas en 8 bits
float tramado(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))) - 0.5;
}

// Color de la bruma hacia un punto: el del cielo en el horizonte en esa dirección
vec3 colorBruma(vec3 camara, vec3 punto) {
  vec3 v = punto - camara;
  return colorCielo(normalize(vec3(v.x, 0.0, v.z) + vec3(1e-5, 0.0, 0.0)));
}
`;
