// Voz do EVO pelo ElevenLabs. Opcional: só funciona se ELEVENLABS_API_KEY e ELEVENLABS_VOICE_ID estiverem na Vercel.
const { senhaOk } = require('./_comum');

module.exports = async (req, res) => {
  if (!senhaOk(req)) return res.status(401).json({ code: 'auth' });
  const key = process.env.ELEVENLABS_API_KEY, voz = process.env.ELEVENLABS_VOICE_ID;
  if (req.method === 'GET') return res.json({ ok: !!(key && voz) });
  if (req.method !== 'POST') return res.status(405).json({ code: 'metodo' });
  if (!key || !voz) return res.status(500).json({ code: 'sem_voz' });
  const texto = String((req.body || {}).texto || '').slice(0, 700);
  if (!texto) return res.status(400).json({ code: 'vazio' });
  try {
    const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(voz) + '?output_format=mp3_44100_128', {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text: texto, model_id: process.env.ELEVENLABS_MODELO || 'eleven_multilingual_v2' }),
    });
    if (!r.ok) return res.status(502).json({ code: 'voz_erro', status: r.status });
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(buf);
  } catch (e) {
    return res.status(502).json({ code: 'voz_erro' });
  }
};
