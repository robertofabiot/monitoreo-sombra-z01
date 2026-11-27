# Monitoreo de sombra · Zona Z01

Prototipo del producto mínimo viable del Proyecto Integrador de Educación Ambiental (Grupo 4, Universidad Americana).

Sitio estático en HTML, CSS y JavaScript. Para abrirlo en local, sirve la carpeta con un servidor HTTP estático, por ejemplo `python -m http.server 8000`, y visita `http://localhost:8000/`. GitHub Pages sirve la misma carpeta desde `main`.

- `#formulario` abre la sección de registro y exportación CSV.
- `#como` abre el método de conteo.
- `#explorador` abre el mapa y la estimación solar.

## Datos y formulario

El piloto reúne seis registros de Campo del 23 y 25 de noviembre de 2026. Se contaron los mismos 30 asientos en ambas jornadas, para 60 observaciones por horario. La clasificación se calcula siempre con los registros de las 12:00. Z01 es crítica cuando la razón de sumas queda por debajo del 25 % definido por el equipo como criterio preliminar.

El formulario usa la fecha local de Managua y el inventario fijo de 30 asientos. Pide un tipo explícito y valida fecha, horario, condición del cielo, conteos enteros y color del solmáforo. El conteo de personas y la observación son opcionales. Un registro se identifica por fecha, hora y tipo dentro de Z01.

Los nuevos registros se guardan en `localStorage`, separado por navegador, perfil y origen web. El CSV incluye el piloto y los registros locales, con su tipo. Los registros locales de Campo amplían los resultados de ese navegador. Los de Ensayo quedan en el historial y el CSV. La cuadrícula siempre representa las dos jornadas originales.

## Posición solar

Los dos selectores de hora están sincronizados. La hora selecciona qué conteos se ven en la portada y en el mapa, y también la hora del cálculo solar. El arco de Z01 representa la proporción de asientos con sombra observada en campo. La fecha solo cambia la estimación solar.

El explorador usa las [ecuaciones simplificadas de NOAA](https://gml.noaa.gov/grad/solcalc/solareqns.PDF) para Managua (12,13° N, 86,25° O, UTC−6). La vista lateral usa la misma escala horizontal y vertical. La longitud estimada se obtiene dividiendo los 3 m de altura del objeto entre la tangente de la elevación solar.

El 25 de noviembre de 2026 a las 12:00, la fórmula simplificada da 56,56° de altura geométrica y el sitio muestra 56,6°. Con los mismos datos, el [método de la calculadora solar de NOAA](https://gml.noaa.gov/grad/solcalc/calcdetails.html), basado en Meeus, da 56,31° geométricos y 56,32° con refracción. Los dos modelos difieren en la declinación y la ecuación del tiempo. Al redondear a un grado, los resultados quedan a lados distintos de 56,5° y explican el 57° del sitio anterior y los aproximadamente 56° del informe.
