// La pagina. Guarda lo que el maestro elige en este navegador, arma el parcial y lo muestra.
// Casi todo es con selectores y contadores, mientras menos se escriba, menos se equivoca.

const $ = id => document.getElementById(id);
const CLAVE = 'generador-parciales.v2';
const CAMPOS = ['colegio', 'materia', 'materia-otra', 'grado', 'tipo-examen', 'bloque', 'profesor', 'hoja'];
const CICLO = '2027';
const TOTALES = [10, 15, 20, 25, 30, 35, 40, 50, 60, 100];
// Lo que se marca al abrir, segun cuantas hojas lleva
const INICIALES = { 1: ['ordenar', 'parear'], 2: ['ordenar', 'dibujo', 'abiertas', 'seleccion', 'parear'] };
// Cuanto pesa cada serie al repartir los puntos
// (abiertas pesa mas porque sus renglones se acomodan al espacio; ordenar y dibujo tienen tope
// porque casi ninguna clase trae mas de 5 pasos o mas de 4 partes para senalar)
const PESO = { seleccion: 0.9, abiertas: 1.5, vf: 0.9, completar: 1, parear: 1, clasificar: 1, ordenar: 0.8, dibujo: 0.9 };
const TOPE = { ordenar: 5, dibujo: 6 };
const LOGO_SABER = 'logo-saber.jpg';

const estado = { logo: null, parcial: null, m: null, mres: null, vista: 'examen', ia: {} };

function leerGuardado() {
  try { return JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch (e) { return {}; }
}
function guardar() {
  const g = { campos: {}, series: {}, hojas: hojas(), total: total() };
  for (const c of CAMPOS) g.campos[c] = $(c).value;
  for (const t of ORDEN) g.series[t] = { marcada: $('s-' + t).checked, puntos: puntosDe(t) };
  g.texto = $('texto').value.length < 200000 ? $('texto').value : '';
  try { localStorage.setItem(CLAVE, JSON.stringify(g)); } catch (e) { /* sin espacio o en privado, se sigue igual */ }
}

const hojas = () => +$('hojas').textContent;
const total = () => +$('total').textContent;
const puntosDe = t => +$('p-' + t).textContent;
const datos = () => ({
  colegio: $('colegio').value,
  materia: $('materia').value === 'otra' ? limpio($('materia-otra').value) : $('materia').value,
  grado: $('grado').value,
  examen: `${$('tipo-examen').value} ${$('bloque').value}`,
  profesor: limpio($('profesor').value), ciclo: CICLO,
  hoja: $('hoja').value, hojas: hojas(),
});
const eleccion = () => ORDEN.filter(t => $('s-' + t).checked).map(t => ({ tipo: t, puntos: puntosDe(t) }));
// Los puntos con los que cada serie se puede armar
const valores = t => Array.from({ length: 60 }, (_, i) => i + 1).filter(p => plan(t, p));

// ===========================================================================
// ARMAR LA PANTALLA
// ===========================================================================

function iniciar() {
  const g = leerGuardado();
  $('grado').innerHTML = GRADOS.map(x => `<option>${x}</option>`).join('');
  $('materia').innerHTML = MATERIAS.map(x => `<option>${x}</option>`).join('') + '<option value="otra">Otra materia</option>';
  $('series').innerHTML = ORDEN.map(t => `
    <div class="serie" id="caja-${t}">
      <input type="checkbox" id="s-${t}" aria-label="${SERIES[t].nombre}">
      <label class="nombre" for="s-${t}">${SERIES[t].nombre}</label>
      <div class="contador-num" data-serie="${t}"><button type="button" data-paso="-1" aria-label="Menos puntos">−</button><output id="p-${t}">5</output><button type="button" data-paso="1" aria-label="Más puntos">+</button></div>
      <span class="detalle" id="d-${t}"></span>
    </div>`).join('');

  const campos = g.campos || {};
  for (const c of CAMPOS) if (campos[c]) $(c).value = campos[c];
  // un guardado viejo con otro colegio deja el selector vacio, vuelve a El Saber No.1
  if (!$('colegio').value) $('colegio').selectedIndex = 0;
  $('hojas').textContent = g.hojas || 1;
  $('total').textContent = g.total || 15;
  if (g.series) for (const t of ORDEN) {
    $('s-' + t).checked = !!g.series[t].marcada;
    $('p-' + t).textContent = g.series[t].puntos || valores(t)[0];
  } else marcarIniciales();
  if (g.texto) $('texto').value = g.texto;
  ponerLogo();

  document.addEventListener('input', e => { if (e.target.closest('.paso') && e.target.id !== 'abrir') { revisar(); guardar(); } });
  document.addEventListener('change', e => {
    if (!e.target.closest('.paso')) return;
    if (e.target.id === 'tipo-examen') {           // el parcial va en una hoja y el examen final en dos
      // un parcial de una hoja oficio aguanta unos 15 puntos, el examen final de dos hojas 30
      const parcial = /parcial/i.test(e.target.value);
      $('hojas').textContent = parcial ? 1 : 2;
      $('total').textContent = parcial ? 15 : 30;
      marcarIniciales();
    }
    if (e.target.type === 'checkbox' && e.target.id.startsWith('s-')) repartir();
    revisar(); guardar();
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('.contador-num button');
    if (!b || b.disabled) return;
    mover(b.closest('.contador-num'), +b.dataset.paso);
    revisar(); guardar();
  });
  $('repartir').addEventListener('click', () => { repartir(); revisar(); guardar(); });
  $('archivos').addEventListener('change', subirArchivos);
  $('ejemplo').addEventListener('click', ponerEjemplo);
  $('borrar-texto').addEventListener('click', () => { $('texto').value = ''; revisar(); guardar(); });
  $('crear').addEventListener('click', crear);
  document.querySelectorAll('.pestanas button').forEach(b => b.addEventListener('click', () => { estado.vista = b.dataset.vista; pintar(); }));
  $('bajar-word').addEventListener('click', bajarWord);
  $('imprimir').addEventListener('click', () => window.print());
  $('bajar-temario').addEventListener('click', () => temarioCanvas(estado.m).toBlob(b => bajar(b, nombreArchivo('TEMARIO') + '.png')));
  $('mezclar').addEventListener('click', () => { estado.parcial.semilla = Math.floor(Math.random() * 1e6); mostrar(); });
  $('guardar').addEventListener('click', () => bajar(new Blob([JSON.stringify(estado.parcial, null, 1)], { type: 'application/json' }), nombreArchivo('PARCIAL') + '.json'));
  $('abrir').addEventListener('change', abrirGuardado);
  revisar();
}

// Un contador sube o baja al siguiente valor que sirve
function mover(caja, paso) {
  const serie = caja.dataset.serie, campo = caja.dataset.campo;
  const out = caja.querySelector('output'), v = +out.textContent;
  const lista = serie ? valores(serie) : campo === 'hojas' ? [1, 2, 3, 4] : TOTALES;
  let i = lista.indexOf(v);
  if (i < 0) i = lista.findIndex(x => x > v) - (paso > 0 ? 1 : 0);
  out.textContent = lista[Math.max(0, Math.min(lista.length - 1, i + paso))];
  if (campo === 'total') repartir();
  if (campo === 'hojas' && eleccion().length < hojas() * 2) marcarIniciales();
}

function marcarIniciales() {
  const ini = INICIALES[Math.min(2, hojas())] || INICIALES[2];
  const extra = ['vf', 'clasificar', 'completar'];
  const quiero = [...ini];
  while (quiero.length < hojas() * 2 && extra.length) {     // con 3 o 4 hojas se agregan series
    const t = extra.shift();
    if (!(t === 'completar' && quiero.includes('parear'))) quiero.push(t);
  }
  for (const t of ORDEN) $('s-' + t).checked = quiero.includes(t);
  repartir();
}

// Reparte el punteo entre las series marcadas, cerca de lo que pesa cada una
function repartir() {
  const el = eleccion(), T = total();
  if (!el.length) return;
  const suma = el.reduce((a, e) => a + PESO[e.tipo], 0);
  // mejor[i][s] = menor desvio usando las primeras i series para sumar s
  const mejor = [new Map([[0, { costo: 0, valores: [] }]])];
  el.forEach((e, i) => {
    const meta = T * PESO[e.tipo] / suma, sig = new Map();
    for (const [s, r] of mejor[i]) for (const v of valores(e.tipo)) {
      if (s + v > T) break;
      const c = r.costo + (v - meta) ** 2 + (TOPE[e.tipo] && v > TOPE[e.tipo] ? 100 * (v - TOPE[e.tipo]) : 0), ya = sig.get(s + v);
      if (!ya || c < ya.costo) sig.set(s + v, { costo: c, valores: [...r.valores, v] });
    }
    mejor.push(sig);
  });
  const fin = mejor[el.length].get(T);
  if (fin) el.forEach((e, i) => { $('p-' + e.tipo).textContent = fin.valores[i]; });
}

async function cargarLogo(url) {
  const img = new Image();
  await new Promise((ok, mal) => { img.onload = ok; img.onerror = mal; img.src = url; }).catch(() => null);
  if (!img.naturalWidth) return null;
  let datos;
  if (url.startsWith('data:')) datos = Uint8Array.from(atob(url.split(',')[1]), c => c.charCodeAt(0));
  else datos = new Uint8Array(await (await fetch(url)).arrayBuffer());
  return { url, datos, ancho: img.naturalWidth, alto: img.naturalHeight };
}

// Los dos colegios El Saber llevan el mismo logo
async function ponerLogo() {
  if (!estado.logo) estado.logo = await cargarLogo(LOGO_SABER);
}

// Revisa la eleccion de series cada vez que algo cambia
function revisar() {
  $('caja-materia-otra').hidden = $('materia').value !== 'otra';
  for (const t of ORDEN) {
    const marcada = $('s-' + t).checked, puntos = puntosDe(t);
    $('caja-' + t).classList.toggle('activa', marcada);
    const pl = plan(t, puntos), d = $('d-' + t);
    d.classList.toggle('mal', !pl);
    d.textContent = !pl ? 'No cuadra con esos puntos' : t === 'dibujo' ? `Dibujo de 2 puntos y ${pl.n} partes de 1 punto`
      : `${pl.n} ${t === 'ordenar' ? 'pasos' : t === 'clasificar' ? 'elementos' : 'preguntas'} de ${pts(pl.valor)}`;
    const lista = valores(t), caja = document.querySelector(`[data-serie="${t}"]`);
    caja.querySelector('[data-paso="-1"]').disabled = puntos <= lista[0];
    caja.querySelector('[data-paso="1"]').disabled = puntos >= lista[lista.length - 1];
  }
  for (const [campo, lista] of [['hojas', [1, 2, 3, 4]], ['total', TOTALES]]) {
    const caja = document.querySelector(`[data-campo="${campo}"]`), v = +$(campo).textContent;
    caja.querySelector('[data-paso="-1"]').disabled = v <= lista[0];
    caja.querySelector('[data-paso="1"]').disabled = v >= lista[lista.length - 1];
  }
  const el = eleccion(), suma = el.reduce((a, e) => a + e.puntos, 0);
  const malos = revisarEleccion(el, total(), hojas());
  $('suma').textContent = malos.length ? malos.join(' ') : `Suma ${suma} de ${total()} puntos, ${el.length} series en ${hojas()} hoja${hojas() > 1 ? 's' : ''}.`;
  $('suma').className = 'suma ' + (malos.length ? 'mal' : 'bien');
  $('repartir').hidden = suma === total();
  const n = $('texto').value.trim().length;
  $('cuenta').textContent = n ? `${n.toLocaleString('es')} letras` : '';
  return malos;
}

async function subirArchivos(e) {
  const files = [...e.target.files];
  e.target.value = '';
  const partes = [];
  for (const f of files) {
    try {
      const t = (await textoDeArchivo(f)).trim();
      if (t.length < 40) aviso(`${f.name} casi no trae texto. Si son diapositivas en imagen, copie el texto a mano.`, true);
      else partes.push(t);
    } catch (err) { aviso(`No se pudo leer ${f.name}. ${err.message}`, true); }
  }
  if (partes.length) {
    const actual = $('texto').value.trim();
    $('texto').value = (actual ? actual + '\n\n' : '') + partes.join('\n\n');
    revisar(); guardar();
  }
}

function ponerEjemplo() {
  $('texto').value = EJEMPLO.texto;
  for (const [k, v] of Object.entries(EJEMPLO.datos)) $(k).value = v;
  $('hojas').textContent = 2;
  $('total').textContent = 30;
  for (const t of ORDEN) {
    $('s-' + t).checked = t in EJEMPLO.series;
    if (t in EJEMPLO.series) $('p-' + t).textContent = EJEMPLO.series[t];
  }
  revisar(); guardar();
}

// ===========================================================================
// CREAR Y MOSTRAR
// ===========================================================================

function aviso(texto, malo) {
  const p = document.createElement('div');
  p.className = malo ? 'mal' : 'paso-ia';
  p.textContent = texto;
  $('mensajes').appendChild(p);
}

async function crear() {
  $('mensajes').innerHTML = '';
  const d = datos(), el = eleccion(), texto = $('texto').value.trim();
  const malos = revisar();
  if (!d.materia) malos.unshift('Escriba cuál es la materia.');
  if (texto.length < 200) malos.unshift('Falta el contenido de las clases (paso 2).');
  if (malos.length) { aviso(malos.join('\n'), true); return; }
  $('crear').disabled = true;
  try {
    await ponerLogo();
    estado.parcial = parcialBasico(d, texto, el);
    mostrar();
    $('mensajes').innerHTML = '';
    $('resultado').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    aviso(err.message, true);
  } finally {
    $('crear').disabled = false;
  }
}

function mostrar() {
  const p = estado.parcial;
  estado.m = mezclado(p);
  estado.m.datos.hojas = estado.m.datos.hojas || Math.max(1, Math.floor(p.series.length / 2));
  estado.mx = maquetar(estado.m, false, estado.logo);
  estado.mres = maquetar(estado.m, true, estado.logo, estado.mx.hojas);
  const avisos = [...(p.cambios || []), ...cruces(estado.m.series)];
  const h = estado.m.datos.hojas;
  if (!estado.mx.cabe) avisos.unshift(`El examen no cabe bien en ${h} hoja${h > 1 ? 's' : ''}. Bájele puntos a la serie más larga o súbale una hoja.`);
  if (!p.temario.puntos.length) avisos.push('No salió el temario.');
  avisos.push('Revise la redacción de cada pregunta en el resuelto antes de imprimir.');
  $('avisos').innerHTML = avisos.map(a => `<li>${esc(a)}</li>`).join('');
  $('resultado').hidden = false;
  pintar();
}

function pintar() {
  document.querySelectorAll('.pestanas button').forEach(b => b.classList.toggle('activa', b.dataset.vista === estado.vista));
  const v = $('vista');
  if (estado.vista === 'temario') {
    v.innerHTML = '';
    const img = new Image();
    img.className = 'temario';
    img.alt = 'Temario de estudio';
    img.src = temarioCanvas(estado.m).toDataURL('image/png');
    v.appendChild(img);
  } else {
    const res = estado.vista === 'resuelto';
    v.innerHTML = htmlHojas(estado.m, res, estado.logo, res ? estado.mres : estado.mx);
  }
  escalar();
  // al imprimir, la hoja del tamano que eligio el maestro (oficio no es el tamano por defecto)
  let tam = $('tam-pagina');
  if (!tam) { tam = document.createElement('style'); tam.id = 'tam-pagina'; document.head.appendChild(tam); }
  const alto = estado.vista === 'temario' ? 12 : (estado.m.datos.hoja === 'carta' ? 11 : 12.5);
  tam.textContent = `@page { size: 8.5in ${alto}in; margin: 0; }`;
  $('bajar-word').textContent = estado.vista === 'resuelto' ? 'Descargar Word del resuelto' : 'Descargar Word del examen';
  $('bajar-word').hidden = estado.vista === 'temario';
}

// en pantallas angostas la hoja se achica para verse entera
function escalar() {
  const v = $('vista');
  v.style.setProperty('--escala', Math.min(1, (v.clientWidth - 16) / 816).toFixed(3));
}
addEventListener('resize', () => { if (!$('resultado').hidden) escalar(); });

function nombreArchivo(que) {
  const d = estado.m.datos;
  return `${que} ${d.examen} ${d.grado}`.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[<>:"/\\|?*]/g, '').toUpperCase();
}

async function bajarWord() {
  const res = estado.vista === 'resuelto';
  try {
    await descargarWord(estado.m, res, estado.logo, res ? estado.mres : estado.mx, nombreArchivo(res ? 'RESUELTO' : 'EXAMEN') + '.docx');
  } catch (err) { aviso('No se pudo armar el Word. ' + err.message, true); }
}

async function abrirGuardado(e) {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    const p = JSON.parse(await f.text());
    if (!p.series || !p.datos) throw new Error('no es un parcial guardado');
    estado.parcial = p;
    mostrar();
  } catch (err) { aviso('No se pudo abrir. ' + err.message, true); }
}

iniciar();
