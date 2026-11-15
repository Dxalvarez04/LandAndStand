/**
 * Cambios imperativos sobre objetos de three.js (cámara, texturas, uniformes). Van en funciones
 * aparte para que los componentes no asignen propiedades a valores que React considera inmutables
 * (props, resultados de hooks); three.js necesita estas mutaciones y no afectan al render de React.
 */
import { SRGBColorSpace, type PerspectiveCamera, type Texture, type WebGLRenderer } from "three";

export function ajustarCamara(c: PerspectiveCamera, near: number, far: number, fov = 40) {
  c.near = near;
  c.far = far;
  c.fov = fov;
  c.updateProjectionMatrix();
}

/** Cambia los planos de corte sin tocar el resto de la proyección (ni el desplazamiento de la vista). */
export function planosDeCorte(c: PerspectiveCamera, near: number, far: number) {
  c.near = near;
  c.far = far;
  c.updateProjectionMatrix();
}

/** sRGB y, si ya estaba subida a la GPU como lineal (drei sube las texturas al cargarlas), vuelve a subirla. */
export function ponerSRGB(...ts: Texture[]) {
  for (const t of ts) {
    if (t.colorSpace === SRGBColorSpace) continue;
    t.colorSpace = SRGBColorSpace;
    t.needsUpdate = true;
  }
}

export function ponerAnisotropia(max: number, ...ts: Texture[]) {
  for (const t of ts) t.anisotropy = max;
}

export function refrescar(t: Texture) {
  t.needsUpdate = true;
}

export function fijarUniforme<T>(u: { value: T }, v: T) {
  u.value = v;
}

/**
 * Desplaza el centro óptico de la cámara (x, y px hacia la izquierda y hacia arriba) sin cambiar
 * el tamaño del lienzo: lo que hay en el centro queda en el centro de la parte que no tapa el panel.
 */
export function desplazarVista(c: PerspectiveCamera, ancho: number, alto: number, x: number, y: number) {
  if (x === 0 && y === 0) c.clearViewOffset();
  else c.setViewOffset(ancho, alto, x, y, ancho, alto);
}

export function quitarDesplazamiento(c: PerspectiveCamera) {
  c.clearViewOffset();
}

/**
 * Sombras fijas: la luz y el terreno no se mueven, así que el mapa de sombras se dibuja una vez
 * (y cuando se pide) en lugar de en cada fotograma.
 */
export function sombrasFijas(gl: WebGLRenderer, fijas: boolean) {
  gl.shadowMap.autoUpdate = !fijas;
  gl.shadowMap.needsUpdate = true;
}

/** Hace que el próximo fotograma vuelva a dibujar el mapa de sombras. */
export function redibujarSombras(gl: WebGLRenderer) {
  gl.shadowMap.needsUpdate = true;
}
