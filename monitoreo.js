"use strict";

const ASIENTOS = 30;
const UMBRAL = 25;
const HORAS = [9, 12, 15];
const ALTURA_OBJETO = 3;
const PREFIJO = "monitoreo-sombra-z01:v1:";
const PILOTO = [
 {fecha:"2026-11-23",h:9, cielo:"Despejado",            sm:9, tot:30,pe:4,uv:"Amarillo (moderado)",tipo:"Campo",obs:""},
 {fecha:"2026-11-23",h:12,cielo:"Despejado",            sm:3, tot:30,pe:1,uv:"Rojo (muy alto)",    tipo:"Campo",obs:"Una sola persona en la zona"},
 {fecha:"2026-11-23",h:15,cielo:"Despejado",            sm:12,tot:30,pe:6,uv:"Amarillo (moderado)",tipo:"Campo",obs:"Conteo realizado a las 15:05"},
 {fecha:"2026-11-25",h:9, cielo:"Parcialmente nublado", sm:10,tot:30,pe:5,uv:"Amarillo (moderado)",tipo:"Campo",obs:""},
 {fecha:"2026-11-25",h:12,cielo:"Despejado",            sm:4, tot:30,pe:0,uv:"Rojo (muy alto)",    tipo:"Campo",obs:"Bancas vacías bajo sol directo"},
 {fecha:"2026-11-25",h:15,cielo:"Parcialmente nublado", sm:11,tot:30,pe:7,uv:"Amarillo (moderado)",tipo:"Campo",obs:""}
];
const $ = id => document.getElementById(id);
const hora = h => String(h).padStart(2, "0") + ":00";
const decimal = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const porcentaje = (sombra, total) => 100 * sombra / total;
const fechaVisible = fecha => fecha.split("-").reverse().join("/");
const clave = r => [r.fecha, r.h, r.tipo].join(":");
const opciones = id => Array.from($(id).options, opcion => opcion.value).filter(Boolean);
const cielos = opciones("f-cielo");
const colores = opciones("f-uv");
const tipos = opciones("f-tipo");
const fechaManagua = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "America/Managua", year: "numeric", month: "2-digit", day: "2-digit"
});
let horaActiva = 12;
let locales = [];
let almacenamientoDisponible = true;

function fechaValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || valor.startsWith("0000-")) return false;
  const fecha = new Date(valor + "T00:00:00Z");
  return Number.isFinite(+fecha) && fecha.toISOString().slice(0, 10) === valor;
}

function registroValido(r) {
  return r && typeof r.fecha === "string" && fechaValida(r.fecha) &&
    HORAS.includes(r.h) && cielos.includes(r.cielo) && colores.includes(r.uv) &&
    tipos.includes(r.tipo) && r.tot === ASIENTOS && Number.isInteger(r.sm) &&
    r.sm >= 0 && r.sm <= ASIENTOS && (r.pe === null || (Number.isSafeInteger(r.pe) && r.pe >= 0)) &&
    typeof r.obs === "string";
}

function leerRegistros() {
  let omitidos = 0;
  try {
    const guardados = [];
    for (const nombre of Object.keys(localStorage)) {
      if (!nombre.startsWith(PREFIJO)) continue;
      try {
        const registro = JSON.parse(localStorage.getItem(nombre));
        if (registroValido(registro) && nombre === PREFIJO + clave(registro) &&
            !PILOTO.some(r => clave(r) === clave(registro))) {
          guardados.push(registro);
        } else {
          omitidos++;
        }
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        omitidos++;
      }
    }
    locales = guardados;
    almacenamientoDisponible = true;
    $("estado-almacenamiento").textContent = omitidos ? "Hay datos locales que no se pudieron leer. Se conservaron en el navegador." : "";
  } catch {
    almacenamientoDisponible = false;
    $("estado-almacenamiento").textContent = "Este navegador no permite leer el almacenamiento local. Los registros del piloto siguen disponibles.";
  }
}

function registrosOrdenados() {
  return [...PILOTO, ...locales].sort((a, b) =>
    a.fecha.localeCompare(b.fecha) || a.h - b.h || a.tipo.localeCompare(b.tipo));
}

function resultado(h) {
  const campo = [...PILOTO, ...locales].filter(r => r.tipo === "Campo" && r.h === h);
  const sombra = campo.reduce((total, r) => total + r.sm, 0);
  const observados = campo.reduce((total, r) => total + r.tot, 0);
  return { sombra, observados, valor: porcentaje(sombra, observados), jornadas: campo.length };
}

for (const grupo of [$("horarios"), $("horas-explorador")]) {
  for (const h of HORAS) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "hour";
    boton.dataset.hora = h;
    if (grupo.id === "horarios") {
      const etiqueta = document.createElement("strong");
      etiqueta.textContent = hora(h);
      boton.append(etiqueta, document.createElement("span"));
    } else {
      boton.textContent = hora(h);
    }
    boton.addEventListener("click", () => {
      horaActiva = h;
      mostrarResultados();
      mostrarSol();
    });
    grupo.append(boton);
  }
}
const botonesHora = document.querySelectorAll("[data-hora]");

function mostrarResultados() {
  for (const boton of botonesHora) {
    const h = Number(boton.dataset.hora);
    boton.setAttribute("aria-pressed", h === horaActiva);
    const valor = boton.querySelector("span");
    if (valor) valor.textContent = decimal.format(resultado(h).valor) + " %";
  }

  const activo = resultado(horaActiva);
  $("porcentaje").textContent = decimal.format(activo.valor);
  $("hora-activa").textContent = hora(horaActiva);
  $("conteo-activo").textContent = activo.sombra + " de " + activo.observados + " observaciones" +
    (activo.jornadas > 2 ? " (piloto y campo local)" : "");
  actualizarMapa(activo);

  const mediodia = resultado(12);
  const critica = mediodia.valor < UMBRAL;
  $("origen-clasificacion").textContent = mediodia.jornadas > 2
    ? "Evaluada a las 12:00 con piloto y campo local"
    : "Evaluada a las 12:00";
  $("clasificacion").textContent = critica ? "Zona crítica" : "Zona no crítica";
  $("propuesta").textContent = critica ? "Proponemos sembrar árboles en Z01." : "Sigamos midiendo la sombra en Z01.";
  $("recomendacion").textContent = critica
    ? "El primer paso es revisar con Jardinería y Mantenimiento dónde sembrar, qué especies elegir y cómo cuidarlas."
    : "Repite los conteos en los mismos horarios para seguir cómo cambia la sombra.";

  $("cuadricula").replaceChildren(...PILOTO.filter(r => r.h === horaActiva).map(r => {
    const jornada = document.createElement("div");
    jornada.className = "seat-day";
    const cuadros = document.createElement("div");
    cuadros.className = "seat-grid";
    cuadros.setAttribute("aria-hidden", "true");
    for (let asiento = 0; asiento < r.tot; asiento++) {
      const cuadro = document.createElement("span");
      cuadro.className = asiento < r.sm ? "seat shade" : "seat";
      cuadros.append(cuadro);
    }
    const etiqueta = document.createElement("small");
    etiqueta.textContent = Number(r.fecha.slice(-2)) + " nov · " + r.sm + " de " + r.tot + " con sombra";
    jornada.append(cuadros, etiqueta);
    return jornada;
  }));
}

function dibujarMapa() {
  const edificios = [
    [470, 60, 150, 70, "Copérnico (P)"], [60, 80, 95, 90, "Cafetería"],
    [130, 270, 125, 50, "Biblioteca"], [570, 330, 120, 38, "Lab."],
    [690, 170, 85, 50, "Aulas B"], [260, 110, 100, 24, ""],
    [470, 360, 120, 40, ""], [60, 370, 100, 50, ""]
  ];
  const zonas = [[400, 250], [200, 150], [420, 140], [210, 340], [640, 390], [110, 455],
    [300, 50], [540, 300], [420, 445], [290, 455], [720, 250]];
  const bloques = edificios.map(([x, y, ancho, alto, nombre]) =>
    `<rect x="${x}" y="${y}" width="${ancho}" height="${alto}" rx="4" fill="#d7ece5" stroke="#729c94"/>
     <text x="${x + ancho / 2}" y="${y + alto / 2 + 5}" text-anchor="middle" font-size="19" fill="#275254">${nombre}</text>`);
  const pendientes = zonas.map(([x, y], i) =>
    `<circle cx="${x}" cy="${y}" r="11" fill="#fff" stroke="#507a75" stroke-width="2" stroke-dasharray="4 3"/>
     <text x="${x}" y="${y + 31}" text-anchor="middle" font-size="22" fill="#275254">${"Z" + String(i + 2).padStart(2, "0")}</text>`);
  $("mapa").innerHTML = `
    <path d="M0 255H800M400 0V520M180 0V520" stroke="#e5efeb" stroke-width="26"/>
    ${bloques.join("")}
    ${pendientes.join("")}
    <circle cx="645" cy="130" r="39" fill="#78ffd6" stroke="#023c40" stroke-width="2"/>
    <circle id="proporcion-z01" cx="645" cy="130" r="34" pathLength="100" fill="none"
      stroke="#023c40" stroke-width="8" transform="rotate(-90 645 130)"/>
    <circle cx="645" cy="130" r="27" fill="#023c40"/>
    <text x="645" y="137" text-anchor="middle" font-size="21" font-weight="750" fill="white">Z01</text>`;
}

function actualizarMapa(activo) {
  $("proporcion-z01").setAttribute("stroke-dasharray", activo.valor + " 100");
  $("dato-mapa").textContent = `Z01 a las ${hora(horaActiva)} · ${decimal.format(activo.valor)} % de asientos con sombra.`;
}

function posicionSolar(fecha, h) {
  const dia = new Date(fecha + "T00:00:00Z");
  const anio = dia.getUTCFullYear();
  const inicio = new Date(dia);
  inicio.setUTCMonth(0, 1);
  const bisiesto = anio % 4 === 0 && (anio % 100 !== 0 || anio % 400 === 0);
  const rad = Math.PI / 180;
  const latitud = 12.13 * rad;
  const longitud = -86.25;
  const utc = -6;
  // Aproximación NOAA por año fraccional, sin corrección por refracción.
  const g = 2 * Math.PI / (bisiesto ? 366 : 365) * ((dia - inicio) / 864e5 + (h - 12) / 24);
  const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g)
    - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const declinacion = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g)
    - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g)
    - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const minutosSolares = h * 60 + eq + 4 * longitud - 60 * utc;
  const anguloHorario = (minutosSolares / 4 - 180) * rad;
  const cosCenit = Math.sin(latitud) * Math.sin(declinacion)
    + Math.cos(latitud) * Math.cos(declinacion) * Math.cos(anguloHorario);
  const altura = 90 - Math.acos(Math.max(-1, Math.min(1, cosCenit))) / rad;
  const azimut = (Math.atan2(Math.sin(anguloHorario),
    Math.cos(anguloHorario) * Math.sin(latitud) - Math.tan(declinacion) * Math.cos(latitud)) / rad + 540) % 360;
  return { altura, azimut };
}

function mostrarSol() {
  const fecha = $("s-fecha").value;
  const h = horaActiva;
  const fechaCorrecta = fechaValida(fecha);
  $("figura-sombra").hidden = !fechaCorrecta;
  $("recorrido").hidden = !fechaCorrecta;
  if (!fechaCorrecta) {
    $("longitud-sombra").textContent = "Ingresa una fecha válida.";
    $("altura-solar").textContent = "";
    return;
  }

  const { altura, azimut } = posicionSolar(fecha, h);
  const direccion = ["norte", "noreste", "este", "sureste", "sur", "suroeste", "oeste", "noroeste"][Math.round(azimut / 45) % 8];
  const sombra = ALTURA_OBJETO / Math.tan(altura * Math.PI / 180);
  $("longitud-sombra").textContent = `Sombra estimada de ${decimal.format(sombra)} m`;
  $("altura-solar").textContent = `A las ${hora(h)}, el sol está a ${decimal.format(altura)}° sobre el horizonte, hacia el ${direccion}.`;
  dibujarSombra(altura, sombra);

  dibujarRecorrido(fecha, h);
}

function dibujarSombra(altura, sombra) {
  const escala = 31;
  const suelo = 139;
  const objeto = 114;
  const cima = suelo - ALTURA_OBJETO * escala;
  const extremo = objeto + sombra * escala;
  const angulo = altura * Math.PI / 180;
  const solX = objeto - 34 * Math.cos(angulo);
  const solY = cima - 34 * Math.sin(angulo);
  const marcas = [0, 2, 4, 6, 8].map(metros => {
    const x = objeto + metros * escala;
    return `<path d="M${x} ${suelo}v6" stroke="#648684"/>
      <text x="${x}" y="${suelo + 22}" text-anchor="middle" font-size="15" fill="#356063">${metros} m</text>`;
  });

  $("sombra-modelo").innerHTML = `
    <path d="M20 ${suelo}H380" stroke="#648684"/>
    ${marcas.join("")}
    <path d="M${solX} ${solY}L${extremo} ${suelo}" stroke="#915c19" stroke-width="2" stroke-dasharray="5 4"/>
    <path d="M${objeto} ${suelo}V${cima}" stroke="#023c40" stroke-width="6" stroke-linecap="round"/>
    <line id="trazo-sombra" x1="${objeto}" y1="${suelo}" x2="${extremo}" y2="${suelo}" stroke="#023c40" stroke-width="6"/>
    <text x="${objeto - 12}" y="${(cima + suelo) / 2}" text-anchor="end" font-size="16" fill="#023c40">${ALTURA_OBJETO} m</text>
    <circle cx="${solX}" cy="${solY}" r="8" fill="#f7d28d" stroke="#915c19"/>
    <text x="${solX - 14}" y="${solY + 5}" text-anchor="end" font-size="15" fill="#704715">Sol</text>`;
}

function dibujarRecorrido(fecha, h) {
  const punto = (horaLocal, elevacion) => [22 + (horaLocal - 6) * 29.5, 110 - Math.max(0, elevacion)];
  const curva = Array.from({ length: 49 }, (_, i) => {
    const horaLocal = 6 + i / 4;
    return punto(horaLocal, posicionSolar(fecha, horaLocal).altura).join(",");
  });
  const marcas = HORAS.map(horaLocal => {
    const { altura: elevacion } = posicionSolar(fecha, horaLocal);
    const [x, y] = punto(horaLocal, elevacion);
    return `<circle cx="${x}" cy="${y}" r="${horaLocal === h ? 5 : 3}" fill="#023c40"/>
      <text x="${x}" y="${y - 10}" text-anchor="middle" font-size="13" fill="#023c40">${decimal.format(elevacion)}°</text>
      <text x="${x}" y="129" text-anchor="middle" font-size="13" fill="#356063">${hora(horaLocal)}</text>`;
  });
  $("arco").innerHTML = `<path d="M22 110H376" stroke="#8bb6af" stroke-width="1"/>
    <polyline points="${curva.join(" ")}" fill="none" stroke="#238276" stroke-width="3"/>
    ${marcas.join("")}`;
}

function mostrarHistorial() {
  const filas = registrosOrdenados().map(r => {
    const fila = document.createElement("tr");
    const valores = [fechaVisible(r.fecha), hora(r.h), r.sm + "/" + r.tot, r.cielo,
      r.pe ?? "—", r.uv, r.tipo, r.obs || "—"];
    for (const valor of valores) fila.insertCell().textContent = valor;
    return fila;
  });
  $("registros").replaceChildren(...filas);
  const campo = locales.filter(r => r.tipo === "Campo").length;
  const ensayo = locales.length - campo;
  $("cantidad-registros").textContent = "6 registros de campo del piloto." +
    (locales.length ? ` En este navegador: ${campo} de campo y ${ensayo} de ensayo.` : "");
}

const formulario = $("f");
const campos = formulario.elements;

function mensaje(texto, error = false) {
  $("f-msg").textContent = texto;
  $("f-msg").dataset.error = String(error);
}

function comprobarFormulario() {
  const validaciones = [
    [campos.fecha, fechaValida(campos.fecha.value), "Ingresa una fecha válida."],
    [campos.hora, HORAS.includes(Number(campos.hora.value)), "Selecciona una hora de conteo."],
    [campos.cielo, cielos.includes(campos.cielo.value), "Selecciona la condición del cielo."],
    [campos.tipo, tipos.includes(campos.tipo.value), "Selecciona Campo o Ensayo."],
    [campos.sombra, campos.sombra.validity.valid, "Ingresa un número entero de 0 a 30 asientos con sombra."],
    [campos.personas, campos.personas.validity.valid &&
      (campos.personas.value === "" || Number.isSafeInteger(campos.personas.valueAsNumber)),
      "Ingresa un número entero de personas mayor o igual a cero, o deja el campo vacío."],
    [campos.uv, colores.includes(campos.uv.value), "Selecciona el color del solmáforo o No consultado."]
  ];
  const invalida = validaciones.find(([, valida]) => !valida);
  if (!invalida) return true;
  const [campo, , texto] = invalida;
  campo.setAttribute("aria-invalid", "true");
  campo.setAttribute("aria-errormessage", "f-msg");
  mensaje(texto, true);
  campo.focus();
  return false;
}

formulario.addEventListener("input", evento => {
  evento.target.removeAttribute("aria-invalid");
  evento.target.removeAttribute("aria-errormessage");
  mensaje("");
});

function guardarRegistro(r) {
  leerRegistros();
  if (!almacenamientoDisponible) {
    mensaje("No se pudo acceder al almacenamiento de este navegador. El registro sigue en el formulario.", true);
    return;
  }
  const nombre = PREFIJO + clave(r);
  try {
    if (PILOTO.some(p => clave(p) === clave(r)) || localStorage.getItem(nombre) !== null) {
      mensaje("Ya existe un registro de Z01 para esa fecha, hora y tipo.", true);
      return;
    }
    localStorage.setItem(nombre, JSON.stringify(r));
  } catch {
    mensaje("No se pudo guardar el registro. Los datos siguen en el formulario.", true);
    return;
  }
  locales.push(r);
  formulario.reset();
  campos.fecha.value = fechaManagua.format(new Date());
  mensaje(r.tipo === "Campo"
    ? "Registro guardado. Ya se incluye en los resultados de este navegador."
    : "Ensayo guardado. Los resultados de campo se mantienen.");
  mostrarResultados();
  mostrarHistorial();
}

formulario.addEventListener("submit", async evento => {
  evento.preventDefault();
  if (!comprobarFormulario()) return;
  const registro = {
    fecha: campos.fecha.value,
    h: Number(campos.hora.value),
    cielo: campos.cielo.value,
    sm: campos.sombra.valueAsNumber,
    tot: ASIENTOS,
    pe: campos.personas.value === "" ? null : campos.personas.valueAsNumber,
    uv: campos.uv.value,
    tipo: campos.tipo.value,
    obs: campos.observacion.value.trim()
  };
  const boton = formulario.querySelector("[type=submit]");
  boton.disabled = true;
  try {
    if (navigator.locks) {
      await navigator.locks.request(PREFIJO + clave(registro), () => guardarRegistro(registro));
    } else {
      guardarRegistro(registro);
    }
  } catch {
    mensaje("No se pudo guardar el registro. Los datos siguen en el formulario.", true);
  } finally {
    boton.disabled = false;
  }
});

function exportarCsv() {
  leerRegistros();
  const encabezado = "zona,fecha,hora,condicion_cielo,asientos_totales,asientos_sombra,porcentaje_sombra,personas_1min,solmaforo,tipo,observacion";
  const celda = valor => '"' + String(valor ?? "").replaceAll('"', '""') + '"';
  const filas = registrosOrdenados().map(r => {
    // Evita que una observación introducida en la hoja se ejecute como fórmula.
    const observacion = /^[=+@\-]/.test(r.obs) ? "'" + r.obs : r.obs;
    return ["Z01", r.fecha, hora(r.h), r.cielo, r.tot, r.sm, porcentaje(r.sm, r.tot).toFixed(1),
      r.pe, r.uv, r.tipo, observacion].map(celda).join(",");
  });
  const archivo = new Blob(["\uFEFF" + [encabezado, ...filas].join("\r\n")], { type: "text/csv;charset=utf-8" });
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(archivo);
  enlace.download = "registros_z01.csv";
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
}

function actualizarRegistros() {
  leerRegistros();
  mostrarResultados();
  mostrarHistorial();
}

window.addEventListener("storage", evento => {
  if (evento.key === null || evento.key.startsWith(PREFIJO)) actualizarRegistros();
});
$("csv").addEventListener("click", exportarCsv);
$("s-fecha").addEventListener("input", mostrarSol);
campos.fecha.value = fechaManagua.format(new Date());
dibujarMapa();
actualizarRegistros();
mostrarSol();
