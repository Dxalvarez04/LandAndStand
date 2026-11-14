import type { Tripulante } from "@/lib/contract";

export interface PerfilAstronauta extends Tripulante {
  id: string;
  nombre: string;
  rol: string;
  arquetipo: string;
  descripcion: string;
  vo2pre: number;
  masa: number;
  /** Constante opcional de déficit aeróbico (por defecto 0.16) */
  delta?: number;
  /** Constante opcional de recuperación aeróbica en soles (por defecto 15) */
  tauA?: number;
  /** Constante opcional de recuperación vestibular en soles (por defecto 0.95) */
  tauB?: number;
  /** Pendiente máxima asintótica en grados (por defecto 25°) */
  thLim?: number;
  /** Déficit angular inicial en grados (por defecto 7.5°) */
  dTh?: number;
}

export const PERFILES_ASTRONAUTAS: PerfilAstronauta[] = [
  {
    id: "A1",
    nombre: "Dra. Elena Vega",
    rol: "Comandante de Misión",
    arquetipo: "Atleta de élite / Maratón",
    descripcion:
      "Superdotada cardiovascular. Cumple el requisito de la NASA desde el Sol 1. Bajo consumo en vatios y máximo alcance individual (> 2,4 km).",
    vo2pre: 55.0,
    masa: 68,
    delta: 0.12,
    tauA: 10,
    tauB: 0.8,
  },
  {
    id: "A2",
    nombre: "Dr. Marcus Vance",
    rol: "Especialista de Misión",
    arquetipo: "Astronauta estándar / Medio",
    descripcion:
      "Perfil canónico de la ISS y valor central del modelo. En Sol 1 está desacondicionado (34,5 mL/kg/min) y recupera el estándar NASA en Sol 7.",
    vo2pre: 40.6,
    masa: 75,
    delta: 0.16,
    tauA: 15,
    tauB: 0.95,
  },
  {
    id: "A3",
    nombre: "Ing. Lars Lindholm",
    rol: "Ingeniero de Carga y Hábitat",
    arquetipo: "Fuerza / Masa pesada",
    descripcion:
      "Gran potencia aeróbica pero masa elevada. Su alto consumo metabólico en vatios pone a prueba las baterías y el soporte vital del traje.",
    vo2pre: 44.0,
    masa: 92,
    delta: 0.15,
    tauA: 14,
    tauB: 1.0,
  },
  {
    id: "A4",
    nombre: "Dra. Yasmine Al-Mansoor",
    rol: "Geóloga de Terreno",
    arquetipo: "Ligera / Alta eficiencia",
    descripcion:
      "Masa corporal mínima (54 kg) y consumo muy bajo. Máxima autonomía energética del soporte vital en travesías científicas largas.",
    vo2pre: 46.0,
    masa: 54,
    delta: 0.14,
    tauA: 12,
    tauB: 0.9,
  },
  {
    id: "A5",
    nombre: "Dr. Alexei Morozov",
    rol: "Astrobiólogo",
    arquetipo: "Límite NASA / Sedentario",
    descripcion:
      "En el límite reglamentario previo (36,5 mL/kg/min). Tras el aterrizaje cae a 31,0 mL/kg/min y requiere casi un mes para ser apto en EVAs.",
    vo2pre: 36.5,
    masa: 78,
    delta: 0.18,
    tauA: 24,
    tauB: 1.2,
  },
  {
    id: "A6",
    nombre: "Dra. Chloe Bennett",
    rol: "Piloto y Navegación",
    arquetipo: "Déficit de Equilibrio",
    descripcion:
      "Excelente capacidad cardiovascular pero alta afectación sensoriomotora y vestibular. Bloqueada ante colinas empinadas los primeros soles.",
    vo2pre: 48.0,
    masa: 70,
    delta: 0.14,
    tauA: 12,
    tauB: 3.2,
    thLim: 24,
    dTh: 10.0,
  },
  {
    id: "A7",
    nombre: "Téc. Kenji Sato",
    rol: "Especialista en Robótica",
    arquetipo: "Alto desacondicionamiento",
    descripcion:
      "Caída cardiovascular pronunciada por la ingravidez (-24%). En salidas en pareja o en grupo actúa como el cuello de botella que limita al equipo.",
    vo2pre: 33.0,
    masa: 86,
    delta: 0.24,
    tauA: 28,
    tauB: 1.5,
  },
  {
    id: "A8",
    nombre: "Dra. Sarah O'Connor",
    rol: "Médico de Vuelo",
    arquetipo: "Readaptación ultrarrápida",
    descripcion:
      "Curva de adaptación acelerada (tauA = 6 soles). Al Sol 3 ya se encuentra al 95% de su capacidad funcional previa al vuelo.",
    vo2pre: 43.0,
    masa: 65,
    delta: 0.11,
    tauA: 6,
    tauB: 0.5,
  },
];

export const PERFIL_POR_DEFECTO = PERFILES_ASTRONAUTAS[1]; // Dr. Marcus Vance (central)

export function buscarPerfil(id: string): PerfilAstronauta | undefined {
  return PERFILES_ASTRONAUTAS.find((p) => p.id === id);
}
