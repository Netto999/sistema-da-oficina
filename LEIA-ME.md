# Sistema da Oficina: versão própria na Vercel

Esta pasta é o sistema completo para rodar no seu endereço (ex.: sistema-da-oficina.vercel.app), sem depender do Claude.

- `index.html`: o sistema (o mesmo do Claude).
- `api/db.js`: guarda os dados no banco (Supabase).
- `supabase.sql`: o comando que cria as tabelas no Supabase (Passo 4).
- `api/evo.js`: o EVO, usando a sua chave da API da Anthropic.
- `api/voz.js`: a voz do EVO pelo ElevenLabs (opcional).

As chaves NUNCA ficam no site. Elas ficam guardadas na Vercel, em "Environment Variables".

---

## Passo 1: Salvar uma cópia dos dados do sistema atual

1. Abra o sistema pelo link do Claude.
2. Vá em **Configurações → Cópia dos dados → Exportar todos os dados**.
3. Guarde o arquivo `backup-oficina-....json`. Ele vai ser usado no Passo 7.

## Passo 2: Colocar os arquivos no GitHub

1. Entre em github.com (crie uma conta grátis, se não tiver).
2. Clique em **New repository**, dê o nome `sistema-da-oficina`, marque **Private** e clique em **Create repository**.
3. Na página do repositório, clique em **uploading an existing file**.
4. Arraste para lá **o conteúdo desta pasta**: o arquivo `index.html`, o `package.json` e a pasta `api` inteira.
5. Clique em **Commit changes**.

## Passo 3: Ligar o GitHub na Vercel

1. Entre em vercel.com → **Add New… → Project**.
2. Escolha o repositório `sistema-da-oficina` e clique em **Import**.
3. Não mude nada e clique em **Deploy**.

Se você já tem um projeto `sistema-da-oficina` na Vercel, pode ligar ele a este repositório em **Settings → Git**, ou criar um projeto novo e depois mover o endereço.

## Passo 4: Preparar o banco de dados no Supabase

1. Entre no supabase.com e abra o seu projeto (ou crie um novo; escolha a região **South America (São Paulo)**).
2. No menu da esquerda, abra o **SQL Editor** e clique em **New query**.
3. Abra o arquivo `supabase.sql` (está neste pacote), copie **tudo** e cole no SQL Editor.
4. Clique em **Run**. Deve aparecer "Success". Isso cria as duas tabelas do sistema (`docs` e `ver`), protegidas para ninguém de fora acessar.
5. Agora pegue os dois dados de acesso, nas configurações do projeto, na parte de **API** / **API Keys**:
   - a **URL do projeto** (algo como `https://xxxx.supabase.co`);
   - a chave **secreta** (pode aparecer como **service_role** ou como **Secret key**, começando com `sb_secret_`). Use a secreta, **não** a "anon"/"publishable".

Esses dois vão para a Vercel no próximo passo. (Não precisa criar o Upstash: com o Supabase configurado, o sistema usa o Supabase.)

## Passo 5: Colocar as chaves e a senha

No projeto: **Settings → Environment Variables**. Adicione uma por uma (nome à esquerda, valor à direita):

| Nome | Valor | Obrigatório? |
|---|---|---|
| `APP_SENHA` | A senha que os funcionários vão digitar para entrar | Sim |
| `SUPABASE_URL` | A URL do projeto do Supabase (`https://xxxx.supabase.co`) | Sim |
| `SUPABASE_SERVICE_ROLE_KEY` | A chave secreta do Supabase (service_role ou `sb_secret_...`) | Sim |
| `ANTHROPIC_API_KEY` | A chave criada no Console da Anthropic (começa com `sk-ant-`) | Sim, para o EVO |
| `ELEVENLABS_API_KEY` | A chave da sua conta do ElevenLabs | Não, só para a voz |
| `ELEVENLABS_VOICE_ID` | O ID da voz escolhida no ElevenLabs | Não, só para a voz |
| `MODELO` | Deixe sem preencher (usa o Claude Sonnet 5.5). Para gastar menos: `claude-haiku-4-5-20251001` | Não |

Onde pegar cada chave:
- **Anthropic:** Console da Anthropic → **API Keys → Create Key**. Copie na hora, ela só aparece uma vez.
- **ElevenLabs:** perfil → **API Keys**. O ID da voz aparece na página de cada voz. Escolha uma voz que fale bem português.

## Passo 6: Publicar de novo

Vá em **Deployments**, clique nos três pontinhos do último deploy → **Redeploy**. Isso é necessário para as chaves passarem a valer.

## Passo 7: Entrar e trazer os dados

1. Abra o seu endereço da Vercel.
2. Digite a senha (`APP_SENHA`).
3. Vá em **Configurações → Cópia dos dados → Importar uma cópia** e escolha o arquivo do Passo 1.

Pronto. Todos os aparelhos que entrarem com a senha veem os mesmos dados, atualizando sozinhos a cada poucos segundos.

---

## Dicas importantes

- **Limite de gasto:** no Console da Anthropic, coloque um limite de gasto por mês para não ter surpresa.
- **Créditos acabaram:** o EVO avisa "os créditos da API acabaram". É só recarregar no Console da Anthropic.
- **Microfone:** no seu endereço próprio, o navegador pede permissão para usar o microfone. Toque em **Permitir**. Funciona melhor no Chrome.
- **Trocar a senha:** mude `APP_SENHA` na Vercel e faça o Redeploy. Todo mundo vai precisar digitar a nova senha.
- **Ver os dados:** no Supabase, em **Table Editor → docs**, dá para ver tudo o que o sistema salvou. Não apague linhas por lá, use o próprio sistema.
- **A chave secreta do Supabase** dá acesso total ao banco. Ela só pode ficar na Vercel.
- **Nunca** coloque as chaves dentro do `index.html` nem mande por WhatsApp.
- 
