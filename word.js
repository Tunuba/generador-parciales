// Pasa los mismos bloques a un .docx con la biblioteca docx (Arial 12, margenes de 0.5",
// filas que no se parten y cada hoja empieza donde la decidio maquetar)

const TW = 1440;                            // twips por pulgada

function wordRun(r) {
  const { TextRun, ImageRun, UnderlineType } = docx;
  if (r.img) return new ImageRun({ data: r.img.datos, transformation: { width: 96, height: Math.round(96 * r.img.alto / r.img.ancho) } });
  return new TextRun({
    text: r.t, font: 'Arial', size: (r.s || 12) * 2, bold: !!(r.b || r.r),
    color: r.r ? 'C00000' : undefined, underline: r.u ? { type: UnderlineType.SINGLE } : undefined,
  });
}

function wordParrafo(p, extra = {}) {
  const { Paragraph, AlignmentType } = docx;
  return new Paragraph({
    children: p.runs.map(wordRun),
    spacing: { before: Math.round((p.antes || 0) * 20), after: Math.round((p.despues || 0) * 20), line: Math.round(240 * (p.interlineado || 1)) },
    indent: p.sangria ? { left: Math.round(p.sangria * TW), hanging: Math.round(p.sangria * TW) } : undefined,
    alignment: p.centro ? AlignmentType.CENTER : undefined,
    ...extra,
  });
}

function wordTabla(t, pegar) {
  const { Table, TableRow, TableCell, WidthType, BorderStyle, TableLayoutType } = docx;
  const linea = { style: BorderStyle.SINGLE, size: 12, color: '000000' };
  const nada = { style: BorderStyle.NONE, size: 0, color: 'auto' };
  const ext = t.bordes === 'ninguno' ? nada : linea, int = t.bordes === 'todos' ? linea : nada;
  return new Table({
    width: { size: Math.round(t.anchos.reduce((a, b) => a + b, 0) * TW), type: WidthType.DXA },
    columnWidths: t.anchos.map(w => Math.round(w * TW)),
    layout: TableLayoutType.FIXED,
    borders: { top: ext, bottom: ext, left: ext, right: ext, insideHorizontal: int, insideVertical: int },
    rows: t.filas.map(f => new TableRow({
      cantSplit: true,
      children: f.celdas.map((c, i) => new TableCell({
        width: { size: Math.round(t.anchos[i] * TW), type: WidthType.DXA },
        children: (c.length ? c : [P()]).map(p => wordParrafo(p, { keepNext: pegar })),
      })),
    })),
  });
}

// bloques de una hoja; 'nueva' pone el salto de pagina en el primer parrafo
function wordBloques(bloques, nueva) {
  const out = [];
  bloques.forEach((b, i) => {
    const ultimo = i === bloques.length - 1;
    if (b.k === 'p') out.push(wordParrafo(b, { keepNext: !ultimo, pageBreakBefore: nueva && i === 0 }));
    else out.push(wordTabla(b, !ultimo));
  });
  return out;
}

async function descargarWord(p, res, logo, m, nombre) {
  const { Document, Packer } = docx;
  const total = p.series.reduce((a, x) => a + x.puntos, 0);
  const hijos = [];
  hijos.push(...wordBloques(encabezadoBloques(p.datos, total, res, logo), false));
  m.hojas.forEach((g, h) => g.forEach((j, k) => {
    const bs = serieBloques(ETIQUETAS[j], p.series[j], res, m.aire[j], h > 0 && k === 0);
    hijos.push(...wordBloques(bs, h > 0 && k === 0));
  }));
  const doc = new Document({
    creator: p.datos.profesor || '',
    styles: { default: { document: { run: { font: 'Arial', size: 24 }, paragraph: { spacing: { before: 0, after: 0, line: 240 } } } } },
    sections: [{
      properties: { page: { size: { width: 8.5 * TW, height: (p.datos.hoja === 'carta' ? 11 : 12.5) * TW }, margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
      children: hijos,
    }],
  });
  bajar(await Packer.toBlob(doc), nombre);
}

function bajar(blob, nombre) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}
