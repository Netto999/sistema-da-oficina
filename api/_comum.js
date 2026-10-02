// Funções compartilhadas pelos servidores do sistema da oficina.
function senhaOk(req) {
  const s = process.env.APP_SENHA || '';
  const v = req.headers['x-senha'] || '';
  return s.length > 0 && v === s;
}

function redisCfg() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

async function redis(cmds) {
  const cfg = redisCfg();
  if (!cfg) { const e = new Error('sem_banco'); e.code = 'sem_banco'; throw e; }
  const r = await fetch(cfg.url + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + cfg.token, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) { const e = new Error('banco ' + r.status); e.code = 'banco'; throw e; }
  const out = await r.json();
  return out.map(x => { if (x.error) { const e = new Error(x.error); e.code = 'banco'; throw e; } return x.result; });
}

function paresParaObjeto(arr) {
  const o = {};
  for (let i = 0; i < (arr || []).length; i += 2) o[arr[i]] = arr[i + 1];
  return o;
}

module.exports = { senhaOk, redis, paresParaObjeto };
