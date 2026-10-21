// Modo basico, sin IA. Arma las series al instante leyendo la forma del texto.
//   - Conceptos, de las listas del tipo "Termino. Definicion" o "Termino, definicion",
//     de frases como "se le llama X" y de los titulos de diapositiva con su texto.
//     Tambien de parrafos corridos, "El lenguaje es la capacidad..." y "un emisor, que es quien...".
//   - Pasos, de las listas numeradas y de los parrafos de experimentos o procedimientos.
//   - Grupos, de los titulos con su lista debajo y de frases como "elementos, como el mensaje,
//     el canal y el codigo" (para clasificar).
//   - Oraciones, de todos los parrafos (para completar, verdadero o falso y seleccion).
// Cada concepto es respuesta de una sola serie, asi una pregunta no contesta a otra.

const VACIAS = new Set(('el la los las un una unos unas de del al a en y o u que se su sus por para con sin es son ' +
  'como mas más muy pero cuando donde porque este esta estos estas ese esa eso lo le les nos ya hay tiene tienen ' +
  'otra otro otros otras sobre entre hasta desde también tambien cada todo todos toda todas puede pueden ser ' +
  'está están fue era sólo solo parte hace hacer así asi casi menos mismo misma').split(' '));
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const sinArticulo = s => normal(s).replace(/^(el|la|los|las|un|una) /, '');
const contraer = s => s.replace(/\bde el\b/g, 'del').replace(/\ba el\b/g, 'al');
// para volver falsa una oracion verdadera
const CONTRARIOS = [['frío', 'calor'], ['fría', 'caliente'], ['sube', 'baja'], ['subir', 'bajar'], ['más', 'menos'],
  ['siempre', 'nunca'], ['mucho', 'poco'], ['mucha', 'poca'], ['muchos', 'pocos'], ['muchas', 'pocas'], ['dulce', 'salada'],
  ['grande', 'pequeño'], ['grandes', 'pequeños'], ['arriba', 'abajo'], ['entra', 'sale'], ['antes', 'después'],
  ['aumenta', 'disminuye'], ['rápido', 'lento'], ['alto', 'bajo'], ['positivo', 'negativo'], ['entrada', 'salida'],
  ['izquierda', 'derecha'], ['norte', 'sur'], ['este', 'oeste'], ['primero', 'último'], ['mayor', 'menor'],
  ['necesitan', 'no necesitan'], ['puede', 'no puede'], ['pueden', 'no pueden'], ['ayudan', 'no ayudan'], ['todos', 'ninguno de'],
  ['enciende', 'apaga'], ['abre', 'cierra'], ['conductor', 'aislante'], ['vivos', 'inertes'], ['natural', 'artificial']];
const NUMEROS = ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];
const palabras = s => limpio(s).split(' ').filter(Boolean);
const mayus = s => s.charAt(0).toUpperCase() + s.slice(1);
const minus = s => s.charAt(0).toLowerCase() + s.slice(1);
const punto = s => limpio(s).replace(/[.,;:]+$/, '') + '.';
const escapar = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const contiene = (texto, t) => new RegExp('(^|[^\\wáéíóúñü])' + escapar(normal(t)) + '($|[^\\wáéíóúñü])').test(normal(texto));

function frases(texto) {
  return limpio(texto).split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡0-9])/).map(limpio).filter(Boolean);
}

// Una oracion larga se corta en la ultima coma antes de la palabra 22
function acortar(s, max = 22) {
  const w = palabras(s);
  if (w.length <= max) return punto(s);
  const corto = w.slice(0, max).join(' ');
  const coma = corto.lastIndexOf(',');
  return punto(coma > 30 ? corto.slice(0, coma) : corto);
}

function esTitulo(l) {
  const w = palabras(l);
  return w.length <= 8 && l.length <= 60 && /^[A-ZÁÉÍÓÚÑ¿¡0-9]/.test(l) && !/[.,;]$/.test(l);
}

// "Evaporacion. El calor del Sol...", "Fusion, el hielo se derrite...", "Solido: como el hielo"
function concepto(item) {
  const m = limpio(item).match(/^([A-ZÁÉÍÓÚÑ¿][^.,:;()]{1,45}?)\s*(?:[.:,]|\s[-–]\s)\s*(.+)$/);
  if (!m) return null;
  const termino = limpio(m[1]), def = limpio(m[2]);
  if (palabras(termino).length > 4 || palabras(def).length < 3) return null;
  if (/^(porque|por ejemplo|pero|y|o|ya que)\b/i.test(def)) return null;
  return { termino, definicion: mayus(acortar(def)) };
}

// Lo pegado de Word o PowerPoint a veces junta renglones. Se separan los que traen una
// lista o un paso numerado despues de muchos espacios, o varios pasos en el mismo renglon.
function separarRenglones(texto) {
  return texto.replace(/\u00a0/g, ' ').split(/\r?\n/).flatMap(l => {
    l = l.replace(/[ \t]{3,}(?=(?:\d{1,2}[.)]|[-•*–·▪●])\s)/g, '\n');
    return l.split('\n').flatMap(x => {
      const pasos = x.match(/(?:^|\s)\d{1,2}[.)]\s+[A-ZÁÉÍÓÚÑ¿]/g) || [];
      return pasos.length >= 2 ? x.split(/\s+(?=\d{1,2}[.)]\s+[A-ZÁÉÍÓÚÑ¿])/) : [x];
    });
  }).join('\n');
}

function analizar(texto) {
  texto = separarRenglones(texto);
  const secciones = [];
  let actual = { titulo: '', listas: [], parrafos: [] }, lista = null;
  secciones.push(actual);
  for (const cruda of texto.split(/\r?\n/)) {
    const l = limpio(cruda);
    if (!l || /^===.*===$/.test(l)) { lista = null; continue; }
    if (/^---\s*Diapositiva/i.test(l)) { actual = { titulo: '', listas: [], parrafos: [] }; secciones.push(actual); lista = null; continue; }
    const m = l.match(/^(?:[-•*–·▪●]|\d{1,2}[.)])\s+(.*)$/);
    if (m) {
      if (!lista) { lista = { numerada: /^\d/.test(l), items: [] }; actual.listas.push(lista); }
      lista.items.push(limpio(m[1]));
      continue;
    }
    lista = null;
    if (esTitulo(l) && (actual.titulo || actual.listas.length || actual.parrafos.length)) {
      actual = { titulo: l.replace(/[:]$/, ''), listas: [], parrafos: [] };
      secciones.push(actual);
    } else if (esTitulo(l) && !actual.titulo) {
      actual.titulo = l.replace(/[:]$/, '');
    } else actual.parrafos.push(l);
  }

  // conceptos
  const glosario = [], vistos = new Set();
  const agregar = (c, fuente, grupo) => {
    if (!c) return;
    const k = sinArticulo(c.termino);
    if (vistos.has(k) || k.length < 3) return;
    vistos.add(k);
    glosario.push({ ...c, fuente, grupo });
  };
  secciones.forEach((s, i) => s.listas.forEach(li => li.items.forEach(it => agregar(concepto(it), 'lista', i))));
  secciones.forEach((s, i) => s.parrafos.forEach(p => frases(p).forEach(f => {
    const m = f.match(/(?:se le llama|se llama|se conoce como|se denomina|se les llama)\s+([^.,;]+?)(?:\s+o\s+[^.,;]+)?[.,;]/i);
    if (m && palabras(m[1]).length <= 4) agregar({ termino: mayus(limpio(m[1])), definicion: punto(f.replace(m[0], '').replace(/^A (ese|esa|este|esta)\s+/i, '')) }, 'frase', i);
  })));
  secciones.forEach((s, i) => s.parrafos.forEach(p => frases(p).forEach(f => definicionesDeFrase(f).forEach(c => agregar(c, 'prosa', i)))));
  secciones.forEach((s, i) => {
    const w = palabras(s.titulo);
    if (!s.titulo || w.length > 4 || /^(en|de|del|para|c[oó]mo|por|con|qu[eé]|importancia|experimento)\b/i.test(s.titulo)) return;
    const primera = frases(s.parrafos.join(' '))[0];
    if (primera && palabras(primera).length >= 5) agregar({ termino: s.titulo, definicion: acortar(primera) }, 'titulo', i);
  });

  // oraciones sueltas (para completar, verdadero o falso y seleccion)
  const oraciones = [];
  for (const s of secciones) {
    for (const p of s.parrafos) oraciones.push(...frases(p));
    for (const li of s.listas) for (const it of li.items) {
      const c = concepto(it);
      oraciones.push(...frases(c ? c.definicion : it));
    }
  }
  // fuera las de presentar algo ("se hace asi") y los pedazos que empiezan con "Como"
  const utiles = [...new Set(oraciones)].filter(f => { const n = palabras(f).length; return n >= 6 && n <= 32 && !/[:]$/.test(f) && !/se hace as[ií]/i.test(f) && !/^como /i.test(f); });

  // palabras clave, las que se repiten y no son vacias
  const cuenta = {};
  for (const w of normal(texto).match(/[a-záéíóúñü]{5,}/g) || []) if (!VACIAS.has(w)) cuenta[w] = (cuenta[w] || 0) + 1;
  const tema = (secciones.find(s => s.titulo) || {}).titulo || '';
  // grupos escritos dentro de un parrafo, "elementos, como el mensaje, el canal y el codigo"
  const enumerados = [], yaGrupo = new Set();
  secciones.forEach(s => s.parrafos.forEach(p => frases(p).forEach(f => enumeraciones(f).forEach(g => {
    if (yaGrupo.has(normal(g.nombre))) return;
    yaGrupo.add(normal(g.nombre));
    enumerados.push(g);
  }))));
  return { secciones, glosario, oraciones: utiles, cuenta, tema, enumerados };
}

// un grupo con estos nombres son partes de algo que se puede dibujar
const PARTES = /^(partes|elementos|etapas|componentes|fases|órganos|organos|piezas|capas)\b/i;

// el texto se lee una vez aunque se armen muchos examenes con el (el plan automatico prueba varios)
let leido = null;
function analizarUnaVez(texto) {
  if (!leido || leido.texto !== texto) leido = { texto, A: analizar(texto) };
  return leido.A;
}

// Un termino de una a tres palabras que no sea una frase cualquiera
function terminoSirve(t) {
  const w = palabras(t);
  if (!w.length || w.length > 3 || /[,;:()]/.test(t) || w.some(x => /^(y|e|o|u|que|se|también|tambien|más|mas|muy|no)$/i.test(x) && x !== 'no')) return false;
  if (VACIAS.has(normal(w[0])) || VACIAS.has(normal(w[w.length - 1]))) return false;
  if (/^(mayoría|mayoria|parte|forma|manera|importancia|razón|razon|idea|verdad|diferencia|única|unica|primera|segunda|mejor|peor|clave|meta|tarea|ventaja)$/i.test(w[0])) return false;
  return w.every(x => /^[a-záéíóúñü]+$/i.test(x));
}

// "El lenguaje es la capacidad que tenemos...", "La X consiste en...", "un emisor, que es quien transmite el mensaje"
function definicionesDeFrase(f) {
  const out = [];
  const m = f.match(/^(el|la|los|las)\s+(.{3,40}?)\s+(es|son|significa|consiste en|se refiere a|se define como)\s+(.+)$/i);
  if (m) {
    const t = limpio(m[2]), resto = limpio(m[4]);
    const sigue = normal(resto.split(' ')[0]);
    const copula = /^(es|son)$/i.test(m[3]);
    if (terminoSirve(t) && palabras(resto).length >= 4 &&
      (!copula || /^(el|la|los|las|un|una|unos|unas|quien|quienes|aquel|aquella|aquello|cuando|todo|toda)$/.test(sigue)))
      out.push({ termino: mayus(t), art: m[1].toLowerCase(), definicion: mayus(acortar(m[3].toLowerCase() + ' ' + resto)) });
  }
  for (const a of f.matchAll(/(?:^|\s)(un|una|el|la|los|las)\s+([a-záéíóúñü]+(?:\s+no)?(?:\s+[a-záéíóúñü]+)?),\s+que\s+(.+?)(?=,\s+y\s+(?:un|una|el|la|los|las)\s|[.;]|$)/gi)) {
    const t = limpio(a[2]), resto = limpio(a[3]);
    if (terminoSirve(t) && palabras(resto).length >= 3) out.push({ termino: mayus(t), art: a[1].toLowerCase(), definicion: mayus(acortar(resto)) });
  }
  return out;
}

// "intervienen otros elementos, como el mensaje, el canal, el codigo y el contexto"
function enumeraciones(f) {
  const out = [];
  const re = /([a-záéíóúñü]+)(?:\s+([a-záéíóúñü]+))?,?\s+como\s+((?:[^,.;]+,\s+)+[^,.;]+?\s+(?:y|o|e|u)\s+[^,.;]+?)(?=[.;]|,\s+que\b|$)/gi;
  for (const m of f.matchAll(re)) {
    const w1 = m[1].toLowerCase(), w2 = (m[2] || '').toLowerCase();
    const adjetivo = w => /(ntes|ales|icos|icas|ivos|ivas|ares|osos|osas)$/.test(w) || /^(principales|básicos|basicos|básicas|basicas|comunes|importantes)$/.test(w);
    let nombre;
    if (!w2) nombre = w1;
    else if (adjetivo(w2) && !VACIAS.has(normal(w1))) nombre = w1 + ' ' + w2;
    else nombre = w2;
    const nucleo = nombre.split(' ')[0];
    if (!/s$/.test(nucleo) || VACIAS.has(normal(nucleo)) || /^(otros|otras|algunos|algunas|varios|varias|muchos|muchas|ciertos|ciertas|cosas)$/.test(nucleo)) continue;
    const elementos = m[3].split(/,\s+|\s+(?:y|o|e|u)\s+/).map(x => limpio(x).replace(/^(el|la|los|las|un|una|unos|unas)\s+/i, ''))
      .filter(x => x && palabras(x).length <= 6).map(mayus);
    if (elementos.length >= 3 && new Set(elementos.map(normal)).size === elementos.length) out.push({ nombre: mayus(nombre), elementos });
  }
  return out;
}

// ===========================================================================

function parcialBasico(datos, contenido, eleccion) {
  const A = analizarUnaVez(contenido);
  const usados = new Set();             // conceptos que ya son respuesta de una serie
  const frasesUsadas = new Set();
  const libres = () => A.glosario.filter(g => !usados.has(normal(g.termino)));
  const usar = t => usados.add(normal(t));
  const fallas = [], series = [];
  // una respuesta no puede salir escrita en otra pregunta, ni dos veces en su propia oracion
  const respuestas = [], visibles = [];
  const veces = (f, r) => (normal(f).match(new RegExp('(^|[^\\wáéíóúñü])' + escapar(normal(r)) + '(?=$|[^\\wáéíóúñü])', 'g')) || []).length;
  const sirve = (f, r) => veces(f, r) === 1 && !respuestas.some(x => contiene(f, x)) && !visibles.some(v => contiene(v, r));
  const anotar = (f, r) => { respuestas.push(r); visibles.push(f); };
  const gruposUsados = new Set(), conDibujo = eleccion.some(e => e.tipo === 'dibujo');
  // dos conceptos que no son respuesta, primero del glosario y si faltan de los grupos del parrafo
  const sobrantes = usadas => {
    const fuera = t => !usadas.some(u => normal(u) === normal(t));
    const del = A.glosario.map(g => g.termino).filter(fuera).slice(-2);
    const mas = A.enumerados.flatMap(g => g.elementos).filter(t => fuera(t) && !del.some(d => normal(d) === normal(t)));
    return [...del, ...mas].slice(0, 2);
  };

  const constructores = {
    ordenar(n) {
      const candidatos = [];
      A.secciones.forEach(s => s.listas.forEach(li => {
        if (li.items.length >= n && (li.numerada || /pasos|procedimiento|etapas|proceso|instrucciones|fases/i.test(s.titulo)))
          candidatos.push({ titulo: s.titulo, pasos: li.items.map(it => { const c = concepto(it); return acortar(c ? c.definicion : frases(it)[0] || it, 18); }), exacto: li.items.length === n });
      }));
      A.secciones.forEach(s => s.parrafos.forEach(p => {
        const fs = frases(p);
        const i = fs.findIndex(f => /se hace así|se hace asi|pasos|siga|procedimiento/i.test(f));
        if (i >= 0 && fs.length - i - 1 >= n) candidatos.push({ titulo: s.titulo, pasos: fs.slice(i + 1).map(f => acortar(f, 18)), exacto: fs.length - i - 1 === n });
        else if (/experimento|procedimiento|pasos/i.test(s.titulo) && fs.length >= n) candidatos.push({ titulo: s.titulo, pasos: fs.map(f => acortar(f, 18)), exacto: fs.length === n });
      }));
      candidatos.sort((a, b) => b.exacto - a.exacto);
      const c = candidatos[0];
      if (!c) throw new Error(`no hay una lista numerada ni un procedimiento con ${n} pasos`);
      const pasos = c.pasos.slice(0, n);
      pasos.forEach(p => frasesUsadas.add(normal(p)));
      const titulo = c.titulo || 'el procedimiento';
      const proceso = /^(pasos|etapas|fases)/i.test(titulo) ? titulo : 'Pasos del tema ' + titulo;
      return { proceso, pasos };
    },

    dibujo(n) {
      const grupos = A.secciones.map((s, i) => A.glosario.filter(g => g.grupo === i && g.fuente === 'lista'));
      grupos.sort((a, b) => b.length - a.length);
      // si no hay una lista con titulo, un grupo de partes o elementos escrito en el parrafo
      // (uno que ya use clasificar no, las partes regalarian la respuesta)
      const enParrafo = A.enumerados.find(g => g.elementos.length >= n && PARTES.test(g.nombre) && !gruposUsados.has(g.nombre));
      // los conceptos sacados de un parrafo corrido no son partes de algo que se dibuja
      let partes = (grupos[0] || []).length >= n ? grupos[0] : enParrafo ? enParrafo.elementos.map(termino => ({ termino })) : A.glosario.filter(g => g.fuente !== 'prosa');
      if (partes.length < n) throw new Error(`no hay ${n} conceptos para señalar`);
      partes = partes.slice(0, n).map(g => g.termino);
      const tema = A.tema || datos.materia;
      return { dibujar: minus(tema), partes, respuesta: contraer(`Un dibujo de ${minus(tema)} donde se vean y estén señaladas estas partes, ${partes.join(', ')}.`) };
    },

    clasificar(n) {
      const grupos = [];
      A.secciones.forEach(s => s.listas.forEach(li => {
        const items = li.items.map(it => { const c = concepto(it); return c ? c.termino : (palabras(it).length <= 4 ? punto(it).replace(/\.$/, '') : null); }).filter(Boolean);
        if (s.titulo && items.length >= 2) grupos.push({ nombre: s.titulo, elementos: items });
      }));
      const lista = grupos.length;
      for (const g of A.enumerados) grupos.push({ nombre: g.nombre, elementos: [...g.elementos], parrafo: true });
      const vistos = new Set();                    // un elemento en una sola categoria
      for (const g of grupos) g.elementos = g.elementos.filter(e => { const k = normal(e); if (vistos.has(k)) return false; vistos.add(k); return true; });
      const escoger = gs => gs.filter(g => g.elementos.length >= 2).sort((a, b) => b.elementos.length - a.elementos.length).slice(0, 4);
      const alcanza = bs => bs.length >= 2 && bs.reduce((a, g) => a + g.elementos.length, 0) >= n;
      // si tambien va Dibujar, se le deja el grupo de partes cuando las demas alcanzan
      let buenos = escoger(grupos.filter((g, i) => i < lista || !(conDibujo && PARTES.test(g.nombre))));
      if (!alcanza(buenos)) buenos = escoger(grupos);
      if (!alcanza(buenos)) throw new Error(`no hay dos o más títulos con su lista debajo que junten ${n} elementos`);
      buenos.forEach(g => { if (g.parrafo) gruposUsados.add(g.nombre); });
      const cats = buenos.map(g => ({ nombre: g.nombre, elementos: [] }));
      for (let k = 0, i = 0; k < n; i++) {       // se reparte por turnos, asi ninguna queda vacia
        const g = buenos[i % buenos.length], c = cats[i % buenos.length];
        if (c.elementos.length < g.elementos.length) { c.elementos.push(g.elementos[c.elementos.length]); k++; }
      }
      return { categorias: cats.filter(c => c.elementos.length) };
    },

    parear(n) {
      const disp = libres().filter(g => !frasesUsadas.has(normal(g.definicion)));
      if (disp.length < n) throw new Error(`hay ${disp.length} conceptos con su definición y hacen falta ${n}`);
      // el concepto queda como respuesta, asi ninguna otra serie usa una oracion que lo traiga escrito
      const pares = disp.slice(0, n).map(g => { usar(g.termino); respuestas.push(g.termino); frasesUsadas.add(normal(g.definicion)); return { definicion: g.definicion, concepto: g.termino }; });
      const trampas = sobrantes(pares.map(p => p.concepto));
      if (trampas.length < 2) throw new Error('faltan dos conceptos de más para las trampas');
      return { pares, trampas };
    },

    completar(n) {
      const oraciones = [];
      const quitar = (f, t) => f.replace(new RegExp('(^|[^\\wáéíóúñü])(' + escapar(t) + ')(?=$|[^\\wáéíóúñü])', 'i'), '$1___');
      for (const f of A.oraciones) {
        if (oraciones.length >= n) break;
        if (frasesUsadas.has(normal(f))) continue;
        const g = libres().find(g => contiene(f, g.termino) && sirve(f, g.termino) && !oraciones.some(o => normal(o.palabra) === normal(g.termino)));
        if (!g) continue;
        const real = f.match(new RegExp(escapar(g.termino), 'i'));
        if (!real) continue;
        oraciones.push({ oracion: quitar(f, real[0]), palabra: real[0] });
        anotar(quitar(f, real[0]), real[0]);
        frasesUsadas.add(normal(f)); usar(g.termino);
      }
      for (const f of A.oraciones) {               // si faltan, con palabras clave del texto
        if (oraciones.length >= n) break;
        if (frasesUsadas.has(normal(f))) continue;
        const clave = (f.match(/[A-Za-záéíóúñüÁÉÍÓÚÑ]{6,}/g) || []).filter(w => !VACIAS.has(normal(w)) && (A.cuenta[normal(w)] || 0) >= 2 && !usados.has(normal(w)))
          .sort((a, b) => b.length - a.length)[0];
        if (!clave || !sirve(f, clave) || oraciones.some(o => normal(o.palabra) === normal(clave))) continue;
        oraciones.push({ oracion: quitar(f, clave), palabra: clave });
        anotar(quitar(f, clave), clave);
        frasesUsadas.add(normal(f)); usar(clave);
      }
      if (oraciones.length < n) throw new Error(`solo se encontraron ${oraciones.length} oraciones para completar`);
      const trampas = sobrantes(oraciones.map(o => o.palabra));
      if (trampas.length < 2) throw new Error('faltan dos palabras de más para las trampas');
      return { oraciones, trampas };
    },

    seleccion(n) {
      const preguntas = [];
      const otros = (correcta, lista, pregunta = '') => {
        const g0 = A.glosario.find(g => sinArticulo(g.termino) === sinArticulo(correcta));
        const ok = t => sinArticulo(t) !== sinArticulo(correcta) && !contiene(pregunta, t);
        const mismo = barajarFijo(lista.filter(t => ok(t) && g0 && (A.glosario.find(g => g.termino === t) || {}).grupo === g0.grupo));
        const resto = barajarFijo(lista.filter(t => ok(t) && !mismo.includes(t)));
        const vistos = new Set(), out = [];
        for (const t of [...mismo, ...resto]) if (!vistos.has(sinArticulo(t))) { vistos.add(sinArticulo(t)); out.push(t); }
        return out.slice(0, 3);
      };
      const terminos = A.glosario.filter(g => g.fuente !== 'titulo').map(g => g.termino);
      const porConcepto = libres().filter(g => !frasesUsadas.has(normal(g.definicion)));
      const porFrase = A.oraciones.filter(f => !frasesUsadas.has(normal(f)));
      let i = 0, j = 0;
      while (preguntas.length < n && (i < porConcepto.length || j < porFrase.length)) {
        // se turnan, una de concepto y una de oracion
        if ((preguntas.length % 2 === 0 || j >= porFrase.length) && i < porConcepto.length) {
          const g = porConcepto[i++];
          const inc = otros(g.termino, terminos, g.definicion);
          if (inc.length < 3) continue;
          preguntas.push({ pregunta: `¿A qué se refiere esta descripción? ${g.definicion}`, correcta: g.termino, incorrectas: inc });
          usar(g.termino); frasesUsadas.add(normal(g.definicion));
        } else {
          const f = porFrase[j++];
          let correcta = null, inc = [];
          if (/se hace as[ií]|:$/i.test(f)) continue;
          const num = f.match(/\b\d+\b/), mes = MESES.find(m => contiene(f, m));
          const g = libres().find(g => contiene(f, g.termino));
          if (mes) { correcta = f.match(new RegExp(mes, 'i'))[0]; inc = otros(mes, MESES.filter(m => !contiene(f, m))).map(m => correcta[0] === correcta[0].toUpperCase() ? mayus(m) : m); }
          else if (num) { const v = +num[0]; correcta = num[0]; inc = [v + 1, v > 2 ? v - 1 : v + 3, v * 2 || 5].map(String); }
          else if (g && g.fuente !== 'titulo') { correcta = f.match(new RegExp(escapar(g.termino), 'i'))[0]; inc = otros(g.termino, terminos, f); }
          if (!correcta || inc.length < 3 || new Set([correcta, ...inc].map(normal)).size < 4 || !sirve(f, correcta)) continue;
          preguntas.push({ pregunta: `Complete la oración. ${f.replace(correcta, '________')}`, correcta, incorrectas: inc });
          anotar(f.replace(correcta, ''), correcta);
          frasesUsadas.add(normal(f)); if (g && !mes && !num) usar(g.termino);
        }
      }
      if (preguntas.length < n) throw new Error(`solo salieron ${preguntas.length} preguntas de selección`);
      return { preguntas };
    },

    vf(n) {
      const falsas = Math.floor(n / 2), afirmaciones = [];
      const terminos = A.glosario.map(g => g.termino);
      for (const f of A.oraciones) {
        if (afirmaciones.filter(a => !a.es_verdadera).length >= falsas) break;
        if (frasesUsadas.has(normal(f))) continue;
        const t = terminos.find(t => contiene(f, t));
        const mes = MESES.find(m => contiene(f, m));
        const contra = CONTRARIOS.find(([a, b]) => contiene(f, a) || contiene(f, b));
        const numero = NUMEROS.find(x => contiene(f, x)) || (f.match(/\b\d+\b/) || [])[0];
        const cambiar = (de, a) => {
          const real = f.match(new RegExp('(^|[^\\wáéíóúñü])(' + escapar(de) + ')(?=$|[^\\wáéíóúñü])', 'i'));
          if (!real) return null;
          let r = real[2][0] === real[2][0].toUpperCase() ? mayus(a) : a;
          const despues = f.slice(real.index + real[0].length);
          // concuerda con la palabra que sigue, "grandes distancias" pasa a "pequeñas distancias"
          if (/^\s+[a-záéíóúñ]+as\b/i.test(despues)) r = r.replace(/os$/, 'as').replace(/o$/, 'a');
          return f.slice(0, real.index + real[1].length) + r + despues;
        };
        let falsa = null;
        if (contra) falsa = contiene(f, contra[0]) ? cambiar(contra[0], contra[1]) : cambiar(contra[1], contra[0]);
        else if (numero && isNaN(numero)) falsa = cambiar(numero, NUMEROS[(NUMEROS.indexOf(numero) + 1) % 10]);
        else if (numero) falsa = cambiar(numero, String(+numero + (+numero > 3 ? 2 : 1)));
        else if (t) {
          const otro = terminos.find(o => normal(o) !== normal(t) && !contiene(f, o) && A.glosario.find(g => g.termino === o).grupo === A.glosario.find(g => g.termino === t).grupo)
            || terminos.find(o => normal(o) !== normal(t) && !contiene(f, o));
          const real = f.match(new RegExp(escapar(t), 'i'));
          if (otro && real) {
            // el articulo de antes va con el concepto nuevo, "la comunicacion" pasa a "el lenguaje"
            let antes = f.slice(0, real.index);
            const art = (A.glosario.find(g => g.termino === otro) || {}).art;
            if (art) antes = antes.replace(/(^|\s)(el|la|los|las)\s+$/i, (x, e, a) => `${e}${a[0] === a[0].toUpperCase() ? mayus(art) : art} `);
            falsa = contraer(antes + (real.index === 0 ? mayus(otro) : minus(otro)) + f.slice(real.index + real[0].length));
          }
        } else if (mes) {
          const real = f.match(new RegExp(mes, 'i'));
          const otro = MESES[(MESES.indexOf(mes) + 3) % 12];
          falsa = f.replace(real[0], real[0][0] === real[0][0].toUpperCase() ? mayus(otro) : otro);
        }
        if (!falsa || respuestas.some(x => contiene(f, x))) continue;
        afirmaciones.push({ texto: falsa, es_verdadera: false, correccion: f });
        visibles.push(falsa);
        frasesUsadas.add(normal(f));
      }
      for (const f of A.oraciones) {
        if (afirmaciones.length >= n) break;
        if (frasesUsadas.has(normal(f)) || respuestas.some(x => contiene(f, x))) continue;
        afirmaciones.push({ texto: f, es_verdadera: true, correccion: '' });
        visibles.push(f);
        frasesUsadas.add(normal(f));
      }
      const f2 = afirmaciones.filter(a => !a.es_verdadera).length;
      if (f2 < Math.ceil(n * 0.3)) throw new Error(`solo se pudieron hacer ${f2} afirmaciones falsas`);
      if (afirmaciones.length < n) throw new Error(`solo salieron ${afirmaciones.length} afirmaciones`);
      return { afirmaciones };
    },

    abiertas(n) {
      const peso = g => (g.fuente === 'lista' ? 0 : g.fuente === 'frase' ? 1 : 5) + (usados.has(normal(g.termino)) ? 3 : 0);
      const pool = [...A.glosario].sort((a, b) => peso(a) - peso(b));
      if (pool.length + A.enumerados.length < Math.min(n, 2)) throw new Error('no hay conceptos para preguntar');
      const tema = minus(A.tema || datos.materia);
      const preguntas = [];
      for (let k = 0; preguntas.length < n && k < pool.length; k++) {
        const g = pool[k], t = (g.art ? g.art + ' ' : '') + minus(g.termino), d = minus(g.definicion);
        if (/^como /i.test(g.definicion)) {          // la definicion son ejemplos
          preguntas.push({ pregunta: `Escriba dos ejemplos de ${t} que pueda ver en su casa o su comunidad y explique por qué lo son.`, respuesta: `Por ejemplo ${d.replace(/^como /i, '')}` });
          continue;
        }
        switch (preguntas.length % 4) {
          case 0: preguntas.push({ pregunta: contraer(`¿Qué es ${t} y por qué es importante en ${contiene(tema, g.termino) ? 'la vida diaria' : tema}?`), respuesta: `Debe explicar que ${d}` }); break;
          case 1: preguntas.push({ pregunta: contraer(g.fuente === 'prosa' ? `Explique con sus palabras qué es ${t} y dé un ejemplo de la vida diaria.` : `Explique con sus palabras qué sucede en ${t} y dé un ejemplo de la vida diaria.`), respuesta: `${g.definicion} El ejemplo debe ser de su casa o su comunidad.` }); break;
          case 2: {
            // se compara con otro concepto de la misma lista, que no se haya preguntado
            const h = pool.slice(k + 1).find(o => o.grupo === g.grupo && o.fuente === 'lista' && g.fuente === 'lista' && !/^como /i.test(o.definicion));
            if (h) { preguntas.push({ pregunta: `¿Qué diferencia hay entre ${t} y ${minus(h.termino)}?`, respuesta: `${g.termino}, ${d} ${h.termino}, ${minus(h.definicion)}` }); pool.splice(pool.indexOf(h), 1); }
            else preguntas.push({ pregunta: `¿Qué pasaría si no existiera ${t}? Explique.`, respuesta: `Debe relacionarlo con que ${d}` });
            break;
          }
          default: preguntas.push({ pregunta: `¿Qué pasaría si no existiera ${t}? Explique.`, respuesta: `Debe relacionarlo con que ${d}` });
        }
      }
      // si faltan, de los grupos escritos en el parrafo
      for (const g of A.enumerados) {
        if (preguntas.length >= n) break;
        const k = Math.min(3, g.elementos.length - 1);
        preguntas.push({ pregunta: `Mencione ${NUMEROS[k - 1]} ${minus(g.nombre)} que se vieron en clase y explique una de ellas con un ejemplo.`,
          respuesta: `Puede mencionar ${g.elementos.map(minus).join(', ')}.` });
      }
      if (preguntas.length < n) throw new Error(`solo salieron ${preguntas.length} preguntas`);
      return { preguntas };
    },
  };

  // primero las que mas necesitan del texto, despues las que se arreglan con lo que sobra
  const turno = ['ordenar', 'clasificar', 'dibujo', 'parear', 'completar', 'vf', 'seleccion', 'abiertas'];
  const hechas = {};
  for (const tipo of turno) {
    const e = eleccion.find(e => e.tipo === tipo);
    if (!e) continue;
    const { n, valor } = plan(e.tipo, e.puntos);
    try {
      hechas[tipo] = { tipo, puntos: e.puntos, valor, ...revisarSerie(tipo, constructores[tipo](n), n) };
    } catch (err) {
      fallas.push(`${SERIES[tipo].nombre}, ${err.message}`);
    }
  }
  // la serie que no salio se cambia por otra que si salga con los mismos puntos
  const cambios = [];
  for (const e of eleccion) {
    if (hechas[e.tipo]) continue;
    const usadas = eleccion.map(x => hechas[x.tipo] ? x.tipo : null).concat(Object.keys(hechas));
    const otras = turno.filter(t => !usadas.includes(t) && !eleccion.some(x => x.tipo === t) && plan(t, e.puntos) &&
      !(t === 'completar' && usadas.includes('parear')) && !(t === 'parear' && usadas.includes('completar')));
    for (const t of otras) {
      const { n, valor } = plan(t, e.puntos);
      try {
        hechas[t] = { tipo: t, puntos: e.puntos, valor, ...revisarSerie(t, constructores[t](n), n) };
        cambios.push(`${SERIES[e.tipo].nombre} no se pudo armar con este texto y se cambió por ${SERIES[t].nombre}.`);
        e.cambiada = t;
        break;
      } catch (err) { /* se prueba la siguiente */ }
    }
  }
  const sinArmar = eleccion.filter(e => !hechas[e.tipo] && !e.cambiada);
  if (sinArmar.length) {
    const e = new Error('Con este texto el modo básico no pudo armar todo.\n- ' + fallas.join('\n- ') +
      '\nAgregue más contenido, bájeles puntos a esas series.');
    e.fallas = fallas;
    throw e;
  }
  const finales = eleccion.map(e => ({ tipo: e.cambiada || e.tipo, puntos: e.puntos }));
  eleccion.forEach(e => delete e.cambiada);
  for (const e of ordenar(finales)) series.push(hechas[e.tipo]);

  const puntos = [];
  for (const s of A.secciones) if (s.titulo && (s.parrafos.length || s.listas.length) && puntos.length < 6)
    puntos.push(/^(el|la|los|las) /i.test(s.titulo) ? `Estudiar ${minus(s.titulo)}.` : `Estudiar el tema ${mayus(s.titulo.replace(/^(en|de|sobre) /i, ''))}.`);
  const terms = A.glosario.filter(g => g.fuente !== 'titulo').map(g => minus(g.termino)).slice(0, 10);
  if (terms.length) puntos.push(`Repasar el significado de estos términos, ${terms.join(', ')}.`);
  if (hechas.ordenar) {
    const pr = hechas.ordenar.proceso;
    puntos.push(/^etapas|^fases/i.test(pr) ? `Practicar el orden de las ${minus(pr)}.` : /^pasos/i.test(pr) ? `Practicar el orden de los ${minus(pr)}.` : `Practicar el orden de ${minus(pr)}.`);
  }
  return { datos, series, temario: { puntos: puntos.slice(0, 9) }, semilla: Math.floor(Math.random() * 1e6), modo: 'basico', cambios };
}

// barajar sin semilla para escoger opciones incorrectas
function barajarFijo(l) { return barajar([...l], Math.random); }
