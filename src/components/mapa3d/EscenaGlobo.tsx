"use client";

/**
 * Globo de Marte (radio 1):
 *   - color: mosaico Viking MDIM 2.1 (USGS), 4K y, en escritorio, 8K cuando termina de cargar
 *     (`colorHd`);
 *   - relieve: normales del DEM MOLA (relieve ×6 solo en el sombreado);
 *   - atmósfera: capa fina, ocre de día y azulada en el terminador (en Marte los atardeceres son azules);
 *   - región de Gale en relieve (DEM HRSC-MOLA 200 m, ×3) con su imagen (mosaico CTX coloreado),
 *     fundida con el globo;
 *   - estrellas y sol lejano.
 *
 * La región de Gale en relieve solo se ve al bajar: aparece cuando la cámara ya está más cerca de lo
 * que se llega a mano. Mirando el globo no se nota ningún recuadro más nítido que el resto.
 *
 * Descenso y regreso: la cámara baja hasta la órbita baja sobre la zona de estudio (~100 km, casi a
 * plomo, norte arriba) y avisa (onLlegada) sin pararse: llega con el zoom en marcha y el terreno lo
 * continúa (ver lib/mapa3d/transito.ts). Al volver, el globo empieza donde va el terreno
 * (desdeOrbita) y se aleja hasta la vista de inicio.
 *
 * Portada (`portada`): la cámara y el sol no los mueve la persona sino el scroll de la página
 * (`recorridoRef`, ver lib/portada/escenas.ts), con inercia. La vista de inicio del globo es el último
 * plano de la portada (la cara llena con Gale): al salir de la portada (se ha tocado el planeta) la
 * cámara termina de llegar a ella (`asiento`) y el globo ya se puede girar. El descenso arranca
 * desde donde esté la cámara, con su punto de mira, su giro y su sol, y los lleva a los de la órbita
 * baja (el sol, al de la escena del terreno) mientras baja.
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
  type AmbientLight,
  type DirectionalLight,
  Vector2,
  Vector3,
  type PerspectiveCamera,
  type Texture,
} from "three";
import { R_MARTE } from "@/lib/constants";
import { cargarAlturasGale, type AlturasGale } from "@/lib/mapa3d/alturas";
import { HORIZONTE } from "@/lib/mapa3d/atmosfera";
import { ORBITA, suave } from "@/lib/mapa3d/camara";
import { GALE, latLonAVector, ZONA } from "@/lib/mapa3d/coordenadas";
import { ajustarCamara, ponerArriba, ponerSRGB } from "@/lib/mapa3d/imperativo";
import { frenar, lanzar, pendiente, TRANSITO, type FotoTransito } from "@/lib/mapa3d/transito";
import { copiarPose, mezclarPoses, nuevaPose, poseEn, poseGlobo, suavizar, ULTIMA } from "@/lib/portada/escenas";
import { useIdioma } from "@/lib/i18n";

const COLOR_DIA = new Color("#d6a27c");
/** Línea guía del rótulo de Gale (px): sube desde el punto y dobla hacia el nombre */
const LINEA = { alto: 78, ancho: 26 };
const COLOR_CREPUSCULO = new Color("#7d9cc6");

const vec = (lat: number, lon: number, r = 1) => new Vector3(...latLonAVector(lat, lon, r));
/**
 * Duración (ms) del descenso hasta la órbita baja (según lo lejos que se empiece: `base` más `porLog`
 * por cada unidad logarítmica de altura) y del regreso desde ella
 */
const DUR = { base: 700, porLog: 300, regreso: 1800 };
/**
 * Altura de la cámara (en radios de Marte) entre la que aparece la región de Gale en relieve. A mano
 * no se baja de 0,25: mirando el globo no se ve.
 */
const PARCHE = { desde: 0.24, hasta: 0.085 };
/**
 * Más abajo, cuando la región ya llena la vista, se le quita el tinte del globo: hasta esta altura
 * (radios), algo por encima de la órbita baja, donde ya tiene el color del terreno
 */
const SIN_TINTE = 0.034;
/** Relieve de la región de Gale sobre el globo (×3 para que se lea desde lejos) */
const EXAGERACION = 3;
/**
 * Luz y color de la región de Gale en la órbita baja: los de la escena del terreno vista desde ahí.
 * `velo`: la bruma que el terreno tiene entre la cámara y el suelo (aclara las sombras).
 */
const LUZ_ORBITA = { tinte: 1.0, ambiente: 1.1, sol: 2.6, velo: 0.07 };
/**
 * Portada: inercia de la cámara tras el scroll (1/s; más alto = sigue antes al scroll), duración (s)
 * del paso entre la portada y el globo de la demo (en los dos sentidos: la cámara se acerca y Marte
 * gira) y giro lento del planeta mientras se lee (amplitud en radianes y periodo en s; se apaga al
 * llegar a la demo).
 */
const PORTADA = { inercia: 3.2, mezcla: 2.8, deriva: 0.09, periodo: 90 };
/** Avance del descenso (0 = lejos, 1 = órbita baja) en el que el sol ya es el de la escena del terreno */
const SOL_LISTO = 0.75;
const EJE_Y = new Vector3(0, 1, 0);

/** Desde dónde sale un vuelo hacia la órbita baja (o adónde vuelve): posición, punto de mira, giro y sol. */
interface Desde {
  lejos: Vector3;
  mira0: Vector3;
  arriba0: Vector3;
  sol0: Vector3;
}

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

/**
 * Dirección del sol en la órbita baja (Gale iluminado desde el oeste, terminador a la derecha): la
 * que tiene el globo al cambiar a la escena del terreno.
 */
function solOrbita() {
  const g = vec(GALE.lat, GALE.lon).normalize();
  const arriba = new Vector3(0, 1, 0);
  const derecha = new Vector3().crossVectors(g.clone().negate(), arriba).normalize();
  return g.clone().multiplyScalar(0.55).add(derecha.clone().multiplyScalar(-0.85)).add(arriba.clone().multiplyScalar(0.18)).normalize();
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
 * `materialRef`: empieza transparente; al bajar aparece y se le quita el tinte (ver `acercar`). Se
 * dibuja siempre, aunque no se vea: así su imagen y su programa ya están en la GPU cuando aparece.
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
      {/* dispose={null}: la imagen es también la del terreno; al desmontar el globo no se suelta de la GPU */}
      <meshStandardMaterial
        ref={materialRef}
        map={mapa}
        color={tinte}
        vertexColors
        transparent
        opacity={0}
        emissive={HORIZONTE}
        emissiveIntensity={0}
        roughness={1}
        metalness={0}
        depthWrite={false}
        dispose={null}
      />
    </mesh>
  );
}

interface Props {
  descendiendo: boolean;
  /** Se entra desde el terreno: empieza en la órbita baja y se aleja hasta la vista de inicio */
  desdeOrbita: boolean;
  /** Mosaico del planeta a 8K (escritorio), si ya ha cargado. Lo guarda el mapa: se carga una vez */
  colorHd: Texture | null;
  reducido: boolean;
  /** Imagen de la región de Gale a más resolución, si ya ha cargado */
  galeHd: Texture | null;
  /** Foto del cambio de escena: al volver del terreno, el globo empieza donde va ella */
  foto: FotoTransito;
  /** La cámara ha llegado a la órbita baja; `ritmo`: el del zoom en ese momento (0 = parada) */
  onLlegada: (ritmo: number) => void;
  onIrAGale: () => void;
  /** La escena ya se ve (primeros fotogramas dibujados) */
  onLista: () => void;
  /** El globo ya se puede girar (al empezar, o al terminar el regreso) */
  onReposo: () => void;
  mostrarMarca: boolean;
  /** La cámara y el sol los lleva el scroll de la portada (no se puede girar a mano) */
  portada: boolean;
  /** Posición en el recorrido de la portada (0 … ULTIMA), según el scroll. La escribe la portada. */
  recorridoRef: { current: number };
}

export default function EscenaGlobo({
  descendiendo,
  desdeOrbita,
  colorHd,
  reducido,
  galeHd,
  foto,
  onLlegada,
  onIrAGale,
  onLista,
  onReposo,
  mostrarMarca,
  portada,
  recorridoRef,
}: Props) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const aspecto = useThree((s) => s.size.width / Math.max(1, s.size.height));
  // Los textos se calculan aquí: el contenido de <Html> vive en otra raíz de React
  const { t } = useIdioma();
  const [color4k, normal, galeColor] = useTexture(["/data/3d/marte_4k.jpg", "/data/3d/marte_normal_2k.jpg", "/data/3d/gale_color.jpg"]);
  const [gale, setGale] = useState<AlturasGale | null>(null);
  // Regreso desde el terreno: se decide al montar
  const [regresando, setRegresando] = useState(desdeOrbita && !reducido);
  // Vista de inicio del globo de la demo (lib/portada/escenas.ts), con el sol que le toca.
  // `sol` es la dirección del sol que usan la luz, el planeta y la atmósfera: cambia con la portada y
  // en los vuelos (los materiales guardan este mismo vector).
  const inicio = useMemo(() => poseGlobo(aspecto).pos.clone(), [aspecto]);
  const { solCanon, solInicio, sol } = useMemo(() => {
    const solInicio = poseGlobo(1.6).sol.clone();
    return { solCanon: solOrbita(), solInicio, sol: solInicio.clone() };
  }, []);
  const material = useMaterialPlaneta(colorHd ?? color4k, normal, sol);

  useEffect(() => {
    cargarAlturasGale().then(setGale).catch(() => setGale(null));
  }, []);

  useEffect(() => {
    ajustarCamara(camera, 0.002, 400);
    // La escena del terreno usa la misma cámara: se la deja con el norte arriba
    return () => ponerArriba(camera, EJE_Y);
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
  const inicioRef = useRef(inicio);
  useEffect(() => {
    const c = controles.current;
    if (!c) return;
    const { ACTION } = CameraControlsImpl;
    c.smoothTime = 0.35;
    c.draggingSmoothTime = 0.16;
    c.minDistance = 1.25;
    c.dollySpeed = 0.5;
    c.mouseButtons.left = ACTION.ROTATE;
    c.mouseButtons.right = ACTION.NONE;
    c.mouseButtons.middle = ACTION.DOLLY;
    c.mouseButtons.wheel = ACTION.DOLLY;
    c.touches.one = ACTION.TOUCH_ROTATE;
    c.touches.two = ACTION.TOUCH_DOLLY;
    c.touches.three = ACTION.NONE;
    // Solo al montar: con la portada, la cámara la coloca el scroll desde el primer fotograma
    const p = inicioRef.current;
    void c.setLookAt(p.x, p.y, p.z, 0, 0, 0, false);
  }, []);
  // En vertical la vista de inicio queda más lejos (el planeta tiene que caber de ancho)
  useEffect(() => {
    inicioRef.current = inicio;
    if (controles.current) controles.current.maxDistance = Math.max(6, inicio.length() * 1.35);
  }, [inicio]);

  // ---- Vuelos: descenso hasta la órbita baja y regreso desde ella ----
  // `desde` es la vista desde la que se baja (o a la que se vuelve); el avance va de 0 (lejos) a 1 (órbita).
  // El descenso termina con el zoom en marcha (pendiente `m`) y el regreso arranca con él, desde `e0`.
  const vuelo = useRef<{ t0: number; dur: number; desde: Desde; sentido: 1 | -1; m: number; e0: number; fundido: number; hecho: boolean } | null>(null);
  const altoOrbita = orbita.pos.length() - 1;
  /** Unidades logarítmicas de altura entre `lejos` y la órbita baja */
  const largo = (lejos: Vector3) => Math.max(0.2, Math.log((lejos.length() - 1) / altoOrbita));
  /** La vista de inicio del globo como salida (o llegada) de un vuelo */
  const desdeInicio = (): Desde => ({ lejos: inicio.clone(), mira0: new Vector3(), arriba0: EJE_Y.clone(), sol0: solInicio.clone() });
  useEffect(() => {
    if (!descendiendo) return;
    if (reducido) return onLlegada(0);
    const c = controles.current;
    c?.stop();
    // Desde donde esté la cámara: la vista de inicio, la que haya dejado la persona o la portada
    const desde: Desde = {
      lejos: camera.position.clone(),
      mira0: c ? c.getTarget(new Vector3()) : new Vector3(),
      arriba0: camera.up.clone(),
      sol0: sol.clone(),
    };
    const dur = DUR.base + DUR.porLog * largo(desde.lejos);
    vuelo.current = { t0: performance.now(), dur, desde, sentido: 1, m: pendiente(TRANSITO.ritmo, dur, largo(desde.lejos)), e0: 1, fundido: 0, hecho: false };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [descendiendo, reducido, camera, onLlegada]);

  // Al acercarse aparece la región de Gale en relieve (ver PARCHE) y, a la vez, sube la luz ambiente
  // (con la luz dura del globo el cráter quedaría negro). Mientras se ven sus bordes conserva el tinte
  // del globo, así que no se nota un recuadro de otro color; cuando ya llena la vista se le quita,
  // hasta verse como en la escena del terreno (misma imagen, mismo sol, y un velo de bruma que
  // aclara las sombras): el fundido entre las dos escenas no cambia de color ni de contraste.
  const parche = useRef<MeshStandardMaterial>(null);
  const ambiente = useRef<AmbientLight>(null);
  const solRef = useRef<DirectionalLight>(null);
  const acercar = (alto: number) => {
    const rampa = (desde: number, hasta: number) => {
      const k = Math.min(1, Math.max(0, (desde - alto) / (desde - hasta)));
      return k * k * (3 - 2 * k);
    };
    const f = rampa(PARCHE.desde, PARCHE.hasta);
    const g = rampa(PARCHE.hasta, SIN_TINTE);
    const m = parche.current;
    if (m && gale) {
      const [r, v, b] = gale.tinteGlobo;
      m.color.setRGB(r + (LUZ_ORBITA.tinte - r) * g, v + (LUZ_ORBITA.tinte - v) * g, b + (LUZ_ORBITA.tinte - b) * g);
      m.emissiveIntensity = LUZ_ORBITA.velo * f;
      m.opacity = f;
    }
    if (ambiente.current) ambiente.current.intensity = 0.035 + (LUZ_ORBITA.ambiente - 0.035) * f;
    if (solRef.current) solRef.current.intensity = 3.4 + (LUZ_ORBITA.sol - 3.4) * f;
  };

  /** Mueve el sol (la luz, el planeta y la atmósfera comparten el vector `sol`). */
  const ponerSol = (v: Vector3) => {
    sol.copy(v);
    solRef.current?.position.copy(sol).multiplyScalar(10);
  };

  const mira = useMemo(() => new Vector3(), []);
  const dir = useMemo(() => new Vector3(), []);
  const tmp = useMemo(() => new Vector3(), []);
  const tmpSol = useMemo(() => new Vector3(), []);
  const arriba = useMemo(() => new Vector3(), []);
  const colocar = (desde: Desde, e: number) => {
    const { lejos } = desde;
    // Altura: en escala logarítmica, para que el acercamiento se perciba uniforme
    const alto = Math.exp(Math.log(lejos.length() - 1) * (1 - e) + Math.log(altoOrbita) * e);
    acercar(alto);
    // El sol pasa al de la órbita baja antes de llegar (el de la escena del terreno)
    ponerSol(tmpSol.copy(desde.sol0).lerp(solCanon, suavizar(e / SOL_LISTO)).normalize());
    const c = controles.current;
    if (!c) return;
    // Rumbo y punto de mira: se llega pronto sobre Gale y ahí se quedan quietos; cerca del suelo ya
    // solo cambia la altura (el suelo no corre por debajo y el cambio de escena es un zoom puro)
    const eRumbo = 1 - Math.pow(1 - e, 3);
    dir.copy(lejos).normalize().lerp(tmp.copy(orbita.pos).normalize(), eRumbo).normalize();
    dir.multiplyScalar(1 + alto);
    mira.copy(desde.mira0).lerp(orbita.mira, eRumbo);
    // Si la portada dejó la cámara girada, se endereza a la vez (en la órbita, norte arriba)
    if (desde.arriba0.distanceToSquared(EJE_Y) > 1e-12) {
      ponerArriba(camera, eRumbo >= 1 ? EJE_Y : arriba.copy(desde.arriba0).lerp(EJE_Y, eRumbo).normalize());
      c.updateCameraUp();
    }
    c.minDistance = 0;
    void c.setLookAt(dir.x, dir.y, dir.z, mira.x, mira.y, mira.z, false);
  };

  // ---- Portada: la cámara sigue al scroll con inercia ----
  // `s`: posición del recorrido ya suavizada. Al volver a la portada desde el globo se mezcla la
  // vista que había con la del scroll (`mezcla` 0 → 1) para no dar un salto.
  const paisaje = useRef({ listo: false, mezclar: false, s: 0, mezcla: 1, t: 0, capturada: nuevaPose(), objetivo: nuevaPose(), actual: nuevaPose() });
  // Al salir de la portada (se ha tocado el planeta), la cámara pasa del último plano de la portada a
  // la vista de inicio del globo: se acerca y Marte gira un poco. Después el globo se gira a mano.
  const asiento = useRef({ k: 1, desde: nuevaPose(), hasta: nuevaPose(), actual: nuevaPose() });
  const [asentando, setAsentando] = useState(false);
  const portadaPrevia = useRef(portada);
  useEffect(() => {
    // Vuelve a la portada desde el globo: se arranca desde la vista actual
    if (portada && !portadaPrevia.current) {
      paisaje.current.listo = false;
      paisaje.current.mezclar = true;
    }
    // Sale de la portada: se asienta en la vista de inicio
    const c = controles.current;
    if (!portada && portadaPrevia.current && c) {
      const a = asiento.current;
      a.k = 0;
      a.desde.pos.copy(camera.position);
      c.getTarget(a.desde.mira);
      a.desde.arriba.copy(camera.up);
      a.desde.sol.copy(sol);
      setAsentando(true);
    }
    portadaPrevia.current = portada;
  }, [portada, camera, sol]);
  const asentar = (dt: number) => {
    const c = controles.current;
    const a = asiento.current;
    if (!c) return;
    a.k = Math.min(1, a.k + Math.min(dt, 0.1) / PORTADA.mezcla);
    poseGlobo(aspecto, a.hasta);
    const p = mezclarPoses(a.desde, a.hasta, suave(a.k), a.actual);
    if (a.k >= 1) {
      // Ya en la vista de inicio, tal cual (norte arriba, mirando al centro)
      ponerArriba(camera, EJE_Y);
      c.updateCameraUp();
      c.minDistance = 1.25;
      void c.setLookAt(inicio.x, inicio.y, inicio.z, 0, 0, 0, false);
      c.update(0);
      ponerSol(solInicio);
      setAsentando(false);
      return;
    }
    ponerArriba(camera, p.arriba);
    c.updateCameraUp();
    c.minDistance = 0;
    void c.setLookAt(p.pos.x, p.pos.y, p.pos.z, p.mira.x, p.mira.y, p.mira.z, false);
    c.update(0);
    ponerSol(p.sol);
  };
  const conducirPortada = (dt: number) => {
    const c = controles.current;
    if (!c) return;
    const st = paisaje.current;
    if (!st.listo) {
      st.listo = true;
      st.s = recorridoRef.current;
      st.mezcla = st.mezclar ? 0 : 1;
      if (st.mezclar) {
        st.mezclar = false;
        st.capturada.pos.copy(camera.position);
        c.getTarget(st.capturada.mira);
        st.capturada.arriba.copy(camera.up);
        st.capturada.sol.copy(sol);
      }
    }
    const paso = Math.min(dt, 0.1);
    st.s += (recorridoRef.current - st.s) * (1 - Math.exp(-paso * PORTADA.inercia));
    poseEn(st.s, aspecto, st.objetivo);
    // Mientras se lee, el planeta gira despacio sobre su eje (cámara y sol giran juntos alrededor de él)
    if (!reducido) {
      st.t += paso;
      const angulo = PORTADA.deriva * Math.sin((2 * Math.PI * st.t) / PORTADA.periodo) * (1 - suavizar((st.s - (ULTIMA - 1)) / 0.8));
      if (angulo !== 0) {
        st.objetivo.pos.applyAxisAngle(EJE_Y, angulo);
        st.objetivo.mira.applyAxisAngle(EJE_Y, angulo);
        st.objetivo.arriba.applyAxisAngle(EJE_Y, angulo);
        st.objetivo.sol.applyAxisAngle(EJE_Y, angulo);
      }
    }
    if (st.mezcla < 1) {
      st.mezcla = Math.min(1, st.mezcla + paso / PORTADA.mezcla);
      mezclarPoses(st.capturada, st.objetivo, suave(st.mezcla), st.actual);
    } else copiarPose(st.objetivo, st.actual);
    const p = st.actual;
    ponerArriba(camera, p.arriba);
    c.updateCameraUp();
    c.minDistance = 0;
    void c.setLookAt(p.pos.x, p.pos.y, p.pos.z, p.mira.x, p.mira.y, p.mira.z, false);
    c.update(0);
    ponerSol(p.sol);
  };

  // Centro de la zona de estudio, pegado al suelo (el relieve de Gale apenas sube ahí: es el fondo del cráter)
  const marca = useMemo(() => vec(ZONA.lat, ZONA.lon, 1.0008), []);
  const marcaRef = useRef<HTMLDivElement>(null);
  const fotogramas = useRef(0);
  useFrame((estado, delta) => {
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

    // Primeros fotogramas: la escena ya se ve. Si se viene del terreno, empieza el regreso: desde
    // donde va la foto del terreno (que ha seguido alejándose mientras se montaba el globo) y a su ritmo.
    if (fotogramas.current < 3) {
      if (regresando) colocar(desdeInicio(), 1);
      else if (portada) conducirPortada(delta);
      if (++fotogramas.current === 3) {
        const { z, v } = foto.estado();
        onLista();
        if (regresando) {
          const total = largo(inicio);
          const e0 = Math.min(1, Math.max(0.2, 1 + z / total));
          const ahora = performance.now();
          vuelo.current = {
            t0: ahora,
            dur: DUR.regreso,
            desde: desdeInicio(),
            sentido: -1,
            m: pendiente(-v, DUR.regreso, e0 * total),
            e0,
            fundido: ahora + TRANSITO.fundido,
            hecho: false,
          };
        } else onReposo();
      }
      return;
    }

    const v = vuelo.current;
    // Sin vuelo en marcha, en la portada la cámara la lleva el scroll
    if ((!v || v.hecho) && portada && !descendiendo) return conducirPortada(delta);
    if ((!v || v.hecho) && asiento.current.k < 1 && !descendiendo) return asentar(delta);
    if (!v || v.hecho) return;
    const ahora = performance.now();
    const k = Math.min(1, (ahora - v.t0) / v.dur);
    const e = v.sentido === 1 ? lanzar(k, v.m) : v.e0 * (1 - frenar(k, v.m));
    colocar(v.desde, e);
    // Durante el fundido, la foto del terreno se aleja a la par que el globo
    if (ahora < v.fundido) foto.seguir(-(1 - e) * largo(v.desde.lejos));
    if (k < 1) return;
    v.hecho = true;
    if (v.sentido === 1) {
      // La cámara, ya en la órbita baja (los controles la colocan al actualizarse): la foto sale de ahí
      c?.update(0);
      return onLlegada((v.m * largo(v.desde.lejos) * 1000) / v.dur);
    }
    // Regreso terminado: el globo vuelve a girarse a mano
    colocar(desdeInicio(), 0);
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
      {/* El rótulo aparece cuando la cámara ya ha llegado (no durante el paso desde la portada) */}
      {mostrarMarca && !descendiendo && !regresando && !asentando && (
        <Html position={marca.toArray()} zIndexRange={[20, 10]}>
          <div ref={marcaRef} className="relative h-0 w-0 transition-opacity duration-300 motion-safe:animate-[aparecer_0.6s_ease-out]">
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

      <CameraControls ref={controles} makeDefault enabled={!descendiendo && !regresando && !portada && !asentando} />
    </>
  );
}
