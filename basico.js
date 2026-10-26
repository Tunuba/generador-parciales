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
  'está están fue era sólo solo parte hace hacer así asi casi menos mismo misma ' +
  'there where which their these those about would could should other every after before because under while being').split(' '));
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const sinArticulo = s => normal(s).replace(/^(el|la|los|las|un|una) /, '');
const contraer = s => s.replace(/\bde el\b/g, 'del').replace(/\ba el\b/g, 'al');
// para volver falsa una oracion verdadera
const CONTRARIOS = [['frío', 'calor'], ['fría', 'caliente'], ['sube', 'baja'], ['subir', 'bajar'], ['más', 'menos'],
  ['siempre', 'nunca'], ['mucho', 'poco'], ['mucha', 'poca'], ['muchos', 'pocos'], ['muchas', 'pocas'], ['dulce', 'salada'],
  ['grande', 'pequeño'], ['grandes', 'pequeños'], ['arriba', 'abajo'], ['entra', 'sale'], ['antes', 'después'],
  ['aumenta', 'disminuye'], ['rápido', 'lento'], ['alto', 'bajo'], ['positivo', 'negativo'], ['entrada', 'salida'],
  ['izquierda', 'derecha'], ['norte', 'sur'], ['primero', 'último'], ['mayor', 'menor'],
  ['necesitan', 'no necesitan'], ['puede', 'no puede'], ['pueden', 'no pueden'], ['ayudan', 'no ayudan'], ['todos', 'ninguno de'],
  ['enciende', 'apaga'], ['abre', 'cierra'], ['conductor', 'aislante'], ['vivos', 'inertes'], ['natural', 'artificial']];
// lo ultimo para volverla falsa, quitarle o ponerle el "no" al verbo principal
function negar(f) {
  if (/^(si|cuando|por ejemplo|if|when)\b/i.test(f)) return null;
  const no = f.match(/(^|\s)(no)\s+(?=(?:se\s+)?[a-záéíóúñ]+)/i);
  if (no && no.index < f.length * 0.6) {
    const resto = f.slice(no.index + no[0].length);
    return no.index ? f.slice(0, no.index + no[1].length) + resto : mayus(resto);
  }
  const v = f.match(/(^|\s)(es|son|era|eran|fue|fueron|está|están|estaba|tiene|tienen|tenía|puede|pueden|hay|había|sirve|sirven|ayuda|ayudan|forma|forman|vive|viven|necesita|necesitan|se)(?=\s)/i);
  if (v && v.index < f.length * 0.6) {
    const i = v.index + v[1].length;
    return i ? f.slice(0, i) + 'no ' + f.slice(i) : 'No ' + minus(f);
  }
  const e = f.match(/\s(is|are|was|were|can)(?=\s)/i);
  if (e && e.index < f.length * 0.6) return f.slice(0, e.index) + ' ' + (/can/i.test(e[1]) ? 'cannot' : e[1] + ' not') + f.slice(e.index + e[0].length);
  return null;
}
// rotulos que no son un concepto ni el tema ("Moraleja: ...", "Cuestionario de sociales", "Unidad 3")
const GENERICOS = /^¿|^(moraleja|nota|notas|tarea|ejemplos?|instrucciones|recuerde|importante|objetivos?|tema|fecha|actividad(es)?|cuestionario|resumen|introducci[oó]n|conclusi[oó]n|vocabulario|vocabulary|unidad|unit|lecci[oó]n|lesson|clase|gu[ií]a|hoja de trabajo|apuntes|palabras|datos|preguntas?|respuestas?|en (tu|su) cuaderno|manos a la obra|para qu[eé] sirve|conceptos clave|reglas del)(?![a-záéíóúñü])|^(mira|lo que vas a|las palabras que)\s/i;
// "Unidad 2. Los ecosistemas" pasa a "Los ecosistemas"
const sinRotulo = t => limpio(t).replace(/^(unidad|unit|tema|lecci[oó]n|lesson|cap[ií]tulo|bloque|semana)\s*[\dIVX]*\s*[.:\-–]?\s*/i, '');
const NUMEROS = ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];
const palabras = s => limpio(s).split(' ').filter(Boolean);
const mayus = s => s.charAt(0).toUpperCase() + s.slice(1);
// una sigla se queda como esta, "CPU" no pasa a "cPU"
const minus = s => /^\p{Lu}\S*\p{Lu}/u.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1);   // y "IoT" tampoco
const punto = s => limpio(s).replace(/[.,;:]+$/, '') + '.';
const escapar = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const contiene = (texto, t) => new RegExp('(^|[^\\wáéíóúñü])' + escapar(normal(t)) + '($|[^\\wáéíóúñü])').test(normal(texto));

// cuantas palabras (sin contar la primera) empiezan con mayuscula
const mayusculasDe = f => { const w = palabras(f).slice(1); return w.length ? w.filter(x => /^\p{Lu}/u.test(x)).length / w.length : 0; };

// un objetivo o una tarea de la clase: "Nombrar las cuatro etapas", "Explicamos qué etapa representa el modelo"
// ("Polinizar es llevar polen a otra flor" si es de la clase)
const objetivo = f => /^\p{L}{3,}(ar|er|ir)\s/iu.test(f) && !/\s(es|son|significa)\s/i.test(f) || /^\p{L}{3,}(amos|emos|imos)\s/iu.test(f);

// dos palabras de la misma familia, alguna palabra de una empieza igual que una de la otra (cinco letras)
const mismaRaiz = (a, b) => palabras(normal(a)).some(x => x.length >= 5 && palabras(normal(b)).some(y => y.length >= 5 && x.slice(0, 5) === y.slice(0, 5)));

// dos textos dicen casi lo mismo si las palabras largas de a casi todas estan en b
function casiIgual(a, b) {
  const w = palabras(normal(a)).filter(x => x.length >= 5), nb = normal(b);
  return w.length > 0 && w.filter(x => nb.includes(x)).length >= w.length * 0.7;
}

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
  const m = limpio(item).match(/^([A-ZÁÉÍÓÚÑ¿][^.,:;()]{1,45}?)\s*(?:[.:,]|\s[-–—]\s)\s*(.+)$/);
  if (!m) return null;
  const termino = limpio(m[1]), def = limpio(m[2]);
  if (palabras(termino.replace(/^(el|la|los|las|un|una)\s+/i, '')).length > 4 || palabras(def).length < 3 || GENERICOS.test(termino) || IMPERATIVO.test(termino)) return null;
  // "Un sistema integrado tiene, ..." es un pedazo de oracion, no un concepto
  if (/\s(tiene|tienen|es|son|hace|hacen|sirve|sirven|está|están|puede|pueden|que|y|de)$/i.test(termino)) return null;
  if (/^(porque|por ejemplo|pero|y|o|ya que)\b/i.test(def)) return null;
  return { termino, definicion: mayus(acortar(def)) };
}

// "Sustantivo: es la palabra que...", "Kitchen - the room where we cook", una glosa aunque no traiga viñeta
const esGlosa = l => /^[A-ZÁÉÍÓÚÑ¿][^.,:;()]{1,45}?\s*(?::|\s[-–—]\s)\s*\S/.test(l) && !!concepto(l);
const VINETA = /^\s*(?:[-•*–·▪●]|\d{1,2}[.)])\s/;

// Lo que se pega de ChatGPT, de un PDF, de WhatsApp, de unas diapositivas o todo en mayusculas queda como
// texto de clase normal. Las preguntas de un cuestionario se guardan aparte con su respuesta, y las de un
// quiz de la presentacion (opciones A, B, C y D con su "Respuesta correcta") tambien.
const UNE = /\b(un|una|el|la|los|las|de|del|que|y|o|para|como|en|con|por|a|al|su|sus|se|es|son|muy|más|mas|the|an|of|and|to|in|for|with)$/i;
const LOGISTICA = /\b(diapositivas?|si faltaste|si no vino|repone|repones|se entrega|en tu cuaderno|en su cuaderno|copia en|copie en|copie estas|piensen la respuesta|digan la letra|hoy vemos|hoy vamos|hoy aprendemos|hoy conocemos|hoy hacemos|vamos a ver|en la presentaci[oó]n|responda el recuadro|respuesta correcta)\b/i;
// "Dibuja un robot", "Haz una flecha", "Ver robots a tu alrededor", "Rotule las partes": lo que hace el alumno
// en clase (de tu y de usted), no lo que aprende
const IMPERATIVO = /^(\d{1,2}[.)]?\s+)?(dibuja|dibujen|dib[uú]jalo|haz|hagan|copia|copien|colorea|coloree|color[eé]alo|piensa|piensen|recorta|recorten|pega|peguen|escribe|escriban|busca|busquen|mira|miren|observa|observen|lee|lean|responde|respondan|une|unan|marca|encierra|completa|arma|armen|construye|construyan|juega|jueguen|sigue|lleva|crea|creen|ponle|revisa|cuenta|trazar|crear|inventar|ver|saber|cuidar|decir|conocer|aprender|explicar|reconocer|entender|encontrar|preparar|unir|dibujar|entro|levanto|toco|guardo|observe|siga|escuche|escuchen|escucha|explique|rotule|dibuje|escriba|copie|pinte|lea|busque|responda|marque|complete|arme|conecte|cargue|pruebe|anote|mida|ajuste|revise|compare|agregue|identifique|mencione|subraye|encierre|recorte|pegue|investigue|traiga|elabore|realice|resuelva)(?![a-záéíóúñ])/i;
// lo que pasa en la clase, "El profesor explica...", "En equipos conectan...", "Escriben qué aparece"
const ACTIVIDAD = /(^|[.!?]\s+)(el profesor|la profesora|el maestro|la maestra|en equipos?|en parejas|en grupos?|los alumnos|cada alumno|cada equipo|lo prueban|la abren|donde pida|como no pudo|escriben|dibujan|anotan|prueban|visitan|comparan|presentan|muestran|cargan|conectan|integran|programan|organizan|explican|responden|copian|observan|buscan|arman|construyen|pegan|recortan|colorean|juegan|comentan|exponen|revisan|miden|registran|ajustan|rotulan|siguen|agregan|integran|eligen|dise[nñ]an)(?![a-záéíóúñ])/i;
// una fila de tabla pegada como texto, "Cerebro Cabeza Piensa", "Robot Yo Qué hace"
const esFila = l => { const w = palabras(l); return w.length >= 3 && !/[.!?]$/.test(limpio(l)) && w.filter(x => /^\p{Lu}/u.test(x)).length >= w.length * 0.6; };
function prepararTexto(crudo) {
  let t = String(crudo).replace(/\r\n?/g, '\n').replace(/[   ]/g, ' ').replace(/[​-‍⁠﻿️]/g, '');
  t = t.replace(/([a-záéíóúñü])-\n[ \t]*([a-záéíóúñü])/g, '$1$2');           // "rela-\ncionan" del PDF
  // la respuesta del cuestionario en el renglon de abajo
  t = t.replace(/(¿[^?\n]{3,}\?)[ \t]*\n[ \t]*((?:R[ \t]*\/\/?|R:|Resp(?:uesta)?[ \t]*[.:]))/gi, '$1 $2');
  const crudas = t.split('\n');
  // 1. cada renglon sin markdown, sin emojis y sin lo que no es de la clase
  let lineas = crudas.map((l, i) => {
    l = l.replace(/^\s{0,3}#{1,6}\s+/, '').replace(/^\s*>\s?/, '')          // titulos y citas de markdown
      .replace(/\[([^\]\n]+)\]\([^)\n]*\)/g, '$1')
      .replace(/\*\*([^*\n]+)\*\*|__([^_\n]+)__/g, (m, a, b) => a || b)      // negritas
      .replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=[\s.,;:)!?]|$)/g, '$1$2')     // cursivas
      .replace(/`([^`\n]+)`/g, '$1');
    if (/^\s*([-*_=])(\s*\1){2,}\s*$/.test(l)) return '';                   // rayas ---
    // palomitas y emojis de viñeta pasan a guion, los demas emojis se quitan
    l = l.replace(/^\s*(?:[✅✔☑✓➡▶►⭐]|\u{1F449}|\u{1F539}|\u{1F538}|\u{1F535}|\u{1F7E2})\s*/u, '- ')
      .replace(/\p{Extended_Pictographic}/gu, '');
    // de las diapositivas: enlaces (y el pedazo del enlace que se paso al renglon de abajo), el pie
    // "Robótica · Primero Primaria · I Bloque", el video "Smile and Learn · 4:27", numeros sueltos.
    // Lo que se quita queda en null, no en blanco: un renglon en blanco separa parrafos y esto no
    if (/https?:\/\/|www\.|youtu\.?be/i.test(l)) return null;
    if (i && /https?:\/\/|www\./i.test(crudas[i - 1]) && /^\s*\S{1,15}\s*$/.test(l)) return null;
    if (/·/.test(l)) return null;
    if (/^\s*\d{1,2}\s*$/.test(l) || /^\s*(pregunta|respuesta)\s*\d+\s*$/i.test(l)) return null;
    return l.replace(/([.!?])\d{1,2}\s*$/, '$1')                          // "de un lugar.1", el numero de la lista
      .replace(/^(\s*\d{1,2})\s+(?=\p{Lu})/u, '$1. ');                    // "1 Piensa en un robot" es un paso numerado
  });
  // 2. lo que se repite en cada diapositiva (titulos de seccion, pies) no es de la clase
  const veces = {};
  for (const l of lineas) { const k = normal(l); if (k) veces[k] = (veces[k] || 0) + 1; }
  // (solo renglones sin punto final, una oracion repetida es de la clase; y si el texto entero vino
  // pegado varias veces, no se quita nada)
  const repetido = l => l !== null && veces[normal(l)] >= 3 && palabras(l).length >= 2 && !/[.!?]\s*$/.test(l);
  const llenos = lineas.filter(l => l && limpio(l)).length;
  if (lineas.filter(repetido).length < llenos * 0.4) lineas = lineas.map(l => repetido(l) ? null : l);
  // el titulo y el canal de un video van justo antes de su enlace
  crudas.forEach((l, i) => {
    if (!/https?:\/\/|www\.|youtu\.?be/i.test(l)) return;
    for (let k = i - 1, n = 0; k >= 0 && n < 3; k--) {
      if (lineas[k] === null) continue;                      // el renglon del canal ya se quito
      if (!limpio(lineas[k]) || /\.$/.test(limpio(lineas[k]))) break;
      lineas[k] = null; n++;
    }
  });
  lineas = lineas.filter(l => l !== null);
  // 3. bloques sin ningun punto (WhatsApp, apuntes), cada renglon largo es una oracion;
  // en los demas, el renglon cortado que sigue en el de abajo se junta
  // (sigue si empieza con minuscula o si el de arriba acaba en "de", "que", "la"...)
  const out = [];
  let bloque = [];
  const cerrar = () => {
    const sinPuntos = bloque.length >= 2 && !bloque.some(l => /[.!?]/.test(l));
    let previo = -1;
    for (const l of bloque) {
      const arriba = previo >= 0 ? limpio(out[previo]) : '';
      if (sinPuntos) out.push(palabras(l).length >= 5 && !VINETA.test(l) ? punto(mayus(limpio(l))) : l);
      else if (arriba && !VINETA.test(l) && !VINETA.test(arriba) && !/[.!?:;]$/.test(arriba) && (/^\s*[a-záéíóúñü]/.test(l) || UNE.test(arriba))) out[previo] = arriba + ' ' + limpio(l);
      else out.push(l);
      previo = out.length - 1;
    }
    bloque = [];
  };
  for (const l of lineas) { if (limpio(l)) bloque.push(l); else { cerrar(); out.push(''); } }
  cerrar();
  // 4. el quiz de la presentacion, "¿Cual es un robot?", "A Una piedra B Un lápiz", "Respuesta correcta, D."
  const quiz = [], porPregunta = new Map();
  let actual = null;
  for (let i = 0; i < out.length; i++) {
    const l = limpio(out[i]);
    if (/^¿[^?]+\?$/.test(l) && /^[A-D]\s+\S/.test(limpio(out[i + 1] || ''))) {
      let j = i + 1, ops = '';
      while (j < out.length && j - i <= 3 && /^[A-D]\s+\S/.test(limpio(out[j]))) ops += ' ' + limpio(out[j++]);
      const m = limpio(ops).replace(/([a-záéíóúñü0-9)])([B-D])\s/g, '$1 $2 ').match(/^A\s+(.+?)\s+B\s+(.+?)\s+C\s+(.+?)\s+D\s+(.+)$/);
      const k = normal(l);
      if (!porPregunta.has(k)) { porPregunta.set(k, { pregunta: l, opciones: null, clave: null }); quiz.push(porPregunta.get(k)); }
      actual = porPregunta.get(k);
      if (m && !actual.opciones) actual.opciones = m.slice(1, 5).map(x => limpio(x).replace(/\.$/, ''));
      for (let x = i; x < j; x++) out[x] = '';                // la pregunta y sus opciones no son texto de la clase
      i = j - 1;
      continue;
    }
    const r = l.match(/^respuesta correcta,?\s*([A-D])\b\.?\s*(.*)$/i);
    if (r) {
      if (actual) actual.clave = r[1].toUpperCase();
      out[i] = palabras(r[2]).length >= 4 ? punto(mayus(r[2])) : '';
    } else if (/^[A-D]\s+[A-ZÁÉÍÓÚÑ¿]/.test(l) && palabras(l).length <= 10) out[i] = '';   // opciones sueltas
  }
  // 5. mayusculas, lo de organizar la clase y el cuestionario, renglon por renglon
  const qa = [];
  const final = out.map((l, i) => {
    // todo en mayusculas, se pasa a minusculas con mayuscula al empezar cada oracion
    const letras = l.match(/\p{L}/gu) || [];
    if (letras.length >= 6 && letras.filter(c => c !== c.toLowerCase()).length > letras.length * 0.85)
      l = l.toLowerCase().replace(/(^\s*(?:[-•*–·▪●]\s+|\d{1,2}[.)]\s+)?|[.!?:]\s+)([¿¡]?)(\p{L})/gu, (m, a, b, c) => a + b + c.toUpperCase());
    // "Si faltaste copia en tu cuaderno las diapositivas...", "Se entrega tu robot", fuera
    if (LOGISTICA.test(l) || ACTIVIDAD.test(l)) {
      const n = (l.match(/^\s*\d{1,2}[.)]\s+/) || [''])[0];
      l = frases(l.slice(n.length)).filter(f => !LOGISTICA.test(f) && !ACTIVIDAD.test(f)).join(' ');
      if (l) l = n + l;
    }
    // lo que pide el cuaderno sin signo ("Qué es la metamorfosis.") y el renglon que el PDF corto ("Una cadena alimenticia de")
    // (con tilde, "Cuando las gotitas se juntan..." y "Como el hielo" si son de la clase)
    if (/^\s*(\d{1,2}[.)]\s+)?(qu[eé]|cómo|cuál|cuáles|dónde|cuándo|por qué|para qué|cuánt[oa]s?)\s/i.test(l)) return '';
    if (UNE.test(limpio(l)) && palabras(l).length >= 2) return '';
    // "El sensor de luz es como B Los ojos", lo que quedo de un quiz de completar
    if (/\p{Ll}\s[A-D]\s+\p{Lu}\p{Ll}/u.test(l)) return '';
    // cuestionario, "1. ¿Que es la geografia? R// Es la ciencia..."
    const q = l.match(/^\s*(?:\d{1,2}[.)]\s*)?(¿[^?]{3,}\?)\s*(?:R\s*\/\/?|R:|Resp(?:uesta)?\s*[.:]|[-–→])?\s*(.*)$/i);
    if (q) {
      const pregunta = limpio(q[1]);
      let resp = limpio(q[2]).replace(/^[-–:]\s*/, '');
      // en una tarjeta de diapositiva la respuesta va en el renglon de abajo, "¿Qué es un robot?" / "Una máquina que..."
      const abajo = limpio(out[i + 1] || '');
      // (con su punto final; "Máquinas que ayudan" sin punto es el subtitulo de la portada)
      if (!resp && /^¿\s*qu[eé] (es|son) /i.test(pregunta) && palabras(abajo).length >= 3 && /\.$/.test(abajo) && !esFila(abajo)) { resp = (/^(es|son)\s/i.test(abajo) ? '' : 'Es ') + minus(abajo); out[i + 1] = ''; }
      const def = pregunta.match(/^¿\s*qu[eé] (?:es|son) ((?:(?:el|la|los|las|un|una)\s+)?(.+?))\s*\?$/i);
      if (def && /^(es|son)\s/i.test(resp) && palabras(def[2]).length <= 4) return `${mayus(def[1])}: ${mayus(resp)}`;
      // "¿Qué hace?" sola no dice de que se habla
      if (palabras(pregunta).length >= 4 && !qa.some(x => normal(x.pregunta) === normal(pregunta))) qa.push({ pregunta, respuesta: resp ? punto(mayus(resp)) : '' });
      return palabras(resp).length >= 5 ? punto(mayus(resp)) : '';
    }
    return l;
  });
  return { texto: final.join('\n'), qa, quiz: quiz.filter(q => q.opciones && q.clave) };
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

function analizar(crudo) {
  const prep = prepararTexto(crudo);
  const texto = separarRenglones(prep.texto);
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
    if (esGlosa(l)) {
      if (!lista || lista.numerada) { lista = { numerada: false, items: [] }; actual.listas.push(lista); }
      lista.items.push(l);
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
    const def = m && punto(f.replace(m[0], '').replace(/^A (ese|esa|este|esta)\s+/i, ''));
    if (m && palabras(m[1]).length <= 4 && palabras(def).length >= 4) agregar({ termino: mayus(limpio(m[1])), definicion: def }, 'frase', i);
  })));
  secciones.forEach((s, i) => s.parrafos.forEach(p => frases(p).forEach(f => definicionesDeFrase(f).forEach(c => agregar(c, 'prosa', i)))));
  // "Esto se llama evaporación", "This is called evaporation", con la oracion de antes
  secciones.forEach((s, i) => s.parrafos.forEach(p => frases(p).forEach((f, k, fs) => {
    const m = f.match(/^(?:a\s+)?(?:esto|eso|este proceso|esta etapa|this|that|it)\s+(?:se\s+(?:le\s+)?(?:llama|conoce como|denomina)|is called)\s+([^.,;]+?)\.?$/i);
    if (m && k && palabras(m[1]).length <= 4 && palabras(fs[k - 1]).length >= 4) agregar({ termino: mayus(limpio(m[1])), definicion: punto(fs[k - 1]) }, 'frase', i);
  })));
  secciones.forEach((s, i) => {
    const w = palabras(s.titulo);
    if (!s.titulo || w.length > 4 || GENERICOS.test(sinRotulo(s.titulo)) || IMPERATIVO.test(s.titulo) || esFila(s.titulo) ||
      /^(en|de|del|para|c[oó]mo|por|con|qu[eé]|importancia|experimento|as[ií]|hoy|ahora|mi|tu|nuestro|nuestra|vamos)(?![a-záéíóúñ])/i.test(s.titulo)) return;
    if (s.parrafos[0] && (esFila(s.parrafos[0]) || IMPERATIVO.test(s.parrafos[0]))) return;
    // un verbo de titulo ("Limpian", "Cuidan") no es un concepto; un sustantivo sale con articulo en algun lado
    // ni un lema ("Todo gira", "Subir y bajar")
    if ((VACIAS.has(normal(w[0])) && !/^(el|la|los|las|un|una)$/i.test(w[0])) || (w.length > 1 && /^\p{L}{3,}(ar|er|ir)$/iu.test(w[0]) && !new RegExp('(^|\\s)(el|la|los|las|un|una)\\s+' + escapar(w[0]), 'i').test(texto))) return;
    if (w.length === 1 && /(an|en|amos|emos|imos|ar|er|ir)$/i.test(w[0]) && w[0].length >= 6 && !new RegExp('(^|\\s)(el|la|los|las|un|una)\\s+' + escapar(w[0]), 'i').test(texto)) return;
    // la primera oracion, o en una tarjeta de diapositiva ("Cerebro", "Piensa. Es como tu cabeza.") el primer renglon
    const primera = frases(s.parrafos.join(' '))[0];
    if (primera && palabras(primera).length >= 5) agregar({ termino: s.titulo, definicion: acortar(primera) }, 'titulo', i);
    else if (s.parrafos[0] && palabras(s.parrafos[0]).length >= 3 && palabras(s.parrafos[0]).length <= 25) agregar({ termino: s.titulo, definicion: acortar(s.parrafos[0]) }, 'titulo', i);
  });

  // oraciones sueltas (para completar, verdadero o falso y seleccion)
  const oraciones = [];
  for (const s of secciones) {
    for (const p of s.parrafos) oraciones.push(...frases(p));
    for (const li of s.listas) for (const it of li.items) {
      const c = concepto(it);
      // "Río. Es una corriente de agua..." sola no dice de que habla, se arma "Río es una corriente de agua..."
      const sola = c && !/^(el|la|los|las|un|una|unos|unas|este|esta|estos|estas|su|sus|cada|todo|toda|todos|todas|the|a|an|it|they|this|como|por|cuando|si)\s/i.test(c.definicion);
      oraciones.push(...frases(c ? (sola ? `${c.termino} ${minus(c.definicion)}` : c.definicion) : it));
    }
  }
  // fuera las de presentar algo ("se hace asi") y los pedazos que empiezan con "Como"
  // las muy largas se cortan en una coma (un texto de pura oracion larga tambien sirve)
  // y "Moraleja: nadie es tan pequeño..." queda sin el rotulo
  const utiles = [...new Set(oraciones.map(f => palabras(f).length > 32 ? acortar(f, 28) : f)
    .map(f => { const r = f.match(/^([^:]{3,25}):\s+(.+)$/); return r && GENERICOS.test(r[1]) ? mayus(r[2]) : f; }))].filter(f => { const n = palabras(f).length; return n >= 6 && n <= 32 && !/[:]$/.test(f) && !/se hace as[ií]/i.test(f) && !/^como /i.test(f) && !/^¿|\?$|R\/\//.test(f) && !IMPERATIVO.test(f) && !esFila(f) && !objetivo(f) &&
    // lo que pide el cuaderno ("Impresora de oficina y por qué.") y renglones de tabla sin punto
    !/\b(por qué|qué|cómo|cuál|cuáles|dónde|cuándo)\.?$/i.test(f) && !/^(de|del|desde|hasta|hacia)\s/i.test(f) && (/[.!?]$/.test(f) || mayusculasDe(f) <= 0.25); });

  // palabras clave, las que se repiten y no son vacias
  const cuenta = {}, forma = {};
  for (const w of texto.match(/[A-Za-zÁÉÍÓÚÑÜáéíóúñü]{5,}/g) || []) {
    const k = normal(w);
    if (VACIAS.has(k)) continue;
    cuenta[k] = (cuenta[k] || 0) + 1;
    if (!forma[k] || (forma[k] !== forma[k].toLowerCase() && w === w.toLowerCase())) forma[k] = w;
  }
  // las que van despues de un articulo son cosas (sustantivos), para que las opciones se parezcan
  // nombres propios, los que salen con mayuscula a media oracion ("y Pedro", "el planeta Marte")
  const propios = new Set();
  for (const m of texto.matchAll(/[\p{Ll},;]\s+(\p{Lu}\p{Ll}{2,})/gu)) propios.add(normal(m[1]));
  const cosas = new Set();
  for (const m of texto.matchAll(/(?:^|[^\p{L}])(?:el|la|los|las|un|una|unos|unas|del|al|the|an)\s+(\p{L}{5,})/giu)) cosas.add(normal(m[1]));
  const claves = Object.keys(cuenta).sort((a, b) => cosas.has(b) - cosas.has(a) || cuenta[b] - cuenta[a]).map(k => forma[k]);
  // un cuento o una historia, cuenta hechos en pasado o trae años
  // (muchos verbos en pasado para lo largo que es, o tres años distintos; una clase de electronica no es un cuento)
  const pasados = (texto.match(/\b[a-záéíóúñ]{3,}(?:ó|ió|aron|ieron)(?![a-záéíóúñ])/gi) || []).length;
  const narra = (pasados >= 5 && pasados >= utiles.length * 0.3) || new Set(texto.match(/\b(?:1[5-9]\d\d|20[0-2]\d)\b/g) || []).size >= 3;
  // (no "Conociendo los Mega Bloks" ni "Dibuja tu robot", que no se leen bien en "importante en ...")
  const tema = secciones.map(s => sinRotulo(s.titulo)).find(t => t && !GENERICOS.test(t) && !IMPERATIVO.test(t) && !/^\p{L}+(ando|endo|iendo)\s/iu.test(t)) || '';
  // grupos escritos dentro de un parrafo, "elementos, como el mensaje, el canal y el codigo"
  const enumerados = [], yaGrupo = new Set();
  secciones.forEach(s => s.parrafos.forEach(p => frases(p).forEach(f => enumeraciones(f).forEach(g => {
    if (yaGrupo.has(normal(g.nombre))) return;
    yaGrupo.add(normal(g.nombre));
    enumerados.push(g);
  }))));
  return { secciones, glosario, oraciones: utiles, cuenta, claves, cosas, forma, propios, narra, tema, enumerados, qa: prep.qa, quiz: prep.quiz };
}

// un grupo con estos nombres son partes de algo que se puede dibujar
const PARTES = /^(partes|elementos|etapas|componentes|fases|órganos|organos|piezas|capas)\b/i;
const DIBUJABLE = /\b(partes|elementos|etapas|componentes|fases|órganos|organos|piezas|capas|estructura|planetas|huesos|músculos|musculos)\b/i;
// "Partes de la computadora" pasa a "la computadora", "Etapas del ciclo del agua" a "el ciclo del agua"
function queDibujar(titulo) {
  const m = sinRotulo(titulo).replace(/^(las|los)\s+/i, '').match(/^\S+(?:\s+principales)?\s+(de|del)\s+(.+)$/i);
  return m ? (m[1].toLowerCase() === 'del' ? 'el ' : '') + m[2] : '';
}

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
  return w.every(x => /^[a-záéíóúñü'’ʼ]+$/i.test(x));
}

// "El lenguaje es la capacidad que tenemos...", "La X consiste en...", "un emisor, que es quien transmite el mensaje"
function definicionesDeFrase(f) {
  const out = [];
  // con articulo o sin el (entonces con mayuscula), y en ingles "The water cycle is the path..."
  const m = f.match(/^(?:(el|la|los|las|un|una|unos|unas)\s+)?(.{3,40}?)\s+(es|son|era|eran|fue|fueron|significa|consiste en|se refiere a|se define como)\s+(.+)$/i)
    || f.match(/^(?:(the|a|an)\s+)?(.{3,30}?)\s+(is|are|means)\s+((?:the|a|an)\s+.+)$/i);
  if (m && (m[1] || /^[A-ZÁÉÍÓÚÑ]/.test(m[2]))) {
    const t = limpio(m[2]), resto = limpio(m[4]);
    const sigue = normal(resto.split(' ')[0]);
    const copula = /^(es|son|era|eran|fue|fueron|is|are)$/i.test(m[3]);
    const art = m[1] && !/^(the|a|an)$/i.test(m[1]) ? m[1].toLowerCase() : undefined;
    if (terminoSirve(t) && palabras(resto).length >= 4 &&
      (!copula || /^(el|la|los|las|un|una|unos|unas|quien|quienes|aquel|aquella|aquello|cuando|todo|toda|the|a|an)$/.test(sigue)))
      out.push({ termino: mayus(t), art, definicion: mayus(acortar(m[3].toLowerCase() + ' ' + resto)) });
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
    // de que son las partes, "Los robots tienen tres partes..." da "un robot"
    const d = f.match(/^(el|la|los|las|un|una)\s+([a-záéíóúñ]+)\s+(?:tiene|tienen|está formad[oa]|están formad[oa]s|se compone|se componen)\b/i);
    let dueno = '';
    if (d) {
      const art = d[1].toLowerCase(), plural = /^(los|las)$/.test(art);
      dueno = plural ? (art === 'los' ? 'un ' : 'una ') + d[2].replace(/([^aeiouáéíóú])es$/i, '$1').replace(/s$/i, '') : art + ' ' + d[2];
    }
    if (elementos.length >= 3 && new Set(elementos.map(normal)).size === elementos.length) out.push({ nombre: mayus(nombre), elementos, dueno });
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
  // y si tampoco, palabras clave del texto que no son respuesta
  const sobrantes = usadas => {
    const fuera = t => !usadas.some(u => normal(u) === normal(t));
    const del = A.glosario.map(g => g.termino).filter(fuera).slice(-2);
    const mas = A.enumerados.flatMap(g => g.elementos).filter(t => fuera(t) && !del.some(d => normal(d) === normal(t)));
    // ni "sustantivos" cuando la respuesta es "Sustantivo", ni "ratón" cuando es "ratoncito"
    const claves = A.claves.filter(t => t.length >= 6 && fuera(t) && !usados.has(normal(t)) && !usadas.some(u => mismaRaiz(u, t)));
    return [...del, ...mas, ...claves].slice(0, 2);
  };
  const qaUsadas = new Set();
  // la palabra de la oracion que se repite en el texto (minimo veces) y no es respuesta de otra serie,
  // primero las cosas (van despues de un articulo) y las mas largas
  const claveDe = (f, minimo = 2) => (f.match(/[A-Za-záéíóúñüÁÉÍÓÚÑÜ]{6,}/g) || [])
    .filter(w => !VACIAS.has(normal(w)) && (A.cuenta[normal(w)] || 0) >= minimo && !usados.has(normal(w)))
    .sort((a, b) => A.cosas.has(normal(b)) - A.cosas.has(normal(a)) || b.length - a.length)[0];
  // tres palabras clave del texto que se parezcan a la correcta: las dos cosas o no, las dos en plural
  // o en singular, y nombre propio con nombre propio
  const parecidas = (w, f) => {
    const plural = x => /s$/i.test(x), propio = x => { const p = A.forma[normal(x)] || x; return p[0] !== p[0].toLowerCase(); };
    const cosa = x => A.cosas.has(normal(x)), cap = w[0] !== w[0].toLowerCase();
    const vistos = new Set([normal(w)]), out = [];
    for (const o of barajarFijo(A.claves.filter(o => o.length >= 5 && plural(o) === plural(w) && propio(o) === propio(w) && cosa(o) === cosa(w) && !contiene(f, o) && !mismaRaiz(o, w)))) {
      if (vistos.has(normal(o))) continue;
      vistos.add(normal(o)); out.push(cap ? mayus(o) : o);
      if (out.length === 3) break;
    }
    return out;
  };

  const constructores = {
    ordenar(n) {
      const candidatos = [];
      A.secciones.forEach(s => s.listas.forEach(li => {
        // una lista numerada de conceptos ("1. Mercurio. Es el planeta...") no son pasos, salvo que el titulo lo diga
        // y las tareas de la clase ("Dibuja un robot", "Haz una flecha") tampoco, salvo bajo un titulo de pasos
        const deConceptos = li.items.filter(it => concepto(it)).length >= li.items.length / 2;
        const tareas = li.items.filter(it => IMPERATIVO.test(it)).length >= li.items.length / 3;
        if (li.items.length >= n && !GENERICOS.test(sinRotulo(s.titulo)) && !esFila(s.titulo) && ((li.numerada && !deConceptos && !tareas) || /pasos|procedimiento|etapas|proceso|instrucciones|fases/i.test(s.titulo)))
          candidatos.push({ titulo: s.titulo, pasos: li.items.map(it => { const c = concepto(it); return acortar(c ? c.definicion : frases(it)[0] || it, 18); }), exacto: li.items.length === n });
      }));
      A.secciones.forEach(s => s.parrafos.forEach(p => {
        const fs = frases(p);
        const i = fs.findIndex(f => /se hace así|se hace asi|pasos|siga|procedimiento/i.test(f));
        if (i >= 0 && fs.length - i - 1 >= n) candidatos.push({ titulo: s.titulo, pasos: fs.slice(i + 1).map(f => acortar(f, 18)), exacto: fs.length - i - 1 === n });
        else if (/experimento|procedimiento|pasos/i.test(s.titulo) && fs.length >= n) candidatos.push({ titulo: s.titulo, pasos: fs.map(f => acortar(f, 18)), exacto: fs.length === n });
      }));
      // un cuento o una historia sin pasos, los hechos de principio a fin
      const hechos = A.oraciones.filter(f => !/moraleja|enseñanza/i.test(f));
      if (!candidatos.length && A.narra && hechos.length >= n) {
        const L = hechos.length;
        candidatos.push({ titulo: 'Hechos de la lectura', pasos: Array.from({ length: n }, (_, k) => acortar(hechos[Math.round(k * (L - 1) / (n - 1))], 18)) });
      }
      candidatos.sort((a, b) => b.exacto - a.exacto);
      const c = candidatos[0];
      if (!c) throw new Error(`no hay una lista numerada ni un procedimiento con ${n} pasos`);
      const pasos = c.pasos.slice(0, n);
      pasos.forEach(p => frasesUsadas.add(normal(p)));
      const titulo = c.titulo || 'el procedimiento';
      const proceso = /^(pasos|etapas|fases|hechos)/i.test(titulo) ? titulo : 'Pasos del tema ' + titulo;
      return { proceso, pasos };
    },

    dibujo(n) {
      // solo una lista bajo un titulo de partes ("Partes de la computadora", "Etapas del ciclo del agua", "Los planetas");
      // una lista de sustantivos o un cuestionario no se dibuja
      const deLista = A.secciones.filter(s => DIBUJABLE.test(s.titulo) && !gruposUsados.has(s.titulo))
        .map(s => ({ s, partes: s.listas.flatMap(li => li.items.map(it => { const c = concepto(it); return c ? c.termino : palabras(it).length <= 4 ? punto(it).replace(/\.$/, '') : null; })).filter(Boolean) }))
        .filter(x => x.partes.length >= n).sort((a, b) => b.partes.length - a.partes.length)[0];
      // si no, un grupo de partes escrito en el parrafo que diga de que es ("los robots tienen tres partes, como...")
      // (uno que ya use clasificar no, las partes regalarian la respuesta)
      const enParrafo = A.enumerados.find(g => g.elementos.length >= n && PARTES.test(g.nombre) && g.dueno && !gruposUsados.has(g.nombre));
      let partes, dibujar;
      if (deLista) { partes = deLista.partes; dibujar = queDibujar(deLista.s.titulo) || A.tema; }
      else if (enParrafo) { partes = enParrafo.elementos; dibujar = enParrafo.dueno; }
      if (!partes || !dibujar) throw new Error(`no hay ${n} partes para señalar`);
      partes = partes.slice(0, n);
      return { dibujar: minus(dibujar), partes, respuesta: contraer(`Un dibujo de ${minus(dibujar)} donde se vean y estén señaladas estas partes, ${partes.join(', ')}.`) };
    },

    clasificar(n) {
      const grupos = [];
      A.secciones.forEach(s => s.listas.forEach(li => {
        // los elementos son cosas cortas, no tareas ("Dibuja un robot") ni renglones cortados ("Cerebro, sensores,")
        const items = li.items.map(it => { const c = concepto(it); return c ? c.termino : (palabras(it).length <= 4 && !IMPERATIVO.test(it) && !/,$/.test(it) ? punto(it).replace(/\.$/, '') : null); }).filter(Boolean);
        if (s.titulo && items.length >= 2 && !GENERICOS.test(sinRotulo(s.titulo)) && !IMPERATIVO.test(s.titulo) && !esFila(s.titulo)) grupos.push({ nombre: s.titulo, elementos: items });
      }));
      for (const g of A.enumerados) grupos.push({ nombre: g.nombre, elementos: [...g.elementos], parrafo: true });
      // un elemento en una sola categoria (se quita de las que vienen despues)
      const sinRepetir = gs => { const vistos = new Set(); return gs.map(g => ({ ...g, elementos: g.elementos.filter(e => { const k = normal(e); if (vistos.has(k)) return false; vistos.add(k); return true; }) })); };
      const escoger = gs => sinRepetir(gs).filter(g => g.elementos.length >= 2).sort((a, b) => b.elementos.length - a.elementos.length).slice(0, 4);
      const alcanza = bs => bs.length >= 2 && bs.reduce((a, g) => a + g.elementos.length, 0) >= n;
      // si tambien va Dibujar, se le deja el grupo de partes cuando las demas alcanzan
      // (entonces "Dispositivos de entrada" y "de salida" en vez de "Partes de la computadora")
      let buenos = escoger(grupos.filter(g => !(conDibujo && (PARTES.test(g.nombre) || DIBUJABLE.test(g.nombre)))));
      if (!alcanza(buenos)) buenos = escoger(grupos);
      if (!alcanza(buenos)) throw new Error(`no hay dos o más títulos con su lista debajo que junten ${n} elementos`);
      buenos.forEach(g => gruposUsados.add(g.nombre));
      const cats = buenos.map(g => ({ nombre: g.nombre, elementos: [] }));
      for (let k = 0, i = 0; k < n; i++) {       // se reparte por turnos, asi ninguna queda vacia
        const g = buenos[i % buenos.length], c = cats[i % buenos.length];
        if (c.elementos.length < g.elementos.length) { c.elementos.push(g.elementos[c.elementos.length]); k++; }
      }
      return { categorias: cats.filter(c => c.elementos.length) };
    },

    parear(n) {
      const disp = libres().filter(g => !frasesUsadas.has(normal(g.definicion)));
      // un cuestionario, cada pregunta con su respuesta corta
      const cortas = A.qa.filter(q => q.respuesta && palabras(q.respuesta).length <= 6 && !qaUsadas.has(q));
      if (disp.length < n && cortas.length >= n + 2) {
        const pares = cortas.slice(0, n).map(q => { qaUsadas.add(q); return { definicion: q.pregunta, concepto: q.respuesta.replace(/\.$/, '') }; });
        return { pares, trampas: cortas.slice(n, n + 2).map(q => q.respuesta.replace(/\.$/, '')) };
      }
      if (disp.length < n) throw new Error(`hay ${disp.length} conceptos con su definición y hacen falta ${n}`);
      // el concepto queda como respuesta, asi ninguna otra serie usa una oracion que lo traiga escrito
      const pares = disp.slice(0, n).map(g => { usar(g.termino); respuestas.push(g.termino); frasesUsadas.add(normal(g.definicion)); return { definicion: g.definicion, concepto: g.termino }; });
      const trampas = sobrantes(pares.map(p => p.concepto)).map(mayus);   // con mayuscula como los conceptos
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
      // si faltan, con palabras clave del texto, primero las que se repiten
      for (const minimo of [2, 1]) for (const f of A.oraciones) {
        if (oraciones.length >= n) break;
        if (frasesUsadas.has(normal(f))) continue;
        const clave = claveDe(f, minimo);
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
      // primero las del quiz que trae la presentacion del maestro, con sus mismas opciones
      for (const q of A.quiz) {
        if (preguntas.length >= n) break;
        const correcta = q.opciones['ABCD'.indexOf(q.clave)];
        const inc = q.opciones.filter((_, k) => k !== 'ABCD'.indexOf(q.clave));
        if (new Set(q.opciones.map(normal)).size < 4 || respuestas.some(x => contiene(q.pregunta, x))) continue;
        preguntas.push({ pregunta: q.pregunta, correcta, incorrectas: inc });
        anotar(q.pregunta, correcta);
      }
      let i = 0, j = 0;
      while (preguntas.length < n && (i < porConcepto.length || j < porFrase.length)) {
        // se turnan, una de concepto y una de oracion
        if ((preguntas.length % 2 === 0 || j >= porFrase.length) && i < porConcepto.length) {
          const g = porConcepto[i++];
          if (usados.has(normal(g.termino)) || frasesUsadas.has(normal(g.definicion))) continue;   // ya salio en una de oracion
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
          // la oracion que define un concepto de las de concepto no se usa, saldria dos veces lo mismo
          if (porConcepto.some(c => !usados.has(normal(c.termino)) && contiene(f, c.termino) && casiIgual(c.definicion, f))) continue;
          if (mes) { correcta = f.match(new RegExp(mes, 'i'))[0]; inc = otros(mes, MESES.filter(m => !contiene(f, m))).map(m => correcta[0] === correcta[0].toUpperCase() ? mayus(m) : m); }
          else if (num) { const v = +num[0]; correcta = num[0]; inc = [v + 1, v > 2 ? v - 1 : v + 3, v * 2 || 5].map(String); }
          else if (g && g.fuente !== 'titulo') { correcta = f.match(new RegExp(escapar(g.termino), 'i'))[0]; inc = otros(g.termino, terminos, f); }
          if (!correcta || inc.length < 3) {        // si no, una palabra clave de la oracion y otras del texto
            const clave = claveDe(f, 2) || claveDe(f, 1);
            if (clave) { correcta = clave; inc = parecidas(clave, f); }
          }
          if (!correcta || inc.length < 3 || new Set([correcta, ...inc].map(normal)).size < 4 || !sirve(f, correcta)) continue;
          preguntas.push({ pregunta: `Complete la oración. ${f.replace(correcta, '________')}`, correcta, incorrectas: inc });
          anotar(f.replace(correcta, ''), correcta);
          frasesUsadas.add(normal(f)); if (!mes && !num) usar(correcta);
        }
      }
      if (preguntas.length < n) throw new Error(`solo salieron ${preguntas.length} preguntas de selección`);
      return { preguntas };
    },

    vf(n) {
      const falsas = Math.floor(n / 2), afirmaciones = [];
      // el titulo de una seccion no se cambia por un concepto ("Los la Independencia de Guatemala fueron...")
      const terminos = A.glosario.filter(g => g.fuente !== 'titulo').map(g => g.termino);
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
          // otro concepto en plural si este va en plural, y si se puede de la misma lista
          const igual = o => normal(o) !== normal(t) && !contiene(f, o) && /s$/i.test(o) === /s$/i.test(t);
          const otro = terminos.find(o => igual(o) && A.glosario.find(g => g.termino === o).grupo === A.glosario.find(g => g.termino === t).grupo)
            || terminos.find(igual);
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
        if (!falsa) falsa = negar(f);
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
      const tema = minus(A.tema || datos.materia);
      const preguntas = [], definidas = [];
      // "el sustantivo", "la célula", "los colores"; sin articulo si es nombre propio (Mercurio, Venus) o sigla (CPU)
      const articulo = termino => {
        const p = palabras(termino)[0] || '', w = normal(p);
        const f = A.forma[w];
        if (w.length < 3 || /^\p{Lu}\p{Lu}/u.test(p) || (A.propios.has(w) && (!f || f[0] !== f[0].toLowerCase()))) return '';
        if (/^(mapa|planeta|dia|problema|sistema|tema|idioma|clima|programa|poema|agua)$/.test(w)) return 'el';
        if (/^(mano|radio|foto|moto)$/.test(w)) return 'la';
        if (/os$/.test(w) || /[^aeiou]es$/.test(w)) return 'los';
        if (/as$/.test(w)) return 'las';
        return /(a|ion|dad|tad|tud|umbre)$/.test(w) ? 'la' : 'el';
      };
      for (let k = 0; preguntas.length < n && k < pool.length; k++) {
        const g = pool[k], art = g.art || (/^(el|la|los|las|un|una)\s/i.test(g.termino) ? '' : articulo(g.termino)), t = (art ? art + ' ' : '') + minus(g.termino), d = minus(g.definicion);
        definidas.push(g.definicion);
        // "¿Qué son los próceres?", "¿Qué pasaría si no existieran los colores?"
        const plural = /^(los|las)$/.test(art) || /^(los|las)\s/i.test(g.termino) || (!art && /^\S{3,}(os|as|es)\b/i.test(g.termino));
        const es = plural ? 'son' : 'es', existiera = plural ? 'existieran' : 'existiera';
        // "qué sucede en" solo si es una etapa o un paso de algo
        const proceso = /etapas|fases|pasos|proceso|ciclo/i.test((A.secciones[g.grupo] || {}).titulo || '');
        if (/^como /i.test(g.definicion)) {          // la definicion son ejemplos
          preguntas.push({ pregunta: `Escriba dos ejemplos de ${t} que pueda ver en su casa o su comunidad y explique por qué lo son.`, respuesta: `Por ejemplo ${d.replace(/^como /i, '')}` });
          continue;
        }
        switch (preguntas.length % 4) {
          case 0: preguntas.push({ pregunta: contraer(`¿Qué ${es} ${t} y por qué ${plural ? 'son importantes' : 'es importante'} en ${contiene(tema, g.termino) ? 'la vida diaria' : tema}?`), respuesta: `Debe explicar que ${d}` }); break;
          case 1: preguntas.push({ pregunta: contraer(proceso ? `Explique con sus palabras qué sucede en ${t} y dé un ejemplo de la vida diaria.` : `Explique con sus palabras qué ${es} ${t} y dé un ejemplo de la vida diaria.`), respuesta: `${g.definicion} El ejemplo debe ser de su casa o su comunidad.` }); break;
          case 2: {
            // se compara con otro concepto de la misma lista, que no se haya preguntado
            const h = pool.slice(k + 1).find(o => o.grupo === g.grupo && o.fuente === 'lista' && g.fuente === 'lista' && !/^como /i.test(o.definicion));
            const ah = h && (h.art || articulo(h.termino));
            if (h) { preguntas.push({ pregunta: contraer(`¿Qué diferencia hay entre ${t} y ${ah ? ah + ' ' : ''}${minus(h.termino)}?`), respuesta: `${g.termino}, ${d} ${h.termino}, ${minus(h.definicion)}` }); pool.splice(pool.indexOf(h), 1); }
            else preguntas.push({ pregunta: `¿Qué pasaría si no ${existiera} ${t}? Explique.`, respuesta: `Debe relacionarlo con que ${d}` });
            break;
          }
          default: preguntas.push({ pregunta: `¿Qué pasaría si no ${existiera} ${t}? Explique.`, respuesta: `Debe relacionarlo con que ${d}` });
        }
      }
      // si faltan, de los grupos escritos en el parrafo
      for (const g of A.enumerados) {
        if (preguntas.length >= n) break;
        const k = Math.min(3, g.elementos.length - 1);
        preguntas.push({ pregunta: `Mencione ${NUMEROS[k - 1]} ${minus(g.nombre)} que se vieron en clase y explique una de ellas con un ejemplo.`,
          respuesta: `Puede mencionar ${g.elementos.map(minus).join(', ')}.` });
      }
      // las preguntas del cuestionario que trajo el maestro
      for (const q of A.qa) {
        if (preguntas.length >= n) break;
        if (qaUsadas.has(q)) continue;
        preguntas.push({ pregunta: q.pregunta, respuesta: q.respuesta || 'La respuesta de acuerdo con lo visto en clase.' });
        qaUsadas.add(q);
      }
      // y lo ultimo, de las oraciones. En un cuento, que paso despues; en lo demas, explicar la idea
      A.oraciones.forEach((f, k) => {
        if (preguntas.length >= n || frasesUsadas.has(normal(f)) || definidas.some(d => casiIgual(d, f))) return;
        const sig = A.oraciones[k + 1];
        if (A.narra && sig && !frasesUsadas.has(normal(sig)) && !/moraleja/i.test(sig)) {
          preguntas.push({ pregunta: `Según la lectura, ¿qué pasó después de esto? ${f}`, respuesta: sig });
          frasesUsadas.add(normal(f)); frasesUsadas.add(normal(sig));
        } else if (!A.narra && palabras(f).length >= 8 && !/^(es|son|fue|fueron|era|eran)\s/i.test(f)) {
          preguntas.push({ pregunta: `Explique con sus palabras esta idea de la clase. ${f}`, respuesta: `Debe explicar con sus palabras que ${minus(f)}` });
          frasesUsadas.add(normal(f));
        }
      });
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
    puntos.push(/^hechos/i.test(pr) ? 'Repasar en qué orden pasan los hechos de la lectura.' : /^etapas|^fases/i.test(pr) ? `Practicar el orden de las ${minus(pr)}.` : /^pasos/i.test(pr) ? `Practicar el orden de los ${minus(pr)}.` : `Practicar el orden de ${minus(pr)}.`);
  }
  return { datos, series, temario: { puntos: puntos.slice(0, 9) }, semilla: Math.floor(Math.random() * 1e6), modo: 'basico', cambios };
}

// barajar sin semilla para escoger opciones incorrectas
function barajarFijo(l) { return barajar([...l], Math.random); }
