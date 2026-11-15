"use client";

/**
 * Cielo diurno de Marte: color «butterscotch» por el polvo en suspensión, más claro hacia el horizonte,
 * con el halo azulado que el polvo forma alrededor del sol (dispersión hacia delante) y el disco solar.
 * El color sale de lib/mapa3d/atmosfera.ts, el mismo que usa la bruma del terreno: el relieve lejano
 * se funde exactamente con el cielo.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BackSide, type Mesh, ShaderMaterial } from "three";
import { GLSL_ATMOSFERA, UNIFORMES_ATMOSFERA } from "@/lib/mapa3d/atmosfera";

export default function Cielo() {
  const ref = useRef<Mesh>(null);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        depthTest: false,
        fog: false,
        uniforms: UNIFORMES_ATMOSFERA,
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_Position = p.xyww; // siempre al fondo
          }`,
        fragmentShader: /* glsl */ `
          ${GLSL_ATMOSFERA}
          varying vec3 vDir;
          void main() {
            vec3 d = normalize(vDir);
            // Bajo el horizonte (solo se ve más allá del borde del relieve): la bruma
            vec3 c = colorCielo(vec3(d.x, max(d.y, 0.0), d.z));
            float s = max(dot(d, uSol), 0.0);
            c += vec3(1.0, 0.97, 0.92) * pow(s, 900.0) * 3.0; // disco solar
            c *= 1.0 + tramado(gl_FragCoord.xy) * 0.014;
            gl_FragColor = vec4(c, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      }),
    [],
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
