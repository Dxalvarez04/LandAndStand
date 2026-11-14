/**
 * Lo que vio Curiosity en cada destino. Imágenes de dominio público descargadas de images.nasa.gov
 * y reducidas para la web (public/fotos). Títulos, fechas, créditos, número de imágenes y
 * orientación salen de la ficha oficial de cada PIA (images-api.nasa.gov y NASA Photojournal);
 * la descripción es un resumen fiel en español del pie oficial. Ver docs/es/fuentes.md.
 *
 * tipo:
 *  - "360": panorámica completa; en el visor se gira sin fin.
 *  - "panoramica": mosaico ancho pero no completo; se desplaza de lado a lado.
 *  - "foto": imagen normal; se amplía y se mueve.
 */
import type { IdDestino } from "@/lib/contract";

export interface FotoDestino {
  src: string;
  mini: string;
  pia: string;
  /** Título corto en español */
  titulo: string;
  /** Título oficial publicado por la NASA */
  tituloOficial: string;
  /** Resumen en español del pie de foto oficial */
  descripcion: string;
  tipo: "360" | "panoramica" | "foto";
  camara: "Mastcam" | "MAHLI";
  sol: string;
  /** Fecha en que se tomaron las imágenes, si el pie oficial la da */
  tomada?: string;
  /** Fecha de publicación oficial */
  publicada: string;
  /** Imágenes combinadas en el mosaico, si el pie oficial lo dice */
  imagenes?: number;
  /** Crédito oficial de esta imagen */
  credito: string;
  /**
   * Rumbo (grados desde el norte) en el borde izquierdo y derecho de la imagen, según el pie oficial.
   * Sin este dato el visor no muestra rumbo: no se inventa.
   */
  orientacion?: { izq: number; der: number };
  /** Ficha oficial */
  url: string;
  /** Textos en inglés */
  en?: Partial<Pick<FotoDestino, "titulo" | "descripcion" | "tomada" | "publicada">>;
}

export const CREDITO_FOTOS = "NASA/JPL-Caltech/MSSS";

export const FOTOS: Record<IdDestino, FotoDestino> = {
  T1: {
    src: "/fotos/T1-PIA11241.jpg",
    mini: "/fotos/T1-PIA11241-mini.jpg",
    pia: "PIA11241",
    titulo: "Panorámica junto a una duna activa (Ogunquit Beach)",
    tituloOficial: "Panorama with Active Linear Dune in Gale Crater, Mars",
    descripcion:
      "Mosaico de 360° sobre una parte de las dunas Bagnold. En el centro se ve la superficie oscura y ondulada de una duna lineal; en primer plano, la roca de la formación Murray, sedimentos de lagos de hace miles de millones de años, y partes del rover. Ogunquit Beach está en el flanco noroeste de la parte baja del monte Sharp, que domina el horizonte en el centro de la vista.",
    tipo: "360",
    camara: "Mastcam",
    sol: "1647",
    tomada: "24 y 25 de marzo de 2017",
    publicada: "4 de mayo de 2017",
    imagenes: 115,
    credito: "NASA/JPL-Caltech/MSSS",
    // «Northwest is at both ends of this full-circle panorama; southeast is at the center»
    orientacion: { izq: 315, der: 675 },
    url: "https://photojournal.jpl.nasa.gov/catalog/PIA11241",
     en: {
      titulo: "Panorama next to an active dune (Ogunquit Beach)",
      descripcion:
        "360° mosaic over part of the Bagnold dunes. In the middle is the dark, rippled surface of a linear dune; in the foreground, Murray formation bedrock — lake sediments billions of years old — and parts of the rover. Ogunquit Beach is on the northwestern flank of lower Mount Sharp, which dominates the horizon in the center of the view.",
      tomada: "March 24–25, 2017",
      publicada: "May 4, 2017",
    },
  },
  T2: {
    src: "/fotos/T2-PIA21718.jpg",
    mini: "/fotos/T2-PIA21718-mini.jpg",
    pia: "PIA21718",
    titulo: "Ireson Hill, en el monte Sharp",
    tituloOficial: "'Ireson Hill' on Mount Sharp, Mars",
    descripcion:
      "Montículo oscuro de unos 5 m de altura sobre los estratos rojizos de la formación Murray, en la parte baja del monte Sharp, cerca de una duna lineal que Curiosity estudió en febrero de 2017. El horizonte lejano es parte del borde del cráter Gale. Los colores están ajustados a cómo se verían con luz de día en la Tierra.",
    tipo: "panoramica",
    camara: "Mastcam",
    sol: "1598",
    tomada: "2 de febrero de 2017",
    publicada: "11 de julio de 2017",
    imagenes: 41,
    credito: "NASA/JPL-Caltech/MSSS",
    // «The view extends from west-southwest on the left to north-northwest on the right»
    orientacion: { izq: 247.5, der: 337.5 },
    url: "https://photojournal.jpl.nasa.gov/catalog/PIA21718",
     en: {
      titulo: "Ireson Hill, on Mount Sharp",
      descripcion:
        "Dark mound about 5 m tall on the reddish layers of the Murray formation, on lower Mount Sharp, near a linear dune that Curiosity studied in February 2017. The distant horizon is part of the rim of Gale crater. Colors are adjusted to approximate daylight on Earth.",
      tomada: "February 2, 2017",
      publicada: "July 11, 2017",
    },
  },
  T3: {
    src: "/fotos/T3-PIA23042.jpg",
    mini: "/fotos/T3-PIA23042-mini.jpg",
    pia: "PIA23042",
    titulo: "Panorámica de 360° de Rock Hall, en Vera Rubin Ridge",
    tituloOficial: "Curiosity's 360 Panorama of \"Rock Hall\"",
    descripcion:
      "Panorámica desde Vera Rubin Ridge. Se ve el último punto de perforación del rover en la cresta y la región de arcillas que exploraría durante el año siguiente. Los colores están ajustados a cómo se verían las rocas y la arena con luz de día en la Tierra.",
    tipo: "360",
    camara: "Mastcam",
    sol: "2265",
    tomada: "19 de diciembre de 2018",
    publicada: "8 de febrero de 2019",
    imagenes: 122,
    credito: "NASA/JPL-Caltech",
    url: "https://photojournal.jpl.nasa.gov/catalog/PIA23042",
     en: {
      titulo: "360° panorama of Rock Hall, on Vera Rubin Ridge",
      descripcion:
        "Panorama from Vera Rubin Ridge. It shows the rover's last drilling site on the ridge and the clay-bearing region it would explore over the following year. Colors are adjusted to approximate how the rocks and sand would look in daylight on Earth.",
      tomada: "December 19, 2018",
      publicada: "February 8, 2019",
    },
  },
  T4: {
    src: "/fotos/T4-PIA23240.jpg",
    mini: "/fotos/T4-PIA23240-mini.jpg",
    pia: "PIA23240",
    titulo: "Autorretrato de Curiosity en Aberlady y Kilmarie",
    tituloOficial: "Curiosity's Selfie at \"Aberlady\" and \"Kilmarie\"",
    descripcion:
      "Autorretrato tomado con MAHLI, la cámara del extremo del brazo robótico; el brazo se ha borrado digitalmente al unir las imágenes. Abajo a la izquierda del rover están las perforaciones Aberlady y Kilmarie, sus sitios de perforación número 20 y 21.",
    tipo: "foto",
    camara: "MAHLI",
    sol: "2405",
    tomada: "12 de mayo de 2019",
    publicada: "29 de mayo de 2019",
    imagenes: 57,
    credito: "NASA/JPL-Caltech/MSSS",
    url: "https://photojournal.jpl.nasa.gov/catalog/PIA23240",
     en: {
      titulo: "Curiosity's selfie at Aberlady and Kilmarie",
      descripcion:
        "Self-portrait taken with MAHLI, the camera at the end of the robotic arm; the arm was digitally removed when the images were stitched. Below and left of the rover are the Aberlady and Kilmarie drill holes, its 20th and 21st drilling sites.",
      tomada: "May 12, 2019",
      publicada: "May 29, 2019",
    },
  },
  T5: {
    src: "/fotos/T5-PIA25046.jpg",
    mini: "/fotos/T5-PIA25046-mini.jpg",
    pia: "PIA25046",
    titulo: "Vista de Mastcam alrededor de la perforación Edinburgh",
    tituloOficial: "Curiosity Mastcam's View of Edinburgh",
    descripcion:
      "Escena alrededor de la perforación Edinburgh, tomada con el rover aparcado sobre el Greenheugh Pediment. Al fondo asoma la cima del monte Sharp, de unos 5 km de altura, que Curiosity asciende desde 2014. Los colores están ajustados a cómo se verían a simple vista con luz de día en la Tierra.",
    tipo: "foto",
    camara: "Mastcam",
    sol: "2711–2712",
    tomada: "22 y 23 de marzo de 2020",
    publicada: "25 de enero de 2022",
    credito: "NASA/JPL-Caltech/MSSS",
    url: "https://photojournal.jpl.nasa.gov/catalog/PIA25046",
     en: {
      titulo: "Mastcam view around the Edinburgh drill site",
      descripcion:
        "Scene around the Edinburgh drill hole, taken with the rover parked on the Greenheugh Pediment. In the background rises the summit of Mount Sharp, about 5 km high, which Curiosity has been climbing since 2014. Colors are adjusted to approximate what the eye would see in daylight on Earth.",
      tomada: "March 22–23, 2020",
      publicada: "January 25, 2022",
    },
  },
  T6: {
    src: "/fotos/T6-PIA24173.jpg",
    mini: "/fotos/T6-PIA24173-mini.jpg",
    pia: "PIA24173",
    titulo: "Autorretrato de Curiosity en Mary Anning",
    tituloOficial: "Curiosity's Selfie at the 'Mary Anning' location on Mars",
    descripcion:
      "Autorretrato con MAHLI en Mary Anning, a la salida de la región de Glen Torridon, donde las condiciones antiguas habrían sido favorables para la vida, si alguna vez existió. Curiosity tomó allí tres muestras de roca perforada: Mary Anning, Mary Anning 3 y Groken.",
    tipo: "foto",
    camara: "MAHLI",
    sol: "2922",
    publicada: "12 de noviembre de 2020",
    credito: "NASA/JPL-Caltech/MSSS",
    url: "https://photojournal.jpl.nasa.gov/catalog/PIA24173",
     en: {
      titulo: "Curiosity's selfie at Mary Anning",
      descripcion:
        "MAHLI self-portrait at Mary Anning, at the exit of the Glen Torridon region, where ancient conditions would have been favorable for life, if it ever existed. Curiosity took three drilled rock samples there: Mary Anning, Mary Anning 3 and Groken.",
      publicada: "November 12, 2020",
    },
  },
};
