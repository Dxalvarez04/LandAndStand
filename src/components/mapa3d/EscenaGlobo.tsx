"use client";

/**
 * Globo de Marte (radio 1):
 *   - color: mosaico Viking MDIM 2.1 (USGS), 4K y, en escritorio, 8K cuando termina de cargar;
 *   - relieve: normales del DEM MOLA (relieve ×6 solo en el sombreado);
 *   - atmósfera: capa fina, ocre de día y azulada en el terminador (en Marte los atardeceres son azules);
 *   - región de Gale en relieve (DEM HRSC-MOLA 200 m, ×3) con su imagen (mosaico CTX coloreado),
 *     fundida con el globo;
 *   - estrellas y sol lejano.
 *
 * Descenso y regreso: la cámara baja hasta la órbita baja sobre la zona de estudio (~100 km, casi a
 * plomo, norte arriba) y avisa (onLlegada). El terreno empieza exactamente en esa vista, así que el
 * cambio de escena es un fundido entre dos imágenes iguales. Al volver, el globo empieza ahí
 * (desdeOrbita) y se aleja hasta la vista de inicio.
 */
import { CameraControls, CameraControlsImpl, Html, Stars, useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type Ref } from "react";
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  MeshStandardMaterial,
  ShaderMaterial,
  SRGBColorSpace,
  type AmbientLight,
  type DirectionalLight,
  TextureLoader,
  Vector2,
  Vector3,
  type PerspectiveCamera,
  type Texture,
} from "three";
import { R_MARTE } from "@/lib/constants";
import { cargarAlturasGale, type AlturasGale } from "@/lib/mapa3d/alturas";
import { ORBITA, suave } from "@/lib/mapa3d/camara";
import { GALE, latLonAVector, ZONA } from "@/lib/mapa3d/coordenadas";
import { ajustarCamara, ponerSRGB } from "@/lib/mapa3d/imperativo";
import { useIdioma } from "@/lib/i18n";

const COLOR_DIA = new Color("#d6a27c");
/** Línea guía del rótulo de Gale (px): sube desde el punto y dobla hacia el nombre */
const LINEA = { alto: 78, ancho: 26 };
const COLOR_CREPUSCULO = new Color("#7d9cc6");

const vec = (lat: number, lon: number, r = 1) => new Vector3(...latLonAVector(lat, lon, r));
/** Duración (ms) del descenso hasta la órbita baja y del regreso desde ella */
const DUR = { descenso: 2600, regreso: 2400 };
/** Relieve de la región de Gale sobre el globo (×3 para que se lea desde lejos) */
const EXAGERACION = 3;
/** Luz y color de la región de Gale en la órbita baja: los de la escena del terreno vista desde ahí */
const LUZ_ORBITA = { tinte: 1.0, ambiente: 1.1, sol: 2.6 };

/**
 * Órbita baja sobre la zona de estudio, en unidades del globo: la misma vista que ORBITA en la
 * escena del terreno (cámara al sur del punto de mira, mirando al norte y casi a plomo).
 */
function orbitaBaja(alturaZona: number) {
  const z = vec(ZONA.lat, ZONA.lon).normalize();
  const norte = new Vector3(0, 1, 0).sub(z.clone().multiplyScalar(z.y)).normalize();
  const mira = z.clone().multiplyScalar(1 + alturaZona / R_MARTE);
  const d = ORBITA.r / R_MARTE;
  const pos = mira
    .clone()
    .addScaledVector(z, d * Math.cos(ORBITA.phi))
    .addScaledVector(norte, -d * Math.sin(ORBITA.phi));
  return { pos, mira };
}

/** Posición inicial de la cámara y dirección del sol (Gale iluminado, terminador a la derecha). */
function encuadre() {
  const g = vec(GALE.lat, GALE.lon).normalize();
  const arriba = new Vector3(0, 1, 0);
  const derecha = new Vector3().crossVectors(g.clone().negate(), arriba).normalize();
  const camara = g.clone().multiplyScalar(3.1).add(new Vector3(0, 0.55, 0));
  const sol = g.clone().multiplyScalar(0.55).add(derecha.clone().multiplyScalar(-0.85)).add(arriba.clone().multiplyScalar(0.18)).normalize();
  return { camara, sol };
}

function Atmosfera({ sol }: { sol: Vector3 }) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { uSol: { value: sol }, uDia: { value: COLOR_DIA }, uCrep: { value: COLOR_CREPUSCULO } },
        vertexShader: /* glsl */ `
          varying vec3 vNormal; varying vec3 vPos;
          void main() {
            vNormal = normalize(mat3(modelMatrix) * normal);
            vec4 w = modelMatrix * vec4(position, 1.0); vPos = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uSol, uDia, uCrep; varying vec3 vNormal; varying vec3 vPos;
          void main() {
            vec3 v = normalize(vPos - cameraPosition);
            vec3 n = normalize(vNormal);
            float orient = dot(uSol, n);
            vec3 color = mix(uCrep, uDia, smoothstep(-0.25, 0.75, orient));
            float borde = smoothstep(0.0, 0.55, dot(v, n));
            float dia = smoothstep(-0.45, 0.1, orient);
            gl_FragColor = vec4(color * 1.25, borde * dia * 0.85);
            #include <colorspace_fragment>
          }`,
      }),
    [sol],
  );
  return (
    <mesh material={material} scale={1.028}>
      <sphereGeometry args={[1, 128, 64]} />
    </mesh>
  );
}

/** Material del planeta con un velo atmosférico en el borde iluminado (fresnel). */
function useMaterialPlaneta(color: Texture, normal: Texture, sol: Vector3) {
  return useMemo(() => {
    ponerSRGB(color);
    const m = new MeshStandardMaterial({ map: color, normalMap: normal, normalScale: new Vector2(1.3, 1.3), roughness: 1, metalness: 0 });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uSolG = { value: sol };
      sh.uniforms.uDiaG = { value: COLOR_DIA };
      sh.uniforms.uCrepG = { value: COLOR_CREPUSCULO };
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vNormW; varying vec3 vPosW;")
        .replace(
          "#include <worldpos_vertex>",
          "#include <worldpos_vertex>\nvNormW = normalize(mat3(modelMatrix) * objectNormal);\nvPosW = (modelMatrix * vec4(transformed, 1.0)).xyz;",
        );
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform vec3 uSolG, uDiaG, uCrepG; varying vec3 vNormW; varying vec3 vPosW;")
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
{
  vec3 vv = normalize(cameraPosition - vPosW);
  float fres = pow(1.0 - max(dot(normalize(vNormW), vv), 0.0), 3.0);
  float orient = dot(uSolG, normalize(vNormW));
  vec3 c = mix(uCrepG, uDiaG, smoothstep(-0.2, 0.8, orient));
  totalEmissiveRadiance += c * fres * smoothstep(-0.3, 0.4, orient) * 0.55;
}`,
        );
    };
    m.customProgramCacheKey = () => "marte-atm-v1";
    return m;
  }, [color, normal, sol]);
}

/**
 * Región de Gale en relieve sobre el globo, con los bordes fundidos (altura y opacidad → 0).
 * `materialRef`: al acercarse a la órbita baja se le quita el tinte (ver `acercar`).
 */
function ParcheGale({ datos, textura, materialRef }: { datos: AlturasGale; textura: Texture; materialRef: Ref<MeshStandardMaterial> }) {
  const geometria = useMemo(() => {
    const S = 160;
    const exag = EXAGERACION;
    const pos = new Float32Array((S + 1) * (S + 1) * 3);
    const uv = new Float32Array((S + 1) * (S + 1) * 2);
    const col = new Float32Array((S + 1) * (S + 1) * 4);
    const idx: number[] = [];
    for (let j = 0; j <= S; j++) {
      for (let i = 0; i <= S; i++) {
        const u = i / S;
        const v = j / S; // 0 = norte
        const lon = datos.lon[0] + u * (datos.lon[1] - datos.lon[0]);
        const lat = datos.lat[1] - v * (datos.lat[1] - datos.lat[0]);
        const px = Math.min(datos.ancho - 1, Math.round(u * (datos.ancho - 1)));
        const py = Math.min(datos.alto - 1, Math.round(v * (datos.alto - 1)));
        const h = datos.datos[py * datos.ancho + px];
        const borde = Math.min(u, 1 - u, v, 1 - v);
        const w = Math.min(1, Math.max(0, (borde - 0.02) / 0.16));
        const peso = w * w * (3 - 2 * w);
        const r = 1 + ((peso * (h - datos.min) * exag + 40) / R_MARTE);
        const k = j * (S + 1) + i;
        pos.set(latLonAVector(lat, lon, r), k * 3);
        uv.set([u, 1 - v], k * 2);
        col.set([1, 1, 1, peso], k * 4);
        if (i < S && j < S) idx.push(k, k + S + 1, k + 1, k + 1, k + S + 1, k + S + 2);
      }
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    g.setAttribute("uv", new BufferAttribute(uv, 2));
    g.setAttribute("color", new BufferAttribute(col, 4));
    g.setIndex(idx);
    g.computeVertexNormals();
    // Normales a medias con la radial: con el relieve ×3 las paredes del cráter que dan la espalda
    // al sol se quedarían negras (en el globo no hay luz del cielo que las rellene)
    const n = g.getAttribute("normal") as BufferAttribute;
    const radial = new Vector3();
    const nv = new Vector3();
    for (let k = 0; k < n.count; k++) {
      radial.fromArray(pos, k * 3).normalize();
      nv.fromBufferAttribute(n, k).multiplyScalar(0.6).addScaledVector(radial, 0.4).normalize();
      n.setXYZ(k, nv.x, nv.y, nv.z);
    }
    return g;
  }, [datos]);
  // El espacio de color se fija antes de la primera subida a la GPU (si no, se ve lavada)
  const mapa = useMemo(() => {
    ponerSRGB(textura);
    return textura;
  }, [textura]);
  // La imagen lleva la paleta del terreno (HiRISE); el tinte la iguala al color del globo (MDIM)
  const tinte = useMemo(() => new Color().setRGB(...datos.tinteGlobo), [datos]);
  return (
    <mesh geometry={geometria}>
      <meshStandardMaterial ref={materialRef} map={mapa} color={tinte} vertexColors transparent roughness={1} metalness={0} depthWrite={false} />
    </mesh>
  );
}

interface Props {
  descendiendo: boolean;
  /** Se entra desde el terreno: empieza en la órbita baja y se aleja hasta la vista de inicio */
  desdeOrbita: boolean;
  hd: boolean;
  reducido: boolean;
  /** Imagen de la región de Gale a más resolución, si ya ha cargado */
  galeHd: Texture | null;
  onLlegada: () => void;
  onIrAGale: () => void;
  /** La escena ya se ve (primeros fotogramas dibujados) */
  onLista: () => void;
  /** El globo ya se puede girar (al empezar, o al terminar el regreso) */
  onReposo: () => void;
  mostrarMarca: boolean;
}

export default function EscenaGlobo({ descendiendo, desdeOrbita, hd, reducido, galeHd, onLlegada, onIrAGale, onLista, onReposo, mostrarMarca }: Props) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  // Los textos se calculan aquí: el contenido de <Html> vive en otra raíz de React
  const { t } = useIdioma();
  const [color4k, normal, galeColor] = useTexture(["/data/3d/marte_4k.jpg", "/data/3d/marte_normal_2k.jpg", "/data/3d/gale_color.jpg"]);
  const [color8k, setColor8k] = useState<Texture | null>(null);
  const [gale, setGale] = useState<AlturasGale | null>(null);
  // Regreso desde el terreno: se decide al montar
  const [regresando, setRegresando] = useState(desdeOrbita && !reducido);
  const { camara: inicio, sol } = useMemo(() => encuadre(), []);
  const material = useMaterialPlaneta(color8k ?? color4k, normal, sol);

  // 8K en escritorio, cuando ya se ve el 4K
  useEffect(() => {
    if (!hd) return;
    let vivo = true;
    new TextureLoader().load("/data/3d/marte_8k.jpg", (t) => {
      if (!vivo) return t.dispose();
      t.colorSpace = SRGBColorSpace;
      t.anisotropy = 8;
      setColor8k(t);
    });
    return () => {
      vivo = false;
    };
  }, [hd]);
  useEffect(() => {
    cargarAlturasGale().then(setGale).catch(() => setGale(null));
  }, []);

  useEffect(() => {
    ajustarCamara(camera, 0.002, 400);
  }, [camera]);

  // Órbita baja sobre la zona: su suelo es el del relieve de Gale tal como se pinta en el globo
  const orbita = useMemo(() => {
    let altura = 40;
    if (gale) {
      const u = (ZONA.lon - gale.lon[0]) / (gale.lon[1] - gale.lon[0]);
      const v = (gale.lat[1] - ZONA.lat) / (gale.lat[1] - gale.lat[0]);
      const px = Math.min(gale.ancho - 1, Math.max(0, Math.round(u * (gale.ancho - 1))));
      const py = Math.min(gale.alto - 1, Math.max(0, Math.round(v * (gale.alto - 1))));
      altura += (gale.datos[py * gale.ancho + px] - gale.min) * EXAGERACION;
    }
    return orbitaBaja(altura);
  }, [gale]);

  // ---- Controles: giro y zoom amortiguados; más lentos cuanto más cerca (el suelo no «patina») ----
  const controles = useRef<CameraControlsImpl>(null);
  useEffect(() => {
    const c = controles.current;
    if (!c) return;
    const { ACTION } = CameraControlsImpl;
    c.smoothTime = 0.35;
    c.draggingSmoothTime = 0.16;
    c.minDistance = 1.25;
    c.maxDistance = 6;
    c.dollySpeed = 0.5;
    c.mouseButtons.left = ACTION.ROTATE;
    c.mouseButtons.right = ACTION.NONE;
    c.mouseButtons.middle = ACTION.DOLLY;
    c.mouseButtons.wheel = ACTION.DOLLY;
    c.touches.one = ACTION.TOUCH_ROTATE;
    c.touches.two = ACTION.TOUCH_DOLLY;
    c.touches.three = ACTION.NONE;
    void c.setLookAt(inicio.x, inicio.y, inicio.z, 0, 0, 0, false);
  }, [inicio]);

  // ---- Vuelos: descenso hasta la órbita baja y regreso desde ella ----
  // `lejos` es la vista desde la que se baja (o a la que se vuelve); el avance va de 0 (lejos) a 1 (órbita)
  const vuelo = useRef<{ t0: number; dur: number; lejos: Vector3; sentido: 1 | -1; hecho: boolean } | null>(null);
  useEffect(() => {
    if (!descendiendo) return;
    if (reducido) return onLlegada();
    controles.current?.stop();
    vuelo.current = { t0: performance.now(), dur: DUR.descenso, lejos: camera.position.clone(), sentido: 1, hecho: false };
  }, [descendiendo, reducido, camera, onLlegada]);

  // Cerca de la órbita baja la región de Gale llena la vista: se le quita el tinte del globo y se
  // rellenan las sombras con luz ambiente, hasta verse como en la escena del terreno (misma imagen,
  // mismo sol). Así el fundido entre las dos escenas no cambia de color ni de contraste.
  const parche = useRef<MeshStandardMaterial>(null);
  const ambiente = useRef<AmbientLight>(null);
  const solRef = useRef<DirectionalLight>(null);
  const acercar = (e: number) => {
    const k = Math.min(1, Math.max(0, (e - 0.55) / 0.4));
    const f = k * k * (3 - 2 * k);
    if (parche.current && gale) {
      const [r, g, b] = gale.tinteGlobo;
      parche.current.color.setRGB(r + (LUZ_ORBITA.tinte - r) * f, g + (LUZ_ORBITA.tinte - g) * f, b + (LUZ_ORBITA.tinte - b) * f);
    }
    if (ambiente.current) ambiente.current.intensity = 0.035 + (LUZ_ORBITA.ambiente - 0.035) * f;
    if (solRef.current) solRef.current.intensity = 3.4 + (LUZ_ORBITA.sol - 3.4) * f;
  };

  const mira = useMemo(() => new Vector3(), []);
  const dir = useMemo(() => new Vector3(), []);
  const tmp = useMemo(() => new Vector3(), []);
  const colocar = (lejos: Vector3, e: number) => {
    acercar(e);
    const c = controles.current;
    if (!c) return;
    // Rumbo: se llega pronto sobre Gale (así, cerca del suelo, este ya no corre por debajo).
    // Altura: en escala logarítmica, para que el acercamiento se perciba uniforme.
    const eRumbo = 1 - Math.pow(1 - e, 3);
    dir.copy(lejos).normalize().lerp(tmp.copy(orbita.pos).normalize(), eRumbo).normalize();
    const alto = Math.exp(Math.log(lejos.length() - 1) * (1 - e) + Math.log(orbita.pos.length() - 1) * e);
    dir.multiplyScalar(1 + alto);
    mira.copy(orbita.mira).multiplyScalar(e * e);
    c.minDistance = 0;
    void c.setLookAt(dir.x, dir.y, dir.z, mira.x, mira.y, mira.z, false);
  };

  // Centro de la zona de estudio, pegado al suelo (el relieve de Gale apenas sube ahí: es el fondo del cráter)
  const marca = useMemo(() => vec(ZONA.lat, ZONA.lon, 1.0008), []);
  const marcaRef = useRef<HTMLDivElement>(null);
  const fotogramas = useRef(0);
  useFrame((estado) => {
    // La marca de Gale solo se ve en la cara del globo que mira a la cámara
    const b = marcaRef.current;
    if (b) {
      const visible = tmp.copy(estado.camera.position).sub(marca).dot(marca) > 0.02;
      b.style.opacity = visible ? "1" : "0";
      b.style.visibility = visible ? "visible" : "hidden";
    }
    const c = controles.current;
    if (c) {
      const cerca = Math.min(1, Math.max(0, (c.distance - 1.2) / 2.2));
      c.azimuthRotateSpeed = c.polarRotateSpeed = 0.12 + 0.38 * cerca;
    }

    // Primeros fotogramas: la escena ya se ve. Si se viene del terreno, empieza el regreso.
    if (fotogramas.current < 3) {
      if (regresando) colocar(inicio, 1);
      if (++fotogramas.current === 3) {
        onLista();
        if (regresando) vuelo.current = { t0: performance.now(), dur: DUR.regreso, lejos: inicio.clone(), sentido: -1, hecho: false };
        else onReposo();
      }
      return;
    }

    const v = vuelo.current;
    if (!v || v.hecho) return;
    const k = Math.min(1, (performance.now() - v.t0) / v.dur);
    colocar(v.lejos, v.sentido === 1 ? suave(k) : 1 - suave(k));
    if (k < 1) return;
    v.hecho = true;
    if (v.sentido === 1) return onLlegada();
    // Regreso terminado: el globo vuelve a girarse a mano
    acercar(0);
    if (c) {
      c.minDistance = 1.25;
      void c.setLookAt(inicio.x, inicio.y, inicio.z, 0, 0, 0, false);
    }
    vuelo.current = null;
    setRegresando(false);
    onReposo();
  });

  return (
    <>
      <color attach="background" args={["#000000"]} />
      <ambientLight ref={ambiente} intensity={0.035} />
      <directionalLight ref={solRef} position={sol.clone().multiplyScalar(10).toArray()} intensity={3.4} color="#fff4e8" />
      <Stars radius={120} depth={60} count={6000} factor={3} saturation={0} fade speed={0} />
      <mesh material={material}>
        <sphereGeometry args={[1, 256, 128]} />
      </mesh>
      {gale && <ParcheGale datos={gale} textura={galeHd ?? galeColor} materialRef={parche} />}
      <Atmosfera sol={sol} />

      {/*
        Rótulo con línea guía: el punto está justo sobre la zona de estudio; de él sube una línea fina
        que dobla hacia el nombre. Tocar el nombre (o el punto) baja a la zona de estudio.
      */}
      {mostrarMarca && !descendiendo && !regresando && (
        <Html position={marca.toArray()} zIndexRange={[20, 10]}>
          <div ref={marcaRef} className="relative h-0 w-0 transition-opacity duration-300">
            <svg
              width={LINEA.ancho + 1}
              height={LINEA.alto + 1}
              className="pointer-events-none absolute overflow-visible"
              style={{ left: -0.5, top: -LINEA.alto - 0.5 }}
              aria-hidden
            >
              <path
                d={`M0.5 ${LINEA.alto + 0.5} V0.5 H${LINEA.ancho + 0.5}`}
                fill="none"
                stroke="#ffffff"
                strokeOpacity="0.75"
                strokeWidth="1"
                className="[filter:drop-shadow(0_0_1.5px_rgba(0,0,0,0.9))]"
              />
            </svg>
            <button
              type="button"
              onClick={onIrAGale}
              aria-hidden
              tabIndex={-1}
              className="absolute -left-[11px] -top-[11px] h-[22px] w-[22px] rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#ff8fd8]"
            >
              <span className="absolute left-1/2 top-1/2 h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#060a17] bg-white" />
            </button>
            <button
              type="button"
              onClick={onIrAGale}
              className="group absolute -translate-y-1/2 whitespace-nowrap rounded-[3px] px-1.5 py-1 text-left leading-tight outline-none [text-shadow:0_0_4px_rgba(0,0,0,1),0_0_10px_rgba(0,0,0,0.9)] focus-visible:ring-1 focus-visible:ring-white/70"
              style={{ left: LINEA.ancho + 4, top: -LINEA.alto }}
            >
              <span className="block text-[17px] font-medium text-white group-hover:underline group-hover:decoration-white/60 group-hover:underline-offset-4">
                {t.craterGale}
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-[#e6d8cc]">
                {t.entrarZona}
                <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden className="transition-transform group-hover:translate-x-0.5">
                  <path d="M3 1.5 6 4.5 3 7.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
          </div>
        </Html>
      )}

      <CameraControls ref={controles} makeDefault enabled={!descendiendo && !regresando} />
    </>
  );
}
