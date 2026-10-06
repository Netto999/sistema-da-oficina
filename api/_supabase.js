// Banco no Supabase (tabelas "docs" e "ver"). A chave secreta fica só no servidor.
function cfg() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  return url && key ? { url: url.replace(/\/$/, '') + '/rest/v1', key } : null;
}
function ativo() { return !!cfg(); }

async function req(method, path, body, extraHeaders = {}) {
  const c = cfg();
  const h = { apikey: c.key, 'Content-Type': 'application/json', ...extraHeaders };
  if (c.key.startsWith('eyJ')) h.Authorization = 'Bearer ' + c.key;
  const r = await fetch(c.url + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  if (!r.ok) { const t = await r.text().catch(() => ''); const e = new Error('supabase ' + r.status + ' ' + t.slice(0, 200)); e.code = 'banco'; throw e; }
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}
async function todos(path) {
  const out = [];
  for (let off = 0; ; off += 1000) {
    const parte = await req('GET', path + '&limit=1000&offset=' + off);
    out.push(...parte);
    if (parte.length < 1000) return out;
  }
}
const q = s => encodeURIComponent(s);
const marca = col => req('POST', '/ver?on_conflict=col', [{ col, v: Date.now() }], { Prefer: 'resolution=merge-duplicates,return=minimal' });

module.exports = {
  ativo,
  rpc: (nome, args) => req('POST', '/rpc/' + nome, args || {}),
  raw: (method, path) => req(method, path),
  async ver() { const r = await todos('/ver?select=col,v'); const o = {}; r.forEach(x => o[x.col] = x.v); return o; },
  async sync(col, since) {
    const agora = Date.now();
    const ids = (await todos('/docs?select=id&col=eq.' + q(col))).map(x => x.id);
    const mud = await todos('/docs?select=id,data&col=eq.' + q(col) + '&updated_at=gt.' + (+since || 0));
    const docs = {}; mud.forEach(x => docs[x.id] = x.data);
    return { now: agora, ids, docs };
  },
  async get(col, id) { const r = await req('GET', '/docs?select=data&col=eq.' + q(col) + '&id=eq.' + q(id)); return r[0] ? r[0].data : null; },
  async query(col, field, value) {
    const r = await todos('/docs?select=id,data&col=eq.' + q(col) + '&data->>' + q(field) + '=eq.' + q(String(value)));
    const docs = {}; r.forEach(x => docs[x.id] = x.data); return docs;
  },
  async set(col, id, data) {
    await req('POST', '/docs?on_conflict=col,id', [{ col, id, data, updated_at: Date.now() }], { Prefer: 'resolution=merge-duplicates,return=minimal' });
    await marca(col);
  },
  async del(col, id) { await req('DELETE', '/docs?col=eq.' + q(col) + '&id=eq.' + q(id), undefined, { Prefer: 'return=minimal' }); await marca(col); },
  async bulk(items) {
    const agora = Date.now();
    const linhas = items.map(it => ({ col: it.col, id: String(it.id), data: it.data, updated_at: agora }));
    for (let i = 0; i < linhas.length; i += 100) await req('POST', '/docs?on_conflict=col,id', linhas.slice(i, i + 100), { Prefer: 'resolution=merge-duplicates,return=minimal' });
    for (const c of new Set(linhas.map(l => l.col))) await marca(c);
  },
};
