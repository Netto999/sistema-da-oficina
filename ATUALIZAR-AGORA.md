# Atualização: cópias automáticas, lembrete de cópia e teste da voz

Suba estes arquivos no GitHub (repositório sistema-da-oficina):

**Na página principal do repositório** (Add file → Upload files):
- `index.html` (substitui o antigo)
- `vercel.json` (novo)
- `supabase-backup.sql` (novo)
- `LEIA-ME.md` (substitui o antigo)

**Dentro da pasta `api`** (clique na pasta `api` primeiro e só então em Add file → Upload files):
- `backup.js` (novo)
- `_supabase.js` (substitui o antigo)
- `voz.js` (substitui o antigo)

Clique em **Commit changes**. A Vercel publica sozinha (não precisa de Redeploy).

Depois:
1. No Supabase: **SQL Editor** → cole o conteúdo de `supabase-backup.sql` → **Run**.
2. No sistema: **Configurações → Voz do EVO → Testar a voz**. Se o ElevenLabs recusar, aparece o motivo na tela.
