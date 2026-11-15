/**
 * Fuentes oficiales de lo que muestra el mapa. Los créditos son los que exige la especificación (§12)
 * y los datos de cada producto salen de su ficha oficial (lista de Katrina, comprobada el 14/11/2026).
 * Ver docs/es/fuentes.md.
 */

export interface FuenteOficial {
  id: "terreno" | "imagen" | "entorno" | "region" | "posiciones" | "fotos" | "globo" | "relieveGlobo" | "relieveGale";
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
  /** Textos en inglés */
  en?: Partial<Pick<FuenteOficial, "uso" | "producto" | "autoria" | "detalle" | "credito">>;
}

export const FUENTES: FuenteOficial[] = [
  {
    id: "terreno",
    uso: "Terreno: pendientes, distancias y relieve",
    producto: "Mars MSL Gale Merged DEM 1m (v3)",
    autoria: "Timothy Parker y Fred J. Calef III · USGS Astrogeology Science Center, 20/10/2016",
    detalle:
      "Modelo de elevación a 1 m/px creado por el equipo de la MSL para evaluar el aterrizaje en Gale. Une modelos HRSC, CTX y HiRISE ajustados al altímetro MOLA. Para el cálculo se reduce a celdas de 32 m; el relieve 3D lo usa a 16 m en la zona y a 64 m en su entorno (33 × 57 km).",
    credito: "USGS Astrogeology, MSL Gale Merged DEM 1 m v3 (Calef y Parker, 2016)",
    url: "https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m",
    sitio: "USGS Astropedia",
     en: {
      uso: "Terrain: slopes, distances and relief",
      autoria: "Timothy Parker and Fred J. Calef III · USGS Astrogeology Science Center, 2016-10-20",
      detalle: "1 m/px elevation model made by the MSL team to assess landing in Gale. It merges HRSC, CTX and HiRISE models adjusted to the MOLA altimeter. The computation uses it reduced to 32 m cells; the 3D relief uses it at 16 m in the study area and at 64 m around it (33 × 57 km).",
      credito: "USGS Astrogeology, MSL Gale Merged DEM 1 m v3 (Calef and Parker, 2016)",
    },
  },
  {
    id: "imagen",
    uso: "Imagen de fondo",
    producto: "Mosaico HiRISE en color de Gale (78 quads, 25 cm)",
    autoria:
      "USGS Astrogeology Science Center, julio de 2025 · fusionado con el MSL Gale Merged Orthophoto Mosaic 25cm (Calef y Parker, 2016)",
    detalle:
      "Tiras en color de HiRISE (Mars Reconnaissance Orbiter) georrectificadas y fusionadas con el ortomosaico HiRISE de la misión, a 25 cm/px. Se recorta a la zona de estudio con el norte arriba. Las franjas que el mosaico trae en gris (sin tira en color) se colorean con su propia paleta.",
    credito: "HiRISE, NASA/JPL-Caltech/University of Arizona",
    url: "https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_orthophoto_mosaic_25cm",
    sitio: "USGS Astropedia",
     en: {
      uso: "Background image",
      producto: "Gale HiRISE color mosaic (78 quads, 25 cm)",
      autoria: "USGS Astrogeology Science Center, July 2025 · merged with the MSL Gale Merged Orthophoto Mosaic 25cm (Calef and Parker, 2016)",
      detalle: "HiRISE color strips (Mars Reconnaissance Orbiter) georectified and merged with the mission's HiRISE orthomosaic, at 25 cm/px. Clipped to the study area with north up. The strips the mosaic has in gray (no color strip) are colorized with its own palette.",
    },
  },
  {
    id: "entorno",
    uso: "Entorno de la zona en el 3D: imagen",
    producto: "MSL Gale Merged Orthophoto Mosaic 25cm (v3)",
    autoria: "Fred J. Calef III y Timothy Parker · USGS Astrogeology Science Center, 2016",
    detalle:
      "Ortomosaico en blanco y negro (HiRISE y CTX) de toda el área de la misión. Se muestra a 16 m/px alrededor de la zona de estudio (33 × 57 km), coloreado con la paleta del mosaico HiRISE en color: el color es aproximado, no medido. Solo sirve de contexto visual; no entra en ningún cálculo.",
    credito: "USGS Astrogeology, MSL Gale Merged Orthophoto Mosaic 25 cm v3 (Calef y Parker, 2016) · NASA/JPL-Caltech/University of Arizona/MSSS",
    url: "https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_orthophoto_mosaic_25cm",
    sitio: "USGS Astropedia",
    en: {
      uso: "Surroundings of the study area in 3D: image",
      autoria: "Fred J. Calef III and Timothy Parker · USGS Astrogeology Science Center, 2016",
      detalle: "Black-and-white orthomosaic (HiRISE and CTX) of the whole mission area. Shown at 16 m/px around the study area (33 × 57 km), colorized with the palette of the HiRISE color mosaic: the color is approximate, not measured. Visual context only; it is not used in any computation.",
      credito: "USGS Astrogeology, MSL Gale Merged Orthophoto Mosaic 25 cm v3 (Calef and Parker, 2016) · NASA/JPL-Caltech/University of Arizona/MSSS",
    },
  },
  {
    id: "region",
    uso: "Región de Gale: imagen (en el globo y en el horizonte del 3D)",
    producto: "Mars CTX Controlled Equatorial Mosaics, 6 m/px · cuadrángulo MC-23 (Aeolis)",
    autoria: "S. J. Robbins y colaboradores · distribuido por el USGS Astrogeology Science Center",
    detalle:
      "Mosaico controlado de imágenes de la cámara CTX (Mars Reconnaissance Orbiter). Se usa reducido (≈ 60 m/px) para los 4° × 4° alrededor de Gale, coloreado con la paleta del mosaico HiRISE en color: el color es aproximado, no medido. Solo contexto visual; no entra en ningún cálculo.",
    credito: "CTX: NASA/JPL-Caltech/MSSS · mosaico controlado de Robbins et al., USGS Astrogeology",
    url: "https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/Mars_MRO_CTX_Equi_Mosaics_Robbins/index.html",
    sitio: "USGS · Mars CTX Controlled Equatorial Mosaics",
    en: {
      uso: "Gale region: image (on the globe and on the 3D horizon)",
      producto: "Mars CTX Controlled Equatorial Mosaics, 6 m/px · quadrangle MC-23 (Aeolis)",
      autoria: "S. J. Robbins and colleagues · distributed by the USGS Astrogeology Science Center",
      detalle: "Controlled mosaic of images from the CTX camera (Mars Reconnaissance Orbiter). Used reduced (≈ 60 m/px) for the 4° × 4° around Gale, colorized with the palette of the HiRISE color mosaic: the color is approximate, not measured. Visual context only; it is not used in any computation.",
      credito: "CTX: NASA/JPL-Caltech/MSSS · controlled mosaic by Robbins et al., USGS Astrogeology",
    },
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
     en: {
      uso: "Positions of the landmarks T1–T6",
      producto: "Curiosity stops (MSL waypoints)",
      autoria: "NASA/JPL-Caltech · positions layer of the mission's MMGIS map",
      detalle: "1,389 rover stops with sol, position and elevation, in the same projection as the map. They place the six sites Curiosity visited.",
      credito: "NASA/JPL-Caltech, Curiosity positions archive",
    },
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
     en: {
      uso: "What Curiosity saw at each landmark",
      producto: "NASA Photojournal (one image per landmark, with its PIA number)",
      autoria: "NASA/JPL-Caltech/MSSS · public-domain images",
      detalle: "Mastcam mosaics and MAHLI self-portraits taken by Curiosity at each site.",
      credito: "NASA/JPL-Caltech/MSSS, with its PIA number",
    },
  },
  {
    id: "globo",
    uso: "Globo de Marte: color",
    producto: "Mars Viking Colorized Global Mosaic 232m (MDIM 2.1 en color)",
    autoria: "NASA Ames · USGS Astrogeology Science Center, 02/02/2009",
    detalle:
      "Mosaico global de las sondas Viking, versión coloreada del MDIM 2.1 controlado. Se usa reducido (4K y 8K) para el globo. Leído del servicio de mapas del USGS.",
    credito: "NASA/JPL/USGS, Viking MDIM 2.1 en color",
    url: "https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m",
    sitio: "USGS Astropedia",
     en: {
      uso: "Mars globe: color",
      producto: "Mars Viking Colorized Global Mosaic 232m (MDIM 2.1 colorized)",
      autoria: "NASA Ames · USGS Astrogeology Science Center, 2009-02-02",
      detalle: "Global mosaic from the Viking orbiters, colorized version of the controlled MDIM 2.1. Used reduced (4K and 8K) for the globe. Read from the USGS map service.",
      credito: "NASA/JPL/USGS, Viking MDIM 2.1 colorized",
    },
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
     en: {
      uso: "Mars globe: relief (shading)",
      detalle: "Global topography from the MOLA laser altimeter (Smith et al., 2001). It only provides the globe's shading, exaggerated so it reads at that scale; it is not used in any computation.",
    },
  },
  {
    id: "relieveGale",
    uso: "Región de Gale: relieve (en el globo y en el horizonte del 3D)",
    producto: "Mars MGS MOLA – MEX HRSC Blended DEM Global 200m (v2)",
    autoria: "DLR, NASA, Goddard Space Flight Center · USGS Astrogeology Science Center, 31/01/2018 (Fergason, Laura y Hare, 2017)",
    detalle:
      "Modelo global que combina MOLA con el estéreo de HRSC (Mars Express) a 200 m/px. Da el relieve del cráter y del monte Sharp: en el globo, exagerado ×3; en el 3D, a escala real, más allá del entorno de la zona. No se usa para ningún cálculo.",
    credito: "USGS Astrogeology, HRSC-MOLA Blended DEM 200 m v2 (Fergason et al., 2017)",
    url: "https://astrogeology.usgs.gov/search/map/mars_mgs_mola_mex_hrsc_blended_dem_global_200m",
    sitio: "USGS Astropedia",
     en: {
      uso: "Gale region: relief (on the globe and on the 3D horizon)",
      autoria: "DLR, NASA, Goddard Space Flight Center · USGS Astrogeology Science Center, 2018-01-31 (Fergason, Laura and Hare, 2017)",
      detalle: "Global model combining MOLA with HRSC stereo (Mars Express) at 200 m/px. It gives the relief of the crater and Mount Sharp: on the globe, exaggerated ×3; in 3D, at true scale, beyond the surroundings of the study area. It is not used in any computation.",
    },
  },
];

/** Zona de estudio (especificación §1). */
export const ZONA = {
  lugar: "Cráter Gale, Marte · parte baja del monte Sharp",
  tamano: "3,52 × 3,52 km · 110 × 110 celdas de 32 m",
  proyeccion: "Equirectangular de Marte, meridiano central 0°, esfera de radio 3 396 190 m",
  limites: "x de 8141,0 a 8144,52 km · y de −282,0 a −278,48 km",
  en: {
    lugar: "Gale crater, Mars · lower Mount Sharp",
    tamano: "3.52 × 3.52 km · 110 × 110 cells of 32 m",
    proyeccion: "Mars equirectangular, central meridian 0°, sphere of radius 3,396,190 m",
    limites: "x from 8141.0 to 8144.52 km · y from −282.0 to −278.48 km",
  },
};
