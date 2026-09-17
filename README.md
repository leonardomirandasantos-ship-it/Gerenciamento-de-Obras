# Zap da Obra

Um app que recebe conteúdo com a naturalidade de um grupo de WhatsApp (texto,
foto, voz — zero fricção) e por trás organiza tudo em gestão financeira e
documentação de obra: "o arquivo master da obra".

A especificação completa do produto (visão, JTBDs, fluxos, decisões
normativas, telas, design system, marca, arquitetura técnica e checklist de
build) está em [`specs/`](./specs/00_INDEX.md) — comece pelo `00_INDEX.md`.
Esses arquivos são a fonte da verdade do produto: toda nova decisão que
tomarmos deve ser refletida neles, não só no código, para que o projeto
continue portátil entre ferramentas/IAs.

Status: specs V1 fechadas, começando a implementação (ver
`specs/08_BUILD_CHECKLIST.md`).

## Rodando localmente

1. `npm install`
2. Copie `.env.example` para `.env.local` com a URL e a chave `anon`/
   `publishable` do seu projeto Supabase.
3. No **SQL Editor** do Supabase, rode [`supabase/schema.sql`](./supabase/schema.sql)
   — ⚠️ isso **apaga as tabelas do protótipo anterior** (empresas/convites/
   lançamentos) e cria o schema novo (obras/fases/eventos/anexos), além do
   bucket de Storage `anexos`.
4. Sua conta de login já existente no Supabase Auth continua funcionando
   (só as tabelas de dados foram recriadas). Se não tiver uma conta ainda,
   crie em Authentication > Users no painel do Supabase.
5. `npm run dev` e acesse `http://localhost:3000`.

## Deploy

Pensado pra rodar direto do GitHub: conectar este repositório na
[Vercel](https://vercel.com) e cada push na `main` gera uma nova versão.
