"use client";

/**
 * Terreno 3D: malla del DEM (16 m) con la imagen HiRISE encima y, dentro de la zona de estudio,
 * la imagen de más detalle, la probabilidad (viridis) y los contornos, la regla y el borde.
 * Todo va en un único material (MeshStandardMaterial ampliado) para que el relieve ilumine el color.
 *
 * Los colores de la probabilidad y las líneas llevan algo de emisión: se leen igual en las laderas
 * en sombra (la clave del mapa no debe depender de la hora del sol).
 */
import { useEffect, useMemo, type Ref } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Matrix4,
  MeshStandardMaterial,
  Ray,
  Vector2,
  Vector3,
  Vector4,
  type Intersection,
  type Mesh,
  type Raycaster,
  type Texture,
} from "three";
import { X0, Y0 } from "@/lib/constants";
import { HABITAT } from "@/lib/data/targets";
import { alturaEn, type Alturas } from "@/lib/mapa3d/alturas";
import { LADO_M } from "@/lib/mapa3d/coordenadas";
import { construirMalla } from "@/lib/mapa3d/malla";
import { fijarUniforme } from "@/lib/mapa3d/imperativo";
import { cortarRelieve } from "@/lib/mapa3d/rayo";

export const COLOR_SUELO = "#6c5243";

/** Altura de referencia de la escena: el hábitat queda en y = 0. */
export function zRefDe(alturas: Alturas) {
  return alturaEn(alturas, X0 + HABITAT.eastKm * 1000, Y0 + HABITAT.northKm * 1000);
}

const geometrias = new WeakMap<Alturas, Map<number, BufferGeometry>>();

/**
 * Malla del terreno (~280 000 vértices con sus normales). Se guarda: se puede preparar mientras se
 * ve el globo (precalentarTerreno) y al bajar a la zona de estudio no hay que construirla.
 */
export function geometriaTerreno(alturas: Alturas, paso: number): BufferGeometry {
  let porPaso = geometrias.get(alturas);
  if (!porPaso) geometrias.set(alturas, (porPaso = new Map()));
  const hit = porPaso.get(paso);
  if (hit) return hit;
  const m = construirMalla(alturas, zRefDe(alturas), paso);
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(m.posiciones, 3));
  g.setAttribute("uv", new BufferAttribute(m.uvs, 2));
  g.setIndex(new BufferAttribute(m.indices, 1));
  g.computeVertexNormals();
  g.computeBoundingBox();
  g.computeBoundingSphere();
  porPaso.set(paso, g);
  return g;
}

/** Prepara la malla en un momento libre del hilo principal (mientras se ve el globo). */
export function precalentarTerreno(alturas: Alturas, paso: number) {
  const hacer = () => void geometriaTerreno(alturas, paso);
  if (typeof requestIdleCallback === "function") requestIdleCallback(hacer, { timeout: 4000 });
  else setTimeout(hacer, 500);
}

/**
 * Corte de rayos sobre la rejilla de alturas en lugar de sobre los triángulos: el puntero (y la
 * colisión de la cámara) cuestan una fracción de milisegundo en vez de recorrer toda la malla.
 * El grupo del terreno no tiene escala, así que las distancias locales y de mundo coinciden.
 */
function corteRapido(alturas: Alturas, zRef: number) {
  const inversa = new Matrix4();
  const rayo = new Ray();
  return function (this: Mesh, raycaster: Raycaster, cortes: Intersection[]) {
    inversa.copy(this.matrixWorld).invert();
    rayo.copy(raycaster.ray).applyMatrix4(inversa);
    const t = cortarRelieve(alturas, zRef, rayo.origin, rayo.direction, 0, raycaster.far);
    if (t === null) return;
    const point = rayo.at(t, new Vector3()).applyMatrix4(this.matrixWorld);
    const distance = raycaster.ray.origin.distanceTo(point);
    if (distance < raycaster.near || distance > raycaster.far) return;
    cortes.push({ distance, point, object: this });
  };
}

export interface TexturasTerreno {
  contexto: Texture;
  detalle: Texture;
  normal: Texture;
}

interface Props {
  alturas: Alturas;
  zRef: number;
  paso: number;
  /** La malla, para la colisión de la cámara */
  mallaRef?: Ref<Mesh>;
  texturas: TexturasTerreno;
  prob: Texture;
  superposicion: Texture;
  /** Opacidad de la capa de probabilidad (0–1) */
  opacidad?: number;
  onPuntero?: (e: ThreeEvent<PointerEvent>) => void;
  onFuera?: () => void;
  onToque?: (e: ThreeEvent<MouseEvent>) => void;
}

export default function Terreno({ alturas, zRef, paso, mallaRef, texturas, prob, superposicion, opacidad = 0.62, onPuntero, onFuera, onToque }: Props) {
  const geometria = useMemo(() => geometriaTerreno(alturas, paso), [alturas, paso]);
  // Libera la copia en la GPU al salir; la malla sigue guardada y se vuelve a subir al entrar
  useEffect(() => () => geometria.dispose(), [geometria]);
  const raycast = useMemo(() => corteRapido(alturas, zRef), [alturas, zRef]);

  const { material, uniformes } = useMemo(() => {
    const [cx0, cy0, cx1, cy1] = alturas.caja;
    const ancho = cx1 - cx0;
    const alto = cy1 - cy0;
    const u = {
      uDetalle: { value: texturas.detalle },
      uProb: { value: prob },
      uSuper: { value: superposicion },
      uCaja: { value: new Vector4((X0 - cx0) / ancho, (Y0 - cy0) / alto, LADO_M / ancho, LADO_M / alto) },
      uBorde: { value: new Vector2(450 / ancho, 450 / alto) },
      uColorBorde: { value: new Color(COLOR_SUELO) },
      uOpacidad: { value: 0.62 },
    };

    const mat = new MeshStandardMaterial({
      map: texturas.contexto,
      normalMap: texturas.normal,
      normalScale: new Vector2(0.85, 0.85),
      roughness: 0.96,
      metalness: 0,
    });
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u);
      sh.fragmentShader = sh.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
uniform sampler2D uDetalle;
uniform sampler2D uProb;
uniform sampler2D uSuper;
uniform vec4 uCaja;
uniform vec2 uBorde;
uniform vec3 uColorBorde;
uniform float uOpacidad;`,
        )
        .replace(
          "#include <map_fragment>",
          `#include <map_fragment>
vec3 emisExtra = vec3(0.0);
float fBorde = 1.0;
{
  vec2 suv = (vMapUv - uCaja.xy) / uCaja.zw;
  if (suv.x >= 0.0 && suv.y >= 0.0 && suv.x <= 1.0 && suv.y <= 1.0) {
    diffuseColor.rgb = texture2D(uDetalle, suv).rgb;
    vec4 pr = texture2D(uProb, suv);
    float a = pr.a * uOpacidad;
    diffuseColor.rgb = mix(diffuseColor.rgb, pr.rgb, a);
    emisExtra += pr.rgb * a * 0.28;
    vec4 ov = texture2D(uSuper, suv);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.0), ov.a);
    emisExtra += ov.rgb * ov.a * 0.9;
  }
  vec2 e = min(vMapUv, 1.0 - vMapUv) / uBorde;
  float fb = smoothstep(0.0, 1.0, clamp(min(e.x, e.y), 0.0, 1.0));
  diffuseColor.rgb = mix(uColorBorde, diffuseColor.rgb, fb);
  fBorde = fb;
}`,
        )
        // El relieve fino (mapa de normales) se apaga hacia el borde: en el faldón no deja estrías
        .replace(
          "#include <normal_fragment_maps>",
          `#include <normal_fragment_maps>
normal = normalize(mix(nonPerturbedNormal, normal, fBorde));`,
        )
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
totalEmissiveRadiance += emisExtra;`,
        );
    };
    mat.customProgramCacheKey = () => "terreno-zona-v2";
    return { material: mat, uniformes: u };
  }, [texturas, alturas, prob, superposicion]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => fijarUniforme(uniformes.uOpacidad, opacidad), [uniformes, opacidad]);

  return (
    <mesh
      ref={mallaRef}
      geometry={geometria}
      material={material}
      raycast={raycast}
      castShadow
      receiveShadow
      onPointerMove={onPuntero}
      onPointerOut={onFuera}
      onClick={onToque}
    />
  );
}
