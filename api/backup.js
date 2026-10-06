// Cópias de segurança automáticas (Supabase).
// Todo dia de madrugada a Vercel chama este endereço (ver vercel.json) e uma cópia completa é guardada.
const { senhaOk } = require('./_comum');
const SB = require('./_supabase');

function cronOk(req) {
  if (req.method !== 'GET') return false;
  const s = process.env.CRON_SECRET;
  if (s) return req.headers.authorization === 'Bearer ' + s;
  return /vercel-cron/i.test(req.headers['user-agent'] || '');
}

module.exports = async (req, res) => {
  const cron = cronOk(req);
  if (!cron && !senhaOk(req)) return res.status(401).json({ code: 'auth' });
  if (!SB.ativo()) return res.status(500).json({ code: 'sem_supabase' });
  try {
    if (req.method === 'GET') return res.json({ ok: true, ...(await SB.rpc('fazer_backup')) });
    const { op, id } = req.body || {};
    if (op === 'listar') return res.json({ lista: await SB.raw('GET', '/backups?select=id,criado_em,total&order=id.desc&limit=30') });
    if (op === 'agora') return res.json(await SB.rpc('fazer_backup'));
    if (op === 'baixar') {
      const r = await SB.raw('GET', '/backups?select=dados,criado_em&id=eq.' + (+id));
      if (!r[0]) return res.status(404).json({ code: 'nao_achei' });
      return res.json(r[0]);
    }
    if (op === 'restaurar') return res.json(await SB.rpc('restaurar_backup', { bid: +id }));
    return res.status(400).json({ code: 'op' });
  } catch (e) {
    const falta = /fazer_backup|restaurar_backup|backups/.test(String(e.message)) && /404|42883|42P01|PGRST/.test(String(e.message));
    return res.status(500).json({ code: falta ? 'sem_tabela_backup' : (e.code || 'erro') });
  }
};
