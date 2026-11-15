"use client";

/**
 * Terreno 3D en tres niveles encajados (ver lib/mapa3d/relieve.ts), cada uno con su imagen real:
 *
 *   zona     DEM 16 m + mosaico HiRISE; dentro de la zona de estudio, la imagen de más detalle y la
 *            probabilidad (viridis). Los contornos, el borde y la regla son líneas (Lineas3D.tsx)
 *   entorno  DEM 64 m + ortofoto MSL coloreada (33 × 57 km)
 *   región   DEM HRSC-MOLA + mosaico CTX coloreado (Gale entero); su borde se prolonga hasta perderse
 *            en la bruma
 *
 * Los tres usan el mismo material (MeshStandardMaterial ampliado): el relieve ilumina el color y la
 * bruma por altura (lib/mapa3d/atmosfera.ts) funde lo lejano con el cielo.
 *
 * De cerca (menos de ~2 km) se añade un grano fino al color: las imágenes tienen 1,3 m/px en la zona y
 * 5 m/px alrededor, y sin él el suelo junto a la cámara se ve liso y desenfocado.
 *
 * La probabilidad tiñe el terreno en vez de taparlo (conserva el claroscuro de la imagen) y lleva
 * algo de emisión: se lee igual en las laderas en sombra.
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
import { GLSL_ATMOSFERA, UNIFORMES_ATMOSFERA } from "@/lib/mapa3d/atmosfera";
import { LADO_M } from "@/lib/mapa3d/coordenadas";
import { fijarUniforme } from "@/lib/mapa3d/imperativo";
import { cortarRelieve } from "@/lib/mapa3d/rayo";
import { alturaCompuesta, cajaMalla, construirMalla, type Malla, type Relieve } from "@/lib/mapa3d/relieve";

/** Color medio del suelo: el del alero que prolonga la región (o la zona, si no hay más datos) */
const COLOR_SUELO = "#8a5a3c";
/** Hasta dónde se prolonga el borde del último nivel (m): más allá de donde llega la vista */
const ALERO_M = 500_000;

/** Altura de referencia de la escena: el hábitat queda en y = 0. */
export function zRefDe(alturas: Alturas) {
  return alturaEn(alturas, X0 + HABITAT.eastKm * 1000, Y0 + HABITAT.northKm * 1000);
}

function aGeometria(m: Malla): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(m.posiciones, 3));
  g.setAttribute("normal", new BufferAttribute(m.normales, 3));
  g.setAttribute("uv", new BufferAttribute(m.uvs, 2));
  g.setIndex(new BufferAttribute(m.indices, 1));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

type Nivel = "zona" | "entorno" | "region";
const geometrias = new WeakMap<Relieve, Map<string, BufferGeometry>>();
/**
 * Separación de los vértices de cada nivel, en píxeles de su DEM. La zona usa todos (16 m); el
 * entorno y la región, que se ven de lejos, uno de cada 1,5 (96 m y ~700 m): la mitad de triángulos
 * sin que se note en la silueta.
 */
const DENSIDAD: Record<Nivel, number> = { zona: 1, entorno: 1.5, region: 1.5 };

/**
 * Malla de un nivel (entre las tres, ~0,6 M de vértices y 1,2 M de triángulos en escritorio). Se
 * guarda: se prepara mientras se ve el globo (precalentarTerreno) y al bajar a la zona de estudio no
 * hay que construirla. `paso` = 2 usa la mitad de vértices por lado (móvil).
 */
export function geometriaNivel(r: Relieve, nivel: Nivel, paso: number): BufferGeometry | null {
  const a = r[nivel];
  if (!a) return null;
  let porClave = geometrias.get(r);
  if (!porClave) geometrias.set(r, (porClave = new Map()));
  const clave = `${nivel}/${paso}`;
  const hit = porClave.get(clave);
  if (hit) return hit;
  const zRef = zRefDe(r.zona);
  const altura = (este: number, norte: number) => alturaCompuesta(r, este, norte);
  const ultimo = nivel === "region" || (nivel === "entorno" && !r.region) || (nivel === "zona" && !r.entorno && !r.region);
  const dentro = nivel === "region" ? (r.entorno ?? r.zona) : nivel === "entorno" ? r.zona : null;
  const g = aGeometria(
    construirMalla({
      caja: cajaMalla(a),
      paso: a.mPx * paso * DENSIDAD[nivel],
      altura,
      zRef,
      cajaUv: a.caja,
      hueco: dentro ? cajaMalla(dentro) : null,
      faldon: nivel === "zona" ? 60 : 280,
      alero: ultimo ? ALERO_M : 0,
    }),
  );
  porClave.set(clave, g);
  return g;
}

/** Prepara las mallas en momentos libres del hilo principal (mientras se ve el globo). */
export function precalentarTerreno(r: Relieve, paso: number) {
  const cola: Nivel[] = ["zona", "entorno", "region"];
  const hacer = () => {
    const n = cola.shift();
    if (!n) return;
    geometriaNivel(r, n, paso);
    if (cola.length) programar();
  };
  const programar = () => {
    if (typeof requestIdleCallback === "function") requestIdleCallback(hacer, { timeout: 3000 });
    else setTimeout(hacer, 300);
  };
  programar();
}

/**
 * Corte de rayos sobre la rejilla de alturas en lugar de sobre los triángulos: el puntero cuesta una
 * fracción de milisegundo en vez de recorrer toda la malla. El grupo del terreno no tiene escala, así
 * que las distancias locales y de mundo coinciden.
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
  entorno: Texture | null;
  region: Texture | null;
}

interface OpcionesMaterial {
  mapa: Texture;
  normal?: Texture;
  /** Capas de la zona de estudio (solo el nivel «zona») */
  zona?: { detalle: Texture; prob: Texture; caja: Vector4; opacidad: { value: number } };
  /** Franja del borde, en uv, donde el relieve fino se apaga (zona) o el color pasa al del alero */
  franja: Vector2;
  alero: boolean;
}

function crearMaterial(o: OpcionesMaterial): MeshStandardMaterial {
  const mat = new MeshStandardMaterial({
    map: o.mapa,
    normalMap: o.normal ?? null,
    normalScale: new Vector2(0.85, 0.85),
    roughness: 0.96,
    metalness: 0,
  });
  const u: Record<string, { value: unknown }> = {
    ...UNIFORMES_ATMOSFERA,
    uFranja: { value: o.franja },
    uColorAlero: { value: new Color(COLOR_SUELO) },
  };
  if (o.zona) {
    u.uDetalle = { value: o.zona.detalle };
    u.uProb = { value: o.zona.prob };
    u.uCaja = { value: o.zona.caja };
    u.uOpacidad = o.zona.opacidad;
  }
  mat.defines = { ...mat.defines, ...(o.zona ? { CAPAS_ZONA: "" } : {}), ...(o.alero ? { ALERO: "" } : {}) };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vMundo;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvMundo = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
${GLSL_ATMOSFERA}
varying vec3 vMundo;
uniform vec2 uFranja;
uniform vec3 uColorAlero;
float azar(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float ruido(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(azar(i), azar(i + vec2(1.0, 0.0)), f.x), mix(azar(i + vec2(0.0, 1.0)), azar(i + vec2(1.0, 1.0)), f.x), f.y);
}
// Grano del suelo a tres escalas; cada una se apaga antes de que sea más fina que un píxel
float grano(vec2 q, float d) {
  float g = (ruido(q / 9.0) - 0.5) * 0.45 * (1.0 - smoothstep(900.0, 2400.0, d));
  g += (ruido(q / 2.7) - 0.5) * 0.35 * (1.0 - smoothstep(300.0, 900.0, d));
  g += (ruido(q / 0.9) - 0.5) * 0.3 * (1.0 - smoothstep(110.0, 320.0, d));
  return g;
}
#ifdef CAPAS_ZONA
uniform sampler2D uDetalle;
uniform sampler2D uProb;
uniform vec4 uCaja;
uniform float uOpacidad;
#endif`,
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
vec3 emisExtra = vec3(0.0);
float fBorde = 1.0;
{
  vec2 e = min(vMapUv, 1.0 - vMapUv) / uFranja;
  fBorde = smoothstep(0.0, 1.0, clamp(min(e.x, e.y), 0.0, 1.0));
  #ifdef ALERO
  diffuseColor.rgb = mix(uColorAlero, diffuseColor.rgb, fBorde);
  #endif
  #ifdef CAPAS_ZONA
  vec2 suv = (vMapUv - uCaja.xy) / uCaja.zw;
  if (suv.x >= 0.0 && suv.y >= 0.0 && suv.x <= 1.0 && suv.y <= 1.0) {
    vec3 det = texture2D(uDetalle, suv).rgb;
    vec4 pr = texture2D(uProb, suv);
    float a = pr.a * uOpacidad;
    // La probabilidad tiñe la imagen: lo claro sigue claro y lo oscuro, oscuro
    float lum = dot(det, vec3(0.2126, 0.7152, 0.0722));
    vec3 tinta = pr.rgb * (0.5 + 1.35 * lum);
    diffuseColor.rgb = mix(det, tinta, a);
    emisExtra += pr.rgb * a * 0.2;
  }
  #endif
  float dCamara = distance(cameraPosition, vMundo);
  if (dCamara < 2400.0) diffuseColor.rgb *= 1.0 + grano(vMundo.xz, dCamara) * 0.5;
}`,
      )
      // El relieve fino (mapa de normales) se apaga hacia el borde, donde la malla ya es la del entorno
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
#ifdef USE_NORMALMAP
normal = normalize(mix(nonPerturbedNormal, normal, fBorde));
#endif`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
totalEmissiveRadiance += emisExtra;`,
      )
      // Bruma: antes de los tonos y del espacio de color, como el resto de la luz de la escena
      .replace(
        "#include <opaque_fragment>",
        `#include <opaque_fragment>
gl_FragColor.rgb = mix(gl_FragColor.rgb, colorBruma(cameraPosition, vMundo), bruma(cameraPosition, vMundo));
gl_FragColor.rgb *= 1.0 + tramado(gl_FragCoord.xy) * 0.014;`,
      );
  };
  mat.customProgramCacheKey = () => `terreno-v5-${o.zona ? "z" : ""}${o.alero ? "a" : ""}${o.normal ? "n" : ""}`;
  return mat;
}

interface Props {
  relieve: Relieve;
  zRef: number;
  /** 1 = todos los vértices; 2 = la mitad por lado (móvil) */
  paso: number;
  /** La malla de la zona, para el puntero */
  mallaRef?: Ref<Mesh>;
  texturas: TexturasTerreno;
  prob: Texture;
  /** Opacidad de la capa de probabilidad (0–1) */
  opacidad?: number;
  onPuntero?: (e: ThreeEvent<PointerEvent>) => void;
  onFuera?: () => void;
  onToque?: (e: ThreeEvent<MouseEvent>) => void;
}

export default function Terreno({ relieve, zRef, paso, mallaRef, texturas, prob, opacidad = 0.7, onPuntero, onFuera, onToque }: Props) {
  const geos = useMemo(
    () => ({
      zona: geometriaNivel(relieve, "zona", paso)!,
      entorno: texturas.entorno ? geometriaNivel(relieve, "entorno", paso) : null,
      region: texturas.region ? geometriaNivel(relieve, "region", paso) : null,
    }),
    [relieve, paso, texturas.entorno, texturas.region],
  );
  // Libera las copias en la GPU al salir; las mallas siguen guardadas y se vuelven a subir al entrar
  useEffect(
    () => () => {
      geos.zona.dispose();
      geos.entorno?.dispose();
      geos.region?.dispose();
    },
    [geos],
  );
  const raycast = useMemo(() => corteRapido(relieve.zona, zRef), [relieve, zRef]);

  const { materiales, uOpacidad } = useMemo(() => {
    const { zona, entorno, region } = relieve;
    const [cx0, cy0, cx1, cy1] = zona.caja;
    const ancho = cx1 - cx0;
    const alto = cy1 - cy0;
    const uOp = { value: 0.7 };
    const hayEntorno = !!(entorno && texturas.entorno);
    const hayRegion = !!(region && texturas.region);
    return {
      uOpacidad: uOp,
      materiales: {
        zona: crearMaterial({
          mapa: texturas.contexto,
          normal: texturas.normal,
          zona: {
            detalle: texturas.detalle,
            prob,
            caja: new Vector4((X0 - cx0) / ancho, (Y0 - cy0) / alto, LADO_M / ancho, LADO_M / alto),
            opacidad: uOp,
          },
          franja: new Vector2(450 / ancho, 450 / alto),
          alero: !hayEntorno && !hayRegion,
        }),
        entorno: hayEntorno
          ? crearMaterial({ mapa: texturas.entorno!, franja: new Vector2(0.02, 0.02), alero: !hayRegion })
          : null,
        // El color de la región pasa al del alero en los últimos ~9 km
        region: hayRegion ? crearMaterial({ mapa: texturas.region!, franja: new Vector2(0.04, 0.04), alero: true }) : null,
      },
    };
  }, [texturas, relieve, prob]);
  useEffect(
    () => () => {
      materiales.zona.dispose();
      materiales.entorno?.dispose();
      materiales.region?.dispose();
    },
    [materiales],
  );
  useEffect(() => fijarUniforme(uOpacidad, opacidad), [uOpacidad, opacidad]);

  return (
    <>
      <mesh
        ref={mallaRef}
        geometry={geos.zona}
        material={materiales.zona}
        raycast={raycast}
        castShadow
        receiveShadow
        onPointerMove={onPuntero}
        onPointerOut={onFuera}
        onClick={onToque}
      />
      {geos.entorno && materiales.entorno && <mesh geometry={geos.entorno} material={materiales.entorno} />}
      {geos.region && materiales.region && <mesh geometry={geos.region} material={materiales.region} />}
    </>
  );
}
