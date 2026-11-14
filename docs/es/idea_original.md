# Idea original (13 nov 2026)

Propuesta inicial de Katrina Espinar para el reto *Martian Map*, compartida en el grupo del equipo antes del informe revisado. Se conserva como contexto; **lo que manda ahora es la [especificación](especificacion_algoritmos.md)**.

## La propuesta

- **Idea.** Todos los equipos van a hacer un mapa de Marte como si lo pisara un astronauta sano. Pero los primeros astronautas llegarán tras unos 6 meses sin gravedad: con problemas de equilibrio, menos fuerza y peor forma cardiovascular, y esos déficits duran días. Además, la Tierra está a hasta 24 minutos de distancia por radio, así que nadie puede ayudarles en directo.
- **Concepto.** El Marte alcanzable depende del cuerpo que lo pisa. El mapa muestra qué zonas puede recorrer esta tripulación en este sol, ida y vuelta. Con un deslizador de sol, la zona empieza siendo pequeña alrededor del hábitat y se va ampliando según se readaptan. Los objetivos científicos se «encienden» cuando pasan a ser alcanzables. La zona se encoge si hay tormenta de polvo, tormenta solar o una lesión.
- **Frase del pitch.** *«Every team will map Mars. We map Mars as it looks to a body that just spent six months in zero gravity.»*
- **Dónde.** Zona de boxwork del monte Sharp, cráter Gale: es el ejemplo del propio enunciado, la ruta de Curiosity está en los recursos y allí Curiosity mide radiación (RAD) y meteorología (REMS).
- **Qué tendría la herramienta:**
  1. Capacidad del cuerpo por sol: velocidad, pendiente máxima y riesgo de caída según el terreno.
  2. Campaña científica: qué objetivo visitar en qué sol.
  3. Seguridad: dosis de radiación, botón de tormenta solar y «si te lesionas aquí, ¿puede tu compañero traerte de vuelta?».
  4. En cada objetivo, la foto real de Curiosity: «esto es lo que verás».
- **Datos:** relieve (HiRISE/Mars Trek), espectral (CRISM), térmico (THEMIS), radiación (RAD) y atmosférico (REMS). Cinco tipos; el reto pide mínimo tres.

## Qué ha cambiado con el informe revisado y la especificación

| Idea original | Ahora | Motivo |
|---|---|---|
| «Zona segura» | Probabilidad de ir y volver, «alcanzable bajo los supuestos indicados» | No hay probabilidades de fallo validadas para Marte. La palabra «seguro» está prohibida en la interfaz. |
| Zona de boxwork | Ventana de 3,52 × 3,52 km entre las dunas Bagnold, Vera Rubin Ridge y Glen Torridon, con seis sitios de muestreo de Curiosity (T1–T6) | Es donde está calculado y validado el modelo, con el DEM del USGS. |
| Velocidad, pendiente y riesgo de caída | Velocidad y pendiente máxima por sol; bajada limitada a la velocidad en llano. El riesgo de caída no se cuantifica. | Sin datos para cuantificarlo. |
| Campaña científica | Probabilidad de cada destino por sol, tripulante y pareja | Se mantiene, en forma probabilística. |
| Radiación, tormenta solar, tormenta de polvo, lesión del compañero | Fuera de la demo: pasan a «siguientes pasos» | No están en el modelo. |
| Foto real de Curiosity en cada objetivo | Se mantiene | — |
| Cinco tipos de datos (HiRISE, CRISM, THEMIS, RAD, REMS) | Relieve (DEM del USGS), imagen HiRISE, posiciones y fotos de Curiosity | Pendiente: confirmar en el enunciado si cuentan como tres tipos. |
