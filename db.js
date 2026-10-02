// Banco de dados da oficina (guardado no Upstash Redis, ligado pela Vercel).
const { senhaOk, redis, paresParaObjeto } = require('./_comum');
const SB = require('./_supabase');

const NOME_OK = /^[a-zA-Z0-9_\-:.@+~]{1,200}$/;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ code: 'metodo' });
  if (!senhaOk(req)) return res.status(401).json({ code: 'auth' });
  const b = req.body || {};
  const { op, col, id } = b;
  try {
    if (SB.ativo()) {
      if (op === 'ver') return res.json({ ver: await SB.ver() });
      if (op === 'bulk') { const items = (Array.isArray(b.items) ? b.items.slice(0, 200) : []).filter(it => NOME_OK.test(it.col || '') && NOME_OK.test(String(it.id || ''))); await SB.bulk(items); return res.json({ ok: true, n: items.length }); }
      if (!NOME_OK.test(col || '')) return res.status(400).json({ code: 'colecao' });
      if (op === 'sync') return res.json(await SB.sync(col, b.since));
      if (op === 'get') return res.json({ data: await SB.get(col, String(id)) });
      if (op === 'query') return res.json({ docs: await SB.query(col, b.field, b.value) });
      if (!NOME_OK.test(String(id || ''))) return res.status(400).json({ code: 'id' });
      if (op === 'set') { await SB.set(col, String(id), b.data); return res.json({ ok: true }); }
      if (op === 'del') { await SB.del(col, String(id)); return res.json({ ok: true }); }
      return res.status(400).json({ code: 'op' });
    }
    if (op === 'ver') {
      const [v] = await redis([['HGETALL', 'ver']]);
      return res.json({ ver: paresParaObjeto(v) });
    }
    if (op === 'bulk') {
      const items = Array.isArray(b.items) ? b.items.slice(0, 200) : [];
      const agora = String(Date.now());
      const cmds = [];
      const cols = new Set();
      for (const it of items) {
        if (!NOME_OK.test(it.col || '') || !NOME_OK.test(String(it.id || ''))) continue;
        cmds.push(['HSET', 'c:' + it.col, String(it.id), JSON.stringify(it.data)]);
        cmds.push(['HSET', 't:' + it.col, String(it.id), agora]);
        cols.add(it.col);
      }
      cols.forEach(c => cmds.push(['HINCRBY', 'ver', c, 1]));
      if (cmds.length) await redis(cmds);
      return res.json({ ok: true, n: items.length });
    }
    if (!NOME_OK.test(col || '')) return res.status(400).json({ code: 'colecao' });
    if (op === 'sync') {
      const since = +b.since || 0;
      const agora = Date.now();
      const [tempos] = await redis([['HGETALL', 't:' + col]]);
      const t = paresParaObjeto(tempos);
      const ids = Object.keys(t);
      const mudou = ids.filter(k => +t[k] > since);
      const docs = {};
      for (let i = 0; i < mudou.length; i += 300) {
        const parte = mudou.slice(i, i + 300);
        const [vals] = await redis([['HMGET', 'c:' + col, ...parte]]);
        parte.forEach((k, j) => { if (vals[j] != null) docs[k] = JSON.parse(vals[j]); });
      }
      return res.json({ now: agora, ids, docs });
    }
    if (op === 'get') {
      const [v] = await redis([['HGET', 'c:' + col, String(id)]]);
      return res.json({ data: v == null ? null : JSON.parse(v) });
    }
    if (op === 'query') {
      const [all] = await redis([['HGETALL', 'c:' + col]]);
      const o = paresParaObjeto(all);
      const docs = {};
      Object.entries(o).forEach(([k, v]) => { const d = JSON.parse(v); if (d && d[b.field] === b.value) docs[k] = d; });
      return res.json({ docs });
    }
    if (!NOME_OK.test(String(id || ''))) return res.status(400).json({ code: 'id' });
    if (op === 'set') {
      await redis([
        ['HSET', 'c:' + col, String(id), JSON.stringify(b.data)],
        ['HSET', 't:' + col, String(id), String(Date.now())],
        ['HINCRBY', 'ver', col, 1],
      ]);
      return res.json({ ok: true });
    }
    if (op === 'del') {
      await redis([['HDEL', 'c:' + col, String(id)], ['HDEL', 't:' + col, String(id)], ['HINCRBY', 'ver', col, 1]]);
      return res.json({ ok: true });
    }
    return res.status(400).json({ code: 'op' });
  } catch (e) {
    return res.status(e.code === 'sem_banco' ? 503 : 500).json({ code: e.code || 'erro' });
  }
};
