// Dibuja los bloques en pantalla, reparte las series en las hojas que pidio el maestro
// (al menos dos por hoja) y llena el espacio que sobra con renglones. Tambien el temario.

const PX = 96 / 72;                        // pixeles por punto
const SEGURO = 34;                         // pixeles que se dejan libres al pie de cada hoja

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function htmlRun(r) {
  if (r.img) return `<img src="${r.img.url}" style="width:1in">`;
  const st = [];
  if (r.b || r.r) st.push('font-weight:bold');
  if (r.r) st.push('color:#C00000');
  if (r.u) st.push('text-decoration:underline');
  if (r.s) st.push(`font-size:${r.s}pt`);
  return st.length ? `<span style="${st.join(';')}">${esc(r.t)}</span>` : esc(r.t);
}

function htmlParrafo(p) {
  const st = [];
  if (p.antes) st.push(`padding-top:${p.antes}pt`);
  if (p.despues) st.push(`padding-bottom:${p.despues}pt`);
  if (p.sangria) st.push(`padding-left:${p.sangria}in;text-indent:-${p.sangria}in`);
  if (p.centro) st.push('text-align:center');
  if (p.interlineado) st.push(`line-height:${1.15 * p.interlineado}`);
  const dentro = p.runs.length ? p.runs.map(htmlRun).join('') : '&nbsp;';
  return `<p style="${st.join(';')}">${dentro}</p>`;
}

function htmlTabla(t) {
  const cols = t.anchos.map(w => `<col style="width:${w}in">`).join('');
  const filas = t.filas.map(f => `<tr${f.alto ? ` style="height:${f.alto}pt"` : ''}>` +
    f.celdas.map(c => `<td>${c.map(htmlParrafo).join('')}</td>`).join('') + '</tr>').join('');
  const ancho = t.anchos.reduce((a, b) => a + b, 0);
  return `<table class="t b-${t.bordes}" style="width:${ancho}in"><colgroup>${cols}</colgroup>${filas}</table>`;
}

const htmlBloques = bs => bs.map(b => b.k === 'p' ? htmlParrafo(b) : htmlTabla(b)).join('');

// Mide en pixeles lo que ocupa una lista de bloques con el ancho util de la hoja
let medidor = null;
function medir(bloques) {
  if (!medidor) {
    medidor = document.createElement('div');
    medidor.className = 'hoja-texto medidor';
    document.body.appendChild(medidor);
  }
  medidor.innerHTML = htmlBloques(bloques);
  return medidor.getBoundingClientRect().height;
}

function altoUtil(hoja) { return ((hoja === 'carta' ? 11 : 12.5) - 1) * 96 - SEGURO; }

// Todas las formas de partir n series seguidas en h hojas con al menos 2 series por hoja
function cortes(n, h) {
  if (h === 1) return n >= 2 ? [[n]] : [];
  const out = [];
  for (let k = 2; k <= n - 2 * (h - 1); k++) for (const resto of cortes(n - k, h - 1)) out.push([k, ...resto]);
  return out;
}

// Decide que series van en cada hoja y cuanto espacio llena cada una.
// Devuelve { hojas: [[indices]], aire: [puntos por serie], sobra: [px libres por hoja], cabe }
function maquetar(p, res, logo, fijo) {
  const d = p.datos, lim = altoUtil(d.hoja);
  const total = p.series.reduce((a, x) => a + x.puntos, 0);
  const cab = medir(encabezadoBloques(d, total, res, logo));
  const alto = p.series.map((x, i) => medir(serieBloques(ETIQUETAS[i], x, res, 0, false)));
  const blanco = LP * PX;                   // la serie que abre hoja no lleva el renglon de arriba
  let hojas = fijo;
  if (!hojas) {
    let mejor = null;
    for (const c of cortes(p.series.length, d.hojas)) {
      let i = 0, exceso = 0, llenos = [];
      const grupos = c.map(k => { const g = []; for (let j = 0; j < k; j++) g.push(i++); return g; });
      grupos.forEach((g, h) => {
        const usado = (h === 0 ? cab : -blanco) + g.reduce((a, j) => a + alto[j], 0);
        exceso += Math.max(0, usado - lim);
        llenos.push(usado / lim);
      });
      const prom = llenos.reduce((a, b) => a + b, 0) / llenos.length;
      const nota = exceso * 1000 + llenos.reduce((a, b) => a + (b - prom) ** 2, 0);
      if (!mejor || nota < mejor.nota) mejor = { nota, grupos };
    }
    hojas = mejor ? mejor.grupos : [p.series.map((_, i) => i)];
  }
  // el espacio libre de cada hoja se reparte entre sus series; primero a las que tienen renglones
  const aire = p.series.map(() => 0);
  const llenables = ['abiertas', 'dibujo', 'clasificar'];
  const medirHoja = (g, h) => medir([...(h === 0 ? encabezadoBloques(d, total, res, logo) : []),
    ...g.flatMap((j, k) => serieBloques(ETIQUETAS[j], p.series[j], res, aire[j], h > 0 && k === 0))]);
  const sobra = [];
  hojas.forEach((g, h) => {
    for (let vuelta = 0; vuelta < 6; vuelta++) {
      const libre = lim - medirHoja(g, h);
      if (vuelta > 0 && libre >= 0 && libre < LP * PX) break;
      const quienes = g.filter(j => llenables.includes(p.series[j].tipo));
      const a = quienes.length ? quienes : g;
      const piso = j => p.series[j].tipo === 'dibujo' ? -3 * LP : 0;
      for (const j of a) aire[j] = Math.max(piso(j), aire[j] + libre / PX / a.length - (libre < 0 ? 2 : 0));
      if (libre < 0 && a.every(j => aire[j] === piso(j))) break;
    }
    sobra.push(lim - medirHoja(g, h));
  });
  return { hojas, aire, sobra, cabe: sobra.every(s => s >= -2) };
}

function htmlHojas(p, res, logo, m) {
  const total = p.series.reduce((a, x) => a + x.puntos, 0);
  return m.hojas.map((g, h) => {
    const bs = [...(h === 0 ? encabezadoBloques(p.datos, total, res, logo) : []),
      ...g.flatMap((j, k) => serieBloques(ETIQUETAS[j], p.series[j], res, m.aire[j], h > 0 && k === 0))];
    return `<div class="hoja ${p.datos.hoja === 'carta' ? 'carta' : 'oficio'}"><div class="hoja-texto">${htmlBloques(bs)}</div></div>`;
  }).join('');
}

// ===========================================================================
// TEMARIO, una imagen de 1240 x 1754 (A4 a 150 dpi) como TEMARIOS\GENERADOR
// ===========================================================================

function temarioCanvas(p) {
  const d = p.datos, puntos = p.temario.puntos;
  const W = 1240, H = 1754, M = 90;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  const letra = (tam, negrita) => `${negrita ? 'bold ' : ''}${tam}px "Segoe UI", Arial, sans-serif`;
  const partir = (texto, ancho) => {
    const out = []; let linea = '';
    for (const w of texto.split(' ')) {
      const prueba = (linea + ' ' + w).trim();
      if (x.measureText(prueba).width <= ancho) linea = prueba; else { out.push(linea); linea = w; }
    }
    out.push(linea);
    return out;
  };
  for (let tam = 30; tam >= 17; tam--) {
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#193c6e'; x.fillRect(0, 0, W, 210);
    x.textBaseline = 'top';
    x.fillStyle = '#fff'; x.font = letra(30, true); x.fillText(d.colegio.toUpperCase(), M, 45, W - 2 * M);
    x.font = letra(44, true); x.fillText(`Temario de ${d.materia}`, M, 92, W - 2 * M);
    x.fillStyle = '#d2e1f5'; x.font = letra(26); x.fillText(`${d.grado}   ·   ${d.examen}   ·   Ciclo ${d.ciclo}`, M, 155, W - 2 * M);
    x.fillStyle = '#2e7d32'; x.fillRect(0, 210, W, 65);
    x.fillStyle = '#fff'; x.font = letra(28, true); x.fillText('Temas que debes estudiar para tu examen.', M, 225);
    let y = 320;
    puntos.forEach((pt, i) => {
      x.fillStyle = '#2e7d32'; x.font = letra(tam, true); x.fillText(`${i + 1}.`, M, y);
      x.fillStyle = '#212529'; x.font = letra(tam);
      for (const l of partir(pt, W - 2 * M - 60)) { x.fillText(l, M + 60, y); y += Math.round(tam * 1.45); }
      y += Math.round(tam * 0.9);
    });
    x.strokeStyle = '#c8c8c8'; x.lineWidth = 2; x.beginPath(); x.moveTo(M, H - 110); x.lineTo(W - M, H - 110); x.stroke();
    x.fillStyle = '#6e6e6e'; x.font = letra(24); x.fillText(`Prof. ${d.profesor}`, M, H - 90);
    if (y < H - 140) break;
  }
  return c;
}
