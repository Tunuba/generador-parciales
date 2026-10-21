// Conexion con una IA que hable como OpenAI (/v1/chat/completions). Sirven las que corren
// en la computadora (Jan, Ollama, LM Studio) y las de internet con clave (Groq, Gemini, OpenAI).

const PROVEEDORES = {
  gratis:   { nombre: 'IA gratis por internet, sin clave', url: 'https://text.pollinations.ai/openai', modelo: 'openai-fast', clave: false, sinLista: true,
              sinEsquema: true, extra: { reasoning_effort: 'low' } },
  jan:      { nombre: 'Jan, en esta computadora', url: 'http://localhost:1337/v1', modelo: '', clave: false },
  ollama:   { nombre: 'Ollama, en esta computadora', url: 'http://localhost:11434/v1', modelo: 'qwen3:8b', clave: false },
  lmstudio: { nombre: 'LM Studio, en esta computadora', url: 'http://localhost:1234/v1', modelo: '', clave: false },
  groq:     { nombre: 'Groq, por internet (cuenta gratis)', url: 'https://api.groq.com/openai/v1', modelo: 'llama-3.3-70b-versatile', clave: true },
  gemini:   { nombre: 'Google Gemini, por internet (con clave)', url: 'https://generativelanguage.googleapis.com/v1beta/openai', modelo: 'gemini-2.5-flash', clave: true },
  openai:   { nombre: 'OpenAI, por internet (de pago)', url: 'https://api.openai.com/v1', modelo: 'gpt-4o-mini', clave: true },
  otra:     { nombre: 'Otra compatible con OpenAI', url: '', modelo: '', clave: false },
};

function errorConexion(cfg, detalle) {
  const e = new Error(`No se pudo conectar con ${cfg.url}. ${detalle || (/localhost|127\.0\.0\.1/.test(cfg.url)
    ? 'Revise que la IA esté abierta con su servidor encendido y que acepte conexiones de esta página. Si el navegador preguntó por la red local, tiene que darle Permitir (se cambia en el candado junto a la dirección).'
    : 'Revise la dirección, la clave y su conexión a internet.')}`);
  e.conexion = true;
  return e;
}

async function llamar(cfg, ruta, cuerpo) {
  const url = cfg.url.replace(/\/+$/, '') + ruta;
  const headers = { 'Content-Type': 'application/json' };
  if (cfg.clave) headers.Authorization = 'Bearer ' + cfg.clave;
  let r;
  try {
    r = await fetch(url, cuerpo ? { method: 'POST', headers, body: JSON.stringify(cuerpo) } : { headers });
  } catch (e) {
    throw errorConexion(cfg);
  }
  return r;
}

async function listarModelos(cfg) {
  if (cfg.sinLista) {                     // no publica su lista, se prueba con un pedido corto
    const r = await llamar(cfg, '/chat/completions', { model: cfg.modelo, messages: [{ role: 'user', content: 'Responda solo ok' }] });
    if (!r.ok) throw errorConexion(cfg, `La IA contestó con error ${r.status}.`);
    return [cfg.modelo];
  }
  const r = await llamar(cfg, '/models');
  if (!r.ok) throw errorConexion(cfg, `La IA contestó con error ${r.status}.`);
  const j = await r.json();
  return (j.data || j.models || []).map(m => m.id || m.name).filter(Boolean).sort();
}

// Pide una respuesta en JSON. Prueba primero con el esquema exacto y, si la IA no lo
// entiende, con JSON simple y despues sin formato
async function preguntarIA(cfg, sis, usu, forma) {
  const qwen = /qwen3/i.test(cfg.modelo || '');
  const base = {
    model: cfg.modelo, temperature: 0.5, stream: false, ...(cfg.extra || {}),
    messages: [{ role: 'system', content: sis }, { role: 'user', content: usu + (qwen ? '\n/no_think' : '') }],
  };
  // la IA gratis piensa demasiado con el esquema y se queda sin espacio para contestar
  const formas = cfg.sinEsquema ? [{}] : [
    { response_format: { type: 'json_schema', json_schema: { name: 'serie', schema: esquema(forma) } } },
    { response_format: { type: 'json_object' } },
    {},
  ];
  let ultimo = '';
  for (const f of formas) {
    const r = await llamar(cfg, '/chat/completions', { ...base, ...f });
    if (r.status === 400 || r.status === 422) { ultimo = await r.text(); continue; }
    if (r.status === 401 || r.status === 403) throw errorConexion(cfg, 'La clave no sirve o no tiene permiso.');
    if (r.status === 404) throw errorConexion(cfg, `No existe el modelo ${cfg.modelo} o la dirección está mal.`);
    if (r.status === 429 || r.status === 402) {   // la gratis da una respuesta cada 30 s por red, se espera y se repite
      const t = await r.text();
      const seg = +((t.match(/after (\d+)s/i) || [])[1] || 15) + 2;
      if (r.status === 402 && !/FREE_LIMIT|limit/i.test(t)) throw errorConexion(cfg, 'Esa IA pide pago.');
      if ((cfg.esperas = (cfg.esperas || 0) + 1) <= 8) {
        if (cfg.alEsperar) cfg.alEsperar(seg);
        await new Promise(ok => setTimeout(ok, seg * 1000));
        return preguntarIA(cfg, sis, usu, forma);
      }
      throw errorConexion(cfg, 'Se pasó el límite de uso de esa IA, espere un minuto.');
    }
    if (!r.ok) throw errorConexion(cfg, `La IA contestó con error ${r.status}.`);
    const j = await r.json();
    const texto = j.choices && j.choices[0] && j.choices[0].message ? j.choices[0].message.content : '';
    cfg.esperas = 0;
    return sacarJson(texto);
  }
  throw errorConexion(cfg, 'La IA no aceptó el pedido. ' + ultimo.slice(0, 200));
}
