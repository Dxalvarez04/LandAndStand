/**
 * Fuentes oficiales de lo que muestra el mapa. Los créditos son los que exige la especificación (§12)
 * y los datos de cada producto salen de su ficha oficial (lista de Katrina, comprobada el 14/11/2026).
 * Ver docs/fuentes.md.
 */

export interface FuenteOficial {
  id: "terreno" | "imagen" | "posiciones" | "fotos" | "globo" | "relieveGlobo" | "relieveGale";
  /** Para qué se usa en el mapa */
  uso: string;
  /** Nombre oficial del producto */
  producto: string;
  /** Autoría y publicación, tal como figuran en la ficha oficial */
  autoria: string;
  /** Datos técnicos relevantes */
  detalle: string;
  /** Crédito que hay que mostrar (especificación §12) */
  credito: string;
  url: string;
  /** Texto del enlace */
  sitio: string;
}

export const FUENTES: FuenteOficial[] = [
  {
    id: "terreno",
    uso: "Terreno: pendientes, distancias y relieve",
    producto: "Mars MSL Gale Merged DEM 1m (v3)",
    autoria: "Timothy Parker y Fred J. Calef III · USGS Astrogeology Science Center, 20/10/2016",
    detalle:
      "Modelo de elevación a 1 m/px creado por el equipo de la MSL para evaluar el aterrizaje en Gale. Une modelos HRSC, CTX y HiRISE ajustados al altímetro MOLA. Aquí se reduce a celdas de 32 m.",
    credito: "USGS Astrogeology, MSL Gale Merged DEM 1 m v3 (Calef y Parker, 2016)",
    url: "https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m",
    sitio: "USGS Astropedia",
  },
  {
    id: "imagen",
    uso: "Imagen de fondo",
    producto: "Mosaico HiRISE en color de Gale (78 quads, 25 cm)",
    autoria:
      "USGS Astrogeology Science Center, julio de 2025 · fusionado con el MSL Gale Merged Orthophoto Mosaic 25cm (Calef y Parker, 2016)",
    detalle:
      "Tiras en color de HiRISE (Mars Reconnaissance Orbiter) georrectificadas y fusionadas con el ortomosaico HiRISE de la misión, a 25 cm/px. Se recorta a la zona de estudio con el norte arriba.",
    credito: "HiRISE, NASA/JPL-Caltech/University of Arizona",
    url: "https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_orthophoto_mosaic_25cm",
    sitio: "USGS Astropedia",
  },
  {
    id: "posiciones",
    uso: "Posición de los destinos T1–T6",
    producto: "Paradas de Curiosity (MSL waypoints)",
    autoria: "NASA/JPL-Caltech · capa de posiciones del mapa MMGIS de la misión",
    detalle:
      "1389 paradas del rover con sol, posición y altura, en la misma proyección que el mapa. Sirven para situar los seis sitios que visitó Curiosity.",
    credito: "NASA/JPL-Caltech, archivo de posiciones de Curiosity",
    url: "https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json",
    sitio: "mars.nasa.gov · MSL_waypoints.json",
  },
  {
    id: "fotos",
    uso: "Lo que vio Curiosity en cada destino",
    producto: "NASA Photojournal (una imagen por destino, con su número PIA)",
    autoria: "NASA/JPL-Caltech/MSSS · imágenes de dominio público",
    detalle: "Mosaicos de Mastcam y autorretratos de MAHLI tomados por Curiosity en cada sitio.",
    credito: "NASA/JPL-Caltech/MSSS, con su número PIA",
    url: "https://photojournal.jpl.nasa.gov/",
    sitio: "NASA Photojournal",
  },
  {
    id: "globo",
    uso: "Globo de Marte: color",
    producto: "Mars Viking Colorized Global Mosaic 232m (MDIM 2.1 en color)",
    autoria: "NASA Ames · USGS Astrogeology Science Center, 02/02/2009",
    detalle:
      "Mosaico global de las sondas Viking, versión coloreada del MDIM 2.1 controlado. Se usa reducido (4K y 8K) para el globo y, a más detalle, para la región de Gale. Leído del servicio de mapas del USGS.",
    credito: "NASA/JPL/USGS, Viking MDIM 2.1 en color",
    url: "https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m",
    sitio: "USGS Astropedia",
  },
  {
    id: "relieveGlobo",
    uso: "Globo de Marte: relieve (sombreado)",
    producto: "Mars MGS MOLA DEM 463m",
    autoria: "Goddard Space Flight Center (MOLA, Mars Global Surveyor) · USGS Astrogeology Science Center",
    detalle:
      "Topografía global del altímetro láser MOLA (Smith et al., 2001). Solo da el sombreado del globo, exagerado para que se lea a esa escala; no se usa para ningún cálculo.",
    credito: "MOLA Science Team, NASA/GSFC · USGS Astrogeology",
    url: "https://astrogeology.usgs.gov/search/map/mars_mgs_mola_dem_463m",
    sitio: "USGS Astropedia",
  },
  {
    id: "relieveGale",
    uso: "Región de Gale en relieve sobre el globo",
    producto: "Mars MGS MOLA – MEX HRSC Blended DEM Global 200m (v2)",
    autoria: "DLR, NASA, Goddard Space Flight Center · USGS Astrogeology Science Center, 31/01/2018 (Fergason, Laura y Hare, 2017)",
    detalle:
      "Modelo global que combina MOLA con el estéreo de HRSC (Mars Express) a 200 m/px. Da el relieve del cráter y del monte Sharp durante el descenso, exagerado ×3; no se usa para ningún cálculo.",
    credito: "USGS Astrogeology, HRSC-MOLA Blended DEM 200 m v2 (Fergason et al., 2017)",
    url: "https://astrogeology.usgs.gov/search/map/mars_mgs_mola_mex_hrsc_blended_dem_global_200m",
    sitio: "USGS Astropedia",
  },
];

/** Zona de estudio (especificación §1). */
export const ZONA = {
  lugar: "Cráter Gale, Marte · parte baja del monte Sharp",
  tamano: "3,52 × 3,52 km · 110 × 110 celdas de 32 m",
  proyeccion: "Equirectangular de Marte, meridiano central 0°, esfera de radio 3 396 190 m",
  limites: "x de 8141,0 a 8144,52 km · y de −282,0 a −278,48 km",
};
