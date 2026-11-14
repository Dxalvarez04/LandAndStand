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
  pista2d: "Toca cualquier punto para saber si puedes ir y volver",
  vista: "Vista",
  cenital: "Cenital",
  zonaEstudio: "Zona de estudio",
  rolMapa3d: "mapa 3D",
  ayudaMapa3d:
    "Arrastra para moverte; botón derecho, Mayús + arrastrar o dos dedos para girar; rueda o pellizco para el zoom. Flechas para moverte por la malla, C para la vista cenital.",
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
  solTitulo: "Sol de la misión",
  solAyuda: "Días en Marte desde el aterrizaje",
  solValor: (s: number) => `Sol ${s}`,
  caminaTitulo: "Quién camina",
  modo: { tripulante: "Tripulante", pareja: "Pareja", grupo: "Grupo" },
  elegirTripulantes: "Elegir tripulantes",
  cambiar: "Cambiar",
  alMenosUno: "Tiene que salir al menos una persona",
  notaPerfiles: "VO₂ previo en mL/kg/min y masa. Perfiles fijos: en Marte no se pueden medir.",
  intensidadTitulo: "Intensidad de la marcha",
  intensidadAyuda: "Parte del VO₂ máximo que se usa al caminar",
  destinosTitulo: "Destinos de la misión",
  destinosAyuda: "Toca uno para verlo en el mapa",
  colDestino: "Destino",
  colDistancia: "Distancia",
  colDesnivel: "Desnivel",
  colIrVolver: "Ir y volver",
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
    "Terreno: USGS Astrogeology, DEM 1 m · Imagen: HiRISE, NASA/JPL‑Caltech/Univ. of Arizona · Posiciones y fotos: Curiosity, NASA/JPL‑Caltech/MSSS",
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
  pista2d: "Tap any point to see if you can get there and back",
  vista: "View",
  cenital: "Top-down",
  zonaEstudio: "Study area",
  rolMapa3d: "3D map",
  ayudaMapa3d:
    "Drag to move; right button, Shift + drag or two fingers to rotate; wheel or pinch to zoom. Arrow keys to move across the grid, C for the top-down view.",
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
  solTitulo: "Mission sol",
  solAyuda: "Days on Mars since landing",
  solValor: (s) => `Sol ${s}`,
  caminaTitulo: "Who walks",
  modo: { tripulante: "Solo", pareja: "Pair", grupo: "Group" },
  elegirTripulantes: "Choose crew",
  cambiar: "Change",
  alMenosUno: "At least one person has to go out",
  notaPerfiles: "Pre-flight VO₂ in mL/kg/min and body mass. Fixed profiles: they can't be measured on Mars.",
  intensidadTitulo: "Walking intensity",
  intensidadAyuda: "Share of maximum VO₂ used while walking",
  destinosTitulo: "Mission destinations",
  destinosAyuda: "Tap one to see it on the map",
  colDestino: "Destination",
  colDistancia: "Distance",
  colDesnivel: "Elevation",
  colIrVolver: "Round trip",
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
    "Terrain: USGS Astrogeology, 1 m DEM · Image: HiRISE, NASA/JPL‑Caltech/Univ. of Arizona · Positions and photos: Curiosity, NASA/JPL‑Caltech/MSSS",
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
