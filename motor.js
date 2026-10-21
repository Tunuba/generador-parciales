// Motor del generador de parciales. Misma logica que COLEGIO\GENERADOR DE PARCIALES\parcial.py
// Pedidos a la IA, revision de lo que devuelve, mezcla de respuestas y la hoja en bloques
// (parrafos y tablas) que despues se dibujan en pantalla y en Word.

const SERIES = {
  ordenar:    { nombre: 'Ordenar pasos', min: 4, max: 8 },
  completar:  { nombre: 'Completar oraciones', min: 4, max: 10 },
  dibujo:     { nombre: 'Dibujar y señalar', min: 5, max: 10 },
  clasificar: { nombre: 'Clasificar conceptos', min: 6, max: 12 },
  abiertas:   { nombre: 'Preguntas abiertas', min: 2, max: 6 },
  vf:         { nombre: 'Verdadero o falso', min: 6, max: 10 },
  seleccion:  { nombre: 'Selección múltiple', min: 4, max: 10 },
  parear:     { nombre: 'Parear columnas', min: 4, max: 10 },
};
// Orden en el examen, series cortas primero, Dibujar temprano y las de texto largo al final
const ORDEN = Object.keys(SERIES);
const ETIQUETAS = ['Primera', 'Segunda', 'Tercera', 'Cuarta', 'Quinta', 'Sexta', 'Séptima', 'Octava'];

const GRADOS = ['Primero Primaria', 'Segundo Primaria', 'Tercero Primaria', 'Cuarto Primaria',
  'Quinto Primaria', 'Sexto Primaria', 'Primero Básico', 'Segundo Básico', 'Tercero Básico',
  'Cuarto Diversificado', 'Quinto Diversificado', 'Sexto Diversificado'];

// Cuantas preguntas lleva una serie y cuanto vale cada una, o null si no cuadra
function plan(tipo, puntos) {
  const s = SERIES[tipo];
  if (tipo === 'dibujo') {
    const partes = puntos - 2;            // 2 puntos el dibujo y 1 cada parte
    return partes >= 3 && partes <= 8 ? { n: partes, valor: 1 } : null;
  }
  if (tipo === 'abiertas') {
    for (const n of [5, 4, 3, 6, 2]) if (puntos % n === 0 && puntos / n >= 2) return { n, valor: puntos / n };
    return null;
  }
  for (const valor of [1, 2, 3, 4, 5]) {
    const n = puntos / valor;
    if (puntos % valor === 0 && n >= s.min && n <= s.max) return { n, valor };
  }
  return null;
}

function revisarEleccion(eleccion, total, hojas) {
  const malos = [];
  const tipos = eleccion.map(e => e.tipo);
  const suma = eleccion.reduce((a, e) => a + e.puntos, 0);
  if (!eleccion.length) malos.push('Elija al menos una serie.');
  if (suma !== total) malos.push(`Las series suman ${suma} y el examen vale ${total}.`);
  if (tipos.includes('completar') && tipos.includes('parear'))
    malos.push('Completar oraciones y Parear columnas no van juntas, el contenido sale casi igual.');
  if (eleccion.length < hojas * 2)
    malos.push(`Con ${hojas} hoja${hojas > 1 ? 's' : ''} van al menos ${hojas * 2} series, dos por hoja.`);
  for (const e of eleccion) if (!plan(e.tipo, e.puntos)) malos.push(`${SERIES[e.tipo].nombre} no se puede armar con ${e.puntos} puntos.`);
  return malos;
}

// ===========================================================================
// LO QUE SE LE PIDE A LA IA
// ===========================================================================

function nivel(grado) {
  const g = (grado || '').toLowerCase();
  if (/(primero|segundo|tercero) primaria/.test(g))
    return 'alumnos de 7 a 9 años. Oraciones muy cortas, de menos de 15 palabras, palabras sencillas y nada abstracto.';
  if (g.includes('primaria')) return 'alumnos de 10 a 12 años. Oraciones claras y ejemplos de la vida diaria.';
  if (g.includes('básico') || g.includes('basico')) return 'alumnos de 13 a 15 años. Puede pedir que expliquen y comparen.';
  return 'alumnos de 16 a 18 años. Puede pedir análisis, aplicación y casos.';
}

function pedidoSerie(tipo, n) {
  switch (tipo) {
    case 'seleccion': return [
      `Escriba ${n} preguntas de selección múltiple. Cada una con UNA respuesta correcta y TRES incorrectas que suenen posibles, del mismo largo que la correcta. Nada de 'todas las anteriores' ni 'ninguna'. Cada pregunta sobre un tema distinto del contenido, sin repetir la misma forma de preguntar. Mezcle preguntas de recordar con preguntas de un caso de la vida diaria.`,
      { preguntas: [{ pregunta: '...', correcta: '...', incorrectas: ['...', '...', '...'] }] }];
    case 'vf': return [
      `Escriba ${n} afirmaciones para verdadero o falso. Exactamente ${Math.floor(n / 2)} deben ser FALSAS y ${n - Math.floor(n / 2)} VERDADERAS. Las falsas cambian un dato real del contenido. En 'correccion' escriba la afirmación corregida (en las verdaderas deje 'correccion' vacío).`,
      { afirmaciones: [{ texto: '...', es_verdadera: true, correccion: '' }] }];
    case 'abiertas': return [
      `Escriba ${n} preguntas abiertas de casos concretos, por qué se usa algo, cómo funcionan juntas dos cosas, qué pasaría si. Nada de preguntas generales donde cualquier respuesta sirve. Dé la respuesta esperada en una o dos oraciones.`,
      { preguntas: [{ pregunta: '¿...?', respuesta: '...' }] }];
    case 'completar': return [
      `Escriba ${n} oraciones para completar. En cada oración ponga ___ (tres guiones bajos) en el lugar de UNA palabra clave, y esa palabra va en 'palabra'. Las ${n} palabras deben ser distintas. Agregue en 'trampas' 2 palabras del mismo tema que no completan ninguna oración.`,
      { oraciones: [{ oracion: 'El ___ es ...', palabra: '...' }], trampas: ['...', '...'] }];
    case 'parear': return [
      `Escriba ${n} pares de definición y concepto. El concepto es de una a tres palabras. Agregue en 'trampas' 2 conceptos más del mismo tema que no corresponden a ninguna definición. 'trampas' es obligatorio y lleva exactamente 2 palabras.`,
      { pares: [{ definicion: '...', concepto: '...' }], trampas: ['...', '...'] }];
    case 'ordenar': return [
      `Elija UN procedimiento del contenido donde el orden sí importa (un experimento, las etapas de un proceso, los pasos para hacer o armar algo) y escriba sus ${n} pasos en el ORDEN CORRECTO. Una lista de consejos o de ejemplos NO sirve, porque no tiene orden. Cada paso en una oración corta. 'proceso' empieza con Pasos para y dice qué se logra.`,
      { proceso: 'Pasos para ...', pasos: ['...', '...'] }];
    case 'clasificar': {
      const k = (n >= 10 || (n % 4 === 0 && n % 3 !== 0)) ? 4 : 3;
      const rep = Array.from({ length: k }, (_, i) => Math.floor(n / k) + (i < n % k ? 1 : 0));
      return [
        `Escriba ${k} categorías del contenido. La primera con ${rep[0]} elementos, ${rep.slice(1).map(r => 'la siguiente con ' + r).join(', ')}. En total ${n} elementos, cada uno de una a tres palabras, ninguno repetido.`,
        { categorias: [{ nombre: '...', elementos: ['...', '...'] }] }];
    }
    case 'dibujo': return [
      `Diga qué debe dibujar el alumno (algo del contenido que tenga partes) y ${n} partes que debe señalar con flechas. En 'respuesta' describa cómo se ve un buen dibujo.`,
      { dibujar: '...', partes: ['...', '...'], respuesta: '...' }];
  }
  throw new Error(tipo);
}

function pedidoTemario() {
  return ['Escriba entre 6 y 8 puntos de un temario de estudio que cubra lo que se evalúa. Cada punto empieza con Estudiar, Repasar o Practicar y dice QUÉ estudiar sin dar la respuesta. No mencione el examen, las series, los puntos ni el tipo de pregunta.',
    { puntos: ['Estudiar ...', 'Repasar ...'] }];
}

function sistema(d) {
  return `Usted es un maestro guatemalteco con experiencia que redacta exámenes. Materia ${d.materia}, grado ${d.grado}, para ${nivel(d.grado)} ` +
    'Use SOLO lo que dice el contenido de las presentaciones, no invente temas nuevos. Español correcto con tildes. ' +
    'Una pregunta nunca debe dar la respuesta de otra. Responda solo con JSON.';
}

function mensaje(contenido, instruccion, forma, error, ya) {
  let m = `CONTENIDO DE LAS PRESENTACIONES\n${contenido}\n\n`;
  if (ya && ya.length) m += 'YA ESTÁ EN EL EXAMEN (no lo repita, no pregunte lo mismo y no escriba estas respuestas en su texto, busque otros temas del contenido)\n' + ya.map(y => '- ' + y).join('\n') + '\n\n';
  m += `TAREA\n${instruccion}\n\nResponda con un JSON con esta forma exacta\n${JSON.stringify(forma)}`;
  if (error) m += `\n\nSu respuesta anterior no sirvió por esto, corríjalo. ${error}`;
  return m;
}

// Un solo texto para pegar en ChatGPT, Gemini o Claude con todas las series juntas
function pedidoCompleto(d, contenido, eleccion) {
  const partes = [], forma = { series: {} };
  for (const e of ordenar(eleccion)) {
    const { n } = plan(e.tipo, e.puntos);
    const [inst, f] = pedidoSerie(e.tipo, n);
    partes.push(`- Serie '${e.tipo}' (${SERIES[e.tipo].nombre}). ${inst}`);
    forma.series[e.tipo] = f;
  }
  const [inst, f] = pedidoTemario();
  partes.push(`- Temario. ${inst}`);
  forma.temario = f;
  return sistema(d) + '\n\nCONTENIDO DE LAS PRESENTACIONES\n' + contenido + '\n\n' +
    'TAREA\nPrepare el contenido de un examen con estas series. Las series no repiten temas ni preguntas entre sí, y ninguna trae escrita la respuesta de otra.\n' +
    partes.join('\n') + '\n\nResponda SOLO con un bloque JSON con esta forma exacta, sin texto antes ni después\n' + JSON.stringify(forma, null, 1);
}

function sacarJson(texto) {
  let t = String(texto || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  t = t.replace(/^```(?:json)?/i, '').replace(/```\s*$/, '').trim();
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b < 0) throw new Error('No se encontró ningún JSON en la respuesta.');
  return JSON.parse(t.slice(a, b + 1));
}

// JSON Schema sacado del ejemplo de forma, para que las llaves salgan exactas
function esquema(ej) {
  if (Array.isArray(ej)) return { type: 'array', items: esquema(ej[0]) };
  if (ej && typeof ej === 'object') {
    const props = {};
    for (const k of Object.keys(ej)) props[k] = esquema(ej[k]);
    return { type: 'object', properties: props, required: Object.keys(ej) };
  }
  if (typeof ej === 'boolean') return { type: 'boolean' };
  return { type: 'string' };
}

function ordenar(eleccion) {
  return [...eleccion].sort((a, b) => ORDEN.indexOf(a.tipo) - ORDEN.indexOf(b.tipo));
}

// ===========================================================================
// REVISAR LO QUE DEVUELVE LA IA. Lanza Error con lo que esta mal; ese texto
// se le devuelve a la IA para que lo corrija.
// ===========================================================================

const limpio = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const normal = s => limpio(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function unicos(lista, que) {
  const v = lista.map(normal);
  if (new Set(v).size !== v.length) throw new Error(`hay ${que} repetidos`);
}
const textos = l => (Array.isArray(l) ? l : []).filter(t => typeof t === 'string').map(limpio).filter(Boolean);
const objetos = l => (Array.isArray(l) ? l : []).filter(o => o && typeof o === 'object');

function revisarSerie(tipo, x, n) {
  if (!x || typeof x !== 'object') throw new Error('no es un objeto JSON');
  if (tipo === 'seleccion') {
    const qs = objetos(x.preguntas);
    if (qs.length < n) throw new Error(`pedí ${n} preguntas y vinieron ${qs.length}`);
    const out = qs.slice(0, n).map(q => {
      const inc = textos(q.incorrectas), c = limpio(q.correcta);
      if (!limpio(q.pregunta) || !c || inc.length < 3) throw new Error('cada pregunta lleva pregunta, correcta y tres incorrectas');
      unicos([c, ...inc.slice(0, 3)], 'opciones');
      return { pregunta: limpio(q.pregunta), correcta: c, incorrectas: inc.slice(0, 3) };
    });
    unicos(out.map(q => q.pregunta), 'preguntas');
    return { preguntas: out };
  }
  if (tipo === 'vf') {
    const af = objetos(x.afirmaciones);
    if (af.length < n) throw new Error(`pedí ${n} afirmaciones y vinieron ${af.length}`);
    const out = af.slice(0, n).map(a => ({ texto: limpio(a.texto), es_verdadera: a.es_verdadera === true || a.es_verdadera === 'true', correccion: limpio(a.correccion) }));
    const falsas = out.filter(a => !a.es_verdadera).length;
    if (falsas < n * 0.3 || falsas > n * 0.7) throw new Error(`vinieron ${falsas} falsas de ${n}, deben ser ${Math.floor(n / 2)}`);
    if (out.some(a => !a.es_verdadera && !a.correccion)) throw new Error('cada afirmación falsa necesita su corrección');
    return { afirmaciones: out };
  }
  if (tipo === 'abiertas') {
    const qs = objetos(x.preguntas);
    if (qs.length < n) throw new Error(`pedí ${n} preguntas y vinieron ${qs.length}`);
    const out = qs.slice(0, n).map(q => ({ pregunta: limpio(q.pregunta), respuesta: limpio(q.respuesta) }));
    if (out.some(q => !q.pregunta || !q.respuesta)) throw new Error('cada pregunta lleva su respuesta esperada');
    return { preguntas: out };
  }
  if (tipo === 'completar') {
    const os = objetos(x.oraciones);
    if (os.length < n) throw new Error(`pedí ${n} oraciones y vinieron ${os.length}`);
    const out = os.slice(0, n).map(o => {
      let t = limpio(o.oracion).replace(/_{2,}/g, '___');
      const pal = limpio(o.palabra);
      if (!t.includes('___') && pal) t = t.replace(new RegExp(pal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '___');
      if (t.split('___').length !== 2 || !pal) throw new Error('cada oración lleva un solo ___ y su palabra');
      return { oracion: t, palabra: pal };
    });
    const trampas = [...textos(x.trampas), ...os.slice(n).map(o => limpio(o.palabra)).filter(Boolean)].slice(0, 2);
    if (trampas.length < 2) throw new Error("faltan las 2 palabras trampa en 'trampas'");
    unicos([...out.map(o => o.palabra), ...trampas], 'palabras');
    return { oraciones: out, trampas };
  }
  if (tipo === 'parear') {
    const sueltos = textos(x.pares);
    const ps = objetos(x.pares);
    if (ps.length < n) throw new Error(`pedí ${n} pares y vinieron ${ps.length}`);
    const out = ps.slice(0, n).map(p => ({ definicion: limpio(p.definicion), concepto: limpio(p.concepto) }));
    const trampas = [...textos(x.trampas), ...sueltos, ...ps.slice(n).map(p => limpio(p.concepto)).filter(Boolean)].slice(0, 2);
    if (out.some(p => !p.definicion || !p.concepto) || trampas.length < 2) throw new Error('cada par lleva definición y concepto, y van 2 trampas');
    unicos([...out.map(p => p.concepto), ...trampas], 'conceptos');
    return { pares: out, trampas };
  }
  if (tipo === 'ordenar') {
    const pasos = textos(x.pasos);
    if (pasos.length < n) throw new Error(`pedí ${n} pasos y vinieron ${pasos.length}`);
    unicos(pasos.slice(0, n), 'pasos');
    return { proceso: limpio(x.proceso) || 'Pasos del proceso', pasos: pasos.slice(0, n) };
  }
  if (tipo === 'clasificar') {
    const cats = objetos(x.categorias).map(c => ({ nombre: limpio(c.nombre), elementos: textos(c.elementos) })).filter(c => c.nombre && c.elementos.length);
    let total = () => cats.reduce((a, c) => a + c.elementos.length, 0);
    while (total() > n) {                       // sobran, se quitan de la categoria mas llena
      const mayor = cats.reduce((a, c) => c.elementos.length > a.elementos.length ? c : a);
      if (mayor.elementos.length <= 2) break;
      mayor.elementos.pop();
    }
    if (cats.length < 2 || cats.length > 4 || total() !== n)
      throw new Error(`deben ser 3 o 4 categorías con ${n} elementos en total, vinieron ${cats.length} con ${total()}`);
    unicos(cats.flatMap(c => c.elementos), 'elementos');
    return { categorias: cats };
  }
  if (tipo === 'dibujo') {
    const partes = textos(x.partes);
    if (partes.length < n || !limpio(x.dibujar)) throw new Error(`falta qué dibujar o las ${n} partes`);
    unicos(partes.slice(0, n), 'partes');
    return { dibujar: limpio(x.dibujar).replace(/\.$/, ''), partes: partes.slice(0, n), respuesta: limpio(x.respuesta) };
  }
  throw new Error(tipo);
}

function revisarTemario(x) {
  const prohibido = /\b(serie|series|punteo|sopa|examen tiene|selecci[oó]n m[uú]ltiple|parear)\b/i;
  const puntos = textos(x && x.puntos).filter(p => !prohibido.test(p)).map(p => p.replace(/\.$/, '') + '.');
  if (puntos.length < 4) throw new Error('el temario necesita al menos 6 puntos que empiecen con Estudiar, Repasar o Practicar');
  return { puntos: puntos.slice(0, 10) };
}

// Lo que ya pregunta una serie, para que las siguientes no lo repitan
function resumen(tipo, x) {
  switch (tipo) {
    case 'seleccion': return x.preguntas.map(q => `${q.pregunta} (${q.correcta})`);
    case 'vf': return x.afirmaciones.map(a => a.texto);
    case 'abiertas': return x.preguntas.map(q => q.pregunta);
    case 'completar': return x.oraciones.map(o => o.oracion.replace('___', o.palabra));
    case 'parear': return x.pares.map(p => `${p.concepto}, ${p.definicion}`);
    case 'ordenar': return [x.proceso];
    case 'clasificar': return x.categorias.map(c => `${c.nombre}, ${c.elementos.join(', ')}`);
    case 'dibujo': return [`Dibujar ${x.dibujar} y señalar ${x.partes.join(', ')}`];
  }
  return [];
}

// Arma el parcial con lo que pego el maestro (todas las series en un JSON)
function parcialDePegado(datos, eleccion, texto) {
  const j = sacarJson(texto);
  const series = ordenar(eleccion).map(e => {
    const { n, valor } = plan(e.tipo, e.puntos);
    const crudo = (j.series || {})[e.tipo];
    if (!crudo) throw new Error(`La respuesta no trae la serie ${SERIES[e.tipo].nombre}. Copie otra vez las instrucciones, cambiaron las series.`);
    try {
      return { tipo: e.tipo, puntos: e.puntos, valor, ...revisarSerie(e.tipo, crudo, n) };
    } catch (err) {
      throw new Error(`${SERIES[e.tipo].nombre}, ${err.message}.`);
    }
  });
  let temario = { puntos: [] };
  try { temario = revisarTemario(j.temario); } catch (e) { /* sin temario se avisa despues */ }
  return { datos, series, temario, semilla: Math.floor(Math.random() * 1e6) };
}

// Dos textos dicen casi lo mismo si comparten la mayoria de sus palabras largas
function parecidas(a, b) {
  const pal = s => new Set(normal(s).split(/[^a-zñ0-9]+/).filter(w => w.length > 3));
  const A = pal(a), B = pal(b);
  if (A.size < 3 || B.size < 3) return false;
  let comun = 0;
  for (const w of A) if (B.has(w)) comun++;
  return comun / Math.min(A.size, B.size) >= 0.75;
}

// Arma el parcial preguntando serie por serie a una IA conectada
async function parcialConIA(datos, contenido, eleccion, preguntar, avisar) {
  const series = [], ya = [];
  for (const e of ordenar(eleccion)) {
    const { n, valor } = plan(e.tipo, e.puntos);
    avisar(`${SERIES[e.tipo].nombre}, ${n} de ${valor} punto${valor > 1 ? 's' : ''} cada una`);
    let error = null, x = null;
    for (let intento = 0; intento < 4 && !x; intento++) {
      const [inst, forma] = pedidoSerie(e.tipo, n);
      try {
        const cand = revisarSerie(e.tipo, await preguntar(sistema(datos), mensaje(contenido, inst, forma, error, ya), forma), n);
        const repetidas = resumen(e.tipo, cand).filter(r => ya.some(y => parecidas(r, y)));
        if (repetidas.length) throw new Error(`repite lo que ya está en el examen, ${repetidas[0]}. Escriba preguntas de otros temas`);
        x = cand;
      } catch (err) {
        if (err.conexion) throw err;
        error = err.message;
        avisar(`   la IA se equivocó (${error}), se le pide otra vez`);
      }
    }
    if (!x) throw new Error(`La IA no pudo armar ${SERIES[e.tipo].nombre}. Pruebe otra vez o use otra IA.`);
    series.push({ tipo: e.tipo, puntos: e.puntos, valor, ...x });
    ya.push(...resumen(e.tipo, x));
  }
  avisar('Temario');
  let temario = { puntos: [] }, error = null;
  for (let intento = 0; intento < 3 && !temario.puntos.length; intento++) {
    const [inst, forma] = pedidoTemario();
    try { temario = revisarTemario(await preguntar(sistema(datos), mensaje(contenido, inst, forma, error, ya), forma)); }
    catch (err) { if (err.conexion) throw err; error = err.message; }
  }
  return { datos, series, temario, semilla: Math.floor(Math.random() * 1e6) };
}

// ===========================================================================
// MEZCLAR. Las respuestas nunca quedan en orden
// ===========================================================================

function azar(semilla) {          // mulberry32, siempre la misma mezcla para la misma semilla
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function barajar(l, rnd) {
  for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1));[l[i], l[j]] = [l[j], l[i]]; }
  return l;
}
const tresSeguidas = v => v.some((x, i) => i >= 2 && x === v[i - 1] && x === v[i - 2]);

function letrasBalanceadas(n, rnd) {
  const base = [];
  while (base.length < n) base.push(...'abcd');
  base.length = n;
  for (let k = 0; k < 2000; k++) {
    barajar(base, rnd);
    if (!tresSeguidas(base) && base.join('') !== [...base].sort().join('')) break;
  }
  return base;
}

// pos[i] = lugar donde queda el elemento i; ninguno de los primeros n queda en su lugar
function desordenar(n, rnd, sobran = 0) {
  const pos = [...Array(n + sobran).keys()];
  for (let k = 0; k < 5000; k++) {
    barajar(pos, rnd);
    if (pos.slice(0, n).every((p, i) => p !== i)) break;
  }
  return pos;
}

function mezclar(x, rnd) {
  if (x.tipo === 'seleccion') {
    const letras = letrasBalanceadas(x.preguntas.length, rnd);
    x.preguntas.forEach((q, i) => {
      const ops = barajar([...q.incorrectas], rnd);
      ops.splice('abcd'.indexOf(letras[i]), 0, q.correcta);
      q.opciones = ops; q.clave = letras[i];
    });
  } else if (x.tipo === 'vf') {
    for (let k = 0; k < 500; k++) { barajar(x.afirmaciones, rnd); if (!tresSeguidas(x.afirmaciones.map(a => a.es_verdadera))) break; }
  } else if (x.tipo === 'completar') {
    const pal = x.oraciones.map(o => o.palabra);
    const banco = [...pal, ...x.trampas];
    for (let k = 0; k < 500; k++) {
      barajar(banco, rnd);
      const pos = pal.map(p => banco.indexOf(p));
      if (pos.some((p, i) => i && p < pos[i - 1])) break;
    }
    x.banco = banco;
  } else if (x.tipo === 'parear') {
    const conceptos = [...x.pares.map(p => p.concepto), ...x.trampas];
    const pos = desordenar(x.pares.length, rnd, 2);
    x.columna = [];
    conceptos.forEach((c, i) => { x.columna[pos[i]] = c; });
    x.pares.forEach((p, i) => { p.clave = 'abcdefghijkl'[pos[i]]; });
  } else if (x.tipo === 'ordenar') {
    const pos = desordenar(x.pasos.length, rnd);
    x.hoja = [];
    x.pasos.forEach((p, i) => { x.hoja[pos[i]] = { paso: p, numero: i + 1 }; });
  } else if (x.tipo === 'clasificar') {
    x.recuadro = barajar(x.categorias.flatMap(c => c.elementos), rnd);
  }
  return x;
}

function mezclado(parcial) {
  const p = JSON.parse(JSON.stringify(parcial));
  const rnd = azar(p.semilla || 1);
  p.series.forEach(x => mezclar(x, rnd));
  return p;
}

// Respuestas cortas que aparecen escritas en otra serie (una pregunta contesta a otra)
function cruces(series) {
  const resp = [], txt = {};
  for (const x of series) {
    if (x.tipo === 'seleccion') { resp.push(...x.preguntas.map(q => [x.tipo, q.correcta])); txt[x.tipo] = x.preguntas.map(q => q.pregunta).join(' '); }
    if (x.tipo === 'completar') { resp.push(...x.oraciones.map(o => [x.tipo, o.palabra])); txt[x.tipo] = x.oraciones.map(o => o.oracion).join(' '); }
    if (x.tipo === 'parear') txt[x.tipo] = x.pares.map(p => p.definicion).join(' ');
    if (x.tipo === 'vf') txt[x.tipo] = x.afirmaciones.map(a => a.texto).join(' ');
    if (x.tipo === 'abiertas') txt[x.tipo] = x.preguntas.map(q => q.pregunta).join(' ');
    if (x.tipo === 'ordenar') txt[x.tipo] = x.proceso + ' ' + x.pasos.join(' ');
  }
  const avisos = [];
  for (const [origen, r] of resp) {
    const nr = normal(r).replace(/\.$/, '');
    if (nr.length < 5) continue;
    const re = new RegExp('(^|[^a-z0-9ñ])' + nr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z0-9ñ])');
    for (const [tipo, t] of Object.entries(txt))
      if (tipo !== origen && re.test(normal(t)))
        avisos.push(`La respuesta ${r} de ${SERIES[origen].nombre} aparece escrita en ${SERIES[tipo].nombre}.`);
  }
  return avisos;
}

// ===========================================================================
// LA HOJA EN BLOQUES. P es un parrafo, T una tabla. Se dibujan igual en
// pantalla (hoja.js) y en Word (word.js)
// ===========================================================================

const LP = 13.8;                       // alto de un renglon de Arial 12, en puntos
const LINEA = '_'.repeat(80);           // 80 guiones bajos de Arial 12 miden 7.41", caben en el renglon
const BLANCO = '___________________';
const R = (t, o = {}) => ({ t, ...o });                    // o.b negrita, o.r rojo, o.u subrayado, o.s tamano
const P = (runs = [], o = {}) => ({ k: 'p', runs: typeof runs === 'string' ? [R(runs)] : runs, ...o });
const T = (anchos, bordes, filas) => ({ k: 't', anchos, bordes, filas });
const dos = n => String(n).padStart(2, '0');
const pts = v => `${v} punto${v !== 1 ? 's' : ''}`;
const rojo = (texto, res, blanco) => res ? R(` ${texto} `, { r: 1, u: 1 }) : R(blanco);

function instruccion(x) {
  const v = x.valor;
  switch (x.tipo) {
    case 'seleccion': return `Subraye la respuesta correcta en cada pregunta. Cada respuesta vale ${pts(v)}.`;
    case 'vf': return `Escriba V si la afirmación es verdadera o F si es falsa. Si es falsa, escriba la corrección. Cada una vale ${pts(v)}.`;
    case 'abiertas': return `Responda las siguientes preguntas. Cada respuesta vale ${pts(v)}.`;
    case 'completar': return `Complete cada oración con la palabra correcta del recuadro. Sobran dos palabras. Cada respuesta vale ${pts(v)}.`;
    case 'parear': return `Escriba dentro del paréntesis la letra del concepto que corresponde a cada definición. Sobran dos conceptos. Cada respuesta vale ${pts(v)}.`;
    case 'ordenar': return `${x.proceso.replace(/\.$/, '')}. Numere del 1 al ${x.pasos.length} los pasos en el orden correcto. Cada número vale ${pts(v)}.`;
    case 'clasificar': return `Escriba cada elemento del recuadro en la categoría correcta. Cada elemento vale ${pts(v)}.`;
    case 'dibujo': return `Dibuje ${x.dibujar.charAt(0).toLowerCase() + x.dibujar.slice(1)} (2 puntos) y señale con flechas estas partes, ${x.partes.join(', ')} (${pts(v)} cada una).`;
  }
}

function encabezadoBloques(d, total, res, logo) {
  const lineas = [d.colegio, (d.materia || '').replace(/\.$/, '') + '.', d.grado, d.examen, 'Prof. ' + d.profesor, 'Ciclo ' + d.ciclo];
  const izq = lineas.map((l, i) => P([R(l, { b: 1 }), ...(res && i === 3 ? [R('  (RESUELTO)', { r: 1 })] : [])]));
  const der = [P(logo ? [{ img: logo }] : [], { centro: 1 })];
  return [
    T([6.5, 1.5], 'ninguno', [{ celdas: [izq, der] }]),
    P([R('Nombre: ___________________________________________________________________', { b: 1 })], { antes: 12 }),
    P([R(`Fecha: ____________________________________________ Punteo: _______________/${total}`, { b: 1 })], { antes: 12 }),
    P([R('Instrucciones Generales: ', { b: 1 }), R('Lea detenidamente las instrucciones que se presentan a continuación en cada una de las series. Responda correctamente utilizando lapicero de color azul o negro, cuide su redacción y ortografía.')], { antes: 12 }),
  ];
}

// aire = puntos de espacio libre que esta serie debe llenar (renglones o separacion)
function serieBloques(et, x, res, aire, inicio) {
  const b = [], v = x.valor;
  // el recuadro de dibujo puede achicarse hasta 5 renglones, lo demas no baja de lo normal
  aire = Math.max(x.tipo === 'dibujo' ? -3 * LP : 0, aire || 0);
  if (!inicio) b.push(P());
  b.push(P([R(`${et} Serie (${dos(x.puntos)} puntos)`, { b: 1 })]));
  b.push(P('Instrucciones: ' + instruccion(x)));
  b.push(P());
  const entre = (i, n) => P([], { antes: n > 1 ? aire / (n - 1) : 0 });

  if (x.tipo === 'seleccion') {
    x.preguntas.forEach((q, i) => {
      if (i) b.push(entre(i, x.preguntas.length));
      b.push(P(`${i + 1}. ${q.pregunta}`));
      const celda = j => {
        const l = 'abcd'[j], ok = res && l === q.clave;
        return [P([R(`${l}) ${q.opciones[j]}`, ok ? { r: 1, u: 1 } : {})], { sangria: 0.25 })];
      };
      b.push(T([3.75, 3.75], 'ninguno', [{ celdas: [celda(0), celda(1)] }, { celdas: [celda(2), celda(3)] }]));
    });
  } else if (x.tipo === 'vf') {
    x.afirmaciones.forEach((a, i) => {
      if (i) b.push(entre(i, x.afirmaciones.length));
      b.push(P([rojo(a.es_verdadera ? 'V' : 'F', res, '_____'), R(`  ${i + 1}. ${a.texto}`)]));
      b.push(P([R('Corrección: '), res ? R(a.correccion || '(es verdadera)', { r: 1 }) : R('_'.repeat(68))]));
    });
  } else if (x.tipo === 'abiertas') {
    const n = x.preguntas.length;
    const mas = res ? 0 : Math.floor(aire / (n * LP));          // el hueco se llena con renglones
    const resto = aire - mas * n * LP;
    x.preguntas.forEach((q, i) => {
      if (i) b.push(P([], { antes: n > 1 ? resto / (n - 1) : 0 }));
      b.push(P(`${i + 1}. ${q.pregunta} (${pts(v)})`));
      if (res) b.push(P([R(q.respuesta, { r: 1 })]));
      else for (let k = 0; k < 3 + mas; k++) b.push(P(LINEA));
    });
  } else if (x.tipo === 'completar') {
    const cols = x.banco.length % 4 === 0 || x.banco.length > 9 ? 4 : 3;
    const filas = [];
    for (let i = 0; i < x.banco.length; i += cols)
      filas.push({ celdas: Array.from({ length: cols }, (_, j) => [P(x.banco[i + j] ? [R(x.banco[i + j], { b: 1, s: 11 })] : [], { centro: 1, antes: 4, despues: 4 })]) });
    b.push(T(Array(cols).fill(7.5 / cols), 'exterior', filas));
    b.push(P());
    x.oraciones.forEach((o, i) => {
      if (i) b.push(entre(i, x.oraciones.length));
      const [antes, despues] = o.oracion.split('___');
      b.push(P([R(`${i + 1}. ${antes}`), rojo(o.palabra, res, BLANCO), R(despues)]));
    });
  } else if (x.tipo === 'parear') {
    const paso = 3 + aire / (2 * x.columna.length);
    b.push(T([5.2, 2.3], 'ninguno', x.columna.map((c, i) => {
      const p = x.pares[i];
      const izq = p ? [R(`${i + 1}. ( `), rojo(p.clave, res, '___'), R(` ) ${p.definicion}`)] : [];
      return { celdas: [[P(izq, { antes: paso, despues: paso })], [P([R(`${'abcdefghijkl'[i]}) ${c}`, { b: 1 })], { antes: paso, despues: paso })]] };
    })));
  } else if (x.tipo === 'ordenar') {
    const paso = 3 + aire / (2 * x.hoja.length);
    x.hoja.forEach(h => b.push(P([rojo(String(h.numero), res, '___'), R(' ' + h.paso)], { antes: paso, despues: paso })));
  } else if (x.tipo === 'clasificar') {
    b.push(T([7.5], 'exterior', [{ celdas: [[P([R(x.recuadro.join('     '), { b: 1, s: 11 })], { centro: 1, antes: 4, despues: 4, interlineado: 1.5 })]] }]));
    b.push(P());
    const cats = x.categorias, ancho = 7.5 / cats.length;
    const filas = Math.max(...cats.map(c => c.elementos.length)) * 2 + 1 + Math.floor(aire / LP);
    b.push(T(Array(cats.length).fill(ancho), 'todos', [
      { celdas: cats.map(c => [P([R(c.nombre, { b: 1, s: 11 })], { centro: 1, antes: 2, despues: 2 })]) },
      { celdas: cats.map(c => {
        const ps = res ? c.elementos.map(e => P([R(e, { r: 1, s: 11 })], { antes: 4, despues: 4 })) : [];
        while (ps.length < filas - (res ? c.elementos.length : 0)) ps.push(P());
        return ps;
      }) },
    ]));
  } else if (x.tipo === 'dibujo') {
    const ps = res ? [P([R(x.respuesta || x.dibujar, { r: 1 })]), P([R('Partes señaladas, ' + x.partes.join(', ') + '.', { r: 1 })])] : [];
    const total = 8 + Math.floor(aire / LP);
    while (ps.length < total) ps.push(P());
    b.push(T([7.5], 'exterior', [{ celdas: [ps] }]));
  }
  return b;
}
