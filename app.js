// La pagina. Guarda lo que el maestro escribe en este navegador, arma el parcial y lo muestra.

const $ = id => document.getElementById(id);
const CLAVE = 'generador-parciales.v1';
const CAMPOS = ['colegio', 'materia', 'grado', 'examen', 'profesor', 'ciclo', 'hoja', 'hojas', 'total'];
const PUNTOS_INICIALES = { ordenar: 5, completar: 6, dibujo: 6, clasificar: 6, abiertas: 6, vf: 6, seleccion: 8, parear: 5 };
const MARCADAS_INICIALES = ['ordenar', 'dibujo', 'abiertas', 'seleccion', 'parear'];

const estado = { logo: null, parcial: null, m: null, mres: null, vista: 'examen', ia: {} };

function leerGuardado() {
  try { return JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch (e) { return {}; }
}
function guardar() {
  const g = { campos: {}, series: {}, motor: motor(), ia: estado.ia, proveedor: $('proveedor').value };
  for (const c of CAMPOS) g.campos[c] = $(c).value;
  for (const t of ORDEN) g.series[t] = { marcada: $('s-' + t).checked, puntos: $('p-' + t).value };
  g.texto = $('texto').value.length < 200000 ? $('texto').value : '';
  if (estado.logo) g.logo = estado.logo.url;
  try { localStorage.setItem(CLAVE, JSON.stringify(g)); } catch (e) { /* sin espacio o en privado, se sigue igual */ }
}

const motor = () => document.querySelector('input[name="motor"]:checked').value;
const datos = () => ({
  colegio: limpio($('colegio').value), materia: limpio($('materia').value), grado: limpio($('grado').value),
  examen: limpio($('examen').value), profesor: limpio($('profesor').value), ciclo: limpio($('ciclo').value),
  hoja: $('hoja').value, hojas: +$('hojas').value,
});
const eleccion = () => ORDEN.filter(t => $('s-' + t).checked).map(t => ({ tipo: t, puntos: +$('p-' + t).value || 0 }));

// ===========================================================================
// ARMAR LA PANTALLA
// ===========================================================================

function iniciar() {
  const g = leerGuardado();
  $('grados').innerHTML = GRADOS.map(x => `<option value="${x}">`).join('');
  $('series').innerHTML = ORDEN.map(t => `
    <div class="serie" id="caja-${t}">
      <input type="checkbox" id="s-${t}" aria-label="${SERIES[t].nombre}">
      <label class="nombre" for="s-${t}">${SERIES[t].nombre}</label>
      <input type="number" id="p-${t}" min="1" max="60" aria-label="Puntos de ${SERIES[t].nombre}">
      <span class="detalle" id="d-${t}"></span>
    </div>`).join('');
  $('proveedor').innerHTML = Object.entries(PROVEEDORES).map(([k, v]) => `<option value="${k}">${v.nombre}</option>`).join('');

  const campos = g.campos || {};
  $('ciclo').value = new Date().getFullYear();
  for (const c of CAMPOS) if (campos[c]) $(c).value = campos[c];
  for (const t of ORDEN) {
    const s = (g.series || {})[t];
    $('s-' + t).checked = s ? s.marcada : MARCADAS_INICIALES.includes(t);
    $('p-' + t).value = s && s.puntos ? s.puntos : PUNTOS_INICIALES[t];
  }
  if (g.texto) $('texto').value = g.texto;
  if (g.motor === 'ia') document.querySelector('input[value="ia"]').checked = true;
  estado.ia = g.ia || {};
  $('proveedor').value = g.proveedor || 'gratis';
  ponerProveedor(false);
  if (g.logo) cargarLogo(g.logo);

  document.addEventListener('input', e => { if (e.target.closest('.paso') && e.target.id !== 'abrir') { revisar(); guardar(); } });
  document.addEventListener('change', e => { if (e.target.closest('.paso')) { revisar(); guardar(); } });
  $('proveedor').addEventListener('change', () => ponerProveedor(true));
  for (const id of ['ia-url', 'ia-modelo', 'ia-clave']) $(id).addEventListener('input', () => {
    estado.ia[$('proveedor').value] = { url: $('ia-url').value, modelo: $('ia-modelo').value, clave: $('ia-clave').value };
    guardar();
  });
  $('logo').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    const url = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(f); });
    await cargarLogo(url); guardar();
  });
  $('archivos').addEventListener('change', subirArchivos);
  $('ejemplo').addEventListener('click', ponerEjemplo);
  $('borrar-texto').addEventListener('click', () => { $('texto').value = ''; revisar(); guardar(); });
  $('probar-ia').addEventListener('click', probarIA);
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

async function cargarLogo(url) {
  const img = new Image();
  await new Promise((ok, mal) => { img.onload = ok; img.onerror = mal; img.src = url; }).catch(() => null);
  if (!img.naturalWidth) return;
  const datos = Uint8Array.from(atob(url.split(',')[1]), c => c.charCodeAt(0));
  estado.logo = { url, datos, ancho: img.naturalWidth, alto: img.naturalHeight };
  $('logo-estado').textContent = 'Logo cargado';
}

function ponerProveedor(cambio) {
  const k = $('proveedor').value, p = PROVEEDORES[k], g = estado.ia[k] || {};
  $('ia-url').value = g.url || p.url;
  $('ia-modelo').value = g.modelo || p.modelo;
  $('ia-clave').value = g.clave || '';
  $('caja-clave').style.display = p.clave || k === 'otra' ? '' : 'none';
  $('estado-ia').textContent = '';
  if (cambio) guardar();
}

// Revisa la eleccion de series cada vez que algo cambia
function revisar() {
  const total = +$('total').value || 0, hojas = +$('hojas').value;
  for (const t of ORDEN) {
    const marcada = $('s-' + t).checked, puntos = +$('p-' + t).value || 0;
    $('caja-' + t).classList.toggle('activa', marcada);
    const pl = plan(t, puntos), d = $('d-' + t);
    if (!pl) { d.textContent = 'No cuadra con esos puntos'; d.classList.add('mal'); }
    else {
      d.classList.remove('mal');
      d.textContent = t === 'dibujo' ? `Dibujo de 2 puntos y ${pl.n} partes de 1 punto`
        : `${pl.n} ${t === 'ordenar' ? 'pasos' : t === 'clasificar' ? 'elementos' : 'preguntas'} de ${pts(pl.valor)}`;
    }
  }
  const el = eleccion(), suma = el.reduce((a, e) => a + e.puntos, 0);
  const malos = revisarEleccion(el, total, hojas);
  $('suma').textContent = malos.length ? malos.join(' ') : `Suma ${suma} de ${total} puntos, ${el.length} series en ${hojas} hoja${hojas > 1 ? 's' : ''}.`;
  $('suma').className = 'suma ' + (malos.length ? 'mal' : 'bien');
  $('panel-ia').hidden = motor() !== 'ia';
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
  for (const t of ORDEN) {
    $('s-' + t).checked = t in EJEMPLO.series;
    if (t in EJEMPLO.series) $('p-' + t).value = EJEMPLO.series[t];
  }
  $('total').value = 30; $('hojas').value = 2;
  revisar(); guardar();
}

async function probarIA() {
  const cfg = { url: $('ia-url').value, modelo: $('ia-modelo').value, clave: $('ia-clave').value, sinLista: !!PROVEEDORES[$('proveedor').value].sinLista };
  $('estado-ia').textContent = 'Probando';
  try {
    const modelos = await listarModelos(cfg);
    $('modelos').innerHTML = modelos.map(m => `<option value="${m}">`).join('');
    if (!cfg.modelo && modelos.length) { $('ia-modelo').value = modelos[0]; estado.ia[$('proveedor').value] = { ...cfg, modelo: modelos[0] }; guardar(); }
    $('estado-ia').textContent = modelos.length ? `Conectada, ${modelos.length} modelo${modelos.length > 1 ? 's' : ''} disponibles` : 'Conectada, pero no tiene modelos';
  } catch (err) { $('estado-ia').textContent = err.message; }
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
  if (!d.materia || !d.grado || !d.examen) malos.unshift('Escriba la materia, el grado y el nombre del examen.');
  if (texto.length < 200) malos.unshift('Falta el contenido de las clases (paso 2).');
  if (motor() === 'ia' && (!$('ia-url').value || !$('ia-modelo').value)) malos.push('Falta la dirección o el modelo de la IA. Use Probar conexión.');
  if (malos.length) { aviso(malos.join('\n'), true); return; }
  d.colegio = d.colegio || 'Centro Educativo';
  d.profesor = d.profesor || '';
  $('crear').disabled = true;
  try {
    if (motor() === 'basico') {
      estado.parcial = parcialBasico(d, texto, el);
    } else {
      const prov = PROVEEDORES[$('proveedor').value];
      const cfg = { ...prov, url: $('ia-url').value, modelo: $('ia-modelo').value, clave: $('ia-clave').value,
        alEsperar: seg => aviso(`   la IA gratis da una respuesta cada 30 segundos, esperando ${seg} segundos`) };
      const preguntar = (s, u, f) => preguntarIA(cfg, s, u, f);
      aviso(prov.sinLista ? 'Preguntando a la IA gratis, una serie a la vez. Da una respuesta cada 30 segundos, así que tarda de 3 a 5 minutos.'
        : 'Preguntando a la IA, una serie a la vez. Puede tardar uno o dos minutos.');
      estado.parcial = await parcialConIA(d, texto.slice(0, prov.sinLista ? 12000 : 30000), el, preguntar, aviso, null, prov.sinLista ? 4 : 99);
    }
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
  const avisos = cruces(estado.m.series);
  if (!estado.mx.cabe) avisos.unshift(`El examen no cabe bien en ${estado.m.datos.hojas} hoja${estado.m.datos.hojas > 1 ? 's' : ''}. Quite puntos a la serie más larga, agregue una hoja o use hoja oficio.`);
  if (!p.temario.puntos.length) avisos.push('No salió el temario.');
  if (p.modo === 'basico') avisos.push('Hecho en modo básico. Revise la redacción de cada pregunta, con una IA conectada salen preguntas de razonar.');
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
