// Dictar el contenido de la clase con la voz. Lo que dice el maestro se va escribiendo al final
// del texto, y "punto", "coma" y "punto y aparte" se vuelven signos. Usa el reconocimiento de voz
// del navegador (Chrome, Edge y Safari, con internet); donde no hay, se avisa que use el teclado.

// Una frase dicha, ya con sus signos. Cada pausa larga cierra la oracion si ya tiene cuatro palabras.
function frasesDeVoz(frase) {
  let t = ' ' + frase.replace(/\s+/g, ' ') + ' ';
  t = t.replace(/\s(punto y aparte|nuevo p[aá]rrafo|nuevo rengl[oó]n|otro rengl[oó]n|nueva l[ií]nea)(?=\s)/gi, '.\n')
    .replace(/\spunto y coma(?=\s)/gi, ';')
    .replace(/\sdos puntos(?=\s)/gi, ':')
    .replace(/\spunto y seguido(?=\s)/gi, '.')
    .replace(/\scoma(?=\s)/gi, ',')
    // "el punto de ebullicion" o "punto medio" no son el signo
    .replace(/\spunto(?=\s)(?!\s(de|del|medio|final|fijo|cardinal|cardinales)\s)/gi, '.')
    .replace(/\s(abre|cierra) (signo de )?pregunta(?=\s)/gi, m => /cierra/i.test(m) ? '?' : ' ¿');
  // sin tocar los decimales, 3,5 sigue igual
  t = t.replace(/[ \t]+/g, ' ').replace(/ ?([.,;:?])/g, '$1').replace(/([.,;:?])(?=[^\s\d.,;:?])/g, '$1 ')
    .replace(/([.,;:])[.,;:]+/g, '$1').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').replace(/¿\s+/g, '¿');
  t = t.replace(/^[ \t]+|[ \t]+$/g, '');
  if (/[^\s.,;:?!]$/.test(t) && t.split(' ').length >= 4) t += '.';
  return t;
}

// Pega la frase al final del texto, con espacio o renglon y mayuscula donde empieza oracion.
// Un "punto" o "punto y aparte" dicho solo cierra lo de antes.
function pegarDictado(antes, frase) {
  let f = frasesDeVoz(frase);
  const base = antes.replace(/[ \t]+$/, '');
  if (!base.trim()) f = f.replace(/^[\s.,;:]+/, '');
  if (!f.trim()) return antes;
  let cabeza = base, nuevo;
  if (/^[.,;:?]/.test(f)) { cabeza = base.replace(/[.,;:]$/, ''); nuevo = f; }
  else if (/^\n/.test(f)) nuevo = (/[.?!:\n]$/.test(base) ? '' : '.') + f;
  else nuevo = (!base || /\n$/.test(base) ? '' : ' ') + f;
  // la oracion que empieza va con mayuscula, sin tocar lo que ya estaba escrito
  const mayus = (m, a, b) => a + b.toLocaleUpperCase('es');
  nuevo = nuevo.replace(/([.?!]\s+¿?|\n¿?)([a-záéíóúñü])/g, mayus);
  if (!cabeza.trim() || /[.?!\n]$/.test(cabeza)) nuevo = nuevo.replace(/^(\s*¿?)([a-záéíóúñü])/, mayus);
  return cabeza + nuevo;
}

function prepararDictado({ boton, caja, linea, alCambiar }) {
  const Reconocer = window.SpeechRecognition || window.webkitSpeechRecognition;
  const android = /Android/i.test(navigator.userAgent);
  let rec = null, activo = false, pendiente = '', vacios = 0, idioma = 'es-GT';
  const decir = (t, malo) => { linea.hidden = !t; linea.textContent = t; linea.classList.toggle('mal', !!malo); };
  const pintar = () => {
    boton.textContent = activo ? 'Parar de dictar' : 'Dictar con la voz';
    boton.classList.toggle('dictando', activo);
    boton.setAttribute('aria-pressed', activo);
  };
  const escribir = frase => {
    const nuevo = pegarDictado(caja.value, frase);
    if (nuevo === caja.value) return;
    caja.value = nuevo;
    caja.scrollTop = caja.scrollHeight;
    alCambiar();
  };
  const parar = aviso => {
    activo = false;
    if (pendiente) { escribir(pendiente); pendiente = ''; }
    try { rec && rec.abort(); } catch (e) { /* ya estaba parado */ }
    rec = null;
    pintar();
    decir(aviso || '', !!aviso);
  };
  const empezar = () => {
    rec = new Reconocer();
    rec.lang = idioma;
    rec.interimResults = true;
    // en Android el modo seguido repite lo dicho, ahi se oye frase por frase y se vuelve a empezar
    rec.continuous = !android;
    rec.onresult = e => {
      vacios = 0;
      let parcial = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) { escribir(r[0].transcript); pendiente = ''; } else parcial += r[0].transcript;
      }
      // Safari a veces no cierra la frase, lo que quedo a medias se escribe al terminar
      if (parcial) pendiente = parcial;
      decir(parcial ? parcial : 'Hable, lo voy escribiendo');
    };
    rec.onerror = e => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') parar('Dé permiso para usar el micrófono y toque Dictar otra vez.');
      else if (e.error === 'audio-capture') parar('No se encontró el micrófono.');
      else if (e.error === 'network') parar('Para dictar se necesita internet.');
      else if (e.error === 'language-not-supported' && idioma !== 'es-MX') idioma = 'es-MX';
    };
    rec.onend = () => {
      if (pendiente) { escribir(pendiente); pendiente = ''; }
      if (!activo) return;
      // se apago solo por el silencio, se vuelve a prender; si no deja, se avisa
      if (++vacios > 8) { parar('Se apagó el micrófono. Toque Dictar con la voz otra vez.'); return; }
      try { empezar(); } catch (err) { parar('Se apagó el micrófono. Toque Dictar con la voz otra vez.'); }
    };
    rec.start();
  };
  boton.addEventListener('click', () => {
    if (activo) { parar(); return; }
    if (!Reconocer) { decir('Este navegador no deja dictar. Abra la página en Chrome o Edge, o use el micrófono del teclado del teléfono.', true); return; }
    activo = true; vacios = 0; pendiente = '';
    pintar();
    decir('Hable, lo voy escribiendo. Diga punto al terminar cada idea y punto y aparte para otro renglón.');
    try { empezar(); } catch (err) { parar('No se pudo prender el micrófono.'); }
  });
}
