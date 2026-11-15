/**
 * Idioma de la interfaz: español o inglés.
 *
 * Es una tienda global (no un contexto de React) para que la lean igual los componentes de la
 * página, los de dentro del lienzo 3D y los de las etiquetas HTML de drei, que viven en otras
 * raíces de React. Al empezar se elige por este orden: `?lang=en|es` en la URL, la última elección
 * guardada en este navegador y el idioma del navegador (español si empieza por «es»; si no, inglés).
 *
 * Los textos están en un diccionario tipado: si falta una traducción, no compila.
 * Regla del equipo en los dos idiomas: nunca «seguro» / "safe"; se dice «alcanzable» / "reachable".
 */
import { useSyncExternalStore } from "react";
import { PROB_MIN_VISIBLE } from "@/lib/constants";

export type Idioma = "es" | "en";
export const IDIOMAS: Idioma[] = ["es", "en"];

const CLAVE = "landstand.idioma";

// ---------------------------------------------------------------------------------------------
// Textos
// ---------------------------------------------------------------------------------------------

const es = {
  // Generales
  cerrar: "Cerrar",
  cancelar: "Cancelar",
  acercar: "Acercar",
  alejar: "Alejar",
  habitat: "Hábitat",
  idioma: "Idioma",
  sinResultado: "sin resultado",
  sinDatos: "sin datos",
  errorCalculo: "No se pudo calcular el escenario. Recarga la página.",
  // Mapa
  cargandoMarte: "Cargando Marte",
  globoMarte: "Globo de Marte",
  volverGlobo: "Volver al globo de Marte",
  craterGale: "Cráter Gale",
  entrarZona: "Entrar a la zona de estudio",
  elegirPunto: "Toca el punto del destino nuevo",
  elegirPuntoAyuda: "Verás su probabilidad al pasar por encima",
  pista3d: "Toca el terreno o un destino para saber si puedes ir y volver",
  pistaGestos: "Arrastra para moverte, rueda para acercarte y botón derecho para girar.",
  pistaGestosTactil: "Un dedo para moverte, pellizco para acercarte y dos dedos para girar.",
  ayudaGestos: "Cómo moverse por el mapa",
  ayudaGestosTitulo: "Cómo moverse",
  gestosRaton: [
    ["Arrastrar", "mover el mapa"],
    ["Rueda", "acercar o alejar hacia el cursor"],
    ["Botón derecho", "girar e inclinar (o Mayús + arrastrar)"],
    ["Clic", "probabilidad y ruta de un punto"],
    ["0", "volver a encuadrar la zona"],
    ["C", "vista 3D o cenital"],
  ] as [string, string][],
  gestosTactil: [
    ["Un dedo", "mover el mapa"],
    ["Pellizco", "acercar o alejar"],
    ["Dos dedos girando", "cambiar el rumbo"],
    ["Dos dedos arriba o abajo", "inclinar la vista"],
    ["Toque", "probabilidad y ruta de un punto"],
  ] as [string, string][],
  pista2d: "Toca cualquier punto para saber si puedes ir y volver",
  vista: "Vista",
  cenital: "Cenital",
  zonaEstudio: "Zona de estudio",
  rolMapa3d: "mapa 3D",
  ayudaMapa3d:
    "Arrastra para moverte; botón derecho, Mayús + arrastrar o dos dedos para girar e inclinar; rueda o pellizco para acercarte. Flechas para elegir un punto de la malla, más y menos para el zoom, 0 para volver a encuadrar, C para la vista cenital.",
  ayudaMapa2d: "Flechas para moverse por el mapa, más y menos para el zoom, Escape para cerrar.",
  resumenCargando: "Mapa de alcance a pie, cargando.",
  resumenCalculando: "Mapa de alcance a pie, calculando el nuevo escenario.",
  resumen: (sol: number, probables: number, total: number) =>
    `Mapa de alcance a pie, sol ${sol}: ${probables} de ${total} destinos de la misión con probabilidad de ir y volver del 50 % o más.`,
  fuentes: "Fuentes",
  textoFuentes3d: "USGS · NASA/JPL-Caltech",
  textoFuentesGlobo: "USGS (Viking, MOLA)",
  norteA: (g: number) => `Norte a ${g} grados`,
  norteArriba: "Norte arriba",
  leyendaTitulo: "Probabilidad de ir y volver",
  leyendaDestino: "Destino",
  leyendaReferencia: "Referencia",
  referencia: "Punto de referencia",
  destinoNuevo: "Destino nuevo",
  ponleNombre: "Ponle nombre en el panel",
  // Ficha del punto
  puntoSeleccionado: "Punto seleccionado",
  sinResultadoTodavia: "Sin resultado todavía",
  sinResultadoCorto: "Sin resultado",
  vioCuriosity: "Lo que vio Curiosity",
  verFoto: (titulo: string) => `Ver lo que vio Curiosity: ${titulo}`,
  tipoFoto: { "360": "360°", panoramica: "Panorámica", foto: "Foto" },
  tareasPrevistas: "Tareas previstas",
  masEnPanel: (n: number) => `y ${n} más en el panel`,
  distanciaHabitat: "Distancia al hábitat",
  ruta: "Ruta",
  aprox: " (aprox.)",
  ida: "Ida",
  vuelta: "Vuelta",
  sinRuta: "Sin ruta",
  recorridoIda: "Recorrido de ida",
  pendienteMax: "Pendiente máx.",
  agregarMision: "Añadir a los destinos de la misión",
  // Panel
  mapaAria: "Mapa de alcance",
  panelAria: "Panel de control",
  esconderPanel: "Esconder el panel",
  mostrarPanel: "Mostrar el panel",
  calculandoEscenario: "Calculando el escenario",
  panelTitulo: "Salida a pie",
  panelAyuda: "El color del mapa es la probabilidad de ir y volver con esta salida.",
  // Panel · qué sol
  solTitulo: "Sol de la misión",
  solPregunta: "¿Qué sol?",
  solAyuda: "Llegan desentrenados; cada sol recuperan forma y el alcance crece.",
  solValor: (s: number) => `Sol ${s}`,
  solAnterior: "Sol anterior",
  solSiguiente: "Sol siguiente",
  // Panel · quién sale
  caminaTitulo: "¿Quién sale?",
  tripulacionAria: "Tripulación que sale",
  salen: (n: number) => (n === 1 ? "1 persona" : n === 2 ? "Pareja" : `Grupo de ${n}`),
  caminaAyudaSolo: "Sale una sola persona: el mapa muestra su alcance.",
  caminaAyudaGrupo: "Van juntos: un punto solo cuenta si todos pueden ir y volver.",
  alcanceLlano: "Alcance hoy en llano",
  limita: (nombre: string, km: string) => `limita ${nombre}: ${km} km`,
  perfiles: "Perfiles",
  tripulante: (id: string, nombre: string, km: string) => `${id} ${nombre}, ${km} km en llano hoy`,
  perfilTitulo: (rol: string, vo2: string, masa: number, km: string) =>
    `${rol} · VO₂ previo ${vo2} mL/kg/min · ${masa} kg · hoy en llano puede alejarse ${km} km y volver`,
  vo2Previo: "VO₂ previo",
  hoyEnLlano: "hoy en llano",
  alMenosUno: "Tiene que salir al menos una persona",
  notaPerfiles:
    "VO₂ previo en mL/kg/min y masa: perfiles fijos, en Marte no se pueden medir. Alcance en llano: lo que cada uno puede alejarse y volver ese sol, con los valores centrales del modelo.",
  // Panel · a qué ritmo
  intensidadTitulo: "Intensidad de la marcha",
  intensidadPregunta: "¿A qué ritmo?",
  intensidadUnidad: "de su capacidad aeróbica",
  intensidadValor: (p: string) => `${p} de su capacidad aeróbica`,
  intensidadAyuda: "A más ritmo, más lejos llegan; sostenible hasta el 40 %.",
  ritmoSuave: "suave",
  ritmoExigente: "exigente",
  // Panel · destinos
  destinosTitulo: "Destinos de la misión",
  irVolverAyuda: "Probabilidad de ir a pie hasta el destino, hacer la tarea y volver al hábitat con esta salida.",
  colDistancia: "Distancia",
  colDesnivel: "Desnivel",
  colIrVolver: "Ir y volver",
  desnivelTexto: (m: number) =>
    m > 0 ? `${m} m más alto que el hábitat` : m < 0 ? `${-m} m más bajo que el hábitat` : "A la misma altura que el hábitat",
  verEnMapa: "Ver en el mapa y sus tareas",
  sinDestinos: "Sin destinos. Añade uno en el mapa.",
  contextoAnadido: (f: number, c: number) => `Destino añadido por la tripulación · celda ${f}, ${c}`,
  sinTareas: "Sin tareas registradas.",
  quitarMision: "Quitar de la misión",
  filaDestino: (id: string, nombre: string, km: string, desnivel: string, p: string, abierto: boolean) =>
    `${id} ${nombre}: ${km} km, desnivel ${desnivel}, probabilidad de ir y volver ${p}. ${abierto ? "Ocultar tareas" : "Ver en el mapa y sus tareas"}.`,
  sinCalcular: "sin calcular",
  tocaPuntoMapa: "Toca el punto en el mapa",
  tocaPuntoAyuda: "Al pasar por encima verás su probabilidad",
  anadirEnMapa: "Añadir destino en el mapa",
  celda: (f: number, c: number) => `celda ${f}, ${c}`,
  nombre: "Nombre",
  nombrePlaceholder: "Nombre del destino",
  quitarTarea: (t: string) => `Quitar tarea: ${t}`,
  tareaPlaceholder: "Añadir tarea…",
  anadirTarea: "Añadir tarea",
  guardarDestino: "Guardar destino",
  creditos:
    "Datos: USGS Astrogeology (DEM 1 m) · HiRISE, NASA/JPL‑Caltech/UArizona · Curiosity, NASA/JPL‑Caltech/MSSS",
  evento: "NASA Space Apps Challenge 2026 · Madrid",
  // Fuentes
  fuentesTitulo: "Fuentes oficiales",
  fuentesAyuda: "Datos públicos de la NASA y del USGS que usa el mapa",
  volverMapa: "Volver al mapa",
  datos: "Datos",
  credito: "Crédito",
  lugar: "Lugar",
  tamano: "Tamaño",
  proyeccion: "Proyección",
  limites: "Límites",
  fotosNota: "Imágenes de dominio público del NASA Photojournal, reducidas para la web. Son los puntos de referencia del mapa.",
  colImagen: "Imagen",
  colCamaraSol: "Cámara · sol",
  // Visor de fotos
  fichaOficial: "Ficha oficial",
  fichaOficialAria: "Ficha oficial de la imagen",
  tituloOficial: "Título oficial (NASA)",
  camara: "Cámara",
  sol: "Sol",
  tomada: "Tomada",
  publicada: "Publicada",
  imagenes: "Imágenes",
  verNasa: "Ver en la web de la NASA",
  notaDescripcion: "Descripción: resumen en español del pie de foto oficial. Imagen de dominio público.",
  mirando: (cardinal: string, g: number) => `Mirando al ${cardinal}, ${g} grados`,
  ayudaGiraCorta: "Arrastra para girar",
  ayudaMueveCorta: "Arrastra o pellizca",
  ayudaGira: "Arrastra para girar 360°",
  ayudaMueve: "Arrastra para moverte",
  rueda: "rueda",
  cardinales: ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"],
  // Franjas de probabilidad (de mayor a menor)
  franjas: {
    muy: { nombre: "Muy probable", frase: "Muy probable ir y volver" },
    probable: { nombre: "Probable", frase: "Probable ir y volver" },
    poco: { nombre: "Poco probable", frase: "Poco probable ir y volver" },
    fuera: { nombre: "Fuera de alcance", frase: "Fuera de alcance" },
  },
};

type Textos = typeof es;

const en: Textos = {
  cerrar: "Close",
  cancelar: "Cancel",
  acercar: "Zoom in",
  alejar: "Zoom out",
  habitat: "Habitat",
  idioma: "Language",
  sinResultado: "no result",
  sinDatos: "no data",
  errorCalculo: "The scenario could not be computed. Reload the page.",
  cargandoMarte: "Loading Mars",
  globoMarte: "Mars globe",
  volverGlobo: "Back to the Mars globe",
  craterGale: "Gale crater",
  entrarZona: "Enter the study area",
  elegirPunto: "Tap the point for the new destination",
  elegirPuntoAyuda: "Hover to see its probability",
  pista3d: "Tap the ground or a destination to see if you can get there and back",
  pistaGestos: "Drag to move, scroll to zoom and right-drag to rotate.",
  pistaGestosTactil: "One finger to move, pinch to zoom and two fingers to rotate.",
  ayudaGestos: "How to move around the map",
  ayudaGestosTitulo: "Getting around",
  gestosRaton: [
    ["Drag", "move the map"],
    ["Wheel", "zoom toward the cursor"],
    ["Right button", "rotate and tilt (or Shift + drag)"],
    ["Click", "probability and route for a point"],
    ["0", "frame the study area again"],
    ["C", "3D or top-down view"],
  ],
  gestosTactil: [
    ["One finger", "move the map"],
    ["Pinch", "zoom in or out"],
    ["Two-finger twist", "change heading"],
    ["Two fingers up or down", "tilt the view"],
    ["Tap", "probability and route for a point"],
  ],
  pista2d: "Tap any point to see if you can get there and back",
  vista: "View",
  cenital: "Top-down",
  zonaEstudio: "Study area",
  rolMapa3d: "3D map",
  ayudaMapa3d:
    "Drag to move; right button, Shift + drag or two fingers to rotate and tilt; wheel or pinch to zoom. Arrow keys to pick a grid point, plus and minus to zoom, 0 to frame the area again, C for the top-down view.",
  ayudaMapa2d: "Arrow keys to move around the map, plus and minus to zoom, Escape to close.",
  resumenCargando: "Walking reach map, loading.",
  resumenCalculando: "Walking reach map, computing the new scenario.",
  resumen: (sol, probables, total) =>
    `Walking reach map, sol ${sol}: ${probables} of ${total} mission destinations with a round-trip probability of 50% or more.`,
  fuentes: "Sources",
  textoFuentes3d: "USGS · NASA/JPL-Caltech",
  textoFuentesGlobo: "USGS (Viking, MOLA)",
  norteA: (g) => `North at ${g} degrees`,
  norteArriba: "North up",
  leyendaTitulo: "Round-trip probability",
  leyendaDestino: "Destination",
  leyendaReferencia: "Landmark",
  referencia: "Landmark",
  destinoNuevo: "New destination",
  ponleNombre: "Name it in the panel",
  puntoSeleccionado: "Selected point",
  sinResultadoTodavia: "No result yet",
  sinResultadoCorto: "No result",
  vioCuriosity: "What Curiosity saw",
  verFoto: (titulo) => `See what Curiosity saw: ${titulo}`,
  tipoFoto: { "360": "360°", panoramica: "Panorama", foto: "Photo" },
  tareasPrevistas: "Planned tasks",
  masEnPanel: (n) => `and ${n} more in the panel`,
  distanciaHabitat: "Distance to habitat",
  ruta: "Route",
  aprox: " (approx.)",
  ida: "Out",
  vuelta: "Back",
  sinRuta: "No route",
  recorridoIda: "Outbound distance",
  pendienteMax: "Max. slope",
  agregarMision: "Add to mission destinations",
  mapaAria: "Reach map",
  panelAria: "Control panel",
  esconderPanel: "Hide panel",
  mostrarPanel: "Show panel",
  calculandoEscenario: "Computing scenario",
  panelTitulo: "Walk plan",
  panelAyuda: "The map's color is the round-trip probability for this walk.",
  solTitulo: "Mission sol",
  solPregunta: "Which sol?",
  solAyuda: "They land deconditioned; each sol they recover and their reach grows.",
  solValor: (s) => `Sol ${s}`,
  solAnterior: "Previous sol",
  solSiguiente: "Next sol",
  caminaTitulo: "Who goes out?",
  tripulacionAria: "Crew going out",
  salen: (n) => (n === 1 ? "1 person" : n === 2 ? "Pair" : `Group of ${n}`),
  caminaAyudaSolo: "One person goes out: the map shows their reach.",
  caminaAyudaGrupo: "They stay together: a point counts only if everyone can go and return.",
  alcanceLlano: "Reach today on flat ground",
  limita: (nombre, km) => `limited by ${nombre}: ${km} km`,
  perfiles: "Profiles",
  tripulante: (id, nombre, km) => `${id} ${nombre}, ${km} km on flat ground today`,
  perfilTitulo: (rol, vo2, masa, km) =>
    `${rol} · pre-flight VO₂ ${vo2} mL/kg/min · ${masa} kg · today on flat ground can go ${km} km out and return`,
  vo2Previo: "Pre-flight VO₂",
  hoyEnLlano: "today on flat ground",
  alMenosUno: "At least one person has to go out",
  notaPerfiles:
    "Pre-flight VO₂ in mL/kg/min and body mass: fixed profiles, they can't be measured on Mars. Flat-ground reach: how far each can go and return that sol, with the model's central values.",
  intensidadTitulo: "Walking intensity",
  intensidadPregunta: "At what pace?",
  intensidadUnidad: "of their aerobic capacity",
  intensidadValor: (p) => `${p} of their aerobic capacity`,
  intensidadAyuda: "A faster pace reaches farther; sustainable up to 40%.",
  ritmoSuave: "easy",
  ritmoExigente: "hard",
  destinosTitulo: "Mission destinations",
  irVolverAyuda: "Probability of walking to the destination, doing the task and returning to the habitat on this walk.",
  colDistancia: "Distance",
  colDesnivel: "Elevation",
  colIrVolver: "Round trip",
  desnivelTexto: (m) => (m > 0 ? `${m} m higher than the habitat` : m < 0 ? `${-m} m lower than the habitat` : "Level with the habitat"),
  verEnMapa: "Show it on the map and its tasks",
  sinDestinos: "No destinations. Add one on the map.",
  contextoAnadido: (f, c) => `Added by the crew · cell ${f}, ${c}`,
  sinTareas: "No tasks yet.",
  quitarMision: "Remove from mission",
  filaDestino: (id, nombre, km, desnivel, p, abierto) =>
    `${id} ${nombre}: ${km} km, elevation ${desnivel}, round-trip probability ${p}. ${abierto ? "Hide tasks" : "Show it on the map and its tasks"}.`,
  sinCalcular: "not computed",
  tocaPuntoMapa: "Tap the point on the map",
  tocaPuntoAyuda: "Hover to see its probability",
  anadirEnMapa: "Add destination on the map",
  celda: (f, c) => `cell ${f}, ${c}`,
  nombre: "Name",
  nombrePlaceholder: "Destination name",
  quitarTarea: (t) => `Remove task: ${t}`,
  tareaPlaceholder: "Add a task…",
  anadirTarea: "Add task",
  guardarDestino: "Save destination",
  creditos:
    "Data: USGS Astrogeology (1 m DEM) · HiRISE, NASA/JPL‑Caltech/UArizona · Curiosity, NASA/JPL‑Caltech/MSSS",
  evento: "NASA Space Apps Challenge 2026 · Madrid",
  fuentesTitulo: "Official sources",
  fuentesAyuda: "Public NASA and USGS data used by the map",
  volverMapa: "Back to the map",
  datos: "Data",
  credito: "Credit",
  lugar: "Place",
  tamano: "Size",
  proyeccion: "Projection",
  limites: "Bounds",
  fotosNota: "Public-domain images from the NASA Photojournal, reduced for the web. They are the map's landmarks.",
  colImagen: "Image",
  colCamaraSol: "Camera · sol",
  fichaOficial: "Official record",
  fichaOficialAria: "Official image record",
  tituloOficial: "Official title (NASA)",
  camara: "Camera",
  sol: "Sol",
  tomada: "Taken",
  publicada: "Published",
  imagenes: "Images",
  verNasa: "View on NASA's website",
  notaDescripcion: "Description: summary of the official caption. Public-domain image.",
  mirando: (cardinal, g) => `Facing ${cardinal}, ${g} degrees`,
  ayudaGiraCorta: "Drag to rotate",
  ayudaMueveCorta: "Drag or pinch",
  ayudaGira: "Drag to rotate 360°",
  ayudaMueve: "Drag to move",
  rueda: "wheel",
  cardinales: ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"],
  franjas: {
    muy: { nombre: "Very likely", frase: "Round trip very likely" },
    probable: { nombre: "Likely", frase: "Round trip likely" },
    poco: { nombre: "Unlikely", frase: "Round trip unlikely" },
    fuera: { nombre: "Out of reach", frase: "Out of reach" },
  },
};

// ---------------------------------------------------------------------------------------------
// Formatos y franjas
// ---------------------------------------------------------------------------------------------

export type IdFranja = "muy" | "probable" | "poco" | "fuera";

export interface Franja {
  id: IdFranja;
  /** Límite inferior (incluido) */
  desde: number;
  nombre: string;
  /** Frase completa para la ficha */
  frase: string;
}

/** Límites de las franjas, de mayor a menor: coinciden con los contornos (90 % y 50 %) y con el 2 % visible. */
const LIMITES: [IdFranja, number][] = [
  ["muy", 0.9],
  ["probable", 0.5],
  ["poco", PROB_MIN_VISIBLE],
  ["fuera", 0],
];

function crear(idioma: Idioma) {
  const t = idioma === "es" ? es : en;
  const local = idioma === "es" ? "es-ES" : "en-US";
  const fEntero = new Intl.NumberFormat(local, { maximumFractionDigits: 0 });
  const fKm = new Intl.NumberFormat(local, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fGrado = new Intl.NumberFormat(local, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  /** En español el signo va separado («29 %»); en inglés, pegado («29%»). */
  const signo = idioma === "es" ? " %" : "%";
  const franjas: Franja[] = LIMITES.map(([id, desde]) => ({ id, desde, ...t.franjas[id] }));
  return {
    idioma,
    t,
    /** 0.2899 → «29 %» / "29%". Por debajo del 1 % se muestra «<1 %» para no decir «0 %». */
    pct: (p: number) => (p > 0 && p < 0.005 ? `<1${signo}` : `${fEntero.format(Math.round(p * 100))}${signo}`),
    /** Solo el número y el signo de un porcentaje entero ya calculado (marcas de los deslizadores, contornos). */
    pctEntero: (n: number) => `${n}${signo}`,
    distancia: (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${fKm.format(m / 1000)} km`),
    latLon: (lat: number, lon: number) =>
      `${fGrado.format(Math.abs(lat))}° ${lat < 0 ? "S" : "N"}, ${fGrado.format(Math.abs(lon))}° ${lon < 0 ? (idioma === "es" ? "O" : "W") : "E"}`,
    /** Número con la coma (es) o el punto (en) decimal. */
    num: (v: number, decimales = 1) => (idioma === "es" ? v.toFixed(decimales).replace(".", ",") : v.toFixed(decimales)),
    franjas,
    franjaDe: (p: number) => franjas.find((f) => p >= f.desde) ?? franjas[franjas.length - 1],
  };
}

export type Traductor = ReturnType<typeof crear>;

const TRADUCTORES: Record<Idioma, Traductor> = { es: crear("es"), en: crear("en") };

/** Elige la versión de un dato en el idioma: el objeto base está en español y `en` lleva lo traducido. */
export function enIdioma<T extends { en?: object }>(dato: T, idioma: Idioma): T {
  return idioma === "en" && dato.en ? { ...dato, ...dato.en } : dato;
}

// ---------------------------------------------------------------------------------------------
// Tienda
// ---------------------------------------------------------------------------------------------

let actual: Idioma | null = null;
const avisos = new Set<() => void>();

function inicial(): Idioma {
  try {
    const url = new URLSearchParams(window.location.search).get("lang");
    if (url === "es" || url === "en") return url;
  } catch {
    /* sin URL */
  }
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (guardado === "es" || guardado === "en") return guardado;
  } catch {
    /* sin almacenamiento */
  }
  try {
    const preferidos = navigator.languages?.length ? navigator.languages : [navigator.language];
    return preferidos[0]?.toLowerCase().startsWith("es") ? "es" : "en";
  } catch {
    return "es";
  }
}

function leer(): Idioma {
  if (actual === null) actual = inicial();
  return actual;
}

export function ponerIdioma(idioma: Idioma) {
  if (idioma === actual) return;
  actual = idioma;
  try {
    localStorage.setItem(CLAVE, idioma);
  } catch {
    /* sin almacenamiento: dura hasta recargar */
  }
  avisos.forEach((f) => f());
}

function suscribir(aviso: () => void) {
  avisos.add(aviso);
  return () => avisos.delete(aviso);
}

/** El traductor del idioma actual; el componente se vuelve a renderizar al cambiar de idioma. */
export function useIdioma(): Traductor {
  const idioma = useSyncExternalStore(suscribir, leer, () => "es" as Idioma);
  return TRADUCTORES[idioma];
}

/** Para código fuera de React (p. ej. pintar en un lienzo). */
export const traductor = (idioma: Idioma = leer()) => TRADUCTORES[idioma];
