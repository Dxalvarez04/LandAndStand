"use client";

/**
 * Cielo diurno de Marte: color «butterscotch» por el polvo en suspensión, más claro hacia el horizonte,
 * con el halo azulado que el polvo forma alrededor del sol (dispersión hacia delante) y el disco solar.
 * La niebla de la escena usa el color del horizonte para que el terreno se funda con la bruma.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BackSide, Color, type Mesh, ShaderMaterial, Vector3 } from "three";

export const HORIZONTE = "#cfa985";
export const CENIT = "#9c7457";

/** Dirección hacia el sol: oestesuroeste a 32° (la hora de las imágenes HiRISE, ~15 h local). */
export function direccionSol(azimutGrados = 250, elevacionGrados = 32): Vector3 {
  const az = (azimutGrados * Math.PI) / 180;
  const el = (elevacionGrados * Math.PI) / 180;
  // escena: x = este, y = arriba, z = sur
  return new Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
}

export default function Cielo({ sol }: { sol: Vector3 }) {
  const ref = useRef<Mesh>(null);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uSol: { value: sol.clone() },
          uHorizonte: { value: new Color(HORIZONTE) },
          uCenit: { value: new Color(CENIT) },
          uHalo: { value: new Color("#c7d3df") },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_Position = p.xyww; // siempre al fondo
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uSol, uHorizonte, uCenit, uHalo;
          varying vec3 vDir;
          void main() {
            vec3 d = normalize(vDir);
            float h = clamp(d.y, -0.2, 1.0);
            vec3 c = mix(uHorizonte, uCenit, pow(max(h, 0.0), 0.55));
            c = mix(c, uHorizonte * 0.82, smoothstep(0.0, -0.2, h)); // bajo el horizonte: bruma
            float s = max(dot(d, normalize(uSol)), 0.0);
            c = mix(c, uHalo, pow(s, 18.0) * 0.55);          // aureola azulada
            c += vec3(1.0, 0.97, 0.92) * pow(s, 900.0) * 3.0; // disco solar
            gl_FragColor = vec4(c, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      }),
    [sol],
  );

  // La cúpula acompaña a la cámara: nunca se llega a su borde
  useFrame(({ camera }) => {
    ref.current?.position.copy(camera.position);
  });

  return (
    <mesh ref={ref} material={material} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[1000, 48, 24]} />
    </mesh>
  );
}
