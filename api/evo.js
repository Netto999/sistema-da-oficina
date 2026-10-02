// EVO: envia a pergunta do mecânico para a API da Anthropic.
// A chave fica só aqui no servidor (variável ANTHROPIC_API_KEY na Vercel).
const { senhaOk } = require('./_comum');

function juntaTurnos(turns, imagem) {
  const msgs = [];
  for (const t of turns || []) {
    const role = t.role === 'assistant' ? 'assistant' : 'user';
    const text = String(t.content || '').slice(0, 60000);
    if (!text) continue;
    const ult = msgs[msgs.length - 1];
    if (ult && ult.role === role) ult.content[0].text += '\n\n' + text;
    else msgs.push({ role, content: [{ type: 'text', text }] });
  }
  if (msgs.length && msgs[0].role === 'user') {
    // Guarda em memória temporária o começo da conversa (regras e dados), para gastar menos.
    msgs[0].content[0].cache_control = { type: 'ephemeral' };
  }
  const ultima = msgs[msgs.length - 1];
  if (imagem && imagem.data && ultima && ultima.role === 'user') {
    ultima.content.unshift({ type: 'image', source: { type: 'base64', media_type: imagem.media_type || 'image/jpeg', data: imagem.data } });
  }
  return msgs;
}

function extraiJSON(txt) {
  let s = String(txt || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  return JSON.parse(s);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ code: 'metodo' });
  if (!senhaOk(req)) return res.status(401).json({ code: 'auth' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ code: 'sem_chave' });
  const { turns, imagem } = req.body || {};
  const messages = juntaTurnos(turns, imagem);
  if (!messages.length || messages[messages.length - 1].role !== 'user') return res.status(400).json({ code: 'invalid_request' });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: process.env.MODELO || 'claude-sonnet-5-5', max_tokens: 1800, messages }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = (j.error && j.error.message) || '';
      let code = 'upstream_error';
      if (r.status === 401) code = 'chave_invalida';
      else if (r.status === 429) code = 'rate_limited';
      else if (/credit|balance|billing/i.test(msg)) code = 'saldo';
      else if (r.status === 400 && /too long|too large/i.test(msg)) code = 'prompt_too_large';
      return res.status(r.status === 401 ? 502 : r.status).json({ code, detalhe: msg.slice(0, 300) });
    }
    const texto = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n');
    try {
      return res.json({ data: extraiJSON(texto) });
    } catch (e) {
      return res.status(422).json({ code: 'invalid_json', text: texto.slice(0, 2000) });
    }
  } catch (e) {
    return res.status(502).json({ code: 'upstream_error' });
  }
};
