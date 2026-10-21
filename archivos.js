// Saca el texto de los archivos de clase. Word y PowerPoint son zip con XML adentro.

async function textoDeArchivo(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'txt' || ext === 'md') return await file.text();
  if (ext === 'docx') {
    const zip = await JSZip.loadAsync(file);
    const xml = await zip.file('word/document.xml').async('string');
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    return [...doc.getElementsByTagName('w:p')].map(p => [...p.getElementsByTagName('w:t')].map(t => t.textContent).join('')).join('\n');
  }
  if (ext === 'pptx') {
    const zip = await JSZip.loadAsync(file);
    const num = n => +n.match(/(\d+)\.xml$/)[1];
    const diapos = Object.keys(zip.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => num(a) - num(b));
    const partes = [];
    for (const n of diapos) {
      const doc = new DOMParser().parseFromString(await zip.file(n).async('string'), 'application/xml');
      partes.push('--- Diapositiva ' + num(n) + ' ---');
      for (const p of doc.getElementsByTagName('a:p')) {
        const t = [...p.getElementsByTagName('a:t')].map(t => t.textContent).join('');
        if (t.trim()) partes.push(t);
      }
    }
    return partes.join('\n');
  }
  if (ext === 'pdf') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const partes = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const c = await (await pdf.getPage(i)).getTextContent();
      let linea = '', y = null;
      for (const it of c.items) {
        if (y !== null && Math.abs(it.transform[5] - y) > 2) { partes.push(linea); linea = ''; }
        linea += it.str; y = it.transform[5];
      }
      partes.push(linea);
    }
    return partes.join('\n');
  }
  throw new Error('Ese tipo de archivo no se puede leer. Use .txt, .docx, .pptx o .pdf.');
}
