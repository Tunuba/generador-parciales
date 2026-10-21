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

const estado = { logo: null, parcial: null, m: null, mres: null, vista: 'examen', capaz: null, quitadas: new Set(), fijadas: {}, avisosPlan: [] };

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
// Los que ademas salen con el texto pegado (sin texto, todos)
const sirven = t => valores(t).filter(p => !estado.capaz || estado.capaz[t].has(plan(t, p).n));
const nombre = t => SERIES[t].nombre;
const HOJAS = [1, 2, 3, 4];
// Por que una serie no sale con el texto, en palabras del maestro
const PORQUE = {
  ordenar: 'su texto no trae pasos numerados', completar: 'su texto no trae suficientes conceptos',
  dibujo: 'su texto no trae partes para señalar', clasificar: 'su texto no trae grupos con su lista',
  abiertas: 'su texto no trae conceptos para preguntar', vf: 'su texto no trae oraciones para cambiar',
  seleccion: 'su texto no trae suficientes conceptos', parear: 'su texto no trae conceptos con su definición',
};

// ===========================================================================
// ARMAR LA PANTALLA
// ===========================================================================

function iniciar() {
  const g = leerGuardado();
  $('grado').innerHTML = GRADOS.map(x => `<option>${x}</option>`).join('');
  $('materia').innerHTML = MATERIAS.map(x => `<option>${x}</option>`).join('') + '<option value="otra">Otra materia</option>';
  $('series').innerHTML = ORDEN.map(t => `
    <div class="serie" id="caja-${t}">
      <input type="checkbox" id="s-${t}" aria-label="${nombre(t)}">
      <label class="nombre" for="s-${t}">${nombre(t)}</label>
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
  } else for (const t of ORDEN) $('s-' + t).checked = INICIALES[1].includes(t);
  if (g.texto) $('texto').value = g.texto;
  ponerLogo();

  document.addEventListener('input', e => {
    if (!e.target.closest('.paso') || e.target.id === 'abrir') return;
    if (e.target.id === 'texto') textoCambio();
    revisar(); guardar();
  });
  document.addEventListener('change', e => {
    if (!e.target.closest('.paso')) return;
    if (e.target.id === 'tipo-examen') {           // el parcial va en una hoja y el examen final en dos
      // un parcial de una hoja oficio aguanta unos 15 puntos, el examen final de dos hojas 30
      const parcial = /parcial/i.test(e.target.value);
      $('hojas').textContent = parcial ? 1 : 2;
      $('total').textContent = parcial ? 15 : 30;
      estado.quitadas.clear(); estado.fijadas = {};
      acomodar({ quiero: new Set(INICIALES[parcial ? 1 : 2]) });
    }
    if (e.target.type === 'checkbox' && e.target.id.startsWith('s-')) {
      const t = e.target.id.slice(2);
      if (e.target.checked) { estado.quitadas.delete(t); acomodar({ con: t }); }
      else { estado.quitadas.add(t); delete estado.fijadas[t]; acomodar({ sin: t }); }
    }
    revisar(); guardar();
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('.contador-num button');
    if (b) {
      if (b.disabled) return;
      mover(b.closest('.contador-num'), +b.dataset.paso);
      revisar(); guardar();
      return;
    }
    // toda la tarjeta de la serie se marca con un clic, no solo el cuadrito
    const caja = e.target.closest('.serie');
    if (caja && !e.target.closest('input, label, .contador-num')) {
      const c = caja.querySelector('input[type="checkbox"]');
      if (!c.disabled) { c.checked = !c.checked; c.dispatchEvent(new Event('change', { bubbles: true })); }
    }
  });
  $('archivos').addEventListener('change', subirArchivos);
  $('ejemplo').addEventListener('click', ponerEjemplo);
  $('borrar-texto').addEventListener('click', () => { $('texto').value = ''; textoCambio(true); revisar(); guardar(); });
  $('crear').addEventListener('click', crear);
  document.querySelectorAll('.pestanas button').forEach(b => b.addEventListener('click', () => { estado.vista = b.dataset.vista; pintar(); }));
  $('bajar-word').addEventListener('click', bajarWord);
  $('imprimir').addEventListener('click', () => window.print());
  $('bajar-temario').addEventListener('click', () => temarioCanvas(estado.m).toBlob(b => bajar(b, nombreArchivo('TEMARIO') + '.png')));
  $('mezclar').addEventListener('click', () => { estado.parcial.semilla = Math.floor(Math.random() * 1e6); mostrar(); });
  $('guardar').addEventListener('click', () => bajar(new Blob([JSON.stringify(estado.parcial, null, 1)], { type: 'application/json' }), nombreArchivo('PARCIAL') + '.json'));
  $('abrir').addEventListener('change', abrirGuardado);
  medirTexto();
  acomodar({ quiero: g.series ? undefined : new Set(INICIALES[Math.min(2, hojas())]) });
  revisar(); guardar();
}

// ===========================================================================
// EL ACOMODO AUTOMATICO
// El maestro solo marca, quita y toca + y −. Las series, los puntos y las hojas se mueven
// solos para que siempre cuadre y siempre salga con su texto, y una linea dice que se movio.
// ===========================================================================

// Que cantidades de preguntas salen con el texto pegado, serie por serie
function medirTexto() {
  const texto = $('texto').value.trim();
  if (texto.length < 200) { estado.capaz = null; return; }
  const capaz = {};
  for (const t of ORDEN) {
    capaz[t] = new Set();
    const ns = new Map();
    for (const p of valores(t)) if (!ns.has(plan(t, p).n)) ns.set(plan(t, p).n, p);
    for (const [n, p] of ns) {
      try { if (!parcialBasico(datos(), texto, [{ tipo: t, puntos: p }]).cambios.length) capaz[t].add(n); } catch (e) { /* no sale con ese largo */ }
    }
  }
  estado.capaz = capaz;
}

// Mientras escribe o pega se espera un momento antes de volver a medir
function textoCambio(ya) {
  clearTimeout(estado.espera);
  const hacer = () => { medirTexto(); acomodar({}); revisar(); guardar(); };
  if (ya) hacer(); else estado.espera = setTimeout(hacer, 700);
}

// Reparte T puntos entre estas series, cerca de lo que pesa cada una. fijo = la serie que el maestro movio
function repartirEn(tipos, T, fijo) {
  const suma = tipos.reduce((a, t) => a + PESO[t], 0), esc = Math.max(1, T / 30);
  let capa = new Map([[0, { costo: 0, valores: [] }]]);
  for (const t of tipos) {
    const meta = T * PESO[t] / suma, sig = new Map();
    const lista = fijo && fijo.tipo === t ? [fijo.puntos] : sirven(t);
    for (const [s, r] of capa) for (const v of lista) {
      if (s + v > T) break;
      let c = r.costo + ((v - meta) / esc) ** 2;
      if (TOPE[t] && v > TOPE[t]) c += 100 * (v - TOPE[t]);
      if (estado.fijadas[t]) c += 4 * ((v - estado.fijadas[t]) / esc) ** 2;   // lo que el maestro ya acomodo a mano
      const ya = sig.get(s + v);
      if (!ya || c < ya.costo) sig.set(s + v, { costo: c, valores: [...r.valores, v] });
    }
    capa = sig;
  }
  return capa.get(T) || null;
}

// Todas las formas de armar el examen con H hojas y T puntos, la mas parecida a lo marcado primero
function candidatos(H, T, quiero, { con, sin, fijo } = {}, primero) {
  const disp = ORDEN.filter(t => t !== sin && sirven(t).length);
  const ideal = H === 1 ? 2 : Math.min(7, Math.round(2.5 * H));
  const out = [];
  for (let mask = 1; mask < 1 << disp.length; mask++) {
    const S = disp.filter((_, i) => mask >> i & 1);
    if (S.length < 2 * H || (S.includes('completar') && S.includes('parear'))) continue;
    if ((con && !S.includes(con)) || (fijo && !S.includes(fijo.tipo))) continue;
    const r = repartirEn(S, T, fijo);
    if (!r) continue;
    if (primero) return [{ S, valores: r.valores }];
    let costo = r.costo + 10 * Math.abs(S.length - ideal);
    for (const t of ORDEN) {
      if (quiero.has(t) && !S.includes(t)) costo += 30;
      if (!quiero.has(t) && S.includes(t)) costo += estado.quitadas.has(t) ? 60 : 12;
    }
    out.push({ S, valores: r.valores, costo });
  }
  return out.sort((a, b) => a.costo - b.costo);
}
const hay = (H, T, quiero, acc) => candidatos(H, T, quiero, acc, true).length > 0;

// Prueba de verdad que el examen sale con el texto, sin cambiar ninguna serie.
// 2 = sale limpio, 1 = sale pero una respuesta se ve escrita en otra serie, 0 = no sale
function sale(c) {
  const texto = $('texto').value.trim();
  if (texto.length < 200) return 2;
  try {
    const p = parcialBasico(datos(), texto, c.S.map((t, i) => ({ tipo: t, puntos: c.valores[i] })));
    return p.cambios.length ? 0 : cruces(p.series).length ? 1 : 2;
  } catch (e) { return 0; }
}

// Acomoda todo despues de lo que hizo el maestro. acc.con o acc.sin = la serie que marco o quito,
// acc.fijo = la serie a la que le movio los puntos, acc.que = 'hojas' o 'total' si toco eso.
// Si con las hojas y el punteo de ahora no se puede, se mueve lo otro y se avisa.
function acomodar(acc) {
  const antes = { H: hojas(), T: total(), marcadas: new Set(eleccion().map(e => e.tipo)) };
  const quiero = acc.quiero || new Set(antes.marcadas);
  if (acc.con) quiero.add(acc.con);
  if (acc.sin) quiero.delete(acc.sin);
  // si el maestro no toco las series y lo de ahora ya cuadra y sale con el texto, se respeta tal cual
  if (!acc.quiero && !acc.con && !acc.sin && !acc.fijo && !acc.que) {
    const el = eleccion();
    const ahora = { S: el.map(e => e.tipo), valores: el.map(e => e.puntos) };
    if (!revisarEleccion(el, antes.T, antes.H).length && sale(ahora)) { estado.avisosPlan = []; return true; }
  }
  const cerca = (lista, v) => lista.filter(x => x !== v).sort((a, b) => Math.abs(a - v) - Math.abs(b - v) || b - a);
  const intentos = [[antes.H, antes.T]];
  if (acc.que === 'hojas') intentos.push(...cerca(TOTALES, antes.T).map(T => [antes.H, T]));
  else if (acc.que === 'total') intentos.push(...cerca(HOJAS, antes.H).map(H => [H, antes.T]));
  else if (!acc.fijo) intentos.push(...cerca(HOJAS, antes.H).map(H => [H, antes.T]), ...cerca(TOTALES, antes.T).map(T => [antes.H, T]));
  let elegido = null, respaldo = null, probados = 0;
  for (const [H, T] of intentos) {
    let aqui = 0;
    for (const c of candidatos(H, T, quiero, acc)) {
      if (aqui++ >= 12 || probados++ >= 60) break;
      const r = sale(c);
      if (r === 2) { elegido = { H, T, c }; break; }
      if (r === 1 && !respaldo) respaldo = { H, T, c };
    }
    // con estas hojas y este punteo, mejor uno donde ninguna respuesta se vea en otra serie
    if (!elegido && respaldo) elegido = respaldo;
    if (elegido || probados >= 60) break;
  }
  const avisos = [];
  if (!elegido) {
    // no hay forma, se deja como estaba
    if (acc.con) $('s-' + acc.con).checked = false;
    if (acc.sin) $('s-' + acc.sin).checked = true;
    if (acc.con || acc.sin) avisos.push(`${nombre(acc.con || acc.sin)} no se puede ${acc.con ? 'agregar' : 'quitar'}, así ya no cuadra.`);
    else if (acc.que === 'hojas') avisos.push(`Con este texto no salen preguntas para ${antes.H} hojas. Pegue más contenido de sus clases.`);
    else if (acc.que === 'total') avisos.push(`Con este texto no salen preguntas para ${antes.T} puntos. Pegue más contenido de sus clases.`);
    else if (estado.capaz) avisos.push('Con este texto no alcanza para el examen. Pegue más contenido de sus clases.');
    estado.avisosPlan = avisos;
    return false;
  }
  const { H, T, c } = elegido;
  $('hojas').textContent = H;
  $('total').textContent = T;
  for (const t of ORDEN) {
    const i = c.S.indexOf(t);
    $('s-' + t).checked = i >= 0;
    if (i >= 0) $('p-' + t).textContent = c.valores[i];
  }
  // lo que se movio solo, en una linea cada cosa
  const las = n => n === 1 ? 'la hoja' : `las ${n} hojas`;
  if (H !== antes.H) avisos.push(`Con ${T} puntos el examen va en ${H} hoja${H > 1 ? 's' : ''}.`);
  if (T !== antes.T) avisos.push(`Para ${H} hoja${H > 1 ? 's' : ''} el punteo pasa a ${T}.`);
  const quitadas = [...antes.marcadas].filter(t => !c.S.includes(t) && t !== acc.sin);
  if (!acc.quiero) for (const t of quitadas) {
    const otra = t === 'completar' ? 'parear' : t === 'parear' ? 'completar' : null;
    avisos.push(otra && c.S.includes(otra) ? `Se quitó ${nombre(t)} porque no va junto con ${nombre(otra)}.`
      : !sirven(t).length ? `Se quitó ${nombre(t)}, ${PORQUE[t]}.`
      : estado.capaz ? `Se quitó ${nombre(t)} para que todo salga con su texto.` : `Se quitó ${nombre(t)} para que cuadren los puntos.`);
  }
  const puestas = c.S.filter(t => !antes.marcadas.has(t) && t !== acc.con);
  if (!acc.quiero) for (const t of puestas) avisos.push(quitadas.length || acc.sin ? `Se puso ${nombre(t)} en su lugar.` : `Se agregó ${nombre(t)} para llenar ${las(H)}.`);
  estado.avisosPlan = avisos;
  return true;
}

// Un contador sube o baja. Las hojas y el punteo mueven lo demas; los puntos de una serie
// saltan al siguiente valor con el que todo sigue cuadrando.
function mover(caja, paso) {
  const serie = caja.dataset.serie, campo = caja.dataset.campo;
  const out = caja.querySelector('output'), v = +out.textContent;
  if (serie) {
    const sig = siguientePunto(serie, paso);
    if (sig == null) return;
    estado.fijadas[serie] = sig;
    acomodar({ fijo: { tipo: serie, puntos: sig } });
    return;
  }
  const sig = siguienteCampo(campo, paso);
  if (sig == null) {
    // el boton no se apaga, al tocarlo dice hasta donde se puede
    const s = v > 1 ? 's' : '';
    estado.avisosPlan = [campo === 'hojas'
      ? (paso > 0 ? `Con este texto y este punteo lo más son ${v} hoja${s}.` : `Con este punteo lo menos son ${v} hoja${s}.`)
      : `Con este texto el punteo no puede ${paso > 0 ? 'subir' : 'bajar'} más.`];
    return;
  }
  out.textContent = sig;
  if (!acomodar({ que: campo })) out.textContent = v;
}

function siguientePunto(t, paso) {
  const quiero = new Set(eleccion().map(e => e.tipo)), v = puntosDe(t), H = hojas(), T = total();
  // las demas series necesitan al menos 4 puntos cada una
  const lista = sirven(t).filter(x => (paso > 0 ? x > v : x < v) && x <= T - 4 * (2 * H - 1));
  if (paso < 0) lista.reverse();
  for (const p of lista.slice(0, 6)) if (hay(H, T, quiero, { fijo: { tipo: t, puntos: p } })) return p;
  return null;
}

function siguienteCampo(campo, paso) {
  const lista = campo === 'hojas' ? HOJAS : TOTALES, v = +$(campo).textContent;
  const quiero = new Set(eleccion().map(e => e.tipo));
  const pasos = lista.filter(x => paso > 0 ? x > v : x < v);
  if (paso < 0) pasos.reverse();
  // sirve si con lo otro de ahora, o moviendolo, hay alguna forma de armarlo
  for (const x of pasos) {
    const ok = campo === 'hojas' ? TOTALES.some(T => hay(x, T, quiero)) : HOJAS.some(H => hay(H, x, quiero));
    if (ok) return x;
  }
  return null;
}

// Revisa la eleccion de series cada vez que algo cambia
function revisar() {
  $('caja-materia-otra').hidden = $('materia').value !== 'otra';
  for (const t of ORDEN) {
    const marcada = $('s-' + t).checked, puntos = puntosDe(t), puede = sirven(t).length > 0;
    $('caja-' + t).classList.toggle('activa', marcada);
    $('caja-' + t).classList.toggle('no-sale', !puede);
    $('s-' + t).disabled = !puede && !marcada;
    const pl = plan(t, puntos), d = $('d-' + t);
    d.classList.toggle('mal', !puede);
    d.textContent = !puede ? mayus(PORQUE[t]) + '.' : !marcada ? 'Toque para agregarla' : !pl ? '' : t === 'dibujo' ? `Dibujo de 2 puntos y ${pl.n} partes de 1 punto`
      : `${pl.n} ${t === 'ordenar' ? 'pasos' : t === 'clasificar' ? 'elementos' : 'preguntas'} de ${pts(pl.valor)}`;
  }
  const el = eleccion(), suma = el.reduce((a, e) => a + e.puntos, 0);
  const malos = revisarEleccion(el, total(), hojas());
  const H = hojas();
  $('suma').textContent = malos.length ? malos.join(' ') : `Listo, ${el.length} series en ${H} hoja${H > 1 ? 's' : ''} que suman ${suma} puntos.`;
  $('suma').className = 'suma ' + (malos.length ? 'mal' : 'bien');
  $('cambios').innerHTML = (estado.avisosPlan || []).map(a => `<li>${esc(a)}</li>`).join('');
  const n = $('texto').value.trim().length;
  $('cuenta').textContent = n ? `${n.toLocaleString('es')} letras` : '';
  pintarBotones();
  return malos;
}

// Un boton de + o − se apaga si ya no hay a donde moverse
function pintarBotones() {
  for (const t of ORDEN) {
    const caja = document.querySelector(`[data-serie="${t}"]`), marcada = $('s-' + t).checked;
    caja.querySelector('[data-paso="-1"]').disabled = !marcada || siguientePunto(t, -1) == null;
    caja.querySelector('[data-paso="1"]').disabled = !marcada || siguientePunto(t, 1) == null;
  }
  for (const campo of ['hojas', 'total']) {
    const caja = document.querySelector(`[data-campo="${campo}"]`);
    const lista = campo === 'hojas' ? HOJAS : TOTALES, v = +$(campo).textContent;
    caja.querySelector('[data-paso="-1"]').disabled = v <= lista[0];
    caja.querySelector('[data-paso="1"]').disabled = v >= lista[lista.length - 1];
  }
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
    textoCambio(true); revisar(); guardar();
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
  estado.quitadas.clear(); estado.fijadas = {};
  clearTimeout(estado.espera);
  medirTexto(); acomodar({}); revisar(); guardar();
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
  const d = datos(), texto = $('texto').value.trim();
  if (!d.materia) { aviso('Escriba cuál es la materia.', true); return; }
  if (texto.length < 200) { aviso('Falta el contenido de las clases (paso 2).', true); return; }
  // por si pego texto hace un momento, se mide y se acomoda ya
  clearTimeout(estado.espera);
  medirTexto(); acomodar({});
  const malos = revisar();
  if (malos.length) { aviso(malos.join('\n'), true); return; }
  $('crear').disabled = true;
  try {
    await ponerLogo();
    estado.parcial = parcialBasico(datos(), texto, eleccion());
    mostrar();
    // si no cabe en las hojas, se prueba otra mezcla de series y despues una hoja mas
    if (!estado.mx.cabe) {
      const quiero = new Set(eleccion().map(e => e.tipo)), H = hojas(), T = total();
      // primero las mezclas donde ninguna respuesta se ve en otra serie
      const limpias = l => l.map(c => ({ c, r: sale(c) })).filter(x => x.r).sort((a, b) => b.r - a.r).map(x => x.c);
      const otras = limpias(candidatos(H, T, quiero).slice(0, 12)).slice(0, 8);
      for (const H2 of [H + 1, H + 2].filter(x => x <= 4)) otras.push(...limpias(candidatos(H2, T, quiero).slice(0, 8).map(c => ({ ...c, H: H2 }))).slice(0, 3));
      for (const c of otras) {
        const antes = { H: hojas(), el: eleccion() };
        $('hojas').textContent = c.H || H;
        for (const t of ORDEN) { const i = c.S.indexOf(t); $('s-' + t).checked = i >= 0; if (i >= 0) $('p-' + t).textContent = c.valores[i]; }
        estado.parcial = parcialBasico(datos(), texto, eleccion());
        mostrar();
        if (estado.mx.cabe) {
          estado.avisosPlan = [c.H ? `No cabía en ${H} hoja${H > 1 ? 's' : ''}, se pasó a ${c.H}.` : `No cabía en ${H} hoja${H > 1 ? 's' : ''}, se cambiaron las series para que quepa.`];
          $('avisos').insertAdjacentHTML('afterbegin', `<li>${esc(estado.avisosPlan[0])}</li>`);
          break;
        }
        $('hojas').textContent = antes.H;
        for (const t of ORDEN) { const e = antes.el.find(x => x.tipo === t); $('s-' + t).checked = !!e; if (e) $('p-' + t).textContent = e.puntos; }
      }
      if (!estado.mx.cabe) { estado.parcial = parcialBasico(datos(), texto, eleccion()); mostrar(); }
      revisar(); guardar();
    }
    $('mensajes').innerHTML = '';
    $('resultado').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    $('resultado').hidden = true;                 // que no quede a la vista un examen viejo
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
